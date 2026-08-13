# CR-008 Sub-CR #1 · Bucket D1-Cap — Delivery-Charge Capture (Phase A)

**Bucket:** D1-Cap — "Capture & Thread"
**Parent CR:** CR-008 Sub-CR #1 (Delivery charges at order placement)
**Session:** 2026-05-03
**Working branch (handover reference):** `3-may`
**Source session handover:** `/app/memory/SESSION_HANDOVER_2026_05_03.md`
**Scope split approved by Owner:** CR-008 #1 → D1-Cap (this bucket, shipped) + D1-Gate (deferred)

---

## 1. Bucket scope

Capture per-order delivery charge at Order Entry (entry in `AddressFormModal`, inline edit in `CartPanel`), thread through `OrderEntry` state into `placeOrder` / `updateOrder` payloads (unhardcode `delivery_charge: 0`), and include the charge in the Collect Bill button total on the right panel. No Google API integration in this bucket. No `CollectPaymentPanel` edit — deferred to Bucket D1-Gate.

---

## 2. User approvals received (chronological)

| # | Gate / question | Owner answer |
|---|---|---|
| 1 | Bucket selection | "CR-008 #1" |
| 2 | Q-D1.1 (fee formula) | "user will enter" → fully manual |
| 3 | Q-D1.2 (Distance Matrix vs haversine) | N/A (no Google API in Phase A) |
| 4 | Q-D1.3 (API failure fallback) | Editable empty field — already Collect Bill pattern |
| 5 | Q-D1.4 (origin coords backend key) | N/A (no auto-compute in Phase A) |
| 6 | Q-D1.5 (free-delivery threshold) | Skip in this bucket |
| 7 | Hotspot approval — `OrderEntry.jsx` + `orderTransform.js` | YES, scoped strictly to delivery-charge threading |
| 8 | CR-008 #1 split into D1-Cap + D1-Gate | Approved |
| 9 | Bucket this session | D1-Cap only (recommended path) |
| 10 | Placement of entry | Inside address modal (Phase 2 Google-Distance-API integration point) |
| 11 | Placement of display | Below items in right panel (`CartPanel`) |
| 12 | Gap 1 (saved-address flow) | (b) CartPanel row is **inline-editable** |
| 13 | Gap 2 (Collect Bill button total) | (2A) Display-only addition — `total + deliveryCharge + roomBits`, no rounding re-implementation |
| 14 | Gap 3 (BUG-019 ripple on Collect Payment post-D1-Cap) | Accepted — correction UX deferred to D1-Gate |
| 15 | Final Apply Gate | "Apply" |

---

## 3. Files changed (4 files, 2 hotspots)

| # | File | Hotspot | Edits | Lines added (approx) |
|---|---|---|---|---|
| 1 | `frontend/src/components/order-entry/OrderEntry.jsx` | YES | 10 scoped edits (state + 3 re-seed sites + handleAddAddress signature + placeOrder options + updateOrder options + CartPanel props + AddressFormModal prop + 2 cleanup sites) | ~30 |
| 2 | `frontend/src/api/transforms/orderTransform.js` | YES | 4 scoped edits (`placeOrder` destructure + payload swap at L692 current line, `updateOrder` destructure + payload swap at L765 current line) | ~4 |
| 3 | `frontend/src/components/order-entry/CartPanel.jsx` | No | 3 scoped edits (new props, new editable row below items, Collect Bill button total including `deliveryCharge`) | ~45 |
| 4 | `frontend/src/components/order-entry/AddressFormModal.jsx` | No | 3 scoped edits (new prop, new `chargeInput` state, new input field near bottom, `handleSave` signature extension) | ~30 |

Files explicitly **not** touched this bucket:
- `AddressPickerModal.jsx` (dropped from scope)
- `CollectPaymentPanel.jsx` (deferred to D1-Gate; BUG-019 lock remains)
- All socket handlers, hydrators, bootstrap, reports, room files

---

## 4. Before / after behaviour

### 4.1 Order Entry right panel (CartPanel)
- **Before:** Delivery orders showed address strip → items → action buttons. No delivery-charge row. Collect Bill button showed `₹{total + roomBits}`.
- **After:** Delivery orders render an inline-editable `🚛 Delivery Charge ₹___` row directly below the items list (between cart items scroll and Associated Orders). Collect Bill button shows `₹{total + deliveryCharge + roomBits}`.

### 4.2 New Address modal (AddressFormModal)
- **Before:** Form saves an address; no charge input.
- **After:** Extra labelled `Delivery Charge (₹)` numeric field at the bottom of the form (separated by a divider). Value emitted as 2nd arg to `onSave(form, charge)`. NOT persisted as a field of the saved-address record.

### 4.3 Place Order API payload
- **Before:** `delivery_charge: 0` hardcoded.
- **After:** `delivery_charge: <captured value>` for delivery orders; stays at 0 for dine-in/walk-in/takeaway.

