# Impact Analysis — Vendor CRUD Full Wiring + food_id Assessment

**ID:** BUG-197-VENDOR (new sub-issue from QA)
**Date:** 2026-07-17
**Agent Role:** PLANNING (Gate 2)
**Risk:** HIGH (inventory CRUD, vendor data)
**Source:** QA session discovered vendor-list 404 → owner provided correct endpoint curls

---

## 1. Vendor CRUD — Root Cause

**NOT a backend bug.** Owner provided working curls. The issue is **FE CODE_GAP**:

### Backend Contract (CONFIRMED — owner curls verified):

| Operation | Method | Endpoint | Status |
|-----------|--------|----------|--------|
| **List** | GET | `/api/v2/vendoremployee/inventory/get-vendor` | ✅ Works (8 vendors on 18March) |
| **Add** | POST | `/api/v2/vendoremployee/inventory/add-vendor` | ✅ Works (already in FE) |
| **Update** | POST | `/api/v2/vendoremployee/inventory/update-vendor/{id}` | ✅ Works (NOTE: POST not PUT) |
| **Delete** | DELETE | `/api/v2/vendoremployee/inventory/vendor-delete/{id}` | ✅ Works |

### Backend Response Shape (GET /get-vendor):
```json
[
  {
    "id": 39,
    "vendor_name": "test",
    "contact_person_name": "avinash sapkal",
    "contact_number": "09823905120",
    "email": "avisapkal.pune@gmail.com",
    "address": "Gggjgbjb",
    "vendor_type": "Restaurant",
    "gst_no": "1234"
  }
]
```
**NOTE:** Array response (not wrapped in object). Field names differ from FE expectations.

### FE Current State:

| What | Exists? | Issue |
|------|---------|-------|
| `GET_VENDOR` constant | ❌ MISSING | FE has no get-vendor endpoint |
| `UPDATE_VENDOR` constant | ❌ MISSING | FE has no update-vendor endpoint |
| `DELETE_VENDOR` constant | ❌ MISSING | FE has no vendor-delete endpoint |
| `fromAPI.vendors()` transform | ❌ MISSING | No vendor list transform |
| `toAPI.updateVendor()` transform | ❌ MISSING | No update transform |
| `getVendors()` service | ❌ MISSING | No list service function |
| `updateVendor()` service | ❌ MISSING | No update service function |
| `deleteVendor()` service | ❌ MISSING | No delete service function |
| `addVendor()` service | ✅ EXISTS | Works correctly |
| `toAPI.addVendor()` transform | ✅ EXISTS | Field names need review |
| VendorsTab UI | ⚠️ WRONG | Shows vendor TYPES, not actual vendors |

### VendorsTab Current Behavior:
```
Code comment L247: "Vendors come from vendor-type endpoint (which returns vendor types not vendors themselves)"
```
The tab calls `getVendorTypes()` and displays types as rows — **not actual vendors**. Add Vendor button works (calls `addVendor()`) but added vendors never appear in the list.

---

## 2. Field Name Mapping (Backend → FE)

| Backend Field | FE Field (proposed) | Notes |
|--------------|-------------------|-------|
| `id` | `id` | — |
| `vendor_name` | `name` | FE VendorFormDialog uses `form.name` |
| `contact_person_name` | `contactPerson` | Backend: `contact_person_name`, FE: `contactPerson` |
| `contact_number` | `phone` | Backend: `contact_number`, FE: `phone` |
| `email` | `email` | Same |
| `address` | `address` | Same |
| `vendor_type` | `vendorType` | Backend returns type NAME string, not ID |
| `gst_no` | `gst` | Backend: `gst_no`, FE: `gst` |

### addVendor transform needs review:
Current FE sends: `{ vendor_name, contact_person, phone, email, address, vendor_type_id, gst_number }`
Backend expects: `{ vendor_name, contact_person_name, contact_number, email, address, vendor_type, gst_no }`

