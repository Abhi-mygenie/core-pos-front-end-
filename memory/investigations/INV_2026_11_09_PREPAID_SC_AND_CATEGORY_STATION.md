# INV-2026-11-09 — (1) Prepaid manual Service Charge missing from payload · (2) New category station_name null

**Role:** INVESTIGATION (no code changed) · **Date:** 2026-11-09 · **Restaurant:** ruby (owner login, creds masked)
**Evidence:** `/app/memory/evidence/INV-SC-STATION/` (categories_v2.json, categories_v1.json, station_printer_list.json)

---
## Issue 1 — Auto SC OFF + manual SC tick on Prepaid → SC not in place-order payload
**Verdict: TRUE — CONFIRMED LIVE.** Classification: FE_BUG · Confidence: CONFIRMED (code trace + live UI payload capture)

### Data flow
```
CollectPaymentPanel.jsx L433-437  serviceChargeEnabled default = restaurant.autoServiceCharge (OFF → unticked)
  cashier ticks → L744 serviceCharge = subtotalAfterDiscount × SC%  → shown in UI, included in finalTotal (L805 subtotal)
  → paymentData { serviceCharge (L1274), finalTotal, … }
OrderEntry.jsx prepaid paths:
  L1679-1690 (QSR Place&Pay) and L2460-2465 (Prepaid Place+Pay):
    serviceChargePercentage = (applicable && restaurant.autoServiceCharge) ? SC% : 0      ← IGNORES cashier toggle
orderTransform.js placeOrderWithPayment L1294-1410:
  totals = calcOrderTotals(items, serviceChargePercentage=0) → service_tax: 0, service_gst_tax_amount: 0, order_amount excludes SC
  payload = { …totals } — paymentData.serviceCharge is never read
  payment_amount / grant_amount = paymentData.finalTotal (L1342) → INCLUDES SC
```
**BREAK POINT:** OrderEntry derives SC % from the restaurant `auto_service_charge` flag instead of the cashier's per-bill toggle; `placeOrderWithPayment` never reads `paymentData.serviceCharge`.
**Effect:** `service_tax = 0`, SC GST missing, `order_amount` excludes SC, but `payment_amount` includes SC → payload internally inconsistent (paid amount > order amount); SC lost from reports.
**Contrast:** postpaid collect-bill (`collectBillExisting`, orderTransform L1696) uses `service_tax: serviceCharge` from paymentData → works there. Origin: BUG-028 Round 5 (place-flow honours auto flag) applied to prepaid where the cashier toggle exists.
**Fix direction (for Planning):** prepaid paths pass the cashier's toggle (e.g. `paymentData.serviceChargeEnabled` / SC% when `paymentData.serviceCharge > 0`) into `serviceChargePercentage`; files `OrderEntry.jsx` (2 sites) ± `CollectPaymentPanel.jsx` paymentData. Financial + R5 hotspots → Risk HIGH.

---
## Issue 2 — New category from Menu Management: `station_name` null though UI shows KDS → items go to "Others"
**Verdict: TRUE — CONFIRMED BY PROBE.** Classification: FE_BUG (sends empty printer id) + FE display masking · Confidence: CONFIRMED (live data + controlled create/edit probes)

### Live data (ruby, preprod)
- `GET /api/v2/vendoremployee/product/station-printer-list` → `{"printers":[{"id":1801,"area_name":"KDS"},{"id":1803,"area_name":"Bill"},{"id":1831,"area_name":"Chaat"},{"id":1910,"area_name":"Bill"}]}` — **printer id is `id`; no `printer_id` field.**
- `GET /api/v2/vendoremployee/product/categories`: working categories (e.g. 11060-11064) = `station_name:"KDS", restaurant_printer_id:1801`. New category **11065 "thali A" (created 2026-11-09 22:43)** = `station_name:null, restaurant_printer_id:null`. 7 of 90 categories have null station.

