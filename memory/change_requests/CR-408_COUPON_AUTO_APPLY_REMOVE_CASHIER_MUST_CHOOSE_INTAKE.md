# CR-408 — COUPON AUTO-APPLY REMOVE: CASHIER MUST CHOOSE
**Registered:** 2026-10-11
**Type:** CR (Behavioral Change — owner revokes BUG-108 V1B decision B-5)
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

The Collect Payment Panel currently auto-applies the "best" available CRM coupon silently as soon as the available coupons are fetched from CRM. This fires for ALL order types (POS-punched, scan & order, delivery, etc.) without cashier interaction.

**Owner decision (2026-10-11):** Coupons must NOT be auto-applied. The cashier must explicitly choose/enter the coupon code. The type-ahead auto-complete (after cashier types a prefix) is acceptable and must remain.

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG for this behavioral change.
- BUG-108 V1B explicitly designed auto-apply (owner decision B-5 at the time). This CR revokes that decision.

---

## Evidence

- **Source:** OWNER-REPORTED (owner@kunafamahal.com, 2026-10-11)
- **Confidence:** CONFIRMED (owner described expected behavior; agent confirmed code path)
- **Investigation report:** `/app/memory/BUG-SCAN-COUPON-INV-OCT11_INVESTIGATION_REPORT.md`
- **Live order probe:** `/app/memory/evidence/BUG-SCAN-COUPON-INV-OCT11/order_1233112_raw.json` (order 1233112, coupon MARRY auto-applied)
- **Code evidence:** `CollectPaymentPanel.jsx` lines 882–887

---

## Root Cause (from Investigation)

`CollectPaymentPanel.jsx` lines 882–887 — a `useEffect` watching `displayedCoupons`:

```javascript
useEffect(() => {
  if (selectedCoupon || couponCode || !displayedCoupons.length) return;
  const best = displayedCoupons.find(c => !c.requiresCartValidation && c.withinWindowNow !== false);
  if (best) runValidate(best.code);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [displayedCoupons]);
```

Fires silently when available coupons load — no cashier action required. No guard for order type, isWebOrder, or cashier intent.

---

## Severity Rubric

**P1 — HIGH:** Feature works but in wrong mode. Cashier loses control over coupon selection. A coupon may be silently applied that the customer is not entitled to (e.g., CRM returns a coupon but the scan & order customer applied a different one or none). Financial impact possible on every coupon-enabled restaurant order.

Agent classification: **P1**. Owner confirmed.

---

## Risk Classification

**CRITICAL** — Touches coupon/discount logic (financial) in `CollectPaymentPanel.jsx` (R5 hotspot). Any change here requires full gate flow + owner approval + E2E regression.

- Trigger: discount/coupon logic change in R5 file
- Process required: Full gate flow (Gates 2–5b) + owner Gate 4 GO
- Fast Lane eligible: **NO** (R5 hotspot + financial logic)

---

## Blast Radius

```
grep -rn "displayedCoupons" /app/frontend/src/ → CollectPaymentPanel.jsx only
grep for the useEffect pattern → single location (lines 882-887)
```

- **Scope:** SMALL — 1 file, 6 lines deleted
- **Hotspot files touched:** YES (`CollectPaymentPanel.jsx`)
- **Downstream risk:** LOW — deleting a self-contained useEffect; all other coupon flows (manual entry, type-ahead, display, validate, remove) are unaffected

---

## Code Reality

**PARTIAL** — Feature exists and runs. Behavior change is a deletion (remove the silent auto-apply useEffect). No new logic added.

---

## Scope Lock (Preview)

| | |
|---|---|
| **Files WILL change:** | `CollectPaymentPanel.jsx` (lines 882–887 deleted) |
| **Files will NOT touch:** | `orderTransform.js`, `couponTransform.js`, `couponService.js`, `CartPanel.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`, all other files |

---

## Open Questions for Planning

None — root cause confirmed, fix scope clear. Owner has stated the behavioral intent.

---

## Related

- **BUG-108 V1B:** Original implementation that added auto-apply (decision B-5 now revoked)
- **Investigation:** `BUG-SCAN-COUPON-INV-OCT11_INVESTIGATION_REPORT.md`

---

## Next

→ Gate 2: Impact Analysis
→ Gate 3: Implementation Plan
→ Gate 4 GO (owner approval)
→ Gate 5: Implementation
