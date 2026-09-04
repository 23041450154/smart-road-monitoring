from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Iterable

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def iter_images(root: Path, recursive: bool = True) -> list[Path]:
    pattern = "**/*" if recursive else "*"
    return sorted(
        path
        for path in root.glob(pattern)
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def difference_hash(path: Path, hash_size: int = 8) -> int:
    from PIL import Image

    with Image.open(path) as image:
        resized = image.convert("L").resize((hash_size + 1, hash_size))
        get_pixels = getattr(resized, "get_flattened_data", resized.getdata)
        pixels = list(get_pixels())
    value = 0
    row_width = hash_size + 1
    for row in range(hash_size):
        offset = row * row_width
        for column in range(hash_size):
            value = (value << 1) | int(
                pixels[offset + column] > pixels[offset + column + 1]
            )
    return value


def hamming_distance(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def duplicate_groups(
    paths: Iterable[Path], max_distance: int = 6
) -> tuple[dict[Path, str], dict[Path, int]]:
    image_paths = sorted(Path(path) for path in paths)
    hashes: dict[Path, int] = {}
    valid_paths: list[Path] = []
    for path in image_paths:
        try:
            hashes[path] = difference_hash(path)
            valid_paths.append(path)
        except (OSError, ValueError):
            continue

    parent = list(range(len(valid_paths)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left_root, right_root = find(left), find(right)
        if left_root != right_root:
            parent[max(left_root, right_root)] = min(left_root, right_root)

    buckets: dict[tuple[int, int], list[int]] = defaultdict(list)
    for index, path in enumerate(valid_paths):
        image_hash = hashes[path]
        candidates: set[int] = set()
        for band in range(8):
            value = (image_hash >> (band * 8)) & 0xFF
            candidates.update(buckets[(band, value)])
        for candidate in candidates:
            if (
                hamming_distance(image_hash, hashes[valid_paths[candidate]])
                <= max_distance
            ):
                union(index, candidate)
        for band in range(8):
            value = (image_hash >> (band * 8)) & 0xFF
            buckets[(band, value)].append(index)

    components: dict[int, list[int]] = defaultdict(list)
    for index in range(len(valid_paths)):
        components[find(index)].append(index)

    memberships: dict[Path, str] = {}
    duplicate_number = 0
    for indices in sorted(
        components.values(), key=lambda values: valid_paths[min(values)].as_posix()
    ):
        if len(indices) < 2:
            continue
        duplicate_number += 1
        group_name = f"dup-{duplicate_number:05d}"
        for index in indices:
            memberships[valid_paths[index]] = group_name
    return memberships, hashes


def parse_yolo_lines(lines: Iterable[str], allowed_classes: set[int] | None = None):
    boxes: list[tuple[int, float, float, float, float]] = []
    errors: list[tuple[int, str]] = []
    for line_number, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line:
            continue
        values = line.split()
        if len(values) != 5:
            errors.append((line_number, "expected 5 whitespace-separated values"))
            continue
        try:
            class_value = float(values[0])
            coordinates = [float(value) for value in values[1:]]
        except ValueError:
            errors.append((line_number, "label contains a non-numeric value"))
            continue
        if not class_value.is_integer():
            errors.append((line_number, "class id must be an integer"))
            continue
        class_id = int(class_value)
        if allowed_classes is not None and class_id not in allowed_classes:
            errors.append((line_number, f"class id {class_id} is not allowed"))
            continue
        if any(
            not value == value or value in (float("inf"), float("-inf"))
            for value in coordinates
        ):
            errors.append((line_number, "coordinates must be finite"))
            continue
        x_center, y_center, width, height = coordinates
        if not all(0 <= value <= 1 for value in coordinates):
            errors.append((line_number, "coordinates must be normalized to [0, 1]"))
            continue
        if width <= 0 or height <= 0:
            errors.append(
                (line_number, "box width and height must be greater than zero")
            )
            continue
        tolerance = 1e-6
        if (
            x_center - width / 2 < -tolerance
            or x_center + width / 2 > 1 + tolerance
            or y_center - height / 2 < -tolerance
            or y_center + height / 2 > 1 + tolerance
        ):
            errors.append((line_number, "bounding box extends outside the image"))
            continue
        boxes.append((class_id, x_center, y_center, width, height))
    return boxes, errors


def bbox_iou(
    left: tuple[float, float, float, float], right: tuple[float, float, float, float]
) -> float:
    left_x1, left_y1, left_x2, left_y2 = left
    right_x1, right_y1, right_x2, right_y2 = right
    intersection_width = max(0.0, min(left_x2, right_x2) - max(left_x1, right_x1))
    intersection_height = max(0.0, min(left_y2, right_y2) - max(left_y1, right_y1))
    intersection = intersection_width * intersection_height
    left_area = max(0.0, left_x2 - left_x1) * max(0.0, left_y2 - left_y1)
    right_area = max(0.0, right_x2 - right_x1) * max(0.0, right_y2 - right_y1)
    union = left_area + right_area - intersection
    return intersection / union if union else 0.0
