from __future__ import annotations

import csv
import json
import os
import platform
import sys
from pathlib import Path

import yaml


def load_dataset_config(path: Path) -> dict:
    config = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    required = {"path", "train", "val", "test", "names"}
    missing = required - config.keys()
    if missing:
        raise ValueError(f"Dataset YAML is missing keys: {sorted(missing)}")
    names = config["names"]
    normalized_names = (
        {int(key): value for key, value in names.items()}
        if isinstance(names, dict)
        else dict(enumerate(names))
    )
    if normalized_names != {0: "pothole"}:
        raise ValueError(
            f"Dataset must define exactly class 0=pothole, got {normalized_names}"
        )
    dataset_root = Path(config["path"])
    if not dataset_root.is_absolute():
        dataset_root = (path.parent / dataset_root).resolve()
    resolved = dict(config)
    resolved["path"] = dataset_root.as_posix()
    resolved["names"] = {0: "pothole"}
    for split in ("train", "val", "test"):
        split_path = dataset_root / config[split]
        if not split_path.is_dir():
            raise ValueError(f"Dataset split does not exist: {split_path}")
    return resolved


def detect_hardware() -> dict:
    memory_kib = 0
    meminfo = Path("/proc/meminfo")
    if meminfo.is_file():
        for line in meminfo.read_text(encoding="utf-8").splitlines():
            if line.startswith("MemTotal:"):
                memory_kib = int(line.split()[1])
                break
    hardware = {
        "cpu": platform.processor() or platform.machine(),
        "logical_cpu_count": os.cpu_count(),
        "ram_gib": round(memory_kib / 1024 / 1024, 2) if memory_kib else None,
        "gpu_available": False,
        "gpu_models": [],
        "gpu_vram_gib": [],
        "cuda": None,
    }
    try:
        import torch

        hardware["gpu_available"] = torch.cuda.is_available()
        hardware["cuda"] = torch.version.cuda
        if torch.cuda.is_available():
            for index in range(torch.cuda.device_count()):
                properties = torch.cuda.get_device_properties(index)
                hardware["gpu_models"].append(properties.name)
                hardware["gpu_vram_gib"].append(
                    round(properties.total_memory / 1024**3, 2)
                )
    except ImportError:
        pass
    return hardware


def automatic_device(requested: str) -> str | int:
    if requested != "auto":
        return int(requested) if requested.isdigit() else requested
    return 0 if detect_hardware()["gpu_available"] else "cpu"


def environment_text(hardware: dict) -> str:
    versions: dict[str, str | None] = {}
    for module_name in ("ultralytics", "torch", "cv2", "numpy", "PIL", "yaml"):
        try:
            module = __import__(module_name)
            versions[module_name] = getattr(module, "__version__", "unknown")
        except ImportError:
            versions[module_name] = None
    data = {
        "python": sys.version.replace("\n", " "),
        "platform": platform.platform(),
        "hardware": hardware,
        "dependencies": versions,
    }
    return json.dumps(data, indent=2) + "\n"


EXPERIMENT_FIELDS = [
    "experiment_id",
    "model",
    "dataset_version",
    "epochs",
    "imgsz",
    "batch",
    "device",
    "precision",
    "recall",
    "mAP50",
    "mAP50_95",
    "training_time",
    "best_epoch",
]


def append_experiment(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not path.exists() or path.stat().st_size == 0
    with path.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=EXPERIMENT_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow({field: row.get(field, "") for field in EXPERIMENT_FIELDS})


def metric_value(results: object, key: str) -> float | None:
    value = getattr(results, "results_dict", {}).get(key)
    return round(float(value), 8) if value is not None else None


def best_epoch(results_csv: Path) -> int | None:
    if not results_csv.is_file():
        return None
    with results_csv.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        return None
    key = next((name for name in rows[0] if "mAP50-95" in name), None)
    if key is None:
        return None
    index, _ = max(
        enumerate(rows, start=1),
        key=lambda item: float(item[1].get(key, 0) or 0),
    )
    return index
