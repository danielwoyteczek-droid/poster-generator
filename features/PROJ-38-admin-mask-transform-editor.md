# PROJ-38 — Admin Mask Transform Editor

**Status:** Deployed
**Created:** 2026-05-08

## Problem
Custom masks uploaded via `/private/admin/masks` end up wherever the source SVG happens to position the figure inside its viewBox. Repositioning previously meant re-exporting the SVG with a manually-computed transform — a slow loop that required a designer's tool.

## Solution
Visual position/size editor in the admin UI:
- Drag the mask silhouette inside an A4-shaped preview to translate it
- Slider to scale (0.2× — 3×)
- Reset button restores defaults (0/0/1)
- Save persists `transform_x` / `transform_y` / `transform_scale` to DB
- Composer wraps `shape_markup` in a transform-group at render time

No SVG re-upload needed — operator sees live preview while dragging, and customers see the same transform composed with the editor's layout-scaling on top.

## Implementation

### DB
- Migration `20260508000000_proj38_custom_masks_transform.sql`
- Three new columns on `custom_masks`: `transform_x` / `transform_y` (numeric, default 0), `transform_scale` (numeric, default 1)
- Existing rows default to no-op transform → no visual change on migration

### API
- `PATCH /api/admin/masks/[id]` accepts `transform_x` / `transform_y` / `transform_scale` (Zod-validated)
- `GET /api/masks` selects transform columns alongside existing fields

### Composer
- `useCustomMasks.toMaskDefinition` wraps `shape_markup` in `<g transform="translate(x y) scale(s)">…</g>` when any value differs from default
- The wrapper sits inside the composer's own fill-group, so layout-scaling (text-15/text-30 layouts) composes correctly on top

### UI
- `MaskTransformEditor` modal: A4-shaped preview (320×453 px), draggable mask `<img>`, scale slider, reset button
- Drag converts pointer-pixel deltas to viewBox-unit deltas via the preview's mask-size ratio
- Save invalidates customMasks cache so editor picks up new transform immediately

## Acceptance criteria
- [x] Migration applied to prod
- [x] PATCH endpoint validates transform fields
- [x] Public mask API returns transform fields
- [x] Composer applies transform when non-default
- [x] Admin can drag silhouette inside A4 preview, see live update
- [x] Admin can scale 0.2×–3× via slider
- [x] Reset button restores defaults
- [x] Save persists to DB and live-updates the editor (cache invalidation)

## Related
- PROJ-1 — Karten-Editor Core (mask composer)
- PROJ-35 — Customer-sichtbare Custom-Masks mit Decoration (custom mask infrastructure)

## Notes
- Transform values are in viewBox units (same coordinate space as `shape_viewbox`), so mental model matches the source SVG
- Scale upper bound 10× hard-coded in PATCH validation as a safety rail; UI slider stops at 3× which fits the practical use case
- A future iteration could add visible bounding-box outline + magnet-snap to centerline; current version is intentionally minimal
