# PyInstaller Build Script for MEMEASY Backend
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
DIST_DIR = ROOT_DIR / 'dist'
BUILD_DIR = ROOT_DIR / 'build'
TAURI_BIN_DIR = ROOT_DIR / 'src-tauri' / 'binaries'

def build_backend():
    print('========================================')
    print('   Building Standalone Python Backend   ')
    print('========================================')

    TAURI_BIN_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        '-m',
        'PyInstaller',
        '--noconfirm',
        '--onefile',
        '--name', 'memeasy-backend',
        '--hidden-import', 'uvicorn',
        '--hidden-import', 'uvicorn.logging',
        '--hidden-import', 'uvicorn.loops.auto',
        '--hidden-import', 'uvicorn.protocols.http.auto',
        '--hidden-import', 'uvicorn.protocols.websockets.auto',
        '--hidden-import', 'uvicorn.lifespan.on',
        '--hidden-import', 'fastapi',
        '--hidden-import', 'fastapi.middleware.cors',
        '--hidden-import', 'PIL',
        '--hidden-import', 'PIL.Image',
        '--hidden-import', 'PIL.ExifTags',
        '--hidden-import', 'sqlite3',
        '--hidden-import', 'pydantic',
        '--hidden-import', 'app',
        '--hidden-import', 'app.api',
        '--hidden-import', 'app.api.main',
        '--hidden-import', 'app.api.dependencies',
        '--hidden-import', 'app.api.streaming',
        '--hidden-import', 'app.api.thumbnails',
        '--hidden-import', 'app.api.jobs_manager',
        '--hidden-import', 'app.api.routes',
        '--hidden-import', 'app.api.routes.health',
        '--hidden-import', 'app.api.routes.libraries',
        '--hidden-import', 'app.api.routes.media',
        '--hidden-import', 'app.api.routes.imports',
        '--hidden-import', 'app.api.routes.jobs',
        '--hidden-import', 'app.api.routes.albums',
        '--hidden-import', 'app.api.routes.favorites',
        '--hidden-import', 'app.api.routes.playback',
        '--collect-all', 'app',
        str(ROOT_DIR / 'main.py')
    ]

    print('Running:', ' '.join(cmd))
    res = subprocess.run(cmd, cwd=str(ROOT_DIR))
    if res.returncode != 0:
        print('[ERROR] PyInstaller failed with code', res.returncode)
        sys.exit(res.returncode)

    built_exe = DIST_DIR / 'memeasy-backend.exe'
    target_sidecar_name = 'memeasy-backend-x86_64-pc-windows-msvc.exe'
    target_path = TAURI_BIN_DIR / target_sidecar_name

    if built_exe.exists():
        shutil.copy2(str(built_exe), str(target_path))
        print(f'[OK] Backend bundled successfully: {target_path}')
    else:
        print('[WARN] Could not find output exe at', built_exe)

if __name__ == '__main__':
    build_backend()
