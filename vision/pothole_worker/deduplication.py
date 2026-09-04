from __future__ import annotations

from dataclasses import dataclass
from math import hypot


def intersection_over_union(left: list[float], right: list[float]) -> float:
    intersection_width = max(0.0, min(left[2], right[2]) - max(left[0], right[0]))
    intersection_height = max(0.0, min(left[3], right[3]) - max(left[1], right[1]))
    intersection = intersection_width * intersection_height
    left_area = max(0.0, left[2] - left[0]) * max(0.0, left[3] - left[1])
    right_area = max(0.0, right[2] - right[0]) * max(0.0, right[3] - right[1])
    union = left_area + right_area - intersection
    return intersection / union if union else 0.0


@dataclass
class RecentDetection:
    timestamp_seconds: float
    bounding_box: list[float]


class TemporalDuplicateSuppressor:
    def __init__(
        self,
        window_seconds: float = 2.0,
        iou_threshold: float = 0.2,
        center_distance_threshold: float = 0.12,
    ) -> None:
        self.window_seconds = window_seconds
        self.iou_threshold = iou_threshold
        self.center_distance_threshold = center_distance_threshold
        self.recent: list[RecentDetection] = []

    def is_duplicate_or_record(
        self,
        bounding_box: list[float],
        timestamp_seconds: float,
        frame_width: int,
        frame_height: int,
    ) -> bool:
        self.recent = [
            detection
            for detection in self.recent
            if timestamp_seconds - detection.timestamp_seconds <= self.window_seconds
        ]
        center_x = (bounding_box[0] + bounding_box[2]) / 2 / max(frame_width, 1)
        center_y = (bounding_box[1] + bounding_box[3]) / 2 / max(frame_height, 1)
        for detection in self.recent:
            previous = detection.bounding_box
            previous_x = (previous[0] + previous[2]) / 2 / max(frame_width, 1)
            previous_y = (previous[1] + previous[3]) / 2 / max(frame_height, 1)
            if (
                intersection_over_union(bounding_box, previous) >= self.iou_threshold
                or hypot(center_x - previous_x, center_y - previous_y)
                <= self.center_distance_threshold
            ):
                return True
        self.recent.append(RecentDetection(timestamp_seconds, list(bounding_box)))
        return False
