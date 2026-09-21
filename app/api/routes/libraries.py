import os
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context, init_app_context
from app.core.app_settings import save_settings, get_accent
from app.core.security import validate_safe_path

router = APIRouter(tags=["Library"])


class AccentRequest(BaseModel):
    accent: str
    hover: str


@router.get("/ui/accent")
def get_ui_accent():
    return get_accent() or {}


@router.put("/ui/accent")
def set_ui_accent(body: AccentRequest):
    save_settings({"accent_color": body.accent, "accent_hover": body.hover})
    return {"accent": body.accent, "hover": body.hover}


class LibraryInfoResponse(BaseModel):
    id: str
    name: str
    root_path: str
    total_bytes: int
    free_bytes: int
    usable_bytes: int
    safety_reserve_bytes: int
    formatted_total: str
    formatted_free: str
    formatted_usable: str
    total_media_count: int


class JobCreatedResponse(BaseModel):
    job_id: str
    status: str
    job_type: str


class UnindexedItem(BaseModel):
    relative_path: str
    filename: str
    size_bytes: int


class LibraryHealthResponse(BaseModel):
    total_active: int
    missing_count: int
    missing_items: list
    unindexed_count: int
    unindexed_items: list
    is_healthy: bool


@router.get("/library", response_model=LibraryInfoResponse)
def get_library_info(ctx: AppContext = Depends(get_app_context)):
    lib = ctx.library_repo.get_or_create(str(ctx.storage_manager.library_root))
    stats = ctx.storage_manager.get_storage_stats()
    media_count = ctx.media_repo.count_all(status="ACTIVE")

    return LibraryInfoResponse(
        id=lib.id,
        name=lib.name,
        root_path=lib.root_path,
        total_bytes=stats.total_bytes,
        free_bytes=stats.free_bytes,
        usable_bytes=stats.usable_bytes,
        safety_reserve_bytes=stats.safety_reserve_bytes,
        formatted_total=stats.formatted_total,
        formatted_free=stats.formatted_free,
        formatted_usable=stats.formatted_usable,
        total_media_count=media_count,
    )


class SetLibraryPathRequest(BaseModel):
    path: str


@router.post("/library/path", response_model=LibraryInfoResponse)
def set_library_path(body: SetLibraryPathRequest):
    """Switch the active vault root at runtime and persist it for future launches."""
    new_root = Path(body.path).resolve()
    if not new_root.exists() or not new_root.is_dir():
        raise HTTPException(status_code=400, detail="Path does not exist or is not a directory")

    probe = new_root / ".memeasy_write_probe"
    try:
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except OSError as e:
        raise HTTPException(status_code=400, detail=f"Path is not writable: {e}")

    save_settings({"default_library_path": str(new_root)})

    old_ctx = get_app_context()
    try:
        cached = old_ctx.active_scan_results.pop("iphone_device", None)
        if cached is not None:
            try:
                cached.close()
            except Exception:
                pass
        old_ctx.active_scan_results.pop("iphone_items", None)
        old_ctx.active_scan_results.pop("device_summary", None)
        for key in ("scan_id", "scan_generation", "scan_device_id", "scan_job_id", "scan_state", "scan_partial", "scan_started_at", "scan_completed_at", "scan_elapsed"):
            old_ctx.active_scan_results.pop(key, None)
        old_ctx.job_manager.shutdown()
        old_ctx.db.close()
    except Exception:
        pass

    ctx = init_app_context(new_root)
    lib = ctx.library_repo.get_or_create(str(ctx.storage_manager.library_root))
    stats = ctx.storage_manager.get_storage_stats()
    media_count = ctx.media_repo.count_all(status="ACTIVE")
    return LibraryInfoResponse(
        id=lib.id,
        name=lib.name,
        root_path=lib.root_path,
        total_bytes=stats.total_bytes,
        free_bytes=stats.free_bytes,
        usable_bytes=stats.usable_bytes,
        safety_reserve_bytes=stats.safety_reserve_bytes,
        formatted_total=stats.formatted_total,
        formatted_free=stats.formatted_free,
        formatted_usable=stats.formatted_usable,
        total_media_count=media_count,
    )


@router.get("/library/health", response_model=LibraryHealthResponse)
def get_library_health(ctx: AppContext = Depends(get_app_context)):
    health_data = ctx.media_repo.scan_library_health(ctx.storage_manager.library_root)
    return LibraryHealthResponse(**health_data)


@router.post("/library/health/scan")
def trigger_health_scan(ctx: AppContext = Depends(get_app_context)):
    def health_task(progress_callback):
        ctx.media_repo.scan_library_health(ctx.storage_manager.library_root)
        progress_callback(1, 1)

    job = ctx.job_manager.submit_job(
        job_type="HEALTH_SCAN",
        task_fn=health_task,
    )
    return {"job_id": job.id, "status": job.status}


@router.post("/library/index-unindexed")
def trigger_index_unindexed(ctx: AppContext = Depends(get_app_context)):
    """Indexes unindexed files discovered in library directly without copying."""
    def index_task(progress_callback):
        ctx.indexer.index_library()
        progress_callback(1, 1)

    job = ctx.job_manager.submit_job(
        job_type="INDEX_UNINDEXED",
        task_fn=index_task,
    )
    return {"job_id": job.id, "status": job.status}


