# BUG-744 — Implementation Plan (Gate 3)

**Item:** BUG-744 — Order screen: prefilled customer shows CRM suggestions without focus
**Role:** PLANNING (Gate 3). No app code changed.
**Date:** 2026-11-21 · **Risk:** MEDIUM · **File:** `frontend/src/components/order-entry/CartPanel.jsx` (R5) — 1 file
**IA:** `impact/BUG-744_SUGGESTION_WITHOUT_FOCUS_IMPACT_ANALYSIS.md`

## Approach
Tie dropdown visibility to an explicit **field-focused flag** (mirrors BUG-660 intent). The search effects may still fetch matches, but only *show* the dropdown while the field is focused; blur hides it (with a short timeout so a suggestion click lands first). This fixes both the "lingers after blur" and the "manual self-match keeps re-opening while unfocused" symptoms without touching payloads or `selectCustomer`.

## Edits (all in CartPanel.jsx)

### E1 — focus state (after L952)
```
const [nameFocused, setNameFocused] = useState(false);   // BUG-744
const [phoneFocused, setPhoneFocused] = useState(false); // BUG-744
```

### E2 — gate NAME effect visibility on focus (L1007-1011)
In the name effect, change the show line so it only opens while focused:
`setShowNameSuggestions(nameFocused && filtered.length > 0);`
Add `nameFocused` to the dep array (L1016).

### E3 — gate PHONE effect visibility on focus (L989-993)
`setShowPhoneSuggestions(phoneFocused && filtered.length > 0);`
Add `phoneFocused` to the dep array (L998).

### E4 — name field focus/blur (L1180-1181)
- `onFocus`: `() => { setNameFocused(true); if (!isRoom && customerName.length >= 2) setShowNameSuggestions(filteredByName.length > 0); }`
- `onBlur`: `() => { handleFieldBlur(); setNameFocused(false); setTimeout(() => setShowNameSuggestions(false), 150); }` (150ms lets `onMouseDown` selection fire — pattern already used for coupons L1694)

### E5 — phone field focus/blur (L1219-1230)
- add `onFocus={() => setPhoneFocused(true)}` to `PhoneInputField` (confirm prop support; else wrap input).
- `onBlur`: `() => { handleFieldBlur(); setPhoneFocused(false); setTimeout(() => setShowPhoneSuggestions(false), 150); }`
- keep the existing phone `onChange` open-logic but it will now only visually show while `phoneFocused` (effect gate wins on next tick).

## NOT changed
`selectCustomer` / `onCustomerChange` contract, `handleFieldBlur` merge logic, payloads, `isCustomerSelected` sync (L972-979), CollectPaymentPanel (BUG-660 already covers the credit block).

## Pre-req to verify at Gate 5 (PhoneInputField)
Confirm `PhoneInputField` forwards `onFocus`; if not, the phone-focus flag attaches to the wrapping `div` (`onFocusCapture`). Covered in implementation.

## Test Plan
- Unit/interaction (testing_agent, browser): type `saurav` + phone that matches a CRM record → dropdown shows WHILE typing/focused → blur (click elsewhere, no outside-mousedown needed) → dropdown closes. Pick a suggestion → still selects (150ms). Loaded-order customer → no dropdown (unchanged). Required-field validation unchanged.
- Regression: `handleFieldBlur` still merges customer (loyalty blob intact); Place Order flow unaffected.

## Rollback
Revert CartPanel.jsx (single file). Additive state + guarded show lines; marker `// BUG-744`.

## Conflict
No open item on CartPanel.jsx. Disjoint from BUG-745 (CollectPaymentPanel). No shared lock.

```
Gate 3 complete: BUG-744 — 5 edits, 1 file, Risk MEDIUM, no owner decision
Next: IMPL → testing_agent (browser)
No app code changed.
```
