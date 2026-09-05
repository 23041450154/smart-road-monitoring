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


def _compatible_classes(type1: str, type2: str) -> bool:
    """Check if two vehicle classes are compatible for tracking identity."""
    if type1 == type2:
        return True
    four_wheelers = {"car", "truck", "bus"}
    return type1 in four_wheelers and type2 in four_wheelers


def _calculate_match_cost(
    det_box: list[float],
    det_type: str,
    track_info: dict[str, Any],
    now: float,
) -> float:
    """Calculates association cost [0.0, 1.0] between a detection and an existing track.
    Returns float('inf') if physically incompatible."""
    if not _compatible_classes(det_type, track_info.get("type", "")):
        return float("inf")

    dt = max(0.01, now - track_info.get("last_seen", now))
    if dt > 2.5:
        return float("inf")

    det_cx = (det_box[0] + det_box[2]) / 2.0
    det_cy = (det_box[1] + det_box[3]) / 2.0
    track_cx, track_cy = track_info.get("center", (det_cx, det_cy))
    vx_sec, vy_sec = track_info.get("velocity_sec", (0.0, 0.0))

    # Motion-compensated predicted position
    pred_cx = track_cx + vx_sec * dt
    pred_cy = track_cy + vy_sec * dt

    dist_pred = math.hypot(det_cx - pred_cx, det_cy - pred_cy)
    dist_raw = math.hypot(det_cx - track_cx, det_cy - track_cy)
    dist_eff = min(dist_pred, dist_raw)

    # Dynamic search radius based on speed and time delta
    speed = math.hypot(vx_sec, vy_sec)
    max_radius = max(65.0, min(240.0, speed * dt * 1.5 + 45.0))

    if dist_eff > max_radius:
        return float("inf")

    # Direction vector consistency (for moving vehicles)
    if speed > 25.0:
        move_dx = det_cx - track_cx
        move_dy = det_cy - track_cy
        move_mag = math.hypot(move_dx, move_dy)
        if move_mag > 15.0:
            cos_angle = (move_dx * vx_sec + move_dy * vy_sec) / (move_mag * speed)
            if cos_angle < -0.25:  # Sharp reverse movement is physically impossible
                return float("inf")

    # Bounding box area ratio check
    det_area = max(1.0, (det_box[2] - det_box[0]) * (det_box[3] - det_box[1]))
    tr_box = track_info.get("box", det_box)
    tr_area = max(1.0, (tr_box[2] - tr_box[0]) * (tr_box[3] - tr_box[1]))
    area_ratio = min(det_area, tr_area) / max(det_area, tr_area)
    if area_ratio < 0.25:
        return float("inf")

    # IoU overlap bonus
    iou = _box_iou(det_box, tr_box)
    if iou > 0.40:
        return 0.05

    # Cost normalized between 0.0 and 1.0
    dist_cost = dist_eff / max_radius
    size_cost = 1.0 - area_ratio
    type_cost = 0.0 if det_type == track_info.get("type") else 0.15
    iou_bonus = iou * 0.40

    cost = dist_cost * 0.65 + size_cost * 0.20 + type_cost - iou_bonus
    return max(0.0, cost)


