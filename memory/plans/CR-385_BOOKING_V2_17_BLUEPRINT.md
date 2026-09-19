# CR-385 — New Booking design review · First-iteration blueprint (PROPOSAL, v2.17)

Status: **BUILT + agent-verified (v2.17, iteration_13) — awaiting owner review/feedback.** Owner authorized starting the Booking review (2026-06). Blueprint below was approved and implemented. Design-only; Gate 2.6 OPEN. Checkout v2.9 and Check-In v2.16 stay LOCKED/untouched. Multi-room ON HOLD (§K1).

## Owner choices & clarifications captured (ask_human + follow-up, 2026-06)
- Mirror the locked language: LEFT inputs → RIGHT live bill + pinned Save (Q1=a).
- **Room is NOT chosen at booking — only the room TYPE is booked from inventory.** The specific
  room number is assigned later, at Check-In. (Owner: "Room is not chosen in the booking part …
  only the type of room which is booked from the inventory.")
- **Documents/IDs are NOT captured at booking** — they belong to Check-In (per-guest ID cards,
  already in v2.16). Booking captures guest + stay + room type + optional advance + B2B GST only.
- Advance IS possible at booking; **Phase 2** adds "send payment link → auto-update on paid". Most
  bookings have no advance, so the **advance section is COLLAPSED by default**.
- Keep BOTH `Save booking` (→ Arrivals) and `Save & Check in now` (→ morphs into Check-In) (Q3=a).
- Include the optional **B2B (GST)** capture (name + GSTIN), same as Check-In D33 (Q4=a).
- **Meal plan = pills, API-driven** (owner: "we have from API"). **Room type = pills, API-driven**
  (owner: "will be from API"). Mockup renders both from a sample config as if returned by the API.

## Layout (mirrors Checkout D14 / Check-In D29 — LEFT details, RIGHT final figures + pinned action)
Expand-in-place card. Header: `New Booking · [source badge] · <type context> · ✕ Cancel`.
Body = 2 columns, LEFT 55 / RIGHT 45. LEFT scrolls; RIGHT short & pinned (no internal scroll while
advance is collapsed).

### LEFT column (inputs, scrolls) — ordered for fastest data entry
1. **GUEST** — Row1: Name * | Phone * (10-digit, live CRM lookup → green `✓ Returning guest ·
   last stayed …` line, pre-fills name/email editable). Row2: Email | Adults * / Children.
2. **STAY** — Row1: Check-in * | Check-out * (nights auto in sub-label). Meal plan = checkout-style
   pills **driven by the API** (mockup uses a sample plan set); notes full-width.
3. **ROOM TYPE** — Type pills **driven by the API** (mockup uses a sample set e.g. Deluxe /
   Executive / Suite) + rooms count (e.g. "1 room"). Shows **type-level availability for the dates**
   ("6 of this type free · 2 OOO"), NOT a specific-room picker. Rate hint per night by type.
   Specific room number is assigned at Check-In.
4. **BILLING** — optional `☐ B2B (GST) billing`; tick reveals required GST customer name + GSTIN,
   flips RIGHT "Bill to" to Company (GST). Exact D33 behaviour.

### RIGHT column (figures + action, short/pinned)
- Room charge (nights × type rate) → **SGST + CGST kept separate** → **Total (incl GST)**.
- **Advance — COLLAPSED by default** (`▸ + Add advance payment (optional)`). Expanded: Collect-now
  amount + Cash/Card/UPI pills + Txn/UTR (same as Check-In advance) + disabled `Send payment link —
  Phase 2` placeholder (future auto-update-on-paid home).
- **Balance** = Total − advance.
- **Readiness strip**: Guest ✓ · Dates ✓ · Type ✓ [· GST ✓ when B2B] → green **"Ready to book"**
  pill when complete (same cue as Check-In badge D30).
- Pinned actions: `[Cancel] [Save booking] [Save & Check in now]`. Save → Arrivals (Today) + toast;
  Save & Check in now → morphs into Check-In v2.16 (where room number + documents are handled).

## Booking vs Check-In split (kept non-redundant)
- **Booking:** who + when + what type + how much (+ optional advance / GST invoice fields).
- **Check-In:** specific room assignment + upgrade + per-guest documents/IDs + advance/balance
  collection. No document capture or room-number picker duplicated on Booking.

## Entry points (F10, adjusted for type-only)
- Header `+ New Booking` → opens at top of the current tab.
- Available-room tile `Book Room` → opens with that room's **type** preselected (room number still
  assigned at Check-In; the tile just seeds the type).

## Guardrails
- Everything MOCKED (rates/GST/CRM/type-availability sample). No `src/`, backend, .env, registry.
- Checkout v2.9 + Check-In v2.16 renderer/CSS/submission untouched. Multi-room split parked (K1/K2).
- Advance collapsed keeps RIGHT scroll-free; re-verify RIGHT containment when advance is expanded.

## Next
On owner approval → build as mockup v2.17 (replace old placeholder `nbForm()` with this
Check-In-consistent two-column, type-only form), then verify (entry points, CRM lookup, type +
availability, GST gating, advance expand containment, both save actions, checkout/check-in
regression).

---

## v2.18 revision — owner feedback after reviewing v2.17 (2026-06)
Owner reviewed the built v2.17 and gave three changes. v2.17 was correct in structure; v2.18 refines
the plan/room selection to match how a guest actually shops, relocates B2B, and wires advance through.

### R1 — Room × Rate-plan GRID (owner chose Option B; "Executive with all plans together")
Replace the two separate selectors (meal-plan pills + room-type pills) with ONE compact matrix so
the guest can compare every combination the way they ask for it ("Executive how much? … with two
meals how much?").
- **Rows = room types, Columns = rate plans; each cell = ALL-IN price per night** (room base + meal
  supplement) for that type×plan. Selecting a cell sets BOTH type and plan at once.
- Read across a row = one type with all plans; read down a column = all types on one plan.
- Selected cell = checkout-style dark ring. Type row label shows **N free**; a 0-free type row is
  greyed/disabled. OOO count in a footer line.
- **Right bill still itemises Room vs Meal-plan** (+ SGST/CGST separate → total) so the split stays
  transparent even though the pick is a single cell.
- Section renamed "Room & rate plan" and moved to sit where type/plan were. It replaces the old
  D34 "meal-plan pills above room-type pills" ordering.
- Responsive: desktop/1024 fits; narrow mobile = horizontally scrollable grid (or fallback to
  type-first → plan pills) so nothing clips.

### R2 — B2B (GST) into the Guest block
Move the B2B (GST) tick out of the bottom Billing section into the **Guest block, directly under
name/phone** (email + occupancy above it). Ticking reveals GST customer name + GSTIN inline. Remove
the separate bottom Billing section.

### R3 — Carry booking advance into Check-In
Store the exact advance collected at Booking on the reservation and show it as "already paid /
prepaid" in Check-In's bill so the balance reconciles. This is the ONLY Check-In change (a
pass-through of the booking advance); the rest of Check-In v2.16 stays locked.

Status: v2.18 blueprint — awaiting owner approval to build (owner asked for blueprint first).

