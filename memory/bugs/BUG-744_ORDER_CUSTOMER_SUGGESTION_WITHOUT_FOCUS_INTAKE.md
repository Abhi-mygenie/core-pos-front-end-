# BUG-744 — Order screen: prefilled customer shows CRM suggestions without focus

**Registered:** 2026-11-21 (INTAKE role, batch with BUG-745)
**Type:** BUG
**Status:** GATE_1_INTAKE_COMPLETE
**Priority:** P2 · **Severity:** P2 (annoying UX, no data loss) · **Risk:** MEDIUM (R5 hotspot file)
**Area:** Order Entry (customer block)
**Client:** ALL · **Assignee:** Abhishek
**Reported by:** owner (pms@macha.com, rest 69) with screenshots (order screen, orders #000028 area)

## Description
On the order-building screen, when the customer **Name + Phone are already filled** (e.g. `saurav` / `9990004354`), a CRM suggestion dropdown ("saurav / 9990004354") keeps appearing under BOTH fields — **even though neither field is focused**.

## Root Cause (code-traced — `investigations/INV-CR-527_FOLLOWUPS_SUGGESTION_AND_DINER_AUTOFILL_2026-11-21.md`)
`CartPanel.jsx` — the search `useEffect`s set the dropdown visible purely on a CRM value-match, with **no focus gate** and no "user-typed" guard:
- Name effect `L1002-1016`: `searchCustomers(customerName).then(f => setShowNameSuggestions(f.length>0))`
- Phone effect `L984-998`: same pattern
- Only guard is `isCustomerSelected` (`L952`, starts `false`). A customer **loaded from an existing/re-engaged order was never "selected" via the dropdown** → `isCustomerSelected` stays `false` → effects re-open the overlay on pre-filled data. `onFocus`/`onBlur` (`L1180-1181`, `L1223-1225`) only toggle on top; they don't own visibility.

## Duplicate Check
**RELATED, not duplicate.** BUG-660 (GATE_5A 2026-11-09) fixed the identical class in `CollectPaymentPanel.jsx` (credit block) via `tabSeedMatched`→`tabIsCustomerSelected` seed + `tabPhoneWasUserTypedRef` guard. **CartPanel.jsx was never touched by BUG-660** → this is the order-screen sibling. (Note: the BUG-660 fix also did NOT add the user-typed guard to the CollectPaymentPanel *name* effect `L664-683` — see BUG-745 blast radius; may be folded in.)

## Fix Direction (for PLANNING — not built here)
Port the BUG-660 pattern to `CartPanel.jsx`: treat a customer loaded from an order as `isCustomerSelected=true`; gate `setShow*Suggestions(true)` on an explicit field-focused flag and/or a `wasUserTyped` ref. Low risk, 1 file.

## Blast Radius
`frontend/src/components/order-entry/CartPanel.jsx` (R5 hotspot). Possibly `CollectPaymentPanel.jsx` name-effect guard (coordinate — overlaps BUG-745 file).

## Evidence
OWNER-REPORTED + screenshots; CONFIRMED by code trace. Investigation: `investigations/INV-CR-527_FOLLOWUPS_SUGGESTION_AND_DINER_AUTOFILL_2026-11-21.md`.

## Next
→ PLANNING Gate 2. Fast-lane candidate (mirrors a shipped fix), but R5 hotspot → quick IA first.
