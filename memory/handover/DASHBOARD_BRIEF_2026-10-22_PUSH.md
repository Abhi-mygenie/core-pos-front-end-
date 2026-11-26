# Dashboard Brief — POS registry push (2026-10-22)

**From:** POS agent · **Sheet:** REGISTRY_EXPORT (CTO) · **Push result:** 956 items, all 10 tabs, **0 drift**

## TL;DR
Registry grew 937 → **956** (+19 new CRs). SMOKE grew to **247**. Summary now counts
from the **All Items** tab (not the registry), so its totals match the tab exactly.
Nothing was deleted; no tab renamed; the "Neo " tab was intentionally kept.

## What changed in this push

### 1. 19 new CRs registered — CR-450 → CR-468 (all on the **Smoke** tab)
External **Old POS** team work (separate codebase), team status DONE, awaiting owner smoke.
Status = `GATE_6_AWAITING_OWNER_SMOKE`. P1 ones (money/permission/tax): **CR-459** (Room payment),
**CR-461** (Catalog/Master Reset, owner-gated), **CR-463** (Settlement employee gate),
**CR-464** (prepaid without Clear-Payment role), **CR-465** (Room GST). Rest P2/P3.

### 2. 6 items moved INTAKE → SMOKE
BUG-468, BUG-558, BUG-550, BUG-577, BUG-466, BUG-478 — external-team/printer-agent items,
now `GATE_6_AWAITING_OWNER_SMOKE` with a dated note explaining each (see Notes col U).

### 3. Status corrections → now show **PLANNING** (were wrongly on Closed tab)
BUG-600 & BUG-579 `GATE_2_CLOSED` → `GATE_2_COMPLETE`; BUG-598-B `INVESTIGATION_COMPLETE` → `GATE_2_PLANNING`.
Cause: the word "CLOSED" inside `GATE_2_CLOSED` was mis-read. Mapper now guards the exact `GATE_N_CLOSED` token.

### 4. Priorities & blocks (owner's sheet edits applied to registry = law)
→ P0: CR-043, BUG-598-B, BUG-602, BUG-603, BUG-604, CR-447, BUG-606, CR-448, CR-449.
→ Blocked on = BACKEND: CR-443, CR-444, CR-445, CR-446, CR-447, CR-448, CR-449, BUG-598-B, BUG-605, BUG-606.

### 5. Area cleanup
13 blank-area items + 53 `Other` items reclassified into the 13 modules; only **9** stay `Other`
(sidebar/nav/training). 11 new CR-443→449/BUG-605→608 got `from TT-NNN` provenance in Notes.

### 6. Summary tab
Now derived from the **All Items** tab values (owner-added rows included). INTAKE shows 92 =
All Items INTAKE 92 (the old 92-vs-93 mismatch is gone).

## Current status distribution (All Items)
INTAKE 85 · PLANNING 13 · IMPLEMENTED 111 · QA 162 · **SMOKE 247** · CLOSED 309 · PARKED 26 · DUPLICATE 3 · Unrouted 0

## Dashboard action needed
- None required. Re-read the sheet and re-render. Expect **+19 CR rows** and a larger **Smoke** list.
- The 19 Old-POS CRs are NOT this app's codebase — label/group as **Old POS** if the dashboard distinguishes.
