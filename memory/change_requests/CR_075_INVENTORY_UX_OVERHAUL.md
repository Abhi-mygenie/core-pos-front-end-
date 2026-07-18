# CR-075 — Inventory Module UX Overhaul (Stock + Purchase/Receive)

**ID:** CR-075
**Date:** 2026-07-18
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Type:** CR (Change Request)
**Severity:** P1 — HIGH (BLOCKER export + multiple MAJOR UX gaps)
**Risk:** HIGH (touches inventory CRUD, conditional screen logic, file upload)
**Duplicate Check:** DISTINCT — extends CR-072 (Phase 1 CRUD) with UX polish + Purchase/Receive split
**Sprint:** POS 5.0
**Related:** CR-072 (Inventory Phase 1), BUG-197 (Post-Delivery fixes)

---

## Summary

Comprehensive UX overhaul of the Inventory module's Stock Dashboard and Purchase Entry screens. Includes 1 BLOCKER fix (Excel export), 3 MAJOR gaps (error display, vendor typeahead, field validation), and a NEW conditional screen: Purchase Entry becomes "Receive" for center/master inventory restaurants.

---

## Scope — 11 Items (3 screens + cross-cutting)

### STOCK DASHBOARD SCREEN (5 items)

| # | Item | Severity | Description |
|---|------|----------|-------------|
| S1 | **Excel export broken** | **BLOCKER** | FE expects blob, backend returns JSON with `download_url`. `createObjectURL(blob)` fails silently. Fix: use `window.open(download_url)`. |
| S2 | Filter UX incomplete | MEDIUM | Filters work in code but: no result count, no clear button, no active filter indicator. User doesn't know filter is on. |
| S3 | Status chips instead of dropdown | MEDIUM | Replace `<select>` dropdown with clickable pill buttons showing counts: `[All] [In Stock ●234] [Low ●11] [Out ●51]`. One-click toggle, counts visible at glance. |
| S4 | Low stock definition unclear | INFO | `is_low_stock` is 100% backend-driven. FE has `min_qty_alert` but doesn't use it for classification. Need backend confirmation: does `is_low_stock = (qty <= min_qty_alert)`? |
| S5 | No error display | MAJOR | Only 2 generic toasts. No per-field errors, no retry on load fail, no loading state on export. |

### PURCHASE / RECEIVE SCREEN (5 items)

| # | Item | Severity | Description |
|---|------|----------|-------------|
| P1 | No error display | MAJOR | Generic toast only. Backend `errors{}` object ignored. Same fix pattern as employee. |
| P2 | No vendor auto-suggestion | MAJOR | Plain text input, no typeahead. Vendor list API exists (`/get-vendor`). Free-text creates duplicate vendors. Need combobox with autocomplete + "Add new" option. |
| P3 | Invoice attachment placeholder | MEDIUM | Browse button has NO handler — pure visual stub. Needs: backend endpoint decision, file picker, upload logic. Owner to confirm storage destination. |
| P4 | Mandatory fields unclear | MEDIUM | Only Vendor has red *. Ingredient/Qty/Rate have no indicator. No inline validation. Need red * + validation + red borders on error. |
| P5 | **Purchase → Receive conditional** | **NEW FEATURE** | When `restaurant_type_flag === "master"` and `parent_restaurant_id === null`, screen title changes to "Receive" with different endpoints. Owner will provide MD file with receive endpoints. |

### KEY: Purchase vs Receive Decision

```
Profile API returns:
  restaurant_type_flag: "normal"  → Show "Add Purchase Entry" (current)
  restaurant_type_flag: "master"  → Show "Receive Stock" (new endpoints)
  parent_restaurant_id: null      → Center inventory (master)
  parent_restaurant_id: <number>  → Child restaurant
```

**FE currently does NOT read `restaurant_type_flag` anywhere.** This field needs to be:
1. Extracted from profile/login response
2. Stored in RestaurantContext
3. Used to conditionally render Purchase vs Receive screen title + endpoints

---

## Evidence

- Investigation report: `/app/memory/evidence/INVENTORY_STOCK_PURCHASE_AUDIT_2026_07_18.md`
- Export curl: backend returns `{ download_url: "https://preprod.mygenie.online/storage/Purchase_List.xlsx" }` — valid 19KB file
- Vendor list API confirmed: `/inventory/get-vendor` returns vendor array
- Profile API confirmed: `restaurant_type_flag: "normal"`, `parent_restaurant_id: null` on 18March
- Screenshots: owner-provided stock filter + purchase form

