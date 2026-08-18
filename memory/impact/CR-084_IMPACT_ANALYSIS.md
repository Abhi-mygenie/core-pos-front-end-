# CR-084 Impact Analysis (Gate 2)

**Date:** 2026-07-20
**Item:** CR-084 — Vendor Management CRUD Screen
**Risk:** MEDIUM (new API wiring + component rewrite, no financial/order logic)
**Code Reality:** PARTIAL — VendorsTab exists (shows vendor types), VendorFormDialog exists (popup), addVendor service exists (wrong field names)

---

## Conflict Pre-Check

| File | Last Modified By | Date | Conflict? |
|---|---|---|---|
| `api/constants.js` | BUG-152 (QA PASS), CR-077 | Multiple | NO — additive (new endpoint constants in INVENTORY_ENDPOINTS block) |
| `api/services/inventoryService.js` | CR-078 | 2026-07-18 | NO — additive (new functions) |
| `api/transforms/inventoryTransform.js` | BUG-207 | 2026-07-19 | NO — additive (new fromAPI/toAPI entries) |
| `InventorySetupPanel.jsx` | CR-081 (this session) | 2026-07-20 | NO — VendorsTab function is self-contained |
| `VendorFormDialog.jsx` | CR-072 | 2026-07-15 | **WILL BE REMOVED** — replaced by inline expandable row (Option B). Owner confirmed no popup. |

---

## API Contract (Curl-Probed — R11)

### GET `/api/v2/vendoremployee/inventory/get-vendor`
- **Method:** GET
- **Response:** Raw array (not wrapped in `{ data: [...] }`)
- **Shape per vendor:**
```json
{
  "id": 173,
  "vendor_name": "Kunafabake",
  "contact_person_name": "Meet Singh",
  "contact_number": "8957823844",
  "email": null,
  "address": null,
  "vendor_type": "Online Vendor",   // STRING name, not ID
  "gst_no": null
}
```
- **Kunafa Mahal:** 12 vendors returned

### POST `/api/v2/vendoremployee/inventory/add-vendor`
- **Method:** POST
- **Payload:**
```json
{
  "vendor_name": "hh",
  "contact_person_name": "hh",
  "contact_number": "9898986750",
  "email": "",
  "gst_no": "",
  "vendor_type": null,              // STRING name or null
  "address": ""
}
```
- **Note:** `vendor_type` is the type NAME string (e.g., "Restaurant"), NOT an ID

### PUT `/api/v2/vendoremployee/inventory/update-vendor/{id}`
- **Method:** PUT
- **Payload:** Same shape as POST (vendor_name, contact_person_name, contact_number, email, gst_no, vendor_type, address)
- **Response:** `{ "message": "Vendor updated successfully." }`

### DELETE `/api/v2/vendoremployee/inventory/vendor-delete/{id}`
- **Method:** DELETE
- **No body required**

---

## Existing Code Analysis

### 1. `VendorsTab` (InventorySetupPanel.jsx, lines 252-330)
**Current:** Calls `getVendorTypes()` → displays 5 type categories (Restaurant, Grocery Store, etc.)
**Needed:** Call new `getVendors()` → display 12 actual vendors with CRUD

### 2. `VendorFormDialog.jsx` (popup dialog)
**Current:** Full form with all fields (name, contact, phone, email, address, type dropdown, GST). Uses `AlertDialog` (popup modal).
**Owner feedback:** "I don't want that popup" — **DESIGN REVIEW REQUIRED before planning.**

### 3. `addVendor` transform (inventoryTransform.js, line 170)
**Current payload mapping — WRONG field names:**

| FE Transform Field | Actual Backend Field | Match? |
|---|---|---|
| `vendor_name` | `vendor_name` | ✅ |
| `contact_person` | `contact_person_name` | ❌ WRONG |
| `phone` | `contact_number` | ❌ WRONG |
| `email` | `email` | ✅ |
| `address` | `address` | ✅ |
| `vendor_type_id` (numeric) | `vendor_type` (string name) | ❌ WRONG |
| `gst_number` | `gst_no` | ❌ WRONG |

