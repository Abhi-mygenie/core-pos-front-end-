# CR-385 — No-Show + Cancel Booking · v2.22 Blueprint (PROPOSED — awaiting owner approval)

Date: 2026-06 · Status: BLUEPRINT ONLY (no mockup edit yet)
File to edit on approval: `/app/frontend/public/cr385-frontdesk-mockup.html`
Precedes: implementation → smoke screenshot → testing_agent → owner freeze.

---

## 1. Why this box exists / what it replaces

The last two expandable panels still in the **old one-column placeholder** style:

- **Mark No-Show** (`expansion(o,'noshow')`, line ~569) — header + one paragraph + `[Back][Confirm No-Show]`.
  Non-OTA shows the BQ-385-04 guard + "Cancel booking instead". Single static sub-line:
  *"Advance paid: ₹0 · policy for forfeiture — open (NS4)"*. No money outcome.
- **Cancel booking** (`expansion(o,'cancel')`, line ~570) — three **read-only** text fields
  (Reason hardcoded, Refund advance "₹0 · nothing paid", Notify source) + `[Back][Confirm cancel]`.
  Nothing interactive; refund always ₹0 because the mock records no prepaid amount.

Both hide the financial consequence a clerk needs before an irreversible action.

---

## 2. Owner decisions locked in this round (from ask_human, 2026-06)

- **D-a** These stay as **confirmation dialogs**, NOT the heavy two-column editable form used by
  Extend v2.20 / Modify v2.21 — "seeing nature of operation". Destructive + low-input.
- **D-b** **No frontend forfeiture / penalty picker.** The penalty is **backend-computed**; the desk
  just confirms. Frontend shows the outcome read-only.
- **D-c** Each dialog shows a **read-only money-outcome block**: Prepaid/advance → Forfeited/penalty
  (SGST + CGST kept **separate**) → **Refund due**, with **refund-to-guest vs folio-credit** as a
  **Phase-2 mock**.
- **D-d** **Non-OTA No-Show Confirm stays disabled** (backend BQ-385-04) with the
  "Cancel booking instead" path — unchanged.
- **D-e** Cancel keeps a **Reason** selector + **Notify** line; the **reason list is
  configuration-driven** (treated as API/config data, like room types/rate plans).
- **D-f (OPEN — owner decides after this blueprint)** whether to seed realistic **prepaid amounts**
  so the money-outcome block is illustrative. See §6 (Variant A vs B).

Preserved invariants: SGST/CGST never merged · no right/inner scroll needed (dialogs are short) ·
closed screens (Checkout v2.9, Check-In v2.16, Booking v2.18) untouched.

---

## 3. Visual language

