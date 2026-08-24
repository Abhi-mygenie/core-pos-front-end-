# CR-147 — Delivery Management (Delivery Charge Configuration + Distance Calculation)
## Gate 2: Impact Analysis — FINAL FROZEN (2026-08-22)

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 2 — COMPLETE, FULLY UNBLOCKED, DESIGN FROZEN
**Risk:** MEDIUM
**Sprint:** POS 6.0
**Design:** Frozen at `/app/frontend/public/mockups_preview.html`
**Backend doc:** `/app/memory/evidence/CR-147/deliver.md`

---

## Owner Decisions — ALL LOCKED

| # | Decision | Value |
|---|---|---|
| **D1** | Architecture | **Separate "Delivery Management" page** — NOT inside the restaurant settings wizard. Own route: `/settings/delivery-management` |
| **D2** | lat/lng update mechanism | **Google Places Autocomplete** while typing + explicit **[Get Coordinates] button** to geocode. No toggle. |
| **D3** | Address field | **Editable** — pre-filled from `restaurant.address` (profile context). Used as geocoding input. NOT saved via this page. |
| **D4** | Geocoding trigger | **Explicit button click only** — `[Get Coordinates]` button. Not on blur, not automatic. |
| **D5** | Lat/lng fields | **Always manually editable** — user can override if geocoding returns wrong result |
| **D6** | Delivery charges UX | **Matrix/spreadsheet grid** — NOT one-by-one modal. Rows = distance bands, columns = order value tiers, cells = charge |
| **D7** | Column headers (order tiers) | **Two inline inputs per column**: `From ₹` input + `To ₹` input. Last column: `From ₹` + `∞ no limit` badge |
| **D8** | Row headers (distance bands) | **Two inline inputs per row**: `From km` input + `To km` input |
| **D9** | Add tier / Add band | `[+ Add Order Tier (Col)]` button adds new column. `[+ Add Distance Band (Row)]` button adds new row |
| **D10** | Empty / first-time state | **3-step guided setup**: Step 1 define order tiers → Step 2 define distance bands → Step 3 open matrix + fill cells |
| **D11** | Save slabs | **One [Save All Slabs (N)] button** sends entire matrix as parallel arrays to `POST /delivery-charges` |
| **D12** | Backend min_order_value mapping | Column `From ₹` value maps directly to `min_order_value` in the payload |
| **D13** | No toggle for geocoding | `validate_address_from_google` toggle is **NOT in the new POS UI** (backend field exists but not exposed in POS) |

---

## Backend Endpoints (fully confirmed)

**Base:** `https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/`
**Auth:** `Authorization: Bearer <VENDOR_EMPLOYEE_TOKEN>` (restaurant resolved from token)

| Method | Path | Purpose |
|---|---|---|
| GET | `/delivery-config` | Load page — basic settings + all slabs |
| POST | `/update-delivery-config` | Save basic settings (lat/lng + toggles) |
| POST | `/delivery-charges` | Add slabs (parallel arrays) |
| DELETE | `/delivery-charges/{id}` | Delete one slab |
| GET | `/zones` | Zone dropdown |

### POST `/delivery-charges` — parallel arrays format
```json
{
  "min_distance_km": [0, 0, 0, 1, 1, 1, 2, 2, 2],
  "max_distance_km": [1, 1, 1, 2, 2, 2, 3, 3, 3],
  "min_order_value": [0, 200, 500, 0, 200, 500, 0, 200, 500],
  "charge":          [0, 0, 0, 20, 10, 0, 50, 20, 0]
}
```
Each matrix cell = one array index. All arrays must be same length.

---

## Geocoding Flow (FINAL)

