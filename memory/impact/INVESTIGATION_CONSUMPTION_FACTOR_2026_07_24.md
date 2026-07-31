# Investigation Report — Consumption Factor vs Conversion Unit Payload Gap

**Date:** 2026-07-24
**Classification:** CONTRACT_MISMATCH
**Confidence:** HIGH (curl-verified + code-traced + backend contract doc)
**Steps used:** 8/10
**Items affected:** Inventory add/edit ingredient flow

---

## 1. Summary

The FE inventory module sends `small_unit` + `converion_factor` in add/update ingredient payloads, but the backend's G-020 conversion logic requires `consumption_unit` + `converion_factor`. The field `small_unit` is legacy/display-only per the backend contract — it is **not** used for conversion. This means:

- **Adding ingredients with a conversion factor will fail (422)** if backend enforces G-020 validation
- **The FE has no form field for `consumption_unit`** — users cannot enter the value the backend requires

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|---------|
| 1 | FE might already send `consumption_unit` | Code grep for `consumption_unit` in toAPI | 1 | **ELIMINATED** | Zero hits in any toAPI function |
| 2 | FE might use `smallUnit` as a proxy for `consumption_unit` | Code trace: form → transform → payload | 2 | **CONFIRMED** | Form field `smallUnit` maps to `small_unit` in payload, not `consumption_unit` |
| 3 | Backend might accept `small_unit` as fallback for `consumption_unit` | Backend contract doc | 1 | **ELIMINATED** | Doc says: "small_unit: Legacy/display only. Do not use for conversion." |
| 4 | `consumption_unit` might be mapped in fromAPI but never written back | Code trace | 1 | **CONFIRMED** | `fromAPI.ingredients()` L20: maps `consumption_unit` → `consumptionUnit`. But toAPI never sends it back. |

---

## 3. Data Flow Trace

```
BACKEND SENDS (GET /get-inventory-master):
  item.unit = "bundle"
  item.small_unit = "piece"           ← LEGACY, display only
  item.consumption_unit = null         ← G-020 field (not populated yet)
  item.consumption_unit_id = null
  item.converion_factor = null         ← R9 typo in key name
  item.has_unit_conversion = false

    ↓ fromAPI.ingredients() (inventoryTransform.js L8-31)

FE STATE:
  unit = "bundle"
  smallUnit = "piece"                 ← mapped from small_unit
  consumptionUnit = ""                ← mapped from consumption_unit (null → '')
  conversionFactor = 1                ← mapped from converion_factor (null → default 1)
  hasUnitConversion = false

    ↓ InventorySetupPanel form (L25-28)

FE FORM (user edits):
  unit = "bundle"
  smallUnit = "piece"                 ← user sees this as "conversion target"
  conversionFactor = "10"             ← user enters: 1 bundle = 10 pieces
  (NO consumptionUnit input field)

    ↓ toAPI.addIngredient() (inventoryTransform.js L128-137)

PAYLOAD SENT TO BACKEND:
  {
    category_id: 1444,
    stock_title: "Redys",
    unit: "bundle",
    small_unit: "piece",              ← WRONG: backend ignores for conversion
    converion_factor: "10",           ← SENT without consumption_unit
    ❌ consumption_unit: MISSING       ← BACKEND REQUIRES THIS FOR G-020
  }

BREAK POINT: ^^^
  Backend G-020 validation → 422 CONSUMPTION_UNIT_REQUIRED
```

---

## 4. Gap Analysis (5 Gaps)

### GAP 1 — `consumption_unit` missing from add/update payloads (CRITICAL)
- **File:** `inventoryTransform.js` → `toAPI.addIngredient()` (L128-137) + `toAPI.updateIngredient()` (L141-152)
- **Issue:** Neither function includes `consumption_unit` in the payload
- **Impact:** Backend 422 error when `converion_factor` is provided without `consumption_unit`
- **Fix scope:** Add `consumption_unit: data.consumptionUnit || ''` to both functions (conditional: only when conversion is intended)

