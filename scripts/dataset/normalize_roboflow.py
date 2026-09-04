from __future__ import annotations

import argparse
import csv
import shutil
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import iter_images, parse_yolo_lines


def class_names(config: dict) -> dict[int, str]:
    names = config.get("names", {})
    if isinstance(names, list):
        return dict(enumerate(str(value) for value in names))
    if isinstance(names, dict):
        return {int(key): str(value) for key, value in names.items()}
    raise ValueError("Roboflow data.yaml must contain names as a list or mapping")


def normalize_roboflow(
    source: Path,
    output: Path,
    accepted_labels: set[str],
    overwrite: bool = False,
) -> dict[str, int]:
    yaml_path = source / "data.yaml"
    if not yaml_path.is_file():
        raise ValueError(f"Missing Roboflow data.yaml: {yaml_path}")
    config = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
    names = class_names(config)
    accepted = {name.casefold() for name in accepted_labels}
    accepted_ids = {
        class_id for class_id, name in names.items() if name.casefold() in accepted
    }
    if not accepted_ids:
        raise ValueError(
            f"None of the explicitly accepted labels exist in data.yaml; classes={names}"
        )

    image_output = output / "images"
    label_output = output / "labels"
    image_output.mkdir(parents=True, exist_ok=True)
    label_output.mkdir(parents=True, exist_ok=True)
    metadata = []
    counts = {"images": 0, "positive_images": 0, "negative_images": 0, "boxes": 0}
    for image_path in iter_images(source):
        parts = list(image_path.parts)
        try:
            image_index = len(parts) - 1 - parts[::-1].index("images")
        except ValueError:
            continue
        parts[image_index] = "labels"
        label_path = Path(*parts).with_suffix(".txt")
        if not label_path.is_file():
            continue
        boxes, errors = parse_yolo_lines(
            label_path.read_text(encoding="utf-8").splitlines()
        )
        if errors:
            raise ValueError(f"Invalid source label {label_path}: {errors[0][1]}")
        normalized = [
            (x, y, width, height)
            for class_id, x, y, width, height in boxes
            if class_id in accepted_ids
        ]
        split = image_path.parts[image_index - 1] if image_index > 0 else "unspecified"
        destination_name = f"{split}_{image_path.name}"
        destination_image = image_output / destination_name
        destination_label = label_output / f"{Path(destination_name).stem}.txt"
        if destination_image.exists() and not overwrite:
            raise ValueError(f"destination already exists: {destination_image}")
        shutil.copy2(image_path, destination_image)
        destination_label.write_text(
            "".join(
                f"0 {x:.8f} {y:.8f} {width:.8f} {height:.8f}\n"
                for x, y, width, height in normalized
            ),
            encoding="utf-8",
        )
        metadata.append(
            {
                "image_path": destination_image.as_posix(),
                "label_path": destination_label.as_posix(),
                "source_dataset": f"Roboflow:{source.name}",
                "source_video": "",
                "location": "unknown",
                "group_id": f"Roboflow:{source.name}:{split}:{image_path.stem}",
                "has_pothole": int(bool(normalized)),
                "bbox_count": len(normalized),
            }
        )
        counts["images"] += 1
        counts["positive_images" if normalized else "negative_images"] += 1
        counts["boxes"] += len(normalized)

    with (output / "metadata.csv").open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "image_path",
            "label_path",
            "source_dataset",
            "source_video",
            "location",
            "group_id",
            "has_pothole",
            "bbox_count",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(metadata)
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Conservatively normalize a reviewed Roboflow YOLO export"
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument(
        "--output", type=Path, default=Path("datasets/raw/roboflow/normalized")
    )
    parser.add_argument("--accepted-label", action="append", default=["pothole"])
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    counts = normalize_roboflow(
        args.input, args.output, set(args.accepted_label), args.overwrite
    )
    print(f"Roboflow normalization complete: {counts}; output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
