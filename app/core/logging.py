import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import re
from typing import Optional

_LOGGER: Optional[logging.Logger] = None


class SensitiveDataFilter(logging.Filter):
    """Redacts sensitive tokens, keys, passwords, and private auth patterns from logs."""

    PATTERNS = [
        (re.compile(r"(password|token|secret|key|authorization)=['\"]?[^'\"\s]+['\"]?", re.IGNORECASE), r"\1=[REDACTED]"),
        (re.compile(r"bearer\s+[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE), "Bearer [REDACTED]"),
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern, replacement in self.PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        return True


def setup_logging(log_dir: Optional[Path] = None, log_level: int = logging.INFO) -> logging.Logger:
    global _LOGGER
    if _LOGGER is not None:
        return _LOGGER

    logger = logging.getLogger("memeasy")
    logger.setLevel(log_level)
    logger.propagate = False

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(filename)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(SensitiveDataFilter())
    logger.addHandler(console_handler)

    # Rotating File Handler
    if log_dir is not None:
        log_dir = Path(log_dir).resolve()
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "memeasy.log"

        file_handler = RotatingFileHandler(
            filename=str(log_file),
            maxBytes=10 * 1024 * 1024,  # 10 MB per file
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        file_handler.addFilter(SensitiveDataFilter())
        logger.addHandler(file_handler)

    _LOGGER = logger
    return logger


def get_logger() -> logging.Logger:
    global _LOGGER
    if _LOGGER is None:
        return setup_logging()
    return _LOGGER
