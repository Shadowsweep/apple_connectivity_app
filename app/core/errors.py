from typing import Optional


class AppError(Exception):
    """Base application exception with error category and actionable guidance."""

    def __init__(
        self,
        message: str,
        category: str = "INTERNAL_ERROR",
        action: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.category = category
        self.action = action or "Please check application logs and try again."

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "message": self.message,
            "action": self.action,
        }


class StorageError(AppError):
    def __init__(self, message: str, action: Optional[str] = None):
        super().__init__(
            message=message,
            category="STORAGE_ERROR",
            action=action or "Ensure destination drive is connected and has sufficient free space.",
        )


class DeviceError(AppError):
    def __init__(self, message: str, action: Optional[str] = None):
        super().__init__(
            message=message,
            category="DEVICE_ERROR",
            action=action or "Ensure mobile device is unlocked, connected via USB, and trusted.",
        )


class PermissionError(AppError):
    def __init__(self, message: str, action: Optional[str] = None):
        super().__init__(
            message=message,
            category="PERMISSION_ERROR",
            action=action or "Check file permissions or run MEMEASY with required disk privileges.",
        )


class DatabaseError(AppError):
    def __init__(self, message: str, action: Optional[str] = None):
        super().__init__(
            message=message,
            category="DATABASE_ERROR",
            action=action or "Run database integrity check or rebuild library index from filesystem.",
        )


class SecurityError(AppError):
    def __init__(self, message: str, action: Optional[str] = None):
        super().__init__(
            message=message,
            category="SECURITY_ERROR",
            action=action or "Access denied: Request target is outside the configured library boundary.",
        )


class ConcurrencyLockError(AppError):
    def __init__(self, message: str, action: Optional[str] = None):
        super().__init__(
            message=message,
            category="CONCURRENCY_ERROR",
            action=action or "Another conflicting operation is currently in progress. Please wait for it to complete.",
        )
