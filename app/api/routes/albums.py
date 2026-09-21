from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context
from app.database.models import AlbumRecord, MediaRecord


router = APIRouter(prefix="/albums", tags=["Albums"])


class CreateAlbumRequest(BaseModel):
    name: str
    description: Optional[str] = None


class AddMediaToAlbumRequest(BaseModel):
    media_id: Optional[str] = None
    media_ids: Optional[List[str]] = None


class AlbumDetailResponse(BaseModel):
    album: AlbumRecord
    items: List[MediaRecord]


@router.get("", response_model=List[AlbumRecord])
def list_albums(ctx: AppContext = Depends(get_app_context)):
    return ctx.album_repo.list_albums()


@router.post("", response_model=AlbumRecord, status_code=status.HTTP_201_CREATED)
def create_album(
    req: CreateAlbumRequest, ctx: AppContext = Depends(get_app_context)
):
    lib = ctx.library_repo.get_or_create(str(ctx.storage_manager.library_root))
    return ctx.album_repo.create_album(
        library_id=lib.id, name=req.name, description=req.description
    )


@router.get("/{album_id}", response_model=AlbumDetailResponse)
def get_album(album_id: str, ctx: AppContext = Depends(get_app_context)):
    album = ctx.album_repo.get_album_by_id(album_id)
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Album '{album_id}' not found",
        )
    items = ctx.album_repo.get_album_media(album_id)
    return AlbumDetailResponse(album=album, items=items)


@router.post("/{album_id}/media", status_code=status.HTTP_200_OK)
def add_media_to_album(
    album_id: str,
    req: AddMediaToAlbumRequest,
    ctx: AppContext = Depends(get_app_context),
):
    album = ctx.album_repo.get_album_by_id(album_id)
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )
    # Accept a single media_id or a batch of media_ids
    media_ids = req.media_ids or ([req.media_id] if req.media_id else [])
    if not media_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="media_id or media_ids required",
        )
    added = []
    for media_id in media_ids:
        media = ctx.media_repo.get_by_id(media_id)
        if not media:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media item not found",
            )
        ctx.album_repo.add_media_to_album(album_id, media_id)
        added.append(media_id)
    return {"status": "success", "album_id": album_id, "media_ids": added}


@router.delete("/{album_id}/media/{media_id}", status_code=status.HTTP_200_OK)
def remove_media_from_album(
    album_id: str, media_id: str, ctx: AppContext = Depends(get_app_context)
):
    ctx.album_repo.remove_media_from_album(album_id, media_id)
    return {"status": "success"}


@router.delete("/{album_id}", status_code=status.HTTP_200_OK)
def delete_album(album_id: str, ctx: AppContext = Depends(get_app_context)):
    album = ctx.album_repo.get_album_by_id(album_id)
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )
    ctx.album_repo.delete_album(album_id)
    return {"status": "success", "deleted_album_id": album_id}
