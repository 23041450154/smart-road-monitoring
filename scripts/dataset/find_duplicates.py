from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.dataset.common import duplicate_groups, hamming_distance, iter_images


def write_duplicate_report(source: Path, report: Path, threshold: int = 6) -> int:
    images = iter_images(source)
    groups, hashes = duplicate_groups(images, threshold)
    representatives: dict[str, Path] = {}
    for path, group in groups.items():
        representatives.setdefault(group, path)
    report.parent.mkdir(parents=True, exist_ok=True)
    with report.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "filename",
                "duplicate_group",
                "distance_to_representative",
                "status",
            ],
        )
        writer.writeheader()
        for path in images:
            group = groups.get(path, "")
            distance = ""
            if group:
                distance = hamming_distance(
                    hashes[path], hashes[representatives[group]]
                )
            writer.writerow(
                {
                    "filename": path.as_posix(),
                    "duplicate_group": group,
                    "distance_to_representative": distance,
                    "status": "near_duplicate" if group else "unique",
                }
            )
    return len(set(groups.values()))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find exact and near-duplicate road images"
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument(
        "--report", type=Path, default=Path("datasets/reports/duplicates.csv")
    )
    parser.add_argument("--max-distance", type=int, default=6)
    args = parser.parse_args()
    if not 0 <= args.max_distance <= 64:
        parser.error("--max-distance must be between 0 and 64")
    count = write_duplicate_report(args.input, args.report, args.max_distance)
    print(f"Duplicate groups: {count}; report={args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