class YoloByteTrackProcessor:
    """Ultralytics YOLO detection with ByteTrack tracking and two-phase anti-ID-switch trajectory re-identification."""

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
        # Map canonical tracker_id -> dict state
        self._active_tracks: dict[str, dict[str, Any]] = {}
        # Persistent mapping from ByteTrack native integer ID -> canonical track ID (e.g. 250 -> "vehicle_247")
        self._bytetrack_remap: dict[int, str] = {}
        self._reid_memory_seconds: float = 2.5

        # Path to custom tracker config
        custom_tracker = Path(__file__).parent / "bytetrack_custom.yaml"
        self._tracker_cfg = str(custom_tracker) if custom_tracker.exists() else "bytetrack.yaml"

    def process(self, frame: Any) -> list[Track]:
        classes = list(VEHICLE_CLASSES.keys())
        try:
            result = self.model.track(
                frame,
                persist=True,
                tracker=self._tracker_cfg,
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

        now = time.monotonic()
        if not hasattr(result, "boxes") or len(result.boxes) == 0:
            for tid, tinfo in self._active_tracks.items():
                tinfo["missed_count"] = tinfo.get("missed_count", 0) + 1
            self._active_tracks = {
                tid: info
                for tid, info in self._active_tracks.items()
                if now - info["last_seen"] < self._reid_memory_seconds
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

        det_boxes = [raw_boxes[i] for i in keep_indices]
        det_confs = [raw_confs[i] for i in keep_indices]
        det_types = [VEHICLE_CLASSES.get(raw_clss[i], "car") for i in keep_indices]
        det_nids = [native_ids[i] for i in keep_indices]
        num_dets = len(det_boxes)

        assigned_cids: list[str | None] = [None] * num_dets
        claimed_tracks: set[str] = set()

        # Phase 1: Direct Mappings from ByteTrack (or existing mapped canonical IDs)
        for i in range(num_dets):
            nid = det_nids[i]
            if nid is None:
                continue

            mapped_cid = self._bytetrack_remap.get(nid)
            if mapped_cid is None:
                direct_cid = f"vehicle_{nid}"
                if direct_cid in self._active_tracks:
                    mapped_cid = direct_cid

            if mapped_cid is not None and mapped_cid in self._active_tracks and mapped_cid not in claimed_tracks:
                cost = _calculate_match_cost(det_boxes[i], det_types[i], self._active_tracks[mapped_cid], now)
                if cost <= 0.70:
                    assigned_cids[i] = mapped_cid
                    claimed_tracks.add(mapped_cid)
                    self._bytetrack_remap[nid] = mapped_cid

        # Phase 2: Trajectory & Spatial Re-Identification for Unmatched Detections
        # (Stitches fast-moving vehicles whose ByteTrack track dropped or switched ID)
        unmatched_indices = [i for i in range(num_dets) if assigned_cids[i] is None]
        available_tracks = [tid for tid in self._active_tracks if tid not in claimed_tracks]

        if unmatched_indices and available_tracks:
            candidate_pairs: list[tuple[float, int, str]] = []
            for i in unmatched_indices:
                for tid in available_tracks:
                    cost = _calculate_match_cost(det_boxes[i], det_types[i], self._active_tracks[tid], now)
                    if cost <= 0.65:
                        candidate_pairs.append((cost, i, tid))

            # Greedy Hungarian-style assignment: lowest cost first
            candidate_pairs.sort(key=lambda x: x[0])
            for cost, i, tid in candidate_pairs:
                if assigned_cids[i] is None and tid not in claimed_tracks:
                    assigned_cids[i] = tid
                    claimed_tracks.add(tid)
                    nid = det_nids[i]
                    if nid is not None:
                        # Lock ByteTrack's new ID permanently to this canonical track ID
                        self._bytetrack_remap[nid] = tid

        # Phase 3: Newly appeared vehicles
        for i in range(num_dets):
            if assigned_cids[i] is None:
                nid = det_nids[i]
                if nid is not None:
                    new_id = f"vehicle_{nid}"
                    self._bytetrack_remap[nid] = new_id
                else:
                    new_id = f"vehicle_{self._next_id}"
                    self._next_id += 1
                assigned_cids[i] = new_id
                claimed_tracks.add(new_id)

        # Phase 4: State Update and Velocity Smoothing
        tracks: list[Track] = []
        for i in range(num_dets):
            cid = assigned_cids[i]
            box = [float(x) for x in det_boxes[i]]
            conf = det_confs[i]
            vtype = det_types[i]
            new_cx = (box[0] + box[2]) / 2.0
            new_cy = (box[1] + box[3]) / 2.0

            prev_info = self._active_tracks.get(cid)
            if prev_info is not None:
                dt = max(0.02, now - prev_info["last_seen"])
                old_cx, old_cy = prev_info["center"]
                raw_vx_sec = (new_cx - old_cx) / dt
                raw_vy_sec = (new_cy - old_cy) / dt

                old_vx_sec, old_vy_sec = prev_info.get("velocity_sec", (0.0, 0.0))
                alpha = 0.65
                vx_sec = alpha * raw_vx_sec + (1.0 - alpha) * old_vx_sec
                vy_sec = alpha * raw_vy_sec + (1.0 - alpha) * old_vy_sec
                vx_step = vx_sec * 0.10
                vy_step = vy_sec * 0.10
            else:
                vx_sec, vy_sec = 0.0, 0.0
                vx_step, vy_step = 0.0, 0.0

            self._active_tracks[cid] = {
                "canonical_id": cid,
                "box": box,
                "type": vtype,
                "conf": conf,
                "center": (new_cx, new_cy),
                "velocity_sec": (vx_sec, vy_sec),
                "velocity": (vx_step, vy_step),
                "last_seen": now,
                "missed_count": 0,
            }

            tracks.append(
                Track(
                    tracker_id=cid,
                    vehicle_type=vtype,
                    confidence=conf,
                    bounding_box=box,
                    velocity=(vx_step, vy_step),
                )
            )

        # Phase 5: Display continuity: brief 1-frame hold during occlusion without phantom drifting
        for tid, tinfo in list(self._active_tracks.items()):
            if tid in claimed_tracks:
                continue
            missed = tinfo.get("missed_count", 0) + 1
            tinfo["missed_count"] = missed
            if missed <= 1 and (now - tinfo["last_seen"]) < 0.25:
                tracks.append(
                    Track(
                        tracker_id=tid,
                        vehicle_type=tinfo["type"],
                        confidence=max(0.05, tinfo.get("conf", 0.20) * 0.8),
                        bounding_box=tinfo["box"],
                        velocity=(0.0, 0.0),
                    )
                )

        # Phase 6: Memory Pruning (retains tracks for up to self._reid_memory_seconds for Re-ID)
        self._active_tracks = {
            tid: info
            for tid, info in self._active_tracks.items()
            if now - info["last_seen"] < self._reid_memory_seconds
        }
        if len(self._bytetrack_remap) > 500:
            active_cids = set(self._active_tracks.keys())
            self._bytetrack_remap = {
                nid: cid
                for nid, cid in self._bytetrack_remap.items()
                if cid in active_cids
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

