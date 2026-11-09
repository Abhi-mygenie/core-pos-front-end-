# CR-409 — SCAN ORDER COUPON NOT PRE-LOADED IN COLLECT PAYMENT
**Registered:** 2026-10-11
**Type:** CR (Gap — missing data flow from scan & order → POS)
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

When a scan & order (web/QR order) arrives at the POS cashier with a coupon pre-applied by the customer, the Collect Payment panel opens with **no coupon populated**. The cashier sees the full pre-discount total instead of the discounted amount the customer was actually charged.

**Root cause:** `fromAPI.order` in `orderTransform.js` does not read `coupon_code`, `coupon_discount`, `coupon_title`, or `coupon_type` from the raw API order. These fields exist on the `employee-orders-list` response (confirmed via probe: order 1233112 — `coupon_code: MARRY`, `coupon_discount: 197`) but are silently dropped during the transform. `CollectPaymentPanel` has no way to initialise from the existing order's coupon — it starts with `selectedCoupon = null` and `couponDiscount = 0`.

**Concrete impact on order 1233112:**
- Backend `order_amount` = ₹1,242 (post-coupon, post-tax — correct)
- POS `itemTotal` = ₹1,379 (raw items, no coupon)
- POS `couponDiscount` = 0 (no coupon pre-loaded)
- POS shows **₹1,441** (1,379 + 5% GST) instead of the correct **₹1,242**
- Discrepancy: ₹199 — cashier either overcharges the customer or must manually re-apply the coupon every time

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG in registry touching this data-flow gap.
Related: CR-408 (auto-apply removed — cashier must choose). CR-409 is complementary: for scan & order, the pre-applied coupon SHOULD be pre-loaded (it is already committed by the customer).

---

## Evidence

- **Source:** OWNER-REPORTED (investigation session 2026-10-11)
- **Confidence:** CONFIRMED — curl-verified on live order 1233112 (RID 689, Kunafa Mahal)
- **Investigation report:** `/app/memory/BUG-SCAN-COUPON-INV-OCT11_INVESTIGATION_REPORT.md`
- **Live order probe:** `/app/memory/evidence/BUG-SCAN-COUPON-INV-OCT11/order_1233112_raw.json`

**API evidence:**

| API | `coupon_code` | `coupon_discount` |
|-----|--------------|-------------------|
| `employee-orders-list` | `MARRY` ✓ | `197` ✓ |
| `get-single-order-new` | `null` ✗ | `null` ✗ |
| `fromAPI.order` output | (not mapped) ✗ | (not mapped) ✗ |

---

## Severity Rubric

**P1 — HIGH:** Every scan & order with a pre-applied coupon shows the wrong total at checkout. Cashier either overcharges or must manually re-apply the coupon for every such order. Financial impact on every coupon-enabled restaurant using scan & order.

---

## Risk Classification

**CRITICAL** — Fix touches:
- `orderTransform.js` (R5 hotspot) — add coupon fields to `fromAPI.order`
- `CollectPaymentPanel.jsx` (R5 hotspot) — add `initialCoupon` prop + pre-seed `selectedCoupon`
- `OrderEntry.jsx` (R5 hotspot) — pass new prop to CPP

Trigger: financial/coupon logic + 3 R5 hotspot files.
Fast Lane eligible: **NO**

---

## Blast Radius

```bash
grep -rn "fromAPI\.order\b" /app/frontend/src/ → orderTransform.js (definition) + orderService.js + socketHandlers.js
grep -rn "CollectPaymentPanel" OrderEntry.jsx → prop-passing site
```

- **Scope:** LARGE — 3 R5 hotspot files
- **Downstream reads of `order.couponCode`/`order.couponDiscount`:** `AggregatorOrderPopOut.jsx`, `OrderDetailSheet.jsx`, `orderLedgerService.js` — these currently get empty/0 for scan orders; fixing the transform automatically populates them too (additive benefit)

---

## Code Reality

**NONE** — `fromAPI.order` (L196–449) has no `couponCode`, `couponDiscount`, `couponTitle`, `couponType` field. The gap is a missing mapping; no existing code needs to be deleted or changed, only added.

---

## Open Questions for Planning — LOCKED

**OD-409-01: LOCKED = B** — Cashier CAN remove the pre-loaded coupon (full control; owner decision 2026-10-11)

**OD-409-02: LOCKED = B — CLEAN. No socket-refresh risk.**
The `scan-new-order` socket event carries the full order payload. `handleScanNewOrder` calls `orderFromAPI.order(rawPayload.orders[0])` inline — no `get-single-order-new` call is made. Fixing `fromAPI.order` to read `coupon_code`/`coupon_discount` from the raw order is sufficient. The coupon data present in the socket payload will flow through the transform and into the order context correctly. No guard required. (Owner clarified 2026-10-11)

---

## Related

- CR-408: Auto-apply removed (cashier must choose) — for regular POS orders
- CR-410: Loyalty not pre-loaded from scan & order (companion gap)
- Investigation: `BUG-SCAN-COUPON-INV-OCT11_INVESTIGATION_REPORT.md`

---

## Next

→ Gate 2 GO → Impact Analysis (jointly with CR-410 since same files)
