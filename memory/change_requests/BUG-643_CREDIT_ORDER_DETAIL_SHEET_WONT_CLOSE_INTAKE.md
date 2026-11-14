# BUG-643 — Credit Management — Order Details pop-up (SS3) does not close on X click

**ID:** BUG-643  **Type:** BUG  **Registered:** 2026-11-05  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Payments / Coupons / Credit  **Source:** OWNER-REPORTED (chat 2026-11-05)  **Related:** BUG-104

## Description
Credit Management → customer drawer (SS2) → View → Order details (SS3). Clicking X does not close the pop-up (owner screenshot, cursor on X, order 000868).

## Evidence
- `evidence/BUG-643/owner_ss2_credit_drawer_view_2026_11_05.png` (SS2, View button)
- `evidence/BUG-643/owner_ss3_order_000868_close_x_2026_11_05.png` (SS3, cursor on X)
- Curl output: not captured (no test credentials in memory/test_credentials.md)
- Confidence: REPORTED + code-inspected (LIKELY)

## Duplicate Check
DISTINCT — related: BUG-104

## Code Reality
PARTIAL — SS3 is `OrderDetailSheet` portaled to document.body (src/components/credit/CreditCustomerDetailSheet.jsx ~L714) OUTSIDE the Radix modal Sheet (SS2). Radix modal Dialog sets `pointer-events:none` on body and blocks outside interaction/scroll; SS3 X button + backdrop live outside SS2 content → clicks likely swallowed. Escape key handler exists (src/components/reports/OrderDetailSheet.jsx ~L532), so keyboard close may still work. Hypothesis: LIKELY (code mechanism, not live-reproduced — no test credentials).

## Blast Radius
SMALL (CreditCustomerDetailSheet.jsx + OrderDetailSheet.jsx; non-hotspot; OrderDetailSheet also used by Audit/Order reports → regression check)

## Open Owner Decisions
- OD-643-01 Confirm whether Esc key closes it (helps confirm root cause) — OPEN

## Next
Planning Gate 2.

## Code answer to OD-643-01 (2026-11-05)
- Esc: `OrderDetailSheet.jsx` L530-538 listens on `document` keydown → calls onClose. SS2 (`CreditCustomerDetailSheet.jsx` L309) only `preventDefault()`s Radix's own Esc dismiss; it does not stop propagation → **Esc should close SS3**.
- X click: Radix modal sets `pointer-events:none` on `<body>`; SS3 is portaled as a direct child of body (outside SS2 content) → inherits `pointer-events:none` → **X and backdrop clicks are ignored**. Root cause: CONFIRMED BY CODE (high confidence).

## (2026-11-05) INTAKE FROZEN — root cause confirmed by code.
