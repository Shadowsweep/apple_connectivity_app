# MEMEASY Handoff Notes

**Last updated:** 2026-09-15 (iPhone selective-import checkpoint)
**Status:** Work paused at a tested checkpoint; final full-suite/release validation remains

## Resume here first

The current goal is a Windows-first USB workflow:

`iPhone → scan through Apple Devices pairing → browse photos/videos by month → select individual items/months → choose a vault subfolder → optionally assign a group/album → safe verified import`

Do not restart this work from scratch. The repository was already heavily modified before this checkpoint; preserve all unrelated dirty-worktree changes.

Next actions when resuming:

1. Run the full backend suite after the latest duplicate-index change:
   `$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'; $testTemp = 'D:\memeasy\.test-tmp\run-' + [guid]::NewGuid().ToString('N'); New-Item -ItemType Directory -Path $testTemp | Out-Null; .venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider --basetemp $testTemp`
2. Re-run the frontend production build with the bundled Node runtime (ordinary `npm` is not on PATH in this environment).
3. Exercise one small real-device import into a disposable vault folder, then verify its database row, physical path, and optional album membership. Ask before importing real user media.
4. Build/package the Windows sidecar and confirm `pythoncom`, `pywintypes`, and `win32com.client` are included.
5. Consider making the first scan a background/progress job. The direct USB scan of this phone takes about 28–29 seconds for 11,632 items.

## iPhone selective-import checkpoint (2026-09-15)

Implemented in the current worktree:

- `UsbIPhoneDevice` is now preferred. On this PC it uses the pairing service installed by Apple Devices and is much faster than Windows Shell/WPD.
- WPD remains the fallback and now supports both layouts observed in practice:
  `Internal Storage/DCIM/100APPLE/...` and `Internal Storage/202609_a/...`.
- WPD copy resolution uses the full virtual path, supports long 4K/ProRes timeouts, and its release dependencies are explicitly declared.
- Direct USB timestamp fallback now accepts AFC modified times. This fixed all items appearing under `Unknown date`.
- Import preview responses include selectable item metadata (`id`, filename, type, bytes, capture date, month key, duplicate state).
- Import requests accept `selected_ids`, `target_folder`, and optional `group_name`.
- Successful selected imports can be placed below a chosen vault subfolder while retaining the `Photos|Videos|Screenshots|LivePhotos/YYYY/MM` layout.
- A matching album/group is reused; otherwise it is created after successful import, and only successfully imported media IDs are attached.
- The Import page now provides month sections, item/month selection, duplicate-disabled rows, vault-folder selection/creation, and optional group assignment.
- Remembered vault paths are write-probed at startup; an inaccessible removable vault falls back safely instead of crashing logging/database initialization.
- Duplicate indexing now walks media under the whole vault so custom prefixes such as `Trips/Photos/2026/09` remain duplicate-protected after restart.

Real-device evidence from this machine:

- Detected: `Apple iPhone (USB)`
- Provider: `Direct USB (Apple Devices pairing service)`
- Discovered: 11,632 media entries
- Scan duration: about 28.4 seconds
- Month groups: 29
- Items with unknown date after the timestamp fix: 0

Validation completed before pausing:

- Frontend `tsc` + Vite production build passed.
- Existing full backend suite passed: 55 tests.
- New targeted tests passed: selective item import, chosen vault prefix, album/group attachment, traversal rejection, and nested WPD path resolution (8 targeted tests total).
- Two additional tests were added after the 55-test run; rerun the complete suite as resume step 1.

Important: no real iPhone media was copied or deleted during validation. Detection and scanning were read-only.

## What this app is

Tauri v2 desktop app: React 19 + TypeScript + Tailwind 4 frontend (`frontend/`), FastAPI + SQLite Python sidecar backend (`app/`), packaged for Windows (`build_release.py`). Netflix-style dark media library for photos & videos.

## How to run

- Dev backend: `uv run uvicorn app.main:app --port 8000` (see `app/main.py`)
- Dev frontend: `cd frontend && npm run dev`
- Tests: use the sandbox-safe command in “Resume here first”; 55 existing tests plus 2 new tests are present
- Frontend typecheck/build: `cd frontend && npm run build` (runs `tsc && vite build`)
- Full release: `python build_release.py`

## Architecture in one line

`src-tauri` shell spawns `memeasy-backend.exe` (FastAPI) on a random localhost port → React app calls `GET /api/health` to discover it (`frontend/src/api/client.ts`) → all data via REST over SQLite (`app/database/repositories/`).

## Current feature state

- Import pipeline, filtering, timeline, albums, favorites, duplicates, trash, Clean Mobile, storage analytics — see `docs/ROADMAP.md` for the full phase checklist.
- Media grid (`frontend/src/components/media/`): month-section headers, multi-select, per-card thumbnail spinner, duration badges.

## Phase 12 (this handoff) — what changed and where

| Feature | Files |
|---|---|
| Duration badge fix + hours format | `frontend/src/utils/formatters.ts` (`formatDuration` returns `''` when unknown), `MediaCard.tsx` |
| Duration backfill on page load | `frontend/src/hooks/useMedia.ts` (`useBackfillDurations`), `MediaPage.tsx` useEffect; backend endpoint pre-existed: `app/api/routes/maintenance.py` |
| Month section grouping | `MediaGrid.tsx` `groupByMonth` prop + `formatMonthSection` in `formatters.ts`; enabled on Media/Favorites/AlbumDetail pages |
| Multi-select + batch actions | `MediaPage.tsx` (selection state, toolbar), `MediaGrid.tsx`/`MediaCard.tsx` (selection plumbing existed, now activated) |
| Batch add-to-album | `app/api/routes/albums.py` (`media_ids[]` accepted), `frontend/src/api/albumsApi.ts`, `frontend/src/hooks/useAlbums.ts`, `AddToAlbumModal.tsx` (`mediaIds: string[]`) |
| Batch move-to-trash | `app/api/routes/media.py` (`POST /media/trash`), `mediaApi.ts` `trashMedia`, `useMedia.ts` `useTrashMedia` |
| Per-item loading spinner | `MediaCard.tsx` (thumb load/error state + `animate-spin` overlay) |

## Known ceilings (deliberate)

- `# ponytail`-level shortcuts: selection is page-local state (not persisted across navigation); grid renders max 150 items per page (`limit: 150` in `MediaPage.tsx`) — no virtualization yet; add `react-virtual` only if users report lag with larger pages.
- Duration backfill runs once on every Library mount; if the library has thousands of unduration videos this is a one-time slow call. Move it to a startup background job if that bites.
- Trash batch endpoint only flips `status` (same as existing duplicates trash) — actual file deletion stays manual by design.

## Gotchas

- Route order matters: `/media/trash` and `/media/backfill-durations` are POST-only; `GET /media/{media_id}` won't shadow them.
- `AddToAlbumModal` now takes `mediaIds: string[]` — any caller passing a single id must wrap it in an array.
- Icons: there is no `ListChecks` in `components/icons.tsx`; use `CheckSquare`.

## Where to look next

- `docs/ROADMAP.md` — phase-by-phase feature checklist (Phase 12 appended).
- `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md` — deeper layers.
- `DESIGN.md` — design tokens (accent color is runtime-configurable via `PUT /api/ui/accent`).
