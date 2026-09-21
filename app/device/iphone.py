import io
import asyncio
import os
import re
import shutil
import stat as stat_mod
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, BinaryIO, Iterator, List, Optional

if TYPE_CHECKING:
    from pymobiledevice3.services.afc import AfcService


# ponytail: one USB operation at a time — concurrent HTTP requests enumerating
# together overwhelm the WPD driver and the device drops ("stopped responding").
_USB_LOCK = threading.Lock()
_USB_LOCK_TIMEOUT = 120.0


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

    def close(self) -> None:
        """Release provider resources. Filesystem-backed devices need no cleanup."""
        return None


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


# ponytail: AFC media extensions — Camera Roll only carries these on-device
_AFC_MEDIA_EXTENSIONS = {
    ".jpg", ".jpeg", ".heic", ".png", ".gif", ".webp", ".tiff", ".dng",
    ".mov", ".mp4", ".m4v",
}


class _AfcChunkStream(io.RawIOBase):
    """Read-only streaming wrapper around an open AFC file handle."""

    def __init__(self, afc, handle: int, size: int, loop: asyncio.AbstractEventLoop):
        self._afc = afc
        self._handle = handle
        self._remaining = size
        self._loop = loop

    def readable(self) -> bool:
        return True

    def readinto(self, b) -> int:
        if self._remaining <= 0:
            return 0
        chunk = self._loop.run_until_complete(
            self._afc.fread(self._handle, min(len(b), self._remaining))
        )
        b[: len(chunk)] = chunk
        self._remaining -= len(chunk)
        return len(chunk)

    def close(self) -> None:
        try:
            self._loop.run_until_complete(self._afc.fclose(self._handle))
        except Exception:
            pass
        super().close()


class UsbIPhoneDevice(MediaDevice):
    """
    Real iPhone over USB via Apple's usbmuxd + AFC protocol (pymobiledevice3).

    Reads the Camera Roll (/DCIM) directly over the wire — no Windows MTP mount,
    no silent listing truncation, no truncated large-file copies.

    pymobiledevice3 v11 is fully async; all calls run on ONE persistent event
    loop owned by this instance (mixing asyncio.run() calls kills the socket).
    """

    CHUNK_SIZE = 1024 * 1024

    def __init__(self, serial: Optional[str] = None, name: Optional[str] = None):
        self._serial = serial
        self._afc = None
        self._lockdown = None
        self._device_name = name or "iPhone (USB)"
        self._connected = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._connect()

    @property
    def provider_name(self) -> str:
        return "Direct USB (Apple Devices pairing service)"

    def _run(self, coro):
        if self._loop is None or self._loop.is_closed():
            self._loop = asyncio.new_event_loop()
        return self._loop.run_until_complete(coro)

    def _connect(self) -> None:
        try:
            from pymobiledevice3.lockdown import create_using_usbmux
            from pymobiledevice3.services.afc import AfcService

            self._lockdown = self._run(create_using_usbmux(serial=self._serial))
            self._afc = AfcService(self._lockdown)
            self._device_name = self._lockdown.short_info.get("DeviceName", self._device_name)
            self._connected = self._run(self._afc.exists("/DCIM"))
        except Exception:
            self._afc = None
            self._lockdown = None
            self._connected = False

    @property
    def name(self) -> str:
        return self._device_name

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def supports_delete(self) -> bool:
        # ponytail: iOS blocks Camera Roll deletion over AFC; Clean Mobile falls back to report mode
        return False

    def discover_media(self) -> List[DeviceMediaEntry]:
        if not self._connected or self._afc is None:
            return []

        entries: List[DeviceMediaEntry] = []
        stack = ["/DCIM"]
        while stack:
            current = stack.pop()
            try:
                children = self._run(self._afc.listdir(current))
            except OSError:
                continue
            for child in children:
                child_path = f"{current}/{child}"
                try:
                    stat = self._run(self._afc.os_stat(child_path))
                except OSError:
                    continue
                if stat_mod.S_ISDIR(stat.st_mode):
                    stack.append(child_path)
                    continue
                if Path(child).suffix.lower() not in _AFC_MEDIA_EXTENSIONS:
                    continue
                size = int(stat.st_size)
                if size == 0:
                    continue
                entries.append(
                    DeviceMediaEntry(
                        device_id=self._device_name,
                        unique_id=child_path,
                        filename=child,
                        size_bytes=size,
                        source_path=Path(child_path),
                        modified_timestamp=getattr(stat, "st_mtime", None),
                    )
                )
        return entries

    def open_stream(self, entry: DeviceMediaEntry) -> BinaryIO:
        if self._afc is None:
            raise OSError("iPhone not connected")
        handle = self._run(self._afc.fopen(str(entry.source_path).replace("\\", "/")))
        return io.BufferedReader(
            _AfcChunkStream(self._afc, handle, entry.size_bytes, self._loop), buffer_size=self.CHUNK_SIZE
        )

    def copy_to(self, entry: DeviceMediaEntry, destination: Path) -> int:
        if self._afc is None:
            self._connect()
        if self._afc is None:
            raise OSError("iPhone not connected")
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            self._run(
                self._afc.pull(str(entry.source_path).replace("\\", "/"), str(destination), progress_bar=False)
            )
        except Exception:
            self._connect()
            if self._afc:
                self._run(
                    self._afc.pull(str(entry.source_path).replace("\\", "/"), str(destination), progress_bar=False)
                )
            else:
                raise
        return destination.stat().st_size

    def close(self) -> None:
        if self._afc is not None and self._loop is not None and not self._loop.is_closed():
            try:
                self._run(self._afc.close())
            except Exception:
                pass
        self._afc = None
        self._lockdown = None
        self._connected = False
        if self._loop is not None and not self._loop.is_closed():
            try:
                self._loop.close()
            except Exception:
                pass