@router.post("/library/index", response_model=JobCreatedResponse)
def trigger_library_index(ctx: AppContext = Depends(get_app_context)):
    def index_task(progress_cb):
        def cb(idx, msg):
            progress_cb(idx, 100)
        ctx.indexer.index_library(progress_callback=cb)

    job = ctx.job_manager.submit_job("LIBRARY_INDEX", index_task)
    return JobCreatedResponse(job_id=job.id, status=job.status, job_type=job.job_type)


@router.post("/library/rebuild-index", response_model=JobCreatedResponse)
def trigger_rebuild_index(ctx: AppContext = Depends(get_app_context)):
    def rebuild_task(progress_cb):
        def cb(idx, msg):
            progress_cb(idx, 100)
        ctx.indexer.rebuild_index(progress_callback=cb)

    job = ctx.job_manager.submit_job("REBUILD_INDEX", rebuild_task)
    return JobCreatedResponse(job_id=job.id, status=job.status, job_type=job.job_type)


class VaultFolder(BaseModel):
    name: str
    relative_path: str


class VaultFolderListResponse(BaseModel):
    vault_root: str
    folders: list[VaultFolder]


class CreateVaultFolderRequest(BaseModel):
    parent: str = ""
    name: str


class MoveMediaToVaultFolderRequest(BaseModel):
    media_ids: list[str]
    target_folder: str = ""
    copy_media: bool = False


class MoveMediaToVaultFolderResponse(BaseModel):
    moved_count: int
    moved_ids: list[str]
    target_folder: str


@router.get("/vault/folders", response_model=VaultFolderListResponse)
def list_vault_folders(ctx: AppContext = Depends(get_app_context)):
    """Lists existing folders inside the active vault/library root."""
    root = ctx.storage_manager.library_root
    folders: list[VaultFolder] = [VaultFolder(name="Root (Vault)", relative_path="")]
    if root.exists() and root.is_dir():
        for dirpath, dirnames, _ in os.walk(root):
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
            rel = Path(dirpath).relative_to(root)
            if str(rel) != ".":
                rel_str = str(rel).replace("\\", "/")
                folders.append(VaultFolder(name=Path(dirpath).name, relative_path=rel_str))

    folders.sort(key=lambda f: f.relative_path.lower())
    return VaultFolderListResponse(vault_root=str(root), folders=folders)


@router.post("/vault/folders", response_model=VaultFolder)
def create_vault_folder(
    body: CreateVaultFolderRequest,
    ctx: AppContext = Depends(get_app_context),
):
    """Creates a new folder inside the active vault root."""
    name = body.name.strip()
    if not name or any(c in name for c in '\\/:*?"<>|'):
        raise HTTPException(status_code=400, detail="Invalid folder name")

    root = ctx.storage_manager.library_root
    parent_rel = body.parent.strip().lstrip("/\\")
    parent_dir = root / parent_rel if parent_rel else root

    try:
        safe_parent = validate_safe_path(parent_dir, allowed_roots=[root])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    target_dir = safe_parent / name
    try:
        safe_target = validate_safe_path(target_dir, allowed_roots=[root])
        safe_target.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    rel_str = str(safe_target.relative_to(root)).replace("\\", "/")
    return VaultFolder(name=name, relative_path=rel_str)


@router.post("/vault/move-media", response_model=MoveMediaToVaultFolderResponse)
def move_media_to_vault_folder(
    body: MoveMediaToVaultFolderRequest,
    ctx: AppContext = Depends(get_app_context),
):
    """Moves or copies selected media items into a chosen folder inside the active vault."""
    root = ctx.storage_manager.library_root
    target_rel = body.target_folder.strip().lstrip("/\\")
    target_dir = root / target_rel if target_rel else root

    try:
        safe_target_dir = validate_safe_path(target_dir, allowed_roots=[root])
        safe_target_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    moved_ids: list[str] = []
    for media_id in body.media_ids:
        record = ctx.media_repo.get_by_id(media_id)
        if not record:
            continue
        old_path = root / record.relative_path
        if not old_path.exists():
            continue

        filename = record.filename or old_path.name
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        dest_path = safe_target_dir / filename

        disambig = 1
        while dest_path.exists() and dest_path.resolve() != old_path.resolve():
            dest_path = safe_target_dir / f"{stem}_{disambig}{suffix}"
            disambig += 1

        if dest_path.resolve() != old_path.resolve():
            if body.copy_media:
                shutil.copy2(old_path, dest_path)
            else:
                shutil.move(old_path, dest_path)

        new_rel = str(dest_path.relative_to(root)).replace("\\", "/")
        record.relative_path = new_rel
        record.filename = dest_path.name
        record.updated_at = datetime.now()
        ctx.media_repo.insert_or_update(record)
        moved_ids.append(media_id)

    return MoveMediaToVaultFolderResponse(
        moved_count=len(moved_ids),
        moved_ids=moved_ids,
        target_folder=target_rel,
    )

