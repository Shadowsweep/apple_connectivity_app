# MEMEASY

A Windows-first, local-first personal media platform designed for reliable iPhone-to-Windows transfer, intelligent duplicate prevention, and catalog management.

## Quick Start (Phase 1 Engine)

### 1. Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager

### 2. Setup
```bash
uv sync
```

### 3. Run Test Suite
```bash
uv run pytest -v
```

### 4. Run Interactive CLI
```bash
uv run python main.py
```

## Documentation
- [`DESIGN.md`](DESIGN.md) — Visual identity, design tokens, and Netflix-style layout vision.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System components, WPD/iPhone integration, and storage authority.
- [`docs/DATABASE.md`](docs/DATABASE.md) — SQLite schema specification.
- [`docs/MEMORY.md`](docs/MEMORY.md) — State and persistence architecture.
- [`docs/IMPORT_PIPELINE.md`](docs/IMPORT_PIPELINE.md) — Staged atomic import pipeline.
- [`docs/SECURITY.md`](docs/SECURITY.md) — Local security, safe deletions, and path isolation.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Phased development plan.