class WindowsWpdIPhoneDevice(MediaDevice):
    """
    Real iPhone over USB on Windows via Windows Portable Devices (WPD) Shell COM API.
    Works natively with Windows Explorer / Apple Mobile Device MTP driver.
    """

    def __init__(self, name: Optional[str] = None):
        self._name = name or "Apple iPhone (USB)"
        self._connected = False
        self.last_error: Optional[str] = None
        # ponytail: 5s TTL so probe/scan/summary storms don't boot COM per check
        self._conn_checked_at: float = 0.0
        self._check_connection()

    @property
    def provider_name(self) -> str:
        return "Windows Portable Devices (Apple Devices driver)"

    @staticmethod
    def _find_iphone_item(drives):
        if not drives:
            return None
        for item in drives.Items():
            name = str(getattr(item, "Name", "")).lower()
            if "iphone" in name or "apple" in name:
                return item
        return None

    @staticmethod
    def _find_child(folder, name: str):
        wanted = name.casefold()
        for item in folder.Items():
            if str(getattr(item, "Name", "")).casefold() == wanted:
                return item
        return None

    @classmethod
    def _resolve_item(cls, device_folder, relative_path: Path):
        """Resolve a WPD item by its full virtual path below the iPhone root."""
        parts = [part for part in Path(relative_path).parts if part not in ("/", "\\")]
        if not parts:
            return None
        folder = device_folder
        for part in parts[:-1]:
            child = cls._find_child(folder, part)
            if child is None or not getattr(child, "IsFolder", False):
                return None
            folder = child.GetFolder
        return cls._find_child(folder, parts[-1])

    @staticmethod
    def _detail(folder, item, labels: set[str], fallback_index: Optional[int] = None) -> str:
        """Read a Shell column by its heading instead of assuming one column order."""
        for column in range(0, 48):
            try:
                heading = str(folder.GetDetailsOf(None, column) or "").strip().casefold()
                if heading in labels:
                    return str(folder.GetDetailsOf(item, column) or "")
            except Exception:
                continue
        if fallback_index is not None:
            try:
                return str(folder.GetDetailsOf(item, fallback_index) or "")
            except Exception:
                pass
        return ""

    @staticmethod
    def _column_map(folder) -> dict[str, int]:
        columns: dict[str, int] = {}
        for column in range(0, 48):
            try:
                heading = str(folder.GetDetailsOf(None, column) or "").strip().casefold()
                if heading:
                    columns[heading] = column
            except Exception:
                continue
        return columns

    @staticmethod
    def _mapped_detail(
        folder,
        item,
        columns: dict[str, int],
        labels: set[str],
        fallback_index: Optional[int] = None,
    ) -> str:
        column = next((columns[label] for label in labels if label in columns), fallback_index)
        if column is None:
            return ""
        try:
            return str(folder.GetDetailsOf(item, column) or "")
        except Exception:
            return ""

    @staticmethod
    def _timestamp_from_item(item, fallback: str) -> Optional[float]:
        try:
            value = getattr(item, "ModifyDate", None)
            if value is not None and hasattr(value, "timestamp"):
                return float(value.timestamp())
        except Exception:
            pass
        return WindowsWpdIPhoneDevice._parse_date(fallback)

    def _check_connection(self) -> None:
        import time

        # ponytail: TTL-cache the COM probe — callers check per request, not per file
        if time.monotonic() - self._conn_checked_at < 5.0:
            return
        self._conn_checked_at = time.monotonic()
        if os.name != "nt":
            self._connected = False
            return
        try:
            import pythoncom
            import win32com.client

            pythoncom.CoInitialize()
            try:
                shell = win32com.client.Dispatch("Shell.Application")
                drives = shell.NameSpace(17)  # ssfDRIVES
                item = self._find_iphone_item(drives)
                if item is not None:
                    self._connected = True
                    self._name = f"{item.Name} (USB)"
                    self.last_error = None
                    return
                self._connected = False
            finally:
                pythoncom.CoUninitialize()
        except Exception as exc:
            self._connected = False
            self.last_error = str(exc)

    @property
    def name(self) -> str:
        return self._name

    @property
    def is_connected(self) -> bool:
        self._check_connection()
        return self._connected

    @property
    def supports_delete(self) -> bool:
        return False

    @staticmethod
    def _parse_size(size_str: str) -> int:
        if not size_str:
            return 0
        size_str = size_str.replace("\xa0", " ").strip().upper()
        m = re.match(r"([\d\.,]+)\s*([KMGTP]?B|BYTES?)", size_str)
        if not m:
            return 0
        val_str, unit = m.groups()
        try:
            val = float(val_str.replace(",", ""))
        except ValueError:
            return 0
        if "GB" in unit:
            return int(val * 1024 * 1024 * 1024)
        if "MB" in unit:
            return int(val * 1024 * 1024)
        if "KB" in unit:
            return int(val * 1024)
        return int(val)

    @staticmethod
    def _parse_date(date_str: str) -> Optional[float]:
        if not date_str:
            return None
        date_str = date_str.replace("\u200e", "").replace("\u200f", "").strip()
        import time
        for fmt in (
            "%d-%m-%Y %H:%M",
            "%d/%m/%Y %H:%M",
            "%m/%d/%Y %I:%M %p",
            "%d.%m.%Y %H:%M",
            "%Y-%m-%d %H:%M",
            "%Y/%m/%d %H:%M",
            "%d-%m-%Y %I:%M %p",
            "%d/%m/%Y %I:%M %p",
        ):
            try:
                return time.mktime(time.strptime(date_str, fmt))
            except (ValueError, TypeError):
                pass
        return None

    @staticmethod
    def _ext_from_type(type_str: str) -> str:
        t = (type_str or "").lower()
        if "heic" in t:
            return ".HEIC"
        if "jpeg" in t or "jpg" in t:
            return ".JPG"
        if "png" in t:
            return ".PNG"
        if "quicktime" in t or "mov" in t:
            return ".MOV"
        if "mp4" in t:
            return ".MP4"
        if "m4v" in t:
            return ".M4V"
        if "aae" in t:
            return ".AAE"
        if "dng" in t or "raw" in t:
            return ".DNG"
        if "gif" in t:
            return ".GIF"
        return ""

    def discover_media(self) -> List[DeviceMediaEntry]:
        if not self.is_connected:
            return []
        import pythoncom
        import win32com.client

        # ponytail: fail fast when another request owns the device, don't pile on
        if not _USB_LOCK.acquire(timeout=_USB_LOCK_TIMEOUT):
            raise OSError("iPhone is busy with another operation; try again")
        entries: List[DeviceMediaEntry] = []
        pythoncom.CoInitialize()
        try:
            shell = win32com.client.Dispatch("Shell.Application")
            drives = shell.NameSpace(17)
            iphone_item = self._find_iphone_item(drives)
            if not iphone_item:
                return []

            # Apple Devices exposes Internal Storage/DCIM/<roll folders>.  Walk
            # recursively because the exact nesting differs across iOS/driver versions.
            # ponytail: one column map per folder (was 48 probes per detail read);
            # a dead folder is skipped, not fatal — partial results beat a failed scan.
            stack = [(iphone_item.GetFolder, tuple(), 0)]
            while stack:
                folder, parent_parts, depth = stack.pop()
                if depth > 8:
                    continue
                try:
                    folder_items = list(folder.Items())
                    columns = self._column_map(folder)
                except Exception:
                    continue
                for item in folder_items:
                    raw_name = str(getattr(item, "Name", "") or "")
                    if not raw_name:
                        continue
                    item_parts = parent_parts + (raw_name,)
                    if getattr(item, "IsFolder", False):
                        folder_name = raw_name.casefold()
                        if depth == 0 and not any(
                            token in folder_name for token in ("storage", "internal", "dcim")
                        ):
                            continue
                        try:
                            stack.append((item.GetFolder, item_parts, depth + 1))
                        except Exception:
                            continue
                        continue

                    # Do not accidentally enumerate music or app documents.
                    if not any(
                        part.casefold() == "dcim"
                        or "storage" in part.casefold()
                        or "internal" in part.casefold()
                        for part in parent_parts
                    ):
                        continue

                    type_str = self._mapped_detail(
                        folder, item, columns, {"type", "item type", "kind"}, 1
                    )
                    ext = Path(raw_name).suffix or self._ext_from_type(type_str)
                    if ext.lower() not in _AFC_MEDIA_EXTENSIONS:
                        continue
                    full_name = raw_name if Path(raw_name).suffix else f"{raw_name}{ext}"

                    size_str = self._mapped_detail(folder, item, columns, {"size"}, 2)
                    size_bytes = self._parse_size(size_str)

                    # New Apple Devices drivers already group Camera Roll items in
                    # YYYYMM_a folders.  Using that month avoids one slow COM call per
                    # item; exact EXIF/QuickTime time is recovered after local copy.
                    ts = None
                    for parent in reversed(parent_parts):
                        match = re.match(r"^(\d{4})(\d{2})_[a-z]$", parent, re.IGNORECASE)
                        if match:
                            try:
                                from datetime import datetime
                                ts = datetime(int(match.group(1)), int(match.group(2)), 1).timestamp()
                            except ValueError:
                                pass
                            break
                    if ts is None:
                        date_str = self._mapped_detail(
                            folder,
                            item,
                            columns,
                            {"date modified", "date created", "date taken", "modified"},
                            3,
                        )
                        ts = self._parse_date(date_str)
                    rel_id = "/".join(item_parts)
                    entries.append(
                        DeviceMediaEntry(
                            device_id=self._name,
                            unique_id=rel_id,
                            filename=full_name,
                            size_bytes=size_bytes,
                            source_path=Path(rel_id),
                            created_timestamp=ts,
                            modified_timestamp=ts,
                        )
                    )
            self.last_error = None
        except Exception as exc:
            self.last_error = str(exc)
        finally:
            pythoncom.CoUninitialize()
            _USB_LOCK.release()
        return entries

    def open_stream(self, entry: DeviceMediaEntry) -> BinaryIO:
        import tempfile
        temp_dir = Path(tempfile.mkdtemp())
        target = temp_dir / entry.filename
        self.copy_to(entry, target)
        return open(target, "rb")

    def copy_to(self, entry: DeviceMediaEntry, destination: Path) -> int:
        import time
        import pythoncom
        import win32com.client

        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)

        if not _USB_LOCK.acquire(timeout=_USB_LOCK_TIMEOUT):
            raise OSError("iPhone is busy with another operation; try again")
        pythoncom.CoInitialize()
        try:
            shell = win32com.client.Dispatch("Shell.Application")
            drives = shell.NameSpace(17)
            iphone_item = self._find_iphone_item(drives)
            if not iphone_item:
                raise OSError("Apple iPhone not connected or accessible via Windows WPD")
            target_item = self._resolve_item(iphone_item.GetFolder, entry.source_path)

            if not target_item:
                raise FileNotFoundError(f"Media item '{entry.filename}' not found on iPhone")

            dest_shell = shell.NameSpace(str(destination.parent))
            before_files = set(os.listdir(destination.parent))

            dest_shell.CopyHere(target_item, 16 | 1024)

            copied_file = None
            t0 = time.time()
            last_sz = -1
            stable_count = 0
            # Large ProRes/4K files can legitimately take several minutes.
            timeout_seconds = max(120.0, min(1800.0, (entry.size_bytes / (5 * 1024 * 1024)) * 4))
            while time.time() - t0 < timeout_seconds:
                curr_files = set(os.listdir(destination.parent)) - before_files
                if curr_files:
                    target_fn = list(curr_files)[0]
                    target_fp = destination.parent / target_fn
                    try:
                        sz = target_fp.stat().st_size
                        if sz > 0 and sz == last_sz:
                            stable_count += 1
                            if stable_count >= 2:
                                with open(target_fp, "rb") as _:
                                    pass
                                copied_file = target_fp
                                break
                        else:
                            stable_count = 0
                            last_sz = sz
                    except (OSError, PermissionError):
                        stable_count = 0
                time.sleep(0.05)

            if not copied_file or not copied_file.exists():
                raise TimeoutError(f"Timed out transferring '{entry.filename}' from iPhone")

            if copied_file.resolve() != destination.resolve():
                if destination.exists():
                    destination.unlink()
                copied_file.rename(destination)

            return destination.stat().st_size
        finally:
            pythoncom.CoUninitialize()
            _USB_LOCK.release()


