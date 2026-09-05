import time
from unittest.mock import MagicMock
from vision.traffic_worker.tracking import (
    _compatible_classes,
    _calculate_match_cost,
    _nms,
    Track,
    LineCrossingCounter,
    YoloByteTrackProcessor,
)

def test_compatible_classes():
    assert _compatible_classes("car", "car") is True
    assert _compatible_classes("car", "truck") is True
    assert _compatible_classes("car", "bus") is True
    assert _compatible_classes("motorcycle", "motorcycle") is True
    # Large car/bus vs motorcycle should be rejected
    assert _compatible_classes("motorcycle", "car", area1=2500, area2=2500) is False
    assert _compatible_classes("motorcycle", "truck", area1=2500, area2=2500) is False
    # Distant / small vehicles (area < 1600 px) allow motorcycle <-> car cross-class matching
    assert _compatible_classes("motorcycle", "car", area1=400, area2=500) is True

def test_nms_class_isolation():
    # Motorcycle (cls=3) and Car (cls=2) side by side with IoU > 0.50
    b_car = [100.0, 100.0, 160.0, 150.0]
    b_motor = [110.0, 105.0, 155.0, 145.0] # heavy overlap
    boxes = [b_car, b_motor]
    scores = [0.85, 0.70]
    classes = [2, 3]
    keep = _nms(boxes, scores, classes, iou_thresh=0.50)
    # Both must be kept because they belong to different class groups!
    assert len(keep) == 2
    assert 0 in keep and 1 in keep

    # Rider (cls=0) and Motorcycle (cls=3) on the same bike with IoU > 0.50
    classes_same_bike = [0, 3]
    keep_bike = _nms(boxes, scores, classes_same_bike, iou_thresh=0.50)
    # Only the higher confidence one is kept
    assert len(keep_bike) == 1
    assert keep_bike == [0]

def test_calculate_match_cost_linear_motion():
    now = time.monotonic()
    # Large car moving east at 150 px/sec
    track_info = {
        "type": "car",
        "box": [100.0, 200.0, 180.0, 260.0],
        "center": (140.0, 230.0),
        "velocity_sec": (150.0, 0.0),
        "last_seen": now - 0.15,
    }
    det_box_matched = [132.0, 200.0, 212.0, 260.0]
    cost = _calculate_match_cost(det_box_matched, "car", track_info, now)
    assert cost < 0.45, f"Expected low cost for continuing trajectory, got {cost}"

    # Reverse motion should be rejected
    det_box_reverse = [80.0, 200.0, 160.0, 260.0]
    cost_rev = _calculate_match_cost(det_box_reverse, "car", track_info, now)
    assert cost_rev == float("inf"), "Reverse motion should be rejected"

def test_motorcycle_sharp_turn_matching():
    now = time.monotonic()
    # Motorcycle turning in roundabout
    track_info = {
        "type": "motorcycle",
        "box": [200.0, 200.0, 230.0, 240.0],
        "center": (215.0, 220.0),
        "velocity_sec": (80.0, 40.0),
        "last_seen": now - 0.12,
    }
    # Turning box ~35 px away
    det_box_turn = [225.0, 215.0, 255.0, 255.0]
    cost = _calculate_match_cost(det_box_turn, "motorcycle", track_info, now)
    assert cost <= 0.72, f"Motorcycle turning cost should be matched, got {cost}"

def test_line_crossing_counter_with_stable_id():
    counter = LineCrossingCounter([[0.0, 0.5], [1.0, 0.5]])
    t1 = Track(
        tracker_id="vehicle_247",
        vehicle_type="car",
        confidence=0.9,
        bounding_box=[100.0, 150.0, 160.0, 190.0],
    )
    res1 = counter.update(t1, 640, 400)
    assert res1 is None

    t2 = Track(
        tracker_id="vehicle_247",
        vehicle_type="car",
        confidence=0.9,
        bounding_box=[100.0, 210.0, 160.0, 250.0],
    )
    res2 = counter.update(t2, 640, 400)
    assert res2 in ("A_TO_B", "B_TO_A")

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
    b1 = MockBox([100.0, 200.0, 160.0, 250.0], 0.85, 2)
    res1 = MockResult([b1], [247])
    processor.model.track.return_value = [res1]

    tracks1 = processor.process(frame_dummy)
    assert len(tracks1) == 1
    assert tracks1[0].tracker_id == "vehicle_247"

    time.sleep(0.05)
    b2 = MockBox([130.0, 200.0, 190.0, 250.0], 0.85, 2)
    res2 = MockResult([b2], [250])
    processor.model.track.return_value = [res2]

    tracks2 = processor.process(frame_dummy)
    assert len(tracks2) == 1
    assert tracks2[0].tracker_id == "vehicle_247", f"Expected vehicle_247, got {tracks2[0].tracker_id}"
    assert processor._bytetrack_remap[250] == "vehicle_247"

    b3 = MockBox([160.0, 200.0, 220.0, 250.0], 0.85, 2)
    res3 = MockResult([b3], [250])
    processor.model.track.return_value = [res3]

    tracks3 = processor.process(frame_dummy)
    assert len(tracks3) == 1
    assert tracks3[0].tracker_id == "vehicle_247"

def test_motorcycle_class_flicker_retains_consensus():
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

    # Frame 1: Detected as motorcycle
    b1 = MockBox([200.0, 150.0, 230.0, 190.0], 0.80, 3) # cls 3 = motorcycle
    res1 = MockResult([b1], [50])
    processor.model.track.return_value = [res1]
    tracks1 = processor.process(frame_dummy)
    assert tracks1[0].vehicle_type == "motorcycle"

    # Frame 2: YOLO temporarily predicts cls 2 (car)
    time.sleep(0.05)
    b2 = MockBox([215.0, 150.0, 245.0, 190.0], 0.65, 2) # cls 2 = car
    res2 = MockResult([b2], [50])
    processor.model.track.return_value = [res2]
    tracks2 = processor.process(frame_dummy)
    # Track ID must remain vehicle_50, and consensus type remains motorcycle!
    assert tracks2[0].tracker_id == "vehicle_50"
    assert tracks2[0].vehicle_type == "motorcycle"

    # Frame 3: ByteTrack drops ID due to acceleration, spawns native ID 55 as motorcycle
    time.sleep(0.05)
    b3 = MockBox([235.0, 150.0, 265.0, 190.0], 0.85, 3) # cls 3 = motorcycle
    res3 = MockResult([b3], [55])
    processor.model.track.return_value = [res3]
    tracks3 = processor.process(frame_dummy)
    assert tracks3[0].tracker_id == "vehicle_50"
    assert tracks3[0].vehicle_type == "motorcycle"

def test_allocate_id_cycles_cleanly():
    processor = YoloByteTrackProcessor.__new__(YoloByteTrackProcessor)
    processor._next_id = 1
    processor._active_tracks = {}

    # Preserves 1 <= nid <= 999
    assert processor._allocate_id(247) == "vehicle_247"
    assert processor._allocate_id(999) == "vehicle_999"

    # Cycles huge ByteTrack IDs (> 999)
    huge_id1 = processor._allocate_id(268242)
    assert huge_id1 == "vehicle_1"
    huge_id2 = processor._allocate_id(268243)
    assert huge_id2 == "vehicle_2"

    # None nid also allocates from cycle
    none_id = processor._allocate_id(None)
    assert none_id == "vehicle_3"

