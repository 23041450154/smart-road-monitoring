from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import bbox_iou, iter_images, parse_yolo_lines
from training.scripts.runtime import automatic_device, load_dataset_config


def ground_truth_boxes(label_path: Path, width: int, height: int):
    boxes, errors = parse_yolo_lines(
        label_path.read_text(encoding="utf-8").splitlines(), {0}
    )
    if errors:
        raise ValueError(f"Invalid label {label_path}: {errors[0][1]}")
    return [
        (
            (x - box_width / 2) * width,
            (y - box_height / 2) * height,
            (x + box_width / 2) * width,
            (y + box_height / 2) * height,
        )
        for _, x, y, box_width, box_height in boxes
    ]


def analyze_image(
    predictions, truths, confidence_threshold: float, iou_threshold: float
):
    matched_truths: set[int] = set()
    categories: list[tuple[str, tuple[float, float, float, float], float | None]] = []
    ordered_predictions = sorted(predictions, key=lambda item: item[1], reverse=True)
    for box, confidence in ordered_predictions:
        available = [
            (index, bbox_iou(box, truth))
            for index, truth in enumerate(truths)
            if index not in matched_truths
        ]
        best_index, best_iou = max(
            available, key=lambda item: item[1], default=(-1, 0.0)
        )
        if confidence < confidence_threshold:
            categories.append(("low_confidence", box, confidence))
        elif best_iou >= iou_threshold:
            matched_truths.add(best_index)
            categories.append(("correct_detection", box, confidence))
        else:
            categories.append(("false_positive", box, confidence))
    for index, truth in enumerate(truths):
        if index not in matched_truths:
            categories.append(("false_negative", truth, None))
    return categories


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Collect test-set pothole detection errors for manual review"
    )
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument(
        "--data", type=Path, default=Path("training/configs/pothole.yaml")
    )
    parser.add_argument(
        "--output", type=Path, default=Path("datasets/reports/error_analysis")
    )
    parser.add_argument("--confidence", type=float, default=0.40)
    parser.add_argument("--low-confidence", type=float, default=0.10)
    parser.add_argument("--iou", type=float, default=0.50)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--confirm-final-test", action="store_true")
    args = parser.parse_args()
    if not args.confirm_final_test:
        raise SystemExit(
            "Error analysis consumes the held-out test set; pass --confirm-final-test after model selection"
        )
    if not args.model.is_file():
        raise SystemExit(f"Model not found: {args.model}")

    from PIL import Image, ImageDraw
    from ultralytics import YOLO

    config = load_dataset_config(args.data)
    dataset_root = Path(config["path"])
    images_root = dataset_root / config["test"]
    labels_root = dataset_root / "labels" / "test"
    images = iter_images(images_root)
    if args.limit is not None:
        images = images[: args.limit]
    for category in (
        "false_positive",
        "false_negative",
        "low_confidence",
        "correct_detection",
    ):
        (args.output / category).mkdir(parents=True, exist_ok=True)

    model = YOLO(str(args.model))
    device = automatic_device(args.device)
    report_rows = []
    for image_path in images:
        label_path = labels_root / image_path.relative_to(images_root).with_suffix(
            ".txt"
        )
        with Image.open(image_path) as loaded:
            image = loaded.convert("RGB")
        truths = ground_truth_boxes(label_path, image.width, image.height)
        result = model.predict(
            source=image,
            conf=args.low_confidence,
            device=device,
            verbose=False,
        )[0]
        predictions = [
            (
                tuple(float(value) for value in box.xyxy[0].tolist()),
                float(box.conf.item()),
            )
            for box in result.boxes
            if int(box.cls.item()) == 0
        ]
        categories = analyze_image(predictions, truths, args.confidence, args.iou)
        counts = {
            name: 0
            for name in (
                "false_positive",
                "false_negative",
                "low_confidence",
                "correct_detection",
            )
        }
        for category, _, _ in categories:
            counts[category] += 1
        for category in counts:
            if not counts[category]:
                continue
            annotated = image.copy()
            draw = ImageDraw.Draw(annotated)
            colors = {
                "false_positive": "red",
                "false_negative": "orange",
                "low_confidence": "yellow",
                "correct_detection": "lime",
            }
            for item_category, box, confidence in categories:
                if item_category != category:
                    continue
                draw.rectangle(box, outline=colors[category], width=3)
                label = (
                    category if confidence is None else f"{category} {confidence:.2f}"
                )
                draw.text(
                    (box[0] + 3, max(0, box[1] - 14)), label, fill=colors[category]
                )
            annotated.save(
                args.output / category / f"{image_path.stem}.jpg", quality=92
            )
        report_rows.append(
            {
                "filename": image_path.as_posix(),
                **counts,
                "review_note": "manual semantic categorization required",
            }
        )

    with (args.output / "error_analysis.csv").open(
        "w", newline="", encoding="utf-8"
    ) as handle:
        fieldnames = [
            "filename",
            "false_positive",
            "false_negative",
            "low_confidence",
            "correct_detection",
            "review_note",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(report_rows)
    print(f"Analyzed {len(report_rows)} test image(s); output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