def get_connected_iphone(timeout_seconds: float = 8.0) -> Optional[MediaDevice]:
    """Returns a real USB-connected iPhone provider, or None if none is attached."""
    # 1. Direct AFC is dramatically faster for large Camera Rolls.  On Windows
    # it uses the pairing/usbmux service installed by Apple Devices.
    try:
        devices = _list_usbmux_devices(timeout_seconds=timeout_seconds)
        if devices:
            device = UsbIPhoneDevice()
            if device.is_connected:
                return device
            device.close()
    except Exception:
        pass

    # 2. Windows Portable Devices fallback for machines where AFC pairing is
    # unavailable but the phone is visible in Explorer / Apple Devices.
    if os.name == "nt":
        try:
            wpd = WindowsWpdIPhoneDevice()
            if wpd.is_connected:
                return wpd
        except Exception:
            pass

    return None


# ponytail: Phase 1 probe — one bounded detection pass, deterministic states + actions
PROBE_TIMEOUT_SECONDS = 8.0

_PROBE_ACTIONS = {
    "READY": "Select months or items to import.",
    "EMPTY": "No Camera Roll media is visible. Unlock the phone and rescan.",
    "DISCONNECTED": "Connect the iPhone with a USB cable, then rescan.",
    "LOCKED": "Unlock the iPhone with its passcode, then rescan.",
    "UNTRUSTED": "On the iPhone tap Trust This Computer, open Apple Devices once, then rescan.",
    "UNAVAILABLE": "Reconnect the cable. If it persists, open Apple Devices once to repair pairing.",
}