```
Section 1 — Address field (editable, pre-filled from restaurant.address)
  ┌─────────────────────────────────────────────────────────┐  ┌────────────────────┐
  │ 100 Feet Road, HAL 2nd Stage, Bengaluru, Karnataka 560038│  │ 📍 Get Coordinates │
  │                                          (editable)      │  └────────────────────┘
  └─────────────────────────────────────────────────────────┘
           ↓ as user types
  Google Places Autocomplete dropdown appears:
    "100 Feet Road, HAL 2nd Stage, Bengaluru..."  ← user selects
    → geometry.location.lat/lng returned immediately
    → lat/lng fields auto-fill (no button needed after Places selection)

  OR: user types free-text / wants to re-geocode
    → clicks [📍 Get Coordinates]
    → Geocoding API called → lat/lng auto-fills

  Lat/lng fields: ALWAYS manually editable (override if geocoding wrong)

  [Update Basic Setting]
    → POST /update-delivery-config { latitude, longitude, ...other fields }
    (address NOT saved here — it's display context + geocoding input only)
```

**APIs used (same `REACT_APP_GOOGLE_MAPS_KEY` in .env for both):**
1. `google.maps.places.Autocomplete` — suggestions while typing
2. `google.maps.Geocoder` — fallback via [Get Coordinates] button

---

## Delivery Charges Matrix Design (FROZEN)

### The UX Problem Solved
```
OLD (modal, one-by-one): 3 tiers × 6 distance bands = 18 slabs × 5 interactions = 90 clicks
NEW (matrix grid):        Define structure once → fill 18 cells inline → 1 [Save All]
```

### Matrix structure
```
                    TIER 1          TIER 2          TIER 3 (∞)
                    ₹[0]—₹[199]    ₹[200]—₹[499]  ₹[500]—∞
                    ─────────────────────────────────────────
Row 1: [0]—[1]km  │  ₹0 Free   │   ₹0 Free   │  ₹0 Free  │ 🗑
Row 2: [1]—[2]km  │  ₹20       │   ₹10       │  ₹0 Free  │ 🗑
Row 3: [2]—[3]km  │  ₹50       │   ₹20       │  ₹0 Free  │ 🗑
Row 4: [3]—[4]km  │  ₹40       │   ₹30       │  ₹10      │ 🗑
Row 5: [4]—[5]km  │  ₹60       │   ₹40       │  ₹20      │ 🗑
Row 6: [5]—[6]km  │  ₹60       │   ₹50       │  —        │ 🗑
                    ─────────────────────────────────────────
                    + Add Order Tier (Col)
+ Add Distance Band (Row)

[Save All Slabs (18)]  → POST /delivery-charges (parallel arrays, length 18)
```

### Column header inputs (D7 — Gap 1 fixed)
Each column has TWO editable inline inputs:
- `₹ [From] — ₹ [To]` for middle tiers
- `₹ [From] — ∞ no limit` for the last tier (∞ badge, no To input)
- Backend `min_order_value` = the **From ₹** value of that column

### Empty / first-time state (D10 — Gap 2 fixed)
3-step guided setup card shown when no slabs exist:
```
Step 1 (Columns): Define order value tiers → [+ Add Order Tier]
Step 2 (Rows):    Define distance bands    → [+ Add Distance Band]
Step 3 (Grid):    Once structure exists    → [Open Spreadsheet Matrix →]
                  OR [Load Standard 3×6 Template]
```

---

## Files WILL Change (5 files, 2 new)

| File | Change | Risk |
|---|---|---|
| `src/api/constants.js` | + `DELIVERY_CONFIG_ENDPOINTS` (5 paths) | LOW |
| `src/api/services/deliveryConfigService.js` | **NEW** — `getDeliveryConfig`, `updateDeliveryConfig`, `addDeliveryCharges`, `deleteDeliveryCharge`, `getZones` | LOW |
| `src/pages/settings/DeliveryManagementPage.jsx` | **NEW** — Section 1 (address + Places autocomplete + [Get Coordinates] + lat/lng + toggles + [Update Basic Setting]) + Section 2 (matrix grid with editable column/row headers, inline cells, empty state, [Save All Slabs]) | MEDIUM |
| `src/components/layout/Sidebar.jsx` | + "Delivery Management" entry in Settings group | LOW |
| `src/App.js` | + import + `/settings/delivery-management` route | LOW |

