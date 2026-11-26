# BUG-684 — Impact Analysis (Gate 2)

**Date:** 2026-11-18
**Agent role:** PLANNING
**Stage:** Impact Analysis only (Gate 2)
**Intake doc:** `change_requests/BUG-684_CART_COLLECT_BILL_BUTTON_ROUNDOFF_MISMATCH_INTAKE.md`

---

## 0. Code Reality Check

**Result: NONE** — no fix code exists. The buggy local `applyRoundOff` helper is still present at `OrderEntry.jsx` L1192-1196. `roundOffUtils.js` is not imported.

```bash
grep -n "applyRoundOff\|applyGrandTotalRoundOff\|import.*roundOff" \
  /app/frontend/src/components/order-entry/OrderEntry.jsx
# Output:
#   1192:  const applyRoundOff = (raw) => {
#   1225:      + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)
#   1227:    : applyRoundOff(rawLocalTotal) + deliveryAddOn;
# No import of roundOffUtils found.
```

---

## 1. Conflict Pre-Check

| Item | Status | Lines in OrderEntry.jsx | Overlap with BUG-684 (L1128-1227)? |
|------|--------|------------------------|-------------------------------------|
| BUG-281 | QA PASS — AWAITING SMOKE | L1801-1926 (custGST/custGSTName payload fields) | **NO** — 600+ lines away |
| CR-412 | GATE_5A_IMPLEMENTED | L2235-2236 (loyalty pre-tick prop) | **NO** — 1000+ lines away |
| CR-413 | GATE_5A_IMPLEMENTED | L2235 (initialCoupon prop removed) | **NO** — 1000+ lines away |

**Conflict: NONE.** All three in-flight items on OrderEntry.jsx touch payload builder / prop wiring zones far below the cart-total calculation block. Parallel-safe.

---

## 2. Gate 2 — Impact Analysis

### 2.1 Risk Classification

- **Risk:** HIGH
- **Reason:** Financial display in an R5 hotspot file (`OrderEntry.jsx`). Cashier-visible Collect Bill button shows a money amount that can differ by ₹1 from the actual billed amount.
- **Mitigant:** Display-only defect — the payload (`order_amount`, `round_up`) sent to the backend is correct. No money loss, but cashier may quote the wrong price to the customer.

### 2.2 Data Flow Trace

```
Cart items (state)
  ↓
localTax / unplacedTax (OrderEntry.jsx L1144-1170)
  — DEFECT 2: each item's tax accumulated WITHOUT per-item rounding
  — Parity: orderTransform.js buildCartItem rounds each item's tax to 2dp via toFixed(2)
  ↓
rawLocalTotal / rawUnplacedTotal (L1190-1191)
  — these are Math.round(…*100)/100 so the 2dp rounding is applied to the SUM, not per-item
  ↓
applyRoundOff(raw) (L1192-1196)
  — DEFECT 1 (primary): local helper is inverted vs CR-170 shared rule
  — Tests (ceil - raw) >= 0.10 instead of paise >= 10
  ↓
total (L1223-1227)
  — feeds the Collect Bill button label (₹X)
  ↓
CartPanel.jsx renders the button with `total`
  — DISPLAY ONLY — no payload, no API call from this path
```

### 2.3 Defect 1 (Primary): Local round-off helper is inverted

**Location:** `OrderEntry.jsx` L1192-1196

```javascript
// CURRENT (buggy)
const applyRoundOff = (raw) => {
  const ceil = Math.ceil(raw);
  const diff = Math.round((ceil - raw) * 100) / 100;   // distance UP to next rupee
  return diff >= 0.10 ? ceil : Math.floor(raw);
};
```

**Bug:** `diff` is the *distance from raw UP to the ceiling* (the complement of paise). When paise = 1 (raw = 250.01), diff = 99 → `>= 0.10` → returns ceil (251). But the CR-170 rule says paise < 10 → floor (250).

**Truth table (confirms inversion):**

| Raw total | Paise | diff (ceil−raw) | Local result | CR-170 shared result | Match? |
|-----------|-------|-----------------|-------------|---------------------|--------|
| 250.01 | 1 | 0.99 | ceil → **251** | floor → **250** | ❌ |
| 250.09 | 9 | 0.91 | ceil → **251** | floor → **250** | ❌ |
| 250.10 | 10 | 0.90 | ceil → **251** | ceil → **251** | ✅ |
| 250.50 | 50 | 0.50 | ceil → **251** | ceil → **251** | ✅ |
| 250.90 | 90 | 0.10 | ceil → **251** | ceil → **251** | ✅ |
| 250.91 | 91 | 0.09 | floor → **250** | ceil → **251** | ❌ |
| 250.95 | 95 | 0.05 | floor → **250** | ceil → **251** | ❌ |

**Mismatch bands:** paise 1-9 (inverted: shows ₹1 too high) and paise 91-99 (inverted: shows ₹1 too low).

