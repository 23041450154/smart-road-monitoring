import time
from unittest.mock import MagicMock
from vision.traffic_worker.tracking import (
    _compatible_classes,
    _calculate_match_cost,
    Track,
    LineCrossingCounter,
    YoloByteTrackProcessor,
)

def test_compatible_classes():
    assert _compatible_classes("car", "car") is True
    assert _compatible_classes("car", "truck") is True
    assert _compatible_classes("car", "bus") is True
    assert _compatible_classes("motorcycle", "motorcycle") is True
    assert _compatible_classes("motorcycle", "car") is False
    assert _compatible_classes("motorcycle", "truck") is False

def test_calculate_match_cost_linear_motion():
    now = time.monotonic()
    # Car moving east at 150 px/sec
    track_info = {
        "type": "car",
        "box": [100.0, 200.0, 160.0, 250.0],
        "center": (130.0, 225.0),
        "velocity_sec": (150.0, 0.0),
        "last_seen": now - 0.15,
    }
    # In 0.15s, it should have moved ~22.5 px east -> center ~ 152.5, 225
    det_box_matched = [122.0, 200.0, 182.0, 250.0]
    cost = _calculate_match_cost(det_box_matched, "car", track_info, now)
    assert cost < 0.40, f"Expected low cost for continuing trajectory, got {cost}"

    # Same car opposite direction (moving west backwards)
    det_box_reverse = [80.0, 200.0, 140.0, 250.0]
    cost_rev = _calculate_match_cost(det_box_reverse, "car", track_info, now)
    assert cost_rev == float("inf"), "Reverse motion should be rejected"

    # Motorcycle attempting to match car
    cost_diff_class = _calculate_match_cost(det_box_matched, "motorcycle", track_info, now)
    assert cost_diff_class == float("inf"), "Motorcycle should not match car"

def test_line_crossing_counter_with_stable_id():
    counter = LineCrossingCounter([[0.0, 0.5], [1.0, 0.5]])
    # Vehicle moving from y=0.45 (above line) to y=0.55 (below line)
    t1 = Track(
        tracker_id="vehicle_247",
        vehicle_type="car",
        confidence=0.9,
        bounding_box=[100.0, 150.0, 160.0, 190.0], # y center = 170 (h=400 -> y=0.425)
    )
    res1 = counter.update(t1, 640, 400)
    assert res1 is None

    t2 = Track(
        tracker_id="vehicle_247",
        vehicle_type="car",
        confidence=0.9,
        bounding_box=[100.0, 210.0, 160.0, 250.0], # y center = 230 (h=400 -> y=0.575)
    )
    res2 = counter.update(t2, 640, 400)
    assert res2 in ("A_TO_B", "B_TO_A")

    # Second update for same vehicle should not double count
    res3 = counter.update(t2, 640, 400)
    assert res3 is None

class MockTensor:
    def __init__(self, val):
        self._val = val
    def tolist(self):
        return self._val

class MockBox:
    def __init__(self, xyxy, conf, cls_val):
        self.xyxy = [MockTensor(xyxy)]
        class ConfItem:
            def item(self): return conf
        class ClsItem:
            def item(self): return cls_val
        self.conf = ConfItem()
        self.cls = ClsItem()

class MockBoxes:
    def __init__(self, boxes, ids):
        self._boxes = boxes
        self.id = MagicMock()
        self.id.tolist.return_value = ids
    def __len__(self):
        return len(self._boxes)
    def __iter__(self):
        return iter(self._boxes)

class MockResult:
    def __init__(self, boxes, ids):
        self.boxes = MockBoxes(boxes, ids)

def test_bytetrack_id_switch_retained():
    # Instantiate processor with mock YOLO
    processor = YoloByteTrackProcessor.__new__(YoloByteTrackProcessor)
    processor.confidence = 0.10
    processor.device = "cpu"
    processor.exclusion_zones = []
    processor._next_id = 1
    processor._active_tracks = {}
    processor._bytetrack_remap = {}
    processor._reid_memory_seconds = 2.5
    processor._tracker_cfg = "bytetrack.yaml"
    processor.model = MagicMock()

    # Frame 1: Car #247 detected at [100, 200, 160, 250]
    frame_dummy = MagicMock()
    frame_dummy.shape = (360, 640, 3)
    b1 = MockBox([100.0, 200.0, 160.0, 250.0], 0.85, 2) # 2 is car
    res1 = MockResult([b1], [247])
    processor.model.track.return_value = [res1]

    tracks1 = processor.process(frame_dummy)
    assert len(tracks1) == 1
    assert tracks1[0].tracker_id == "vehicle_247"

    # Frame 2: Car moves fast to [130, 200, 190, 250]
    # ByteTrack loses track 247 and assigns new native ID 250!
    time.sleep(0.05) # small time step
    b2 = MockBox([130.0, 200.0, 190.0, 250.0], 0.85, 2)
    res2 = MockResult([b2], [250])
    processor.model.track.return_value = [res2]

    tracks2 = processor.process(frame_dummy)
    assert len(tracks2) == 1
    # MUST still be vehicle_247, NOT vehicle_250!
    assert tracks2[0].tracker_id == "vehicle_247", f"Expected vehicle_247, got {tracks2[0].tracker_id}"
    assert processor._bytetrack_remap[250] == "vehicle_247"

    # Frame 3: ByteTrack keeps 250 on next frame
    b3 = MockBox([160.0, 200.0, 220.0, 250.0], 0.85, 2)
    res3 = MockResult([b3], [250])
    processor.model.track.return_value = [res3]

    tracks3 = processor.process(frame_dummy)
    assert len(tracks3) == 1
    assert tracks3[0].tracker_id == "vehicle_247"

