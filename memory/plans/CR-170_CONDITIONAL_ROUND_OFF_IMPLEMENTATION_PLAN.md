# CR-170 — Planning Doc: Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)

**ID:** CR-170
**Title:** Conditional Grand Total Round-Off — < 0.10 paise floor (negative round_up), ≥ 0.10 ceil
**Date:** 2026-08-20
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 + Gate 3 (combined, owner-approved)
**Risk:** HIGH (R5 hotspots + R6 financial)
**Intake doc:** `change_requests/CR-170_CONDITIONAL_ROUND_OFF_THRESHOLD_INTAKE.md`

---

## Code Reality Check

```bash
grep -rn "0\.10\|conditional.*round\|floor.*ceil" src/api/transforms/orderTransform.js
# → 0 results — no conditional ceil/floor exists anywhere
grep -n "Math\.ceil" src/api/transforms/orderTransform.js
# → L869: Math.ceil(rawTotal) — only always-ceil, no threshold
```

**Code Reality: NONE** — conditional rule does not exist anywhere. Full new implementation required.

---

## Conflict Pre-Check

| File | Open items touching it | Lines they touch | Overlap with CR-170? |
|---|---|---|---|
| `orderTransform.js` | CR-058 (INTAKE), BUG-299 (INTAKE) | complementary logic (L700+ area) | **SAFE** — no overlap with L869/L872/L881/L1630 |
| `CollectPaymentPanel.jsx` | CR-058 (INTAKE) | complementary order logic | **SAFE** — no overlap with L679 |
| `CartPanel.jsx` | BUG-299 (INTAKE) | complementary CartPanel logic | **SAFE** — no overlap with L450 |

**Conflict Pre-Check: CLEAN** — no open item overlaps with our target lines.

**Execution rule:** CR-058 and BUG-299 must NOT be implemented concurrently with CR-170. Gate 4 GO on CR-170 should be sequential.

---

## Gate 2 — Impact Analysis

### Business Rule Change

| | Before (BUG-051 rule) | After (CR-170 rule) |
|---|---|---|
| ₹100.04 | ₹101 (+₹0.96) | **₹100 (−₹0.04)** |
| ₹100.09 | ₹101 (+₹0.91) | **₹100 (−₹0.09)** |
| ₹100.10 | ₹101 (+₹0.90) | **₹101 (+₹0.90)** (unchanged) |
| ₹100.50 | ₹101 (+₹0.50) | **₹101 (+₹0.50)** (unchanged) |
| ₹100.00 | ₹100 (±₹0) | **₹100 (±₹0)** (unchanged) |
| Toggle OFF | raw 2-decimal | raw 2-decimal (unchanged) |

**Threshold:** `paise < 10` → floor; `paise ≥ 10` → ceil. Paise computed as `Math.round((rawTotal % 1) * 100)` to avoid floating-point drift.

### Data Flow Trace

```
Customer checkout (any order type)
  → calcOrderTotals(cart, ...) — orderTransform.js:780
    → rawTotal = subtotal + SC + tip + delivery + tax
    → orderAmount = applyGrandTotalRoundOff(rawTotal, roundOffEnabled)  ← NEW HELPER
    → roundUp = orderAmount − rawTotal                                  ← can be negative
    → round_up: String(roundUp.toFixed(2))                              ← send negative string
    → returned in: order_sub_total_amount, order_amount, round_up
  → toAPI.placeOrder / toAPI.placeOrderWithPayment sends payload to backend
  → Backend stores round_up (confirmed accepts negative ✅)

Customer at Collect Bill screen
  → CollectPaymentPanel lines 678-681
    → finalTotal = applyGrandTotalRoundOff(rawFinalTotal, roundOffEnabled)  ← NEW HELPER
    → roundOff = finalTotal − rawFinalTotal                                  ← can be negative
    → UI shows "Round Off −₹0.04" or "+₹0.90"
    → handlePayment sends roundOff to collectBillExisting (L1630)
      → round_up field: remove Math.max(0,...) clamp → passes negative

Cart preview (QSR + Full Mode pre-settle display)
  → CartPanel lines 449-452
    → finalTotal = applyGrandTotalRoundOff(rawFinalTotal, roundOffEnabled)  ← NEW HELPER
    → roundOff used for display at L630 (already gated on ≠ 0)
```