### Data flow
```
menuManagementTransform.js L206-214 stationPrinterList: printerId = s.printer_id || s.restaurant_printer_id || ''   ← API has neither → ''
CategoryList.jsx L65 (add) / L91 (edit): printerId = stationOptions.find(name).printerId || ''  → ''
menuManagementService.js L171-183 addCategory: station_name='KDS', restaurant_printer_id=''      (edit L186-195: restaurant_printer_id = 0)
Backend stores station_name=null, restaurant_printer_id=null (station linked through printer id)
menuManagementTransform.js L194 categoryList: stationName = c.station_name || 'KDS'               ← UI shows "KDS" for null (masks bug)
KOT routing: category without station → "Others"
```
**BREAK POINT:** `stationPrinterList` reads the wrong key for the printer id (should be `s.id`), so every add/edit sends an empty/0 printer id → backend nulls the station.
**Edit path (probed):** editing with `restaurant_printer_id: 0` does NOT wipe an existing station (backend keeps it) and does NOT repair a null one; editing with the correct id (1801) DOES repair. So the 7 null categories were most likely created via this add flow.
**Backend rule (PROVEN by probe):** backend persists the station only through a valid `restaurant_printer_id`; `station_name` alone is ignored.
**Fix direction (for Planning):** `stationPrinterList` → `printerId: s.id` (1 line, `menuManagementTransform.js`); optionally stop the `|| 'KDS'` display fallback (L194) so null shows as "Not set"; data repair: re-save the 7 null categories (incl. "thali A") after fix. Risk MEDIUM (KOT routing, no money).

---
## Retroactive Candidates
- BUG-028 Round 5 (prepaid SC gating) — regression source for Issue 1.
- BUG-297 (category printer lookup) — introduced printerId plumbing with wrong source key → Issue 2.

---
## Probes executed (owner-approved 2026-11-09)
### P1 — Prepaid SC payload (preview UI, ruby owner, no order created)
- Method: Playwright on preview; profile response patched client-side `auto_service_charge="No"` (real ruby setting is `Yes` — NOT changed on server); new Walk-In → 1 item → Collect Bill → ticked `service-charge-toggle-main` (default unticked ✔) → Cash → Pay. `POST /api/v2/vendoremployee/order/place-order` intercepted and **aborted** (nothing created).
- UI: `Service Charge @ 10% ₹12.38`, CGST/SGST on SC ₹0.31 each, **Pay ₹143.01**.
- Payload (`evidence/INV-SC-STATION/prepaid_place_order_payload_autoSC_off_manual_on.txt`): `payment_type:"prepaid"`, `order_sub_total_amount:123.81`, `gst_tax:6.19`, **`service_tax:0`**, **`service_gst_tax_amount:0`**, **`order_amount:130`**.
- ⇒ ₹12.38 SC + ₹0.62 SC-GST shown and collected in UI but absent from payload; order recorded at ₹130 vs ₹143.01 collected.
### P2 — Category station (direct API, ruby, preprod; all probe categories deleted)
| Probe | Request | Result (`GET /product/categories`) |
|---|---|---|
| C add (FE-style) | `station_name=KDS`, `restaurant_printer_id=''` | id 11068 → `station_name:null, restaurant_printer_id:null` ❌ |
| D add | `station_name=KDS`, `restaurant_printer_id=1801` | id 11069 → `station_name:"KDS", restaurant_printer_id:1801` ✅ |
| B edit (FE-style) | existing KDS/1801 edited with `restaurant_printer_id:0` | stays `KDS/1801` (no wipe) |
| A edit | null-station category edited with `restaurant_printer_id:1801` | becomes `KDS/1801` (repaired) |
- Cleanup: 11066-11069 deleted (`Category deleted successfully` ×4), verified absent.
- "thali A" (11065) left untouched — still null (owner's real category; repair after fix).

## Investigation Status: CLOSED 2026-11-09 — both issues CONFIRMED. Next: INTAKE (register 2 bugs).
