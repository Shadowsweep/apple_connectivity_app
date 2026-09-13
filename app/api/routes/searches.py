import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.dependencies import AppContext, get_app_context
from app.database.models import MediaRecord, SavedSearchRecord

router = APIRouter(tags=["Saved Searches"])


class CreateSearchRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    query: Dict[str, Any] = Field(..., description="Structured filter query JSON dictionary")


class UpdateSearchRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    query: Optional[Dict[str, Any]] = None


class SavedSearchResponse(BaseModel):
    id: str
    name: str
    query: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SearchResultsResponse(BaseModel):
    search: SavedSearchResponse
    items: List[MediaRecord]
    count: int
    total: int


def _to_response(rec: SavedSearchRecord) -> SavedSearchResponse:
    try:
        q_dict = json.loads(rec.query_json)
    except Exception:
        q_dict = {}
    return SavedSearchResponse(
        id=rec.id,
        name=rec.name,
        query=q_dict,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
    )


@router.get("/searches", response_model=List[SavedSearchResponse])
def list_saved_searches(ctx: AppContext = Depends(get_app_context)):
    records = ctx.saved_search_repo.list_all()
    return [_to_response(r) for r in records]


@router.post("/searches", response_model=SavedSearchResponse, status_code=status.HTTP_201_CREATED)
def create_saved_search(
    req: CreateSearchRequest,
    ctx: AppContext = Depends(get_app_context),
):
    query_str = json.dumps(req.query)
    record = ctx.saved_search_repo.create(name=req.name, query_json=query_str)
    return _to_response(record)


@router.get("/searches/{search_id}", response_model=SavedSearchResponse)
def get_saved_search(search_id: str, ctx: AppContext = Depends(get_app_context)):
    record = ctx.saved_search_repo.get_by_id(search_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved search with ID '{search_id}' not found",
        )
    return _to_response(record)


@router.put("/searches/{search_id}", response_model=SavedSearchResponse)
def update_saved_search(
    search_id: str,
    req: UpdateSearchRequest,
    ctx: AppContext = Depends(get_app_context),
):
    query_str = json.dumps(req.query) if req.query is not None else None
    record = ctx.saved_search_repo.update(search_id, name=req.name, query_json=query_str)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved search with ID '{search_id}' not found",
        )
    return _to_response(record)


@router.delete("/searches/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_search(search_id: str, ctx: AppContext = Depends(get_app_context)):
    success = ctx.saved_search_repo.delete(search_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved search with ID '{search_id}' not found",
        )


@router.get("/searches/{search_id}/results", response_model=SearchResultsResponse)
def get_saved_search_results(
    search_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    ctx: AppContext = Depends(get_app_context),
):
    record = ctx.saved_search_repo.get_by_id(search_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved search with ID '{search_id}' not found",
        )

    try:
        q_dict = json.loads(record.query_json)
    except Exception:
        q_dict = {}

    offset = (page - 1) * limit
    # Parse dates if present
    start_date = None
    if q_dict.get("start_date") or q_dict.get("startDate"):
        try:
            start_date = datetime.fromisoformat(q_dict.get("start_date") or q_dict.get("startDate"))
        except Exception:
            pass

    end_date = None
    if q_dict.get("end_date") or q_dict.get("endDate"):
        try:
            end_date = datetime.fromisoformat(q_dict.get("end_date") or q_dict.get("endDate"))
        except Exception:
            pass

    import_start_date = None
    if q_dict.get("import_start_date") or q_dict.get("importStartDate"):
        try:
            import_start_date = datetime.fromisoformat(q_dict.get("import_start_date") or q_dict.get("importStartDate"))
        except Exception:
            pass

    import_end_date = None
    if q_dict.get("import_end_date") or q_dict.get("importEndDate"):
        try:
            import_end_date = datetime.fromisoformat(q_dict.get("import_end_date") or q_dict.get("importEndDate"))
        except Exception:
            pass

    media_type = q_dict.get("media_type") or q_dict.get("mediaType") or q_dict.get("type")
    min_size = q_dict.get("min_size") or q_dict.get("minSize")
    max_size = q_dict.get("max_size") or q_dict.get("maxSize")
    min_duration = q_dict.get("min_duration") or q_dict.get("minDuration")
    max_duration = q_dict.get("max_duration") or q_dict.get("maxDuration")
    min_width = q_dict.get("min_width") or q_dict.get("minWidth")
    max_width = q_dict.get("max_width") or q_dict.get("maxWidth")
    min_height = q_dict.get("min_height") or q_dict.get("minHeight")
    max_height = q_dict.get("max_height") or q_dict.get("maxHeight")
    extension = q_dict.get("extension")
    favorite = q_dict.get("favorite")
    album_id = q_dict.get("album_id") or q_dict.get("albumId")
    search_query = q_dict.get("search") or q_dict.get("searchQuery")
    sort = q_dict.get("sort", "newest")

    items = ctx.media_repo.filter_media(
        media_type=media_type,
        min_size=min_size,
        max_size=max_size,
        start_date=start_date,
        end_date=end_date,
        import_start_date=import_start_date,
        import_end_date=import_end_date,
        min_duration=min_duration,
        max_duration=max_duration,
        min_width=min_width,
        max_width=max_width,
        min_height=min_height,
        max_height=max_height,
        extension=extension,
        favorite=favorite,
        album_id=album_id,
        search_query=search_query,
        sort=sort,
        limit=limit,
        offset=offset,
    )

    total = ctx.media_repo.count_filtered_media(
        media_type=media_type,
        min_size=min_size,
        max_size=max_size,
        start_date=start_date,
        end_date=end_date,
        import_start_date=import_start_date,
        import_end_date=import_end_date,
        min_duration=min_duration,
        max_duration=max_duration,
        min_width=min_width,
        max_width=max_width,
        min_height=min_height,
        max_height=max_height,
        extension=extension,
        favorite=favorite,
        album_id=album_id,
        search_query=search_query,
    )

    return SearchResultsResponse(
        search=_to_response(record),
        items=items,
        count=len(items),
        total=total,
    )
