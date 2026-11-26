# BUG-512 — Gate 2: Impact Analysis

**ID:** BUG-512
**Date:** 2026-10-07
**Role:** PLANNING (Gate 2 — Impact Analysis only; Gate 3 not started)
**Code Reality:** FULL — broken conditions live at 6 sites across 2 files
**Conflict Pre-check:** RELATED to BUG-511 (same 2 files, different lines — parallel-safe; BUG-511 must land first as P0)
**Risk:** CRITICAL (R6 — tax collection at wrong stage)
**Sprint:** oct_bug_batch

---

## 1. Problem Statement

At **maximum discount (₹7,950)**, the Collect Now input allows the hotel to collect ₹50 from the guest at **check-in**. That ₹50 is the GST on advance (`gstOnAdv`) — it should be settled at **checkout**, not check-in.

The business rule, owner-confirmed verbatim:
> *"the 50 we are collecting is gst not the room rent — that's why we are not gave discount on that 50 and we settle gst on check out right"*

### Why It Breaks Only at Max

```
bc=9000  advance=1000  maxFlat=7950  gstOnAdv=50

At max discount (₹7,950):
  collectMax = bc − maxFlat − advance = 9000 − 7950 − 1000 = 50  ← equals gstOnAdv exactly
  effectiveBalanceDue (CheckInPage) = same = 50

At normal discount (₹4,000):
  collectMax = 9000 − 4000 − 1000 = 4000  > 50 → no collision with gstOnAdv  ✓

The formulae accidentally produce a value equal to gstOnAdv only at max discount.
Once collectMax = gstOnAdv = 50, all strict-greater-than guards fail silently.
```

### Screenshot Evidence (owner-provided, 2026-10-07)

| Screenshot | Shows | Status |
|---|---|---|
| Collect 50 + Cash + Confirm enabled | ₹50 collected at check-in at max ₹7,950 | ❌ BUG |
| Collect 100 + error fires | Error blocks >₹50 | ✓ works |
| ₹4,000 discount hint fires | "Room balance: ₹4,000 · GST settled at checkout" | ✓ works |

---

## 2. Scope Correction — Original Intake vs Re-investigation

The original BUG-512 intake identified **1 file, 1 break point**. Re-investigation (2026-10-07) found **2 files, 6 break points**.

| | Original intake | Corrected (this IA) |
|---|---|---|
| Files | CheckInForm.jsx only | **CheckInForm.jsx + CheckInPage.jsx** |
| Break points | 1 (hint condition L304) | **6 across both files** |
| Lines | ~3 | **~8-10** |
| Blast radius | SMALL | **SMALL-MEDIUM** |

---

## 3. Code Reality — All 6 Break Points

### File A: CheckInForm.jsx (Front Desk v2 — panel path)

**Break 1 — hint never fires at max (L304):**
```js
{displayBalance > collectMax && collectMax > 0 && (
  <div data-testid="checkin-collect-room-hint">
    Room balance: {fmtINR(collectMax)} · GST settled at checkout
  </div>
)}
```
At max: `displayBalance(50) > collectMax(50)` = `FALSE` → hint does not render.

**Break 2 — error never fires at max, Confirm not blocked (L91 + L315 + L325):**
```js
// L91
const collectOverMax = collectAmt > collectMax && collectAmt > 0;
// At max with collect=50: 50 > 50 = FALSE → collectOverMax = FALSE

// L315 — error depends on collectOverMax
{collectOverMax && <div>Collect exceeds room balance...</div>}

// L325 — Confirm disabled depends on collectOverMax
disabled={!ready || busy || discountOverMax || collectOverMax}
// collectOverMax=FALSE → Confirm ENABLED ← user can confirm with ₹50 = GST
```

**Available constant (already in scope, L94):**
```js
const gstOnAdvFloor = Number(c.booking_charge || 0) - Number(c.advance_payment || 0) - maxFlat;
// = 9000 − 1000 − 7950 = 50  (always equals gstOnAdv by construction)
```
This already exists — no new derivation needed.

