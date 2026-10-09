# POS Agent — Contract Reply to Registry → Google Sheet Contract v1.4

**Reply date:** 2026-10-09
**From:** POS agent (E1 / Emergent)
**To:** Tech Dashboard / CTO
**Re:** Registry → Google Sheet Contract v1.4 (2026-10-07)
**Sheet:** https://docs.google.com/spreadsheets/d/18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY
**Contract accepted:** ✅ v1.4 FROZEN — no deviations requested

---

## 1. Acceptance

The POS agent accepts **Registry → Google Sheet Contract v1.4** in full. The sheet will be
brought into compliance via **CR-418** (registered, all decisions locked, ready for
implementation). No contract amendments are requested.

---

## 2. POS-specific values (§3 + §7)

| Contract field | POS value |
|---|---|
| **Project** (col 1) | `POS` on every row |
| **ID scheme** (§7) | Current scheme maintained (`CR-NNN`, `BUG-NNN`) until next release |
| **Area list** (col 9) | 18 canonical values — see §4 below |
| **Sheet ID** | `18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY` |
| **Script** | `memory/reports/sheets_sync.py` |
| **Registry** | `memory/control/registry.json` |

---

## 3. Current sheet state (snapshot 2026-10-09)

The sheet today has **766 rows in the old format** (CR-406, pre-contract). After CR-418
lands, the sheet will be fully replaced with the 22-column / 10-tab contract layout.

### Registry snapshot — 771 items

| Status (post-classifier) | Count |
|---|---|
| CLOSED | 255 |
| IMPLEMENTED | 185 |
| QA | 107 |
| SMOKE | 93 |
| INTAKE | 86 |
| PARKED | 30 |
| PLANNING | 6 |
| DUPLICATE | 2 |
| **Unrouted (blank)** | **7** |
| **Total** | **771** |

> Unrouted target: zero. 7 remaining items will be surfaced to owner on first push.

### Type breakdown

| Type | Count |
|---|---|
| BUG | 482 |
| CR | 279 |
| INVESTIGATION | 5 |
| GAP | 1 |
| (blank — 4 legacy items) | 4 |

> 4 blank-type items will be resolved during one-off cleanup (Track C).

### Priority — open items only (516 items)

| Priority | Count |
|---|---|
| P1 | 246 |
| P2 | 158 |
| P3 | 22 |
| P0 | 24 |
| **Missing → default P2** | **34** |

> 34 items will receive `P2` default + `PRIORITY DEFAULTED` note on first push.

### Live blockers (open items)

| Metric | Count |
|---|---|
| Open items with `blocked_by` or BLOCKED status | 22 |
| Stale Blockers-tab rows on closed items (to drop) | ~23 (per brief) |

### Sprint distribution (top)

| Sprint | Count |
|---|---|
| pos_5_0 | 265 |
| (no sprint) | 134 |
| pos_5_1 | 83 |
| pos_pms_1 | 59 |
| pos_4_0 | 49 |
| oct_release | 40 |
| pos_pms_2 | 28 |
| pos_5_x | 24 |

---

## 4. POS Area list (col 9)

18 canonical values. Owner may extend by amending the brief.

```
Printing
Reports
Inventory
Menu Management
Payments
PMS Check-In
PMS Bookings
PMS Folio
CRM
Settings
Auth / Permissions
Smart Purchase
Sidebar / Nav
Sockets
Order Entry
Dashboard
Expense
Tooling
```

> 535 / 771 rows currently have no area. Will be blank on first push; owner corrects in sheet → Change Log carries back.

---

## 5. Contract compliance implementation plan (CR-418)

| Track | What | ETA |
|---|---|---|
| **A — Push rewrite** | 22-column / 10-tab contract format | CR-418 Gate 5A |
| **B — REGISTRAR + Change Log** | Disable write-back, add Change Log diff, `--pull` = read-only diff | CR-418 Gate 5A |
| **C — Registry cleanup** | Type casing, timestamp fields, category cleanup, blockers | CR-418 Gate 5A (same push) |

**CR-418 status:** Gate 1 INTAKE — all 5 owner decisions locked. Awaiting Gate 2 GO.

---

## 6. Contract §5 — Two-way rule: POS Phase 1 scope

Phase 1 accepted columns from sheet: **Status, Registered, Closed** (per §5.2).

- `Last updated` — agent-computed only. Never accepted.
- `Assignee` — excluded from diff entirely.
- All other column edits → logged as REJECTED in Change Log.
- Dashboard writes to Priority + SMOKE→CLOSED → tagged `SOURCE=DASHBOARD`, applied without owner approval.

---

## 7. Data quality flags for dashboard

These counts are known gaps; the dashboard should treat them as expected transitional state
until CR-418 is live and the owner has corrected them via sheet:

| Gap | Count | Resolution |
|---|---|---|
| Items with blank Status (Unrouted) | 7 | Surfaced to owner on first push |
| Items with no Area | 535 | Owner corrects in sheet → Change Log |
| Items with no Registered date | ~445 | Owner fills in sheet → Change Log |
| Items with Priority defaulted to P2 | 34 | Owner corrects in sheet → Change Log |
| Blank type (legacy) | 4 | Cleaned in Track C |

---

## 8. REGISTRAR role — confirmed

The POS agent will operate as REGISTRAR per §1:
- Every `registry.json` mutation triggers an automatic `--push`
- Sheet updated in the same step
- Human edits diffed → appended to Change Log
- Pending Change Log rows surfaced to owner in session summary
- Assignee column never written

---

## 9. Timeline commitment

| Milestone | Status |
|---|---|
| Contract v1.4 read + accepted | ✅ 2026-10-09 |
| Brief validated (brief-pos-agent.md) | ✅ 2026-10-09 |
| CR-418 registered + all ODs locked | ✅ 2026-10-09 |
| Gate 2 Impact Analysis | Awaiting "Gate 2 GO" |
| Gate 3 Implementation Plan | After Gate 2 |
| Gate 4 GO + Implementation | After Gate 3 |
| First compliant push to sheet | Gate 5A |
| Sheet readable by Tech Dashboard | Gate 5A |

---

*POS agent reply — 2026-10-09*
*Contract: registry-sheet-contract-v1.4.md (FROZEN 2026-10-07) · Brief: brief-pos-agent.md (FROZEN 2026-10-09)*
*CR-418: GATE_1_INTAKE — all decisions locked — awaiting Gate 2 GO*
