import math
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from vision.traffic_worker.detection import VEHICLE_CLASSES

_GLOBAL_MODELS: dict[str, Any] = {}
_MODEL_LOCK = threading.Lock()


@dataclass(frozen=True)
class Track:
    tracker_id: str
    vehicle_type: str
    confidence: float
    bounding_box: list[float]
    velocity: tuple[float, float] = (0.0, 0.0)

    @property
    def center(self) -> tuple[float, float]:
        left, top, right, bottom = self.bounding_box
        return ((left + right) / 2, (top + bottom) / 2)


def _box_iou(b1: list[float], b2: list[float]) -> float:
    x1 = max(b1[0], b2[0])
    y1 = max(b1[1], b2[1])
    x2 = min(b1[2], b2[2])
    y2 = min(b1[3], b2[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    a1 = max(0.0, (b1[2] - b1[0]) * (b1[3] - b1[1]))
    a2 = max(0.0, (b2[2] - b2[0]) * (b2[3] - b2[1]))
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0


def _center_dist(b1: list[float], b2: list[float]) -> float:
    c1 = ((b1[0] + b1[2]) / 2, (b1[1] + b1[3]) / 2)
    c2 = ((b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2)
    return math.hypot(c1[0] - c2[0], c1[1] - c2[1])


def _nms(
    boxes: list[list[float]],
    scores: list[float],
    classes: list[int],
    iou_thresh: float = 0.50,
) -> list[int]:
    """Non-Maximum Suppression to remove redundant overlapping candidate boxes."""
    if not boxes:
        return []
    indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    keep: list[int] = []
    while indices:
        current = indices.pop(0)
        keep.append(current)
        indices = [
            i
            for i in indices
            if _box_iou(boxes[current], boxes[i]) < iou_thresh
        ]
    return keep


CAMERA_EXCLUSION_ZONES: dict[int, list[list[tuple[float, float]]]] = {
    4: [
        # Cam 4 (Masjid Agung) - bottom-left fountain monument & bright spotlights
        [(0.0, 0.45), (0.36, 0.65), (0.36, 1.0), (0.0, 1.0)],
    ],
}


def _point_in_polygon(x: float, y: float, polygon: list[tuple[float, float]]) -> bool:
    """Ray casting algorithm to determine if normalized point (x, y) is inside polygon."""
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


class YoloByteTrackProcessor:
    """Ultralytics YOLO detection with ByteTrack tracking and spatial continuity fallback."""

    def __init__(
        self,
        model_path: str,
        confidence: float = 0.12,
        device: str = "cpu",
        exclusion_zones: list[list[tuple[float, float]]] | None = None,
    ) -> None:
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise RuntimeError(
                "Ultralytics is required; install requirements-vision.txt"
            ) from exc

        # Prefer OpenVINO optimized model if available for ~18x CPU acceleration
        p = Path(model_path)
        ov_dir = p.parent / f"{p.stem}_openvino_model"
        use_ov = ov_dir.exists() and (any(ov_dir.glob("*.xml")) or (ov_dir / "metadata.yaml").exists())
        model_key = str(ov_dir) if use_ov else str(model_path)

        with _MODEL_LOCK:
            if model_key not in _GLOBAL_MODELS:
                if use_ov:
                    _GLOBAL_MODELS[model_key] = YOLO(str(ov_dir), task="detect")
                else:
                    _GLOBAL_MODELS[model_key] = YOLO(model_path)
            self.model = _GLOBAL_MODELS[model_key]

        self.confidence = confidence
        self.device = device
        self.exclusion_zones = exclusion_zones or []
        self._next_id: int = 1
        # Map tracker_id -> {"box": list, "type": str, "last_seen": float}
        self._active_tracks: dict[str, dict[str, Any]] = {}
        self._max_lost_seconds: float = 1.5

    def process(self, frame: Any) -> list[Track]:
        classes = list(VEHICLE_CLASSES.keys())
        try:
            result = self.model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                conf=self.confidence,
                classes=classes,
                device=self.device,
                verbose=False,
            )[0]
        except Exception:
            result = self.model.predict(
                frame,
                conf=self.confidence,
                classes=classes,
                device=self.device,
                verbose=False,
            )[0]

        if not hasattr(result, "boxes") or len(result.boxes) == 0:
            now = time.monotonic()
            self._active_tracks = {
                tid: info
                for tid, info in self._active_tracks.items()
                if now - info["last_seen"] < self._max_lost_seconds
            }
            return []

        raw_boxes = [box.xyxy[0].tolist() for box in result.boxes]
        raw_confs = [float(box.conf.item()) for box in result.boxes]
        raw_clss = [int(box.cls.item()) for box in result.boxes]

        # Extract native tracker IDs if provided by ByteTrack
        native_ids: list[int | None] = []
        if result.boxes.id is not None:
            id_list = result.boxes.id.tolist()
            native_ids = [
                int(id_list[i]) if i < len(id_list) else None
                for i in range(len(raw_boxes))
            ]
        else:
            native_ids = [None] * len(raw_boxes)

        # Filter out detections inside exclusion zones (e.g. non-drivable park or fountain)
        if self.exclusion_zones and hasattr(frame, "shape"):
            fh, fw = frame.shape[:2]
            valid_indices = []
            for i, box in enumerate(raw_boxes):
                cx = ((box[0] + box[2]) / 2) / fw
                cy = ((box[1] + box[3]) / 2) / fh
                if not any(_point_in_polygon(cx, cy, zone) for zone in self.exclusion_zones):
                    valid_indices.append(i)
            raw_boxes = [raw_boxes[i] for i in valid_indices]
            raw_confs = [raw_confs[i] for i in valid_indices]
            raw_clss = [raw_clss[i] for i in valid_indices]
            native_ids = [native_ids[i] for i in valid_indices]

        # Apply NMS to filter redundant overlapping detections
        keep_indices = _nms(raw_boxes, raw_confs, raw_clss, iou_thresh=0.50)

        now = time.monotonic()
        tracks: list[Track] = []
        matched_active_ids: set[str] = set()

        for idx in keep_indices:
            box = [float(x) for x in raw_boxes[idx]]
            conf = raw_confs[idx]
            cls_id = raw_clss[idx]
            vtype = VEHICLE_CLASSES.get(cls_id, "car")
            assigned_id: str | None = None

            # Case A: ByteTrack provided a persistent ID
            if native_ids[idx] is not None:
                assigned_id = f"vehicle_{native_ids[idx]}"

            # Case B: Match against internal active track history
            if assigned_id is None:
                best_match_id = None
                best_iou = 0.0
                best_dist = float("inf")

                for tid, tinfo in self._active_tracks.items():
                    if tid in matched_active_ids:
                        continue
                    iou_val = _box_iou(box, tinfo["box"])
                    dist_val = _center_dist(box, tinfo["box"])

                    if iou_val > 0.20 and iou_val > best_iou:
                        best_iou = iou_val
                        best_match_id = tid
                    elif iou_val <= 0.20 and dist_val < 65.0 and dist_val < best_dist:
                        best_dist = dist_val
                        best_match_id = tid

                if best_match_id is not None:
                    assigned_id = best_match_id

            # Case C: Newly appeared vehicle
            if assigned_id is None:
                assigned_id = f"vehicle_{self._next_id}"
                self._next_id += 1

            matched_active_ids.add(assigned_id)
            prev_info = self._active_tracks.get(assigned_id)
            vx, vy = 0.0, 0.0
            if prev_info:
                old_c = ((prev_info["box"][0] + prev_info["box"][2]) / 2, (prev_info["box"][1] + prev_info["box"][3]) / 2)
                new_c = ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)
                vx = new_c[0] - old_c[0]
                vy = new_c[1] - old_c[1]

            self._active_tracks[assigned_id] = {
                "box": box,
                "type": vtype,
                "conf": conf,
                "last_seen": now,
                "velocity": (vx, vy),
                "missed_count": 0,
            }

            tracks.append(
                Track(
                    tracker_id=assigned_id,
                    vehicle_type=vtype,
                    confidence=conf,
                    bounding_box=box,
                    velocity=(vx, vy),
                )
            )

        # Stable track continuity: keep active tracks visible briefly during occlusion without phantom drifting
        for tid, tinfo in list(self._active_tracks.items()):
            if tid in matched_active_ids:
                continue
            missed = tinfo.get("missed_count", 0) + 1
            tinfo["missed_count"] = missed
            if missed <= 2 and (now - tinfo["last_seen"]) < 0.5:
                b = tinfo["box"]
                tracks.append(
                    Track(
                        tracker_id=tid,
                        vehicle_type=tinfo["type"],
                        confidence=max(0.05, tinfo.get("conf", 0.20) * 0.8),
                        bounding_box=b,
                        velocity=(0.0, 0.0),
                    )
                )

        # Prune dead tracks older than max lost window
        self._active_tracks = {
            tid: info
            for tid, info in self._active_tracks.items()
            if now - info["last_seen"] < 0.5 and info.get("missed_count", 0) <= 2
        }

        return tracks



def _ccw(
    A: tuple[float, float], B: tuple[float, float], C: tuple[float, float]
) -> float:
    return (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])


