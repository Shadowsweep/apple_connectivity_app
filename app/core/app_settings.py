import json
from pathlib import Path

SETTINGS_PATH = Path.home() / "MEMEASY" / "settings.json"


def load_settings() -> dict:
    try:
        return json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_settings(update: dict) -> None:
    data = load_settings()
    data.update(update)
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_accent() -> dict | None:
    data = load_settings()
    if data.get("accent_color"):
        return {"accent": data["accent_color"], "hover": data.get("accent_hover", data["accent_color"])}
    return None
