from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Optionally export a trained pothole model"
    )
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--format", choices=["onnx"], default="onnx")
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()
    if not args.model.is_file():
        raise SystemExit(f"Model not found: {args.model}")
    from ultralytics import YOLO

    exported = YOLO(str(args.model)).export(format=args.format, imgsz=args.imgsz)
    print(f"Exported model: {exported}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