### 4.4 Update Order API payload
- **Before:** `delivery_charge: 0` hardcoded.
- **After:** `delivery_charge: <captured value>` for delivery orders; stays at 0 otherwise.

### 4.5 Re-engage / savedCart / socket refresh
- **Before:** `orderFinancials.deliveryCharge` was propagated (BUG-019 path) but local UI state for entry was absent.
- **After:** Local `deliveryCharge` state mirrored at the same 3 seed sites — CartPanel + Collect Bill button + AddressFormModal re-open all show the current value.

### 4.6 Collect Payment screen
- **Unchanged this bucket.** BUG-019's `readOnly={initialDeliveryCharge > 0}` rule still applies. Because in-POS delivery orders now persist a non-zero `delivery_charge`, the Collect Payment input will be read-only for them after place/update — matching scan-order behaviour. Correction UX deferred to D1-Gate.

---

## 5. API / socket / state assumptions

- **`/api/v2/vendoremployee/order/place-order`**: accepts `delivery_charge` (backend already parsed via `fromAPI.order()` L246). No new field, no schema change.
- **`/api/v2/vendoremployee/order/update-place-order`** (update endpoint): same assumption.
- **`placeOrderWithPayment`** (prepaid Place+Pay path in `orderTransform.js:800`): NOT touched. It already accepts `delivery_charge` via `paymentData?.deliveryCharge`, set by CollectPaymentPanel — BUG-019 round-trip unchanged.
- **Socket events** (`new-order`, `update-order`, `order-engage`): already carry `delivery_charge`. No handler change.
- **No new context, no new localStorage key, no new socket topic.**

---

## 6. Validation performed

### 6.1 Static validation
- Lint clean on all 4 edited files:
  - `OrderEntry.jsx` ✅
  - `orderTransform.js` ✅
  - `CartPanel.jsx` ✅
  - `AddressFormModal.jsx` ✅
- Webpack compiled with only the pre-existing `LoadingPage.jsx` `react-hooks/exhaustive-deps` warning (unrelated to this bucket).
- Line-number drift vs session handover recorded: handover referenced `OrderEntry.jsx` ~L160 / ~L700-800 and `orderTransform.js` L680 / L753; actual current positions after BUG-019 additions were ~L158 / L701 / L759 and L692 / L765 respectively. **Logic identical — only offsets shifted.**

### 6.2 Smoke validation
- External preview URL (`https://insights-phase.preview.emergentagent.com/`) returns HTTP 200.
- Smoke screenshot captured at `/tmp/d1cap_smoke.png` — login page + New Address modal render cleanly, no JS errors.
- Local `http://localhost:3000/` HTTP 200.

---

## 7. Validation NOT performed (needs Owner / QA)

All of the following must be walked through on preprod by Owner / QA with `owner@palmhouse.com` / `Qplazm@10`:

| # | Scenario | Expected |
|---|---|---|
| 1 | **Happy — new delivery order via New Address modal** | Type charge ₹50 → pick address → save → place order → `POST /place-order` payload carries `delivery_charge: 50`. Cart row shows "Delivery Charge ₹50" editable. Collect Bill button shows `₹{items-total + 50 + roomBits}`. |
| 2 | **Happy — new delivery order via saved address (no modal open)** | Pick saved address from picker → cart row shows editable `₹0` field → type ₹30 inline → place order → payload `delivery_charge: 30`. |
| 3 | **Update existing delivery order — charge persists** | Re-engage placed delivery order → cart row shows previous charge → add items → Update Order → payload carries same `delivery_charge`. |
| 4 | **Inline edit bumps Collect Bill button** | Type ₹10 → button jumps by ₹10. Type ₹0 / blank → row stays visible (editable), button drops. |
| 5 | **Regression — dine-in / walk-in / takeaway** | No delivery row, payload `delivery_charge: 0`. |
| 6 | **Regression — split-bill** | New-order seeding mirrors `delivery_charge` onto state (site L2023). |
| 7 | **Regression — socket context refresh** | Mid-order refresh preserves local `deliveryCharge`. |
| 8 | **Regression — engage/place-promise timing** | Unchanged — `engagePromise` / `placePromise` awaits still fire before redirect. |
| 9 | **Regression — auto-print bill block (L1434-1488)** | Unchanged. |
| 10 | **Regression — prepaid scan delivery order** | Untouched by this bucket. BUG-019 seeds `initialDeliveryCharge` on Collect Payment; field read-only. |
| 11 | **Known limitation — correcting a POS-punched charge on Collect Payment** | Field is **read-only** after D1-Cap ships (same as scan orders). Must be fixed by Bucket D1-Gate — Owner accepted this ripple at Gap 3. |
| 12 | **Cross-bucket** — A2 Order ID chip | Still visible. |
| 13 | **Cross-bucket** — B2-split PG columns | Unaffected. |
| 14 | **Cross-bucket** — B1 multi-select variations | Unaffected. |
| 15 | **Cross-bucket** — D1 stay-on-order toggle | Unaffected. |
| 16 | **Cross-bucket** — Merge/Shift hidden on prepaid cards | Unaffected. |
| 17 | **localStorage** — no new key under `mygenie_*` | Confirmed. |

