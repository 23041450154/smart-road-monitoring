from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".m4v", ".webm"}


def video_files(source: Path, recursive: bool) -> list[Path]:
    if source.is_file():
        return [source] if source.suffix.lower() in VIDEO_EXTENSIONS else []
    pattern = "**/*" if recursive else "*"
    return sorted(
        path
        for path in source.glob(pattern)
        if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
    )


def safe_stem(path: Path, root: Path) -> str:
    relative = path.relative_to(root) if root.is_dir() else Path(path.name)
    return re.sub(r"[^A-Za-z0-9_-]+", "_", relative.with_suffix("").as_posix())


def extract_video(
    video: Path,
    output: Path,
    prefix: str,
    interval_seconds: float,
    max_frames: int | None,
) -> list[dict[str, str | int | float]]:
    try:
        import cv2
    except ImportError as exc:
        raise SystemExit("OpenCV is required; run `make vision-install`") from exc

    capture = cv2.VideoCapture(str(video))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open video: {video}")
    source_fps = capture.get(cv2.CAP_PROP_FPS)
    if source_fps <= 0:
        capture.release()
        raise RuntimeError(f"Video reports an invalid FPS: {video}")

    output.mkdir(parents=True, exist_ok=True)
    next_sample_seconds = 0.0
    frame_index = 0
    extracted = 0
    rows: list[dict[str, str | int | float]] = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        timestamp_seconds = frame_index / source_fps
        if timestamp_seconds + 1e-9 >= next_sample_seconds:
            filename = f"{prefix}__frame_{frame_index:08d}__ms_{round(timestamp_seconds * 1000):012d}.jpg"
            destination = output / filename
            if not cv2.imwrite(str(destination), frame):
                capture.release()
                raise RuntimeError(f"Unable to write frame: {destination}")
            rows.append(
                {
                    "filename": destination.as_posix(),
                    "source_video": video.as_posix(),
                    "frame_index": frame_index,
                    "timestamp_seconds": round(timestamp_seconds, 6),
                    "source_fps": round(source_fps, 6),
                }
            )
            extracted += 1
            next_sample_seconds += interval_seconds
            if max_frames is not None and extracted >= max_frames:
                break
        frame_index += 1
    capture.release()
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract sparse annotation frames from road videos"
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    interval = parser.add_mutually_exclusive_group()
    interval.add_argument("--fps", type=float)
    interval.add_argument("--interval-seconds", type=float)
    parser.add_argument("--max-frames", type=int, help="Maximum frames per video")
    parser.add_argument("--recursive", action="store_true")
    args = parser.parse_args()

    if args.fps is not None and args.fps <= 0:
        parser.error("--fps must be greater than zero")
    if args.interval_seconds is not None and args.interval_seconds <= 0:
        parser.error("--interval-seconds must be greater than zero")
    if args.max_frames is not None and args.max_frames <= 0:
        parser.error("--max-frames must be greater than zero")

    interval_seconds = args.interval_seconds or 1.0 / (args.fps or 1.0)
    videos = video_files(args.input, args.recursive)
    if not videos:
        raise SystemExit(f"No supported videos found under {args.input}")

    rows: list[dict[str, str | int | float]] = []
    for video in videos:
        rows.extend(
            extract_video(
                video,
                args.output,
                safe_stem(video, args.input),
                interval_seconds,
                args.max_frames,
            )
        )

    manifest = args.output / "extraction_manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "filename",
                "source_video",
                "frame_index",
                "timestamp_seconds",
                "source_fps",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)
    print(
        f"Extracted {len(rows)} frames from {len(videos)} video(s); manifest={manifest}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