**Additional deficiency:** The local helper has no `enabled` parameter — it always rounds, ignoring the restaurant's `totalRound` toggle. The shared helper honours it via `applyGrandTotalRoundOff(raw, enabled)`.

**Call sites using local helper:**
- L1225: `applyRoundOff(rawUnplacedTotal)` — unplaced-items portion (add-to-placed-order scenario)
- L1227: `applyRoundOff(rawLocalTotal)` — pre-place button total

### 2.4 Defect 2 (Secondary): Per-item tax accumulated without rounding

**Location:** `OrderEntry.jsx` L1144-1155 (`localTax`) and L1159-1170 (`unplacedTax`)

```javascript
// CURRENT (paise drift)
return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));
//                                                                           ^^^^^^^^^^^^^^^^^^^^^^^^
//                          Not rounded per item — accumulates raw float
```

**Parity breach:** `orderTransform.js` `buildCartItem` (L776-777) rounds each item's GST/VAT to 2 decimals:
```javascript
gst_amount: String((isGst ? taxAmount : 0).toFixed(2)),   // rounds to 2dp
```

**Example (from intake evidence):**
- Item 1: 123.81 × 5% = 6.1905 → orderTransform rounds to 6.19
- Item 2: 114.29 × 5% = 5.7145 → orderTransform rounds to 5.71
- orderTransform sum: 11.90 | OrderEntry sum: 11.905

This 0.005 paise drift only matters near the 10-paise rounding boundary, but it can produce a ₹1 mismatch there (as demonstrated by the reported case: 250.005 → rounds to 250.01 → hits the paise=1 inversion band).

**Affected lines (identical pattern in both reducers):**
- L1154: exclusive tax line (localTax)
- L1169: exclusive tax line (unplacedTax)
- L1153/L1168: inclusive tax lines (same drift risk)

### 2.5 Not Affected (safe zones)

| Component | Why safe |
|-----------|----------|
| `orderTransform.js` `calcOrderTotals` | Already uses per-item rounded tax + `applyGrandTotalRoundOff`. Payload is correct. |
| `CollectPaymentPanel.jsx` | Already uses `applyGrandTotalRoundOff` (L875). |
| `CartPanel.jsx` | Receives `total` as prop — doesn't compute independently. |
| `roundOffUtils.js` | Shared helper is correct. No change needed. |
| Payload builder (L1735+) | Uses `roundOffEnabled: restaurant?.totalRound !== false` correctly. |

### 2.6 Downstream Consumers

The `total` value flows to:
1. **CartPanel.jsx** — renders the green "Collect Bill ₹{total}" button label
2. No other consumer — `total` is display-only, never sent to any API or used in any calculation

### 2.7 Affected Scenarios

| Scenario | Affected? | Why |
|----------|-----------|-----|
| Pre-place: new order, Collect Bill button | **YES** | Uses `applyRoundOff(rawLocalTotal)` at L1227 |
| Post-place + adding items: unplaced portion | **YES** | Uses `applyRoundOff(rawUnplacedTotal)` at L1225 |
| Post-place: placed portion | NO | Uses `orderFinancials.amount` from backend (already correct) |
| Collect Payment screen Grand Total | NO | Uses `applyGrandTotalRoundOff` |
| Place/update payload | NO | Uses `calcOrderTotals` in `orderTransform.js` |
| Print receipt / reports | NO | Uses backend-computed amounts |
| Round-off OFF restaurant | **YES** (secondary) | Local helper always rounds; should return 2-decimal raw |

---

## 3. Proposed Fix Scope

### Edit 1 — Import shared helper
- **File:** `OrderEntry.jsx` (top of file, near existing utility imports)
- **Change:** Add `import { applyGrandTotalRoundOff } from '../../utils/roundOffUtils';`

### Edit 2 — Replace local helper with shared call
- **File:** `OrderEntry.jsx` L1192-1196
- **Change:** Delete local `applyRoundOff` function. Add `roundOffEnabled` const (matching established pattern at L1338/L1400/L1735).
- **New (conceptual):**
  ```javascript
  const roundOffEnabled = restaurant?.totalRound !== false; // BUG-684
  ```

### Edit 3 — Update call sites
- **File:** `OrderEntry.jsx` L1225 and L1227
- **Change:** Replace `applyRoundOff(rawUnplacedTotal)` → `applyGrandTotalRoundOff(rawUnplacedTotal, roundOffEnabled)` and same for `rawLocalTotal`

### Edit 4 — Round per-item tax in localTax and unplacedTax
- **File:** `OrderEntry.jsx` L1154, L1153 (localTax) and L1169, L1168 (unplacedTax)
- **Change:** Wrap each item's tax contribution in `Math.round(… * 100) / 100`
- **Example (exclusive):**
  ```javascript
  // Before: linePrice * (taxPct / 100)
  // After:  Math.round(linePrice * (taxPct / 100) * 100) / 100
  ```

