"""
Multi-Worker Supervisor for Smart Road Monitoring.
Splits all active CCTV cameras into 4 concurrent workers (2 cameras per worker).
Each worker runs a fast 2-camera round-robin cycle (e.g. 60s per camera).
Results: Every camera in the city is revisited every 2 minutes (drastically reduced gap)
while CPU load remains smoothly distributed across the 4 VPS cores.
"""

import argparse
import logging
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

# Add backend and project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "backend"))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import Camera

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SUPERVISOR] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("multi-worker-supervisor")


def get_active_camera_ids() -> list[int]:
    """Retrieves all active camera IDs from the database."""
    try:
        with SessionLocal() as db:
            cameras = list(
                db.scalars(
                    select(Camera.id)
                    .where(Camera.is_active.is_(True))
                    .order_by(Camera.id)
                )
            )
            return cameras or [1, 2, 3, 4, 5, 6, 7, 8]
    except Exception as exc:
        log.warning("Gagal membaca daftar kamera dari database: %s. Menggunakan default 1-8.", exc)
        return [1, 2, 3, 4, 5, 6, 7, 8]


def split_cameras_into_groups(camera_ids: list[int], num_workers: int = 4) -> list[list[int]]:
    """Divides camera IDs evenly into sequential pairs/chunks for each worker."""
    import math

    if not camera_ids:
        return []
    chunk_size = math.ceil(len(camera_ids) / num_workers)
    return [camera_ids[i : i + chunk_size] for i in range(0, len(camera_ids), chunk_size)]


class MultiWorkerSupervisor:
    def __init__(self, num_workers: int = 4, duration: int = 60) -> None:
        self.num_workers = num_workers
        self.duration = duration
        self.processes: dict[int, subprocess.Popen] = {}
        self.groups: dict[int, list[int]] = {}
        self.running = True

    def start_worker(self, worker_id: int, camera_group: list[int]) -> subprocess.Popen:
        """Launches a single round-robin worker process for a specific camera group."""
        cams_arg = [str(c) for c in camera_group]
        env = os.environ.copy()
        env["OMP_NUM_THREADS"] = "1"
        env["OPENVINO_NUM_THREADS"] = "1"
        env["MKL_NUM_THREADS"] = "1"
        env["WORKER_TAG"] = f"WORKER-{worker_id}"

        # Ensure python paths are properly configured
        existing_pythonpath = env.get("PYTHONPATH", "")
        paths = ["/app", "/", str(PROJECT_ROOT / "backend"), str(PROJECT_ROOT)]
        if existing_pythonpath:
            paths.append(existing_pythonpath)
        env["PYTHONPATH"] = ":".join(paths)

        cmd = [
            sys.executable,
            "-m",
            "vision.traffic_worker.round_robin_worker",
            "--duration",
            str(self.duration),
            "--cameras",
            *cams_arg,
        ]

        log.info(
            "Menyalakan Worker #%d untuk Kamera: %s (Durasi per kamera: %ds)...",
            worker_id,
            camera_group,
            self.duration,
        )

        cwd = str(PROJECT_ROOT) if (PROJECT_ROOT / "vision").exists() else "/app"
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            env=env,
        )
        return proc

    def stop_all(self) -> None:
        """Gracefully terminates all child worker processes."""
        log.info("Menghentikan semua worker child processes...")
        self.running = False
        for worker_id, proc in list(self.processes.items()):
            if proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=2)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
        log.info("Semua worker berhasil dihentikan.")

    def run(self) -> None:
        camera_ids = get_active_camera_ids()
        grouped = split_cameras_into_groups(camera_ids, self.num_workers)

        log.info(
            "Total Kamera Aktif: %d | Dibagi ke %d Worker (Rata-rata %d kamera/worker)",
            len(camera_ids),
            len(grouped),
            len(grouped[0]) if grouped else 0,
        )

        for idx, group in enumerate(grouped, 1):
            self.groups[idx] = group
            self.processes[idx] = self.start_worker(idx, group)
            time.sleep(1.0)  # staggered start to avoid simultaneous model load spike

        # Health monitor loop
        while self.running:
            try:
                time.sleep(5)
                for worker_id, proc in list(self.processes.items()):
                    if proc.poll() is not None:
                        log.warning(
                            "Worker #%d (Kamera: %s) berhenti (Exit Code: %s). Me-restart worker...",
                            worker_id,
                            self.groups[worker_id],
                            proc.returncode,
                        )
                        self.processes[worker_id] = self.start_worker(worker_id, self.groups[worker_id])
            except KeyboardInterrupt:
                log.info("Supervisor menerima sinyal berhenti (SIGINT).")
                self.stop_all()
                break
            except Exception as e:
                log.error("Error pada supervisor monitor loop: %s", e)


def main():
    parser = argparse.ArgumentParser(description="Multi-Worker Supervisor for Smart Road Monitoring")
    parser.add_argument(
        "--workers",
        type=int,
        default=int(os.getenv("NUM_TRAFFIC_WORKERS", "4")),
        help="Jumlah worker paralel (default: 4 untuk 4-core VPS)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=int(os.getenv("ROUND_ROBIN_DURATION_SECONDS", "60")),
        help="Durasi pemantauan per kamera dalam detik (default: 60s)",
    )
    args = parser.parse_args()

    supervisor = MultiWorkerSupervisor(num_workers=args.workers, duration=args.duration)

    def handle_signal(sig, frame):
        supervisor.stop_all()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    supervisor.run()


if __name__ == "__main__":
    main()