### Affected Components

| Component | Role | Impact |
|---|---|---|
| `applyGrandTotalRoundOff` (new) | Single source of truth for rounding rule | New utility function |
| `calcOrderTotals` (orderTransform) | Place-order total computation | `order_amount` + `round_up` in payload |
| `collectBillExisting` (orderTransform) | Collect-bill payment payload | `round_up` field clamp removed |
| `CollectPaymentPanel` | Collect bill display + print overrides | `finalTotal`, `roundOff` |
| `CartPanel` | Cart preview total | `finalTotal`, `roundOff` display |

### NOT Affected

| Component | Why safe |
|---|---|
| `profileTransform.js` | `totalRound` field mapping unchanged |
| `restaurantSettingsTransform.js` | Toggle persist unchanged |
| `RestaurantSettingsPage.jsx` | UI toggle unchanged |
| `reportTransform.js` | Reads `round_up` from backend — works for both signs |
| `insightsService.js` | Reads `round_up` from API — negative reduces total slightly (correct) |
| `orderService.js` | Print path — `round_up` in print payload sourced from calcOrderTotals already |
| CollectPaymentPanel display L2232 | `{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}` — already handles negative |
| CartPanel display L630 | `{roundOff !== 0 && ...}₹{roundOff.toFixed(2)}` — already handles negative |

### Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Floating-point drift causes 100.10 to floor instead of ceil | MEDIUM | Use integer paise: `Math.round((rawTotal % 1) * 100)` |
| Printer template hides Round Off when `round_up < 0` | LOW | Backend confirmed accepts negative; printer team to verify template reads `≠ 0` not `> 0` |
| Reports sum of `round_up` shifts slightly | LOW | Acceptable — reflects actual amounts collected |
| CR-058 / BUG-299 concurrent edit conflict | LOW | Gate 4 must be sequential — documented in plan |

---

## Gate 3 — Implementation Plan

### Architecture Decision: Option B (Shared Helper)

New file: `src/utils/roundOffUtils.js`
- Exports `applyGrandTotalRoundOff(rawTotal, enabled)`
- All 3 call sites import and use this function
- Test spec tests this function directly + integration via real transform

### Edit Sequence (execute in this order)

---

#### Edit 1 — Create `src/utils/roundOffUtils.js` (NEW FILE)

```js
/**
 * CR-170: Conditional grand total round-off helper.
 *
 * Rule (owner-confirmed 2026-08-20):
 *   - enabled = false : return raw 2-decimal (no rounding)
 *   - paise < 10       : Math.floor (₹100.04 → ₹100, round_up = −₹0.04)
 *   - paise ≥ 10       : Math.ceil  (₹100.10 → ₹101, round_up = +₹0.90)
 *   - paise = 0        : no change  (₹100.00 → ₹100)
 *
 * Uses integer-paise comparison to avoid floating-point drift
 * (e.g. 100.10 % 1 = 0.09999... in JS → Math.round to get clean 10).
 *
 * Replaces inline Math.ceil at:
 *   orderTransform.js:869, CollectPaymentPanel.jsx:679, CartPanel.jsx:450
 *
 * History:
 *   BUG-051: established always-ceil
 *   BUG-076: locked always-ceil, removed old conditional
 *   CR-170:  reintroduces conditional with threshold = 10 paise
 */
export const applyGrandTotalRoundOff = (rawTotal, enabled = true) => {
  if (rawTotal <= 0) return 0;
  if (!enabled) return Math.round(rawTotal * 100) / 100;
  const paise = Math.round((rawTotal % 1) * 100); // integer 0–99, drift-safe
  if (paise === 0) return rawTotal;               // exact integer — no change
  return paise < 10 ? Math.floor(rawTotal) : Math.ceil(rawTotal);
};
```

