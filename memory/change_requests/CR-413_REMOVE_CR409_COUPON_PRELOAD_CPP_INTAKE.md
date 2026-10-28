# CR-413 — REMOVE CR-409 COUPON PRE-LOAD FROM COLLECT PAYMENT PANEL
**Registered:** 2026-10-12
**Type:** CR (behavioral change — remove CR-409 E-2/E-3)
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

CR-409 (implemented 2026-10-11) added `initialCoupon` pre-loading to `CollectPaymentPanel` — when a scan & order arrives with a coupon (`coupon_code = 'MARRY'`), CPP mounts with the coupon already applied via a mount-only `useEffect`. This contradicts the CR-408 intent ("cashier must always choose coupon").

**Owner decision (OD-INV-01 = A, 2026-10-12):** Remove `initialCoupon` pre-loading entirely. Cashier must always choose the coupon, even for scan & order. The coupon field opens blank on CPP mount for all order types.

---

## Owner Decisions — LOCKED

**OD-INV-01 = A** — Remove CR-409 `initialCoupon` pre-load entirely. CPP opens with empty coupon field for all order types. (Owner 2026-10-12)

---

## Duplicate Check

**DISTINCT** — no prior CR for this rollback.
**REVERSES CR-409 E-2 + E-3** (partially — E-1 in `orderTransform.js` kept for other consumers).

---

## Evidence

- **Source:** OWNER-REPORTED (2026-10-12) — screenshot showing MARRY (-₹197) auto-applied on CPP open for scan & order
- **Confidence:** CONFIRMED — code trace: CPP L338 `setSelectedCoupon(initialCoupon)` is the only non-cashier source setting `selectedCoupon ≠ null` (CR-408 CRM auto-apply confirmed removed)
- **Investigation report:** `INV-LOYALTY-COUPON-SCAN-OCT12_INVESTIGATION_REPORT.md`

---

## What CR-409 did vs what to keep

| CR-409 edit | Keep? | Why |
|---|---|---|
| **E-1** `orderTransform.js` — adds `couponCode/couponDiscount/couponTitle/couponType` to `fromAPI.order` | ✅ KEEP | Used by `AggregatorOrderPopOut`, `OrderDetailSheet`, `orderLedgerService` for display |
| **E-2** `CollectPaymentPanel.jsx` — `initialCoupon=null` prop + mount useEffect L333-342 | ❌ REMOVE | This is the auto-loading behavior owner doesn't want |
| **E-3** `OrderEntry.jsx` — builds `initialCoupon` shape + passes to CPP | ❌ REMOVE | No prop needed once E-2 is removed |
| Test `orderTransform.cr409.test.jsx` | ✅ KEEP | Tests E-1 (transform fields) which remains valid |

---

## Severity

**P1 — HIGH:** Coupon appears auto-applied on CPP open for all scan & order orders with a coupon. Cashier has no choice. Inconsistent with CR-408 intent.

---

## Risk Classification

**CRITICAL** — touches R5 hotspots (`CollectPaymentPanel.jsx`, `OrderEntry.jsx`) + coupon/discount financial logic.

---

## Blast Radius

- **Scope:** SMALL — 2 R5 files, ~12 lines removed
- `CollectPaymentPanel.jsx`: remove 1 prop declaration + 9-line mount useEffect
- `OrderEntry.jsx`: remove ~10-line `initialCoupon` prop pass block

---

## Code Reality

**FULL** — `initialCoupon` prop present at CPP L76–77, mount effect at L333-342, prop passed from OrderEntry ~L1936-1953.

---

## Related

- CR-409: this CR partially reverts CR-409 E-2/E-3
- CR-408: CR-413 is consistent with CR-408 intent (cashier always chooses)
- CR-412: companion — same 2 R5 files, same gate cycle recommended

---

## Next

→ Gate 2 GO (joint with CR-412 — same files) → Impact Analysis
