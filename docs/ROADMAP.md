# MEMEASY Development Roadmap

## Phase 1: Core Media Engine & CLI (Current Focus)
- [x] Project scaffolding and documentation suite (`ARCHITECTURE.md`, `DATABASE.md`, `MEMORY.md`, `IMPORT_PIPELINE.md`, `SECURITY.md`, `ROADMAP.md`, `DESIGN.md`)
- [x] Media device abstraction & Mock iPhone source
- [x] Resilient metadata extractor (EXIF, MP4/QuickTime, filename fallback)
- [x] Filter engine (Date, Media Type, Video Size, Storage Quota)
- [x] Two-tier duplicate detection (Fast Size + SHA-256)
- [x] Safe staged copy & verification pipeline (`.memeasy/tmp/`)
- [x] Storage calculations & 10 GB safety reserve
- [x] Automated test suite & interactive CLI

## Phase 2: SQLite Metadata Index
- [ ] SQLite schema implementation (`libraries`, `media`, `imports`, `albums`, `favorites`, `watch_progress`)
- [ ] Fast indexed search & filtering
- [ ] Index rebuild tool for existing libraries

## Phase 3: Local FastAPI Service
- [ ] Localhost REST API for devices, library, jobs, and streaming
- [ ] WebSocket event stream for background progress
- [ ] Video range-request streaming endpoint

## Phase 4: React + Vite Frontend
- [ ] Netflix-style dark mode theme (from `DESIGN.md`)
- [ ] High-performance virtualized media grid (100k+ items)
- [ ] Interactive filter panel, import preview modal, album manager

## Phase 5: Tauri Desktop Shell
- [ ] Tauri v2 Rust wrapper for Windows 10/11
- [ ] Python backend bundling as a Tauri sidecar (no Python install required for user)
- [ ] Native Windows notifications and system tray integration

## Phase 6: Rich Media Experience
- [ ] Built-in HDR video player with resume/continue watching
- [ ] Live Photo playback (paired image + MOV)
- [ ] Clean Mobile workflow (verified safe deletion)

## Phase 7: Advanced Offline AI (Optional / Future)
- [ ] Local ONNX / CLIP semantic search ("sunset on the beach")
- [ ] Local facial clustering (FaceNet / InsightFace)
