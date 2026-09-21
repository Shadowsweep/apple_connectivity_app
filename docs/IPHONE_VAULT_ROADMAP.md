# MEMEASY iPhone Vault — Implementation Roadmap

**Created:** 2026-09-15  
**Purpose:** Continue from the current USB/iPhone checkpoint and bind the device, catalog, selection, vault, grouping, database, and desktop layers into a reliable Windows application.

## 1. Target User Flow

The finished workflow should be:

1. Connect an iPhone through USB.
2. MEMEASY detects the phone through Apple Devices pairing.
3. Unlock/trust guidance appears when access is incomplete.
4. The app scans the Camera Roll once and reports live progress.
5. Photos, videos, screenshots, and Live Photos appear by month.
6. The user selects individual items, media types, or entire months.
7. The user chooses or creates a vault location and optional subfolder.
8. The user optionally assigns the import to a group/album.
9. MEMEASY previews duplicates, required storage, and the final folder layout.
10. A resumable job copies, verifies, organizes, and indexes the selected media.
11. The result page reports successes, duplicates, failures, and recovery actions.

## 2. Current Checkpoint

### Completed or substantially implemented

- [x] Python device abstraction for local folders, mock devices, direct AFC USB, and Windows WPD.
- [x] Apple Devices/usbmux pairing detects the real iPhone on this PC.
- [x] Direct USB/AFC is preferred; WPD remains a fallback.
- [x] Both WPD folder layouts are understood:
  - `Internal Storage/DCIM/100APPLE/...`
  - `Internal Storage/202609_a/...`
- [x] Real read-only scan verified with 11,632 items in approximately 28 seconds.
- [x] Device timestamps form 29 month groups with no unknown-date items in the verified scan.
- [x] Preview API exposes selectable media metadata and duplicate state.
- [x] Import API accepts selected device IDs, a vault-relative folder, and a group name.
- [x] Import UI supports selection by month and individual item.
- [x] Vault folder selection and creation are available.
- [x] Successful files can be linked to an existing or newly created album/group.
- [x] Copies use staging files, SHA-256 verification, atomic final placement, and SQLite registration.
- [x] Custom vault prefixes are included in duplicate indexing.
- [x] Frontend production build passed at the checkpoint.
- [x] Existing backend suite passed before the last duplicate-index change; new targeted import/WPD tests also passed.

### Not yet release-ready

- [ ] Full backend suite must be rerun after the final checkpoint changes.
- [ ] No real media has yet been imported during validation.
- [ ] The first 28-second scan is synchronous and has no item-level progress.
- [ ] Large Camera Rolls need pagination/virtualization in the import screen.
- [ ] Import results do not yet expose detailed per-file outcomes in the UI.
- [ ] Disconnect/reconnect and interrupted real-device imports need end-to-end testing.
- [ ] The packaged Windows build still needs USB-driver and COM verification.

## 3. Binding the Application Layers

Every layer should have one clear responsibility:

| Layer | Responsibility | Binding contract |
|---|---|---|
| Apple Devices / usbmux | Windows driver, pairing, trust | Makes the iPhone reachable; MEMEASY never depends on the Apple Devices UI remaining open |
| Device providers | Discover, stream, copy, report capabilities | Stable `unique_id`, filename, size, timestamp, connection state, and safe cleanup |
| Scan/catalog service | Normalize device entries and group by month | One cached scan session identified by device and generation |
| Import API | Validate filters, selections, destination, and group | Immutable import request with selected IDs and resolved vault-relative destination |
| Job manager | Run, cancel, resume, and report work | Persistent job plus per-item progress and error records |
| Safe importer | Copy, verify, organize, and register | A file is visible as imported only after verification and database commit |
| Vault filesystem | Authoritative media bytes | All generated paths remain inside the chosen vault root |
| SQLite catalog | Searchable metadata and relationships | Media path, hash, status, import history, and album membership stay synchronized |
| React UI | Guide, preview, select, and report | Never guesses success; renders backend job and item states |
| Tauri shell | Start/stop the backend and package the app | Dynamic local port, health check, single instance, clean child shutdown |

## 4. Ordered Implementation Plan

### Phase 0 — Freeze and Verify the Current Baseline

**Goal:** Establish a trustworthy starting point before more implementation.

