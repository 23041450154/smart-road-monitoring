from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from training.scripts.runtime import automatic_device


def main() -> int:
    parser = argparse.ArgumentParser(description="Save pothole predictions for images")
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("predictions"))
    parser.add_argument("--confidence", type=float, default=0.40)
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()
    if not args.model.is_file():
        raise SystemExit(
            f"Model not found: {args.model}; no fake predictions were generated"
        )
    from ultralytics import YOLO

    results = YOLO(str(args.model)).predict(
        source=str(args.source),
        conf=args.confidence,
        device=automatic_device(args.device),
        save=True,
        project=str(args.output.parent),
        name=args.output.name,
        exist_ok=True,
        verbose=False,
    )
    print(f"Predicted {len(results)} image(s); output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
