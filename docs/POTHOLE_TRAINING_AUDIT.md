# Pothole Training Audit

Audit date: 2026-09-05

## Scope

This audit covers only the custom pothole model used with manually recorded road video. The existing public-CCTV vehicle detector and ByteTrack traffic pipeline remain unchanged.

## Existing implementation

- `vision/pothole_worker/pothole_worker.py` opens a manual video, derives frame timestamps, interpolates GPX positions, invokes a pothole detector, suppresses database duplicates by spatial radius, saves image evidence, and persists pothole rows.
- `vision/pothole_worker/detection.py` provides an Ultralytics YOLO adapter and an explicitly synthetic demo detector.
- `vision/pothole_worker/gps.py` parses timestamped GPX track points and performs linear interpolation.
- `backend/app/pothole/deduplication.py` suppresses detections close to an existing pothole using Haversine distance.
- `backend/app/api/potholes.py` accepts pothole events and persists latitude, longitude, confidence, detection time, image evidence, and status.
- Existing tests cover basic GPX interpolation and API/database spatial deduplication.

## Gaps found

- No raw/processed dataset structure, provenance ledger, label converter, quality validation, grouped split, manifest, or statistics pipeline.
- No training/evaluation/prediction/export scripts or experiment ledger.
- No checked-in dataset or trained pothole artifact. This is correct from a repository-size and licensing perspective, but prevents immediate model training.
- No Palembang local road videos or verified annotations are currently present.
- The worker reads the generic `YOLO_CONFIDENCE` variable instead of a pothole-specific threshold.
- The CLI requires a severity value and defaults to `medium`, even though model confidence does not scientifically establish physical severity.
- The worker has spatial database deduplication, but no explicit in-memory temporal suppression before database writes.
- Model dependencies are declared in `backend/requirements-vision.txt` but are not installed in the active `.venv`.

## Environment observed

- Python: 3.12.3
- OS: Linux 6.14 x86_64
- Logical CPU count: 8
- CUDA/GPU: not currently available; `torch` and `nvidia-smi` are absent
- Ultralytics: declared as `8.3.190`, not installed in `.venv` at audit time
- Dataset/training status: no real images, annotations, metrics, or weights available

## Safety and truthfulness constraints

- No dataset, annotation, metric, detection, model artifact, or severity estimate will be fabricated.
- Training must stop on critical label errors.
- Consecutive frames must be grouped by source video/session during splitting.
- The test set is reserved for one final evaluation after model selection.
- A trained artifact is copied to `vision/models/pothole/best.pt` only after a real successful run.
