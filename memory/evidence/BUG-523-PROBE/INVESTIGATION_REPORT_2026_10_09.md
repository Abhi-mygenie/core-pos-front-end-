# INVESTIGATION REPORT — Issue 1 (Split btn) + Issue 2 (Room split legs limit)

**Date:** 2026-10-09
**Role:** INVESTIGATION
**Steps used:** 10/10 (used all 10 — curl probe required)

---

## ISSUE 1 — Split Payment Button Missing in Folio Checkout

### Root Cause: CSS Rule — Intentional D88 Decision (FU-385-D)

**Classification:** DESIGN_DECISION_REVERSAL — not a regression or unintentional bug
**Confidence:** CONFIRMED (live DOM + CSS rule extraction + registry entry)
**Evidence:** CSS matchingRules from live DOM: `{selector: '.frontdesk-bill [data-testid="payment-split-btn"]', display: 'none'}`

```css
/* frontdesk.css L33 — CR-385 D88 / Phase 4.5b */
.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }
```

### Probe Sequence (10 steps used)

| Step | Method | Finding |
|---|---|---|
| 1 | Code analysis: profileTransform | Root cause was NOT profileTransform — payment_types IS at restaurants[0] |
| 2 | Curl probe: login + GET profile | `restaurants[0].payment_types` has 7 types including `{name:'partial'}` |
| 3 | Node.js simulation: filterLayoutByApiTypes | `enabledLayout.row2 = ['split','credit','transferToRoom']` — correct |
| 4 | Browser: login, navigate to Folio CPP | Console log captured |
| 5 | Browser console log | `restaurantPaymentTypes: Array(7)`, `hasRooms: true` — data correct |
| 6 | Browser DOM check | `payment-split-btn` EXISTS in DOM but `display: none` |
| 7 | Browser CSS inspection | CSS rule: `.frontdesk-bill [data-testid="payment-split-btn"] { display: none }` |
| 8 | Source: frontdesk.css L33 | Confirmed: intentional rule, D88 decision, FU-385-D registered |
| 9 | Registry: FU-385-D | PLANNED — "delete frontdesk.css D88 rule + hideSectionRows guard" |
| 10 | BUG-523 recheck | BUG-523 fix (profileTransform) does nothing harmful but is not the root cause |

### What BUG-523 Did (Re-assessment)

BUG-523 was based on a WRONG hypothesis (root-level `payment_types`). Actual situation:
- `payment_types` IS at `restaurants[0]` level ✓
- `restaurant.paymentTypes` correctly includes `partial` ✓
- `enabledLayout.row2` correctly includes `'split'` ✓
- Split button IS rendered (exists in DOM) ✓
- Split button is then **hidden by CSS** ✗

BUG-523's profileTransform change is a no-op (root-level `api.payment_types` = undefined → falls back to `restaurants[0].payment_types` exactly as before). Not harmful, not helpful.

### Fix (FU-385-D — already registered)

**File 1:** `src/components/pms/frontdesk/frontdesk.css`
- Remove L33: `.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }`

**File 2:** `src/tests/cr385/hideSectionRows.cr385.test.js`
- Remove `'payment-split-btn'` from TOGGLES array (L8)

**Risk:** LOW — CSS-only, 2 files, reversal of tracked D88 decision
**Registry item:** FU-385-D (already PLANNED at P2/MEDIUM)
**Gate status:** FU-385-D at PLANNED — needs Gate 2 IA → Gate 3 Plan → Gate 4 GO

### Retroactive: BUG-523 Registry Note

BUG-523 fix in profileTransform.js is NEUTRAL. The 4th arg `paymentTypesOverride` = undefined (root has no `payment_types`). Falls back to `api.payment_types` from restaurants[0] exactly as before.
**Recommendation:** Leave BUG-523 code in place (harmless + defensive), update registry note.

---

## ISSUE 2 — Split Room Payment Legs Have No Amount Limit

### Root Cause: Missing Validation in FolioCheckoutPanel

**Classification:** FE_BUG — missing guard on room split legs total
**Confidence:** CONFIRMED (code trace + screenshot evidence)

### Code Trace

```
roomSplitLegs = [{mode:'cash', amount:'88000'}, {mode:'upi', amount:'9000'}]
baseBalance = 600  (after ₹1,500 advance from ₹3,000 booking)
roomDiscountInfoRs = 0 (no room discount applied)

Effective room balance = baseBalance - roomDiscountInfoRs = 600

FolioCheckoutPanel.handlePaid() [L309-317]:
  if (roomSplitEnabled) {
    const positiveLegs = roomSplitLegs.filter(l => parseFloat(l.amount) > 0);
    // positiveLegs = [{cash,88000}, {upi,9000}] — sum = 97000 >> 600
    if (positiveLegs.length > 0) {
      payload.partial_payments_room = positiveLegs.map(...)  // ← sent with NO total cap check
    }
  }
  // No validation: positiveLegs total (97000) vs effective room balance (600)
  const data = await payBill(payload);  // ← fires with wrong amounts
```

**BREAK POINT:** `handlePaid` does not validate `sum(positiveLegs.amount) vs (baseBalance - roomDiscountInfoRs)`.

### What Should Happen

1. If `roomSplitEnabled` and `sum(positiveLegs) > effectiveRoomBalance` → block Checkout with payError
2. Visual warning in `RoomDiscountControls` when total > effective room balance (like discount alert pattern)

### Available Variables

In `FolioCheckoutPanel`:
- `baseBalance` — folio balance payment (₹600 in example)
- `roomDiscountInfoRs` — applied room discount
- `effectiveRoomBalance = Math.max(0, baseBalance - roomDiscountInfoRs)` (already used at L168 in RoomSection)

### Fix Scope

File: `FolioCheckoutPanel.jsx` only
- E1: `RoomDiscountControls` — add computed `roomSplitTotal` + display warning when `roomSplitEnabled && total > effectiveBalance`
- E2: `handlePaid` — add guard before `payBill`: if `roomSplitEnabled && sum > effectiveBalance` → `setPayError(...)` + return

**Risk:** MEDIUM (financial validation, room billing — must block overcharge but not over-restrict)
**Gate:** Full gate cycle (financial validation, R6-adjacent)

---

## Recommendations

| Issue | Classification | Fix path | Owner decision needed |
|---|---|---|---|
| Issue 1 (Split CSS) | DESIGN_DECISION_REVERSAL | FU-385-D already registered — Gate 2 IA + Gate 3 Plan | YES — confirm D88 is reversed, FU-385-D activated |
| Issue 2 (legs limit) | FE_BUG | New BUG registration → Gate 2 → Gate 3 → Gate 4 | Confirm: block on over-limit OR warn only? |
| BUG-523 fix | NEUTRAL | Leave in place, update registry note | No action needed |

---

## Evidence Artifacts

- `/app/memory/evidence/BUG-523-PROBE/profile_response.json` — full profile API response
- `/app/memory/evidence/BUG-523-PROBE/payment_types_analysis.txt` — payment types analysis
