# Investigation Report — Smart Purchase Submit Structure

**Date:** 2026-07-25 (Updated with backend contract doc)
**Role:** INVESTIGATION
**Scope:** Trace Smart Purchase submit payload vs backend `add-purchase` contract
**Steps Used:** 10/10
**Confidence:** HIGH (code traced + live curl-probed + backend contract doc verified)
**Classification:** FE_BUG — multiple payload key mismatches affecting ALL purchases via addPurchase

---

## 1. Summary

The backend contract doc (`add_purchase_payload_frontend.md`) reveals **4 critical gaps** in the FE `toAPI.addPurchase()` transform — wrong key names, missing header totals, and unnecessary fields. These affect **every purchase submission** (not just Smart Purchase).

**Priority ranking:**
- **P0: `payment_method` → should be `payment_type`** — every purchase has null payment type
- **P0: Missing `tot_amount` / `item_total`** — every purchase header shows total=1
- **P2: `converion_factor: 1` always sent** — should omit when no conversion
- **P3: Sending ignored fields** — vendor_name, notes, invoice_number, rate, origin

---

## 2. Gap-by-Gap Analysis

### GAP-A (P0): Wrong key — `payment_method` → `payment_type`

**Location:** `inventoryTransform.js:172`

| | Current FE | Backend expects |
|--|-----------|-----------------|
| Key | `payment_method` | `payment_type` |
| Value | `"Cash"` | `"Cash"` / `"Cash Draw"` |
| Result | **IGNORED** → `payment_type: null` | Stored correctly |

**Impact:** Every purchase via `addPurchase` has `payment_type: null` in the backend. Affects purchase history, reports, settlement.

### GAP-B (P0): Missing header totals — `tot_amount`, `item_total`

**Location:** `inventoryTransform.js:167-186` (never computed/sent)

| Field | Current FE | Backend expects | Default if missing |
|-------|-----------|-----------------|-------------------|
| `tot_amount` | **not sent** | Sum of all `Amount` | **defaults to `1`** |
| `item_total` | **not sent** | Sum of all `Amount` | **defaults to `1`** |
| `tot_fair` | **not sent** | `0` or actual | **defaults to `1`** |
| `tot_tax` | **not sent** | `0` or actual | **defaults to `1`** |

**Impact:** Every purchase header shows `tot_amount: 1, item_total: 1, tot_fair: 1, tot_tax: 1` — regardless of actual amounts. Corrupts purchase header reports.

### GAP-C (P2): `converion_factor: 1` always sent

**Location:** `inventoryTransform.js:181`

```js
converion_factor: item.conversionFactor || 1, // R9 typo
```

**Backend contract says:** "Omit unless SKU has real conversion. Do not always send 1."
**Impact:** Low — backend stores `1` for all items. Not breaking, but incorrect data. Backend contract explicitly says to OMIT this field when unused.

### GAP-D (P3): Sending keys the backend ignores

| FE sends | Backend action |
|----------|---------------|
| `vendor_name` | **Ignored** — only `vendor_id` matters |
| `invoice_number` | **Ignored** on this endpoint (string not stored) |
| `notes` | **Ignored** (no column write) |
| `rate` (per line) | **Ignored** — line cost = `Amount` only |
| `origin` | **Ignored** (e.g. "planner") |

**Impact:** None functionally. Wasteful payload. Low priority cleanup.

---

## 3. Unit Issue Re-Assessment (Downgraded)

My earlier GAP-1 (unit mismatch for 36 ingredients) is **downgraded from HIGH to LOW** based on the backend contract:

The "good curl" example in the contract sends `Unit: "gm", quantity: 17975` and the backend accepts it:
```json
{ "sunit": "gm", "stock_quantity": 17975, "calculate_quantity": 17975 }
```

**The backend accepts ANY unit** and records it as-is. Stock accounting uses `calculate_quantity` in whatever unit was sent. So sending `gm` instead of `kg` is **not a stock corruption risk** — it's a display/consistency issue.

However, `unit_price` in vendor-item-list is normalized to per-small-unit, so the `suggestedRate` hint is correct for the unit being sent.

---

## 4. Current FE Payload vs Correct Payload

### What FE sends today (`toAPI.addPurchase`):
```json
{
  "vendor_name": "Saurav",           ← IGNORED
  "vendor_id": "278",               ← ✅
  "purchase_date": "25-07-2026",    ← ✅
  "payment_method": "Cash",         ← ❌ WRONG KEY (should be payment_type)
  "invoice_number": "",              ← IGNORED
  "notes": "Smart Purchase...",     ← IGNORED
  "purchase_items": [{
    "Ingredient": 15983,            ← ✅
    "Unit": "gm",                   ← ✅ (backend accepts any unit)
    "quantity": 17975,              ← ✅
    "rate": 100,                    ← IGNORED
    "Amount": 1797500,              ← ✅
    "converion_factor": 1,          ← ❌ should OMIT when no conversion
    "batch": "",                    ← ✅
    "expiry_date": "",              ← ✅
    "origin": "planner"             ← IGNORED
  }]
}
```

### What FE SHOULD send:
```json
{
  "vendor_id": "278",
  "purchase_date": "25-07-2026",
  "payment_type": "Cash",            ← FIXED key name
  "tot_amount": 1797500,             ← NEW: sum of all Amount
  "item_total": 1797500,             ← NEW: sum of all Amount
  "tot_fair": 0,                     ← NEW: default 0
  "tot_tax": 0,                      ← NEW: default 0
  "purchase_items": [{
    "Ingredient": 15983,
    "Unit": "gm",
    "quantity": 17975,
    "Amount": 1797500
  }]
}
```

---

## 5. Fix Location

**Single file:** `api/transforms/inventoryTransform.js` → `toAPI.addPurchase()` (lines 167-186)

Changes needed:
1. `payment_method` → `payment_type` (rename key)
2. Add `tot_amount`, `item_total` (computed from sum of items.Amount)
3. Add `tot_fair: 0`, `tot_tax: 0`
4. Remove `converion_factor: 1` default → only send when ingredient has conversion
5. KEEP ignored fields (`vendor_name`, `invoice_number`, `notes`, `rate`, `origin`) — backend may consume in future

**Also in `SmartPurchasePanel.jsx`:** The `paymentMethod` field passed to addPurchase is already populated from GroupedVendorPreview. No change needed there — just the transform key name.

---

## 6. Verification Matrix (for future QA)

| # | Test | Expected |
|---|------|----------|
| V1 | Submit purchase → check response `payment_type` | Not null, matches what user selected |
| V2 | Submit purchase → check response `tot_amount` | Equals sum of line items Amount |
| V3 | Submit purchase → check response `item_total` | Equals sum of line items Amount |
| V4 | Submit purchase with no conversion ingredient → check payload | `converion_factor` absent |
| V5 | Submit purchase with conversion ingredient → check payload | `converion_factor` present with real value |

---

## 7. Evidence Artifacts

- Backend contract: `add_purchase_payload_frontend.md` (owner-provided 2026-07-25)
- Live curl probes: stock-inventory, vendor-item-list, ingredient master (preprod, restaurant 689)
- Code trace: `inventoryTransform.js:167-186`, `SmartPurchasePanel.jsx:150-189`
- Full report: `/app/memory/reports/INVESTIGATION_SMART_PURCHASE_SUBMIT_2026_07_25.md`
