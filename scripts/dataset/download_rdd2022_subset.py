from __future__ import annotations

import argparse
import hashlib
import json
import os
import struct
import urllib.request
import zlib
from pathlib import Path

FIGSHARE_ARTICLE_API = "https://api.figshare.com/v2/articles/21431547"
ARCHIVE_NAME = "RDD2022_released_through_CRDDC2022.zip"
COUNTRIES = {
    "china-drone": "RDD2022/China_Drone.zip",
    "china-motorbike": "RDD2022/China_MotorBike.zip",
    "czech": "RDD2022/Czech.zip",
    "india": "RDD2022/India.zip",
    "japan": "RDD2022/Japan.zip",
    "norway": "RDD2022/Norway.zip",
    "united-states": "RDD2022/United_States.zip",
}


def read_range(url: str, start: int, end: int) -> bytes:
    request = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(request) as response:
        if response.status != 206:
            raise RuntimeError(
                f"Server did not honor byte range: HTTP {response.status}"
            )
        return response.read()


def zip64_directory(url: str, archive_size: int) -> tuple[int, int]:
    tail_size = min(131_072, archive_size)
    tail = read_range(url, archive_size - tail_size, archive_size - 1)
    locator_position = tail.rfind(b"PK\x06\x07")
    if locator_position < 0:
        raise ValueError("ZIP64 end-of-central-directory locator not found")
    _, _, zip64_offset, _ = struct.unpack_from("<4sLQL", tail, locator_position)
    relative = zip64_offset - (archive_size - tail_size)
    if relative < 0 or relative + 56 > len(tail):
        record = read_range(url, zip64_offset, zip64_offset + 55)
        relative = 0
    else:
        record = tail
    fields = struct.unpack_from("<4sQ2H2L4Q", record, relative)
    if fields[0] != b"PK\x06\x06":
        raise ValueError("Invalid ZIP64 end-of-central-directory record")
    return int(fields[-1]), int(fields[-2])


def central_entries(data: bytes) -> dict[str, dict[str, int]]:
    entries: dict[str, dict[str, int]] = {}
    position = 0
    while position < len(data):
        if data[position : position + 4] != b"PK\x01\x02":
            raise ValueError(f"Invalid central-directory signature at byte {position}")
        fields = struct.unpack_from("<4s6H3L5H2L", data, position)
        compressed_size, uncompressed_size = fields[8], fields[9]
        name_length, extra_length, comment_length = fields[10], fields[11], fields[12]
        local_offset = fields[-1]
        name_start = position + 46
        name = data[name_start : name_start + name_length].decode("utf-8")
        extra = data[name_start + name_length : name_start + name_length + extra_length]
        zip64_values: list[int] = []
        extra_position = 0
        while extra_position + 4 <= len(extra):
            header_id, size = struct.unpack_from("<HH", extra, extra_position)
            payload = extra[extra_position + 4 : extra_position + 4 + size]
            if header_id == 1:
                zip64_values = list(
                    struct.unpack("<" + "Q" * (len(payload) // 8), payload)
                )
            extra_position += 4 + size
        values = iter(zip64_values)
        if uncompressed_size == 0xFFFFFFFF:
            uncompressed_size = next(values)
        if compressed_size == 0xFFFFFFFF:
            compressed_size = next(values)
        if local_offset == 0xFFFFFFFF:
            local_offset = next(values)
        entries[name] = {
            "compressed_size": int(compressed_size),
            "uncompressed_size": int(uncompressed_size),
            "local_offset": int(local_offset),
            "crc32": int(fields[7]),
            "method": int(fields[4]),
        }
        position += 46 + name_length + extra_length + comment_length
    return entries


def download_member(
    url: str, entry: dict[str, int], destination: Path
) -> tuple[str, int]:
    if entry["method"] != 0:
        raise ValueError(
            "Selected nested ZIP is not stored verbatim in the outer archive"
        )
    header = read_range(url, entry["local_offset"], entry["local_offset"] + 65_535)
    if header[:4] != b"PK\x03\x04":
        raise ValueError("Invalid local ZIP header")
    fields = struct.unpack_from("<4s5H3L2H", header, 0)
    data_offset = entry["local_offset"] + 30 + fields[-2] + fields[-1]
    data_end = data_offset + entry["compressed_size"] - 1
    request = urllib.request.Request(
        url, headers={"Range": f"bytes={data_offset}-{data_end}"}
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    sha256 = hashlib.sha256()
    crc32 = 0
    size = 0
    try:
        with (
            urllib.request.urlopen(request) as response,
            temporary.open("wb") as output,
        ):
            if response.status != 206:
                raise RuntimeError(
                    f"Server did not honor member byte range: HTTP {response.status}"
                )
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
                sha256.update(chunk)
                crc32 = zlib.crc32(chunk, crc32)
                size += len(chunk)
        if size != entry["compressed_size"] or crc32 != entry["crc32"]:
            raise ValueError("Downloaded member failed size or CRC32 validation")
        os.replace(temporary, destination)
    finally:
        if temporary.exists():
            temporary.unlink()
    return sha256.hexdigest(), size


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download one public RDD2022 country subset from Figshare v1"
    )
    parser.add_argument(
        "--country", choices=sorted(COUNTRIES), default="china-motorbike"
    )
    parser.add_argument("--output", type=Path, default=Path("datasets/raw/rdd2022"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    with urllib.request.urlopen(FIGSHARE_ARTICLE_API) as response:
        article = json.load(response)
    archive = next(
        (item for item in article["files"] if item["name"] == ARCHIVE_NAME), None
    )
    if archive is None:
        raise SystemExit(f"Figshare article no longer contains {ARCHIVE_NAME}")
    directory_offset, directory_size = zip64_directory(
        archive["download_url"], int(archive["size"])
    )
    entries = central_entries(
        read_range(
            archive["download_url"],
            directory_offset,
            directory_offset + directory_size - 1,
        )
    )
    member_name = COUNTRIES[args.country]
    if member_name not in entries:
        raise SystemExit(f"Archive member not found: {member_name}")
    destination = args.output / Path(member_name).name
    if destination.exists() and not args.force:
        raise SystemExit(
            f"Destination exists: {destination}; pass --force to replace it"
        )
    digest, size = download_member(
        archive["download_url"], entries[member_name], destination
    )
    print(f"Downloaded {member_name} -> {destination}; bytes={size}; sha256={digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