- [x] Review `git status` and separate existing user work from checkpoint changes.
- [x] Run all backend tests using a writable `--basetemp` directory. (62 passed, 2 pre-existing warnings, 2026-09-15)
- [x] Run TypeScript type checking and the Vite production build.
- [x] Add tests for custom-prefix duplicate discovery after an application restart.
- [x] Record the exact test count and known warnings.
- [x] Do not perform a real import until the user approves a disposable target folder.

**Exit gate:** All automated tests and frontend compilation pass with no unexplained failures.

### Phase 1 — Stabilize Device Detection and Diagnostics

**Goal:** Always tell the difference between disconnected, locked, untrusted, unavailable, empty, and ready.

- [x] Introduce a structured device probe result:
  - provider used;
  - device identifier and display name;
  - pairing/trust state;
  - Camera Roll accessibility;
  - last provider error;
  - supported capabilities.
- [x] Preserve the direct AFC-first, WPD-fallback provider order.
- [x] Close old provider sessions on rescan, vault switch, shutdown, and failed connection.
- [x] Add a bounded detection timeout so a failing provider cannot freeze startup.
- [x] Surface actionable messages for:
  - install/open Apple Devices once;
  - unlock the iPhone;
  - tap Trust/Allow;
  - reconnect the cable;
  - disable conflicting Apple processes only when diagnostics prove a conflict.
- [x] Add provider-level logging without exposing personal filenames in default diagnostics.

**Exit gate:** Every connection state produces a deterministic API status and an understandable UI action.

### Phase 2 — Convert Scanning into a Background Catalog Job

**Goal:** Keep the UI responsive during the initial 11k-item scan.

- [x] Replace the synchronous summary/preview scan with a persistent `DEVICE_SCAN` job.
- [x] Report folders visited, items discovered, bytes counted, elapsed time, and current phase.
- [x] Add cancel and rescan controls.
- [x] Assign every scan a `scan_id` and generation number.
- [x] Cache normalized scan items against the device ID and invalidate them on reconnect or explicit refresh.
- [x] Return partial month counts while scanning when the provider supports it.
- [x] Prevent summary, preview, and import-start endpoints from independently rescanning the same phone.
- [x] Decide whether scan metadata remains memory-only or uses a temporary SQLite scan table. Prefer temporary SQLite if memory use or restart recovery becomes a problem.

**Exit gate:** A full scan can run for several minutes without blocking navigation, and every downstream request reuses the same scan generation.

*Evidence 2026-09-15: live read-only scan of the real iPhone on port 8002 — `DEVICE_SCAN` job, `COMPLETED` in 28.5s, 11,632 items, 29 month buckets, progress polled throughout (`0 → 2850 → 9375 → 11632`) while the server stayed responsive. Scan state stays memory-only (11k items ≈ a few MB); job history itself persists in SQLite. Cancel marks the job `CANCELLED` and keeps the last good generation; mid-enumeration cancel is best-effort (provider enumeration runs to completion, result discarded) — cooperative mid-stream cancel is a Phase 7 item.*

### Phase 3 — Build a Scalable Month Catalog

**Goal:** Browse large Camera Rolls smoothly without rendering thousands of rows at once.

- [ ] Add catalog endpoints with month, type, duplicate, date, and pagination filters.
- [ ] Return stable ordering using capture timestamp plus device `unique_id` as a tie-breaker.
- [ ] Virtualize the month/item list in React.
- [ ] Preserve selection when months are collapsed or pages are changed.
- [ ] Support selection modes:
  - single item;
  - entire month;
  - all photos;
  - all videos;
  - all screenshots;
  - all non-duplicates.
- [ ] Show a clear count when a filter hides selected items.
- [ ] Add low-cost device thumbnails only after catalog performance is stable. Use a bounded cache and never copy a full-resolution video merely to make a preview.

**Exit gate:** Scrolling and selection stay responsive with at least 20,000 catalog entries.

### Phase 4 — Make Selection Server-Verifiable

**Goal:** Ensure the imported set exactly matches what the user reviewed.

- [ ] Bind each selection to a `scan_id`.
- [ ] Reject stale selections when the phone reconnects or the scan generation changes.
- [ ] Store either explicit selected IDs or a compact selection rule plus exclusions for very large selections.
- [ ] Re-resolve every selected ID immediately before import.
- [ ] Report missing/changed device items instead of silently replacing them.
- [ ] Keep Live Photo pairs together by default and warn before importing only one side.

**Exit gate:** The backend can prove that every imported item was part of the reviewed scan and selection.

### Phase 5 — Finalize Vault and Folder Semantics

