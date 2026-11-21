# BUG-744 — Implementation Plan (Gate 3)

**Item:** BUG-744 — Order screen: prefilled customer shows CRM suggestions without focus
**Role:** PLANNING (Gate 3). No app code changed.
**Date:** 2026-11-21 · **Revised:** 2026-11-21 (widened to CollectPaymentPanel per owner — see §E6) · **Risk:** MEDIUM · **Files:** `frontend/src/components/order-entry/CartPanel.jsx` (R5) + `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (R5) — **2 files**
**IA:** `impact/BUG-744_SUGGESTION_WITHOUT_FOCUS_IMPACT_ANALYSIS.md`

## Scope note (2026-11-21 widening)
Original plan fixed only the **order-screen** block (`CartPanel.jsx`). The RCA (`investigations/INV-CR-527_FOLLOWUPS_SUGGESTION_AND_DINER_AUTOFILL_2026-11-21.md`, ISSUE 1) found the **same defect class in the credit block** (`CollectPaymentPanel.jsx`). Verified in current code: the credit **phone** effect IS guarded (`tabPhoneWasUserTypedRef`, L616, BUG-660 V5-fix), but the credit **name** effect (L664-683) has **no focus / `wasUserTyped` guard** — it calls `setTabShowNameSuggestions(filtered.length > 0)` on *any* CRM match. Because the holder name is **seeded from the order customer** at L557 (`useState(customer?.name || "")`), that seeded value is treated as a live search term and the dropdown pops under the credit Name field **with nothing focused**. BUG-660 only closed the *phone* path, so the *name* path still leaks. §E6 closes it.

## Approach
**CartPanel (E1-E5):** tie dropdown visibility to an explicit **field-focused flag**. The search effects may still fetch matches, but only *show* the dropdown while the field is focused; blur hides it (with a short timeout so a suggestion click lands first). Fixes both "lingers after blur" and "manual self-match keeps re-opening while unfocused" without touching payloads or `selectCustomer`.

**CollectPaymentPanel (E6):** mirror the existing **BUG-660 `wasUserTyped` ref pattern** (already used for the credit phone effect) onto the credit **name** effect. Using the same ref pattern here — rather than a new focus flag — keeps the credit block internally consistent: a value that was *seeded* (holder from order customer) or *picked from the dropdown* is NOT "user-typed", so the name typeahead stays closed; it only opens once the cashier actually types in the Name field.

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

## Edits (CollectPaymentPanel.jsx) — §E6 (added 2026-11-21)

Mirror of BUG-660's phone guard onto the **name** effect. 4 small edits, all marked `// BUG-744`.

### E6a — new ref (near L591, beside `tabPhoneWasUserTypedRef`)
```
const tabNameWasUserTypedRef = useRef(false); // BUG-744: guard name search; seeded/selected name is not "user typed"
```

### E6b — gate the NAME effect (inside the `if (tabName.trim() && tabName.length >= 2) {` block, L671)
Add as the first line of that block, exactly mirroring the phone guard at L616:
```
if (!tabNameWasUserTypedRef.current) return; // BUG-744: skip search for seeded/selected name
```
Result: a holder name seeded from the order customer (L557) never triggers `searchCustomers` → `tabFilteredByName` stays `[]` → the dropdown cannot open (the `onFocus` at L3365 also only opens when `tabFilteredByName.length > 0`, so it stays closed too). No JSX change needed.

### E6c — set the ref true on real typing (`handleTabNameChange`, L719-726)
Add `tabNameWasUserTypedRef.current = true;` when the cashier edits the Name field, so the typeahead works normally while they type:
```
const handleTabNameChange = (e) => {
  const newName = e.target.value;
  setTabName(newName);
  tabNameWasUserTypedRef.current = true; // BUG-744: user is typing the name → allow search
  if (tabIsCustomerSelected) { ... }  // unchanged
};
```

### E6d — reset the ref false when the name is not user-typed
- In `selectTabCustomer` (L705-714), beside the existing `tabPhoneWasUserTypedRef.current = false;` (L710): add `tabNameWasUserTypedRef.current = false; // BUG-744: dropdown pick is not "user typed"`.
- In `handleTabPhoneChange` blank-out branch (L735, `if (!newPhone.trim()) setTabName("")`): also reset `tabNameWasUserTypedRef.current = false;` so a programmatic name-clear doesn't re-arm the search.

## NOT changed
`selectCustomer` / `onCustomerChange` contract, `handleFieldBlur` merge logic, payloads, `isCustomerSelected` sync (CartPanel L972-979). **CollectPaymentPanel credit PHONE path (already guarded by BUG-660 — untouched).** Diner field (CR-527 plain-text, no typeahead — untouched). `tabContact` payload (L1310) unchanged — this is a visibility-only fix.

## Pre-req to verify at Gate 5 (PhoneInputField)
Confirm `PhoneInputField` forwards `onFocus`; if not, the phone-focus flag attaches to the wrapping `div` (`onFocusCapture`). Covered in implementation.

## Test Plan
- Unit/interaction (testing_agent, browser): type `saurav` + phone that matches a CRM record → dropdown shows WHILE typing/focused → blur (click elsewhere, no outside-mousedown needed) → dropdown closes. Pick a suggestion → still selects (150ms). Loaded-order customer → no dropdown (unchanged). Required-field validation unchanged.
- Regression: `handleFieldBlur` still merges customer (loyalty blob intact); Place Order flow unaffected.

## Rollback
Revert CartPanel.jsx (single file). Additive state + guarded show lines; marker `// BUG-744`.

## Conflict — ⚠ CHANGED BY WIDENING
- `CartPanel.jsx`: no open item. Clear.
- `CollectPaymentPanel.jsx`: **now shared with BUG-745** (diner auto-fill seed, L564-565). BUG-744's CPP edits are **line-disjoint** from BUG-745 (name effect L664-683, handlers L705-726, ref ~L591 vs BUG-745's L564-565), so they do not collide textually — **but they are no longer file-disjoint**, so the earlier "parallel-safe, no shared lock" claim is void.
- **Execution rule:** BUG-744 and BUG-745 must be coded **sequentially in the same session on CollectPaymentPanel.jsx** (not in parallel branches), each applied against the other's post-edit state, with one webpack/compile check after both. Recommended order: BUG-745 first (1-line init seed, L564-565), then BUG-744 §E6 (effect/handler edits) on top. FILE_OWNERSHIP.md must record BOTH IDs on CollectPaymentPanel.jsx.

## Verification of the credit-block fix (add to §Test Plan at Gate 5)
Credit flow, order with customer Saurav → open Collect Payment → Credit:
1. On open, holder Name is seeded "Saurav" with **nothing focused** → **no suggestion dropdown** under the Name field (was: dropdown popped). ✅
2. Click the Name field and type → CRM suggestions appear while typing (normal typeahead preserved). ✅
3. Pick a suggestion → selects, dropdown closes, ref resets (no re-pop). ✅
4. Clear the Name → no stray dropdown; re-typing re-opens normally. ✅
5. Phone path unchanged (BUG-660 guard still holds).

```
Gate 3 complete (REVISED): BUG-744 — CartPanel 5 edits + CollectPaymentPanel 4 edits, 2 files, Risk MEDIUM, no owner decision
Shared-file lock with BUG-745 on CollectPaymentPanel.jsx → code sequentially (BUG-745 seed first, then BUG-744 §E6).
Next: IMPL → testing_agent (browser)
No app code changed (plan only).
```
