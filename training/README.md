# Pothole Dataset and Training Pipeline

Pipeline ini hanya melatih model `class 0 = pothole` untuk video jalan yang direkam manual. Model kendaraan CCTV tetap memakai bobot COCO pretrained dan ByteTrack.

## 1. Install dependencies

```bash
make vision-install
```

Target saat implementasi ini memakai Ultralytics 8.3.190 dan baseline `yolo11n.pt`. Script memilih CUDA device 0 jika tersedia, selain itu CPU. Versi aktual selalu direkam di `training/runs/<experiment>/environment.txt`.

## 2. Download and convert RDD2022

Attribution, license, checksum, and measured source counts are recorded in [`docs/datasets.md`](../docs/datasets.md). Download one country subset from the official public Figshare v1 archive:

```bash
.venv/bin/python scripts/dataset/download_rdd2022_subset.py \
  --country china-motorbike \
  --output datasets/raw/rdd2022

unzip datasets/raw/rdd2022/China_MotorBike.zip \
  -d datasets/raw/rdd2022

.venv/bin/python scripts/dataset/convert_rdd2022.py \
  --input datasets/raw/rdd2022/China_MotorBike \
  --output datasets/raw/rdd2022/converted \
  --include-negatives \
  --sequence-group-size 25
```

Only D40 is retained and mapped to class 0. D00, D10, D20, and Repair are discarded as labels. Reviewed images without D40 remain traceable candidate negatives. Official test images have no public ground truth and are not used for evaluation.

## 3. Add Palembang local data

Place authorized manual recordings under `datasets/raw/palembang/videos/`, then extract sparse frames:

```bash
.venv/bin/python scripts/dataset/extract_frames.py \
  --input datasets/raw/palembang/videos \
  --output datasets/raw/palembang/images \
  --fps 1 \
  --recursive
```

Use `--interval-seconds` instead of `--fps` when desired, and `--max-frames` to cap each video. Do not extract all 30 FPS frames. The filename and extraction manifest preserve the source video/session.

## 4. Annotate local images

Use CVAT, Roboflow, or Label Studio and export YOLO bounding boxes. Follow [`docs/annotation-guide.md`](../docs/annotation-guide.md). Put labels in `datasets/raw/palembang/labels/`; create an empty `.txt` for every reviewed negative image. Never generate ground truth from the same model being trained.

## 5. Validate quality and labels

```bash
.venv/bin/python scripts/dataset/check_images.py \
  --input datasets/raw/palembang/images

.venv/bin/python scripts/dataset/find_duplicates.py \
  --input datasets/raw/palembang/images

.venv/bin/python scripts/dataset/validate_labels.py \
  --images datasets/raw/palembang/images \
  --labels datasets/raw/palembang/labels

.venv/bin/python scripts/dataset/visualize_annotations.py \
  --images datasets/raw/palembang/images \
  --labels datasets/raw/palembang/labels \
  --count 50
```

Quality checks generate review manifests and never delete source files. Training stops on corrupt images, malformed/non-finite/out-of-range boxes, invalid class IDs, missing labels, or orphan labels.

## 6. Normalize an optional Roboflow export

Use a public project only after recording its source/license in `docs/datasets.md`. Inspect `data.yaml` and explicitly accept only reviewed pothole class names:

```bash
.venv/bin/python scripts/dataset/normalize_roboflow.py \
  --input datasets/raw/roboflow/reviewed-export \
  --output datasets/raw/roboflow/normalized \
  --accepted-label pothole \
  --accepted-label road-pothole
```

The generic label `hole` is not mapped unless a reviewer explicitly confirms it represents road potholes.

## 7. Build a dataset version

Public sequential IDs are grouped in windows and Palembang frames are grouped by source video. Perceptual near-duplicate groups are then joined before deterministic splitting, preventing one group from crossing train/validation/test.

```bash
.venv/bin/python scripts/dataset/build_dataset.py \
  --source RDD2022=datasets/raw/rdd2022/converted \
  --output datasets/processed/pothole \
  --manifest datasets/manifests/dataset_manifest.csv \
  --version-file datasets/manifests/version.json \
  --dataset-version pothole-dataset-v1 \
  --train-ratio 0.70 \
  --val-ratio 0.20 \
  --test-ratio 0.10 \
  --max-negative-ratio 1.0 \
  --seed 42 \
  --overwrite

.venv/bin/python scripts/dataset/dataset_stats.py
```

After local labels exist, add `--source Palembang=datasets/raw/palembang`. Add a normalized Roboflow source only after manual review.

## 8. Smoke train

Always verify paths, labels, PyTorch, and YOLO before a long run:

```bash
make smoke-train-pothole
```

Smoke output is diagnostic and must not be promoted as the production model.

## 9. Full baseline training

```bash
make train-pothole
```

Equivalent explicit command:

```bash
.venv/bin/python training/scripts/train_pothole.py \
  --data training/configs/pothole.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch auto \
  --patience 20 \
  --seed 42 \
  --device auto \
  --name pothole_baseline
```

Resume from an interrupted checkpoint:

```bash
.venv/bin/python training/scripts/train_pothole.py \
  --data training/configs/pothole.yaml \
  --resume training/runs/pothole_baseline/weights/last.pt
```

Use validation metrics to select the model. A small-model comparison may use `yolo11s.pt` only when GPU resources are sufficient; larger is not assumed better.

## 10. Final test evaluation

Do not tune on the test set. Train learns parameters, validation selects a model, and test is consumed once for final reporting.

```bash
.venv/bin/python training/scripts/evaluate_pothole.py \
  --model training/runs/pothole_baseline/weights/best.pt \
  --data training/configs/pothole.yaml \
  --split test \
  --confirm-final-test
```

Ultralytics saves measured precision, recall, mAP, confusion matrix, PR curve, F1 curve, sample batches, model size, and inference timing. Run a separate Palembang-only test YAML when local data becomes available; do not merge public and local results without labeling the domains.

Generate reviewable false positives/negatives only after final model selection:

```bash
.venv/bin/python training/scripts/error_analysis.py \
  --model training/runs/pothole_baseline/weights/best.pt \
  --confirm-final-test
```

## 11. Promote the selected model

```bash
.venv/bin/python training/scripts/promote_model.py \
  --model training/runs/pothole_baseline/weights/best.pt \
  --metrics training/runs/pothole_evaluation/evaluation_metrics.json \
  --version v1 \
  --dataset-version pothole-dataset-v1 \
  --base-model yolo11n.pt \
  --imgsz 640
```

This preserves `pothole-v1.pt`, updates active `vision/models/pothole/best.pt`, and writes measured metadata. The original run is not deleted. Optional ONNX export:

```bash
.venv/bin/python training/scripts/export_model.py \
  --model vision/models/pothole/best.pt \
  --format onnx
```

## 12. Image/video inference and worker integration

```bash
.venv/bin/python training/scripts/predict_images.py \
  --model vision/models/pothole/best.pt \
  --source samples/ \
  --output predictions/

.venv/bin/python training/scripts/predict_video.py \
  --model vision/models/pothole/best.pt \
  --source road.mp4 \
  --output road_detected.mp4

POTHOLE_MODEL_PATH=vision/models/pothole/best.pt \
POTHOLE_CONFIDENCE_THRESHOLD=0.40 \
PYTHONPATH=backend:. .venv/bin/python pothole_worker.py \
  --video road.mp4 \
  --gps road.gpx
```

If `best.pt` is unavailable, inference exits with an error and produces no fake detection. Severity defaults to `unknown`; confidence does not determine physical severity.
