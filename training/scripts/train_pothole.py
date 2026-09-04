from __future__ import annotations

import argparse
import json
import sys
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.validate_labels import validate_dataset_labels
from training.scripts.runtime import (
    append_experiment,
    automatic_device,
    best_epoch,
    detect_hardware,
    environment_text,
    load_dataset_config,
    metric_value,
)


def configured_value(arguments, config: dict, name: str, default=None):
    value = getattr(arguments, name)
    return config.get(name, default) if value is None else value


def parse_batch(value: str) -> int | float | str:
    if value == "auto":
        return value
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError as exc:
            raise argparse.ArgumentTypeError(
                "batch must be auto, an integer, or a fraction"
            ) from exc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fine-tune a lightweight Ultralytics YOLO pothole model"
    )
    parser.add_argument(
        "--data", type=Path, default=Path("training/configs/pothole.yaml")
    )
    parser.add_argument(
        "--config", type=Path, default=Path("training/configs/train.yaml")
    )
    parser.add_argument("--model")
    parser.add_argument("--epochs", type=int)
    parser.add_argument("--imgsz", type=int)
    parser.add_argument("--batch", type=parse_batch)
    parser.add_argument("--patience", type=int)
    parser.add_argument("--workers", type=int)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--project", type=Path, default=Path("training/runs"))
    parser.add_argument("--name", default="pothole_baseline")
    parser.add_argument("--dataset-version", default="pothole-dataset-v1")
    parser.add_argument("--resume", nargs="?", const=True)
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run 1 epoch at 320 px to verify the pipeline",
    )
    args = parser.parse_args()

    try:
        from ultralytics import YOLO, __version__ as ultralytics_version
    except ImportError as exc:
        raise SystemExit(
            "Ultralytics is not installed; run `make vision-install`"
        ) from exc

    train_config = yaml.safe_load(args.config.read_text(encoding="utf-8")) or {}
    data_config = load_dataset_config(args.data)
    dataset_root = Path(data_config["path"])
    validation_errors = 0
    for split in ("train", "val", "test"):
        summary = validate_dataset_labels(
            dataset_root / "images" / split,
            dataset_root / "labels" / split,
            Path("datasets/reports") / f"label_validation_{split}.csv",
        )
        validation_errors += summary["critical_errors"]
    if validation_errors:
        raise SystemExit(
            f"Training blocked: {validation_errors} critical label error(s)"
        )

    hardware = detect_hardware()
    device = automatic_device(args.device)
    model_name = configured_value(args, train_config, "model", "yolo11n.pt")
    epochs = configured_value(args, train_config, "epochs", 100)
    imgsz = configured_value(args, train_config, "imgsz", 640)
    batch = configured_value(args, train_config, "batch", "auto")
    patience = configured_value(args, train_config, "patience", 20)
    workers = configured_value(args, train_config, "workers", None)
    seed = configured_value(args, train_config, "seed", 42)
    if workers in (None, "auto"):
        workers = min(4, max(1, (hardware["logical_cpu_count"] or 2) // 2))
    if batch == "auto":
        batch = -1
    if args.smoke:
        epochs, imgsz, patience = 1, min(int(imgsz), 320), 1
        args.name = f"{args.name}_smoke"

    print(
        json.dumps(
            {
                "hardware": hardware,
                "device": device,
                "ultralytics": ultralytics_version,
            },
            indent=2,
        )
    )
    if device == "cpu" and not args.smoke:
        print(
            "WARNING: no CUDA GPU detected; full training may take many hours on this machine"
        )

    augmentation = train_config.get("augmentation", {})
    started = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="pothole-data-") as temporary_directory:
        resolved_yaml = Path(temporary_directory) / "pothole.resolved.yaml"
        resolved_yaml.write_text(
            yaml.safe_dump(data_config, sort_keys=False), encoding="utf-8"
        )
        model = YOLO(str(args.resume) if isinstance(args.resume, str) else model_name)
        results = model.train(
            data=str(resolved_yaml),
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            patience=patience,
            workers=workers,
            seed=seed,
            deterministic=True,
            device=device,
            project=str(args.project),
            name=args.name,
            resume=args.resume is not None,
            exist_ok=False,
            cache=False,
            plots=True,
            degrees=augmentation.get("degrees", 2.0),
            translate=augmentation.get("translate", 0.1),
            scale=augmentation.get("scale", 0.25),
            perspective=augmentation.get("perspective", 0.0005),
            fliplr=augmentation.get("fliplr", 0.5),
            flipud=0.0,
            hsv_h=augmentation.get("hsv_h", 0.015),
            hsv_s=augmentation.get("hsv_s", 0.3),
            hsv_v=augmentation.get("hsv_v", 0.2),
        )
    elapsed = time.perf_counter() - started
    save_dir = Path(results.save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    (save_dir / "environment.txt").write_text(
        environment_text(hardware), encoding="utf-8"
    )
    snapshot = {
        "created_at": datetime.now(UTC).isoformat(),
        "model": model_name,
        "data": data_config,
        "dataset_version": args.dataset_version,
        "epochs_requested": epochs,
        "imgsz": imgsz,
        "batch": batch,
        "patience": patience,
        "workers": workers,
        "seed": seed,
        "device": device,
        "smoke": args.smoke,
        "augmentation": augmentation,
    }
    (save_dir / "configuration_snapshot.json").write_text(
        json.dumps(snapshot, indent=2) + "\n", encoding="utf-8"
    )
    metrics = {
        "precision": metric_value(results, "metrics/precision(B)"),
        "recall": metric_value(results, "metrics/recall(B)"),
        "mAP50": metric_value(results, "metrics/mAP50(B)"),
        "mAP50_95": metric_value(results, "metrics/mAP50-95(B)"),
    }
    (save_dir / "measured_metrics.json").write_text(
        json.dumps(metrics, indent=2) + "\n", encoding="utf-8"
    )
    append_experiment(
        args.project / "experiments.csv",
        {
            "experiment_id": save_dir.name,
            "model": model_name,
            "dataset_version": args.dataset_version,
            "epochs": epochs,
            "imgsz": imgsz,
            "batch": batch,
            "device": device,
            **metrics,
            "training_time": round(elapsed, 3),
            "best_epoch": best_epoch(save_dir / "results.csv"),
        },
    )
    print(
        f"Training complete; run={save_dir}; elapsed_seconds={elapsed:.3f}; metrics={metrics}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
