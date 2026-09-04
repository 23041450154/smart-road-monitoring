# Palembang local dataset

Palembang local road recordings are not available in this repository yet.

Place authorized manual road recordings in:

```text
datasets/raw/palembang/videos/
```

Recommended filenames preserve the road/session identity, for example:

```text
jalan_sudirman_20260905_session01.mp4
jalan_demang_20260905_session01.mp4
```

Extract a sparse set of frames for annotation:

```bash
.venv/bin/python scripts/dataset/extract_frames.py \
  --input datasets/raw/palembang/videos \
  --output datasets/raw/palembang/images \
  --fps 1 \
  --recursive
```

Annotate actual potholes as YOLO class `0` and put matching `.txt` files under `datasets/raw/palembang/labels/`. Do not create ground truth from predictions made by the model being trained.
