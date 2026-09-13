from pathlib import Path
from typing import List, Union
from app.core.errors import SecurityError


def validate_safe_path(
    target_path: Union[str, Path],
    allowed_roots: List[Union[str, Path]],
    must_exist: bool = False,
) -> Path:
    """
    Validates that target_path resolves strictly within one of the allowed_roots.
    Prevents directory traversal attacks (e.g. `../../Windows/System32`).
    """
    try:
        resolved_target = Path(target_path).resolve()
    except Exception as e:
        raise SecurityError(f"Invalid path representation: {str(e)}")

    is_contained = False
    for root in allowed_roots:
        try:
            resolved_root = Path(root).resolve()
            resolved_target.relative_to(resolved_root)
            is_contained = True
            break
        except (ValueError, TypeError):
            continue

    if not is_contained:
        raise SecurityError(
            f"Path traversal detected: Target '{target_path}' is outside allowed root directories."
        )

    if must_exist and not resolved_target.exists():
        raise FileNotFoundError(f"Requested file does not exist: {target_path}")

    return resolved_target