### GAP 2 — FE form has no `consumptionUnit` input field (CRITICAL)
- **File:** `InventorySetupPanel.jsx` (L25, L28)
- **Issue:** Form state only has `{ name, categoryId, unit, smallUnit, conversionFactor, minQtyAlert, minUnitAlert }` — no `consumptionUnit`
- **Impact:** Users cannot enter the consumption unit that the backend requires
- **Fix scope:** Add a `consumptionUnit` input field alongside the conversion factor input, OR repurpose `smallUnit` → `consumptionUnit` if business logic allows

### GAP 3 — `small_unit` sent as if it drives conversion (MISLEADING)
- **File:** `inventoryTransform.js` L132, L146
- **Issue:** FE sends `small_unit` in payload and uses it in the conversion factor label: `"1 ${unit} = ? ${smallUnit}"`
- **Backend reality:** `small_unit` is "Legacy/display only. Do not use for conversion."
- **Impact:** Users think they're setting conversion, but `small_unit` is ignored by backend's conversion logic
- **Fix scope:** Either (a) repurpose `smallUnit` → `consumption_unit` in toAPI, or (b) add a separate `consumptionUnit` field

### GAP 4 — `converion_factor` defaults to `1` always (MINOR)
- **File:** `inventoryTransform.js` L136, L147
- **Issue:** `converion_factor: String(data.conversionFactor || 1)` — always sends `"1"` even when no conversion intended
- **Impact:** Sends `converion_factor: "1"` without `consumption_unit` → may trigger G-020 validation on backend
- **Fix scope:** Only send `converion_factor` when a conversion is explicitly set (factor > 1 AND consumptionUnit provided)

### GAP 5 — `fromAPI` maps `consumptionUnit` but it's never used in forms (LOW)
- **File:** `inventoryTransform.js` L20-21
- **Issue:** Backend data `consumption_unit` → `consumptionUnit` is mapped in FE state but never rendered in form or sent back
- **Impact:** If a backend admin sets `consumption_unit` directly, the FE reads it but can't display or edit it
- **Fix scope:** Wire `consumptionUnit` from ingredient data → edit form → toAPI payload

---

## 5. Recommended Fix (2 approaches)

### Approach A — Minimal: Repurpose `smallUnit` as `consumption_unit` (LOW risk)
If `small_unit` and `consumption_unit` are meant to be the same concept (just renamed in backend):
1. In `toAPI.addIngredient()`: send `consumption_unit: data.smallUnit || ''` alongside `converion_factor`
2. In `toAPI.updateIngredient()`: same
3. Only send `converion_factor` when `smallUnit` is provided AND differs from `unit`
4. No form changes needed — `smallUnit` input already exists

**Risk:** LOW — if backend truly treats them as same concept. **Needs owner confirmation.**

### Approach B — Full: Add separate `consumptionUnit` field (MEDIUM risk)
1. Add `consumptionUnit` to form state in InventorySetupPanel
2. Add input field for consumption unit (separate from smallUnit)
3. Wire to toAPI: `consumption_unit: data.consumptionUnit`
4. Conditionally send `converion_factor` only when `consumptionUnit` is set
5. Keep `small_unit` as legacy display-only

**Risk:** MEDIUM — more form changes, needs design decision.

---

## 6. Owner Decision Required

| # | Question | Options |
|---|----------|---------|
| Q1 | Is `small_unit` the same concept as `consumption_unit`? | YES → Approach A / NO → Approach B |
| Q2 | Should we always send `converion_factor: 1` (current) or only when conversion is active? | Always / Only when set |
| Q3 | Should the existing `smallUnit` form field be relabeled to "Consumption Unit"? | YES / NO |

---

## 7. Evidence Artifacts

