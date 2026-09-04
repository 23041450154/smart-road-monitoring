from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import parse_yolo_lines


def dataset_statistics(manifest_path: Path) -> dict:
    from PIL import Image

    with manifest_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    splits = Counter(row["split"] for row in rows)
    sources = Counter(row["source_dataset"] for row in rows)
    resolutions: Counter[str] = Counter()
    bbox_counts: list[int] = []
    bbox_areas: list[float] = []
    for row in rows:
        image_path = Path(row["image_path"])
        label_path = Path(row["label_path"])
        with Image.open(image_path) as image:
            resolutions[f"{image.width}x{image.height}"] += 1
        boxes, errors = parse_yolo_lines(
            label_path.read_text(encoding="utf-8").splitlines(), {0}
        )
        if errors:
            raise ValueError(f"Invalid label {label_path}: {errors[0][1]}")
        bbox_counts.append(len(boxes))
        bbox_areas.extend(width * height for _, _, _, width, height in boxes)
    area_distribution = {
        "small_under_1_percent": sum(area < 0.01 for area in bbox_areas),
        "medium_1_to_10_percent": sum(0.01 <= area < 0.10 for area in bbox_areas),
        "large_10_percent_or_more": sum(area >= 0.10 for area in bbox_areas),
    }
    return {
        "total_images": len(rows),
        "train_images": splits["train"],
        "validation_images": splits["val"],
        "test_images": splits["test"],
        "positive_images": sum(row["has_pothole"] == "1" for row in rows),
        "negative_images": sum(row["has_pothole"] == "0" for row in rows),
        "total_bounding_boxes": sum(bbox_counts),
        "images_per_source": dict(sorted(sources.items())),
        "bounding_boxes_per_image": {
            "mean": round(statistics.mean(bbox_counts), 4) if bbox_counts else 0,
            "median": statistics.median(bbox_counts) if bbox_counts else 0,
            "maximum": max(bbox_counts, default=0),
        },
        "resolution_distribution": dict(sorted(resolutions.items())),
        "bounding_box_size_distribution": area_distribution,
    }


def write_statistics(
    statistics_data: dict, json_path: Path, markdown_path: Path
) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(statistics_data, indent=2) + "\n", encoding="utf-8")
    source_lines = (
        "\n".join(
            f"- {name}: {count}"
            for name, count in statistics_data["images_per_source"].items()
        )
        or "- None"
    )
    resolution_lines = (
        "\n".join(
            f"- {name}: {count}"
            for name, count in statistics_data["resolution_distribution"].items()
        )
        or "- None"
    )
    markdown_path.write_text(
        "# Pothole Dataset Statistics\n\n"
        f"- Total images: {statistics_data['total_images']}\n"
        f"- Train images: {statistics_data['train_images']}\n"
        f"- Validation images: {statistics_data['validation_images']}\n"
        f"- Test images: {statistics_data['test_images']}\n"
        f"- Positive images: {statistics_data['positive_images']}\n"
        f"- Negative images: {statistics_data['negative_images']}\n"
        f"- Total bounding boxes: {statistics_data['total_bounding_boxes']}\n\n"
        "## Images per source\n\n"
        f"{source_lines}\n\n"
        "## Bounding boxes per image\n\n"
        f"- Mean: {statistics_data['bounding_boxes_per_image']['mean']}\n"
        f"- Median: {statistics_data['bounding_boxes_per_image']['median']}\n"
        f"- Maximum: {statistics_data['bounding_boxes_per_image']['maximum']}\n\n"
        "## Resolution distribution\n\n"
        f"{resolution_lines}\n\n"
        "## Bounding-box area distribution\n\n"
        + "\n".join(
            f"- {name}: {count}"
            for name, count in statistics_data["bounding_box_size_distribution"].items()
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate measured pothole dataset statistics"
    )
    parser.add_argument(
        "--manifest", type=Path, default=Path("datasets/manifests/dataset_manifest.csv")
    )
    parser.add_argument(
        "--json", type=Path, default=Path("datasets/reports/dataset_statistics.json")
    )
    parser.add_argument(
        "--markdown", type=Path, default=Path("datasets/reports/dataset_statistics.md")
    )
    args = parser.parse_args()
    data = dataset_statistics(args.manifest)
    write_statistics(data, args.json, args.markdown)
    print(f"Dataset statistics written to {args.json} and {args.markdown}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
