FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-vision.txt ./
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements-vision.txt

COPY . .
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python scripts_seed.py && uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000}"]
