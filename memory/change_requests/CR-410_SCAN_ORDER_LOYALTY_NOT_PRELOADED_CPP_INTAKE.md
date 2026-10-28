# CR-410 — SCAN ORDER LOYALTY NOT PRE-LOADED IN COLLECT PAYMENT
**Registered:** 2026-10-11
**Type:** CR (Gap — missing data flow from scan & order → POS)
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

When a scan & order (web/QR order) arrives at the POS cashier with loyalty points redeemed by the customer, the Collect Payment panel has **no knowledge of the loyalty redemption**. The cashier sees the full pre-loyalty total. The loyalty discount is lost.

**Root cause:** `fromAPI.order` in `orderTransform.js` does not read `loyalty_info`, `loyalty_discount`, or `used_loyalty_point` from the raw API order. These fields exist on the `employee-orders-list` response (confirmed via probe: order 1233112 — `loyalty_info: {earned: true, redeemed: false, redeemed_amount: 0}`). `CollectPaymentPanel` starts with `useLoyalty = false` and `loyaltyDiscount = 0` — it has no initialisation path from an existing order's loyalty state.

**Concrete impact:**
- If a scan & order customer redeemed loyalty (e.g., `redeemed: true`, `redeemed_amount: 108`), the POS shows ₹108 more than what the customer was charged
- Cashier cannot tell whether loyalty was redeemed without cross-checking the original order
- Even when `redeemed: false`, the `loyalty_info.earned` flag signals the customer will earn points on this order — this is currently untracked in the POS display

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG in registry for this gap.
Related: CR-409 (coupon not pre-loaded — companion gap). Both touch the same files.

---

## Evidence

- **Source:** OWNER-REPORTED (investigation session 2026-10-11)
- **Confidence:** CONFIRMED — curl-verified on live order 1233112 (RID 689)
- **Investigation report:** `/app/memory/BUG-SCAN-COUPON-INV-OCT11_INVESTIGATION_REPORT.md`

**API evidence (order 1233112):**

| Field | LIST API (`employee-orders-list`) | `fromAPI.order` output |
|---|---|---|
| `loyalty_info` | `{earned: true, redeemed: false, redeemed_amount: 0, order_sub_total: 1379}` | (not mapped) ✗ |
| `loyalty_discount` | `null` (field absent on this order — not redeemed) | (not mapped) ✗ |
| `used_loyalty_point` | absent | (not mapped) ✗ |

---

## Severity Rubric

**P1 — HIGH:** Any scan & order with loyalty redeemed shows incorrect total at checkout. Financial impact per order. Customer was charged less; POS shows more. Cashier must manually reconcile every such order.

---

## Risk Classification

**CRITICAL** — Fix touches the same R5 hotspot files as CR-409:
- `orderTransform.js` (R5) — add `loyaltyInfo`, `loyaltyDiscount`, `usedLoyaltyPoint` to `fromAPI.order`
- `CollectPaymentPanel.jsx` (R5) — add `initialLoyalty` prop + pre-seed `useLoyalty`/`loyaltyDiscount`
- `OrderEntry.jsx` (R5) — pass new prop to CPP

Fast Lane eligible: **NO**

---

## Blast Radius

- **Scope:** LARGE — same 3 R5 hotspot files as CR-409
- `BUG108_FLAGS.loyaltyRatioLive = true` — loyalty feature is live; changes here are financial
- **Execution dependency:** CR-410 MUST be implemented in the same batch as CR-409 (same files, same gate cycle — prevents double-hotspot conflict between two sequential agents)

---

## Code Reality

**NONE** — `fromAPI.order` (L196–449) has no `loyaltyInfo`, `loyaltyDiscount`, or `usedLoyaltyPoint` field. Pure addition.

---

## Open Questions for Planning — LOCKED (PARTIAL — OD-410-01 BACKEND-BLOCKED)

**OD-410-01: LOCKED = B (intent) — BACKEND-BLOCKED.**
Cashier should see loyalty pre-ticked with redeemed amount and be able to remove it. However, the current `loyalty_info.redeemed_amount` field in the LIST API is NOT sufficient to initialize CPP. A dedicated key needs to be exposed by the backend in both the order API response and the socket payload. Backend brief filed: `backend_briefs/BACKEND_BRIEF_CR-410_LOYALTY_KEY_2026_10_11.md`. CR-410 implementation is blocked until backend ships the new field. (Owner decision 2026-10-11)

**OD-410-02: LOCKED = A** — If loyalty was NOT redeemed in scan & order (`redeemed_amount = 0`), cashier can still apply loyalty manually via the checkbox. Normal loyalty flow applies. (Owner decision 2026-10-11)

**OD-410-03: LOCKED = A** — Joint gate cycle with CR-409. CR-409 can proceed now (no backend dependency). CR-410 gate cycle starts after backend delivers the new key. (Owner decision 2026-10-11)

---

## Related

- CR-408: Auto-apply removed
- CR-409: Coupon not pre-loaded (companion — same files, same gate cycle recommended)
- Investigation: `BUG-SCAN-COUPON-INV-OCT11_INVESTIGATION_REPORT.md`

---

## Next

→ Gate 2 GO → Impact Analysis (jointly with CR-409 since same files)
