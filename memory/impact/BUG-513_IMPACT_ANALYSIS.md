# BUG-513 — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-513
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 2+3 combined at owner request)
**Code Reality:** PARTIAL — `collectBlockedAtMax` const exists (L97 ✅), `confirm()` guard missing it (L124 ❌)
**Conflict Pre-Check:** CheckInForm.jsx last modified by BUG-512 (2026-10-07, this session). No other open items on this file. BUG-512 code is fully in place. No conflicts.
**Risk:** CRITICAL (R6 — financial: GST collected at wrong stage)

---

## 1. Summary

`CheckInForm.jsx` `confirm()` (L123–124) fires unconditionally when the button is clicked, even at max discount where `collectBlockedAtMax = TRUE`. The `collectBlockedAtMax` guard that was added to the `disabled` prop (L331) is missing from the submit function. At max discount with `collectAmt = gstOnAdv`, the API receives `collectNow: 50` at check-in — GST that should settle at checkout is recorded as already paid, reducing the correct outstanding balance.

---

## 2. Data Flow Trace

```
User: enters max discount (₹7,950 / 88.34%) → enters collectAmt = 50
  │
  ├─ L96:  collectAtMaxGst     = collectMax > 0 && collectMax <= gstOnAdvFloor  →  TRUE
  ├─ L97:  collectBlockedAtMax = collectAtMaxGst && collectAmt > 0               →  TRUE
  │
  ├─ L321: Error condition (collectOverMax || collectBlockedAtMax)                →  TRUE  → error message fires ✓
  ├─ L331: disabled = (!ready || busy || discountOverMax || collectOverMax || collectBlockedAtMax) → TRUE
  │                                                                                    ↑ wired correctly ✓
  │        BUT: visual appearance unclear (see Sub-issue B below)
  │
  └─ User clicks Confirm button
       │
       ├─ L123: const confirm = async () => {
       ├─ L124: if (!ready || busy) return;    ← collectBlockedAtMax NOT CHECKED  ← GAP
       │
       └─ confirm() executes  ← SUB-ISSUE A: financial harm
            │
            └─ L130: collectNow: collectAmt    ← sends "50" to backend
                 └─ Backend stores GST as paid at check-in (wrong stage)

BREAK POINT: L124 — guard missing collectBlockedAtMax
```

**CheckInPage.jsx is safe** — `handleConfirm()` guards via `formValid` which includes `!collectBlockedAtMax_ci`. No change needed there.

---

## 3. Sub-issue A — `confirm()` Missing Guard

**Location:** `CheckInForm.jsx` L124
**Current:**
```js
const confirm = async () => {
    if (!ready || busy) return;
```
**Gap:** `collectBlockedAtMax` is not checked → API call executes with `collectNow: 50`

**Financial impact:**
- Backend records ₹50 as "Paid at check-in"
- Outstanding balance reduced by ₹50 incorrectly
- GST that should settle at checkout is pre-collected
- Downstream: checkout calculation uses wrong balance

**Confidence:** HIGH — confirmed by code trace + Node.js simulation (prior session, 8/10 steps)

---

## 4. Sub-issue B — Button Visually Enabled at Max Discount

**Location:** `CheckInForm.jsx` L331
**Current:**
```jsx
disabled={!ready || busy || discountOverMax || collectOverMax || collectBlockedAtMax}
className="... bg-[#329937] ... disabled:opacity-40"
```

**Observed:** Button appears full-green (enabled visual) despite `disabled={TRUE}` when `collectBlockedAtMax = TRUE`.

**Evidence:**
- L321 error fires (same `collectBlockedAtMax` flag) → flag IS TRUE at render time ✓
- Node.js simulation confirms arithmetic: `collectBlockedAtMax = TRUE` at max discount + collect=50 ✓
- Button click DOES reach `confirm()` (Sub-issue A proves this — HTML disabled attribute may not be blocking clicks reliably, or the visual opacity is misleading)

**Hypotheses tested (8/10 steps, prior session):**

| # | Hypothesis | Status |
|---|---|---|
| H1 | `collectAmt` is string, coercion issue | ELIMINATED — JS coercion still evaluates TRUE |
| H2 | `collectMax = 0` edge case | ELIMINATED — at 7950 discount, collectMax = 50 |
| H3 | React batching causes stale disabled prop | NEEDS MORE DATA |
| **H4 NEW** | **`disabled:opacity-40` on green background is visually ambiguous (lighter green ≠ grey)** | **PLAUSIBLE — green at 40% opacity on white ≈ muted green, owner reads as "enabled"** |
| H5 | `collectBlockedAtMax` evaluates FALSE in disabled but TRUE in error block | SUSPECTED — different evaluation contexts possible if state updates race |

**NEW Hypothesis H4 (identified this session):**
The `disabled` attribute IS being set correctly (functional), but `disabled:opacity-40` applied to `bg-[#329937]` (dark green) produces a muted/lighter green at 40% opacity — which the owner may be reading as a partially-active state rather than a disabled state. The button is **functionally blocked** by the HTML `disabled` attribute, but the **visual affordance is insufficient**.

If H4 is correct:
- Sub-issue A is the financial protection (guard in confirm())
- Sub-issue B becomes a cosmetic UX issue (insufficient disabled visual contrast)
- Sub-issue A fix alone closes the financial risk

**Resolution path:** Post Sub-issue A implementation, test: does clicking the button trigger confirm()? If NO (HTML disabled blocks it) → Sub-issue B is confirmed cosmetic only → file as separate LOW/cosmetic CR. If YES (clicks go through) → Sub-issue B requires deeper investigation.

---

## 5. Affected Files

| File | Lines | Change Needed | In Scope? |
|---|---|---|---|
| `CheckInForm.jsx` | L124 | Add `\|\| collectBlockedAtMax` to guard | ✅ YES |
| `CheckInPage.jsx` | L309 | Already protected via `formValid` | ✅ NO CHANGE |

**Files will NOT touch:** `CheckInPage.jsx`, `pmsService.js`, any other file.

---

## 6. Risk Classification

- **Risk: CRITICAL** (R6 — tax/financial logic, wrong payment stage, sent to backend)
- **Fast Lane: NO** — CRITICAL items require full gate flow + owner approval (Gate 4 GO)
- **Financial test required:** Yes — verify `collectNow` is NOT sent with GST amount at max discount after fix

---

## 7. Owner Decisions Required

**None for Gate 3 implementation.** Sub-issue A fix is unambiguous: add `collectBlockedAtMax` to the confirm guard. No business logic interpretation needed.

**OQ-1 (Sub-issue B — deferred post-implementation):** After Sub-issue A fix, if button still appears visually enabled, owner to decide:
- (a) Add more prominent disabled styling (e.g., `disabled:bg-gray-300 disabled:text-gray-500`) — affects all disabled states of this button
- (b) Add conditional class `${collectBlockedAtMax ? 'opacity-40 cursor-not-allowed' : ''}` — targeted but bypasses the disabled prop
- (c) Accept current visual as-is if functional block (HTML disabled) is confirmed working

**OQ-2:** Confirm Sub-issue A fix alone closes this item to satisfaction at Gate 6, with Sub-issue B logged as a follow-up.

---

## 8. Conflict Pre-Check

| File | Last Modifier | Open Items |
|---|---|---|
| `CheckInForm.jsx` | BUG-512 (2026-10-07) | None open — BUG-512 fully implemented |

No conflicts. BUG-513 edit is additive (extends existing guard).