---

## Blast Radius

| Area | Files | Lines Est. |
|------|:---:|:---:|
| Stock Dashboard | 1 | ~80 (export fix + chips + filter UX + errors) |
| Purchase/Receive | 1 | ~100 (vendor typeahead + validation + invoice + conditional) |
| Inventory Service | 1 | ~20 (export fix + vendor list + receive endpoints) |
| Inventory Transform | 1 | ~15 (vendor fromAPI + receive transforms) |
| Constants | 1 | ~5 (receive endpoints + vendor list) |
| RestaurantContext or AuthTransform | 1 | ~5 (store restaurant_type_flag) |
| **Total** | **~6 files** | **~225 lines** |

Hotspot files: NONE (inventory files are not R5 hotspots)

---

## Open Questions

| # | Question | Status |
|---|----------|--------|
| OQ-1 | Does backend set `is_low_stock` from `min_qty_alert` threshold? | PENDING — backend team |
| OQ-2 | Backend endpoint for invoice file upload? Storage location? | PENDING — owner |
| OQ-3 | Should Payment Method be mandatory on purchase? | PENDING — owner |
| OQ-4 | Can Rate be ₹0 (free samples/donations)? | PENDING — owner |
| OQ-5 | Receive endpoints — owner to share MD file | PENDING — owner |
| OQ-6 | What fields differ between Purchase and Receive payloads? | PENDING — owner MD file |

---

### PHYSICAL STOCK COUNT SCREEN (1 item)

| # | Item | Severity | Description |
|---|------|----------|-------------|
| PC1 | **Wastage not recorded from physical count** | MAJOR | When physical count reveals a negative drift (e.g., System=4.65kg, Physical=0, Drift=-4.65kg, Reason=Expired), the system calls `addStock()` which adjusts stock quantity. But there is **no explicit wastage record created**. The wastage reason dropdown appears but it's unclear if the backend actually creates a wastage log entry or just silently overwrites the stock number. The -4.65kg of "Expired" stock should appear in wastage reports — need backend confirmation: does `add-stock` with `wastage_reason_id` create a wastage_log entry? If not, FE needs to call a separate wastage recording endpoint after the stock adjustment. |

**Current flow:**
```
Physical Count → enter physical qty → drift calculated → select reason → Save
  → addStock(itemId, { quantity: physicalQty, wastage_reason_id, reason })
  → Backend: adjusts stock to physicalQty. Wastage log? UNKNOWN.
```

**Expected flow:**
```
Physical Count → enter physical qty → drift calculated → select reason → Save
  → IF drift < 0: record wastage (qty=|drift|, reason=selected) + adjust stock
  → IF drift > 0: record addition (found extra stock) + adjust stock
  → Wastage appears in wastage reports
```

**FE gaps in Physical Count screen:**
1. No confirmation dialog before saving (irreversible stock adjustment)
2. No summary of what will change (e.g., "3 items will be adjusted, 2 wastage entries")
3. No error display (same generic toast pattern)
4. Reason dropdown only shows when drift ≠ 0 — but no * indicator that it's mandatory for wastage
5. No "Export" for the physical count sheet (useful for paper audit)

---

## Dependencies

| Dependency | Status | Blocks |
|-----------|--------|--------|
| Vendor list endpoint (`/get-vendor`) | ✅ Confirmed working | P2 (typeahead) |
| Export endpoint download_url | ✅ Confirmed working | S1 (export fix) |
| Invoice upload endpoint | ❌ Unknown | P3 (attachment) |
| Receive endpoints | ❌ Owner to share | P5 (conditional screen) |
| `restaurant_type_flag` in profile | ✅ Available in API | P5 (conditional logic) |

---

| OQ-7 | Does `add-stock` with `wastage_reason_id` create a wastage log entry? Or only adjusts stock qty? | PENDING — backend |
| OQ-8 | Should wastage from physical count appear in wastage reports? | PENDING — owner |

Planning Gate 2 (Impact Analysis) can start for items S1-S5 + P1-P4 immediately.
Item P5 (Receive) blocked until owner shares endpoint MD file.
