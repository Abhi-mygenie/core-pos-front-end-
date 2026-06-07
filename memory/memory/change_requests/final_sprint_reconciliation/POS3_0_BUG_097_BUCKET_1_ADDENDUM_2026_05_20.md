# POS3.0 BUG-097 Bucket 1 — Implementation Report Addendum (OrderCard + TableCard Corrective) — 2026-05-20

## 1. Purpose

Addendum to the Bucket 1 implementation report after discovering:
1. `DeliveryCard.jsx` is unused — delivery orders render through `OrderCard` and `TableCard`
2. `delivery_assign` is a **restaurant profile setting**, not an order field — determines Dispatch vs Assign Rider

No `/app/memory/final/` updated. No baseline docs updated.

---

## 2. Critical Correction: `delivery_assign` Source of Truth

| Previous (WRONG) | Corrected (RIGHT) |
|---|---|
| `source === "own"` on order → Dispatch | `delivery_assign` on restaurant profile → Dispatch/Assign |
| `source !== "own"` on order → Assign Rider | Per-order `source`/`order_in` NOT used for this decision |

**Restaurant profile field:** `restaurants[0].delivery_assign`
- `"Yes"` (truthy) → Restaurant has delivery riders → **Assign Rider** button
- `"No"` (falsy) → Restaurant does NOT have riders → **Dispatch** button

This is a **restaurant-level setting**, same for ALL delivery orders in that restaurant.

---

## 3. Files Changed in This Addendum

### File 1: `profileTransform.js`
**Change:** Added `deliveryAssign` to `features` object.
```
features.deliveryAssign: toBoolean(api.delivery_assign)
```

### File 2: `OrderCard.jsx`
**Changes:**
1. Added derived values: `deliveryAssign`, `hasRiderAssigned`, `isDelivery` (L72-74)
2. `fOrderStatus === 2` (Ready→Serve area): For delivery + no rider assigned:
   - `deliveryAssign === true` → **"Assign Rider"** button (orange outline, `console.log` placeholder)
   - `deliveryAssign === false` → **"Dispatch"** button (orange outline, `console.log` placeholder)
   - Non-delivery or rider already assigned → existing **"Serve"** button (unchanged)
3. `fOrderStatus === 5` (Served→Bill area): For delivery:
   - Label changed from **"Bill"** to **"Delivered"** (same click handler — Collect Bill flow per BQ-097-4)
   - Non-delivery: "Bill" unchanged

### File 3: `TableCard.jsx`
**Changes:**
1. Added derived values: `isDelivery`, `deliveryAssign`, `hasRiderAssigned` (L68-70)
2. `fOrderStatus === 2` (Serve button): For delivery + no rider:
   - `deliveryAssign === true` → **"Assign"** label (orange styling, `console.log` placeholder)
   - `deliveryAssign === false` → **"Dispatch"** label (orange styling, `console.log` placeholder)
   - Non-delivery or rider assigned → existing **"Serve"** (unchanged)
3. `fOrderStatus === 5` (Bill button): For delivery:
   - Label: **"Delivered"** instead of "Bill" (same click handler)
   - Non-delivery: "Bill"/"C/Out" unchanged

---

## 4. Visual Verification (Screenshot)

| Card | Order Type | fOrderStatus | Before Patch | After Patch | Status |
|---|---|---|---|---|---|
| whw...₹313 (OrderCard) | delivery | 5 (served) | "Bill" | **"Delivered"** | ✅ Verified |
| sjsjsj ₹93 (OrderCard) | delivery | 1 (preparing) | "Ready" | "Ready" (no change — not at dispatch stage) | ✅ Correct |
| Table 1 ₹253 (Dine-In) | dinein | 5 (served) | "Bill" | "Bill" (unchanged) | ✅ No regression |
| r1 ₹5,555 (Room) | room | 5 (served) | "C/Out" | "C/Out" (unchanged) | ✅ No regression |

**Note:** No delivery orders at `fOrderStatus === 2` (ready) currently exist on preprod, so the Dispatch/Assign Rider buttons could not be visually verified. They will be testable when order #002403 is marked ready.

---

## 5. Build Verification

| Check | Result |
|---|---|
| `yarn build` | **Success** — zero new warnings |
| Dev server | **Compiled successfully** |
| Dine-in regression | ✅ No change |
| Room regression | ✅ No change |
| Delivery label change | ✅ "Delivered" visible |

---

## 6. DeliveryCard Technical Debt Record

`DeliveryCard.jsx` is:
- Imported in `DashboardPage.jsx` (L7) but **never rendered**
- Has Bucket 1 button logic applied (using `source === "own"` — now outdated)
- Should be treated as **legacy/unused technical debt**
- Do NOT delete — may have future use or serve as reference
- If ever activated, must be refactored to use `deliveryAssign` from restaurant profile

---

## 7. Complete Bucket 1 File Change Summary (All Sessions)

| # | File | Change | Session |
|---|---|---|---|
| 1 | `api/transforms/orderTransform.js` | 7 delivery/rider field mappings + computed `riderStatus` | Initial |
| 2 | `api/constants.js` | 3 delivery endpoint constants | Initial |
| 3 | `utils/statusHelpers.js` | `dispatched` status entry | Initial |
| 4 | `components/cards/DeliveryCard.jsx` | Button logic fix (legacy/unused) | Initial |
| 5 | `api/transforms/profileTransform.js` | `deliveryAssign` in features | Corrective |
| 6 | `components/cards/OrderCard.jsx` | Dispatch/Assign/Delivered buttons for delivery | Corrective |
| 7 | `components/cards/TableCard.jsx` | Dispatch/Assign/Delivered labels for delivery | Corrective |

**Total files changed: 7**
**New files created: 0**
**Files deleted: 0**

---

## 8. What Was NOT Changed

- No API calls wired (Bucket 2)
- No socket handlers touched (Bucket 5)
- No new components created
- No `CollectPaymentPanel.jsx` touched
- No `DashboardPage.jsx` touched
- No `/app/memory/final/` updated
- No baseline docs updated

---

## 9. Confirmation

- **Code changed:** 7 files (all additive/label changes)
- **Build:** Passed
- **Dev server:** Running
- **Visual verification:** "Delivered" label confirmed on dashboard
- **`/app/memory/final/`:** NOT updated
- **Baseline docs:** NOT updated
- **API calls wired:** NO (Bucket 2)
- **Socket handlers touched:** NO

---

*— POS3.0 BUG-097 Bucket 1 Addendum — 2026-05-20 —*