_PROBE_MESSAGES = {
    "READY": "iPhone is reachable and ready.",
    "EMPTY": "The iPhone is connected, but no Camera Roll media is visible.",
    "DISCONNECTED": "No iPhone detected over USB.",
    "LOCKED": "The iPhone appears locked. Unlock it to allow access.",
    "UNTRUSTED": "The computer is not trusted by the iPhone yet.",
    "UNAVAILABLE": "Detection did not complete. The pairing service may be busy.",
}


def _list_usbmux_devices(timeout_seconds: float = 5.0):
    """Bounded usbmux listing so a stuck pairing service cannot freeze startup."""
    import concurrent.futures

    def _list():
        import asyncio

        try:
            from pymobiledevice3.usbmux import list_devices
        except ImportError:
            return []
        return asyncio.run(list_devices())

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_list)
        return future.result(timeout=timeout_seconds)


# ponytail: Jev escalation for unrecognized AFC errors — deterministic tokens first,
# judgment only on no-match. Never raises, never without TYPESAFE_API_KEY.
_AFC_JUDGE_THRESHOLD = 0.60
_AFC_JUDGE_TIMEOUT = 5.0


def _judge_afc_error(text: str, _ask=None) -> Optional[str]:
    """Classify an unrecognized AFC error via Jev. Returns LOCKED/UNTRUSTED or None (keep UNAVAILABLE)."""
    import os

    if not os.environ.get("TYPESAFE_API_KEY"):
        return None
    try:
        questions = {"cause": {
            "type": "choice",
            "instructions": "What kind of iPhone USB access failure does `error` describe? "
                "'locked' = the phone is locked and needs its passcode; "
                "'untrusted' = the computer is not trusted/paired with the phone; "
                "'other' = anything else.",
            "criteria": {
                "locked": None,
                "untrusted": None,
                "other": "None of the above; a different failure.",
            },
        }}
        if _ask is None:
            from typesafe_sdk import TypeSafeClient

            def _ask(state, questions):
                with TypeSafeClient(timeout=_AFC_JUDGE_TIMEOUT) as client:
                    resp = client.system_one(state=state, questions=questions)
                return {
                    qid: (resp.choices[qid].choice, resp.choices[qid].confidence)
                    for qid in questions
                }

        answers = _ask({"error": text}, questions)
        choice, confidence = answers["cause"]
        if confidence is None or confidence < _AFC_JUDGE_THRESHOLD:
            return None
        return {"locked": "LOCKED", "untrusted": "UNTRUSTED"}.get(choice)
    except Exception:
        return None


