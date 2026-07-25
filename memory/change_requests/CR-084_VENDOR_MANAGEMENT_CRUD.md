# CR-084: Vendor Management CRUD Screen

**ID:** CR-084
**Type:** CR (new functionality — wire existing backend to frontend)
**Priority:** P1 (HIGH — vendor screen currently shows vendor TYPES instead of actual vendors)
**Risk:** MEDIUM (1 component rewrite + new API endpoints, no financial/order logic)
**Sprint:** POS 5.0
**Reported by:** Owner (2026-07-20 — "vendor screen is not functional")
**Source:** OWNER-REPORTED
**Date:** 2026-07-20
**Related:** CR-072 (original inventory, had vendor-list as BLOCKER), CR-081 (design), BUG-197 (add-vendor wired)

---

## Description

The Vendors tab in Inventory Setup currently shows **vendor TYPES** (Restaurant, Grocery Store, Wholesale Supplier, Retail Store, Online Vendor) from the `vendor-type` endpoint. It does NOT show actual **vendors** (Kunafabake, Rahul Grocery, Varun Dairy, etc.).

This was previously blocked because the backend `GET vendor-list` returned 404 (QA report 2026-07-17, finding #1 BLOCKER). **The backend has now deployed 4 vendor CRUD endpoints:**

| Method | Endpoint | Status |
|---|---|---|
| **GET** | `/api/v2/vendoremployee/inventory/get-vendor` | ✅ Confirmed — returns 12 vendors with full details |
| **POST** | `/api/v2/vendoremployee/inventory/add-vendor` | ✅ Already wired (BUG-197 #2) |
| **PUT** | `/api/v2/vendoremployee/inventory/update-vendor/{id}` | ✅ NEW — needs FE wiring |
| **DELETE** | `/api/v2/vendoremployee/inventory/vendor-delete/{id}` | ✅ NEW — needs FE wiring |

---

## Code Reality: PARTIAL

- `VendorsTab` component exists inside `InventorySetupPanel.jsx` (lines 252-330)
- Currently calls `getVendorTypes()` — needs to call new `getVendors()` 
- `addVendor()` service function exists — needs `updateVendor()` + `deleteVendor()`
- `VendorFormDialog.jsx` exists — may need update for edit mode

---

## Duplicate Check: DISTINCT

- CR-072 registered vendor-list as BLOCKER (backend didn't exist then)
- BUG-197 #2 wired `addVendor` only
- No existing CR covers full vendor CRUD with the new endpoints

---

## Evidence

### API Response Shape (GET /get-vendor)
```json
[
  {
    "id": 173,
    "vendor_name": "Kunafabake",
    "contact_person_name": "Meet Singh",
    "contact_number": "8957823844",
    "email": null,
    "address": null,
    "vendor_type": "Online Vendor",
    "gst_no": null
  }
]
```
Returns array of 12 vendors for Kunafa Mahal.

### Update Payload (PUT /update-vendor/{id})
```json
{
  "vendor_name": "test",
  "contact_person_name": "avinash sapkal",
  "contact_number": "09823905120",
  "email": "avisapkal.pune@gmail.com",
  "gst_no": "1234",
  "vendor_type": "Restaurant",
  "address": "Gggjgbjb"
}
```

### Delete (DELETE /vendor-delete/{id})
No body required.

---

## Scope

| Item | Description | Est. Lines |
|---|---|---|
| 1 | **New API constants:** `GET_VENDOR`, `UPDATE_VENDOR`, `DELETE_VENDOR` in constants.js | ~3 |
| 2 | **New service functions:** `getVendors()`, `updateVendor(id, data)`, `deleteVendor(id)` in inventoryService.js | ~15 |
| 3 | **New transform:** `fromAPI.vendors(response)` + `toAPI.updateVendor(data)` in inventoryTransform.js | ~15 |
| 4 | **Rewrite VendorsTab:** Replace `getVendorTypes()` → `getVendors()`. Table columns: Vendor Name, Contact, Phone, Type (badge), GST, Actions (edit/delete). | ~60 |
| 5 | **Update VendorFormDialog:** Support edit mode (pre-fill fields from selected vendor). | ~20 |
| **Total** | | **~113 lines** |

---

## Mockup Reference (from V5 investigation)

- Title: "Vendor Management" with truck icon
- Columns: Vendor Name (bold), Contact Person, Phone, Type (colored badge), GST, Actions (edit + delete)
- Type badges: blue "Wholesale", green "Retail", purple "Grocery"
- "Add Vendor" green button
- Search bar

---

## Blast Radius

- **Files:** 4-5 (constants.js, inventoryService.js, inventoryTransform.js, InventorySetupPanel.jsx, VendorFormDialog.jsx)
- **Hotspot files:** NONE
- **API changes:** 3 new endpoints wired (GET, PUT, DELETE) — all confirmed working
- **Risk:** MEDIUM — isolated to vendor tab, no side effects on other screens

---

## Open Questions

| # | Question | Default |
|---|---|---|
| OQ-1 | Should vendor_type show as dropdown from vendor-types API in the add/edit form? | YES — use existing `getVendorTypes()` for options |
| OQ-2 | Should delete require confirmation? | YES — window.confirm or dialog |

---

## Fast Lane Eligibility: NO (4-5 files, ~113 lines, new API wiring)

---

## Next: Planning Gate 2 → Gate 3 → Implementation
