# Session Handover — 2026-11-14 (Intake Q&A: Batch A CLOSED, Batch B OPEN)

## 1. Summary
- Owner ran intake Q&A over the 112 open INTAKE items (no-assumption mode, owner answers every question).
- **Batch A (Cancellation, Complimentary & Permissions) — all owner questions answered, registry updated.** Ready for PLANNING Gate 2 (Impact Analysis).
- **Batch B (Payments, Credit & GST) — questions posted to owner, NOT answered yet.** Owner will continue Batch B later.
- **Zero source code changes.** Only `/app/memory` files touched.

## 2. Next Agent — What To Do
Role: **PLANNING** (per `control/AGENT_PROMPT_ALPHA.md` §PLANNING, Gate 2).

1. Read: `control/AGENT_PROMPT_ALPHA.md` (PLANNING role), this handover, `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md`.
2. **Read Batch A back to the owner** — short plain-English list per item (decision + order below). Owner must confirm it is correct.
3. **Ask the owner for the Gate 2 GO**: "Impact Analysis (Gate 2) for Batch A — go?" Also ask: all 13 items, or a subset / one stage at a time? Do NOT write Implementation Plans (Gate 3) unless the owner asks.
4. On GO: Step 0 Code Reality → Step 1 Conflict check → Step 2 Impact Analysis, one doc per item at `impact/<ID>_IMPACT_ANALYSIS.md`. No code edits.
5. Batch B: when owner says continue, re-post Batch B questions (they are in the 2026-11-14 brief, lines 532-1048 of `change_requests/INTAKE_REQUIREMENT_BRIEFS_2026_11_14.md`) — do not assume answers.

## 3. Batch A — Items & Impact-Analysis Order (owner-approved order)
| Stage | Items | Notes |
|---|---|---|
| 1 Rights | CR-071, CR-492, CR-515 | CR-071 pulled into batch (Abhishek). 492: no right → hidden; covers item + order comp (100% discount hidden as fallback). 515: 4 new rights — reprint, change payment method, make unpaid, collect pay-later; hidden if no right. |
| 2 Cancel | CR-493, BUG-674, BUG-670 | Reason always mandatory. One setting (backend key) notes mandatory/optional, default optional. Notes must show in Cancellation report + Order Beta. |
| 3 PIN + limits | CR-494 | Separate restaurant PIN per action: cancel before serve, cancel after serve, cancel after bill, order edit after bill, discount, complimentary. Per-action ₹ threshold (0 = PIN always). Daily per-user ₹+count limits for cancels AND discounts, same for all users; over limit → allowed with PIN. Config in backend admin (phase 1). |
| 4 Comp | CR-445 (absorbs CR-058), CR-495 | 445: whole-order comp inside payment-methods list, reason required, PIN per right (detail at impact), count in Discount report comp section. 495: package at check-in (walk-in too; OTA meal plan auto), any food comp up to ₹/guest × guests per day, above → PIN; half/full board lunch/dinner tracking TBD at impact. |
| 5 Alerts | CR-443 (absorbs CR-496) | Alerts: cancel before/after serve, unpaid, payment method changed. POS + push. Right decides eligibility; employee can mute per device. Phase 2: read tick + tap opens order. |
| 6 Later | CR-529 (P1, OTP phase 2), CR-540 (new, leakage controls, priority TBD), CR-372-B | 372-B: delete `/settlement/preview`; `/local-printer-setup` (no login guard) — decide at impact. |

- Client = **ALL** for every Batch A item. Assignee rule: **Abhishek on FE, `blocked_on: Gyan — backend keys/rights`** (CR-495 stays Parth).
- Merged & closed: CR-058 → CR-445, CR-496 → CR-443.

## 4. Code Findings Already Made (verify in Step 0)
- **BUG-670:** `components/order-entry/CancelFoodModal.jsx` collects `additionalNotes` (L201-216) but `handleCancel` (L35) never passes it; `orderToAPI.cancelItem` (`api/transforms/orderTransform.js` L995-1006) has no notes field. Reports read `cancel_reason_text` (`reportTransform.js` L789, `insightsService.js` L301-305).
- **BUG-674:** `CancelOrderModal.jsx` notes textarea only in refund mode (L103); payload already sends `cancellation_note` (orderTransform.js L1028).
- Cancel order handler: `pages/DashboardPage.jsx` ~L1359-1384 (`ORDER_STATUS_UPDATE`); item cancel: `OrderEntry.jsx` ~L1539.
- Route guards: `components/guards/PermissionRoute.jsx` wraps ProtectedRoute; report previews already guarded. Unguarded: `/settlement/preview` (App.js L244), `/local-printer-setup` (L251).
- **Open backend questions for Gyan:** item-cancel notes field name; whether `cancellation_note` / item notes are returned in cancel-order-list + Order Beta APIs; PIN/threshold/limit/right keys for 492/493/494/515/443/445/495.

## 5. Artifacts This Session
| File | Purpose |
|---|---|
| `change_requests/INTAKE_REQUIREMENT_BRIEFS_2026_11_14.md` | Full requirement brief for all 112 open intake items, grouped in draft batches A–J |
| `change_requests/INTAKE_OPEN_QUESTIONS_2026_11_14.md` | Raw open-question dump (214) |
| `change_requests/BATCH_A_OWNER_ANSWERS_DRAFT_2026_11_14.md` | Owner answers rounds 1–2 (verbatim) |
| `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md` | **FINAL Batch A decisions (source of truth)** |
| `change_requests/CR-540_REVENUE_LEAKAGE_CONTROLS_INTAKE.md` | New CR (8 leakage ideas, one CR) |
| `reports/intake_briefs.py` | Regenerates the briefs file from registry + intake docs |
| `reports/apply_batch_a_decisions.py` | Applied Batch A decisions to registry (already run — do not re-run) |