---

### File B: CheckInPage.jsx (legacy path)

**Break 3 — hint fires but text is wrong at max (L858-860):**
```js
{roomDiscountRs > 0 && effectiveBalanceDue > 0 && (
  <div data-testid="ci-collect-room-hint">
    Room balance: ₹{effectiveBalanceDue.toLocaleString('en-IN')} · GST settled at checkout
  </div>
)}
```
At max: `7950 > 0 && 50 > 0` = `TRUE` → hint renders, BUT says **"Room balance: ₹50"**. At max there is no room balance — the ₹50 IS the GST. Misleading text.

**Break 4 — error never fires at max (L863-865):**
```js
{Number(form.advancePayment) > effectiveBalanceDue && Number(form.advancePayment) > 0 && (
  <div>Collect exceeds room balance...</div>
)}
// At max with advancePayment=50: 50 > 50 = FALSE → no error
```

**Break 5 — formValid allows collecting ₹50 (L291):**
```js
const formValid = form && ... &&
  Number(form.advancePayment || 0) <= effectiveBalanceDue &&  // ← 50 <= 50 = TRUE (allows it)
  ...
```
`<= effectiveBalanceDue` instead of `< effectiveBalanceDue` means exactly ₹50 passes validation.

**Break 6 — Confirm button enabled (L1004):**
```js
<button disabled={!formValid || submitting} ...>Confirm Check-In</button>
// formValid=TRUE at max with advancePayment=50 → Confirm ENABLED ← user confirms with ₹50 = GST
```

---

## 4. Detection Condition

A single boolean const identifies the max-discount case precisely:

**CheckInForm.jsx** (uses already-in-scope `gstOnAdvFloor` from L94):
```js
const collectAtMaxGst = collectMax > 0 && collectMax <= gstOnAdvFloor;
// At max:    collectMax(50) > 0 && collectMax(50) <= gstOnAdvFloor(50) → TRUE
// At ₹7,949: collectMax(51) > 0 && collectMax(51) <= 50              → FALSE
// At ₹4,000: collectMax(4000) > 0 && collectMax(4000) <= 50          → FALSE
// At ₹0 disc: collectMax(8000) > 0 && 8000 <= 50                     → FALSE
```

**CheckInPage.jsx** (needs `gstOnAdvFloor_ci` derived from `maxFlat` already in scope at L268-276):
```js
const gstOnAdvFloor_ci   = Math.max(0, Number(form?.orderAmount || 0)
                           - Number(selected?.charge?.advance_payment || 0) - maxFlat);
const collectAtMaxGst_ci = effectiveBalanceDue > 0 && effectiveBalanceDue <= gstOnAdvFloor_ci;
// At max:    effectiveBalanceDue(50) > 0 && 50 <= gstOnAdvFloor_ci(50) → TRUE
// At ₹7,949: effectiveBalanceDue(51) > 0 && 51 <= 50                  → FALSE
// At ₹4,000: effectiveBalanceDue(4000) > 0 && 4000 <= 50              → FALSE
```

Both evaluate to TRUE ONLY at max discount, FALSE everywhere else. ✓

---

## 5. Affected Files

### Files WILL change

| File | Sites | Lines (approx) | Change type |
|---|---|---|---|
| `src/components/pms/frontdesk/CheckInForm.jsx` | 4 | ~L91 area (+2 consts) · L304-308 (hint) · L315 (error) · L325 (disabled) | UI logic only |
| `src/pages/pms/CheckInPage.jsx` | 4 | ~L264 (+3 consts) · L291 (formValid) · L858-861 (hint) · L863-866 (error) | UI logic only |

**Total: 2 files, ~8-10 lines net.**

### MUST NOT CHANGE — backend-compatible formulae (BUG-500/OD-500-04)

```
CheckInForm.jsx  L90:   collectMax = bc − roomDiscountRs − advance   ← DO NOT TOUCH
CheckInPage.jsx  L256-263: effectiveBalanceDue formula               ← DO NOT TOUCH
```
These are intentionally no-GST for backend compatibility. Any display-only cap is UI-only.

