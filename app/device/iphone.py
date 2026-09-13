import os
import shutil
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Iterator, List, Optional


@dataclass
class DeviceMediaEntry:
    """Represents a raw media entry discovered on a source device."""
    device_id: str
    unique_id: str
    filename: str
    size_bytes: int
    source_path: Path
    created_timestamp: Optional[float] = None
    modified_timestamp: Optional[float] = None


class MediaDevice(ABC):
    """Abstract interface for media source devices (iPhone, Camera, External Drive, Mock)."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable device name."""
        pass

    @property
    @abstractmethod
    def is_connected(self) -> bool:
        """Whether the device is currently connected and accessible."""
        pass

    @property
    def supports_delete(self) -> bool:
        """Whether this device provider safely supports deleting media items."""
        return False

    @abstractmethod
    def discover_media(self) -> List[DeviceMediaEntry]:
        """Enumerate all media items accessible on this device."""
        pass

    @abstractmethod
    def open_stream(self, entry: DeviceMediaEntry) -> BinaryIO:
        """Open a read stream for transferring media bytes."""
        pass

    @abstractmethod
    def copy_to(self, entry: DeviceMediaEntry, destination: Path) -> int:
        """Safely copy raw bytes from device to a local destination file. Returns bytes written."""
        pass

    def delete_media(self, entry: DeviceMediaEntry) -> bool:
        """Safely deletes an item from the device. Returns True if successful."""
        if not self.supports_delete:
            return False
        raise NotImplementedError("delete_media not implemented on this provider")

    def verify_deleted(self, entry: DeviceMediaEntry) -> bool:
        """Verifies that an item is no longer accessible on the device."""
        return False

    def get_capabilities(self) -> dict:
        """Returns provider capabilities dictionary."""
        return {
            "name": self.name,
            "connected": self.is_connected,
            "supports_delete": self.supports_delete,
        }


class LocalFolderDevice(MediaDevice):
    """Media device backed by a local or mounted filesystem directory."""

    def __init__(self, root_path: Path, name: str = "Local Directory", allow_delete: bool = True):
        self.root_path = Path(root_path)
        self._name = name
        self._allow_delete = allow_delete

    @property
    def name(self) -> str:
        return self._name

    @property
    def is_connected(self) -> bool:
        return self.root_path.exists() and self.root_path.is_dir()

    @property
    def supports_delete(self) -> bool:
        return self._allow_delete

    def discover_media(self) -> List[DeviceMediaEntry]:
        if not self.is_connected:
            return []

        entries = []
        # Support recursive scan without hardcoding DCIM/100APPLE structure
        for root, _, files in os.walk(self.root_path):
            for filename in files:
                file_path = Path(root) / filename
                try:
                    stat = file_path.stat()
                    # Skip 0-byte or inaccessible files
                    if stat.st_size == 0:
                        continue
                    entries.append(
                        DeviceMediaEntry(
                            device_id=self.name,
                            unique_id=str(file_path.relative_to(self.root_path)).replace("\\", "/"),
                            filename=filename,
                            size_bytes=stat.st_size,
                            source_path=file_path,
                            created_timestamp=stat.st_ctime,
                            modified_timestamp=stat.st_mtime,
                        )
                    )
                except (OSError, PermissionError):
                    continue
        return entries

    def open_stream(self, entry: DeviceMediaEntry) -> BinaryIO:
        return open(entry.source_path, "rb")

    def copy_to(self, entry: DeviceMediaEntry, destination: Path) -> int:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(entry.source_path, destination)
        return destination.stat().st_size

    def delete_media(self, entry: DeviceMediaEntry) -> bool:
        if not self.supports_delete or not self.is_connected:
            return False

        file_path = Path(entry.source_path)
        # Security check: must reside inside root_path
        try:
            file_path.resolve().relative_to(self.root_path.resolve())
        except ValueError:
            return False

        if not file_path.exists():
            return True  # already deleted

        try:
            file_path.unlink()
            return not file_path.exists()
        except (OSError, PermissionError):
            return False

    def verify_deleted(self, entry: DeviceMediaEntry) -> bool:
        file_path = Path(entry.source_path)
        return not file_path.exists()


class MockIPhoneDevice(LocalFolderDevice):
    """Mock iPhone device for deterministic testing and validation."""

    def __init__(self, mock_root: Path, name: str = "iPhone 15 Pro (Mock)", allow_delete: bool = True):
        super().__init__(root_path=mock_root, name=name, allow_delete=allow_delete)
