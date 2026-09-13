import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class VerificationResult:
    is_valid: bool
    source_size: int
    staged_size: int
    source_hash: str
    staged_hash: str
    error_message: Optional[str] = None


class Verifier:
    """Verifies staged copies against original source before organizing."""

    CHUNK_SIZE = 64 * 1024

    @classmethod
    def compute_sha256(cls, path: Path) -> str:
        hasher = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(cls.CHUNK_SIZE):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def verify(cls, source_path: Path, staged_path: Path, expected_hash: Optional[str] = None) -> VerificationResult:
        if not staged_path.exists():
            return VerificationResult(
                is_valid=False,
                source_size=0,
                staged_size=0,
                source_hash="",
                staged_hash="",
                error_message="Staged file does not exist",
            )

        staged_size = staged_path.stat().st_size
        staged_hash = cls.compute_sha256(staged_path)

        if source_path.exists():
            source_size = source_path.stat().st_size
            source_hash = expected_hash or cls.compute_sha256(source_path)
        else:
            source_size = staged_size
            source_hash = expected_hash or staged_hash

        if staged_size != source_size:
            return VerificationResult(
                is_valid=False,
                source_size=source_size,
                staged_size=staged_size,
                source_hash=source_hash,
                staged_hash=staged_hash,
                error_message=f"Size mismatch: expected {source_size}B, got {staged_size}B",
            )

        if source_hash and staged_hash != source_hash:
            return VerificationResult(
                is_valid=False,
                source_size=source_size,
                staged_size=staged_size,
                source_hash=source_hash,
                staged_hash=staged_hash,
                error_message=f"Hash mismatch: source={source_hash[:8]}... staged={staged_hash[:8]}...",
            )

        return VerificationResult(
            is_valid=True,
            source_size=source_size,
            staged_size=staged_size,
            source_hash=source_hash,
            staged_hash=staged_hash,
        )
