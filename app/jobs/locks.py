import threading
from typing import Dict, Optional
from contextlib import contextmanager
from app.core.errors import ConcurrencyLockError


class OperationLockManager:
    """
    Manages process-wide mutex locks to prevent colliding operations
    such as simultaneous imports, library rebuilds, or mobile cleanups.
    """

    EXCLUSIVE_GROUPS = {
        "IMPORT": ["IMPORT", "REBUILD_INDEX", "CLEAN_MOBILE"],
        "REBUILD_INDEX": ["IMPORT", "REBUILD_INDEX", "CLEAN_MOBILE", "INDEX_LIBRARY"],
        "CLEAN_MOBILE": ["IMPORT", "REBUILD_INDEX", "CLEAN_MOBILE"],
        "RESTORE_DB": ["IMPORT", "REBUILD_INDEX", "CLEAN_MOBILE", "INDEX_LIBRARY"],
    }

    def __init__(self):
        self._master_lock = threading.Lock()
        self._active_operations: Dict[str, str] = {}  # op_id -> op_type

    def acquire_lock(self, op_id: str, op_type: str) -> bool:
        """Attempts to acquire lock for operation. Raises ConcurrencyLockError if blocked."""
        with self._master_lock:
            conflicts = self.EXCLUSIVE_GROUPS.get(op_type.upper(), [op_type.upper()])
            for active_id, active_type in self._active_operations.items():
                if active_type.upper() in conflicts:
                    raise ConcurrencyLockError(
                        f"Cannot start '{op_type}' while '{active_type}' (id: {active_id}) is actively running."
                    )
            self._active_operations[op_id] = op_type
            return True

    def release_lock(self, op_id: str):
        """Releases the operation lock."""
        with self._master_lock:
            self._active_operations.pop(op_id, None)

    @contextmanager
    def guard(self, op_id: str, op_type: str):
        """Context manager for scoped lock acquisition and guaranteed release."""
        self.acquire_lock(op_id, op_type)
        try:
            yield
        finally:
            self.release_lock(op_id)

    def is_locked(self, op_type: Optional[str] = None) -> bool:
        with self._master_lock:
            if not op_type:
                return len(self._active_operations) > 0
            conflicts = self.EXCLUSIVE_GROUPS.get(op_type.upper(), [op_type.upper()])
            return any(t.upper() in conflicts for t in self._active_operations.values())

    def get_active_operations(self) -> Dict[str, str]:
        with self._master_lock:
            return dict(self._active_operations)
