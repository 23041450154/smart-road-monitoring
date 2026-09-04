import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.models import Severity  # noqa: E402
from vision.pothole_worker.pothole_worker import run  # noqa: E402


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Manual-video pothole worker")
    parser.add_argument("--video", required=True)
    parser.add_argument("--gps", required=True)
    parser.add_argument(
        "--severity", choices=[item.value for item in Severity], default="unknown"
    )
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()
    run(args.video, args.gps, Severity(args.severity), args.demo)
