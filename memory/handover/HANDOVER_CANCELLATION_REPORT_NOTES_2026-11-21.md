# HANDOVER — Cancellation Reports: verify ORDER-level & ITEM-level notes both surface
**Date:** 2026-11-21 · **Scope:** Cancellation report family only · **Role for next agent:** INVESTIGATION → (gated) IMPLEMENTATION
**Cluster:** BUG-708 (reopened) · CR-493 / BUG-670 / BUG-674 · **Linked investigation:** `memory/investigations/INV_CANCEL_ITEM_NOTE_AND_NOTE_MANDATORY_2026-11-20.md`

---

## 1. One-line mission
Confirm that **BOTH** the order-level cancellation note **and** the item-level cancellation note (`cancel_item_note`) actually reach the UI in every cancellation report. Where a note is dropped, fix the FE mapping/render. If a note is missing from the API, raise a backend brief — do **not** invent a FE fallback.

---

## 2. What is already PROVEN (do not re-litigate)
- The endpoint `GET /api/v2/vendoremployee/report/insights-cancellations` **DOES return `cancel_item_note`** for item-level cancellations. Owner network capture (2026-11-21):
  ```
  "scope":"item", "reason":"After serving",
  "notes":"",                                          ← food/kitchen note (separate field, empty here)
  "cancel_item_note":"this is item level cancellation", ← STAFF cancel note (has content)
  "cancel_type":"Pre-Cooking","cancelled_by":"dobby","station":"BAR"
  ```
- `notes` and `cancel_item_note` are **two distinct fields**. Backend is fulfilling the contract.
- Earlier "backend returns empty" conclusion was WRONG and is retracted.

## 3. Root cause of the visible bug (FE only) — BUG-708 reopened
BUG-708 deleted the "Cancel Note" column on the false premise the field was empty. It is not. Three consumers of `fetchInsightsCancellations().items[]`:

| File | Gap | Evidence |
|---|---|---|
| `pages/reports-module/CancellationsMockup.jsx` | Row map (`cancelledItems` ~L261-296) maps `notes: i.notes` but **never maps `cancel_item_note`**. Cell (~L997) renders `r.notes` only → item-level rows (`notes:""`) show blank. | Comments L969/L994: "BUG-708: dead Cancel Note column removed" |
| `pages/reports-module/CancelDetailMockup.jsx` | Spreads raw `...i` (L79-83) so `cancel_item_note` is in data, but the table (L152-170) has **no column** for it. | — |
| `pages/reports-module/OrderNotesMockup.jsx` | `analytics` (L73) filters `i => i.notes && i.notes.trim()` → item-level cancellations whose note is only in `cancel_item_note` are **excluded entirely**. | — |

## 4. OPEN QUESTION the next agent MUST close (ORDER-level note)
The owner capture proved the ITEM path. The **ORDER-level** note path is NOT yet proven end-to-end. Verify with a real order-level cancellation (not item-level):

1. **FE write side (known):** `OrderEntry.jsx:1607 handleCancelOrder(reason, note)` → `orderTransform cancelOrder(...)` wires `reasonNote` into the cancel payload (`OrderEntry.jsx:1614`, BUG-674 E7). Order reason maps to `cancellation_reason` (`orderTransform.js:1047`).
2. **Contract (CR-493 BA-23, `contracts/BATCH-A_CR-493_API_CONTRACT_2026_11_15.md`):** order object carries `cancellation_note` (string) and `cancellation_reason`; auto-cancel sets `cancellation_note=""` and `cancel_source` ∈ `manual|auto_last_item|merge`.
3. **PROBE TO RUN:** cancel a full order WITH a note, then `GET insights-cancellations` for that date and inspect an order-scope record (`scope:"order"`). Capture the exact field holding the order note — candidates: `cancellation_note`, `cancel_reason_text`, `notes`. Record the real key.
4. **Then check the FE map:** `CancellationsMockup` row map currently has **no** `cancellation_note` mapping either → order-level notes almost certainly also blank. Confirm against the real field name from step 3.