def test_reid_after_brief_occlusion():
    processor = YoloByteTrackProcessor.__new__(YoloByteTrackProcessor)
    processor.confidence = 0.10
    processor.device = "cpu"
    processor.exclusion_zones = []
    processor._next_id = 1
    processor._active_tracks = {}
    processor._bytetrack_remap = {}
    processor._reid_memory_seconds = 2.5
    processor._tracker_cfg = "bytetrack.yaml"
    processor.model = MagicMock()

    frame_dummy = MagicMock()
    frame_dummy.shape = (360, 640, 3)

    # Frame 1: Motorcycle #88 at [200, 150, 240, 200] moving east at ~120px/s
    b1 = MockBox([200.0, 150.0, 240.0, 200.0], 0.9, 3) # 3 is motorcycle
    res1 = MockResult([b1], [88])
    processor.model.track.return_value = [res1]
    tracks1 = processor.process(frame_dummy)
    assert tracks1[0].tracker_id == "vehicle_88"

    # Frame 2: Motor moves to [215, 150, 255, 200]
    time.sleep(0.05)
    b2 = MockBox([215.0, 150.0, 255.0, 200.0], 0.9, 3)
    res2 = MockResult([b2], [88])
    processor.model.track.return_value = [res2]
    tracks2 = processor.process(frame_dummy)
    assert tracks2[0].tracker_id == "vehicle_88"

    # Frame 3: Occlusion / missed detection (0 boxes)
    time.sleep(0.05)
    res_empty = MagicMock()
    res_empty.boxes = []
    processor.model.track.return_value = [res_empty]
    tracks3 = processor.process(frame_dummy)
    assert len(tracks3) == 0

    # Frame 4: Motorcycle re-emerges at [245, 150, 285, 200], ByteTrack assigns new ID 95
    time.sleep(0.05)
    b4 = MockBox([245.0, 150.0, 285.0, 200.0], 0.9, 3)
    res4 = MockResult([b4], [95])
    processor.model.track.return_value = [res4]
    tracks4 = processor.process(frame_dummy)

    # Must re-stitch to vehicle_88!
    assert len(tracks4) == 1
    assert tracks4[0].tracker_id == "vehicle_88", f"Expected vehicle_88 after occlusion, got {tracks4[0].tracker_id}"

def test_two_different_vehicles_do_not_swap_ids():
    processor = YoloByteTrackProcessor.__new__(YoloByteTrackProcessor)
    processor.confidence = 0.10
    processor.device = "cpu"
    processor.exclusion_zones = []
    processor._next_id = 1
    processor._active_tracks = {}
    processor._bytetrack_remap = {}
    processor._reid_memory_seconds = 2.5
    processor._tracker_cfg = "bytetrack.yaml"
    processor.model = MagicMock()

    frame_dummy = MagicMock()
    frame_dummy.shape = (360, 640, 3)

    # Two cars: Car A at x=100, Car B at x=400
    bA1 = MockBox([100.0, 200.0, 160.0, 250.0], 0.85, 2)
    bB1 = MockBox([400.0, 200.0, 460.0, 250.0], 0.85, 2)
    res1 = MockResult([bA1, bB1], [10, 20])
    processor.model.track.return_value = [res1]
    tracks1 = processor.process(frame_dummy)
    ids1 = {t.tracker_id for t in tracks1}
    assert ids1 == {"vehicle_10", "vehicle_20"}

    # Both move right
    time.sleep(0.05)
    bA2 = MockBox([120.0, 200.0, 180.0, 250.0], 0.85, 2)
    bB2 = MockBox([420.0, 200.0, 480.0, 250.0], 0.85, 2)
    res2 = MockResult([bA2, bB2], [10, 20])
    processor.model.track.return_value = [res2]
    tracks2 = processor.process(frame_dummy)
    
    track_map = {t.bounding_box[0]: t.tracker_id for t in tracks2}
    assert track_map[120.0] == "vehicle_10"
    assert track_map[420.0] == "vehicle_20"
