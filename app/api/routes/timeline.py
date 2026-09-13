from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context
from app.database.models import MediaRecord

router = APIRouter(tags=["Timeline"])


class TimelineYearItem(BaseModel):
    year: str
    count: int


class TimelineMonthItem(BaseModel):
    month: str
    count: int


class TimelineMediaResponse(BaseModel):
    year: str
    month: Optional[str] = None
    items: List[MediaRecord]
    count: int


@router.get("/timeline/years", response_model=List[TimelineYearItem])
def get_timeline_years(ctx: AppContext = Depends(get_app_context)):
    return ctx.media_repo.get_timeline_years()


@router.get("/timeline/months", response_model=List[TimelineMonthItem])
def get_timeline_months(
    year: str = Query(..., description="Target year (e.g. 2026)"),
    ctx: AppContext = Depends(get_app_context),
):
    return ctx.media_repo.get_timeline_months(year=year)


@router.get("/timeline/media", response_model=TimelineMediaResponse)
def get_timeline_media(
    year: str = Query(..., description="Target year"),
    month: Optional[str] = Query(None, description="Target 2-digit month (01-12)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    ctx: AppContext = Depends(get_app_context),
):
    offset = (page - 1) * limit
    items = ctx.media_repo.get_timeline_media(
        year=year,
        month=month,
        limit=limit,
        offset=offset,
    )
    return TimelineMediaResponse(
        year=year,
        month=month,
        items=items,
        count=len(items),
    )