> NOTE: there is a SECOND parser — `api/services/insightsService.js` (~L302-318) — that reads `line.cancel_reason_text` / `line.cancel_item_note` from a DIFFERENT (order-details) endpoint used by other report screens. Do not confuse it with the `insights-cancellations` items[] shape. Trace per screen which fetch feeds it.

## 5. Proposed fix (apply ONLY after gate GO + probes confirm real field names)
- `CancellationsMockup.jsx`: add to row map `cancelItemNote: i.cancel_item_note || ''` and `orderCancelNote: i.cancellation_note || i.cancel_reason_text || ''` (use the real key from §4.3). Render in "Reason / Notes" cell as a distinct staff-note line below `r.notes`.
- `CancelDetailMockup.jsx`: surface `cancel_item_note` (new column or under Reason).
- `OrderNotesMockup.jsx`: include rows where EITHER note has content: `i.notes?.trim() || i.cancel_item_note?.trim() || i.cancellation_note?.trim()`; label each row with its note source. Update its subtitle (currently "food-level notes" only).
- Export payloads (`buildExportPayload` in each page) must include the note columns too.

## 6. Acceptance criteria (MUST test via testing_agent before claiming fixed)
- [ ] Create 1 ITEM-level cancellation WITH a note + 1 ORDER-level cancellation WITH a note (test restaurant).
- [ ] Cancellations report: both rows show their note (item note on item row, order note on order row).
- [ ] Item Cancellation Detail: item note visible.
- [ ] Order Note Audit: both appear (not just food-level `notes`).
- [ ] Excel/PDF export includes the notes.
- [ ] No regression: rows with only `notes` (kitchen) still render; empty-note rows show "—".
- testing_agent is MANDATORY after any fix (owner standing rule). Do not declare fixed on code-read/curl alone.

## 7. CR-493 note-mandatory toggle (separate, NOT a live bug)
cafe103 backend returns `settings.cancel_note_mandatory="No"` → OFF is correct. BUG-682 already fixed the old wrong-object read (`profileTransform.js:231` reads `api.settings?.cancel_note_mandatory`). ONE latent inconsistency to verify: Settings page transform reads `advanced.cancel_note_mandatory` (`restaurantSettingsTransform.js:108`) while profile/OrderEntry read `settings.cancel_note_mandatory` — confirm the Settings toggle writes/reads the same stored value the enforcement path consumes. To SEE the mandatory `*`, test with an account whose profile returns `"Yes"`.

## 8. Test accounts / data
- Item-note evidence captured on an owner account (ask owner for a test login for the restaurant that produced the capture; `cancelled_by:"dobby"`, order #000410, station BAR).
- Use `memory/test_credentials.md` for current test logins.

## 9. Key files (fast index)
- `frontend/src/api/services/insightsService.js` — `fetchInsightsCancellations`, cache key L625; order-details parser L302-318.
- `frontend/src/api/constants.js:149` — `INSIGHTS_CANCELLATIONS` route.
- `frontend/src/pages/reports-module/CancellationsMockup.jsx` — map L259-297, render L965-1016, scope tabs/filters L437-450.
- `frontend/src/pages/reports-module/CancelDetailMockup.jsx` — table L152-181.
- `frontend/src/pages/reports-module/OrderNotesMockup.jsx` — filter L70-75, render L119-137.
- `frontend/src/components/order-entry/OrderEntry.jsx` — `handleCancelFood` L1575, `handleCancelOrder` L1607.
- `frontend/src/api/transforms/orderTransform.js` — item note L1025, order reason L1047.
- Contracts: `BATCH-A_CR-493_API_CONTRACT_2026_11_15.md`, `BATCH-A_BUG-674_API_CONTRACT_2026_11_15.md`, `BATCH-A_BUG-670_API_CONTRACT_2026_11_15.md`.