- Backend contract: `add_inventory_payload_frontend.md` (user-provided)
- Code: `inventoryTransform.js` L128-152 (toAPI), L8-31 (fromAPI)
- Code: `InventorySetupPanel.jsx` L25-28, L286-287 (form fields)
- Curl: `GET /get-inventory-master` → all 106 items have `consumption_unit: null`, `converion_factor: null`
- Curl: `GET /get-recipe` → recipe ingredients have no factor/consumption fields

---

```
Root cause: CONTRACT_MISMATCH — FE sends small_unit + converion_factor, backend G-020 requires consumption_unit + converion_factor.
Confidence: HIGH
Steps: 8/10
FE fix: YES — 1 file (inventoryTransform.js toAPI only — ~4 lines)
Backend ask: NO — backend contract is correct per the MD doc
Fast Lane eligible: NO — transform file change (condition #4 fails)
Planning skip eligible: NO — transform change requires full gate cycle
Retroactive candidates: NONE
Investigation report: /app/memory/impact/INVESTIGATION_CONSUMPTION_FACTOR_2026_07_24.md
```

---

## 8. Fast Lane Assessment

| # | Condition | Pass? |
|---|-----------|:---:|
| 1 | Owner approval | ⬜ |
| 2 | 1 file only | ✅ `inventoryTransform.js` |
| 3 | ≤10 lines | ✅ ~4 lines |
| 4 | No transform change | ❌ **FAILS — toAPI is a transform** |
| 5 | Not R5 hotspot | ✅ |
| 6 | Not financial | ✅ |
| 7 | No FILE_OWNERSHIP conflict | ✅ |

**Result: NOT FAST LANE ELIGIBLE.** Transform changes require full gate flow.

---

## 9. Revised Fix Scope (Simplified — No Form Changes)

After deeper analysis, the fix is **1 file, ~4 lines** — no form UI changes needed because:
- `smallUnit` form field already collects the value the backend needs as `consumption_unit`
- We just need to **send it under the correct key** in toAPI
- No new form field needed (owner Q1/Q2 from §6 resolved: repurpose `smallUnit` → `consumption_unit`)

### Exact Edits:

**File:** `inventoryTransform.js`

**Edit 1 — `addIngredient` (L128-137):**
```diff
  return [{
    category_id: data.categoryId,
    stock_title: data.name,
    unit: data.unit,
    small_unit: data.smallUnit || '',
+   consumption_unit: data.smallUnit || '',
    minimun_stock_alert: String(data.minQtyAlert || 0),
    min_unit_alert: data.minUnitAlert || '',
-   converion_factor: String(data.conversionFactor || 1),
+   ...(data.smallUnit && data.conversionFactor ? { converion_factor: String(data.conversionFactor) } : {}),
  }];
```

**Edit 2 — `updateIngredient` (L141-152):**
```diff
  return {
    stock_title: data.name || '',
    category_id: data.categoryId,
    unit: data.unit || '',
    small_unit: data.smallUnit || '',
+   consumption_unit: data.smallUnit || '',
-   converion_factor: String(data.conversionFactor || 1),
+   ...(data.smallUnit && data.conversionFactor ? { converion_factor: String(data.conversionFactor) } : {}),
    minimun_stock_alert: String(data.minQtyAlert || 0),
    min_unit_alert: data.minUnitAlert || '',
    reason: 'update',
  };
```

### Why this works:
- `consumption_unit` sent from existing `smallUnit` form value → backend G-020 satisfied
- `converion_factor` only sent when BOTH `smallUnit` and `conversionFactor` are provided → no orphan field
- Existing UI unchanged — users already fill `smallUnit` + `conversionFactor` together
- `small_unit` kept for backward compat (legacy display)

---

## 10. Recommended Next Step

**Full gate cycle required:**
1. ~~Investigation~~ ✅ DONE
2. → **PLANNING (Gate 2-3):** Write Impact Analysis + Implementation Plan for this 1-file fix
3. → **Gate 4 GO** from owner
4. → **IMPLEMENTATION**
5. → **QA**
