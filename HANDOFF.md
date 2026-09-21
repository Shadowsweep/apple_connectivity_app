# Handoff — iPhone USB + Import page testing (2026-09-21)

## Status
Backend USB path is **verified working** against the real phone (`Asus's iPhone`,
11,634 items / 33.4 GB over Direct USB AFC). Import-page API calls all succeed.
**Known issue (open): no actual iPhone data shows in the UI** — see §5.

## 1. Work done
1. **`check_iphone.py` (new, repo root)** — one-file USB check: probe state +
   Camera Roll count. Run: `uv run python check_iphone.py`.
   Last result: `state=READY items=11634 bytes=35916658881`.
2. **Import-page loader (UI)** — first load used to sit on a blocking 30s+ fetch
   then fall back to "No device detected".
   - `frontend/src/components/import/DeviceSummaryPanel.tsx`: new `SCANNING`
     branch showing `Scanning iPhone… N items` with live count.
   - `frontend/src/pages/ImportPage.tsx`: auto-kicks one background scan on
     first load only if the initial summary fetch came back empty (no double
     USB pass). `tsc --noEmit` clean.
3. **Bare 500 → typed failures (backend)** — a USB hiccup (usually the phone
   auto-locking mid-scan) returned `{"detail":"Internal Server Error"}`.
   - `app/api/routes/imports.py`: `get_device_summary` now returns a typed
     `LOCKED`/`UNTRUSTED`/`UNAVAILABLE` summary with message+action; preview
     path (`_get_device_and_filtered_items` + new `_preview_or_503` helper used
     by `/preview` and `/start`) returns 503 with an action instead of 500.
     Reuses `_classify_afc_error` / `_PROBE_MESSAGES` / `_PROBE_ACTIONS`.
4. **Race fix (backend, the date-filter 500)** — traceback proved it:
   `RuntimeError: This event loop is already running` at
   `imports.py → importer.preview → detector.check_item →
   UsbIPhoneDevice.open_stream → _run`. Concurrent API workers shared one AFC
   event loop. Fix in `app/device/iphone.py`: per-device `_loop_lock`
   serializing `_run`, `_AfcChunkStream.readinto` and `close`.
5. **Backend log capture** — uvicorn stdout/stderr now go to
   `.test-tmp/backend-8002.log` / `.test-tmp/backend-8002.err.log` (this is how
   the traceback above was captured). Vite logs: `.test-tmp/vite*.log`.

## 2. Verified (evidence)
- `GET /api/import/device-status` → `READY`, Direct USB. Via `:5173` proxy too.
- `GET /api/import/device-summary` → `READY`, 11,013 photos / 449 videos /
  172 live, `scan_generation` cached (instant on reload).
- `POST /api/import/preview` with date filter
  `{"date_from":"2025-01-01","date_to":"2025-12-31"}` → `total=1256 new=1021`.
- 3 heavy calls in parallel (preview + summary + filtered preview): all OK,
  backend healthy, zero new tracebacks.
- `pytest -k "import or device or iphone or probe or duplicate"` → 24 passed.
- Note: `Library`/`Timeline`/`Media` pages are empty because nothing has been
  imported yet (fresh DB) — expected, not a bug.

## 3. How to run / test
```powershell
uv run python main.py serve --port 8002          # backend + built UI (:8002)
# frontend dev (new window):
cd frontend; npm run dev -- --port 5173 --host 127.0.0.1 --strictPort
uv run python check_iphone.py                    # fast USB check
uv run pytest tests/ -k "import or device or iphone or probe or duplicate" -q
```
Test order in UI (`http://127.0.0.1:5173/import`): confirm `USB Connected`
summary → Preview → 1 small month → Import → check Library.
Keep the iPhone **unlocked, Auto-Lock Never** during scan/import.

## 4. Git state (uncommitted)
- Modified: `app/api/routes/imports.py`, `app/device/iphone.py`,
  `frontend/src/components/import/DeviceSummaryPanel.tsx`,
  `frontend/src/pages/ImportPage.tsx`
- New: `check_iphone.py`, `.test-tmp/backend-8002*.log`, `.test-tmp/vite*.log`
  (scratch logs, safe to delete)

## 5. Known issue (open): no actual iPhone data in UI
- Symptom: `/import` page static — no device summary / preview data renders —
  while every backend endpoint above returns real data (11,634 items).
- Ruled out: USB/cable/Trust/lock (probe READY), backend 500s (fixed, log is
  clean), wrong API routes, proxy target (`vite.config.ts` → `:8002`, verified
  via `:5173/api/...`), TS compile errors (`tsc` clean).
- Suspects: (a) stale vite processes squatting on `:5173/:5174` pushed the dev
  server to `:5175` while the browser stayed on a dead `:5173` — killed twice,
  use `--strictPort` so this fails loudly; (b) 30s+ cold summary fetch timing
  out in the browser before cache warms; (c) phone auto-locking mid-scan.
- Needed to close: hard-refresh `http://127.0.0.1:5173/import` with the phone
  unlocked and paste the exact on-screen text plus the browser console (F12)
  error — I cannot see the browser from here.
