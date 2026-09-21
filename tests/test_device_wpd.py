from pathlib import Path
from fastapi.testclient import TestClient

from app.api.main import create_app
from app.device import iphone as iphone_mod
from app.device.iphone import WindowsWpdIPhoneDevice


def test_wpd_parse_size():
    assert WindowsWpdIPhoneDevice._parse_size("2.53 MB") == int(2.53 * 1024 * 1024)
    assert WindowsWpdIPhoneDevice._parse_size("834 bytes") == 834
    assert WindowsWpdIPhoneDevice._parse_size("500 KB") == 500 * 1024
    assert WindowsWpdIPhoneDevice._parse_size("1.2 GB") == int(1.2 * 1024 * 1024 * 1024)
    assert WindowsWpdIPhoneDevice._parse_size("") == 0
    assert WindowsWpdIPhoneDevice._parse_size(None) == 0


def test_wpd_ext_from_type():
    assert WindowsWpdIPhoneDevice._ext_from_type("HEIC File") == ".HEIC"
    assert WindowsWpdIPhoneDevice._ext_from_type("JPEG Image") == ".JPG"
    assert WindowsWpdIPhoneDevice._ext_from_type("PNG Image") == ".PNG"
    assert WindowsWpdIPhoneDevice._ext_from_type("QuickTime Movie") == ".MOV"
    assert WindowsWpdIPhoneDevice._ext_from_type("MP4 Video") == ".MP4"
    assert WindowsWpdIPhoneDevice._ext_from_type("AAE File") == ".AAE"
    assert WindowsWpdIPhoneDevice._ext_from_type("") == ""


def test_wpd_parse_date():
    ts = WindowsWpdIPhoneDevice._parse_date("30-09-2025 20:53")
    assert ts is not None and ts > 0

    ts2 = WindowsWpdIPhoneDevice._parse_date("2025-09-30 20:53")
    assert ts2 is not None and ts2 > 0

    assert WindowsWpdIPhoneDevice._parse_date("") is None
    assert WindowsWpdIPhoneDevice._parse_date("invalid date") is None


def test_wpd_resolves_full_nested_dcim_path():
    class FakeItems(list):
        def __call__(self):
            return self

    class FakeFolder:
        def __init__(self, children=None):
            self._children = FakeItems(children or [])

        def Items(self):
            return self._children

    class FakeItem:
        def __init__(self, name, folder=None):
            self.Name = name
            self.IsFolder = folder is not None
            self.GetFolder = folder

    photo = FakeItem("IMG_1001.JPG")
    roll = FakeItem("100APPLE", FakeFolder([photo]))
    dcim = FakeItem("DCIM", FakeFolder([roll]))
    storage = FakeItem("Internal Storage", FakeFolder([dcim]))
    root = FakeFolder([storage])

    resolved = WindowsWpdIPhoneDevice._resolve_item(
        root, Path("Internal Storage/DCIM/100APPLE/IMG_1001.JPG")
    )
    assert resolved is photo


def test_probe_classifies_afc_errors(monkeypatch):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    assert iphone_mod._classify_afc_error(Exception("device locked, passcode required")) == "LOCKED"
    assert iphone_mod._classify_afc_error(Exception("not trusted, pairing required")) == "UNTRUSTED"
    assert iphone_mod._classify_afc_error(Exception("weird boom")) == "UNAVAILABLE"


def test_judge_afc_error_fallback(monkeypatch):
    monkeypatch.setenv("TYPESAFE_API_KEY", "test-key")
    ask = lambda state, questions: {"cause": ("locked", 0.9)}  # noqa: E731
    assert iphone_mod._judge_afc_error("Gerät gesperrt", _ask=ask) == "LOCKED"
    low = lambda state, questions: {"cause": ("locked", 0.4)}  # noqa: E731
    assert iphone_mod._judge_afc_error("Gerät gesperrt", _ask=low) is None
    boom = lambda state, questions: (_ for _ in ()).throw(RuntimeError("net"))  # noqa: E731
    assert iphone_mod._judge_afc_error("weird boom", _ask=boom) is None
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    assert iphone_mod._judge_afc_error("weird boom", _ask=ask) is None


def test_probe_disconnected_when_no_usbmux(monkeypatch):
    monkeypatch.setattr(iphone_mod, "_list_usbmux_devices", lambda timeout_seconds=5.0: [])
    monkeypatch.setattr(WindowsWpdIPhoneDevice, "is_connected", property(lambda self: False))
    probe = iphone_mod.probe_connected_iphone(timeout_seconds=3.0)
    assert probe["state"] == "DISCONNECTED"
    assert probe["action"]  # every state has an actionable next step
    assert probe["message"]


def test_device_status_endpoint_no_scan(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(iphone_mod, "_list_usbmux_devices", lambda timeout_seconds=5.0: [])
    monkeypatch.setattr(WindowsWpdIPhoneDevice, "is_connected", property(lambda self: False))
    client = TestClient(create_app(tmp_path / "lib"))
    resp = client.get("/api/import/device-status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["state"] == "DISCONNECTED"
    assert body["action"]
