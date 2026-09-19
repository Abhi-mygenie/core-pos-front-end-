# CR-385 — New Booking design review · First-iteration blueprint (PROPOSAL, v2.17)

Status: **PROPOSAL — awaiting owner approval to build.** Owner authorized starting the Booking
review (2026-06, "yes, we can start looking at the booking part") and chose written blueprint
first (ask_human Q5=b). This is design-only; nothing built yet. Gate 2.6 remains OPEN. Checkout
v2.9 and Check-In v2.16 stay LOCKED/untouched. Multi-room stays ON HOLD (§K1).

## Owner choices captured (ask_human, 2026-06)
- Q1=a — mirror the locked language (LEFT inputs → RIGHT live bill + pinned Save); wants UX-first
  guidance on which fields go where.
- Q2 — advance IS possible at booking; **Phase 2** will add "send payment link → auto-update on
  paid". Most bookings have no advance, so the **advance section is COLLAPSED by default**.
- Q3=a — keep BOTH `Save booking` (→ Arrivals) and `Save & Check in now` (→ morphs into Check-In).
- Q4=a — include the optional **B2B (GST)** capture (name + GSTIN), same as Check-In D33.
- Q5=b — deliver written blueprint first; build only after approval.

## Layout (mirrors Checkout D14 / Check-In D29 — LEFT details, RIGHT final figures + pinned action)
Expand-in-place card. Header: `New Booking · [source badge] · <room context> · ✕ Cancel`.
Body = 2 columns, LEFT 55 / RIGHT 45. LEFT scrolls; RIGHT short & pinned (no internal scroll while
advance is collapsed).

### LEFT column (inputs, scrolls) — ordered for fastest data entry
1. **GUEST** — Row1: Name * | Phone * (10-digit, live CRM lookup → green `✓ Returning guest ·
   last stayed …` line, pre-fills name/email editable). Row2: Email | Adults * / Children.
2. **STAY** — Row1: Check-in * | Check-out * (nights auto in sub-label). Meal plan = checkout-style
   pills (Room only / CP / MAP / AP; white + dark-ring selected, no black fill). Notes full-width.
3. **ROOM** — Type pills (Deluxe / Executive / Suite) → compact searchable eligible-room dropdown
   (reuse Check-In D18 picker): filtered by type + dates, reserved/HK greyed, OOO as a count, rate
   hint inline. No tile wall.
4. **BILLING** — optional `☐ B2B (GST) billing`; tick reveals required GST customer name + GSTIN,
   flips RIGHT "Bill to" to Company (GST). Exact D33 behaviour.

### RIGHT column (figures + action, short/pinned)
- Room charge (nights × rate) → **SGST + CGST kept separate** → **Total (incl GST)**.
- **Advance — COLLAPSED by default** (`▸ + Add advance payment (optional)`). Expanded: Collect-now
  amount + Cash/Card/UPI pills + Txn/UTR (same as Check-In advance) + disabled `Send payment link —
  Phase 2` placeholder (future auto-update-on-paid home).
- **Balance** = Total − advance.
- **Readiness strip**: Guest ✓ · Dates ✓ · Room ✓ [· GST ✓ when B2B] → green **"Ready to book"**
  pill when complete (same cue as Check-In badge D30).
- Pinned actions: `[Cancel] [Save booking] [Save & Check in now]`. Save → Arrivals (Today) + toast;
  Save & Check in now → morphs into Check-In v2.16 with this booking prefilled.

## Entry points (unchanged from baseline F10)
- Header `+ New Booking` → opens at top of the current tab (any room).
- Available-room tile `Book Room` → opens under the tile, room + type preselected.

## Guardrails
- Everything MOCKED (rates/GST/CRM/availability sample). No `src/`, backend, .env, registry edits.
- Checkout v2.9 + Check-In v2.16 renderer/CSS/submission untouched.
- Multi-room booking-wide split stays parked (§K1/K2).
- Advance collapsed keeps RIGHT scroll-free; re-verify RIGHT containment when advance is expanded.

## Next
On owner approval → build as mockup v2.17 (replace old placeholder `nbForm()` with this
Check-In-consistent two-column form), then verify (entry points, CRM lookup, room picker,
GST gating, advance expand containment, both save actions, checkout/check-in regression).
