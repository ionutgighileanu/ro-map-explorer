---
name: UI Refactor - New Design System
description: Completed UI refactor aligning components/ with reference/ro-map-explorer.jsx; inline styles, T/I constants, HSV color picker
type: project
---

New modular UI is in place (no Mapbox logic yet). Key files:

- `components/ui-constants.tsx` — T colors, I icons (SVG fns), PRESETS, JUDETE, style objects (IB/SI/AB/ABO/GP/FB), TypeScript interfaces (PointStyle/LabelStyle/LineStyle), factory fns (mkPt/mkLabel/mkLn)
- `components/color-picker.tsx` — HSV gradient picker with eyedropper; props: {color, onChange, label?}
- `components/shared-controls.tsx` — Section, SliderRow, Toggle, Sub, ModeToggle, Accordion, PointCtrl, LineCtrl, LabelCtrl, useToggleSet hook
- `components/modules/markers.tsx` — NEW first module (defaultOpen=true), replaces old marker-styles.tsx
- `components/modules/stb-routes.tsx` — Rewritten with accordion + LineCtrl
- `components/modules/route-planner.tsx` — Rewritten with Route Settings accordion + waypoints + LineCtrl/PointCtrl per waypoint
- `components/modules/infrastructure.tsx` — Rewritten with accordion + LineCtrl
- `components/modules/borders.tsx` — NEW module: Countries/Judete/Bucuresti nested; replaces old geometry.tsx
- `components/app-sidebar.tsx` — Rewritten; inline styles matching reference; footer: Export/Zoom/PlaceLabels/Style buttons; placeLabels state is local (will lift to page.tsx when Mapbox logic added)

**Why:** Reference file (reference/ro-map-explorer.jsx) defined the final UI. Old UI had different modules (Geometry, MarkerStyles) and missing features (nested Borders, Place Labels toggle, LineCtrl per item).

**How to apply:** Old modules (geometry.tsx, marker-styles.tsx, sidebar-section.tsx, sidebar-header.tsx) are still in components/ but no longer imported. When adding Mapbox logic, follow CLAUDE.md order: MapContext → usePlaceLabels → Borders → Markers → STB → Infrastructure → RoutePlanner → Export.

Also fixed pre-existing issues: chart.tsx recharts types, drawer.tsx missing vaul package, resizable.tsx react-resizable-panels v4 API change (Group/Panel/Separator), form.tsx missing react-hook-form.
