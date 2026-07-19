# Impact Analysis — Menu Type Field Cluster (BUG-140 + BUG-141)

**Document:** MENU_TYPE_CLUSTER_IMPACT_ANALYSIS_2026_07_04.md
**Gate:** 2 (Impact Analysis only — no Implementation Plan yet)
**Author:** PLANNING agent (session 2026-07-04)
**Items:** BUG-140 (Bulk Editor Type doesn't save) + BUG-141 (Excel Import Type not captured)
**Sprint:** POS 5.0
**Risk (aggregate):** MEDIUM (single-file transform fix, but write/read asymmetry sits on a menu-data hotspot)

---

## 0. Header — Code Reality + Conflict Pre-Check

| Item | Code Reality | Conflict Pre-Check |
|---|---|---|
| BUG-140 | PARTIAL — save path already writes both `item_type` and `veg` to backend (BulkEditor L157-159, added by BUG-125-B). Dirty tracking works (L263). Suspected root cause: **read-back mismatch** in transform. | `menuManagementTransform.js` last touched by CR-036 series (menu columns) + BUG-125-B (write side). No open agent on file. |
| BUG-141 | PARTIAL — import uploads xlsx → backend parses → returns counts → `onRefresh()` re-fetches menu → transform maps API to rows. Same read-back path as BUG-140. Likely **same root cause**. | Same file, same lack of conflict. |

---

## 1. Root-Cause Hypothesis (H1) — one bug, two symptoms

Verified in code (2026-07-04):

**Write side (BulkEditor.jsx `buildPayload`, L157-159):**
```
item_type: Number(row.itemType),
// BUG-125-B: Backend reads `veg` not `item_type` for food type persistence
veg: Number(row.itemType),
```
Both fields are sent on every save. Comment on L158 explicitly states backend PERSISTS via `veg`.

**Read side (menuManagementTransform.js L57-60):**
```
isVeg:   Number(api.item_type) === 1,
hasEgg:  Number(api.item_type) === 2,
isJain:  Number(api.item_type) === 3,
itemType: Number(api.item_type) || 0,
```
All four fields read from `api.item_type` — **never** from `api.veg`.

**Hypothesis:** Backend accepts writes on either field but the READ endpoint returns the authoritative value on `veg`, leaving `item_type` empty / stale / defaulted. Transform reads `item_type` → falls back to `0` (Non-Veg) → user sees the value revert on refresh, appearing to "not save" (BUG-140) or "not import" (BUG-141).

**Confidence:** HIGH given the write-side comment ("Backend reads `veg` not `item_type`"). Must confirm with curl-probe before Gate 3 (R11).

---

## 2. Data-Flow Trace

```
Bulk Editor cell edit
     ↓ (updateCell L349)
setRows → dirty flag TRUE (L263 check works)
     ↓
handleSave (L433)
     ↓
buildPayload → payload has BOTH item_type + veg (L157-159)
     ↓
menuService.editFood(id, payload)   ← R11 endpoint
     ↓
[BACKEND persists → `veg` column authoritative]
     ↓
onRefresh() fires 500ms later (L538)
     ↓
menuManagementService.list()   ← R11 endpoint
     ↓
Backend returns each food record with `veg` populated, `item_type` may be stale/empty
     ↓
menuManagementTransform.fromAPI (L60)  ← reads api.item_type ONLY
     ↓
transformed food.itemType = 0 (stale/default)
     ↓
[foods] prop changes → useEffect L215 → setRows(foods.map(buildRow))
     ↓
row.itemType = 0 (reverts) → UI shows Non-Veg → owner reports "didn't save"
```

Excel-import flow (BUG-141) follows the same tail from `onRefresh()` onward.

---

## 3. Files WILL Change (if H1 confirmed)

| # | Path | Nature | Reason |
|---|---|---|---|
| 1 | `api/transforms/menuManagementTransform.js` | Modify — 4 lines (L57-60) | Read `veg` as the source of truth, fall back to `item_type` for backward compat |

That's the entire code change if the hypothesis holds. Everything else (save payload, dirty check, Excel-import upload flow, refresh flow) is already correct.

## 4. Files WILL NOT Touch

- `components/panels/menu/BulkEditor.jsx` — write side already correct.
- `api/services/menuManagementService.js` — service already forwards field names cleanly.
- `components/panels/menu/ProductForm.jsx` — single-add view uses a different write path (`toAPI` in transform L249-251, also sends both fields); read may share the same transform hit — will benefit from the same fix.
- Backend — no FE agent scope.
- Any financial / order / discount / print / socket file — untouched.

If the curl-probe disproves H1 (see §5), scope will re-open and we STOP per R14.

---

## 5. R11 Curl-Probe (REQUIRED before Gate 3)

Two probes needed on a preprod restaurant with a known food id:

### P1 — GET menu list, inspect Type field shape
```
GET /api/menu/list        (or the exact path from menuManagementService.list)
```
**Look for:** does each food object have `veg`, `item_type`, or both? What are their values for a known Veg item?

### P2 — Edit a food's Type, save, then re-fetch
1. `POST /api/menu/edit/{id}` with `{ item_type: 1, veg: 1, …name/price… }` (Veg)
2. `GET /api/menu/list` → find same food
3. Compare returned `veg` vs `item_type`

**Expected outcomes:**
- (a) `veg=1`, `item_type=1` → both correct → hypothesis WRONG → open new investigation
- (b) `veg=1`, `item_type=0` → hypothesis CONFIRMED → apply §3 fix
- (c) `veg=0`, `item_type=0` → backend not persisting either → different bug, BACKEND-BLOCKED
- (d) `veg=1`, `item_type=missing` → hypothesis CONFIRMED (same fix, but note the field-shape difference in transform)

**Cannot proceed to Gate 3 without at least outcome (b) or (d).** Owner to provide preprod credentials or approve backend-team probe.

---

## 6. Excel Import (BUG-141) — additional consideration

Since the read-back path is shared, fixing §3 fixes BUG-141 too — but ONLY if backend's Excel parser writes to `veg` on import (as it does on edit).

**One additional probe needed:**
### P3 — Import a small xlsx with one Veg + one Non-Veg row, re-fetch
1. Prepare 2-row xlsx via "Download Template" (BulkEditor L728).
2. Set Type column: one "Veg", one "Non-Veg".
3. Upload via Import.
4. `GET /api/menu/list` → check the two imported items.

**Expected:** both `veg` and `item_type` populated correctly → H1 fix applies universally.
**If mismatch:** possible the backend Excel parser writes ONLY to `item_type` (opposite of edit endpoint) → transform fix must handle both directions gracefully. The proposed change (`veg ?? item_type`) already does — reads whichever the backend populates.

---

## 7. Downstream Consumers of `itemType`, `isVeg`, `hasEgg`, `isJain`

Impact of changing the read source in the transform ripples to every consumer of these 4 derived fields. Located via grep:

| Consumer | File | Impact |
|---|---|---|
| Menu Bulk Editor (Type dropdown, dot color) | `BulkEditor.jsx` L94, L1023 | Fix makes UI reflect saved value correctly — the bug's own fix |
| Product Form single-add / edit | `ProductForm.jsx` (uses `isVeg/hasEgg/isJain` shape) | Fix makes single-add form show correct value |
| Menu Panel item list (green/red/etc. dot) | `ProductList.jsx` | Same benefit — dots reflect saved value |
| Order Entry item search | `OrderEntry.jsx` (reads `isVeg` for veg filter chip) | Improves veg-filter accuracy |
| POS reports (Item Sales, Tax Slabs) | `pages/reports-module/**Mockup.jsx` | Reports read via `insightsService`, separate path — no impact |

No financial (R6) surface downstream — the field only drives display + filter, not price / tax computation. Confirmed by scanning `orderTransform.js` and `CollectPaymentPanel.jsx` — no `itemType`-gated math.

---

## 8. Aggregate Risk

**MEDIUM.** Rationale:
- Single-line-per-field change in one transform file — SMALL blast.
- Menu data hotspot — the read hits every food consumer, so any typo could ripple.
- No financial touch (no R6).
- Regression risk: if backend returns BOTH `veg` and `item_type` but they DISAGREE (data drift from historic records), the new "veg-first" read could flip existing displayed values. Curl-probe P1 covers this: if the two fields ever disagree we STOP and file BACKEND-BLOCKED.

---

## 9. Scope-Lock Declaration

**Files WILL change:** `api/transforms/menuManagementTransform.js` (4 lines).
**Files WILL NOT touch:** BulkEditor.jsx, ProductForm.jsx, ProductList.jsx, menuManagementService.js, backend, any print/order/finance/socket file.

If Planning discovers scope must expand at Gate 3 (e.g. backend Excel path writes only `item_type`), STOP and re-declare per R14.

---

## 10. Owner Decisions Required Before Gate 3

1. **Curl-probe access:** provide preprod credentials for the 3 probes in §5-§6, OR approve a backend-team probe with the same 3 tests. Without this, Gate 3 is BLOCKED.
2. **Read-fallback policy:** if H1 is confirmed, is it OK to change the read source from `item_type` to `veg ?? item_type` (veg-first with fallback)? This mildly changes the field-precedence contract — I recommend YES, since the write side already treats `veg` as authoritative.
3. **Historic-data drift:** if the two fields disagree on old records (P1 outcome), do we:
   - (a) Trust `veg` unconditionally (may flip old display values on refresh — RECOMMENDED, matches the current write contract)
   - (b) File a one-off backend data-migration ticket, hold FE fix until aligned
   - (c) Prefer `item_type` (keeps historic display stable, but new saves via BulkEditor may not "stick" on Non-veg records where `veg` was set explicitly)

---

## 11. Sequencing / Estimated Effort

Given the small scope, Gate 3 for this cluster produces:
- 1 line-by-line edit table (transform L57-60 before/after)
- 1 unit test file (`menuManagementTransform.test.jsx`) — 3-4 cases covering the veg/eggs/jain/non-veg mapping with mixed `veg`+`item_type` field shapes
- 1 QA scenario: edit → save → refresh cycle for each of the 4 types on Bulk Editor + Excel import round-trip for at least one Veg row
- Registry checklist

**Estimated coding effort:** 15 minutes.
**Estimated test writing:** 20 minutes.
**Curl-probe (owner side):** 5 minutes if preprod access exists.

**No planning dependency on the OrderCard cluster** — completely independent code path. Can be coded and shipped in the same implementation session as OrderCard, or separately.

---

## 12. Alternate Hypothesis (H2) — kept for completeness

If the curl-probe disproves H1 (both fields return the same value), the next suspects are:

- **H2a:** Backend `editFood` endpoint silently ignores the payload's `item_type`/`veg` when the food ID doesn't match a specific record type — need per-food-type probing.
- **H2b:** `onRefresh()` timing race — 500ms delay (L538) too short, refresh fires before backend commit is durable → returns pre-save data → row reverts. Fix: use socket-driven refresh or 1500ms.
- **H2c:** BulkEditor's `useEffect L215` runs when `foods` prop reference changes even if content is identical → resets rows to `_original`. Would explain BUG-140 but not BUG-141.

H1 is my top hypothesis by a wide margin because the write-side comment (L158) explicitly documents the field-name asymmetry — but keeping H2 on file so the Gate-3 curl-probe can distinguish them cleanly.

---

**End of Impact Analysis — 2026-07-04**
