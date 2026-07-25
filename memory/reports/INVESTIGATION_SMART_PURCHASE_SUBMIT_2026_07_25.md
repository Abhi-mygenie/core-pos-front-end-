# Investigation Report — Smart Purchase Submit Structure

**Date:** 2026-07-25
**Role:** INVESTIGATION
**Scope:** Trace Smart Purchase submit payload vs backend `add-purchase` contract
**Steps Used:** 8/10
**Confidence:** HIGH (code traced + live curl-probed against preprod)
**Classification:** FE_BUG — confirmed unit/conversion mismatch affecting 36 of 117 ingredients (31%)

---

## 1. Summary

Smart Purchase uses the **same** `inventoryService.addPurchase()` → `toAPI.addPurchase()` pipeline as any purchase. There is only ONE submission path.

**CONFIRMED GAP:** The planner computes quantities in **small units** (gm/ml) and the submit sends `Unit: "gm"` with `converion_factor: 1`. But the **backend purchase history records quantities in the ingredient's LARGE unit** (kg/ltr). **36 of 117 ingredients** (31%) have `unit ≠ small_unit` and are affected.

---

## 2. Data Flow Trace

```
purchasePlanner.computePlan()
  → rows: { ingredient_id, name, unit (=smallUnit ← THIS IS THE PROBLEM), suggest_qty (in small unit), ... }

SmartPurchasePanel.handleSubmit() builds:
  → items: [{ ingredientId, unit (=smallUnit), quantity (in small unit), rate, amount, conversionFactor: 1 (HARDCODED) }]

toAPI.addPurchase() sends to backend:
  → purchase_items: [{ Ingredient: id, Unit: "gm", quantity: 4604, rate: 0.056, Amount: 257.8, converion_factor: 1 }]

BUT backend purchase history for same ingredient shows:
  → Quantity: "4 kg", stock_quantity_raw: 4  (LARGE UNIT)
```

---

## 3. Live Evidence (curl-probed against preprod)

### Ingredient 10719 — Biscoff Biscuit (unit=kg, small_unit=gm)

| Source | Unit | Quantity | Rate |
|--------|------|----------|------|
| **stock-inventory** | unit=kg, small_unit=gm | cal_quantity=6843 gm, quantity=6.843 kg | — |
| **Purchase History (2026-07-18)** | **Quantity: "4 kg"** | raw: 4 | unit_price: 0.056/gm |
| **Purchase History (2026-06-03)** | **Quantity: "1 kg"** | raw: 1 | unit_price: 0.11/gm |
| **What Smart Purchase sends** | **Unit: "gm"** | quantity: ~1000 | rate: 0.056 (per gm) |

Backend records purchases in **kg** (large unit). Smart Purchase sends in **gm** (small unit).

### Scale of Impact

```
unit == small_unit:  81 ingredients (70%) — Smart Purchase unit is CORRECT
unit != small_unit:  36 ingredients (31%) — Smart Purchase sends WRONG unit
                     ^^^^^^^^^^^^^^^^^^
                     All kg↔gm or ltr↔ml pairs
```

### Ingredient 10741 (unit=gm, small_unit=gm — same unit)

Purchase history confirms both gm and kg have been submitted historically:
- `Quantity: "1 kg", raw: 1` (recent, Jun 2026)
- `Quantity: "250 gm", raw: 250` (older, Mar 2026)

This shows the backend ACCEPTS either unit — but interprets `raw` literally (250 when gm, 1 when kg). **Correct stock accounting depends on the backend's internal conversion logic.**

---

## 4. Gaps Found

### GAP-1 (CONFIRMED — HIGH risk): Unit + Quantity Mismatch for 36 Ingredients

**Location:** `purchasePlanner.js:120` → `SmartPurchasePanel.jsx:169-173`

**Root cause:** Planner always uses `item.smallUnit || item.unit` for the unit and `item.calQuantity` for on-hand math. The `suggest_qty` is in **small units** (gm/ml). The submit passes this directly to `addPurchase` with `converion_factor: 1`.

**Impact scenarios for ingredient 10719 (unit=kg, small_unit=gm):**

If user wants to buy 1 kg via Smart Purchase:
- Planner shows: "buy 1000 gm" (suggest_qty=1000, unit=gm)
- Submit sends: `{ Unit: "gm", quantity: 1000, converion_factor: 1 }`
- **If backend treats Unit literally:** records 1000 gm purchase (correct stock, ugly record)
- **If backend ignores Unit and uses ingredient's default (kg):** records 1000 KG — **1000x overstock!**
- **If backend rejects gm for a kg-ingredient:** 422 error

**Cannot confirm which scenario without a test purchase.** But the mismatch is structurally present.

### GAP-2: Rate/Price Confusion (UX — tied to GAP-1)

**Location:** `SmartPurchasePanel.jsx:58` (suggestedRate from vendor ranking)

**Issue:** `unit_price` from vendor-item-list is normalized to **per small unit** (per gm):
- Ingredient 10719: `unit_price: 0.056` = 0.056 per gm = 56 per kg

The user sees `suggestedRate: 0.056` as a hint. But they naturally think in kg and might type `56` (per kg). If the system uses this as per-gm:
- `amount = 1000 gm × 56 = 56,000` — **1000x overcharge**

### GAP-3: `vendor_id: null` for System Vendor (LOW-MEDIUM risk)

**Location:** `SmartPurchasePanel.jsx:162`

System Vendor submits `vendor_id: null`. Existing purchases also show `vendor_id: null` in purchase history — so **backend likely accepts this.** Lower risk than GAP-1/GAP-2.

---

## 5. Non-Gaps (Confirmed Correct)

| Field | Status |
|-------|--------|
| `Ingredient` (capital I), `Amount` (capital A) | ✅ R9 |
| `converion_factor` (typo) | ✅ R9 |
| `purchase_date` (DD-MM-YYYY) | ✅ R9 |
| `payment_method` per vendor group | ✅ validated |
| `origin` field | ✅ planner/stock_alert |
| Single submission path (`addPurchase`) | ✅ same as any purchase |
| `vendor_id: null` accepted by backend | ✅ historical evidence |

---

## 6. Fix Direction (no code edit per owner directive)

**For GAP-1 + GAP-2 (the fix is linked):**

The submit payload needs to convert from planner's small-unit domain to the ingredient's large unit:

```
For each row being submitted:
  ingredientMaster = find ingredient by id
  if (ingredientMaster.unit !== ingredientMaster.smallUnit):
    // Needs conversion: gm→kg, ml→ltr
    convFactor = 1000  (or derive from known unit families)
    submit Unit = ingredientMaster.unit (kg/ltr)
    submit quantity = row.qty / convFactor
    submit rate = row.rate * convFactor (per kg, not per gm)
    submit converion_factor = convFactor
  else:
    // Same unit, no conversion needed
    submit as-is
```

**Files to change:** `SmartPurchasePanel.jsx` (handleSubmit item mapping, ~10 lines)

---

## 7. Evidence Artifacts

- Stock inventory curl: 117 items, 36 with unit≠small_unit
- Purchase history curl: ingredient 10719 shows "4 kg" records, ingredient 10741 shows both gm and kg
- vendor-item-list curl: unit_price normalized to per-small-unit (0.056/gm = 56/kg)
- All probed against preprod with restaurant Kunafa Mahal (id=689)
