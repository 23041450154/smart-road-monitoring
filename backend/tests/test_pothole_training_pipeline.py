from __future__ import annotations

import csv
from datetime import UTC, datetime
from pathlib import Path

import pytest
import yaml
from PIL import Image, ImageDraw
from scripts.dataset.build_dataset import Sample, build_dataset, grouped_split
from scripts.dataset.common import duplicate_groups
from scripts.dataset.convert_rdd2022 import convert_rdd2022
from scripts.dataset.validate_labels import validate_dataset_labels
from training.scripts.runtime import load_dataset_config
from vision.pothole_worker.deduplication import TemporalDuplicateSuppressor
from vision.pothole_worker.pothole_worker import frame_timestamp, resolve_pothole_model_path


def make_image(path: Path, marker: int = 0) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (64, 64), "gray")
    draw = ImageDraw.Draw(image)
    draw.rectangle((marker, marker, min(63, marker + 12), min(63, marker + 8)), fill="white")
    image.save(path)


def test_yolo_label_validation_rejects_out_of_bounds_box(tmp_path):
    images = tmp_path / "images"
    labels = tmp_path / "labels"
    make_image(images / "road.jpg")
    labels.mkdir()
    (labels / "road.txt").write_text("0 0.95 0.50 0.20 0.20\n", encoding="utf-8")

    summary = validate_dataset_labels(images, labels, tmp_path / "report.csv")

    assert summary["critical_errors"] == 1


def test_perceptual_duplicate_detection_groups_identical_images(tmp_path):
    first = tmp_path / "first.jpg"
    second = tmp_path / "second.jpg"
    make_image(first, 8)
    second.write_bytes(first.read_bytes())

    memberships, _ = duplicate_groups([first, second], max_distance=0)

    assert memberships[first] == memberships[second]


def test_rdd2022_conversion_keeps_only_d40(tmp_path):
    source = tmp_path / "rdd"
    image_path = source / "train" / "images" / "sample.jpg"
    annotation_path = source / "train" / "annotations" / "xmls" / "sample.xml"
    make_image(image_path)
    annotation_path.parent.mkdir(parents=True)
    annotation_path.write_text(
        """<annotation><filename>sample.jpg</filename><size><width>64</width><height>64</height></size>
        <object><name>D00</name><bndbox><xmin>1</xmin><ymin>1</ymin><xmax>10</xmax><ymax>10</ymax></bndbox></object>
        <object><name>D40</name><bndbox><xmin>16</xmin><ymin>16</ymin><xmax>32</xmax><ymax>32</ymax></bndbox></object>
        </annotation>""",
        encoding="utf-8",
    )

    counts = convert_rdd2022(source, tmp_path / "converted")
    lines = (tmp_path / "converted" / "labels" / "sample.txt").read_text().splitlines()

    assert counts["boxes"] == 1
    assert len(lines) == 1
    assert lines[0].startswith("0 ")


def test_grouped_split_keeps_recording_session_together(tmp_path):
    samples = [
        Sample(
            tmp_path / f"{name}.jpg",
            tmp_path / f"{name}.txt",
            "local",
            group,
            "Palembang",
            group,
            True,
            1,
        )
        for name, group in (
            ("a1", "video-a"),
            ("a2", "video-a"),
            ("b", "video-b"),
            ("c", "video-c"),
            ("d", "video-d"),
        )
    ]
    groups = {
        group: [sample for sample in samples if sample.group_id == group]
        for group in {sample.group_id for sample in samples}
    }

    split = grouped_split(groups, 0.6, 0.2, 0.2, 42)
    assignments = {
        sample.image_path.stem: name for name, values in split.items() for sample in values
    }

    assert assignments["a1"] == assignments["a2"]


def test_dataset_builder_writes_manifest_and_yaml_is_resolvable(tmp_path):
    source = tmp_path / "source"
    (source / "labels").mkdir(parents=True)
    for index in range(6):
        make_image(source / "images" / f"road_{index}.jpg", marker=3 + index * 7)
        (source / "labels" / f"road_{index}.txt").write_text(
            "0 0.50 0.50 0.20 0.20\n" if index < 3 else "",
            encoding="utf-8",
        )
    output = tmp_path / "processed"
    manifest = tmp_path / "manifest.csv"
    summary = build_dataset(
        [("fixture", source)],
        output,
        manifest,
        tmp_path / "version.json",
        duplicate_distance=0,
    )
    rows = list(csv.DictReader(manifest.open(newline="", encoding="utf-8")))
    config_path = tmp_path / "pothole.yaml"
    config_path.write_text(
        yaml.safe_dump(
            {
                "path": output.as_posix(),
                "train": "images/train",
                "val": "images/val",
                "test": "images/test",
                "names": {0: "pothole"},
            }
        ),
        encoding="utf-8",
    )

    assert summary["images"] == 6
    assert set(rows[0]) == {
        "image_path",
        "label_path",
        "source_dataset",
        "source_video",
        "location",
        "split",
        "has_pothole",
        "bbox_count",
    }
    assert load_dataset_config(config_path)["names"] == {0: "pothole"}


def test_dataset_yaml_rejects_extra_classes(tmp_path):
    for split in ("train", "val", "test"):
        (tmp_path / "data" / "images" / split).mkdir(parents=True)
    path = tmp_path / "bad.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "path": (tmp_path / "data").as_posix(),
                "train": "images/train",
                "val": "images/val",
                "test": "images/test",
                "names": {0: "pothole", 1: "crack"},
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="exactly class 0=pothole"):
        load_dataset_config(path)


def test_model_path_and_frame_timestamp_resolution(tmp_path):
    configured = tmp_path / "best.pt"
    start = datetime(2026, 1, 1, tzinfo=UTC)

    assert resolve_pothole_model_path(str(configured)) == configured
    assert frame_timestamp(start, frame_number=26, fps=2.0) == start.replace(
        second=12, microsecond=500000
    )


def test_temporal_duplicate_suppression():
    suppressor = TemporalDuplicateSuppressor(
        window_seconds=2.0, iou_threshold=0.2, center_distance_threshold=0.1
    )

    assert not suppressor.is_duplicate_or_record([10, 10, 30, 30], 0.0, 100, 100)
    assert suppressor.is_duplicate_or_record([12, 12, 32, 32], 0.5, 100, 100)
    assert not suppressor.is_duplicate_or_record([12, 12, 32, 32], 3.0, 100, 100)
