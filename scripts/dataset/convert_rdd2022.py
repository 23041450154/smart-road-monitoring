from __future__ import annotations

import argparse
import csv
import re
import shutil
import sys
from pathlib import Path
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import IMAGE_EXTENSIONS


def sequence_group(filename: str, size: int) -> str:
    match = re.search(r"(\d+)$", Path(filename).stem)
    if not match:
        return Path(filename).stem
    return f"sequence-{int(match.group(1)) // size:06d}"


def convert_box(
    xmin: float,
    ymin: float,
    xmax: float,
    ymax: float,
    image_width: int,
    image_height: int,
) -> tuple[float, float, float, float]:
    if image_width <= 0 or image_height <= 0:
        raise ValueError("image dimensions must be positive")
    if not (0 <= xmin < xmax <= image_width and 0 <= ymin < ymax <= image_height):
        raise ValueError("Pascal VOC box is outside the image or has zero area")
    return (
        ((xmin + xmax) / 2) / image_width,
        ((ymin + ymax) / 2) / image_height,
        (xmax - xmin) / image_width,
        (ymax - ymin) / image_height,
    )


def _image_index(source: Path) -> dict[str, list[Path]]:
    index: dict[str, list[Path]] = {}
    for path in source.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            index.setdefault(path.name, []).append(path)
    return index


def convert_rdd2022(
    source: Path,
    output: Path,
    include_negatives: bool = False,
    sequence_group_size: int = 25,
    overwrite: bool = False,
) -> dict[str, int]:
    if sequence_group_size <= 0:
        raise ValueError("sequence_group_size must be positive")
    image_output = output / "images"
    label_output = output / "labels"
    image_output.mkdir(parents=True, exist_ok=True)
    label_output.mkdir(parents=True, exist_ok=True)
    image_index = _image_index(source)
    xml_paths = sorted(source.rglob("*.xml"))
    if not xml_paths:
        raise ValueError(f"No Pascal VOC XML files found under {source}")

    metadata: list[dict[str, str | int]] = []
    issues: list[dict[str, str]] = []
    counts = {
        "converted_images": 0,
        "positive_images": 0,
        "negative_images": 0,
        "boxes": 0,
        "skipped": 0,
    }
    for xml_path in xml_paths:
        try:
            root = ElementTree.parse(xml_path).getroot()
            filename = (root.findtext("filename") or "").strip()
            width = int(root.findtext("size/width") or 0)
            height = int(root.findtext("size/height") or 0)
            candidates = image_index.get(filename, [])
            if len(candidates) != 1:
                raise ValueError(
                    f"expected exactly one image named {filename!r}, found {len(candidates)}"
                )
            yolo_boxes: list[tuple[float, float, float, float]] = []
            for object_node in root.findall("object"):
                if (object_node.findtext("name") or "").strip() != "D40":
                    continue
                box = object_node.find("bndbox")
                if box is None:
                    raise ValueError("D40 object has no bndbox")
                yolo_boxes.append(
                    convert_box(
                        float(box.findtext("xmin") or "nan"),
                        float(box.findtext("ymin") or "nan"),
                        float(box.findtext("xmax") or "nan"),
                        float(box.findtext("ymax") or "nan"),
                        width,
                        height,
                    )
                )
            if not yolo_boxes and not include_negatives:
                counts["skipped"] += 1
                continue

            image_path = candidates[0]
            destination_name = image_path.name
            destination_image = image_output / destination_name
            destination_label = label_output / f"{Path(destination_name).stem}.txt"
            if destination_image.exists() and not overwrite:
                raise ValueError(f"destination already exists: {destination_image}")
            shutil.copy2(image_path, destination_image)
            destination_label.write_text(
                "".join(
                    f"0 {x:.8f} {y:.8f} {box_width:.8f} {box_height:.8f}\n"
                    for x, y, box_width, box_height in yolo_boxes
                ),
                encoding="utf-8",
            )
            location = next(
                (
                    part
                    for part in image_path.parts
                    if part
                    in {
                        "China_Drone",
                        "China_MotorBike",
                        "Czech",
                        "India",
                        "Japan",
                        "Norway",
                        "United_States",
                    }
                ),
                "unknown",
            )
            metadata.append(
                {
                    "image_path": destination_image.as_posix(),
                    "label_path": destination_label.as_posix(),
                    "source_dataset": "RDD2022",
                    "source_video": "",
                    "location": location,
                    "group_id": f"RDD2022:{location}:{sequence_group(destination_name, sequence_group_size)}",
                    "has_pothole": int(bool(yolo_boxes)),
                    "bbox_count": len(yolo_boxes),
                }
            )
            counts["converted_images"] += 1
            counts["positive_images" if yolo_boxes else "negative_images"] += 1
            counts["boxes"] += len(yolo_boxes)
        except (ElementTree.ParseError, OSError, TypeError, ValueError) as exc:
            counts["skipped"] += 1
            issues.append({"annotation": xml_path.as_posix(), "error": str(exc)})

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
    with (output / "conversion_issues.csv").open(
        "w", newline="", encoding="utf-8"
    ) as handle:
        writer = csv.DictWriter(handle, fieldnames=["annotation", "error"])
        writer.writeheader()
        writer.writerows(issues)
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert RDD2022 D40 Pascal VOC labels to YOLO class 0"
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument(
        "--output", type=Path, default=Path("datasets/raw/rdd2022/converted")
    )
    parser.add_argument("--include-negatives", action="store_true")
    parser.add_argument("--sequence-group-size", type=int, default=25)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    counts = convert_rdd2022(
        args.input,
        args.output,
        args.include_negatives,
        args.sequence_group_size,
        args.overwrite,
    )
    print(f"RDD2022 conversion complete: {counts}; output={args.output}")
    return 1 if counts["converted_images"] == 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
