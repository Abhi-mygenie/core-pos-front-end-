# CR-170 — Conditional Grand Total Round-Off (< 0.10 → Floor, ≥ 0.10 → Ceil)

**ID:** CR-170
**Type:** CR (Behavior Change)
**Priority:** P2
**Risk:** HIGH
**Sprint:** POS 5.0
**Reported by:** Owner (2026-08-20, this session)
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Date:** 2026-08-20
**Duplicate check:** DISTINCT
  - BUG-051 / BUG-076: established always-ceil → this CR reverts to conditional (owner changing own rule)
  - BUG-119: backend fixed negative round_up (backend-side only) → now FE intentionally sends negative
  - CR-029-QSR: round_up persistence on collect bill → RELATED (same field, different scope)
**Code Reality:** NONE — no conditional ceil/floor exists anywhere in codebase

---

## Description

Change the grand total round-off rule from **always ceiling** (current) to a **threshold-based** rule:

| Condition | Action | Example | round_up sent |
|---|---|---|---|
| Decimal **< 0.10** | Floor (round DOWN) | ₹100.04 → **₹100** | `"-0.04"` (negative) |
| Decimal **≥ 0.10** | Ceil (round UP) | ₹100.10 → **₹101** | `"0.90"` (positive) |
| Decimal = 0 | No change | ₹100.00 → **₹100** | `"0.00"` |

Round-off toggle (`restaurant.totalRound`) continues to gate the entire feature — no change to gating logic.

**Background:** Current always-ceil rule was set by BUG-051/BUG-076 (owner-approved). Owner now wants conditional behavior: small paise (< 10 paise) are absorbed by flooring; larger paise round up as before. Negative round-off is explicitly desired and backend confirmed to accept it.

---

## Owner Decisions (all confirmed in this session)

| # | Question | Answer |
|---|---|---|
| D1 | Threshold | `< 0.10` → floor; `≥ 0.10` → ceil |
| D2 | Negative display | Show on receipt as `Round Off: -₹0.04` |
| D3 | Backend field | Same `round_up` key, backend accepts negative ✅ |
| D4 | Gate condition | Only when `totalRound = true` |

---

## Evidence

- Source: OWNER-DESCRIBED (verbal, this session)
- Prior behavior confirmed by investigation + test file `round001.alwaysCeil.test.js`
- Backend acceptance of negative `round_up`: owner confirmed ✅
- Confidence: CONFIRMED

---

## Blast Radius

**Files WILL change (3 hotspot files + 1 test):**

| File | Line | Nature |
|---|---|---|
| `src/api/transforms/orderTransform.js` | L869, L872, L881, L1630 | Rounding formula + remove clamp guards |
| `src/components/order-entry/CollectPaymentPanel.jsx` | L679 | Rounding formula |
| `src/components/order-entry/CartPanel.jsx` | ~L343 | Rounding formula |
| `src/__tests__/api/transforms/round001.alwaysCeil.test.js` | all | Spec rewrite |

**Files WILL NOT touch:** `profileTransform.js`, `restaurantSettingsTransform.js`, `RestaurantSettingsPage.jsx`, `orderService.js`, `reportTransform.js`, `insightsService.js`

**Hotspot files touched:** YES — orderTransform.js (R5) + CollectPaymentPanel.jsx (R5)
**Financial logic:** YES — `order_amount` (R6)
**Blast radius:** MEDIUM (3-4 files, ~8 line changes)

---

## Risk Classification

**HIGH**
- Reason: Touches R5 hotspot files (orderTransform + CollectPaymentPanel + CartPanel) + R6 financial logic (`order_amount`, `round_up` payload field)
- Process: Full gate flow + owner approval at Gate 4 (mandatory — financial change)
- Fast Lane: NOT eligible

---

## Related Items

| ID | Relation |
|---|---|
| BUG-051 | Established always-ceil rule — this CR changes it |
| BUG-076 | Locked always-ceil replacing old conditional — this CR introduces new conditional |
| BUG-119 | Backend fixed negative round_up (CLOSED) — backend now accepts negative ✅ |
| CR-029-QSR | round_up field persistence — RELATED, shares `round_up` field |

---

## Open Questions
None — all owner decisions confirmed.

---

## Gate Status
- [x] Gate 0 — Intake registered
- [x] Gate 1 — Owner confirmed (all OQs answered)
- [ ] Gate 2 — Impact Analysis
- [ ] Gate 3 — Implementation Plan
- [ ] Gate 4 — Owner GO
- [ ] Gate 5a — Implementation
- [ ] Gate 5b — QA
- [ ] Gate 6 — Owner Smoke