**Verify:** File exists, exports named function, no syntax errors.

---

#### Edit 2 — `orderTransform.js` — `calcOrderTotals` (L869, L872, L881)

**Add import at top of file** (after existing imports, before first `const`):
```js
import { applyGrandTotalRoundOff } from '../utils/roundOffUtils';
```

**L869 — rounding formula:**

Current:
```js
  const orderAmount = rawTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawTotal) : Math.round(rawTotal * 100) / 100)
    : 0;
```

New:
```js
  // CR-170: conditional round-off (< 10 paise → floor, ≥ 10 paise → ceil)
  const orderAmount = applyGrandTotalRoundOff(rawTotal, roundOffEnabled);
```

**L872 — remove `> 0` clamp (allow negative round-up to flow through):**

Current:
```js
  const roundUpAbs = roundUp > 0 ? roundUp : 0;
```

New:
```js
  const roundUpAbs = roundUp; // CR-170: allow negative (floor case sends −₹x)
```

**L881 — `round_up` field (no change needed — already uses `roundUpAbs`):**
```js
  round_up: String(roundUpAbs.toFixed(2)),   // passes "−0.04" for floor case
```
*Confirm this line is unchanged — it will now naturally emit negative strings.*

**Verify:** `calcOrderTotals` with rawTotal=100.04, enabled=true → orderAmount=100, round_up="-0.04".

---

#### Edit 3 — `orderTransform.js` — `collectBillExisting` (L1630)

**Remove `Math.max(0, ...)` clamp:**

Current:
```js
      round_up: Math.max(0, Math.round((parseFloat(roundOff) || 0) * 100) / 100),
```

New:
```js
      round_up: Math.round((parseFloat(roundOff) || 0) * 100) / 100, // CR-170: allow negative
```

**Verify:** When `roundOff = -0.04` (from CollectPaymentPanel), field emits `-0.04` (not `0`).

---

#### Edit 4 — `CollectPaymentPanel.jsx` (L679)

**Add import** (with existing utils imports at top of file):
```js
import { applyGrandTotalRoundOff } from '../../utils/roundOffUtils';
```

**L679 — rounding formula:**

Current:
```js
  const finalTotal = rawFinalTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawFinalTotal) : Math.round(rawFinalTotal * 100) / 100)
    : 0;
```

New:
```js
  // CR-170: conditional round-off via shared helper
  const finalTotal = applyGrandTotalRoundOff(rawFinalTotal, roundOffEnabled);
```

**L681 — `roundOff` stays unchanged:**
```js
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;
```
*This naturally produces negative when floored. No change needed.*

**Display lines — NO CHANGE needed:**
- L2229: `{roundOff !== 0 && (...)}` — already shows for any non-zero (negative included)
- L2232: `{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}` — negative shows as `₹−0.04`
- L2548/L2551: same pattern — already handles negative

**Verify:** For rawFinalTotal=100.04, enabled=true → finalTotal=100, roundOff=−0.04, UI shows "Round Off  ₹-0.04".

---

#### Edit 5 — `CartPanel.jsx` (L450)

**Add import:**
```js
import { applyGrandTotalRoundOff } from '../../utils/roundOffUtils';
```

**L450 — rounding formula:**

Current:
```js
  const finalTotal = rawFinalTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawFinalTotal) : Math.round(rawFinalTotal * 100) / 100)
    : 0;
```

New:
```js
  // CR-170: conditional round-off via shared helper
  const finalTotal = applyGrandTotalRoundOff(rawFinalTotal, roundOffEnabled);
```

**L452 — `roundOff` stays unchanged:**
```js
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;
```

**L630 — display NO CHANGE needed:**
```js
{roundOff !== 0 && <div ...><span>Round-off</span><span>₹{roundOff.toFixed(2)}</span></div>}
```
*Already gated on `≠ 0` — shows negative naturally.*

**Verify:** Cart preview for rawFinalTotal=100.04 shows Grand Total ₹100 with "Round-off ₹-0.04".

---

#### Edit 6 — `round001.alwaysCeil.test.js` — rewrite spec

