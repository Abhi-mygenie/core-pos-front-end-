# CR-149 — Remove Coming-Soon Settings Tiles (Printers, Operating Hours, Cancellation Reasons)

**Type:** Change Request (UI Cleanup)
**ID:** CR-149
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner wants to remove three settings tiles that currently show "Coming Soon" placeholders:
1. **Printers** — `id: "printers"`, `PrintersView`
2. **Operating Hours** — `id: "operating-hours"`, `OperatingHoursView`
3. **Cancellation Reasons** — `id: "cancellation-reasons"`, `CancellationReasonsView`

These features are not yet ready and showing them confuses users. Owner wants them hidden/removed until they are production-ready.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings Panel |
| Priority | P2 |
| Severity | LOW-MEDIUM — no business logic affected; UX clarity improvement |
| Risk | LOW (UI-only, no data/API change) |
| Fast Lane | POSSIBLE (3 items removed from 1 file) — needs owner FAST LANE APPROVED |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Steps to reproduce: Open Settings → observe Printers / Operating Hours / Cancellation Reasons tiles with "Coming Soon" state
- Confidence: REPORTED

## Code Reality Check

```bash
# SettingsPanel.jsx:
  line 11: import { OperatingHoursView, ..., PrintersView, CancellationReasonsView } from "./settings/ListFormViews";
  line 20: { id: "operating-hours", label: "Operating Hours", icon: Clock }
  line 24: { id: "printers", label: "Printers", icon: Printer }
  line 25: { id: "cancellation-reasons", label: "Cancellation Reasons", icon: Ban }
  line 36: "operating-hours": OperatingHoursView
  line 40: "printers": PrintersView
  line 41: "cancellation-reasons": CancellationReasonsView
```

- **Code reality: FULL** — all three tiles are actively rendered; need to be removed from SETTINGS_TILES array and DETAIL_VIEWS map
- Primary file: `src/components/panels/SettingsPanel.jsx`
- Secondary: `src/components/panels/settings/ListFormViews.jsx` (imports can be cleaned up)

## Blast Radius

- ~6 lines in SettingsPanel.jsx (SMALL)
- Hotspot files: SettingsPanel.jsx only
- Estimated scope: SMALL (1-2 files, ~10 lines)

## Expected Behavior

- Settings panel no longer shows Printers, Operating Hours, or Cancellation Reasons tiles
- No broken routes or import errors after removal

## Owner Decisions Needed

1. Should the underlying view components (`PrintersView`, `OperatingHoursView`, `CancellationReasonsView`) also be deleted from `ListFormViews.jsx`, or just hidden from the menu?
   - Recommendation: hide from menu only (keep code in case features are enabled later)

## Duplicate Check

RELATED to BUG-315-319 (printer/CR gaps investigation) — but that was a different scope (printer agent config). This CR is about hiding the settings tiles only.

---

**Next:** Planning Gate 2 — Fast Lane eligible if owner approves (1 file, ≤10 lines)
