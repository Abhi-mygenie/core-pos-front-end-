# BUG-745 — Impact Analysis (Gate 2)

**Item:** BUG-745 — Diner should auto-fill with the original order customer when holder differs
**Role:** PLANNING (Gate 2 — Impact Analysis). No app code changed.
**Date:** 2026-11-21 · **Risk:** MEDIUM (R5 hotspot, financial-adjacent capture) · **Code Reality:** CONFIRMED
**Intake:** `bugs/BUG-745_DINER_AUTOFILL_FROM_ORDER_CUSTOMER_INTAKE.md` · **Parent:** CR-527 (capture phase, GATE_5A)
**Owner decision:** OD-745-01 = auto-fill diner from order customer (Option Q).

## 1. Code Reality (verified)
`CollectPaymentPanel.jsx`:
- Holder seeded from the order customer at init — `const [tabName] = useState(customer?.name || "")`, `tabPhone` (L557-558).
- Diner starts EMPTY, never seeded — `const [dinerName] = useState("")`, `dinerPhone` (L564-565); set only by `handleDinerNameChange`/`handleDinerPhoneChange` (L742-747).
- Holder is seeded only at init; there is **no `useEffect` resyncing tabName from a later `customer` prop change** (unlike CartPanel L972-979).
- Diner field is gated to render only when holder name + valid phone present (CR-527).
- Diner emitted via `dinerContact` (L1311) → `diner_name`/`diner_mobile` (CR-527); backend null-collapses diner==holder → "—".

## 2. Root Cause (design gap, not a defect)
The order customer (who ate) is seeded into the **holder** field; the diner is left blank. When the cashier changes the holder to a different payer (Koji), the seeded order customer (Saurav) is overwritten and **the diner is never populated** → lost → record shows "—".

## 3. Fix direction (for Gate 3 — not built; OD-745-01 = auto-fill)
Seed the diner from the order customer so the "who ate" identity is retained independent of the holder:
- **Seed at init:** `dinerName = useState(customer?.name || "")`, `dinerPhone = useState(customer?.phone || "")` (mirror holder seed L557-558).
- Result by scenario:
  - Holder unchanged (Saurav) → holder==diner → backend nulls → record "—" (unchanged, correct).
  - Holder changed to Koji → diner still = Saurav → persists → record shows Diner: Saurav. **Exactly OD-745-01.**
  - Walk-in / no order customer → diner "" → blank (gated field may not render until holder typed).
- **Preserve manual edits:** seed at init only (no customer-prop sync effect that could clobber a hand-edited diner). If a resync effect is added, guard it so it never overwrites a diner the cashier changed.
- Keep diner plain text — NO CRM typeahead (CR-527 A4). No payload shape change (dinerContact already wired).

## 4. Open question for Gate 3 (OD-745-02)
Pre-filling the diner means the Diner input visibly shows the order customer's name even in the common holder==diner case. Confirm desired: (a) show it pre-filled (simplest, matches "auto-fill the original customer info") — RECOMMENDED; or (b) keep the input visually blank but carry the original customer only when the holder is edited away. Default = (a).

## 5. Affected files
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (R5) — diner state seed L564-565 (+ optional guarded sync). **1 file.** Unit test for the seed/emit.
- No change to `orderTransform.js` (dinerContact already emits), backend, or credit display.

## 6. Conflict pre-check
No open item on `CollectPaymentPanel.jsx` (CR-527 + BUG-660 shipped). BUG-744 is scoped to CartPanel → **no shared-file lock** with BUG-745. Edit site L564-565 is line-disjoint from CR-527/BUG-660 markers.

## 7. Risk register
| Risk | L | I | Mitigation |
|---|---|---|---|
| Seeded diner == holder shows a spurious diner on record | Low | Med | Backend null-collapse already hides it → "—" (CR-527) |
| Resync effect clobbers a hand-edited diner | Med | Med | Seed at init only, or guard the effect against user-edited state |
| Pre-filled diner input confuses cashier in common case | Low | Low | Caption already says "leave blank if same as credit customer" (CR-527); resolve OD-745-02 |

## 8. Handover
```
Gate 2 complete: BUG-745
Code reality: CONFIRMED · Risk: MEDIUM · 1 file (CollectPaymentPanel.jsx)
RC: order customer seeds holder (L557), diner never seeded (L564) → holder edit drops the diner
Owner decision OD-745-01 locked (auto-fill). OD-745-02 OPEN (show pre-filled vs carry-on-edit; default=show).
Next: PLANNING Gate 3 — seed diner from order customer (init), preserve manual edits.
No app code changed.
```
