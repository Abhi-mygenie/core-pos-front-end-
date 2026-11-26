# Investigation — `cancel_item_note` not showing in UI + CR-493 "note-mandatory always off"

**Date:** 2026-11-20 · **Role:** Investigation · **Account probed:** owner@cafe103.com (preprod) · **Confidence:** HIGH (live-probed + code-traced + corroborates prior IAs)
**Relates to:** BUG-708, BUG-670, BUG-674, BUG-682, CR-493 B5.

## Symptom 1 — CR-493 "cancel note mandatory" silently always OFF
**Verdict: NOT a current bug on cafe103 — the old always-off bug is already fixed; cafe103's setting is genuinely "No".**
- Live `GET /api/v1/vendoremployee/profile` → `restaurants[0].settings.cancel_note_mandatory = "No"` (NOT at `restaurants[0]` top-level; NOT "Yes").
- Code `profileTransform.js:231` now reads `api.settings?.cancel_note_mandatory === 'Yes'` INTO `restaurant.cancellation` — this is the **BUG-682 fix** of the 2026-11-17 "field in `settings` not `cancellation`" bug. `RestaurantContext` reads `cancellation.cancelNoteMandatory` → correct.
- So for cafe103 the modals correctly show "Notes (Optional)". To see the mandatory `*` enforced you need an account whose profile returns `settings.cancel_note_mandatory = "Yes"`.
- ⚠️ **One real inconsistency to flag (not the OrderEntry path):** the Settings page transform `restaurantSettingsTransform.js:108` reads `toBool(advanced.cancel_note_mandatory)` — a **different object (`advanced`)** than profile's `settings.cancel_note_mandatory`. If the settings-list/save uses `advanced` but profile uses `settings`, the toggle shown/saved on the Settings page can disagree with what OrderEntry enforces. Needs a quick check of the settings-list response shape vs the contract (contract says settings-list returns `cancel_note_mandatory` top-level, not under `advanced`).

## Symptom 2 — cancel item notes (`cancel_item_note`) not coming in UI  ← the real issue (= BUG-708)
**Verdict: confirmed break, TWO gaps (primary backend, secondary FE), and an owner product-question — already tracked as BUG-708 (IA OPEN, awaiting owner).**

Data-flow trace of `cancel_item_note`:
1. **WRITE (FE, correct):** `CancelFoodModal`/`CancelOrderModal` → `OrderEntry.jsx:1584 cancelItemNote: note` → `orderTransform.js:1025 cancel_item_note: options.cancelItemNote || ''` on `PUT cancel-food-item`. Contract `BATCH-A_BUG-670/674` = key is `cancel_item_note`. ✅
2. **STORE/RETURN (BACKEND — PRIMARY GAP):** prior live probe (`impact/BATCH_2026_11_19_*`) found `cancel_item_note` is **EMPTY in all 65 cancelled rows**; `cancel_reason_text` / `cancel_note` are never returned; only `notes` (= `food_level_notes`, the *kitchen* note) has content. So the backend is **not persisting/returning the staff cancel note** despite the BUG-670/674 contract (`insights-cancellations items[].cancel_item_note`, `cancel-order-list`, `daily-order-report-details-combined`). → there is no data to display.
3. **READ/DISPLAY (FE — SECONDARY GAP):** `CancellationsMockup.jsx:281-282` maps `notes: i.notes` but **never maps `cancelNote`** from the API row, while the staff-note column renders `r.cancelNote` → always "—". `insightsService.js:313` does read `line.cancel_item_note` (correct key) but it's empty from the backend; its `notes` (line 305) reads `cancel_reason_text` which is also never returned.

**Where the gap is (one line answer):** FE sends `cancel_item_note` correctly, but **the backend never stores/returns it** (empty everywhere), AND the Cancellation Report never maps `cancelNote` from the row — so the column is always "—".

