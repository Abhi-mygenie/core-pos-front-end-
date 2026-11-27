# CR-492 — Runtime Complementary Should Be Rights-Based (complementary_food role)

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (permission bypass: any staff can mark items complementary without authorization)
**Risk:** CRITICAL (touches order flow, billing, discount logic — R5 hotspot files)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD

---

## Description

Currently, runtime complementary marking (marking items as complimentary during order-taking) is available to ALL staff regardless of their role. The backend will pass a role/permission key `complementary_food` that should gate this feature — only employees with `complementary_food` permission should be able to mark items as complementary at runtime.

**Expected behavior:** The "Mark Complementary" action in OrderEntry/CollectPaymentPanel should be visible/enabled ONLY when the logged-in employee has the `complementary_food` permission (passed from backend as part of the role/permissions payload).

**Current behavior:** Any staff member can mark items as complementary — no permission check exists in the frontend.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Log in as any employee → add items to order → mark as complementary → succeeds regardless of role
- **Confidence:** CONFIRMED (code-traced: no `complementary_food` permission check in complementary flow)

---

## Code Reality Check

**Code reality: PARTIAL** — complementary marking logic exists (`orderTransform.js` L779-787, L1594-1605, `CollectPaymentPanel.jsx` complementary toggle), but NO permission gating on `complementary_food`. `hasPermission('order_cancel')` pattern exists for cancellation — same pattern needed for complementary.

---

## Duplicate Check

**RELATED** to:
- CR-058 (Order-level "Mark Order Complimentary" — INTAKE/PARKED): order-level scope, this is item-level permission gating
- CR-104 (Item-level complementary reason — QA PASS): added mandatory reason note, but NOT permission gating
- BUG-298/299 (item-level comp UI — QA PASS): UI provision for marking, no permission check
- CR-445 (One-Click Complimentary Button — INTAKE): UX shortcut, distinct from permission gating

**Verdict: DISTINCT** — none of the related items implement role-based gating.

---

## Blast Radius

- `is_complementary` referenced in ~25 lines across ~6 files
- Hotspot files touched: YES — `orderTransform.js` (R5), `CollectPaymentPanel.jsx` (R5), `OrderEntry.jsx` (R5)
- Estimated scope: MEDIUM (3-5 files, ~15-25 lines)

---

## Open Questions

- **OD-492-01:** When `complementary_food` permission is absent, should the complementary toggle be HIDDEN or DISABLED (greyed out with tooltip)?
- **OD-492-02:** Does the `complementary_food` permission key come from the same `permissions[]` array in login response, or is it a separate restaurant setting?
- **OD-492-03:** Should the gating apply to BOTH item-level comp (CR-104 flow) AND order-level comp (CR-058 flow)?