## 6. Registry State
- `control/registry.json`: 14 Batch A items updated (status, client ALL, `batch: BATCH-A-2026-11-14`, notes prefixed `[2026-11-14 owner decisions]`, artifact ref to decisions doc). CR-540 added. Total items 1096.
- Ready status text: `GATE_1_INTAKE_COMPLETE — OWNER ODs ANSWERED 2026-11-14 (Batch A). Next: IMPACT ANALYSIS BATCH-A.`
- Not yet synced to Google Sheet (run `reports/sheets_sync.py` push only if owner asks; `TECH_TASKS_SHEET_ID` still missing for Part B).

## 7. Batch B Status — INTAKE CLOSED (P0 only), registry updated 2026-11-14
- Source of truth: `change_requests/BATCH_B_OWNER_DECISIONS_2026_11_14.md` (answers detail in `BATCH_B_OWNER_ANSWERS_DRAFT_2026_11_14.md`). Applied via `reports/apply_batch_b_decisions.py` (already run — do not re-run).
- **P0 ready for impact (9):** BUG-671, BUG-672, CR-514, CR-522, CR-526, CR-527, CR-536 (Prana removed from title), BUG-607 (Gyan), CR-394.
- **New:** CR-541 (reference-box settings in POS Settings, P1), CR-542 (reason mandatory on every Make Unpaid, priority TBD).
- **Re-prioritised:** P1 — CR-517, BUG-475, BUG-118, CR-425, CR-520 · P2 — CR-126, CR-438 · CR-447 parked.
- **Owner still to answer:** CR-542 priority; merge CR-522 phase 2 into CR-541?; confirm impact order 671/672 → 526/542 → 514 then 522 (after Batch A PIN) → 536/527 → 607/394. Items deferred to impact: 514-05, 527, 536-05 (entry point / UPI owner), 607-04, CR-394 inclusive vs exclusive.
- Owner said "stay in intake" — next intake batch is **C (Order Beta report)**, lines 1049-1823 of the briefs file, P0 only.

## 7b. Batch C Status — INTAKE CLOSED (P0 only), registry updated 2026-11-14
- Source of truth: `change_requests/BATCH_C_OWNER_DECISIONS_2026_11_14.md`. Applied via `reports/apply_batch_c_decisions.py` (already run — do not re-run).
- **P0 ready for impact (4):** CR-503 (Collect pop-up + Print Bill, CR-515 rights), CR-528 (in Audit report), CR-524 (punch time = item added, duration minutes), BUG-675 (remove "Total sale: ₹X" subtitle under Cash Collected).
- **INVESTIGATION to validate with code (kept open by owner):** CR-505 (likely covered by BUG-645), CR-510 (variations/add-ons already rendered; check a real aggregator order).
- **Merged:** BUG-605 → CR-526.
- **Moved to P1:** CR-504, 506, 507, 508, 509, 511, 532, 444, 497, 537, 539, 138, BUG-192.
- Next intake batch: **D (Dashboard, Order Entry & Order Cards)**, lines 1824-2309 of the briefs file, P0 only.

## 7a. Batch A Gate 2 — Impact Analysis DRAFT (merged from parallel agent 2026-11-14)
- Read `handover/SESSION_HANDOVER_2026_11_14_BATCH_A_GATE2_IMPACT.md` + `impact/BATCH-A_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md`.
- 14 impact docs in `impact/`, evidence (contact details masked) in `evidence/BATCH-A-IA/probes_2026_11_14/`. Applied via `reports/apply_batch_a_gate2_merge.py` (already run — do not re-run).
- 11 items → `GATE_2_IMPACT_ANALYSIS — DRAFT`; CR-529, CR-540 stay INTAKE. Round 5 owner questions (1–5) asked, not answered; 6–16 not asked; backend brief not written.
- Not pushed to GitHub (owner: merge local first).

## 7c. Batch D Status — INTAKE CLOSED (P0 only), registry updated 2026-11-14
- Source of truth: `change_requests/BATCH_D_OWNER_DECISIONS_2026_11_14.md`. Applied via `reports/apply_batch_d_decisions.py` (already run — do not re-run).
- **P0 ready for impact (6):** BUG-667 (sidebar name wrap 2 lines), BUG-669 (₹0 add-ons + variations), BUG-673 (Enter re-adds default item → selection back to search box), CR-525 (Collect Bill replaces KOT+Bill after print), CR-521 (orange background, green border — design agent picks shade), CR-523 (link customer without update).
- **Moved to P1:** CR-518, CR-516, CR-437, CR-404. **Open:** CR-376-FU-C priority; BUG-667 screen confirmation at impact.
- Next intake batch: **E (Scan Order & Aggregator / Sockets)**, lines 2310-2557 of the briefs file, P0 only.

## 8. Owner Working Style
- "Do not assume" — ask every open point; owner answers in short form (`A1 a, A2 b`).
- Summarise understanding back before writing to the registry.
- No testing agent calls; no code changes outside an approved Gate 4 GO.