**Goal:** Make storage behavior predictable and safe.

- [ ] Confirm the distinction between:
  - vault root: physical library location;
  - vault subfolder: optional import destination prefix;
  - album/group: virtual SQLite grouping that does not duplicate bytes.
- [ ] Add a destination preview, for example:
  `D:\MyVault\Goa Trip\Photos\2026\09\IMG_1234.HEIC`.
- [ ] Validate free space on the actual destination volume immediately before each batch.
- [ ] Revalidate that every staging and final path remains inside the vault.
- [ ] Define behavior when a selected vault drive is removed:
  - do not silently import elsewhere;
  - pause the job;
  - preserve the prior vault setting;
  - request reconnection or a deliberate vault change.
- [ ] Decide whether changing the vault switches libraries or migrates an existing library. Keep these as separate actions.
- [ ] Add folder creation conflict handling and case-insensitive Windows path tests.

**Exit gate:** The user can predict the exact physical destination, and no path can escape or silently switch away from the selected vault.

### Phase 6 — Make Import and Group Assignment Transactional

**Goal:** Keep files, media rows, import history, and albums consistent.

- [ ] Create an immutable import plan before copying starts.
- [ ] Record one `import_item` row per selected device item while the job is queued.
- [ ] Move each item through explicit states:
  `QUEUED → COPYING → VERIFYING → ORGANIZING → INDEXING → COMPLETED`.
- [ ] Record duplicate, failed, cancelled, missing-source, and insufficient-space states separately.
- [ ] Attach album membership in the same database transaction that finalizes the media row where practical.
- [ ] If group creation fails, keep the verified media and report a recoverable grouping error; never delete a good import merely because album linking failed.
- [ ] Make retry idempotent so completed items are not copied twice.
- [ ] Recalculate size and hash from the copied file rather than trusting device metadata alone.

**Exit gate:** A crash at any step can be recovered without duplicate files, orphan rows, or false success states.

### Phase 7 — Improve Job Progress, Cancellation, and Recovery

**Goal:** Make long imports understandable and recoverable.

- [ ] Track bytes as well as item counts.
- [ ] Display current filename, phase, transfer speed, elapsed time, and estimated time remaining.
- [ ] Make cancellation cooperative between files and, where supported, during streaming copy.
- [ ] On disconnect, pause and mark remaining items rather than failing the entire history record.
- [ ] Add Resume after reconnect using the original scan/import plan.
- [ ] Verify `.part` cleanup and database recovery after forced process termination.
- [ ] Persist a detailed result summary that can be reopened later.

**Exit gate:** Pulling the cable or closing the app during import produces a recoverable and accurately reported state.

### Phase 8 — Complete Duplicate and Metadata Reliability

**Goal:** Prevent unnecessary transfers without misclassifying files.

- [ ] Keep the cheap filename/size candidate pass.
- [ ] Hash over the device stream only when a likely local candidate exists.
- [ ] Add database-backed hash lookup so a restart does not require hashing the whole vault.
- [ ] Test duplicates inside root organization folders and custom destination prefixes.
- [ ] Backfill exact EXIF/QuickTime timestamps, dimensions, duration, orientation, and MIME type after copy.
- [ ] Decide how edited iPhone variants and `.AAE` sidecars are handled.
- [ ] Define Live Photo identity and ensure both components share a logical group.
- [ ] Detect filename collisions independently from content duplicates.

**Exit gate:** Reimporting the same selection transfers zero duplicate bytes and reports why every item was skipped.

### Phase 9 — Real-Device Failure Matrix

**Goal:** Validate behavior beyond mocks.

- [ ] Test a small approved selection against a disposable vault.
- [ ] Verify photos, HEIC, PNG screenshots, MOV, MP4, large 4K video, and a Live Photo pair.
- [ ] Test with the phone locked before scan.
- [ ] Test trust revoked and trust newly granted.
- [ ] Test disconnect during scan, copy, verification, and finalization.
- [ ] Test the phone reconnecting with the same and a different device identity.
- [ ] Test a nearly full vault drive and a vault removed mid-job.
- [ ] Test AFC failure with successful WPD fallback.
- [ ] Compare source and destination SHA-256 for representative files.
- [ ] Confirm MEMEASY never deletes phone media during ordinary import.

**Exit gate:** Every scenario has a recorded result, expected UI state, and automated regression test where feasible.

### Phase 10 — Finish the Desktop Experience