def _classify_afc_error(exc: Exception) -> str:
    text = f"{type(exc).__name__}: {exc}".lower()
    if any(token in text for token in ("locked", "passcode", "passcode-required", "device locked")):
        return "LOCKED"
    if any(token in text for token in ("trust", "pair", "untrusted", "unauthorized", "not paired", "pairing")):
        return "UNTRUSTED"
    return _judge_afc_error(text) or "UNAVAILABLE"


def probe_connected_iphone(timeout_seconds: float = PROBE_TIMEOUT_SECONDS) -> dict:
    """Fast, bounded detection pass. Never scans media, never raises, never logs filenames."""
    import concurrent.futures
    import logging

    log = logging.getLogger("memeasy.device")

    def _detect() -> dict:
        # AFC first — preserves the fast-path provider order.
        try:
            if _list_usbmux_devices(timeout_seconds=max(2.0, timeout_seconds - 3.0)):
                try:
                    device = UsbIPhoneDevice()
                    if device.is_connected:
                        name = device.name
                        provider = device.provider_name
                        device.close()
                        return {
                            "state": "READY",
                            "provider": provider,
                            "device_name": name,
                            "capabilities": {"supports_delete": False, "supports_scan": True},
                            "last_error": None,
                        }
                    device.close()
                except Exception as exc:  # noqa: BLE001 — classification input only
                    return {
                        "state": _classify_afc_error(exc),
                        "provider": "Direct USB (Apple Devices pairing service)",
                        "device_name": None,
                        "capabilities": {"supports_delete": False, "supports_scan": False},
                        "last_error": f"{type(exc).__name__}",
                    }
        except Exception as exc:  # noqa: BLE001
            err = str(exc)
            if "timeout" in err.lower() or "timed out" in err.lower():
                return {
                    "state": "UNAVAILABLE",
                    "provider": "Direct USB (Apple Devices pairing service)",
                    "device_name": None,
                    "capabilities": {"supports_delete": False, "supports_scan": False},
                    "last_error": "detection timeout",
                }
            # fall through to WPD before giving up

        if os.name == "nt":
            try:
                wpd = WindowsWpdIPhoneDevice()
                if wpd.is_connected:
                    return {
                        "state": "READY",
                        "provider": wpd.provider_name,
                        "device_name": wpd.name,
                        "capabilities": {"supports_delete": False, "supports_scan": True},
                        "last_error": getattr(wpd, "last_error", None),
                    }
            except Exception as exc:  # noqa: BLE001
                return {
                    "state": "UNAVAILABLE",
                    "provider": "Windows Portable Devices (Apple Devices driver)",
                    "device_name": None,
                    "capabilities": {"supports_delete": False, "supports_scan": False},
                    "last_error": f"{type(exc).__name__}",
                }
        return {
            "state": "DISCONNECTED",
            "provider": None,
            "device_name": None,
            "capabilities": {"supports_delete": False, "supports_scan": False},
            "last_error": None,
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        try:
            result = pool.submit(_detect).result(timeout=timeout_seconds)
        except Exception:
            result = {
                "state": "UNAVAILABLE",
                "provider": None,
                "device_name": None,
                "capabilities": {"supports_delete": False, "supports_scan": False},
                "last_error": "detection timeout",
            }
    result["message"] = _PROBE_MESSAGES.get(result["state"], "")
    result["action"] = _PROBE_ACTIONS.get(result["state"], "")
    # ponytail: counts and states only — never filenames, serials, or paths
    log.info("iphone probe state=%s provider=%s", result["state"], result["provider"])
    return result
