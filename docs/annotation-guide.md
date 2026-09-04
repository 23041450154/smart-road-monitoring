# Pothole Annotation Guide

## Tools

Use a bounding-box annotation tool that can export YOLO detection labels, such as CVAT, Roboflow, or Label Studio. Keep the original images and export provenance; do not overwrite source recordings.

## Class schema

The dataset has exactly one class:

```text
0 pothole
```

Each non-empty YOLO label line contains:

```text
0 x_center y_center width height
```

All four coordinates are normalized to the inclusive range 0.0–1.0. Width and height must be greater than zero, and the complete box must stay inside the image.

## What to annotate

Annotate a visible, actual depression or missing road-surface material that is reasonably identifiable as a pothole. Draw a tight box around the visible damaged cavity, including its immediately broken edge but not large areas of unaffected road.

Do not label:

- shadows or arbitrary dark areas;
- puddles without visible pothole evidence;
- flat road patches or repaired asphalt;
- manholes, drains, or road markings;
- ordinary cracks unless they clearly form a pothole cavity;
- blurred or fully occluded objects that cannot be identified reliably.

If an image has been reviewed and contains no pothole, keep the image and create an empty `.txt` label. A missing label is treated as an annotation error, not automatically as a negative example.

## Consistency checks

- Include small or distant potholes only when their boundaries remain identifiable.
- Label each distinct pothole once; do not create overlapping duplicate boxes for the same cavity.
- When two potholes touch but remain visibly distinct, use separate boxes.
- Mark uncertain cases for a second reviewer instead of guessing.
- Review consecutive video frames together, but keep all frames from one recording session in the same dataset split.

Run validation and generate visual samples before building a dataset version:

```bash
.venv/bin/python scripts/dataset/validate_labels.py \
  --images datasets/raw/palembang/images \
  --labels datasets/raw/palembang/labels

.venv/bin/python scripts/dataset/visualize_annotations.py \
  --images datasets/raw/palembang/images \
  --labels datasets/raw/palembang/labels \
  --count 50
```