### Files WILL NOT touch

- `pmsService.js` — submission payload unchanged
- `FolioCheckoutPanel.jsx` — checkout panel out of scope
- `CollectPaymentPanel.jsx` (R5) — not in scope
- `orderTransform.js` (R5) — not in scope
- Any test files

---

## 6. Change Summary Per Site

### CheckInForm.jsx — 4 edit sites

**E-A1 — New consts (~after L94):**
```js
// BUG-512: detect when collectMax = gstOnAdv (max discount → zero room balance, pure GST)
const collectAtMaxGst     = collectMax > 0 && collectMax <= gstOnAdvFloor;
const collectBlockedAtMax = collectAtMaxGst && collectAmt > 0;
```

**E-A2 — Hint condition + message (L304-308):**
```jsx
// Replace: displayBalance > collectMax && collectMax > 0
// With: collectMax > 0 && (displayBalance > collectMax || collectAtMaxGst)
// + conditional message text
{collectMax > 0 && (displayBalance > collectMax || collectAtMaxGst) && (
  <div data-testid="checkin-collect-room-hint">
    {collectAtMaxGst
      ? `Maximum discount applied — GST (${fmtINR(gstOnAdvFloor)}) settled at checkout. Nothing to collect at check-in.`
      : `Room balance: ${fmtINR(collectMax)} · GST settled at checkout`}
  </div>
)}
```

**E-A3 — Error message (L315):**
```jsx
// Replace: collectOverMax
// With: collectOverMax || collectBlockedAtMax
{(collectOverMax || collectBlockedAtMax) && (
  <div data-testid="checkin-collect-over-max">
    {collectAtMaxGst
      ? `Maximum discount applied. GST (${fmtINR(gstOnAdvFloor)}) is settled at checkout — nothing to collect.`
      : `Collect exceeds room balance (${fmtINR(collectMax)}). GST is settled at checkout.`}
  </div>
)}
```

**E-A4 — Confirm disabled (L325):**
```jsx
// Add: || collectBlockedAtMax
disabled={!ready || busy || discountOverMax || collectOverMax || collectBlockedAtMax}
```

---

### CheckInPage.jsx — 4 edit sites

**E-B1 — New consts (after L263, after effectiveBalanceDue useMemo):**
```js
// BUG-512: detect max-discount case (effectiveBalanceDue = gstOnAdv → zero room balance)
const gstOnAdvFloor_ci     = Math.max(0, Number(form?.orderAmount || 0)
                             - Number(selected?.charge?.advance_payment || 0) - maxFlat);
const collectAtMaxGst_ci   = effectiveBalanceDue > 0 && effectiveBalanceDue <= gstOnAdvFloor_ci;
const collectBlockedAtMax_ci = collectAtMaxGst_ci && Number(form?.advancePayment || 0) > 0;
```

**E-B2 — formValid (L291):**
```js
// Add && !collectBlockedAtMax_ci at end of formValid boolean chain
const formValid = form && ... && Number(form.advancePayment || 0) <= effectiveBalanceDue
  && ... && !discountOverMax && !collectBlockedAtMax_ci; // BUG-512
```

**E-B3 — Hint condition + message (L858-860):**
```jsx
{roomDiscountRs > 0 && effectiveBalanceDue > 0 && (
  <div data-testid="ci-collect-room-hint">
    {collectAtMaxGst_ci
      ? `Maximum discount applied — GST (₹${gstOnAdvFloor_ci.toLocaleString('en-IN')}) settled at checkout. Nothing to collect at check-in.`
      : `Room balance: ₹${effectiveBalanceDue.toLocaleString('en-IN')} · GST settled at checkout`}
  </div>
)}
```

