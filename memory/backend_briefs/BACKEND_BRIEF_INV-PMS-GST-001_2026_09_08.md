# BACKEND_BRIEF_INV-PMS-GST-001_2026-09-08

## Summary
- Issue: FE currently sends `gst_tax: '0.00'` on every PMS room check-in. Now implementing slab-based GST computation. Need confirmation on checkout payload contract before fixing GAP-7.
- Classification: CONTRACT_MISMATCH
- Frontend impact: Checkout drawer (`PmsCheckoutDrawer`) may be missing room accommodation GST in `order-bill-payment` payload
- Priority/Risk: P1 / HIGH

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/order/order-bill-payment`
- Auth: Bearer {TOKEN}
- Context: Room checkout via `PmsCheckoutDrawer` → `orderToAPI.collectBillExisting`

## Question Q-GST-01
## Question Q-GST-01 — ANSWERED 2026-09-09

**Answer: Option (a) — YES.** FE must send `room_gst_tax` as a dedicated field in the checkout payload.

**Evidence:** Curl probe `POST /api/v2/vendoremployee/order/order-bill-payment` with `room_gst_tax: 200` passed ALL field validation without rejection. API reached business logic layer ("Order not found" 404 for probe fake order_id). Field is accepted. Probe saved: `evidence/INV-PMS-GST-001/probe_bill_payment_gst.json`.

**Implementation:** E7 in `PmsCheckoutDrawer.jsx` already uses `payload.room_gst_tax = roomGstTax`. TODO comment removed 2026-09-09. Gate closed.

---

*Original question below for reference:*

After this fix, check-in will store the correct `gst_tax` value in `user_id_documents.gst_tax`.

At checkout, does `order-bill-payment` require a separate explicit `gst_tax` field for room accommodation tax?

Option (a): **YES** — FE must pass room accommodation `gst_tax` separately in the checkout payload. FE will need to read `gst_tax` from `room_payment_summary.gst_tax` (returned by `employee-orders-list`) and include it in the `order-bill-payment` call.

Option (b): **NO** — BE derives the room tax internally from `user_id_documents.gst_tax` (set at check-in). FE only needs to send food-order GST (from F&B items) — no extra room GST field needed in checkout payload.

## Evidence / Context
- `pms_gst.md §4`: *"FE sends `gst_tax` amount for the folio; BE stores it on the order (does NOT rewrite `user_id_documents.gst_tax`)"* — ambiguous: is this the food GST or the room GST?
- Checkout code path: `PmsCheckoutDrawer.jsx:138` → `orderToAPI.collectBillExisting` → `gst_tax` in payload is food-order GST only
- `room_payment_summary.gst_tax` IS available from `employee-orders-list` response (see `pms_gst.md §3`)

## Frontend Workaround
- Available: NO — cannot fix without knowing the answer
- Impact if Q-GST-01 goes unanswered: GAP-7 (checkout GST) remains unfixed, but GAP-1/2/3/4/5 (check-in) can proceed independently.
