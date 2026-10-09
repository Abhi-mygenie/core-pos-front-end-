# INV — BUG-458 — Smart Purchase vendor suggestion shows "(unnamed)" instead of vendor name

**Date:** 2026-09-24 · **Role:** INVESTIGATION (Role 6) · **Steps used:** 3/10
**Registered ID:** BUG-458 · **Owner report:** Screenshot — Stock Update vendor suggestion dropdown shows "(unnamed) · ₹39" instead of actual vendor name

---

## 1 · Summary

| Field | Value |
|---|---|
| Root cause | `vendorRanking.js:52` reads `r.vendor_name ?? r.vendorName` — **API sends `Vendor_Name` (capital V, capital N)** — both FE keys are `undefined` → `vendor_name: ''` → rendered as "(unnamed)" |
| Classification | **FE_BUG — FIELD_NAME_MISMATCH** |
| Confidence | **HIGH** — live API probed, all 698 vendor-linked rows confirmed to have `Vendor_Name` (not `vendor_name`) |
| Steps used | 3/10 |

---

## 2 · Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | API field name doesn't match FE read | Code trace + API probe | **CONFIRMED** — API: `Vendor_Name` · FE: `vendor_name` → always `undefined` | `vendor_item_list_probe_2026_09_24.json` |
| H2 | Some purchases have no vendor name at all (no vendor assigned at time of purchase) | Count rows with valid `vendor_id` but empty `Vendor_Name` | **ELIMINATED** — 0 such rows exist; all 698 vendor-linked rows have `Vendor_Name` populated | Same probe |
| H3 | vendorMaster fallback compensates | Code trace `vendorRanking.js:74-86` | **ELIMINATED** — master fallback only appends vendors NOT already in purchase history; winner object name is never enriched from master | Code trace |

---

## 3 · Data Flow Trace

```
API GET /api/v2/vendoremployee/inventory/vendor-item-list
  → returns 1591 rows
  → field names: Vendor_Name (capital), vendor_id (lowercase), Ingredient_Name, Purchase_Date, unit_price, ...
  → sample: { Vendor_Name: "Kunafabake", vendor_id: 173, unit_price: 39 }

inventoryService.js:getVendorItemList()
  → return res.data?.data || []
  → NO transform — raw API rows stored as-is in vendorItemList state

SmartPurchasePanel.jsx:58
  → rankVendors(vil, r.ingredient_id, masterList)

vendorRanking.js:rankVendors():50-52
  const vid = r.vendor_id ?? r.vendorId;           // reads 173 ✅
  const effectiveVid = vid || 'system';             // = 173 ✅
  vendor_name: effectiveVid === 'system'
    ? 'System Vendor'
    : (r.vendor_name ?? r.vendorName ?? ''),        // ← BREAK POINT
                                                    // r.vendor_name = undefined (field is Vendor_Name)
                                                    // r.vendorName  = undefined
                                                    // result: vendor_name: ''

rankVendors() returns:
  winner: { vendor_id: 173, vendor_name: '', unit_price: 39 }

VendorSuggestionCell.jsx:58 displayLabel():
  `${c.vendor_name || '(unnamed)'}${price}`
  = '(unnamed) · ₹39'                              ← SYMPTOM shown in screenshot
```

**NOTE:** `SmartPurchasePanel.jsx:103` correctly reads `v.Vendor_Name` (capital) for the `vendorNamesById` lookup map — but this map is used for the purchase payload/summary only, NOT for the `VendorSuggestionCell` winner objects.

---

## 4 · API Probe Results

- **Endpoint:** `GET /api/v2/vendoremployee/inventory/vendor-item-list`
- **Restaurant:** kunafamahal.com · 2026-09-24
- **Total rows:** 1,591
- **Field returned:** `Vendor_Name` (capital V, capital N) — confirmed
- **Rows with `null` vendor_id:** 893 → already handled as "System Vendor" (effectiveVid='system')
- **Rows with valid `vendor_id` + non-empty `Vendor_Name`:** 698 → ALL show "(unnamed)" due to field name mismatch
- **Rows with valid `vendor_id` + empty `Vendor_Name`:** 0 → no secondary fix needed
- **Evidence:** `evidence/BUG-458/vendor_item_list_probe_2026_09_24.json`

---

## 5 · Fix Recommendation

**Classification:** FE_FIX — DIRECT_BUG_FIX eligible (1 file, 1 line, LOW risk, not R5 hotspot, not R6 financial)

**File:** `src/utils/vendorRanking.js` · **Line:** 52

```js
// BEFORE:
vendor_name: effectiveVid === 'system' ? 'System Vendor' : (r.vendor_name ?? r.vendorName ?? ''),

// AFTER:
vendor_name: effectiveVid === 'system' ? 'System Vendor' : (r.Vendor_Name || r.vendor_name || r.vendorName || ''), // BUG-458
```

**Why `||` not `??`:** `??` only guards against `null`/`undefined`. `Vendor_Name` can be an empty string `''` for null-vendor rows — `||` correctly falls through empty strings too.

**Impact after fix:** All 698 vendor-linked history rows will show the correct vendor name. The "(unnamed) · ₹39" symptom is resolved for all ingredients with a purchase history vendor.

---

## 6 · Retroactive Candidates

None — no other item registered for this field name discrepancy.

---

## 7 · Handover

```
Root cause: vendorRanking.js:52 reads r.vendor_name but API sends Vendor_Name.
Confidence: HIGH (live-probed, 698 affected rows, 0 edge cases).
FE fix: YES — 1 file, 1 line. Direct Bug Fix eligible (owner approval recommended).
Backend ask: NONE.
Planning skip eligible: YES — 1 file, 1 line, LOW risk, not hotspot, not financial.
```
