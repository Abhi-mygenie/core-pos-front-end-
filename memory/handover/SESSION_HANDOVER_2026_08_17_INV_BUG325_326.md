# Session Handover — 2026-08-17 (Investigation: BUG-325 + BUG-326)

**Date closed:** 2026-08-17
**Session type:** INVESTIGATION
**Registry total:** 510 items
**Self-assessment — Registry synced:** YES ✅ | **Scope drift:** NONE ✅

---

## Session Arc Summary

| Phase | Role | Output |
|-------|------|--------|
| 1 | INVESTIGATION | BUG-325: Variation Stock `available` field not rendered |
| 2 | INVESTIGATION | BUG-326: `packed_food` legacy key + missing `swiggy_packing_chrg` confirmed |

---

## Last session (2026-08-15): DEPLOYMENT + PLANNING Gates 2+3 × 4 + IMPLEMENTATION × 4 + QA 18/18 PASS + INVESTIGATION (BUG-323 + BUG-324).

---

## Investigation Findings This Session

### BUG-325 — Variation Stock tab: current availability status not shown (P2 | LOW)

**Root cause (HIGH confidence):**
`aggregator-sync/variations` API returns `val.available = false/true` per variation value (API-confirmed 2026-08-17). `VariationStockTab.jsx` renders only `val.label` and `val.optionPrice` — `val.available` is NEVER READ. User sees "En" and "Dis" buttons but no current status badge.

**API proof:** `{"label":"salsa","optionPrice":"0","available":false}` — both "salsa" and "gogo" were `available:false` in test.

**Fix scope:** 1 file — `VariationStockTab.jsx` — add status badge inside values map based on `val.available`. ~8 lines.

**Planning skip eligible:** YES (LOW risk, 1 file, not hotspot, not financial). Needs owner approval.

---

### BUG-326 — Aggregator `is_packaged_good` + `swiggy_packing_chrg` mismatch (P1 | MEDIUM)

**Root cause (HIGH confidence):**
`foods-list?food_for=Aggregator` API-confirmed (2026-08-17):
- `packed_food = null` (legacy key — no longer written by backend)
- `is_packaged_good = 0` (correct new key)
- `swiggy_packing_chrg = "NO"` (new key — completely absent in FE)

**Three-layer failure:**
1. `fromAPI.food()` L116: reads `api.packed_food` (null) → `packedFood` always `false`
2. `toAPI.foodInfo()` L275: sends `packed_food` (wrong key for aggregator)
3. `swiggy_packing_chrg`: not read, not sent, no UI, no state

**Mapping (owner-provided):**
- `is_packaged_good`: 1/0 — yes/y/1/true → 1, else 0
- `swiggy_packing_chrg`: YES/NO — yes/y/1/true → YES, else NO
- Both fields: **aggregator food only**

**Files scope (4):** `menuManagementTransform.js`, `BulkEditor.jsx`, `ProductForm.jsx`, `ProductCard.jsx`

**Planning skip NOT eligible** — full Gate 2-3 required.

---

## Open Items for Next Session

| Priority | Item | Action |
|---|---|---|
| P1 | BUG-325 direct fix (owner approve planning skip) | Owner: "APPROVED" → direct bug fix in VariationStockTab.jsx |
| P1 | BUG-326 Gate 2 Impact Analysis | Owner: send to batch → PLANNING agent Gate 2 |
| P1 | BUG-323 + BUG-324 Gate 4 GO | 1-line fixes each (owner approval pending from last session) |

---

## Evidence Artifacts (this session)
- `/app/memory/evidence/BUG-VAR-STATUS/variations_response.json` — full API response
- `/app/memory/evidence/BUG-VAR-STATUS/foods_list_aggregator.json` — key field audit
- `/app/memory/inv_goan_token.txt` — refreshed 2026-08-17

---

## Docs Updated
- `/app/memory/investigation/BUG-325-326_VARIATION_STOCK_STATUS_AND_PACKING_FIELDS_INV.md` (new)
- `/app/memory/control/registry.json` (BUG-325, BUG-326 added)
- `/app/memory/control/BUG_TRACKER.md` (rows added)
