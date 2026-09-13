from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import AppContext, get_app_context
from app.database.models import MediaRecord


router = APIRouter(tags=["Favorites"])


@router.get("/favorites", response_model=List[MediaRecord])
def list_favorites(ctx: AppContext = Depends(get_app_context)):
    return ctx.fav_repo.get_favorites()


@router.post("/media/{media_id}/favorite", status_code=status.HTTP_200_OK)
def add_favorite(media_id: str, ctx: AppContext = Depends(get_app_context)):
    media = ctx.media_repo.get_by_id(media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Media item '{media_id}' not found",
        )
    ctx.fav_repo.add_favorite(media_id)
    return {"status": "favorited", "media_id": media_id}


@router.delete("/media/{media_id}/favorite", status_code=status.HTTP_200_OK)
def remove_favorite(media_id: str, ctx: AppContext = Depends(get_app_context)):
    ctx.fav_repo.remove_favorite(media_id)
    return {"status": "unfavorited", "media_id": media_id}
