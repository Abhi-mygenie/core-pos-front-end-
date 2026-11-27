# Investigation — every cancellation report must show Stage + Reason + Note (item AND order)

**Role:** INVESTIGATION (Role 6) — read-only, NO application code changed
**Date:** 2026-11-21
**Cluster:** BUG-708 (reopened) · CR-493 / BUG-670 / BUG-674 · follows `handover/HANDOVER_CANCELLATION_REPORT_NOTES_2026-11-21.md`
**Confidence:** HIGH (live preprod probe + FE code-traced)
**Account:** pms@macha.com / Qplazm@10 (Owner) · date 2026-11-21

---

## 1. Owner requirement
Every cancellation report row must carry **3 facts**: (1) cancellation **stage**, (2) cancellation **reason**, (3) cancellation **note** — for **both** item-level and order-level cancellations.

## 2. Live backend truth — `POST /api/v2/vendoremployee/report/insights-cancellations` (from_date=to_date=2026-11-21)
`data.items` = 3 rows. Each row carries **all three facts for both scopes**:

| scope | stage | cancel_type | reason | notes | cancel_item_note |
|---|---|---|---|---|---|
| order (#000021) | Before Cooking | Pre-Cooking | guest left | `""` | **"item level notes 2"** |
| item (#000021) | Before Cooking | Pre-Cooking | item got didn't get bailed out from kitchen | `""` | **"item level notes"** |
| order (#000022) | Before Cooking | Pre-Cooking | guest left | `""` | **"order cancel"** |

**Decisive facts:**
- `stage` and `reason` are populated on every row (both scopes). ✅
- The **note is delivered in `cancel_item_note` for BOTH item AND order scope** (order rows too). The separate `notes` field is the kitchen/food note and is empty here.
- There is **no** `cancellation_note` / `cancel_reason_text` key in this payload. → **This answers the handover §4 open question: the order-level note arrives in `cancel_item_note`, not a distinct key** (for this endpoint/shape).
- Evidence saved: `/app/memory/evidence/CANCEL-NOTES/cancellations_2026-11-21.json`.

> Contract caveat to raise with backend (non-blocking): the field name `cancel_item_note` is misleading because it also carries the **order**-level note. A future rename/split (`cancel_item_note` vs `cancel_order_note`) would be cleaner, but today one field serves both — the FE can consume it now.

## 3. Where the FE drops the note (3 consumers of `fetchInsightsCancellations().items[]`)

### a) `pages/reports-module/CancellationsMockup.jsx` — the screen in the owner's screenshot
- **Map L282:** `notes: i.notes || ''` — maps **only** `i.notes` (always `""`). `cancel_item_note` is **never mapped**.
- **Render L994-1002 ("Reason / Notes" cell):** shows `r.reason` + `r.notes`; since `notes` is empty, **no note ever appears** — matches screenshot (only "guest left" / reason shown).
- Stage ✅ (map L278 → render L1005). Reason ✅ (L281 → L996). **Note ❌ (both scopes).**
- L969 comment confirms BUG-708 removed the dedicated "Cancel Note" column on the false "field empty" premise.

### b) `pages/reports-module/CancelDetailMockup.jsx` — Item Cancellation Detail
- **Map L79-83:** spreads `...i`, so `cancel_item_note` IS present in data.
- **Table L152-169:** columns = Order, Item, Stage(165), Loss, Reason(167), By, Timing. **No column renders the note.**
- Stage ✅, Reason ✅, **Note ❌.**

### c) `pages/reports-module/OrderNotesMockup.jsx` — Order Note Audit
- **Filter L73:** `allItems.filter(i => i.notes && i.notes.trim())` — filters on `notes` only. Because real notes live in `cancel_item_note` and `notes` is `""`, **every row is excluded → report shows "No items with notes"** even when notes exist.
- **Render L130:** shows `item.notes` only. No stage column. Subtitle hard-codes "food-level notes".
- Stage ❌ (no column), Reason ✅ (L131), **Note ❌ (wrong field + rows filtered out).**

## 4. Root cause
`FE_MAPPING_GAP` (not backend). Backend fulfils the contract and returns stage + reason + note (via `cancel_item_note`) for both scopes. All three report screens read the wrong/absent field for the note; BUG-708 also deleted the display column. Net: the owner sees Stage + Reason but never the Note.

## 5. Recommended fix scope (PLANNING — NOT built here)
1. **CancellationsMockup:** add `cancelItemNote: i.cancel_item_note || ''` to the row map; render it as a distinct note line (below reason) in the Reason/Notes cell for **both** scopes (restore the removed Note display). Keep `notes` (kitchen) as a separate line if present.
2. **CancelDetailMockup:** add a Note column surfacing `cancel_item_note` (+ `notes` when present).
3. **OrderNotesMockup:** include rows where `notes?.trim() || cancel_item_note?.trim()`; render both with a source label; add a Stage column so all 3 facts show; fix the "food-level notes" subtitle.
4. **Exports:** `buildExportPayload` in each page must include the note column(s).
5. Empty-note rows render `—`; rows with only kitchen `notes` still render (no regression).

## 6. Risk / routing
- **Risk:** MEDIUM (report display only; financial loss figures untouched). Area: Reports / Cancellations.
- **Next:** PLANNING Gate 2 → then IMPLEMENTATION. **`testing_agent` is MANDATORY before declaring fixed** (owner standing rule): create 1 item-level + 1 order-level cancellation each WITH a note and verify all three screens + export show Stage + Reason + Note.

## 7. Evidence
- Live JSON: `/app/memory/evidence/CANCEL-NOTES/cancellations_2026-11-21.json`
- Code: `CancellationsMockup.jsx:282,994-1002,969`; `CancelDetailMockup.jsx:79-83,152-169`; `OrderNotesMockup.jsx:73,130`.
