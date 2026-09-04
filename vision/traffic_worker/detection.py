from dataclasses import dataclass
from typing import Any


VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


@dataclass(frozen=True)
class Detection:
    vehicle_type: str
    confidence: float
    bounding_box: list[float]

    def as_dict(self) -> dict[str, str | float | list[float]]:
        return {
            "class": self.vehicle_type,
            "confidence": round(self.confidence, 4),
            "bounding_box": [round(value, 2) for value in self.bounding_box],
        }


class YoloVehicleDetector:
    def __init__(
        self, model_path: str, confidence: float = 0.35, device: str = "cpu"
    ) -> None:
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise RuntimeError(
                "Ultralytics is required; install requirements-vision.txt"
            ) from exc
        self.model = YOLO(model_path)
        self.confidence = confidence
        self.device = device

    def detect(self, frame: Any) -> list[Detection]:
        result = self.model.predict(
            frame,
            conf=self.confidence,
            classes=list(VEHICLE_CLASSES),
            device=self.device,
            verbose=False,
        )[0]
        return [
            Detection(
                vehicle_type=VEHICLE_CLASSES[int(box.cls.item())],
                confidence=float(box.conf.item()),
                bounding_box=[float(value) for value in box.xyxy[0].tolist()],
            )
            for box in result.boxes
        ]