**4 out of 7 fields have wrong names.** This means the existing `addVendor` likely fails silently (backend ignores unknown fields).

### 4. Missing service functions
- `getVendors()` — DOES NOT EXIST
- `updateVendor(id, data)` — DOES NOT EXIST
- `deleteVendor(id)` — DOES NOT EXIST

### 5. Missing API constants
- `GET_VENDOR` — DOES NOT EXIST
- `UPDATE_VENDOR` — DOES NOT EXIST
- `DELETE_VENDOR` — DOES NOT EXIST

---

## Data Flow (Target State)

```
GET /get-vendor → fromAPI.vendors(response) → VendorsTab state → Table render
                                                                     ↓ (edit click)
                                                            [DESIGN TBD: inline form? drawer? page?]
                                                                     ↓ (save)
PUT /update-vendor/{id} → toAPI.vendorPayload(form) → success → refetch list
POST /add-vendor → toAPI.vendorPayload(form) → success → refetch list
DELETE /vendor-delete/{id} → confirm → success → refetch list
```

---

## Downstream Consumers

| Consumer | Impact |
|---|---|
| `VendorsTab` (InventorySetupPanel) | PRIMARY — full rewrite |
| `VendorFormDialog` | **DESIGN REVIEW** — may be replaced with different UX |
| `addVendor` transform | Fix field names (broken today) |
| Smart Purchase (VendorSuggestionCell) | NO IMPACT — uses VIL data, not vendor CRUD |
| Dashboard (Vendor Performance/Directory) | NO IMPACT — uses VIL data |

---

## Open Questions (MUST resolve before Gate 3)

| # | Question | Status | Blocker? |
|---|---|---|---|
| **OQ-1** | `vendor_type` sends string name (not ID) in add/update payloads | ✅ CONFIRMED by owner | No |
| **OQ-2** | Owner says "I don't want popup" for add/edit vendor. What UX instead? Options: **(a)** Inline form row at top of table (like Ingredients add), **(b)** Slide-out drawer from right, **(c)** Full-page form, **(d)** Expandable row in table. **Owner must pick before Gate 3.** | ✅ **RESOLVED: Option B — Inline Expandable Row** (like Expenses). Add = orange-bordered row at top. Edit = blue-bordered inline row expansion. Mockup frozen at `public/cr084-vendor-ux-mockup.html`. | No |
| **OQ-3** | Should the vendor type dropdown in add/edit show the 5 vendor-type names from the API? | Default YES | No |
| **OQ-4** | Delete confirmation — window.confirm or styled dialog? | Default: styled dialog | No |

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Existing addVendor has wrong field names — may have been "working" by accident | MEDIUM | Fix transform to match actual backend contract |
| VendorFormDialog removal/replacement may lose existing form logic | LOW | Preserve field set, change only the container UX |
| vendor_type is string not ID — dropdown must map name not id | LOW | Confirmed by API probe and owner |

---

## Summary

| Aspect | Finding |
|---|---|
| **Code Reality** | PARTIAL — scaffold exists, API wiring wrong/missing |
| **API Status** | All 4 endpoints confirmed working (curl-probed) |
| **Existing Bug** | addVendor transform has 4 wrong field names (never worked correctly) |
| **Files WILL change** | constants.js, inventoryService.js, inventoryTransform.js, InventorySetupPanel.jsx (VendorsTab), VendorFormDialog.jsx or replacement |
| **Files WILL NOT touch** | ReorderForecastWidget, CostTrendWidget, SmartPurchasePanel, CurrentStockPanel, StockAuditPanel, all page files |
| **Blockers** | **NONE — all resolved** |

---

## Next

**STOP.** ~~Awaiting owner decision on OQ-2~~ **OQ-2 RESOLVED: Option B (Inline Expandable Row) frozen.** All 4 API endpoints curl-verified. Ready for Gate 3 Implementation Plan.
