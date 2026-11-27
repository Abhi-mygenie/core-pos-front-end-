# BUG-745 — Implementation Plan (Gate 3)

**Item:** BUG-745 — Diner auto-fills with the original order customer when holder differs
**Role:** PLANNING (Gate 3) → **IMPLEMENTED 2026-11-21** (E1 applied, webpack clean). No app code changed by this plan doc.
**Date:** 2026-11-21 · **Risk:** MEDIUM · **File:** `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (R5) — 1 file (+test)
**IA:** `impact/BUG-745_DINER_AUTOFILL_IMPACT_ANALYSIS.md` · **Parent:** CR-527
**Owner decisions:** OD-745-01 = auto-fill diner from order customer. **OD-745-02 = SHOW pre-filled** (default applied — simplest, matches "just auto-fill the original customer info").

## Approach
Seed the diner state from the order customer at init (mirror the holder seed at L557-558). The order customer = "who ate"; the holder is who pays. Common case holder==diner collapses to "—" via backend (CR-527). Seed at INIT ONLY so a cashier's manual diner edit is never clobbered.

## Edits (CollectPaymentPanel.jsx)

### E1 — seed diner from order customer (L564-565)
```
// BUG-745 (OD-745-01): seed diner from the order customer (who ate). Holder may
// be changed to a different payer; the diner retains the original customer.
const [dinerName, setDinerName]   = useState(customer?.name || "");
const [dinerPhone, setDinerPhone] = useState(customer?.phone || "");
```
(Keep the CR-527 comment above; only the initial values change from `""`.)

### E2 — no customer-prop sync effect
Do NOT add a `useEffect` resyncing diner from `customer` (would clobber manual edits and the holder has none either — parity). Init seed is sufficient for the collect-payment lifecycle (panel mounts with the order's customer).

## Behaviour matrix
| Holder (tabName) | Diner (seeded) | Sent | Record |
|---|---|---|---|
| Saurav (unchanged) | Saurav | diner==holder | backend nulls → "—" |
| Koji (cashier edits holder) | Saurav (retained) | diner_name=Saurav | shows "Diner: Saurav" |
| cashier clears/edits diner | (their value) | as typed | respected |
| walk-in (no order customer) | "" | blank | "—" (field gated until holder typed) |

## NOT changed
Holder seed/logic (L557-558), `dinerContact` wiring (L1311), diner handlers (L742-747), gating (CR-527), `orderTransform`, backend, credit display.

## Test Plan
- Unit (extend `orderTransform.cr527.test.js` or new `CollectPaymentPanel` test): N/A for pure state seed; add a transform-agnostic assertion is not meaningful → rely on browser.
- testing_agent (browser): order customer Saurav → open Collect Payment → Credit. Diner field pre-filled "Saurav". (a) Leave holder=Saurav, pay → credit row diner "—". (b) Change holder to Koji, pay → credit row + order card/detail show Diner: Saurav. (c) Clear diner manually → stays blank. (d) Walk-in order → diner blank.

## Rollback
Revert the two `useState` initial values to `""`. Single file, marker `// BUG-745`.

## Conflict — ⚠ updated 2026-11-21
`CollectPaymentPanel.jsx` is **now shared with BUG-744** (its plan was widened to guard the credit-block name typeahead: effect L664-683, handlers L705-726, new ref ~L591). BUG-745's edit (diner seed, L564-565) is **line-disjoint** from those, so no textual collision — **but same file**, so the two are no longer parallel-safe. **Execution rule:** code BUG-745 first (1-line init seed), then BUG-744 §E6 on top, single compile after both; record BOTH IDs on CollectPaymentPanel.jsx in FILE_OWNERSHIP.md. BUG-744's CartPanel.jsx portion remains independent.

## Follow-up — diner label copy (owner 2026-11-21, pending approval)
Now that the diner is **pre-filled** (not blank), the existing hint is misleading. Owner requested a copy change — **no code edited yet**:
- File: `CollectPaymentPanel.jsx` **L3435**
- FROM: `Diner (who ate)<span class="font-normal"> — leave blank if same as credit customer</span>`
- TO:   `Diner (who ate)<span class="font-normal"> — don't change if same as credit customer</span>`
- Rationale: the field is seeded with the holder; if the diner is the same person the cashier should **leave the pre-filled value as-is** (backend null-collapses holder==diner → "—"). 1-line text-only change, zero logic/payload impact. Apply on owner GO.

```
Gate 3 complete: BUG-745 — 1 edit (seed), 1 file, Risk MEDIUM
OD-745-01 auto-fill; OD-745-02 = show pre-filled (default). Seed at init only (preserve manual edits).
Next: IMPL → testing_agent (browser)
No app code changed.
```
