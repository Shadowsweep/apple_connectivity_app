from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dependencies import get_app_context, init_app_context
from app.api.routes import (
    albums,
    analytics,
    clean,
    diagnostics,
    duplicates,
    favorites,
    health,
    imports,
    jobs,
    libraries,
    media,
    playback,
    searches,
    timeline,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Already handled in init_app_context
    yield
    # Graceful Shutdown
    try:
        ctx = get_app_context()
        if ctx:
            ctx.job_manager.shutdown()
            ctx.db.close()
    except Exception:
        pass


def create_app(
    library_root: Optional[Path] = None,
    safety_reserve_bytes: Optional[int] = None,
) -> FastAPI:
    """Creates and configures the MEMEASY FastAPI application instance."""
    init_app_context(library_root, safety_reserve_bytes=safety_reserve_bytes)

    app = FastAPI(
        title="MEMEASY Media Platform API",
        description="Localhost-first media engine and index service for MEMEASY",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS configuration for local React / Tauri desktop clients
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "tauri://localhost",
            "https://tauri.localhost",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers under /api namespace
    app.include_router(health.router, prefix="/api")
    app.include_router(diagnostics.router, prefix="/api")
    app.include_router(libraries.router, prefix="/api")
    app.include_router(media.router, prefix="/api")
    app.include_router(clean.router, prefix="/api")
    app.include_router(searches.router, prefix="/api")
    app.include_router(analytics.router, prefix="/api")
    app.include_router(timeline.router, prefix="/api")
    app.include_router(duplicates.router, prefix="/api")
    app.include_router(imports.router, prefix="/api")
    app.include_router(jobs.router, prefix="/api")
    app.include_router(albums.router, prefix="/api")
    app.include_router(favorites.router, prefix="/api")
    app.include_router(playback.router, prefix="/api")

    return app


app = create_app()
