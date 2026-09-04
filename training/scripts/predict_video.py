from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from training.scripts.runtime import automatic_device


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Render pothole detections into a road video"
    )
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--confidence", type=float, default=0.40)
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()
    if not args.model.is_file():
        raise SystemExit(
            f"Model not found: {args.model}; no fake detections were generated"
        )
    if not args.source.is_file():
        raise SystemExit(f"Video not found: {args.source}")
    try:
        import cv2
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit(
            "OpenCV and Ultralytics are required; run `make vision-install`"
        ) from exc

    capture = cv2.VideoCapture(str(args.source))
    if not capture.isOpened():
        raise SystemExit(f"Unable to open video: {args.source}")
    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(args.output), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
    )
    if not writer.isOpened():
        capture.release()
        raise SystemExit(f"Unable to create output video: {args.output}")
    model = YOLO(str(args.model))
    frame_count = 0
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        result = model.predict(
            frame,
            conf=args.confidence,
            device=automatic_device(args.device),
            verbose=False,
        )[0]
        writer.write(result.plot())
        frame_count += 1
    capture.release()
    writer.release()
    print(f"Rendered {frame_count} frame(s); output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