## Recommendations (no code changed — blocked)
1. **Owner decision (BUG-708 OPEN):** should the "staff cancel note" column show something different from the working "Notes" column? If same → point it at `notes` (1-line FE fix). If distinct staff note → requires the backend to populate `cancel_item_note`.
2. **Backend brief:** confirm/fix persistence + return of `cancel_item_note` on `cancel-food-item`, surfaced in `insights-cancellations` / `cancel-order-list` / `daily-order-report-details-combined` (per BUG-670/674 contract).
3. **FE (after #1/#2):** map `cancelNote: i.cancel_item_note` in `CancellationsMockup.jsx:281-282` and render it. Trivial, but pointless until the backend returns data — cannot be QA-verified today (field empty), which is why no fix/testing_agent run this turn.
4. **Symptom-1 side-check:** reconcile `restaurantSettingsTransform.js:108` (`advanced.cancel_note_mandatory`) vs profile `settings.cancel_note_mandatory` against the settings-list contract.

## Evidence
- Live profile (cafe103): `settings.cancel_note_mandatory = "No"`; running-order lines expose only `food_level_notes` + `cancel_at` (no `cancel_item_note`).
- Corroborates: `impact/BATCH_2026_11_19_IMPACT_ANALYSIS.md` (BUG-708), `impact/BUG-670_IMPACT_ANALYSIS.md`, `change_requests/BUG-682_*`, contracts `BATCH-A_BUG-670/674_API_CONTRACT`.

---

## RE-VALIDATION 2026-11-21 (owner-provided network evidence)

**Prior conclusion REVERSED.** Owner supplied the live `insights-cancellations` Response tab. For an item-level cancellation the endpoint **DOES** return the staff note:

```
"scope": "item",
"reason": "After serving",
"notes": "",                                        ← food/kitchen level note (empty)
"cancel_item_note": "this is item level cancellation", ← staff cancellation note (HAS CONTENT)
"cancel_type": "Pre-Cooking", "cancelled_by": "dobby", "station": "BAR", ...
```

So `notes` and `cancel_item_note` are **two distinct fields**. Backend is fulfilling the contract. The failure is **100% frontend** — the field is fetched but never mapped/rendered.

### Three FE drop points (all consume `fetchInsightsCancellations().items[]`)

1. **CancellationsMockup.jsx** (main Cancellations report)
   - Row map (`cancelledItems`, ~L261-296) maps `notes: i.notes` but **never maps `cancel_item_note`**.
   - "Reason / Notes" cell (~L997) renders `r.notes` only → item-level rows (`notes:""`) show nothing.
   - **Regression source = BUG-708**: comments at L969 & L994 say "BUG-708: dead Cancel Note column removed" — the column was deleted on the WRONG premise that backend returned it empty. Screenshot disproves that premise.

2. **CancelDetailMockup.jsx** (Item Cancellation Detail)
   - Spreads raw `...i` so `cancel_item_note` is present in data, but the table has **no column** for it.

3. **OrderNotesMockup.jsx** (Order Note Audit)
   - Filters `allItems.filter(i => i.notes && i.notes.trim())` → item-level cancellations whose only note is in `cancel_item_note` are **excluded entirely**.

### Fix (frontend-only, now verifiable since backend returns data)
- CancellationsMockup: add `cancelItemNote: i.cancel_item_note || ''` to row map; render it in the Reason/Notes cell (restore the BUG-708-removed note, as a distinct staff-note line).
- CancelDetailMockup: surface `cancel_item_note` (column or under Reason).
- OrderNotesMockup: include rows where `cancel_item_note` has content (`i.notes || i.cancel_item_note`), add note-source awareness.

### CR-493 note-mandatory toggle
Unchanged from original: cafe103 backend returns `settings.cancel_note_mandatory = "No"`, so OFF is correct behaviour. One latent inconsistency flagged: Settings page transform reads `advanced.cancel_note_mandatory` while profile/OrderEntry read `settings.cancel_note_mandatory` — verify they point at the same stored value if owner expects the Settings toggle to drive enforcement.

