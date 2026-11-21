# Investigation — CR-527 follow-ups: (1) unfocused CRM suggestion, (2) diner auto-fill from order customer

**Role:** INVESTIGATION (read-only — no code edited, no gate advanced)
**Date:** 2026-11-21
**Reported by:** owner (pms@macha.com, rest 69) with screenshots
**Scope:** 2 separate issues surfaced on the credit/collect-payment flow.

---

## ISSUE 1 — CRM "same name" suggestion pops even when the field is NOT focused

### Symptom
With the customer Name + Phone already filled (e.g. `saurav` / `9990004354`), a suggestion dropdown ("saurav / 9990004354") keeps showing under BOTH the name and the phone field — even though neither field is focused (screenshots 1 & 2 = order screen; same class of bug also in the credit block).

### Root Cause (CONFIRMED, code-traced)
The suggestion dropdown's visibility (`showNameSuggestions` / `showPhoneSuggestions`) is set **true inside the search `useEffect`s**, driven purely by "value matched a CRM record" — **with no check that the field is focused** and (for name) no check that the value was user-typed.

- **CartPanel.jsx** (order-screen customer block — screenshots 1 & 2):
  - Name effect `L1002-1016`: `searchCustomers(customerName).then(f => { setFilteredByName(f); setShowNameSuggestions(f.length > 0); })` — fires on any `customerName` change, opens the dropdown regardless of focus.
  - Phone effect `L984-998`: same pattern, no focus gate, no "user typed" guard.
  - The early-return guard is only `isCustomerSelected` (`L952` starts `false`). **A customer loaded from an existing/re-engaged order was never "selected" via the dropdown**, so `isCustomerSelected` stays `false`, the effects run against the pre-filled values, hit a CRM match, and re-open the dropdown with no focus. `onFocus`/`onBlur` (`L1180-1181`, `L1223-1225`) only toggle on top — they do not own visibility.

- **CollectPaymentPanel.jsx** (credit block — same family):
  - Phone effect `L608-628` HAS a guard `if (!tabPhoneWasUserTypedRef.current) return` (`L616`, added under BUG-660) → phone suggestions suppressed unless user typed.
  - **Name effect `L664-683` has NO equivalent guard** → name suggestions still pop on a seeded/filled `tabName` without focus. (The holder name is seeded from the order customer at `L557`, so it is pre-filled and unguarded.)

### Why it regressed into view now
CR-527 did not touch this logic, but the credit flow is now used more; and the holder name seed (`L557`) pre-fills a value the name effect treats as "search me", re-opening the overlay.

### Fix direction (for a future BUG intake — NOT done here)
Gate `setShow*Suggestions(true)` on an explicit **field-focused** flag (and/or mirror the `wasUserTyped` ref to the NAME effect, as BUG-660 did for phone). Treat a customer loaded from an existing order as `isCustomerSelected = true` so the typeahead does not re-fire on pre-filled data. Low risk, 2 files (`CartPanel.jsx`, `CollectPaymentPanel.jsx`), both R5 hotspots → needs its own BUG + plan.

---

## ISSUE 2 — When holder ≠ order customer, the diner should auto-fill with the order customer

### Owner's scenario
Order taken for **Saurav** (the person who ate). At payment, cashier sets the **credit holder** to **Koji** (who will pay later). Owner expects the **Diner** to auto-fill with the order customer **Saurav** (since Saurav ate), leaving holder = Koji.

### Current behaviour (CONFIRMED, code-traced — this is a DESIGN GAP, not a code defect)
- The **holder** field (`tabName`/`tabPhone`) is **seeded from the order customer** — `CollectPaymentPanel.jsx:557-558` `useState(customer?.name || "")`.
- The **diner** field starts **EMPTY** and is seeded from nothing — `L564-565` `useState("")`; `setDinerName` is only ever called by the manual input handler `L742`. No effect seeds it.
- Net effect: when the cashier overwrites the seeded holder "Saurav" with "Koji", **the original order customer (Saurav) is lost** — it is not preserved as the diner. Diner stays blank → backend nulls → row shows "—". Saurav's identity is only kept if the cashier re-types it into the Diner field.

### Analysis
The owner's model is arguably the correct one: **order customer = diner (who ate)**, **credit holder = who pays**. Our shipped CR-527 decision (OD-527-D) seeded the *holder* from the order customer and left the *diner* empty — i.e. the seed is on the field most likely to be changed. For the holder ≠ customer scenario this drops the diner.

Two candidate behaviours (owner decision needed):
- **Option P — seed the DINER from the order customer** (not the holder). Holder starts blank/typed; diner pre-fills with Saurav; cashier types Koji as holder. Matches the owner's expectation directly. Changes the shipped seed decision.
- **Option Q — keep the holder seed, but when the cashier edits the holder away from the seeded order customer, auto-fill the diner with the original order customer.** Preserves current holder UX; adds a "carry the displaced customer into diner" rule.

Both reverse/augment the just-shipped OD-527-D seed decision, so this is a **new owner decision + Planning change** (re-open CR-527 capture, or a small follow-up CR), not an investigation-level edit.

### Note
This interacts with ISSUE 1: if the diner is seeded, the diner field must NOT get the unfocused-CRM-suggestion treatment (CR-527 already specified diner = plain text, no CRM typeahead — good, keep it).

---

## Recommended next steps (owner to direct — nothing changed here)
1. **ISSUE 1 → INTAKE a BUG** ("CRM customer suggestion opens without focus on pre-filled name/phone"), MEDIUM, files `CartPanel.jsx` + `CollectPaymentPanel.jsx`. Fix = focus-gate the dropdown + treat loaded customer as selected + mirror `wasUserTyped` guard to the name effect.
2. **ISSUE 2 → owner decision (Option P vs Q)** → re-open CR-527 capture (PLANNING) to seed the diner from the order customer. Confirm desired default before any edit.
3. Any code fix must then go through IMPL → **testing_agent** verification (owner asked to stay read-only this turn).

```
Investigation complete (read-only, in gate)
ISSUE 1: CONFIRMED code defect — suggestion visibility set in search effects w/o focus gate
         (CartPanel L984-1016 / CollectPaymentPanel name effect L664-683). → needs BUG intake.
ISSUE 2: CONFIRMED design gap — order customer seeds the HOLDER (L557), diner never seeded (L564);
         holder edit drops the original customer. → needs owner decision + PLANNING re-open.
No code edited. No testing_agent (no fix applied this turn, per owner instruction).
```
