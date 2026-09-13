# MEMEASY Design System & Visual Specification

Version: 1.0.0 (Living Document)
App: MEMEASY
Theme: Modern Dark Canvas / Netflix-Inspired Media Platform

---

## 1. Visual Identity & Brand Philosophy

MEMEASY is engineered as a **local-first personal media platform** that marries enterprise-grade import/verification reliability with a fluid, cinematic desktop browsing experience. 

- **Primary Canvas**: Near-black ground (`#090A0F` / `#12141C`) to maximize visual contrast for photography and HDR video.
- **Accents**: High-chroma electric blue (`#2E7CF6`) for primary interactions, vibrant emerald (`#00D68F`) for verified imports, warning amber (`#FFB300`), and error crimson (`#FF3B30`).
- **Typography**: Clean, geometric sans-serif (Inter / System UI font family) prioritizing readability of filenames, timestamps, and media metrics.
- **Surface Elevation**: Layered frosted glass and subtle 1px border hairlines (`rgba(255, 255, 255, 0.08)`) with minimal elevation shadows to keep the interface fast and lightweight.

---

## 2. Design Tokens

### Colors
```yaml
colors:
  canvas: "#090A0F"
  canvas-subtle: "#12141C"
  surface-1: "#1A1D28"
  surface-2: "#232736"
  surface-3: "#30354A"
  
  border-subtle: "rgba(255, 255, 255, 0.07)"
  border-active: "rgba(46, 124, 246, 0.5)"
  
  text-primary: "#FFFFFF"
  text-secondary: "#A0A6B8"
  text-muted: "#6B7280"
  
  brand-primary: "#2E7CF6"
  brand-primary-hover: "#438CF9"
  
  status-verified: "#00D68F"
  status-warning: "#FFB300"
  status-error: "#FF3B30"
  status-queued: "#8E95A5"
```

### Spacing & Layout
- Grid unit: `4px` base (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`)
- Card Radius: `8px` (media thumbnails), `12px` (dialogs and panels)
- Density: Compact CLI/Dashboard view with expansive full-bleed media grid.

---

## 3. UI Component Architecture (Phase 4-6 Target)

```text
+-----------------------------------------------------------------------------------+
|  MEMEASY [Icon]                                          [Search Media...]  [_][X]|
+-----------------------------------------------------------------------------------+
| [Devices]        |  iPhone 15 Pro (USB Connected)                                 |
| - iPhone 15 Pro  |  Storage: 84.2 GB used / 256 GB | 1,420 items available        |
| - Local Library  |  +-----------------------------------------------------------+ |
|                  |  | Import Filters: [2025-01-01 to Present] [Photos & Videos]  | |
| [Library]        |  | Video Size: > 0 MB | Storage Limit: 50 GB                 | |
| - All Media      |  +-----------------------------------------------------------+ |
| - Photos         |                                                                |
| - Videos         |  Import Preview: 1,420 Items | 32.4 GB required | Free: 180 GB|
| - Live Photos    |  [ Start Safe Import ]                                         |
| - Albums         |----------------------------------------------------------------|
| - Favorites      |  Media Grid:                                                   |
| - Clean Device   |  [ [IMG] 2026-02-14 ]  [ [IMG] 2026-02-15 ]  [ [VID] 04:12 ]   |
+-----------------------------------------------------------------------------------+
```

---

## 4. Phase-Specific Design Rules

1. **Phase 1 (Media Engine CLI)**:
   - Clear terminal typography, clean ASCII tables, precise progress counters, human-readable byte sizes.
2. **Phase 2 (SQLite Index)**:
   - Data-first schema mirroring design requirements without schema bloat.
3. **Phase 3-4 (FastAPI + React)**:
   - Responsive virtualization for 100,000+ items without UI stutter.
4. **Phase 5-6 (Tauri + Netflix UI)**:
   - Dark theme, smooth thumbnail lazy-loading, full-screen hardware-accelerated video playback.
