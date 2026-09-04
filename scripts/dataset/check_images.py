from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import duplicate_groups, iter_images


def inspect_image(path: Path) -> tuple[int, int, float, float]:
    try:
        import cv2
    except ImportError as exc:
        raise SystemExit("OpenCV is required; run `make vision-install`") from exc
    image = cv2.imread(str(path))
    if image is None:
        raise ValueError("corrupt or unsupported image")
    height, width = image.shape[:2]
    grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_score = float(cv2.Laplacian(grayscale, cv2.CV_64F).var())
    brightness = float(grayscale.mean())
    return width, height, blur_score, brightness


def generate_quality_report(
    source: Path,
    report: Path,
    blur_threshold: float = 60.0,
    dark_threshold: float = 25.0,
    duplicate_distance: int = 6,
) -> dict[str, int]:
    images = iter_images(source)
    groups, _ = duplicate_groups(images, duplicate_distance)
    rows = []
    counts = {"ok": 0, "flagged": 0, "corrupt": 0}
    for path in images:
        try:
            width, height, blur_score, brightness = inspect_image(path)
            flags: list[str] = []
            if blur_score < blur_threshold:
                flags.append("blurry")
            if brightness < dark_threshold:
                flags.append("dark")
            if path in groups:
                flags.append("near_duplicate")
            status = ";".join(flags) if flags else "ok"
            counts["flagged" if flags else "ok"] += 1
        except (OSError, ValueError):
            width = height = 0
            blur_score = brightness = 0.0
            status = "corrupt"
            counts["corrupt"] += 1
        rows.append(
            {
                "filename": path.as_posix(),
                "width": width,
                "height": height,
                "blur_score": round(blur_score, 4),
                "brightness": round(brightness, 4),
                "duplicate_group": groups.get(path, ""),
                "status": status,
            }
        )
    report.parent.mkdir(parents=True, exist_ok=True)
    with report.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "filename",
                "width",
                "height",
                "blur_score",
                "brightness",
                "duplicate_group",
                "status",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Flag corrupt, dark, blurry, and duplicate road images"
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument(
        "--report", type=Path, default=Path("datasets/reports/image_quality.csv")
    )
    parser.add_argument("--blur-threshold", type=float, default=60.0)
    parser.add_argument("--dark-threshold", type=float, default=25.0)
    parser.add_argument("--duplicate-distance", type=int, default=6)
    args = parser.parse_args()
    counts = generate_quality_report(
        args.input,
        args.report,
        args.blur_threshold,
        args.dark_threshold,
        args.duplicate_distance,
    )
    print(f"Image quality report={args.report}; counts={counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
