# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('D:/memeasy/app/database/migrations', 'app/database/migrations')]
binaries = []
hiddenimports = ['uvicorn', 'uvicorn.logging', 'uvicorn.loops.auto', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan.on', 'fastapi', 'fastapi.middleware.cors', 'PIL', 'PIL.Image', 'PIL.ExifTags', 'sqlite3', 'pydantic', 'app', 'app.api', 'app.api.main', 'app.api.dependencies', 'app.api.streaming', 'app.api.thumbnails', 'app.core', 'app.core.errors', 'app.core.logging', 'app.core.security', 'app.jobs', 'app.jobs.locks', 'app.cleaner', 'app.cleaner.engine', 'app.api.routes.health', 'app.api.routes.diagnostics', 'app.api.routes.libraries', 'app.api.routes.media', 'app.api.routes.clean', 'app.api.routes.searches', 'app.api.routes.analytics', 'app.api.routes.timeline', 'app.api.routes.duplicates', 'app.api.routes.imports', 'app.api.routes.jobs', 'app.api.routes.albums', 'app.api.routes.favorites', 'app.api.routes.playback']
tmp_ret = collect_all('app')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['D:/memeasy/main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='memeasy-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
