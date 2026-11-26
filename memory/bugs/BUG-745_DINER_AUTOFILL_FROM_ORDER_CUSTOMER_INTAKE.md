# BUG-745 — Diner should auto-fill with the original order customer when holder differs

**Registered:** 2026-11-21 (INTAKE role, batch with BUG-744)
**Type:** BUG (owner directed intake-as-bug; behaviourally an enhancement of CR-527 capture)
**Status:** GATE_1_INTAKE_COMPLETE
**Priority:** P2 · **Severity:** P2 (loses the original diner identity; owner frames as UX usability) · **Risk:** MEDIUM (R5 hotspot file)
**Area:** Payments / Credit (CollectPaymentPanel)
**Client:** ALL · **Assignee:** Abhishek
**Reported by:** owner (pms@macha.com, rest 69), screenshot 3 (#000028, Credit, holder=koji)

## Description
Order taken for **Saurav** (who ate). At payment, cashier sets the **credit holder** to **Koji** (who pays). The **Diner** field should then **auto-fill with the original order customer (Saurav)** for UX usability. Today it stays blank and Saurav's identity is lost.

**OWNER DECISION (OD-745-01, locked 2026-11-21):** "It should just auto-fill the original customer info." → **Option Q**: diner auto-fills from the order customer; cashier can still override/clear.

## Root Cause (code-traced — same investigation doc)
- Holder (`tabName`/`tabPhone`) is seeded from the order customer — `CollectPaymentPanel.jsx:557-558`.
- Diner (`dinerName`/`dinerPhone`) starts **EMPTY** and is never seeded — `L564-565`; set only by the manual input handler `L742`.
- So editing the holder to "Koji" overwrites the seeded "Saurav" and the diner is never populated → backend nulls → row shows "—". (Design gap in shipped CR-527 OD-527-D, which seeded the holder and left diner empty.)

## Duplicate Check
Not a duplicate. Directly augments **CR-527 (capture phase, GATE_5A 2026-11-21)**. Re-opens the OD-527-D seed decision.

## Fix Direction (for PLANNING — not built here)
Seed/auto-fill the **diner** from the order customer, then keep it in sync per OD-745-01:
- On mount (TAB), pre-fill diner from `customer?.name`/`customer?.phone`.
- When the cashier edits the holder away from the order customer, ensure the original customer is carried into the diner (not lost).
- Respect CR-527 null-collapse: if the final diner == holder, backend nulls → "—" (unchanged). Keep diner as plain text (NO CRM typeahead — CR-527 A4).
- Edge cases for PLANNING: cashier manually clears the diner (keep blank, don't re-seed); walk-in / no order customer (diner stays blank); interaction with BUG-744 focus fix.

## Blast Radius
`frontend/src/components/order-entry/CollectPaymentPanel.jsx` (R5 hotspot) — diner state seed + a sync effect. Shares file with BUG-744's possible name-effect guard → single session/PR.

## Evidence
OWNER-REPORTED + screenshot 3; CONFIRMED by code trace. Investigation: `investigations/INV-CR-527_FOLLOWUPS_SUGGESTION_AND_DINER_AUTOFILL_2026-11-21.md`.

## Next
→ PLANNING Gate 2 (Impact Analysis). Owner decision OD-745-01 already locked (Option Q auto-fill).
