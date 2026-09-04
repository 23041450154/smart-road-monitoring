from dataclasses import dataclass
from typing import Any

from vision.traffic_worker.detection import VEHICLE_CLASSES


@dataclass(frozen=True)
class Track:
    tracker_id: str
    vehicle_type: str
    confidence: float
    bounding_box: list[float]

    @property
    def center(self) -> tuple[float, float]:
        left, top, right, bottom = self.bounding_box
        return ((left + right) / 2, (top + bottom) / 2)


class YoloByteTrackProcessor:
    """Ultralytics YOLO detection with its official ByteTrack integration."""

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

    def process(self, frame: Any) -> list[Track]:
        result = self.model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=self.confidence,
            classes=list(VEHICLE_CLASSES),
            device=self.device,
            verbose=False,
        )[0]
        if result.boxes.id is None:
            return []
        tracks: list[Track] = []
        for box, numeric_id in zip(
            result.boxes, result.boxes.id.tolist(), strict=False
        ):
            tracks.append(
                Track(
                    tracker_id=f"vehicle_{int(numeric_id)}",
                    vehicle_type=VEHICLE_CLASSES[int(box.cls.item())],
                    confidence=float(box.conf.item()),
                    bounding_box=[float(value) for value in box.xyxy[0].tolist()],
                )
            )
        return tracks


class LineCrossingCounter:
    def __init__(self, line: list[list[float]]) -> None:
        self.line = line
        self.previous_sides: dict[str, float] = {}
        self.counted: set[str] = set()

    def update(self, track: Track, frame_width: int, frame_height: int) -> str | None:
        start = (self.line[0][0] * frame_width, self.line[0][1] * frame_height)
        end = (self.line[1][0] * frame_width, self.line[1][1] * frame_height)
        side = _side(track.center, start, end)
        previous = self.previous_sides.get(track.tracker_id)
        self.previous_sides[track.tracker_id] = side
        if (
            previous is None
            or previous == 0
            or side == 0
            or previous * side > 0
            or track.tracker_id in self.counted
        ):
            return None
        self.counted.add(track.tracker_id)
        return "A_TO_B" if previous < side else "B_TO_A"


def _side(
    point: tuple[float, float], start: tuple[float, float], end: tuple[float, float]
) -> float:
    return (end[0] - start[0]) * (point[1] - start[1]) - (end[1] - start[1]) * (
        point[0] - start[0]
    )
