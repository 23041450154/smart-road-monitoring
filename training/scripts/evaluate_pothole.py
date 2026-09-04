from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from training.scripts.runtime import automatic_device, load_dataset_config, metric_value


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate a selected pothole model")
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument(
        "--data", type=Path, default=Path("training/configs/pothole.yaml")
    )
    parser.add_argument("--split", choices=["val", "test"], default="test")
    parser.add_argument(
        "--confirm-final-test",
        action="store_true",
        help="Required to consume the held-out test set",
    )
    parser.add_argument("--device", default="auto")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=1)
    parser.add_argument("--project", type=Path, default=Path("training/runs"))
    parser.add_argument("--name", default="pothole_evaluation")
    args = parser.parse_args()
    if args.split == "test" and not args.confirm_final_test:
        raise SystemExit(
            "Test-set evaluation is final-only; pass --confirm-final-test after model selection"
        )
    if not args.model.is_file():
        raise SystemExit(f"Model not found: {args.model}")

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit(
            "Ultralytics is not installed; run `make vision-install`"
        ) from exc
    data_config = load_dataset_config(args.data)
    device = automatic_device(args.device)
    with tempfile.TemporaryDirectory(prefix="pothole-eval-") as temporary_directory:
        resolved_yaml = Path(temporary_directory) / "pothole.resolved.yaml"
        resolved_yaml.write_text(
            yaml.safe_dump(data_config, sort_keys=False), encoding="utf-8"
        )
        results = YOLO(str(args.model)).val(
            data=str(resolved_yaml),
            split=args.split,
            imgsz=args.imgsz,
            batch=args.batch,
            device=device,
            plots=True,
            save_json=True,
            project=str(args.project),
            name=args.name,
        )
    precision = metric_value(results, "metrics/precision(B)")
    recall = metric_value(results, "metrics/recall(B)")
    f1 = (
        2 * precision * recall / (precision + recall)
        if precision is not None and recall is not None and precision + recall
        else None
    )
    inference_ms = float(getattr(results, "speed", {}).get("inference", 0) or 0)
    metrics = {
        "evaluated_at": datetime.now(UTC).isoformat(),
        "split": args.split,
        "model": args.model.as_posix(),
        "model_size_bytes": args.model.stat().st_size,
        "device": str(device),
        "precision": precision,
        "recall": recall,
        "f1": round(f1, 8) if f1 is not None else None,
        "mAP50": metric_value(results, "metrics/mAP50(B)"),
        "mAP50_95": metric_value(results, "metrics/mAP50-95(B)"),
        "inference_ms_per_image": round(inference_ms, 5),
        "fps_from_inference_only": round(1000 / inference_ms, 5)
        if inference_ms
        else None,
    }
    save_dir = Path(results.save_dir)
    (save_dir / "evaluation_metrics.json").write_text(
        json.dumps(metrics, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(metrics, indent=2))
    print(f"Evaluation artifacts: {save_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