**File rename:** `round001.alwaysCeil.test.js` → `round001.conditionalRoundOff.test.js`
*(rename to reflect new rule; old filename would be misleading)*

**New spec (full rewrite):**

```js
// =============================================================================
// CR-170 — Conditional grand total round-off spec
// -----------------------------------------------------------------------------
// Rule (owner-confirmed 2026-08-20, replaces BUG-051/BUG-076 always-ceil):
//   paise < 10  → Math.floor  (₹100.04 → ₹100, round_up = −₹0.04)
//   paise ≥ 10  → Math.ceil   (₹100.10 → ₹101, round_up = +₹0.90)
//   paise = 0   → unchanged   (₹100.00 → ₹100)
//   toggle OFF  → raw 2-decimal (no rounding)
// =============================================================================
import { applyGrandTotalRoundOff } from '../../../utils/roundOffUtils';
const { toAPI } = require('../../../api/transforms/orderTransform');

// --- Unit tests on shared helper ---
describe('CR-170 | applyGrandTotalRoundOff — helper unit tests', () => {
  test('100.04 → 100 (4 paise < 10 → floor)', () => {
    expect(applyGrandTotalRoundOff(100.04)).toBe(100);
  });
  test('100.09 → 100 (9 paise < 10 → floor, upper boundary)', () => {
    expect(applyGrandTotalRoundOff(100.09)).toBe(100);
  });
  test('100.10 → 101 (10 paise ≥ 10 → ceil, lower boundary)', () => {
    expect(applyGrandTotalRoundOff(100.10)).toBe(101);
  });
  test('100.50 → 101 (50 paise ≥ 10 → ceil)', () => {
    expect(applyGrandTotalRoundOff(100.50)).toBe(101);
  });
  test('100.95 → 101 (95 paise ≥ 10 → ceil)', () => {
    expect(applyGrandTotalRoundOff(100.95)).toBe(101);
  });
  test('100.00 → 100 (exact integer — no change)', () => {
    expect(applyGrandTotalRoundOff(100.00)).toBe(100);
  });
  test('0 → 0 (zero guard)', () => {
    expect(applyGrandTotalRoundOff(0)).toBe(0);
  });
  test('enabled=false → raw 2-decimal (toggle off)', () => {
    expect(applyGrandTotalRoundOff(100.04, false)).toBe(100.04);
    expect(applyGrandTotalRoundOff(100.50, false)).toBe(100.50);
  });
  test('floating-point drift guard: 100.10 floors to 10 paise correctly', () => {
    // 100.10 % 1 = 0.09999... in JS — helper must still ceil
    expect(applyGrandTotalRoundOff(100.10)).toBe(101);
  });
});

// --- Integration test via real calcOrderTotals ---
const buildItem = (price) => ({
  id: 1, foodId: 100, name: 'Item', price, qty: 1,
  station: 'KDS', status: 'placed', placed: false,
});
const orderAmountFor = (price, roundOffEnabled = true) =>
  toAPI.placeOrderWithPayment(
    { tableId: 1 }, [buildItem(price)], {}, 'dineIn',
    { method: 'cash', tip: 0, deliveryCharge: 0, discounts: {} },
    { roundOffEnabled },
  ).order_amount;
const roundUpFor = (price, roundOffEnabled = true) =>
  toAPI.placeOrderWithPayment(
    { tableId: 1 }, [buildItem(price)], {}, 'dineIn',
    { method: 'cash', tip: 0, deliveryCharge: 0, discounts: {} },
    { roundOffEnabled },
  ).round_up;

describe('CR-170 | calcOrderTotals integration — order_amount + round_up', () => {
  test('100.04 → order_amount=100, round_up="-0.04"', () => {
    expect(orderAmountFor(100.04)).toBe(100);
    expect(roundUpFor(100.04)).toBe('-0.04');
  });
  test('100.10 → order_amount=101, round_up="0.90"', () => {
    expect(orderAmountFor(100.10)).toBe(101);
    expect(roundUpFor(100.10)).toBe('0.90');
  });
  test('100.00 → order_amount=100, round_up="0.00"', () => {
    expect(orderAmountFor(100.00)).toBe(100);
    expect(roundUpFor(100.00)).toBe('0.00');
  });
  test('enabled=false → order_amount=100.04 (raw)', () => {
    expect(orderAmountFor(100.04, false)).toBe(100.04);
  });
});
```

