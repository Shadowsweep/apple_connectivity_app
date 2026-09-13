from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context


router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    library_path: str
    database_ok: bool


@router.get("/health", response_model=HealthResponse)
def get_health(ctx: AppContext = Depends(get_app_context)):
    db_ok = False
    try:
        conn = ctx.db.get_connection()
        conn.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    return HealthResponse(
        status="ok",
        app="MEMEASY",
        version="0.1.0",
        library_path=str(ctx.storage_manager.library_root),
        database_ok=db_ok,
    )
