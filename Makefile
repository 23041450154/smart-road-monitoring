.PHONY: setup dev dev-local db migrate seed backend frontend test lint vision-install traffic-worker dataset-check dataset-build train-pothole smoke-train-pothole eval-pothole predict-pothole predict-video-pothole pothole-worker

PYTHON ?= .venv/bin/python
POTHOLE_DATA ?= training/configs/pothole.yaml
POTHOLE_MODEL ?= training/runs/pothole_baseline/weights/best.pt
PREDICT_SOURCE ?= datasets/processed/pothole/images/test
ROAD_VIDEO ?= road.mp4
ROAD_GPX ?= road.gpx

setup:
	python3 -m venv .venv
	.venv/bin/pip install -r backend/requirements.txt
	cd frontend && npm install
	@test -f .env || cp .env.example .env

dev:
	docker compose up --build

db:
	docker compose up -d postgres

migrate:
	cd backend && ../.venv/bin/alembic upgrade head

seed:
	cd backend && ../.venv/bin/python scripts_seed.py

backend:
	cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && ../.venv/bin/pytest

lint:
	.venv/bin/ruff check backend scripts training vision pothole_worker.py
	cd frontend && npm run lint && npm run typecheck

vision-install:
	@if command -v nvidia-smi >/dev/null 2>&1; then \
		.venv/bin/pip install -r backend/requirements-vision.txt; \
	else \
		.venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
		.venv/bin/pip install -r backend/requirements-vision.txt; \
	fi

traffic-worker:
	PYTHONPATH=backend:. .venv/bin/python -m vision.traffic_worker.worker --camera-id 1 --show

dataset-check:
	$(PYTHON) scripts/dataset/validate_labels.py --images datasets/raw/rdd2022/converted/images --labels datasets/raw/rdd2022/converted/labels --report datasets/reports/rdd2022_label_validation.csv
	$(PYTHON) scripts/dataset/check_images.py --input datasets/raw/rdd2022/converted/images
	$(PYTHON) scripts/dataset/find_duplicates.py --input datasets/raw/rdd2022/converted/images

dataset-build:
	$(PYTHON) scripts/dataset/build_dataset.py --source RDD2022=datasets/raw/rdd2022/converted --overwrite
	$(PYTHON) scripts/dataset/dataset_stats.py

smoke-train-pothole:
	$(PYTHON) training/scripts/train_pothole.py --data $(POTHOLE_DATA) --model yolo11n.pt --batch 4 --device auto --smoke

train-pothole:
	$(PYTHON) training/scripts/train_pothole.py --data $(POTHOLE_DATA) --model yolo11n.pt --epochs 100 --imgsz 640 --device auto --name pothole_baseline

eval-pothole:
	$(PYTHON) training/scripts/evaluate_pothole.py --model $(POTHOLE_MODEL) --data $(POTHOLE_DATA) --split test --confirm-final-test

predict-pothole:
	$(PYTHON) training/scripts/predict_images.py --model vision/models/pothole/best.pt --source $(PREDICT_SOURCE)

predict-video-pothole:
	$(PYTHON) training/scripts/predict_video.py --model vision/models/pothole/best.pt --source $(ROAD_VIDEO) --output road_detected.mp4

pothole-worker:
	PYTHONPATH=backend:. $(PYTHON) pothole_worker.py --video $(ROAD_VIDEO) --gps $(ROAD_GPX)
