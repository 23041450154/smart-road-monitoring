from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import iter_images, parse_yolo_lines


def validate_dataset_labels(
    images_root: Path, labels_root: Path, report: Path
) -> dict[str, int]:
    from PIL import Image

    rows: list[dict[str, str | int]] = []
    critical = 0
    valid = 0
    images = iter_images(images_root)
    image_relatives = {
        path.relative_to(images_root).with_suffix(""): path for path in images
    }
    label_relatives = {
        path.relative_to(labels_root).with_suffix(""): path
        for path in labels_root.rglob("*.txt")
        if path.is_file()
    }

    for relative, image_path in image_relatives.items():
        label_path = label_relatives.get(relative)
        try:
            with Image.open(image_path) as image:
                image.verify()
            with Image.open(image_path) as image:
                width, height = image.size
            if width <= 0 or height <= 0:
                raise ValueError("image dimensions must be positive")
        except (OSError, ValueError) as exc:
            critical += 1
            rows.append(
                {
                    "filename": image_path.as_posix(),
                    "label_path": label_path.as_posix() if label_path else "",
                    "line": "",
                    "status": "invalid_image",
                    "severity": "critical",
                    "message": str(exc),
                }
            )
            continue
        if label_path is None:
            critical += 1
            rows.append(
                {
                    "filename": image_path.as_posix(),
                    "label_path": "",
                    "line": "",
                    "status": "orphan_image",
                    "severity": "critical",
                    "message": "matching label file is missing; use an empty file for a verified negative",
                }
            )
            continue
        boxes, errors = parse_yolo_lines(
            label_path.read_text(encoding="utf-8").splitlines(), {0}
        )
        if errors:
            critical += len(errors)
            rows.extend(
                {
                    "filename": image_path.as_posix(),
                    "label_path": label_path.as_posix(),
                    "line": line,
                    "status": "invalid_label",
                    "severity": "critical",
                    "message": message,
                }
                for line, message in errors
            )
        else:
            valid += 1
            rows.append(
                {
                    "filename": image_path.as_posix(),
                    "label_path": label_path.as_posix(),
                    "line": "",
                    "status": "valid_positive" if boxes else "valid_negative",
                    "severity": "info",
                    "message": f"{len(boxes)} bounding box(es)",
                }
            )

    for relative, label_path in label_relatives.items():
        if relative not in image_relatives:
            critical += 1
            rows.append(
                {
                    "filename": "",
                    "label_path": label_path.as_posix(),
                    "line": "",
                    "status": "orphan_label",
                    "severity": "critical",
                    "message": "matching image file is missing",
                }
            )

    report.parent.mkdir(parents=True, exist_ok=True)
    with report.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = ["filename", "label_path", "line", "status", "severity", "message"]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return {"images": len(images), "valid_images": valid, "critical_errors": critical}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate single-class YOLO pothole annotations"
    )
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--labels", type=Path, required=True)
    parser.add_argument(
        "--report", type=Path, default=Path("datasets/reports/label_validation.csv")
    )
    parser.add_argument(
        "--no-fail",
        action="store_true",
        help="Write the report but return zero despite critical errors",
    )
    args = parser.parse_args()
    summary = validate_dataset_labels(args.images, args.labels, args.report)
    print(f"Label validation: {summary}; report={args.report}")
    return 1 if summary["critical_errors"] and not args.no_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