**Goal:** Present one coherent import wizard rather than disconnected features.

- [ ] Use a clear wizard state model:
  `Connect → Scan → Select → Destination → Review → Import → Results`.
- [ ] Prevent navigation from accidentally losing an active import.
- [ ] Restore a running job when the Import page is reopened.
- [ ] Replace browser alerts/prompts with accessible in-app modals and toasts.
- [ ] Add empty, loading, partial, disconnected, failed, and success states to each step.
- [ ] Make group/album wording consistent throughout the app.
- [ ] Add keyboard selection, focus states, screen-reader labels, and adequate contrast.
- [ ] Explain that Apple Devices supplies pairing/drivers and does not need to remain open.

**Exit gate:** A first-time user can complete an import without external instructions.

### Phase 11 — Package and Validate Windows Dependencies

**Goal:** Ensure the installed app behaves like development.

- [ ] Lock and synchronize `pyproject.toml` and `uv.lock`.
- [ ] Confirm PyInstaller includes:
  - `pythoncom`;
  - `pywintypes`;
  - `win32com.client`;
  - pymobiledevice3/usbmux dependencies;
  - Pillow HEIF support;
  - FFmpeg probing binaries.
- [ ] Test on a clean Windows user account with no project virtual environment.
- [ ] Test with Apple Devices installed from the Microsoft Store.
- [ ] Provide a driver/pairing diagnostic when Apple Devices is missing.
- [ ] Confirm the Tauri shell waits for backend health and terminates it cleanly.
- [ ] Confirm installer upgrade/uninstall never touches the user vault.
- [ ] Sign the executable/installer when preparing public distribution.

**Exit gate:** The installer passes scan and import smoke tests on a clean Windows machine.

### Phase 12 — Performance, Security, and Release Gate

**Goal:** Produce a stable v1 release candidate.

- [ ] Benchmark 1k, 10k, and 25k-item Camera Rolls.
- [ ] Set budgets for scan time, UI rendering, memory, thumbnail cache, and database queries.
- [ ] Fuzz unsafe paths, malformed filenames, invalid API payloads, and stale device IDs.
- [ ] Ensure the API listens only on localhost and does not expose device files by arbitrary path.
- [ ] Redact device identifiers and personal paths from exported diagnostics unless explicitly requested.
- [ ] Run full backend, frontend, Rust, packaging, and installer checks in one release script.
- [ ] Create a manual release checklist and rollback instructions.
- [ ] Update README setup, Apple Devices prerequisites, troubleshooting, and privacy guarantees.

**Exit gate:** All automated suites, real-device matrix, packaged smoke tests, and privacy/security checks pass.

## 5. Recommended Milestones

| Milestone | Included phases | User-visible result |
|---|---|---|
| M1 — Stable connection | 0–2 | Reliable detection, useful diagnostics, responsive scan progress |
| M2 — Smooth selection | 3–4 | Fast month browsing and trustworthy large selections |
| M3 — Safe vault import | 5–8 | Predictable folders, groups, duplicates, resumable verified imports |
| M4 — Release candidate | 9–12 | Real-device confidence and a clean Windows installer |

## 6. Definition of Done

MEMEASY is ready for normal use when all of the following are true:

- [ ] A 10k+ item iPhone can be scanned without freezing the desktop UI.
- [ ] Month/type/item selection remains fast and survives ordinary wizard navigation.
- [ ] The destination path and album/group behavior are clear before import.
- [ ] Every copied file is hash-verified before it is shown as successfully imported.
- [ ] Duplicate imports copy no unnecessary bytes.
- [ ] Disconnect, cancellation, crash, and low-storage cases recover cleanly.
- [ ] Filesystem, SQLite, job history, and album membership remain consistent.
- [ ] The packaged app works with the Apple Devices Windows driver on a clean machine.
- [ ] Import never deletes phone media unless a separate, explicitly confirmed Clean Mobile workflow is used.
- [ ] Full automated and real-device validation is recorded for the release build.

## 7. Resume Command Checklist

From `D:\memeasy`:

```powershell
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
$testTemp = 'D:\memeasy\.test-tmp\run-' + [guid]::NewGuid().ToString('N')
New-Item -ItemType Directory -Path $testTemp | Out-Null
.venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider --basetemp $testTemp
```

Then run the frontend typecheck/build with the bundled Node runtime described in `docs/HANDOFF.md`. Do not start a real import without confirming the disposable vault destination with the user.
