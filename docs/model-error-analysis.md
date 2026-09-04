# Pothole Model Error Analysis

Run error analysis only after selecting a model on the validation set. The script consumes the held-out test set and therefore requires an explicit confirmation flag.

```bash
.venv/bin/python training/scripts/error_analysis.py \
  --model training/runs/pothole_baseline/weights/best.pt \
  --data training/configs/pothole.yaml \
  --confirm-final-test
```

Outputs are grouped under `datasets/reports/error_analysis/`:

- `false_positive/`: confident predictions that do not match ground truth;
- `false_negative/`: ground-truth potholes missed by the model;
- `low_confidence/`: detections between the low collection threshold and operational threshold;
- `correct_detection/`: matched detections for comparison;
- `error_analysis.csv`: measured category counts per image.

The script does not claim to infer semantic causes. A reviewer must inspect and tag recurring patterns such as:

- shadow mistaken for a pothole;
- puddle mistaken for a pothole;
- flat road patch mistaken for a pothole;
- small or far pothole missed;
- night/low-light failure;
- unusual camera height or motion blur.

Use findings to improve training/validation data, not to tune repeatedly against the final test set. Public and Palembang local test results must remain separate because their capture domains differ.