Compact **confirmation dialog** reusing the existing `.exp / .exh / .exb / .exf` shell (same as
today's placeholders and Mark-All-Clean), NOT `.ci-layout`. Rationale: matches the "nature of
operation" and keeps it short enough that no internal scroll is ever needed.

Layout inside `.exb`:
- **Top:** one-line booking summary (guest · source badge · stay dates · type/room · guests).
- **Middle-left (inputs, minimal):**
  - No-Show: nothing to pick (auto reason "Guest did not arrive"); optional audit note.
  - Cancel: **Reason** select (config-driven list) + optional audit note + Notify toggle.
- **Middle-right (money outcome, read-only card):** the `.box`-style summary (see §5).
- **Footer `.exf`:** readiness/consequence hint on the left, `[Back]` + destructive primary on the
  right (`Confirm No-Show` / `Confirm cancel`), primary in `.btn.dg`.

Use a simple two-column split inside `.exb` (`.g3` or a 2-col grid) — inputs left, outcome card
right — but it is a **static confirmation**, not the tall Extend/Modify pane machinery.

---

## 4. Dialog anatomy

### 4a. Mark No-Show
```
┌ Mark No-Show · {guest} · {BK}            [badge: stay {cin}→{cout} expired]   ✕ Close ┐
│ {guest} · {source} · {type} · {n} nights · {a}A{c}C                                   │
│ ┌ What happens ─────────────┐   ┌ Financial outcome (MOCKED) ───────────────┐        │
│ │ • Room released for the   │   │ Prepaid / advance            ₹X            │        │
│ │   remaining nights        │   │ No-show charge (forfeited)   −₹Y          │        │
│ │ • Booking → today's       │   │   SGST · sample 2.5%          ₹Y/2        │        │
│ │   no-shows                │   │   CGST · sample 2.5%          ₹Y/2        │        │
│ │ • {source} informed (OTA) │   │ ─────────────────────────────            │        │
│ │ Audit note [_________]    │   │ Refund due                   ₹(X−Y)       │        │
│ └───────────────────────────┘   │ Refund as: (Guest) (Folio credit)·Ph-2    │        │
│                                  └───────────────────────────────────────────┘        │
│ hint: {non-OTA guard OR "Ready — {source} will be notified"}    [Back] [Confirm No-Show]│
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- Non-OTA: money block still shows; primary **disabled** with tooltip (BQ-385-04) and a
  `[Cancel booking instead]` button that switches to `:cancel`. (Existing behaviour retained.)

### 4b. Cancel Booking
```
┌ Cancel booking · {guest} · {BK}                                            ✕ Close ┐
│ {guest} · {source} · {type} · {cin}→{cout} · {n} nights                             │
│ ┌ Details ──────────────────┐   ┌ Refund position (MOCKED) ─────────────────┐      │
│ │ Reason * [config select ▾]│   │ Prepaid / advance            ₹X           │      │
│ │ Notify: (Source) (Guest)  │   │ Cancellation penalty         −₹Y          │      │
│ │ Audit note [___________]  │   │   SGST · sample 2.5%          ₹Y/2        │      │
│ │                           │   │   CGST · sample 2.5%          ₹Y/2        │      │
│ │                           │   │ ────────────────────────────             │      │
│ │                           │   │ Refund due                   ₹(X−Y)      │      │
│ │                           │   │ Refund as: (Guest) (Folio credit)·Ph-2   │      │
│ └───────────────────────────┘   └───────────────────────────────────────────┘      │
│ hint: Ready — refund {mode} (MOCKED)                          [Back] [Confirm cancel]│
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- Reason `*` required to enable Confirm. Default from config's first "common" reason.

---

## 5. Money-outcome logic (mock, display-only)

For a booking `o`:
- `prepaid` = advance/prepaid recorded (see §6 for how it's sourced).
- `penalty` = **sample backend-style forfeiture** (MOCKED). Proposed sample rule:
  - No-Show → retain **first night** of `o.amt` (rate × 1).
  - Cancel → depends on reason: "Guest request" retain first night; "Duplicate"/"Payment failed"
    → ₹0 (fully refundable); "No-show"/"Other" → first night. (Illustrative only — real value
    comes from backend.)
  - Penalty is capped at `prepaid` (can't forfeit more than paid).
- `sgst = cgst = round(penalty*0.025)` shown as **two separate lines** (invariant).
- `refundDue = max(0, prepaid − penalty)`.
- `refundMode` ∈ {guest, folio}, default `folio`, labelled **Phase-2 mock** (matches Modify v2.21).
- If `prepaid === 0` → single line "Nothing paid — no refund" (no penalty/tax rows).

All figures carry a **MOCKED** disclaimer line; nothing is persisted beyond the demo toast.

---

## 6. §6 OPEN DECISION — prepaid seeding (owner picks after this blueprint)

The demo `arr[]` currently has **no prepaid field** → every outcome is ₹0 ("nothing to refund"),
so the whole money block always looks empty.

- **Variant A (recommended):** seed `prepaid = o.amt` for **prepaid/OTA** bookings (`pah=false`)
  and `prepaid = 0` for pay-at-hotel (`pah=true`). Penalty uses the §5 sample rule. Result: prepaid
  bookings show a real *Prepaid → penalty → Refund* story; pay-at-hotel show "nothing to refund".
  Pure sample data, changes no real logic.
- **Variant B:** keep everything ₹0. Money block always reads "Nothing paid — no refund". The
  refund/penalty UI stays but is never exercised in the demo.

Implementation is identical either way; only the seed differs. Default assumption pending owner = A.

---

## 7. Config-driven cancel reasons (D-e)

Add a mock config array (treated like `NB_TYPES`/`NB_PLANS`, i.e. "from configuration / API"):
```
const CANCEL_REASONS = [
  {code:'guest_request', label:'Guest request'},
  {code:'no_show',       label:'No-show'},
  {code:'duplicate',     label:'Duplicate booking'},
  {code:'payment_failed',label:'Payment failed'},
  {code:'other',         label:'Other'},
];
```
Rendered into the Reason `<select>`; No-Show path passes `no_show` implicitly. Comment marks it as
config/API-sourced sample.

---

## 8. Interaction / state

- Reuse existing entry points unchanged: row `Cancel` button, kebab `Cancel booking` / `Mark
  No-Show`, expired-row default (`:noshow`), alert-bar no-show links.
- Light draft state (like EX/MOD) only for Cancel's reason/note/notify/refundMode and No-Show's
  note/refundMode; keyed by booking id; no cross-booking leakage.
- Confirm actions keep current `noshow(id)` / `cancelBk(id)` behaviour (remove from `arr`,
  bump `counters`, toast) — extend the toast to mention refund outcome, e.g.
  `Booking cancelled · {guest} · refund ₹3,000 to guest (MOCKED)`.

---

## 9. data-testids (new)

No-Show: `noshow-dialog`, `noshow-summary`, `noshow-note`, `noshow-outcome`,
`noshow-prepaid`, `noshow-penalty`, `noshow-sgst`, `noshow-cgst`, `noshow-refund-due`,
`noshow-refund-guest`, `noshow-refund-folio`, `noshow-back`, `noshow-confirm`,
`noshow-cancel-instead`, `noshow-demo-note`.
Cancel: `cancel-dialog`, `cancel-summary`, `cancel-reason`, `cancel-notify-source`,
`cancel-notify-guest`, `cancel-note`, `cancel-outcome`, `cancel-prepaid`, `cancel-penalty`,
`cancel-sgst`, `cancel-cgst`, `cancel-refund-due`, `cancel-refund-guest`, `cancel-refund-folio`,
`cancel-back`, `cancel-confirm`, `cancel-demo-note`.

---

## 10. Verification plan (after build)

Smoke screenshot at 1920×800, then testing_agent:
1. Expired-arrival row → No-Show dialog opens; OTA shows enabled Confirm + outcome; non-OTA shows
   disabled Confirm + "Cancel instead".
2. Kebab → Cancel opens; Reason required gates Confirm; reason from config list.
3. Money outcome: prepaid booking shows Prepaid → penalty (SGST+CGST separate) → Refund due;
   pay-at-hotel shows "nothing to refund".
4. Refund-mode toggle (guest/folio) updates hint + toast; Phase-2 mock label present.
5. Confirm removes booking, bumps Cancelled/No-shows counters, toast reflects refund.
6. No internal scrollbar; closed screens untouched (spot-check Checkout/Check-In/Booking still render).
7. Regression: re-verify Modify v2.21 arithmetic (₹0 delta unchanged, +collect, −refund).

---

## 11. Docs to update on approval/build

- `CR-385_DESIGN_DECISIONS.md` → **D40** (No-Show/Cancel confirmation pair, decisions D-a…D-f);
  update D38/D31 "next box" pointers; mark Room detail as the last remaining box.
- `PRD.md` → mark No-Show/Cancel built (v2.22), Room detail = remaining.
- Bump mockup version string to **v2.22** + freeze() metadata.