## Files WILL NOT Touch
`RestaurantSettingsPage.jsx` · `restaurantSettingsTransform.js` · `orderTransform.js` · `CollectPaymentPanel.jsx` · `OrderEntry.jsx`

---

## Key Implementation Notes for Gate 3

### Google Places Autocomplete
```js
// Load Google Maps JS SDK with Places library
// script: https://maps.googleapis.com/maps/api/js?key=REACT_APP_GOOGLE_MAPS_KEY&libraries=places

const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
  types: ['geocode'],
  componentRestrictions: { country: 'in' }, // India only
});
autocomplete.addListener('place_changed', () => {
  const place = autocomplete.getPlace();
  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();
  setLatitude(String(lat)); setLongitude(String(lng)); // auto-fill
});

// [Get Coordinates] button fallback
const handleGetCoordinates = async () => {
  const geocoder = new google.maps.Geocoder();
  const result = await geocoder.geocode({ address: addressValue });
  const { lat, lng } = result.results[0].geometry.location;
  setLatitude(String(lat())); setLongitude(String(lng()));
};
```

### Matrix → parallel arrays transform
```js
const buildPayload = (rows, cols, cells) => ({
  min_distance_km: rows.flatMap(r => cols.map(() => r.from)),
  max_distance_km: rows.flatMap(r => cols.map(() => r.to)),
  min_order_value: rows.flatMap(() => cols.map(c => c.from)),
  charge:          rows.flatMap(r => cols.map(c => cells[r.id]?.[c.id] ?? 0)),
});
// Each matrix cell → one position in all 4 arrays
```

### Yes/No fields for update-delivery-config
All toggle fields: `delivery_fee`, `surcharge`, `show_real_status_to_customer`, `delivery_assign` → accept exactly `"Yes"` or `"No"` (string, case-sensitive)

---

## Verification Matrix

| # | Check | How |
|---|---|---|
| 1 | `/settings/delivery-management` route loads | Browser navigate |
| 2 | Page loads current config from `GET /delivery-config` | Fields populated |
| 3 | Address pre-filled from `restaurant.address` profile | Visible in address field |
| 4 | Typing in address → Places Autocomplete dropdown appears | Suggestions show |
| 5 | Selecting a Place → lat/lng auto-fills | Fields populate with coords |
| 6 | [Get Coordinates] button → geocodes typed address | Fallback works |
| 7 | Lat/lng fields manually editable | User can override |
| 8 | [Update Basic Setting] → POST /update-delivery-config | Success toast |
| 9 | Section 2: empty state shows 3-step guided setup | No slabs → setup cards visible |
| 10 | [+ Add Order Tier (Col)] → new column with From/To inputs | Column added |
| 11 | [+ Add Distance Band (Row)] → new row with From/To km inputs | Row added |
| 12 | Last column shows ∞ badge (no upper limit) | Visible |
| 13 | Cells inline editable | Click cell → type charge |
| 14 | [Save All Slabs (N)] → POST /delivery-charges parallel arrays | Network: correct format |
| 15 | min_order_value = column From ₹ value | Network: validated |
| 16 | Delete row → row removed | 🗑 icon per row |
| 17 | Delete column → column removed | 🗑 icon per column header |
| 18 | [Inspect Wire JSON] shows exact parallel array payload | Visible preview |
| 19 | GET /zones populates zone dropdown | Options appear |
| 20 | Sidebar "Delivery Management" navigates to page | Active state shown |

---

Gate 2 FINAL: CR-147
Design: FROZEN at `/app/frontend/public/mockups_preview.html`
Code reality: NONE (2 new files)
Risk: MEDIUM
Backend: ALL ENDPOINTS CONFIRMED — zero gaps
Owner decisions: 13/13 LOCKED
Files WILL change: 5 (2 new)
Next: Gate 3 → Implementation Plan → Gate 4 GO
