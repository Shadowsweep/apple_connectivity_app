import os
import re
from pathlib import Path
from typing import Generator, Optional, Tuple
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse


class RangeStreamer:
    """Handles RFC 7233 byte-range HTTP streaming for media files."""

    CHUNK_SIZE = 64 * 1024  # 64 KB streaming chunks
    RANGE_PATTERN = re.compile(r"bytes=(\d+)-(\d+)?")

    @classmethod
    def parse_range(cls, range_header: str, file_size: int) -> Tuple[int, int]:
        match = cls.RANGE_PATTERN.match(range_header.strip())
        if not match:
            return 0, file_size - 1

        start_str, end_str = match.groups()
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1

        if start >= file_size or start < 0 or end >= file_size or start > end:
            raise HTTPException(
                status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
                detail="Requested Range Not Satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"},
            )

        return start, end

    @classmethod
    def file_chunk_generator(
        cls, file_path: Path, start: int, end: int, chunk_size: int = CHUNK_SIZE
    ) -> Generator[bytes, None, None]:
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = (end - start) + 1
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                data = f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    @classmethod
    def create_response(
        cls,
        file_path: Path,
        library_root: Path,
        range_header: Optional[str] = None,
        content_type: str = "application/octet-stream",
    ) -> StreamingResponse:
        resolved_file = file_path.resolve()
        resolved_root = library_root.resolve()

        # Strict path containment defense against path traversal
        if not str(resolved_file).startswith(str(resolved_root)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to path outside library root is forbidden",
            )

        if not resolved_file.exists() or not resolved_file.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media file not found on disk",
            )

        file_size = resolved_file.stat().st_size

        if range_header:
            start, end = cls.parse_range(range_header, file_size)
            content_length = (end - start) + 1
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": content_type,
            }
            return StreamingResponse(
                cls.file_chunk_generator(resolved_file, start, end),
                status_code=status.HTTP_206_PARTIAL_CONTENT,
                headers=headers,
            )
        else:
            headers = {
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": content_type,
            }
            return StreamingResponse(
                cls.file_chunk_generator(resolved_file, 0, file_size - 1),
                status_code=status.HTTP_200_OK,
                headers=headers,
            )
