from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context


router = APIRouter(tags=["Library"])


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

