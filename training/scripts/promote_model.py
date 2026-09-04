from __future__ import annotations

import argparse
import json
import shutil
from datetime import UTC, datetime
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Promote a selected, evaluated pothole checkpoint"
    )
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument(
        "--metrics", type=Path, required=True, help="Measured evaluation_metrics.json"
    )
    parser.add_argument("--version", required=True, help="Version such as v1")
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--base-model", required=True)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--output", type=Path, default=Path("vision/models/pothole"))
    args = parser.parse_args()
    if not args.model.is_file() or not args.metrics.is_file():
        raise SystemExit("A real checkpoint and measured evaluation file are required")
    metrics = json.loads(args.metrics.read_text(encoding="utf-8"))
    args.output.mkdir(parents=True, exist_ok=True)
    versioned = args.output / f"pothole-{args.version}.pt"
    active = args.output / "best.pt"
    shutil.copy2(args.model, versioned)
    shutil.copy2(args.model, active)
    metadata = {
        "status": "active",
        "model": args.base_model,
        "artifact": active.as_posix(),
        "versioned_artifact": versioned.as_posix(),
        "dataset_version": args.dataset_version,
        "trained_at": datetime.now(UTC).isoformat(),
        "classes": ["pothole"],
        "imgsz": args.imgsz,
        "metrics": {
            "precision": metrics.get("precision"),
            "recall": metrics.get("recall"),
            "f1": metrics.get("f1"),
            "map50": metrics.get("mAP50"),
            "map50_95": metrics.get("mAP50_95"),
        },
    }
    (args.output / "model_metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Promoted {versioned} and active model {active}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
