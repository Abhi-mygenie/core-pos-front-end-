# BUG-743 — Item Cancellation Detail: cancellation note not shown or exported

**Type:** BUG
**Registered:** 2026-11-21
**Area:** Reports / Analytics
**Priority:** P1 (agent-classified — see rationale)
**Risk:** LOW
**Client:** ALL
**Assignee:** Abhishek (frontend; not backend-blocked)
**Sprint:** nov_cr_batch
**Source:** Owner-reported (screenshot, `/reports-module/cancel-detail`) + `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md` §4b + `handover/SESSION_HANDOVER_2026-11-21_INVESTIGATION_CR527_BUG680_CANCELNOTES.md` item #3.

---

## Symptom
On **Item Cancellation Detail** (`/reports-module/cancel-detail`, `CancelDetailMockup.jsx`) the per-item table shows Order · Item · Stage · Loss · Reason · By · Timing&Risk, but **no Note column**. The cancellation note that staff entered at cancel time is therefore invisible here, and the Excel/PDF export also omits it. Owner screenshot (4 lines, macha) confirms no note anywhere on the page.

## Evidence
- Screenshot: owner-provided (Item Cancellation Detail, FROM/TO 21/11/2026, 4 rows).
- Backend contract VERIFIED LIVE (2026-11-21, preprod macha 69): `POST /api/v2/vendoremployee/report/insights-cancellations` returns `stage`, `reason`, `notes` (kitchen, empty 100%) and **`cancel_item_note`** (the actual note) on **every** row, for BOTH `scope=item` and `scope=order`. No `cancellation_note` key exists. Evidence: `evidence/CR527-BUG680-VERIFY-2026-11-21/cancel_insights_live.json`.
- Source: AGENT-DISCOVERED + OWNER-REPORTED. Confidence: CONFIRMED.

## Root cause (FE-only)
`CancelDetailMockup.jsx` maps each row with `...i` (L80) so `cancel_item_note` **is present on every row object**, but:
- the table (headers L152–160, cells L163–169) renders **no note column**, and
- `buildExportPayload` columns (L103–109) include no note column.
No backend work required — the field is already delivered.

## Duplicate check — DISTINCT (related cluster)
- **RELATED / partially reverses BUG-708:** BUG-708 *removed* a dead staff "Cancel Note" column from `CancellationsMockup.jsx` on the assumption `cancel_item_note` was empty (65/65). The 2026-11-21 live probe shows it is now **populated** for both scopes, so the note should be surfaced (read `cancel_item_note`), not dropped. This intake covers the **Item Cancellation Detail** page specifically.
- **RELATED (capture side):** BUG-670 / BUG-674 added the note *input* to the item/order cancel dialogs; this item is about *displaying/exporting* that captured note in the report.
- **RELATED (sibling screens, same cluster, not in this ID's scope):** `CancellationsMockup.jsx` (`notes: i.notes` only; Note column removed by BUG-708) and `OrderNotesMockup.jsx` (filters on `notes` → all rows excluded; no Stage column). Owner may widen scope or register siblings separately.
- Not a duplicate of BUG-579 (₹ values) or CR-554/555/556/BUG-713/715/717/718 (punch time/duration/risk/filters/format on the same screens).

## Priority rationale
P1: the detail/audit report exists to surface *why* items were cancelled, including the staff note; the captured note is missing with **no workaround** (not visible anywhere on the page or export). Not P0 (no money error, no crash). Owner may override to P2 if treated as display-polish.

## Blast radius
- SMALL — **1 file** for this page: `frontend/src/pages/reports-module/CancelDetailMockup.jsx` (table render + `buildExportPayload`).
- Hotspot files touched: NO.
- Sibling cluster (if widened): `CancellationsMockup.jsx`, `OrderNotesMockup.jsx`.

## Proposed fix (for PLANNING — not implemented here)
Add a **Note** column to the table reading `item.cancel_item_note` (fallback `item.notes`), and add the same column to `buildExportPayload`. Handle empty note as "—". Verify for both item-scope and order-scope rows.

## Open questions (owner)
1. Scope this ID to the **Item Cancellation Detail page only**, or widen to the 3-screen cluster (Cancellations + OrderNotes)?
2. Column label — "Note" (reads `cancel_item_note`)? Backend caveat: `cancel_item_note` doubles as the order-level note; a future backend rename/split is cleaner (non-blocking).

## Next
Planning Gate 2 (Impact Analysis). `testing_agent` MANDATORY after fix (owner standing rule): create 1 item-level + 1 order-level cancellation each WITH a note; verify the note shows on screen + export.
