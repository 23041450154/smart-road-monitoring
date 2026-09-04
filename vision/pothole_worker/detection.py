from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PotholeDetection:
    confidence: float
    bounding_box: list[float]


class PotholeDetector:
    def detect(
        self, frame: Any, frame_number: int, fps: float
    ) -> list[PotholeDetection]:
        raise NotImplementedError


class YoloPotholeDetector(PotholeDetector):
    def __init__(
        self, model_path: str, confidence: float = 0.4, device: str = "cpu"
    ) -> None:
        if not Path(model_path).is_file():
            raise FileNotFoundError(f"Trained pothole model not found: {model_path}")
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise RuntimeError("Install backend/requirements-vision.txt") from exc
        self.model = YOLO(model_path)
        self.confidence = confidence
        self.device = device

    def detect(
        self, frame: Any, frame_number: int, fps: float
    ) -> list[PotholeDetection]:
        result = self.model.predict(
            frame, conf=self.confidence, device=self.device, verbose=False
        )[0]
        return [
            PotholeDetection(
                float(box.conf.item()), [float(value) for value in box.xyxy[0].tolist()]
            )
            for box in result.boxes
            if int(box.cls.item()) == 0
        ]


class ExplicitDemoPotholeDetector(PotholeDetector):
    """Creates visible demo events; these are synthetic and never model accuracy claims."""

    def detect(
        self, frame: Any, frame_number: int, fps: float
    ) -> list[PotholeDetection]:
        interval = max(1, round(fps * 4))
        if frame_number == 1 or frame_number % interval:
            return []
        height, width = frame.shape[:2]
        return [
            PotholeDetection(
                0.6, [width * 0.42, height * 0.62, width * 0.58, height * 0.82]
            )
        ]
