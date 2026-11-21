# BUG-743 — Cancellation reports: cancellation note not shown / exported (both pages)

**Type:** BUG
**Registered:** 2026-11-21
**Area:** Reports / Analytics
**Priority:** P1 (agent-classified — see rationale)
**Risk:** LOW
**Client:** ALL
**Assignee:** Abhishek (frontend; not backend-blocked)
**Sprint:** nov_cr_batch
**Source:** Owner-reported (screenshots: `/reports-module/cancel-detail` + `/reports-module/cancellations`) + `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md` §4b + `handover/SESSION_HANDOVER_2026-11-21_INVESTIGATION_CR527_BUG680_CANCELNOTES.md` item #3.

---

## Scope (owner-confirmed 2026-11-21)
**IN scope (widened 2026-11-21 by owner) — all three cancellation reports:**
1. **Item Cancellation Detail** — `CancelDetailMockup.jsx` (`/reports-module/cancel-detail`)
2. **Cancellations** — `CancellationsMockup.jsx` (`/reports-module/cancellations`)
3. **Order Note Audit** — `OrderNotesMockup.jsx` (`/reports-module/order-notes`) — same root cause: filtered/rendered/exported `notes` only, so NOTES COVERAGE was stuck at 25% (only the one row whose kitchen `notes` was set). Now sources `cancel_item_note` (fallback `notes`).

**OUT of scope:** none.

## Symptom
Both cancellation reports fail to show the note staff entered at cancel time:
- **Item Cancellation Detail:** table has Order · Item · Stage · Loss · Reason · By · Timing&Risk — **no Note column at all**, and the Excel/PDF export omits it too.
- **Cancellations:** has a "REASON / NOTES" column, but it only shows the note for rows where the API `notes` field happens to be set (e.g. #000023). Rows with a real staff note in `cancel_item_note` (e.g. poki's #000021/#000022) show the reason only — **the note is missing**.

## Evidence
- Owner screenshots (both pages, macha, 21/11/2026, 4 rows).
- Backend contract VERIFIED LIVE (2026-11-21, preprod macha 69): `insights-cancellations` returns `stage`, `reason`, `notes` (kitchen — empty on ~100% of rows) and **`cancel_item_note`** (the actual note) on **every** row, for BOTH `scope=item` and `scope=order`. No `cancellation_note` key exists. Evidence: `evidence/CR527-BUG680-VERIFY-2026-11-21/cancel_insights_live.json`.
- Source: OWNER-REPORTED + AGENT-DISCOVERED. Confidence: CONFIRMED.

## Root cause (FE-only, per page)
- **CancellationsMockup.jsx** — transform L282 maps `notes: i.notes || ''` (subset map, **never** carries `cancel_item_note`); render L997–1000 shows `r.notes`. Because the API `notes` field is empty, real notes never appear. Fix: carry `cancelItemNote: i.cancel_item_note` and render `cancelItemNote || notes`.
- **CancelDetailMockup.jsx** — row spreads `...i` (L80) so `cancel_item_note` **is present on every row**, but the table (L152–169) and `buildExportPayload` (L103–109) render **no note column**. Fix: add a Note column (table + export) reading `item.cancel_item_note` (fallback `notes`).
No backend work required — the field is already delivered.

## Duplicate check — DISTINCT (related cluster)
- **RELATED / partially reverses BUG-708:** BUG-708 *removed* a dead staff "Cancel Note" column from `CancellationsMockup.jsx` on the assumption `cancel_item_note` was empty (65/65). The 2026-11-21 live probe shows it is now **populated** for both scopes, so the note should be surfaced (read `cancel_item_note`), not dropped.
- **RELATED (capture side):** BUG-670 / BUG-674 added the note *input* to the item/order cancel dialogs; this item is about *displaying/exporting* that captured note.
- **EXCLUDED (owner):** `OrderNotesMockup.jsx` (Order Note Audit) — separate report, not in scope.
- Not a duplicate of BUG-579 (₹ values) or CR-554/555/556/BUG-713/715/717/718 (punch time/duration/risk/filters/format on the same screens).

## Priority rationale
P1: the cancellation reports exist to surface *why* items were cancelled, including the staff note; the captured note is missing with **no workaround**. Not P0 (no money error, no crash). Owner may override to P2 if treated as display-polish.

## Blast radius
- SMALL — **2 files**: `CancelDetailMockup.jsx` (add Note column to table + export) and `CancellationsMockup.jsx` (map `cancel_item_note`, render it in the existing REASON/NOTES column; add to export if missing).
- Hotspot files touched: NO.

## Proposed fix (for PLANNING — not implemented here)
Read the note from **`cancel_item_note`** (fallback `notes`), rendered "—" when empty, on BOTH pages — a new Note column on Item Cancellation Detail (table + export), and corrected field mapping in the existing REASON/NOTES column on Cancellations (+ export). Verify for both item-scope and order-scope rows.

## Open questions (owner)
1. ~~Scope~~ — RESOLVED: the two cancellation pages only; Order Note Audit excluded.
2. Column label on Item Cancellation Detail — "Note"? (reads `cancel_item_note`). Backend caveat: `cancel_item_note` doubles as the order-level note; a future backend rename/split is cleaner (non-blocking).

## Next
Planning Gate 2 (Impact Analysis). `testing_agent` MANDATORY after fix (owner standing rule): create 1 item-level + 1 order-level cancellation each WITH a note; verify the note shows on screen + export on BOTH pages.
