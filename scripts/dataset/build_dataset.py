from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import re
import shutil
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import duplicate_groups, iter_images, parse_yolo_lines


@dataclass(frozen=True)
class Sample:
    image_path: Path
    label_path: Path
    source_dataset: str
    source_video: str
    location: str
    group_id: str
    has_pothole: bool
    bbox_count: int


def _resolve_record_path(value: str, metadata_path: Path) -> Path:
    path = Path(value)
    if path.exists() or path.is_absolute():
        return path
    candidate = metadata_path.parent / path
    return candidate if candidate.exists() else path


def load_normalized_source(name: str, root: Path) -> list[Sample]:
    metadata_path = root / "metadata.csv"
    if metadata_path.is_file():
        samples = []
        with metadata_path.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                image_path = _resolve_record_path(row["image_path"], metadata_path)
                label_path = _resolve_record_path(row["label_path"], metadata_path)
                if not image_path.is_file() or not label_path.is_file():
                    raise ValueError(
                        f"Metadata references a missing file: {image_path} / {label_path}"
                    )
                boxes, errors = parse_yolo_lines(
                    label_path.read_text(encoding="utf-8").splitlines(), {0}
                )
                if errors:
                    raise ValueError(f"Invalid label {label_path}: {errors[0][1]}")
                samples.append(
                    Sample(
                        image_path=image_path,
                        label_path=label_path,
                        source_dataset=row.get("source_dataset") or name,
                        source_video=row.get("source_video", ""),
                        location=row.get("location", "unknown"),
                        group_id=row.get("group_id") or f"{name}:{image_path.stem}",
                        has_pothole=bool(boxes),
                        bbox_count=len(boxes),
                    )
                )
        return samples

    images_root = root / "images"
    labels_root = root / "labels"
    samples = []
    for image_path in iter_images(images_root):
        relative = image_path.relative_to(images_root)
        label_path = labels_root / relative.with_suffix(".txt")
        if not label_path.is_file():
            raise ValueError(
                f"Missing label for {image_path}; create an empty label for a verified negative"
            )
        boxes, errors = parse_yolo_lines(
            label_path.read_text(encoding="utf-8").splitlines(), {0}
        )
        if errors:
            raise ValueError(f"Invalid label {label_path}: {errors[0][1]}")
        source_video = (
            image_path.stem.split("__frame_", 1)[0]
            if "__frame_" in image_path.stem
            else ""
        )
        samples.append(
            Sample(
                image_path=image_path,
                label_path=label_path,
                source_dataset=name,
                source_video=source_video,
                location="Palembang" if name.casefold() == "palembang" else "unknown",
                group_id=f"{name}:{source_video or image_path.stem}",
                has_pothole=bool(boxes),
                bbox_count=len(boxes),
            )
        )
    return samples


def select_negative_examples(
    samples: list[Sample], max_negative_ratio: float, seed: int
) -> list[Sample]:
    positives = [sample for sample in samples if sample.has_pothole]
    negatives = [sample for sample in samples if not sample.has_pothole]
    if not positives:
        raise ValueError("Dataset contains no verified pothole annotations")
    maximum_negatives = round(len(positives) * max_negative_ratio)
    random.Random(seed).shuffle(negatives)
    return sorted(
        positives + negatives[:maximum_negatives],
        key=lambda sample: sample.image_path.as_posix(),
    )


class GroupUnion:
    def __init__(self, values: set[str]) -> None:
        self.parent = {value: value for value in values}

    def find(self, value: str) -> str:
        parent = self.parent[value]
        if parent != value:
            self.parent[value] = self.find(parent)
        return self.parent[value]

    def union(self, left: str, right: str) -> None:
        left_root, right_root = self.find(left), self.find(right)
        if left_root != right_root:
            canonical, other = sorted((left_root, right_root))
            self.parent[other] = canonical


def leakage_safe_groups(
    samples: list[Sample], duplicate_distance: int
) -> dict[str, list[Sample]]:
    union = GroupUnion({sample.group_id for sample in samples})
    memberships, _ = duplicate_groups(
        (sample.image_path for sample in samples), duplicate_distance
    )
    duplicate_members: dict[str, list[Sample]] = defaultdict(list)
    for sample in samples:
        duplicate_group = memberships.get(sample.image_path)
        if duplicate_group:
            duplicate_members[duplicate_group].append(sample)
    for members in duplicate_members.values():
        first = members[0].group_id
        for member in members[1:]:
            union.union(first, member.group_id)
    grouped: dict[str, list[Sample]] = defaultdict(list)
    for sample in samples:
        grouped[union.find(sample.group_id)].append(sample)
    return dict(grouped)


def grouped_split(
    groups: dict[str, list[Sample]],
    train_ratio: float,
    val_ratio: float,
    test_ratio: float,
    seed: int,
) -> dict[str, list[Sample]]:
    if abs(train_ratio + val_ratio + test_ratio - 1.0) > 1e-9:
        raise ValueError("train, validation, and test ratios must sum to 1")
    if min(train_ratio, val_ratio, test_ratio) <= 0:
        raise ValueError("all split ratios must be greater than zero")
    total = sum(len(samples) for samples in groups.values())
    targets = {
        "train": total * train_ratio,
        "val": total * val_ratio,
        "test": total * test_ratio,
    }
    result: dict[str, list[Sample]] = {"train": [], "val": [], "test": []}
    items = list(groups.items())
    random.Random(seed).shuffle(items)
    items.sort(key=lambda item: len(item[1]), reverse=True)
    for _, group_samples in items:
        split = max(
            result,
            key=lambda name: (targets[name] - len(result[name])) / targets[name],
        )
        result[split].extend(group_samples)
    return result