**E-B4 — Error condition + message (L863-865):**
```jsx
{(Number(form.advancePayment) > effectiveBalanceDue || collectBlockedAtMax_ci) && Number(form.advancePayment) > 0 && (
  <div data-testid="ci-collect-over-max">
    {collectAtMaxGst_ci
      ? `Maximum discount applied. GST is settled at checkout — nothing to collect.`
      : `Collect exceeds room balance (₹${effectiveBalanceDue.toLocaleString('en-IN')}). GST is settled at checkout.`}
  </div>
)}
```

---

## 7. Data Flow After Fix

### CheckInForm.jsx — max discount scenario
```
collectMax = 50, gstOnAdvFloor = 50
collectAtMaxGst = 50 > 0 && 50 <= 50 = TRUE

Hint:    collectMax > 0 && (50 > 50 || TRUE) = TRUE → renders
         Text: "Maximum discount applied — GST (₹50) settled at checkout. Nothing to collect at check-in." ✓

User types 50:
  collectBlockedAtMax = TRUE && 50 > 0 = TRUE
  Error fires: "Maximum discount applied. GST (₹50) is settled at checkout — nothing to collect." ✓
  Confirm disabled: TRUE → Confirm button GREYED OUT ✓

User types 0 (no collect):
  collectBlockedAtMax = FALSE → Confirm ENABLED ✓ (check-in proceeds with zero collect)
```

### CheckInPage.jsx — max discount scenario
```
effectiveBalanceDue = 50, gstOnAdvFloor_ci = 50
collectAtMaxGst_ci = TRUE

Hint: "Maximum discount applied — GST (₹50) settled at checkout. Nothing to collect." ✓

User types 50 in advance input:
  collectBlockedAtMax_ci = TRUE
  formValid = ... && !TRUE = FALSE → Confirm DISABLED ✓
  Error fires ✓

User types 0:
  collectBlockedAtMax_ci = FALSE
  formValid can be TRUE → Confirm ENABLED ✓
```

### Normal discount (₹4,000) — unchanged behaviour
```
collectMax = 4000, gstOnAdvFloor = 50
collectAtMaxGst = 4000 <= 50 = FALSE

Hint condition: displayBalance(4250) > collectMax(4000) = TRUE (unchanged ✓)
Text: "Room balance: ₹4,000 · GST settled at checkout" (unchanged ✓)
Collect ₹4,000: collectOverMax = 4000 > 4000 = FALSE → allowed ✓
Collect ₹4,001: collectOverMax = TRUE → blocked ✓
```

---

## 8. Risk Assessment

| Dimension | Assessment |
|---|---|
| **Risk class** | CRITICAL (R6 — tax collection) |
| **Backend payload change?** | NO — `collectMax` and `effectiveBalanceDue` unchanged; UI-only cap |
| **MUST NOT CHANGE lines** | CheckInForm L90, CheckInPage L256-263 |
| **Hotspot files (R5)?** | NO — CheckInForm + CheckInPage not in R5 list |
| **Regression risk** | LOW — `collectAtMaxGst` is FALSE at all normal discounts; existing logic untouched |
| **Fast Lane eligible?** | NO — CRITICAL financial, 2 files |
| **Planning skip eligible?** | NO — CRITICAL, 2 files, 8 edit sites |

---

## 9. Conflict Pre-check

| Item | Files touched | Lines | Conflict? |
|---|---|---|---|
| **BUG-511** (GATE_2_IMPACT_ANALYSIS) | CheckInForm L104-105 · CheckInPage L950-951 | Different lines | ✅ Sequential; BUG-511 first |
| BUG-510 (GATE_5A, QA pending) | CheckInPage L274 only | Different area | ✅ No conflict |
| BUG-506/507/508/509 (GATE_5A) | Same files, different lines, already shipped | Read-only context | ✅ No conflict |

**Execution order:** BUG-511 (P0) → BUG-512 (P1). Both touch the same 2 files at different lines — safe to implement in sequence.

---

## 10. Open Questions / Owner Decisions

**None.** All decisions are already confirmed:

