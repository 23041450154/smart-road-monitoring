#!/usr/bin/env python3
import argparse
import subprocess
from urllib.parse import urlparse


def check_ffmpeg(url: str) -> tuple[bool, str]:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "stream=codec_name,width,height",
        "-of",
        "default=nw=1",
        url,
    ]
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=15, check=False
        )
    except FileNotFoundError:
        return False, "ffprobe is not installed"
    except subprocess.TimeoutExpired:
        return False, "ffprobe timed out after 15 seconds"
    return result.returncode == 0, result.stdout.strip() or result.stderr.strip()


def check_opencv(url: str) -> tuple[bool, str]:
    try:
        import cv2
    except ImportError:
        return False, "OpenCV is not installed (install requirements-vision.txt)"
    capture = cv2.VideoCapture(url)
    ok, frame = capture.read()
    capture.release()
    return ok, f"frame shape={frame.shape}" if ok else "OpenCV could not decode a frame"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Test an authorized public or local video stream"
    )
    parser.add_argument(
        "url",
        help="Authorized URL or local file path; no authentication bypass is attempted",
    )
    args = parser.parse_args()
    parsed = urlparse(args.url)
    print(f"scheme: {parsed.scheme or 'local-file'}")
    for label, result in (
        ("ffprobe", check_ffmpeg(args.url)),
        ("opencv", check_opencv(args.url)),
    ):
        print(f"{label}: {'OK' if result[0] else 'FAILED'} - {result[1]}")
