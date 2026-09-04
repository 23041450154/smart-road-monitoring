from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import iter_images, parse_yolo_lines


def generate_previews(
    images_root: Path,
    labels_root: Path,
    output: Path,
    sample_count: int = 50,
    seed: int = 42,
) -> int:
    from PIL import Image, ImageDraw

    images = iter_images(images_root)
    candidates = [
        path
        for path in images
        if (labels_root / path.relative_to(images_root).with_suffix(".txt")).is_file()
    ]
    random.Random(seed).shuffle(candidates)
    selected = candidates[: min(sample_count, len(candidates))]
    output.mkdir(parents=True, exist_ok=True)
    for path in selected:
        relative = path.relative_to(images_root)
        label_path = labels_root / relative.with_suffix(".txt")
        boxes, errors = parse_yolo_lines(
            label_path.read_text(encoding="utf-8").splitlines(), {0}
        )
        if errors:
            raise ValueError(f"Invalid label {label_path}: {errors[0]}")
        with Image.open(path) as source_image:
            image = source_image.convert("RGB")
        draw = ImageDraw.Draw(image)
        width, height = image.size
        for _, x, y, box_width, box_height in boxes:
            x1 = (x - box_width / 2) * width
            y1 = (y - box_height / 2) * height
            x2 = (x + box_width / 2) * width
            y2 = (y + box_height / 2) * height
            draw.rectangle(
                (x1, y1, x2, y2), outline=(201, 255, 64), width=max(2, width // 320)
            )
            draw.text((x1 + 3, max(0, y1 - 13)), "pothole", fill=(201, 255, 64))
        draw.rectangle((0, 0, min(width, 12 + len(path.name) * 7), 20), fill=(0, 0, 0))
        draw.text((5, 4), path.name, fill=(255, 255, 255))
        image.save(output / f"{path.stem}_annotated.jpg", quality=92)
    return len(selected)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Render random YOLO pothole annotation previews"
    )
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--labels", type=Path, required=True)
    parser.add_argument(
        "--output", type=Path, default=Path("datasets/reports/annotation_samples")
    )
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    count = generate_previews(
        args.images, args.labels, args.output, args.count, args.seed
    )
    print(f"Generated {count} annotation preview(s) in {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