| Decision | Source |
|---|---|
| GST must NOT be collected at check-in at max discount | Owner verbatim: *"the 50 we are collecting is gst not the room rent — that's why we are not gave discount on that 50 and we settle gst on check out right"* |
| collectMax formula MUST NOT change | BUG-500/OD-500-04 (locked) |
| effectiveBalanceDue formula MUST NOT change | BUG-500/OD-500-04 (locked) |
| Fix is UI-only (no backend change) | Investigation report confirmed |

---

## 11. Verification Matrix (seeds Gate 3 Implementation Plan)

| # | File | Lines | Change | Verification |
|---|---|---|---|---|
| 1 | CheckInForm.jsx | ~L92 | Add `collectAtMaxGst` + `collectBlockedAtMax` consts | `grep -n "collectAtMaxGst" CheckInForm.jsx` → ≥1 hit |
| 2 | CheckInForm.jsx | L304-308 | Hint fires + correct message at max discount | Browser: enter ₹7,950 → hint "Maximum discount applied" visible ✓ |
| 3 | CheckInForm.jsx | L315 | Error fires for any collect amount at max | Browser: type 50 in collect field at max → red error ✓ |
| 4 | CheckInForm.jsx | L325 | Confirm disabled when collect > 0 at max | Browser: type 50 at max → Confirm greyed out ✓ |
| 5 | CheckInPage.jsx | ~L264 | Add `gstOnAdvFloor_ci` + `collectAtMaxGst_ci` + `collectBlockedAtMax_ci` | `grep -n "collectAtMaxGst_ci" CheckInPage.jsx` → ≥1 hit |
| 6 | CheckInPage.jsx | L291 | formValid false when advancePayment > 0 at max | Browser (legacy path): enter ₹50 advance at max → Confirm greyed out ✓ |
| 7 | CheckInPage.jsx | L858-861 | Hint message corrected at max | Browser: "Maximum discount applied" (not "Room balance: ₹50") ✓ |
| 8 | CheckInPage.jsx | L863-866 | Error fires at max for any advance entry | Browser: enter ₹50 at max → red error ✓ |
| REG-1 | Both | — | `// BUG-512` marker on every changed line | `grep -rn "BUG-512" CheckInForm.jsx CheckInPage.jsx` |
| REG-2 | Both | — | Normal discount (₹4,000) behaviour unchanged | Browser: ₹4,000 → hint "Room balance: ₹4,000", collect ₹4,000 allowed, ₹4,001 blocked ✓ |
| COMPILE | webpack | — | 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled successfully" |

---

## 12. Post-Code Registry Checklist (for Implementation agent)

- [ ] `registry.json`: BUG-512 → `status: GATE_5A_IMPLEMENTED`, `sprint_key: oct_bug_batch`
- [ ] `BUG_TRACKER.md`: row updated with IMPLEMENTED status + corrected scope (2 files)
- [ ] `FILE_OWNERSHIP.md`: CheckInForm.jsx + CheckInPage.jsx — add BUG-512 + date
- [ ] Code markers: `// BUG-512` on every modified line
- [ ] Compile check: webpack 0 new warnings

---

## Gate 2 Summary

```
Planning complete: BUG-512
Stage: Impact Analysis (Gate 2 only — as instructed)
Code Reality: FULL — 6 break points confirmed across 2 files
Scope correction: original intake had 1 file / 1 break point; confirmed 2 files / 6 break points
Conflict: RELATED to BUG-511 (same files, different lines — sequential, BUG-511 first)
Risk: CRITICAL (R6 — tax collection); UI-only fix; no backend change
Files WILL change: CheckInForm.jsx (4 sites) + CheckInPage.jsx (4 sites)
Files WILL NOT touch: collectMax (L90), effectiveBalanceDue (L256-263), pmsService, FolioCheckoutPanel, CollectPaymentPanel, orderTransform
Owner decisions needed: NONE — business rule confirmed, MUST NOT CHANGE lines locked
Docs: impact/BUG-512_IMPACT_ANALYSIS.md
Awaiting: Gate 3 GO → Implementation Plan
```
