# CR-354 + BUG-367 + BUG-362 — CLOSURE Phase B QA PLAN
**Date:** 2026-08-31
**Stage:** Gate 3 equivalent — QA Verification Plan (no code changes)
**Execution Order:** #4 — Run as batch after CR-353 + CR-355 implementation complete

---

## Overview
All 3 items have code fully present. No implementation needed. This plan defines the QA steps to formally close each item.

---

## CR-354 — Printer Agent Bill Content Employee Dropdown (G3b)

**Precondition:** Logged in as owner@18march.com or owner@shimlaqohfoodcourt.com

| # | Step | Expected |
|---|---|---|
| 1 | Settings → All Settings → Printers → Printer Agent | PrinterAgentConfigView loads |
| 2 | Click Bill Content tab | Tab renders without error |
| 3 | Observe employee dropdown | "Printer Agent Employee" section visible; select dropdown populated with employees |
| 4 | Select an employee | Dropdown updates selection |
| 5 | Click Save Changes | Network: POST printer-agent-config includes employee_id field |
| 6 | Reload page → return to Bill Content | Previously selected employee still shown |

**Pass criteria:** Employee dropdown renders + saves + persists.

---

## BUG-367 — Printer Agent Print Style Value Snaps to 0 (G4)

**Precondition:** Printer Agent → Print Style tab open

| # | Step | Expected |
|---|---|---|
| 1 | Find any numeric field (e.g., 58mm font size for Restaurant Header row) | Shows current value |
| 2 | Triple-click to select all, delete (clear the field) | Field clears — value shows empty string, no snap to 0 |
| 3 | Type a new value (e.g., "12") | Field accepts typing normally |
| 4 | Click away (blur) | Value stays at 12 — no snap |
| 5 | Clear field again and click away without typing | Field snaps to minimum valid value (e.g., 0) — not to negative or blank |
| 6 | Test Android Logo Size field (BUG-317 regression) | Can enter values > 8 (verify BUG-317 not regressed) |

**Pass criteria:** Clear-and-retype works; blur clamps correctly; no snap to 0 mid-typing.

---

## BUG-362 — AutoPrint Tab Copies Snap Back to 1 (G1)

**Precondition:** Printer Agent → Auto Print tab open

| # | Step | Expected |
|---|---|---|
| 1 | Find "Bill Copies" or "KOT Copies" numeric input | Shows current value (e.g., 1) |
| 2 | Clear the field | Field clears — no snap to 1 |
| 3 | Type "3" | Field shows 3 |
| 4 | Click away (blur) | Value stays at 3 — does NOT snap back to 1 |
| 5 | Save Changes | Saved; reload → copies = 3 |

**Pass criteria:** Copies input allows editing without snap-back; persists after save.

---

## Registry Actions (after all 3 pass)
- [ ] registry.json: CR-354, BUG-367, BUG-362 → status: CLOSED — OWNER VERIFIED (retroactive)
- [ ] BUG_TRACKER.md: rows updated
- [ ] CR_REGISTRY.md: CR-354 updated
