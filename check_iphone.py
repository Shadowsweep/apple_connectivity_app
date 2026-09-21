"""Quick iPhone USB check: probe state + Camera Roll count. Run: uv run python check_iphone.py"""
from app.device.iphone import get_connected_iphone, probe_connected_iphone


def main() -> None:
    probe = probe_connected_iphone()
    print(f"state={probe['state']} provider={probe['provider']} device={probe['device_name']}")
    print(f"message={probe['message']}")
    print(f"action={probe['action']}")
    if probe["state"] != "READY":
        print(f"last_error={probe.get('last_error')}")
        return

    device = get_connected_iphone()
    if device is None:
        print("scan=FAIL reason=no device from get_connected_iphone")
        return
    try:
        items = device.discover_media()
        total_bytes = sum(i.size_bytes for i in items)
        # ponytail: counts only, no filenames/serials in output
        print(f"scan=OK provider={getattr(device, 'provider_name', type(device).__name__)} items={len(items)} bytes={total_bytes}")
    finally:
        try:
            device.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
