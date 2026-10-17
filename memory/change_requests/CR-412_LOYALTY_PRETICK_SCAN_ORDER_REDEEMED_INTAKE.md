# CR-412 — LOYALTY PRE-TICK FROM SCAN & ORDER WHEN REDEEMED=TRUE
**Registered:** 2026-10-12
**Type:** CR (new behavior — loyalty pre-tick from scan & order data)
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

When a scan & order (web/QR) arrives at the POS cashier with `loyalty_info.redeemed = true` (customer redeemed loyalty during self-ordering), the Collect Payment Panel opens with the loyalty checkbox **unchecked** and `useLoyalty = false`. The cashier has no indication that loyalty was already applied by the customer.

**Required behavior (OD-INV-02 = B, owner 2026-10-12):** If `loyalty_info.redeemed = true` in the order data (from LIST API or socket), pre-tick the loyalty checkbox regardless of `redeemed_amount`.

---

## Owner Decisions — LOCKED

**OD-INV-02 = B** — Pre-tick loyalty whenever `loyalty_info.redeemed = true`, regardless of `redeemed_amount` value (even 0). (Owner 2026-10-12)

**OD-GAP3** — Backend will include `loyalty_info` in `update-order` socket payload. No FE guard needed in `socketHandlers.js`. Once backend ships it, `fromAPI.order` reads it naturally. (Owner 2026-10-12)

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG.
Related: CR-410 (BACKEND-BLOCKED for different reason — wanted `loyalty_redemption_id`). CR-412 is simpler: just pre-tick `useLoyalty` from `redeemed` boolean. No CRM reconciliation needed.

---

## Evidence

- **Source:** OWNER-REPORTED (2026-10-12)
- **Confidence:** CONFIRMED — live probe orders 1233149 (`redeemed=true, amount=7`) and 1233147 (`redeemed=true, amount=0`)
- **Investigation report:** `INV-LOYALTY-COUPON-SCAN-OCT12_INVESTIGATION_REPORT.md`
- **Evidence:** `evidence/INV-LOYALTY-COUPON-SCAN-OCT12/gap3_socket_validation.json`

---

## Root Cause — 2-layer gap

**Layer A:** `fromAPI.order` (orderTransform.js) does not read `loyalty_info`:
```javascript
// couponCode: api.coupon_code || ''   ← CR-409 added ✓
// loyaltyRedeemed: ???                ← NOT READ ✗
```

**Layer B:** CPP has no `initialLoyalty` prop — `useLoyalty` always starts `false`.

**Socket gap (GAP-3):** `update-order` socket payload currently has NO `loyalty_info`. After backend ships it, `fromAPI.order` reads it on every socket update automatically.

---

## Severity

**P1 — HIGH:** Cashier sees no indication loyalty was redeemed in scan & order. Loyalty discount may be double-applied or missed. Affects every restaurant using loyalty + scan & order.

---

## Risk Classification

**CRITICAL** — touches R5 hotspots (`orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`) + loyalty/financial logic.

---

## Blast Radius

- **Scope:** MEDIUM — 3 R5 files, ~15 lines added
- `orderTransform.js`: +1 field `loyaltyRedeemed`
- `CollectPaymentPanel.jsx`: +1 prop `initialLoyalty` + 1 mount useEffect
- `OrderEntry.jsx`: +1 prop pass

---

## Code Reality

**NONE** — no `loyaltyRedeemed` field in `fromAPI.order`, no `initialLoyalty` prop in CPP.

---

## Related

- CR-410 (BACKEND-BLOCKED): asked for loyalty amount + redemption_id for CRM reconciliation — still blocked
- CR-412: simpler — only needs `redeemed` boolean to pre-tick checkbox. No CRM needed.
- CR-413: companion — remove CR-409 coupon pre-load (same files)

---

## Next

→ Gate 2 GO (joint with CR-413 — same files) → Impact Analysis