---

## 8. Regression checklist result (from handover §7.4 / hotspot discipline)

| Behaviour that must remain unchanged | Status |
|---|---|
| All 8+ `onClose()` callsites in `OrderEntry.jsx` | ✅ Untouched |
| `engagePromise` / `placePromise` `await` ordering | ✅ Untouched |
| Auto-print bill block `OrderEntry.jsx:~L1440-1494` (current lines after D1-Cap) | ✅ Untouched |
| `orderEntryResetNonce` remount semantics in DashboardPage | ✅ Untouched |
| `orderFinancials` state shape | ✅ Unchanged — new `deliveryCharge` lives as its own state hook |
| `CollectPaymentPanel.jsx` | ✅ Untouched |
| `fromAPI.order()` hydrator | ✅ Untouched |
| `calcOrderTotals` math | ✅ Untouched |
| Socket handlers / subscriptions | ✅ Untouched |
| Saved-address record shape | ✅ Untouched — charge is per-order only |
| No new localStorage keys | ✅ Confirmed |

---

## 9. Known limitations / deferrals

1. **Correction of a POS-punched delivery charge on Collect Payment** is **not possible** after D1-Cap ships (BUG-019 locks the field when `initialDeliveryCharge > 0`). Owner accepted at Gap 3. Fix lives in Bucket D1-Gate.
2. **Google Distance Matrix auto-compute** — not in this bucket. Phase 2. The new field in `AddressFormModal` is the intended integration point (lat/lng already captured there).
3. **Free-delivery threshold** — skipped (Q-D1.5).
4. **Rounding parity** — Order Entry's Collect Bill button displays `total + deliveryCharge + roomBits` *without* Collect Payment's fractional-ceil/floor re-applied. Can differ by ≤₹0.50 from the final number on Collect Payment. Owner chose Option 2A for simplicity.
5. **Prepaid / placeOrderWithPayment** path uses `paymentData?.deliveryCharge` via CollectPaymentPanel (existing BUG-019 wiring). D1-Cap does not change that path.

---

## 10. Backend pending items

**None for D1-Cap.** Backend already accepts `delivery_charge` in place-order and update-order payloads (verified via BUG-019 round-trip). No new endpoint, no schema change requested.

Still on the BE shopping list for future CR-008 phases (from CR_008 doc §4):
- **BE-A** — Delivery-fee formula on restaurant settings + origin coordinates (needed for Phase 2 Google-Distance-API auto-compute).
- **BE-B / BE-C / BE-D / BE-E** — Dispatch/assign (Sub-CR #3, separate bucket).
- **BE-F** — `default_landing_screen` (Sub-CR #4, separate D1/D2 work).

---

## 11. QA instructions

1. Login: `owner@palmhouse.com` / `Qplazm@10` (Palm House, restaurant_id 541).
2. Walk scenarios 1-17 in §7 above on preprod.
3. Confirm DevTools Network tab shows `delivery_charge: <number>` in POST `/place-order` (multipart) and PUT `/update-place-order` (JSON) payloads.
4. Confirm Collect Bill button amount on Order Entry matches `items-total + delivery-charge + room-balance` (may differ ≤₹0.50 from final Collect Payment after rounding — expected).
5. Confirm in-POS delivery order → Collect Payment shows the charge **read-only** with lock icon (BUG-019 ripple; will be unlocked by D1-Gate).
6. Check lint / webpack logs: `/var/log/supervisor/frontend.out.log` — no new warnings expected.

---

## 12. Backup artifacts

- `/app/frontend/src/components/order-entry/OrderEntry.jsx.bak.d1cap`
- `/app/frontend/src/api/transforms/orderTransform.js.bak.d1cap`

**To be removed only after Owner verification on preprod.**

---

## 13. Next recommended bucket

**Bucket D1-Gate** — change `CollectPaymentPanel.jsx` readOnly rule from `initialDeliveryCharge > 0` → `isPrepaid`. This closes the correction-UX gap created by D1-Cap for in-POS delivery orders while keeping scan-order anti-tamper intact.

Alternative unblocked pickups from §5.1 of the session handover:
- CR-008 #2 (Audit Report Action Time + Time Diff columns) — small, no hotspots.
- D2+ navigation tweaks under CR-008 #4 — needs Owner scope-bucketing.

---

## 14. Sign-off

- Lint: ✅ clean on all 4 files
- Webpack: ✅ compiled (only pre-existing unrelated warning)
- Smoke: ✅ app boots, New Address modal renders
- Tests executed by automated agents: **None in this bucket** (per Owner rule "do not run any test agent" for this mini-deployment; this CR work was handled by the implementation agent, but the Owner's instruction to "not run test agent" continued. Validation deferred to Owner preprod walkthrough).
- Backups: retained pending Owner verification

**Ready for Owner verification.**