### Scope Summary

| File | Lines | Change |
|------|-------|--------|
| `OrderEntry.jsx` | ~L1 (imports) | Add `import { applyGrandTotalRoundOff }` |
| `OrderEntry.jsx` | L1192-1196 | Delete local `applyRoundOff`, add `roundOffEnabled` const |
| `OrderEntry.jsx` | L1153-1154 | Round inclusive/exclusive tax per item (localTax) |
| `OrderEntry.jsx` | L1168-1169 | Round inclusive/exclusive tax per item (unplacedTax) |
| `OrderEntry.jsx` | L1225, L1227 | Switch call sites to `applyGrandTotalRoundOff(raw, roundOffEnabled)` |

**Files WILL change:** `OrderEntry.jsx` (1 file, ~10-12 changed lines)
**Files WILL NOT touch:** `roundOffUtils.js`, `orderTransform.js`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`, any test file, any context, any service, any API, any other component

**Payload change:** NONE
**Backend change:** NONE

---

## 4. Open Owner Decisions (carried from intake)

| # | Question | Recommended | Impact on plan |
|---|----------|-------------|----------------|
| OD-684-01 | Fast Lane or full gate flow? | Full gate (HIGH risk, R5 hotspot, financial display area). Intake noted Fast Lane candidacy but financial area → full gate recommended. | If Fast Lane approved: skip Gate 3 plan, go straight to implementation. If full gate: write Implementation Plan. |
| OD-684-02 | When round-off is OFF, should button show 2-decimal total (e.g. ₹250.01)? | YES — match the shared helper. `applyGrandTotalRoundOff(raw, false)` returns `Math.round(raw * 100) / 100` (2-decimal). This already matches what CollectPaymentPanel shows and what the payload sends. | No plan change — fix naturally handles this via the `roundOffEnabled` parameter. |

---

## 5. Verification Matrix (seeds QA)

| # | Test Case | Input | Expected Button | Expected Payload `order_amount` | How to Verify |
|---|-----------|-------|-----------------|--------------------------------|---------------|
| V1 | Reported case | 123.81 + 114.29 @ GST 5% excl | ₹250 | 250 | Browser: pre-place cart |
| V2 | Paise ≥ 10 boundary | Items summing to raw ~250.50 | ₹251 | 251 | Browser: pre-place cart |
| V3 | Paise 90-99 (was floor, should ceil) | Items summing to raw ~250.95 | ₹251 | 251 | Browser: pre-place cart |
| V4 | Round-off OFF restaurant | Any items | 2-decimal total (e.g. ₹250.01) | same 2-decimal | Browser: restaurant with totalRound=false |
| V5 | Add items to placed order | Place 1 item → add 1 more | Button = placed amount + correctly rounded new portion | matches update payload | Browser: placed + unplaced |
| V6 | Exact rupee total (paise = 0) | Items summing to exactly ₹250.00 | ₹250 | 250 | Browser: confirm no change |

---

## 6. Risk Register

| # | Risk | Likelihood | Mitigation |
|---|------|------------|------------|
| R1 | Incorrect rounding on edge near paise = 10 boundary | LOW (fix uses proven shared helper with integer-paise comparison, drift-safe) | Unit tests in `round001.alwaysCeil.test.js` already cover boundary |
| R2 | Regression on placed-branch total (L1223-1224) | VERY LOW (fix doesn't touch the placed branch — only the `applyRoundOff` calls on L1225+L1227) | Self-test: verify placed order total unchanged |
| R3 | Interaction with CR-412/CR-413 (loyalty/coupon on CPP) | NONE (different code zones, no data dependency) | Conflict pre-check confirmed |
| R4 | Per-item tax rounding changes the sum by 1 paise in some edge cases | LOW (parity fix — matches what backend already computes) | V1 test case covers the reported scenario |

---

## 7. Related Items

| ID | Relationship | Status |
|----|-------------|--------|
| CR-170 | Introduced shared `applyGrandTotalRoundOff` | CLOSED |
| BUG-666 | Fixed GST rounding parity in CollectPaymentPanel (not cart button) | CLOSED |
| BUG-647 / BUG-683 | Same L1144-1170 tax block carries the GST/VAT toggle checks | CLOSED |

---

Planning complete: BUG-684
Stage: Impact Analysis (Gate 2 only)
Code reality: NONE
Risk: HIGH
Files WILL change: `OrderEntry.jsx` (1 file, ~10-12 lines)
Files WILL NOT touch: `roundOffUtils.js`, `orderTransform.js`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`
Owner decisions: OD-684-01 (Fast Lane vs full gate), OD-684-02 (2-decimal when round-off OFF)
Docs: `memory/impact/BUG-684_IMPACT_ANALYSIS.md`
Next: Owner reviews → OD-684-01 decision → Gate 3 (Implementation Plan) or Fast Lane
