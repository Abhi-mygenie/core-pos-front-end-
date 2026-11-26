# Session Handover — BUG-684 Implementation
**Date:** 2026-11-18
**Agent:** Implementation Agent (Role 3)
**Gate completed:** Gate 5a — Implementation + Self-Test + EXIT GATE

---

## What was done this session

**BUG-684** — Cart "Collect Bill" button showed ₹1 wrong (11% of orders, restaurant 672 confirmed).

**Root causes fixed (2 defects, 1 file):**
1. Local `applyRoundOff` in `OrderEntry.jsx` was **inverted** vs the CR-170 shared rule — tested `(ceil - raw) ≥ 0.10` (distance up) instead of paise part directly.
2. Per-item tax accumulated as raw floats in `localTax` / `unplacedTax` reducers — paise drift of 0.005 near boundaries.

**5 edits applied to `src/components/order-entry/OrderEntry.jsx`:**

| Edit | Location | Change |
|------|----------|--------|
| E1 | L17 | Import `applyGrandTotalRoundOff` from `roundOffUtils.js` |
| E2 | L1155–1156 | `localTax` reducer: round each item's tax to 2dp before summing |
| E3 | L1171–1172 | `unplacedTax` reducer: same fix |
| E4 | L1193–1196 | Delete inverted `applyRoundOff`; add `roundOffEnabled` const |
| E5 | L1225, L1227 | Wire both call sites to `applyGrandTotalRoundOff(raw, roundOffEnabled)` |

---

## Self-test results

- Node math check: 123.81 + 114.29 @ 5% GST → button = **₹250** ✅ (was ₹251)
- `grep applyRoundOff OrderEntry.jsx` → **0 hits** ✅
- `grep applyGrandTotalRoundOff OrderEntry.jsx` → **3 hits** (import + 2 call sites) ✅
- Webpack: **`compiled with 1 warning`** — same pre-existing lint warning, 0 new ✅

---

## EXIT GATE results

| # | Check | Result |
|---|-------|--------|
| □1 | Registry sync | ✅ BUG-684 → IMPLEMENTED, nov_cr_batch |
| □2 | BUG_TRACKER.md | ✅ Row updated to IMPLEMENTED |
| □3 | FILE_OWNERSHIP.md | ✅ Entry added for BUG-684 2026-11-18 |
| □4 | Code markers | ✅ 7 × `// BUG-684` comments in file |
| □5 | Compile check | ✅ 0 new warnings |

---

## What's next

**Gate 5b — QA** (browser verification required — no credentials in this environment):
- QA Handover doc: `memory/handover/QA_HANDOVER_BUG-684_2026-11-18.md`
- Key test: restaurant 672 (or any with `total_round=Yes`), two items 123.81 + 114.29 @ GST 5% → Collect Bill button must show **₹250**
- Run unit tests: `npx craco test --watchAll=false --testPathPattern=round001`

---

## Preserved state

- `.env` and `.emergent/` are intact
- Local branch: `main` at `85a7f30f` + uncommitted working-tree changes (the 5 edits above)
- BUG-684 bundle files placed at:
  - `memory/evidence/BUG-684-bundle/` (all 8 files from zip)
  - `memory/plans/BUG-684_IMPLEMENTATION_PLAN.md`
  - `memory/impact/BUG-684_IMPACT_ANALYSIS.md`