**3 field name mismatches in addVendor:**
| FE sends | Backend expects |
|----------|----------------|
| `contact_person` | `contact_person_name` |
| `phone` | `contact_number` |
| `vendor_type_id` | `vendor_type` (string name, not ID) |
| `gst_number` | `gst_no` |

---

## 3. food_id Assessment — DOWNGRADED from MAJOR to MINOR

**Owner statement:** "recipe name and menu item is same name"

**Verification:** Partially true. 6/20 exact match, 14/20 differ by CASE only (e.g., "CHEESE DIP" vs "Cheese Dip").

**Where food_id is used in FE:**
1. `fromAPI.recipes()` — maps `r.food_id → foodId` for edit mode dropdown pre-selection
2. `toAPI.storeRecipe()` — sends `name: data.foodId` (integer food_id to create link)
3. `toAPI.updateRecipe()` — sends `name: data.foodId` (integer food_id)

**Impact of food_id being null:**
- **Store recipe:** User selects food from dropdown → FE has food.id from active-foods-list → works ✅
- **Edit recipe:** FE tries to pre-select food in dropdown by `foodId` → null → dropdown shows empty → user must re-select → **UX annoyance, not a blocker**
- **Workaround:** Match by case-insensitive `food_name` comparison with dropdown options

**Recommendation:** File as BACKEND_REQUEST (nice-to-have), not blocker. FE can add case-insensitive name matching as interim fix.

---

## 4. Files WILL Change

| # | File | Changes | Risk |
|---|------|---------|------|
| 1 | `api/constants.js` | +3 endpoint constants (GET_VENDOR, UPDATE_VENDOR, DELETE_VENDOR) | LOW |
| 2 | `api/transforms/inventoryTransform.js` | +fromAPI.vendors(), +toAPI.updateVendor(), fix toAPI.addVendor() field names | MEDIUM |
| 3 | `api/services/inventoryService.js` | +getVendors(), +updateVendor(), +deleteVendor() | LOW |
| 4 | `components/inventory/InventorySetupPanel.jsx` | Rewrite VendorsTab to show actual vendors with CRUD | MEDIUM |
| 5 | `components/inventory/VendorFormDialog.jsx` | Wire edit mode (pre-fill from existing vendor) | LOW |

## Files WILL NOT Touch
- Recipe transforms (food_id is a separate minor issue)
- Any order/settlement/report/financial files
- Sidebar, auth, settings

---

## 5. Estimated Size

| Edit | Lines |
|------|------:|
| Constants (+3) | ~5 |
| fromAPI.vendors() | ~15 |
| toAPI.updateVendor() + fix addVendor() | ~20 |
| 3 service functions | ~20 |
| VendorsTab rewrite (list + edit + delete) | ~80 |
| VendorFormDialog edit wiring | ~10 |
| **Total** | **~150 lines, 5 files** |

---

## 6. Phase 2 — Inventory Intelligence Blockers

**ALL 6 backend endpoints are unconfirmed/unbuilt:**

| EP | Feature | Status | Blocker |
|----|---------|--------|---------|
| EP-1 | Consumption History | ❓ Owner says exists, no curl shared | **Owner to share curl** |
| EP-2 | Purchase History | ❓ Owner says exists, no curl shared | **Owner to share curl** |
| EP-3 | Stock Summary/KPIs | ❓ Likely needs building | **Backend team** |
| EP-4 | Days Remaining Forecast | ❓ Likely needs building | **Backend team** |
| EP-5 | Cost Per Dish Analysis | ❓ Likely needs building | **Backend team** |
| EP-6 | Wastage Summary | ❓ Likely needs building | **Backend team** |

**Phase 2 is 100% backend-blocked.** No FE work can start until at least EP-1 and EP-2 curls are provided.

---

## Next

- Gate 3: Implementation Plan for vendor CRUD wiring (5 files, ~150 lines)
- Owner decision: food_id — file backend request or use name-matching workaround?
- Owner action: Share EP-1 + EP-2 curls to unblock Phase 2 planning