def _segments_intersect(
    A: tuple[float, float],
    B: tuple[float, float],
    C: tuple[float, float],
    D: tuple[float, float],
) -> bool:
    return (_ccw(A, B, C) * _ccw(A, B, D) <= 0) and (_ccw(C, D, A) * _ccw(C, D, B) <= 0)


def _side(
    point: tuple[float, float], start: tuple[float, float], end: tuple[float, float]
) -> float:
    return (end[0] - start[0]) * (point[1] - start[1]) - (end[1] - start[1]) * (
        point[0] - start[0]
    )


class LineCrossingCounter:
    """Detects when vehicles cross a counting line segment using trajectory and bounding box intersection."""

    def __init__(self, line: list[list[float]]) -> None:
        self.line = line
        self.previous_centers: dict[str, tuple[float, float]] = {}
        self.previous_sides: dict[str, float] = {}
        self.counted: set[str] = set()
        self.counted_at: dict[str, float] = {}

    def update(self, track: Track, frame_width: int, frame_height: int) -> str | None:
        if track.tracker_id in self.counted:
            return None

        lx1 = self.line[0][0] * frame_width
        ly1 = self.line[0][1] * frame_height
        lx2 = self.line[1][0] * frame_width
        ly2 = self.line[1][1] * frame_height
        L1 = (lx1, ly1)
        L2 = (lx2, ly2)

        curr_center = track.center
        curr_side = _side(curr_center, L1, L2)
        prev_center = self.previous_centers.get(track.tracker_id)
        prev_side = self.previous_sides.get(track.tracker_id)

        self.previous_centers[track.tracker_id] = curr_center
        self.previous_sides[track.tracker_id] = curr_side

        crossed = False

        # 1. Trajectory segment crossing check
        if prev_center is not None:
            if _segments_intersect(prev_center, curr_center, L1, L2):
                crossed = True
            elif prev_side is not None and prev_side != 0 and curr_side != 0:
                if prev_side * curr_side < 0:
                    mid_x = (prev_center[0] + curr_center[0]) / 2
                    mid_y = (prev_center[1] + curr_center[1]) / 2
                    min_lx = min(lx1, lx2) - 40
                    max_lx = max(lx1, lx2) + 40
                    min_ly = min(ly1, ly2) - 40
                    max_ly = max(ly1, ly2) + 40
                    if min_lx <= mid_x <= max_lx and min_ly <= mid_y <= max_ly:
                        crossed = True

        # 2. Bounding box diagonal intersection check
        if not crossed:
            b = track.bounding_box
            d1_a, d1_b = (b[0], b[1]), (b[2], b[3])
            d2_a, d2_b = (b[0], b[3]), (b[2], b[1])
            if _segments_intersect(d1_a, d1_b, L1, L2) or _segments_intersect(
                d2_a, d2_b, L1, L2
            ):
                crossed = True

        if not crossed:
            return None

        self.counted.add(track.tracker_id)
        now = time.monotonic()
        self.counted_at[track.tracker_id] = now

        # Prune very old counted IDs
        if len(self.counted) > 500:
            stale = [
                tid
                for tid, ts in self.counted_at.items()
                if now - ts > 120
            ]
            for tid in stale:
                self.counted.discard(tid)
                self.counted_at.pop(tid, None)

        dx = lx2 - lx1
        dy = ly2 - ly1
        nx, ny = -dy, dx

        if prev_center is not None:
            vx = curr_center[0] - prev_center[0]
            vy = curr_center[1] - prev_center[1]
        else:
            mid_lx = (lx1 + lx2) / 2
            mid_ly = (ly1 + ly2) / 2
            vx = curr_center[0] - mid_lx
            vy = curr_center[1] - mid_ly

        dot = vx * nx + vy * ny
        return "A_TO_B" if dot >= 0 else "B_TO_A"

