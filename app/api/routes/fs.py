import os
import string

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(tags=["FileSystem"])


class FsEntry(BaseModel):
    name: str
    path: str


class FsBrowseResponse(BaseModel):
    current: str
    parent: str | None
    drives: list[str]
    entries: list[FsEntry]


def _list_drives() -> list[str]:
    return [f"{L}:\\" for L in string.ascii_uppercase if os.path.exists(f"{L}:\\")]


@router.get("/fs/browse", response_model=FsBrowseResponse)
def browse_fs(path: str = Query(default="")):
    drives = _list_drives()

    if not path:
        return FsBrowseResponse(current="", parent=None, drives=drives, entries=[])

    target = os.path.normpath(path)
    if not os.path.isdir(target):
        target = os.path.dirname(target) or target

    entries: list[FsEntry] = []
    try:
        for e in os.scandir(target):
            try:
                if e.is_dir():
                    entries.append(FsEntry(name=e.name, path=e.path))
            except OSError:
                continue
    except OSError:
        pass

    entries.sort(key=lambda x: x.name.lower())

    parent = os.path.dirname(target) or None
    return FsBrowseResponse(current=target, parent=parent, drives=drives, entries=entries)


class MkdirRequest(BaseModel):
    parent: str
    name: str


@router.post("/fs/mkdir", response_model=FsBrowseResponse)
def make_dir(body: MkdirRequest):
    name = body.name.strip()
    if not name or any(c in name for c in '\\/:*?"<>|'):
        raise HTTPException(status_code=400, detail="Invalid folder name")

    parent = os.path.normpath(body.parent)
    if not os.path.isdir(parent):
        raise HTTPException(status_code=400, detail="Parent folder does not exist")

    target = os.path.join(parent, name)
    try:
        os.mkdir(target)
    except FileExistsError:
        raise HTTPException(status_code=409, detail="A folder with that name already exists")
    except OSError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return browse_fs(path=target)
