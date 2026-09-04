from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


class StreamError(RuntimeError):
    pass


class BaseStreamSource(ABC):
    def __init__(self, source: str) -> None:
        self.source = source
        self.capture: Any | None = None

    @abstractmethod
    def validate(self) -> None:
        pass

    def open(self) -> None:
        self.validate()
        try:
            import cv2
        except ImportError as exc:
            raise StreamError(
                "Install backend/requirements-vision.txt to read video"
            ) from exc
        self.capture = cv2.VideoCapture(self.source)
        if not self.capture.isOpened():
            self.close()
            raise StreamError(f"Unable to open configured {type(self).__name__}")

    def read(self) -> tuple[bool, Any | None]:
        if self.capture is None:
            return False, None
        return self.capture.read()

    def close(self) -> None:
        if self.capture is not None:
            self.capture.release()
            self.capture = None


class LocalVideoSource(BaseStreamSource):
    def validate(self) -> None:
        if not Path(self.source).is_file():
            raise StreamError(
                f"Local demo video not found: {self.source}. Place it at vision/samples/traffic.mp4."
            )


class HLSStreamSource(BaseStreamSource):
    def validate(self) -> None:
        parsed = urlparse(self.source)
        if parsed.scheme not in {"http", "https"} or not parsed.path.lower().endswith(
            ".m3u8"
        ):
            raise StreamError("HLS source must be an authorized HTTP(S) .m3u8 URL")


class RTSPStreamSource(BaseStreamSource):
    def validate(self) -> None:
        if urlparse(self.source).scheme != "rtsp":
            raise StreamError("RTSP source must use the rtsp:// scheme")


def create_stream(source_type: str, source: str) -> BaseStreamSource:
    sources = {
        "local": LocalVideoSource,
        "hls": HLSStreamSource,
        "rtsp": RTSPStreamSource,
    }
    try:
        return sources[source_type.lower()](source)
    except KeyError as exc:
        raise StreamError(f"Unsupported CAMERA_SOURCE: {source_type}") from exc
