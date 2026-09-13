"""
MEMEASY Phase 11 — Master Release Script
Orchestrates:
1. Backend test suite verification
2. Frontend Vite build
3. PyInstaller standalone sidecar compilation
4. Sidecar binary verification & smoke test
"""

import os
import subprocess
import sys
from pathlib import Path


def run_cmd(cmd: list[str], cwd: Path | None = None, desc: str = "") -> None:
    print(f"\n==========================================")
    print(f"--> {desc or ' '.join(cmd)}")
    print(f"==========================================")
    res = subprocess.run(cmd, cwd=cwd)
    if res.returncode != 0:
        print(f"FAILED: {desc}", file=sys.stderr)
        sys.exit(res.returncode)


def main():
    root = Path(__file__).resolve().parent
    frontend_dir = root / "frontend"
    tauri_binaries = root / "src-tauri" / "binaries"
    backend_exe = tauri_binaries / "memeasy-backend-x86_64-pc-windows-msvc.exe"

    print("==========================================")
    print("   MEMEASY v1.0.0 Windows Release Builder ")
    print("==========================================")

    # 1. Run tests
    run_cmd(["uv", "run", "pytest", "-v"], cwd=root, desc="Running backend pytest test suite")

    # 2. Build frontend
    run_cmd(["npm.cmd", "run", "build"], cwd=frontend_dir, desc="Building React frontend (Vite)")

    # 3. Build backend sidecar
    run_cmd(["uv", "run", "python", "build_backend.py"], cwd=root, desc="Compiling PyInstaller backend sidecar")

    # 4. Verify binary exists
    if not backend_exe.exists():
        print(f"ERROR: Expected binary not found at {backend_exe}", file=sys.stderr)
        sys.exit(1)

    size_mb = backend_exe.stat().st_size / (1024 * 1024)
    print(f"\n[OK] Backend sidecar compiled successfully: {backend_exe} ({size_mb:.2f} MB)")

    # 5. Smoke test binary
    print("\n--> Running sidecar smoke test (--help)")
    smoke = subprocess.run([str(backend_exe), "--help"], capture_output=True, text=True)
    if smoke.returncode != 0:
        print(f"Smoke test failed with return code {smoke.returncode}", file=sys.stderr)
        print(smoke.stderr, file=sys.stderr)
        sys.exit(smoke.returncode)
    print(smoke.stdout[:300] + "...")
    print("\n[OK] Release artifacts prepared and verified.")


if __name__ == "__main__":
    main()
