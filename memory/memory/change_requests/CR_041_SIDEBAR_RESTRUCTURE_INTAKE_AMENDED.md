# CR-041 — Sidebar Restructure (Amended Intake)

**ID:** CR-041
**Title:** Sidebar Restructure: Reorder, Rename, Panel→Route Migration, Settings Consolidation
**Priority:** P2
**Risk:** MEDIUM
**Sprint:** POS 5.0
**Source:** OWNER-REPORTED (iterative discussion 2026-06-17)
**Confidence:** CONFIRMED
**Duplicate check:** DISTINCT (BUG-136 sidebar scroll is related, already implemented)
**Blast radius:** MEDIUM — 3 core files modified + 4 new page wrappers. 43 files import Sidebar but zero changes needed in report screens.
**Code Reality:** NONE

---

## Amended Scope (v5 — owner-confirmed 2026-06-17)

### Final Sidebar Order

```
Dashboard
Day Closure                    ← RENAMED from "Settlement" (existing panel → route)
Menu Management                ← panel → route
Credit Management              ← panel → route
Daily Report                   ← RENAMED from "Order Reports"
  ├── Sales Summary            ← RENAMED from "Daily Summary"
  ├── Order Report             ← RENAMED from "Daily Report" / Audit
  ├── Item Report              ← NEW (TBD — owner to specify)
  └── Settlement Report        ← MOVED from Insights module
Settings
  ├── Restaurant Setup         ← MOVED from top-level
  ├── Table Management         ← Settings Panel tile shortcut
  ├── Printers                 ← Settings Panel tile shortcut
  ├── Operating Hours          ← Settings Panel tile (API in restaurant profile)
  ├── Cancellation Reasons     ← Settings Panel tile (endpoint TBC during Impact Analysis)
  ├── Employee Management      ← NEW (endpoint TBD from owner)
  ├── Dashboard Display        ← MOVED from "Visibility Settings" / StatusConfigPage
  └── All Settings             ← full 12-tile Settings Panel
Insights                       ← LAST in sidebar (26 sub-screens, no change)
```

### Changes Summary

| Type | Details |
|---|---|
| **Renames (4)** | Settlement→Day Closure, Order Reports→Daily Report, Daily Summary→Sales Summary, Daily Report (Audit)→Order Report |
| **Panel→Route (4)** | Menu Mgmt `/menu`, Credit Mgmt `/credit`, Day Closure `/day-closure`, Settings `/settings` |
| **Moves (3)** | Settlement Report→under Daily Report, Restaurant Setup→under Settings, Visibility Settings→under Settings as "Dashboard Display" |
| **New parent** | Settings with 8 children |
| **Full reorder** | Entire sidebar restructured per above |
| **New items (TBD)** | Item Report (under Daily Report), Employee Management (under Settings) — both pending owner endpoint/spec |
| **Removals** | Orders parent (already hidden), standalone Restaurant Setup, standalone Visibility Settings |

### Investigation Items for Impact Analysis

1. **Operating Hours** — owner says endpoint is in Restaurant Setup API. Verify field mapping.
2. **Cancellation Reasons** — verify if endpoint exists and where.
3. **Settings Panel 12 tiles vs Restaurant Setup 6 steps** — full field mapping to confirm coverage/gaps.
4. **Settlement Report route** — currently under `/reports-module/settlement` in Insights. Moving to Daily Report children requires route/sidebar wiring change.

### Open Questions

- Q-041-1: **Item Report** — owner to specify what content goes here
- Q-041-2: **Employee Management** — owner to provide endpoint
- Q-041-3: **Cancellation Reasons** — confirm endpoint availability

---

*Intake amended 2026-06-17. Original CR-041 (Gate 2, 2026-06-15) scope expanded. Ready for amended Impact Analysis.*