def _safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", value).strip("_") or "source"


def _prepare_output(output: Path, overwrite: bool) -> None:
    existing = [path for path in output.glob("**/*") if path.is_file()]
    if existing and not overwrite:
        raise ValueError(
            f"Processed output is not empty: {output}; pass --overwrite to rebuild"
        )
    if overwrite:
        for path in existing:
            path.unlink()
    for split in ("train", "val", "test"):
        (output / "images" / split).mkdir(parents=True, exist_ok=True)
        (output / "labels" / split).mkdir(parents=True, exist_ok=True)


def build_dataset(
    sources: list[tuple[str, Path]],
    output: Path,
    manifest_path: Path,
    version_path: Path,
    dataset_version: str = "pothole-dataset-v1",
    train_ratio: float = 0.7,
    val_ratio: float = 0.2,
    test_ratio: float = 0.1,
    seed: int = 42,
    max_negative_ratio: float = 1.0,
    duplicate_distance: int = 6,
    overwrite: bool = False,
) -> dict[str, int]:
    if max_negative_ratio < 0:
        raise ValueError("max_negative_ratio cannot be negative")
    all_samples: list[Sample] = []
    for name, path in sources:
        all_samples.extend(load_normalized_source(name, path))
    selected = select_negative_examples(all_samples, max_negative_ratio, seed)
    groups = leakage_safe_groups(selected, duplicate_distance)
    splits = grouped_split(groups, train_ratio, val_ratio, test_ratio, seed)
    _prepare_output(output, overwrite)

    rows: list[dict[str, str | int]] = []
    seen_names: set[str] = set()
    for split, samples in splits.items():
        for sample in sorted(samples, key=lambda value: value.image_path.as_posix()):
            base_name = f"{_safe_name(sample.source_dataset)}__{sample.image_path.stem}"
            if base_name in seen_names:
                suffix = hashlib.sha1(
                    sample.image_path.as_posix().encode()
                ).hexdigest()[:8]
                base_name = f"{base_name}_{suffix}"
            seen_names.add(base_name)
            destination_image = (
                output
                / "images"
                / split
                / f"{base_name}{sample.image_path.suffix.lower()}"
            )
            destination_label = output / "labels" / split / f"{base_name}.txt"
            shutil.copy2(sample.image_path, destination_image)
            shutil.copy2(sample.label_path, destination_label)
            rows.append(
                {
                    "image_path": destination_image.as_posix(),
                    "label_path": destination_label.as_posix(),
                    "source_dataset": sample.source_dataset,
                    "source_video": sample.source_video,
                    "location": sample.location,
                    "split": split,
                    "has_pothole": int(sample.has_pothole),
                    "bbox_count": sample.bbox_count,
                }
            )

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "image_path",
        "label_path",
        "source_dataset",
        "source_video",
        "location",
        "split",
        "has_pothole",
        "bbox_count",
    ]
    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    manifest_digest = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
    version = {
        "version": dataset_version,
        "created_at": datetime.now(UTC).isoformat(),
        "image_count": len(rows),
        "bbox_count": sum(int(row["bbox_count"]) for row in rows),
        "sources": sorted({str(row["source_dataset"]) for row in rows}),
        "split_ratios": {"train": train_ratio, "val": val_ratio, "test": test_ratio},
        "split_counts": {name: len(values) for name, values in splits.items()},
        "seed": seed,
        "duplicate_hash": {
            "algorithm": "dhash64",
            "max_hamming_distance": duplicate_distance,
        },
        "manifest_sha256": manifest_digest,
    }
    version_path.parent.mkdir(parents=True, exist_ok=True)
    version_path.write_text(json.dumps(version, indent=2) + "\n", encoding="utf-8")
    return {
        "images": len(rows),
        "boxes": version["bbox_count"],
        "train": len(splits["train"]),
        "val": len(splits["val"]),
        "test": len(splits["test"]),
    }


def parse_source(value: str) -> tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("source must use NAME=PATH")
    name, path = value.split("=", 1)
    if not name or not path:
        raise argparse.ArgumentTypeError("source must use NAME=PATH")
    return name, Path(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build a leakage-safe single-class YOLO pothole dataset"
    )
    parser.add_argument(
        "--source",
        action="append",
        type=parse_source,
        required=True,
        help="Normalized source as NAME=PATH",
    )
    parser.add_argument(
        "--output", type=Path, default=Path("datasets/processed/pothole")
    )
    parser.add_argument(
        "--manifest", type=Path, default=Path("datasets/manifests/dataset_manifest.csv")
    )
    parser.add_argument(
        "--version-file", type=Path, default=Path("datasets/manifests/version.json")
    )
    parser.add_argument("--dataset-version", default="pothole-dataset-v1")
    parser.add_argument("--train-ratio", type=float, default=0.70)
    parser.add_argument("--val-ratio", type=float, default=0.20)
    parser.add_argument("--test-ratio", type=float, default=0.10)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-negative-ratio", type=float, default=1.0)
    parser.add_argument("--duplicate-distance", type=int, default=6)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    summary = build_dataset(
        args.source,
        args.output,
        args.manifest,
        args.version_file,
        args.dataset_version,
        args.train_ratio,
        args.val_ratio,
        args.test_ratio,
        args.seed,
        args.max_negative_ratio,
        args.duplicate_distance,
        args.overwrite,
    )
    print(f"Dataset build complete: {summary}; manifest={args.manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
