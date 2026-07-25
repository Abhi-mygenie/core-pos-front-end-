# Investigation Report — Smart Purchase Submit Structure

**Date:** 2026-07-25
**Role:** INVESTIGATION
**Scope:** Trace Smart Purchase submit payload vs backend `add-purchase` contract
**Steps Used:** 6/10
**Confidence:** HIGH (code fully traced)
**Classification:** CONTRACT_REVIEW (not a bug report — owner asked for gap analysis)

---

## 1. Summary

Smart Purchase uses the **same** `inventoryService.addPurchase()` → `toAPI.addPurchase()` pipeline as manual purchase. There is only ONE purchase submission path in the codebase. However, the data being fed into that path has **3 structural gaps** that may cause backend issues.

---

## 2. Data Flow Trace

```
purchasePlanner.computePlan()
  → rows: { ingredient_id, name, unit (=smallUnit), suggest_qty, origin, ... }

SmartPurchasePanel adds:
  → { vendor_id, rate, qty (=suggest_qty), batch:'', expiry:'' }

handleSubmit() builds FE shape:
  → {
      vendorName, vendorId, purchaseDate, paymentMethod,
      items: [{ ingredientId, unit, quantity, rate, amount, conversionFactor:1, batch:'', expiry:'', origin }]
    }

toAPI.addPurchase() maps to backend contract:
  → {
      vendor_name, vendor_id, purchase_date (DD-MM-YYYY), payment_method,
      purchase_items: [{
        Ingredient: id,     // R9 capital I
        Unit: unit,         // R9 capital U
        quantity, rate,
        Amount: qty*rate,   // R9 capital A
        converion_factor: 1,// R9 typo
        batch: '',
        expiry_date: '',
        origin: 'planner'
      }]
    }
```

---

## 3. Gaps Found

### GAP-1: `converion_factor` HARDCODED to 1 (MEDIUM risk)

**Location:** `SmartPurchasePanel.jsx:173` → `conversionFactor: 1`

**Issue:** The planner (`purchasePlanner.js:120`) uses `item.smallUnit || item.unit` for all math. So `unit` in each row is the **small/base unit** (e.g., `gm`, `ml`, `piece`). The submission sends `quantity` in small-unit terms with `converion_factor: 1`.

**Question for backend:** Does `POST /add-purchase` expect:
- **Option A:** Quantity in small unit + converion_factor=1 ← what FE sends today
- **Option B:** Quantity in large unit (kg/ltr) + converion_factor=actual (e.g. 1000)

If backend expects Option B, then both `quantity` and `converion_factor` are wrong. The fix would be to divide `suggest_qty` by the ingredient's `conversionFactor` and pass the real conversion factor.

**Evidence:** `purchasePlanner.js:120-121` — unit = `item.smallUnit || item.unit`, onHand = `item.calQuantity` (already in small unit). `SmartPurchasePanel.jsx:170` — `quantity: Number(r.qty ?? r.suggest_qty)` sends small-unit quantity.

### GAP-2: `vendor_id: null` for System Vendor on submit (LOW-MEDIUM risk)

**Location:** `SmartPurchasePanel.jsx:162`

**Issue:** System Vendor (BUG-227) displays as a fallback when no vendor history exists. On submit, `vendor_id: 'system'` maps to `null`:
```js
vendorId: vid === 'null' ? null : (vid === 'system' ? null : vid)
```

Validation at L141 blocks `vendor_id === 'null'` (no vendor selected) but ALLOWS `vendor_id === 'system'` (System Vendor) — which then submits as `null`.

**Question for backend:** Does `POST /add-purchase` accept `vendor_id: null`? If not, purchases against System Vendor will fail silently or with a 422.

### GAP-3: `Unit` is small unit, not large unit (tied to GAP-1)

**Location:** `purchasePlanner.js:120` → `SmartPurchasePanel.jsx:169` → `toAPI.addPurchase:177`

**Issue:** The `Unit` field sent to backend is the **small unit** (gm, ml, piece) because that's what the planner uses. If the backend `add-purchase` expects the **large unit** (kg, ltr) as the `Unit` field alongside the conversion factor, this is a mismatch.

**Evidence:** `purchasePlanner.js:120` — `const unit = item.smallUnit || item.unit || ''`

---

## 4. Non-Gaps (Confirmed Correct)

| Field | Status | Notes |
|-------|--------|-------|
| `Ingredient` (capital I) | ✅ | R9 preserved |
| `Amount` (capital A) | ✅ | BUG-197 #6 compliant |
| `converion_factor` (typo) | ✅ | R9 preserved |
| `purchase_date` (DD-MM-YYYY) | ✅ | R9 format |
| `payment_method` per vendor group | ✅ | Validated (L144) |
| `origin` field | ✅ | 'planner' or 'stock_alert' passed through |
| `batch` / `expiry_date` empty | ✅ Acceptable | Smart Purchase is quick-order flow; user can't enter these |

---

## 5. Recommendations

| # | Gap | Action | Owner? |
|---|-----|--------|--------|
| 1 | converion_factor + Unit (small vs large) | **Curl-probe backend** with a test purchase in small unit + factor=1 vs large unit + factor=N. Confirm which the backend expects. | YES — needs backend verification |
| 2 | vendor_id: null (System Vendor) | **Curl-probe backend** with `vendor_id: null`. If 422 → either block System Vendor submit or require user to pick real vendor. | YES — needs backend verification |
| 3 | Unit = smallUnit | Tied to GAP-1. If backend expects large unit, both Unit and quantity need remapping. | Resolved with GAP-1 |

---

## 6. Evidence Artifacts

All code traces documented above. No curl probes executed (investigation-only session). Backend verification needed for GAP-1 and GAP-2.