---

### Execution Sequence Summary

| # | Edit | File | Lines | New/Modified |
|---|---|---|---|---|
| 1 | Create helper | `src/utils/roundOffUtils.js` | new file (~30 lines) | NEW |
| 2a | Add import | `orderTransform.js` | top of file | MODIFIED |
| 2b | Replace rounding formula | `orderTransform.js` | L869 (3 lines → 2 lines) | MODIFIED |
| 2c | Remove `> 0` clamp | `orderTransform.js` | L872 (1 line) | MODIFIED |
| 3 | Remove `Math.max(0,...)` clamp | `orderTransform.js` | L1630 (1 line) | MODIFIED |
| 4a | Add import | `CollectPaymentPanel.jsx` | top of file | MODIFIED |
| 4b | Replace rounding formula | `CollectPaymentPanel.jsx` | L679 (3 lines → 2 lines) | MODIFIED |
| 5a | Add import | `CartPanel.jsx` | top of file | MODIFIED |
| 5b | Replace rounding formula | `CartPanel.jsx` | L450 (3 lines → 2 lines) | MODIFIED |
| 6 | Rewrite test spec | `round001.alwaysCeil.test.js` | full rewrite | MODIFIED |

**Total: 1 new file + 3 existing files + 1 test file = 5 files, ~15 net line changes**

---

### Verification Matrix

| # | Edit | Verification method | Manual/Auto |
|---|---|---|---|
| 1 | Helper exports correctly | Import in test → 9/9 unit tests pass | Auto |
| 2b | calcOrderTotals uses helper | Integration test: 100.04 → 100 | Auto |
| 2c | round_up sends "-0.04" | Integration test: round_up = "-0.04" | Auto |
| 3 | collectBillExisting sends negative | Browser Network tab: round_up = -0.04 on floor order | Manual |
| 4b | Collect Bill shows "Round Off ₹-0.04" | Browser: place 100.04 order → Collect Bill screen | Manual |
| 4b | Collect Bill shows "+₹0.90" for 100.10 order | Browser: place 100.10 order → Collect Bill screen | Manual |
| 5b | Cart preview shows "Round-off ₹-0.04" | Browser: QSR cart with 100.04 total | Manual |
| 6 | Test file passes | `npx craco test round001` → all pass | Auto |
| — | Printer round-off line shows | Manual print: "Round Off: ₹-0.04" appears on receipt | Manual |
| — | `totalRound=false` → no rounding | Browser: disable toggle in Settings → Collect Bill | Manual |

---

### Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-170 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add roundOffUtils.js + CR-170 edits to orderTransform/CollectPaymentPanel/CartPanel
- [ ] Code markers: // CR-170 comment in every modified file
- [ ] Test rename: old test file deleted or renamed to round001.conditionalRoundOff.test.js
- [ ] Compile check: webpack 0 new warnings
```

---

## Files WILL change
- `src/utils/roundOffUtils.js` *(new)*
- `src/api/transforms/orderTransform.js` *(L869, L872, L1630 + import)*
- `src/components/order-entry/CollectPaymentPanel.jsx` *(L679 + import)*
- `src/components/order-entry/CartPanel.jsx` *(L450 + import)*
- `src/__tests__/api/transforms/round001.alwaysCeil.test.js` *(full rewrite)*

## Files WILL NOT touch
`profileTransform.js`, `restaurantSettingsTransform.js`, `RestaurantSettingsPage.jsx`, `orderService.js`, `reportTransform.js`, `insightsService.js`, `OrderEntry.jsx`, `SplitBillModal.jsx`, any other file

---

*Planning complete. Awaiting Gate 4 GO from owner.*
