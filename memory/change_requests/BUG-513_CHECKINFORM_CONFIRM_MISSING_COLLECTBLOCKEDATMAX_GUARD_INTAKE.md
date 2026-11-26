# BUG-513 — INTAKE DOC

**ID:** BUG-513
**Date:** 2026-10-07
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED — investigation of BUG-512 runtime failure (2026-10-07)

---

## Title

CheckInForm `confirm()` submits GST to backend at max discount — `collectBlockedAtMax` missing from submit guard and `ready` does not include it

---

## Description

### Sub-issue A — `confirm()` submits with `collectNow: collectAmt` (CONFIRMED GAP, P0)

`CheckInForm.jsx` L123-124:
```js
const confirm = async () => {
    if (!ready || busy) return;   // ← collectBlockedAtMax NOT checked
```

`ready` is computed from the `missing` array (L58-62). `missing` does NOT include `collectBlockedAtMax`. So at max discount with collect=50 entered:

| Variable | Value | Effect |
|---|---|---|
| `ready` | `TRUE` | "✓ Ready to check in" badge shows |
| `!ready` | `FALSE` | Guard passes |
| `busy` | `FALSE` | Guard passes |
| `collectBlockedAtMax` | `TRUE` | **Not in guard — ignored** |
| → `confirm()` executes | **YES** | Sends `collectNow: 50` to backend API |

L130 is the financial impact:
```js
collectNow: collectAmt,   // ← 50 sent to backend = GST collected at check-in
```

The backend records the ₹50 as "Paid so far", reducing the outstanding balance that should remain for GST settlement at checkout.

### Sub-issue B — Button visually enabled at max discount (OBSERVED, root cause unresolved)

`CheckInForm.jsx` L331:
```js
disabled={!ready || busy || discountOverMax || collectOverMax || collectBlockedAtMax}
```

This expression evaluates to `TRUE` at max discount + collect=50 (verified by Node.js simulation). The button should appear disabled. But screenshots show it at full green opacity (enabled).

Owner screenshots confirm:
- Full discount 88.34% + collect=50 → button GREEN / enabled + error fires (new BUG-512 message)
- Partial discount 60% + collect=2700 → button GREY / disabled ✓

Root cause of Sub-issue B not determined during investigation (8/10 steps, HIGH arithmetic confidence). Planning agent needs further investigation.

**Note:** Sub-issue A is the financial impact. Sub-issue B is the UX symptom that reveals A is reachable.

---

## Code Reality

**PARTIAL** — BUG-512 code exists at both sites but `confirm()` guard is incomplete.

| File | Location | BUG-512 code present | Gap |
|---|---|---|---|
| `CheckInForm.jsx` | L97: `collectBlockedAtMax` const | ✅ | L123: `confirm()` guard missing it |
| `CheckInForm.jsx` | L331: `disabled` prop | ✅ | Visual disabled not working (Sub-issue B) |
| `CheckInPage.jsx` | L293: `collectBlockedAtMax_ci` const | ✅ | **NO GAP** — `handleConfirm()` L309 guards via `formValid` which includes `!collectBlockedAtMax_ci` |

**CheckInPage.jsx is NOT in scope** — it is already protected.

---

## Duplicate Check

- **RELATED to BUG-512** — this is an implementation gap in the BUG-512 fix, analogous to how BUG-509 produced BUG-511
- **DISTINCT** — BUG-512 described the design gap (wrong condition logic); BUG-513 is the submit-guard omission
- **NOT a duplicate** of any earlier bug

---

## Severity & Risk

- **Severity: P0** — financial: GST collected at check-in when it should settle at checkout (R6)
- **Risk: CRITICAL** — R6 triggers; tax collected at wrong stage; `collectNow: 50` sent to backend
- **Fast Lane: NO** — CRITICAL financial, owner approval required

---

## Evidence

| Type | Detail |
|---|---|
| Screenshot 1 | 88.34% max discount, collect=50, Cash — button GREEN, "✓ Ready to check in", Confirm enabled |
| Screenshot 2 | 60% partial, collect=2700 — button GREY, disabled ✓ (collectOverMax works) |
| Code trace | `confirm()` L123: `if (!ready || busy)` — `collectBlockedAtMax` absent |
| Code trace | L130: `collectNow: collectAmt` — API receives 50 when button clicked |
| Code trace | CheckInPage.jsx L309: `if (!formValid \|\| submitting)` — formValid includes `!collectBlockedAtMax_ci` ✓ |
| Investigation | This session — Node.js simulation confirmed `collectBlockedAtMax = TRUE` at runtime |
| Confidence | CONFIRMED (code trace) for Sub-issue A · SUSPECTED (unresolved) for Sub-issue B |

---

## Blast Radius

```bash
grep -n "confirm\|collectBlockedAtMax" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
```

- `CheckInForm.jsx` L123 (1 line change confirmed)
- `CheckInForm.jsx` additional lines TBD pending Sub-issue B investigation
- NOT `CheckInPage.jsx` — already guarded
- **Blast: SMALL** (1 file certain, 1-2 lines for Sub-issue A)

---

## Correct Fix Direction (Sub-issue A — confirmed)

```js
// CheckInForm.jsx L123-124
// CURRENT:
const confirm = async () => {
    if (!ready || busy) return;

// CORRECT (Sub-issue A fix):
const confirm = async () => {
    if (!ready || busy || collectBlockedAtMax) return;
```

This ensures even if the button appears enabled (Sub-issue B), the API call never executes with `collectNow: 50`. Fix is 1 line.

---

## Open Questions

| # | Question | Blocks? |
|---|---|---|
| OQ-1 | Root cause of Sub-issue B (why does `disabled={... \|\| collectBlockedAtMax}` not visually disable the button)? | Blocks complete UX fix but NOT the financial fix (Sub-issue A fix unblocks P0) |
| OQ-2 | Should Sub-issue B be planned as a separate targeted edit after Sub-issue A is confirmed fixed? | Owner decides |

---

## Next

Gate 2 GO → PLANNING (Impact Analysis)
