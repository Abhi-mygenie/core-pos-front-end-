# MERGE — QA Nov Sprint intake → main registry — 2026-11-19

**Role:** INTAKE (Gate 1) · **Action:** merged another agent's QA Nov Sprint intake bundle into this branch's `control/registry.json`. **No application code changed. No git merge** (their build `3b102b2` is not in our history — this is a registry/metadata merge only). Owner-approved 2026-11-19.

**Source bundle:** `QA_Nov_Sprint_Intake_Bundle_2026-11-19.zip` (intake doc `BATCH_INTAKE_2026_11_19_QA_NOV_SPRINT_FINDINGS.md`, report `QA_REPORT_NOV_SPRINT_2026-11-19.md`, raw `iteration_8/9/10.json`).

## Why renumbered
The bundle minted `BUG-713…732` + `CR-557/558` from a divergent main (max BUG 712 there). On **our** main, `BUG-713…719` were already taken (BUG-713 Cancellation Punch/Duration + BUG-714…719 the cancellation-batch QA gaps). Per owner: **renumber the incoming items** to our free IDs; our 713–719 untouched. Offset = +7 for bugs; CRs free so unchanged.

## A. ID remap (incoming → merged)
| Incoming | Merged | Pri | Area | Title (short) |
|---|---|---|---|---|
| BUG-713 | **BUG-720** | P0 | Auth/Routing | Route permission bypass (/settings,/menu,/employees,/inventory-*,/pms/*) |
| BUG-714 | **BUG-721** | P1 | Permissions/Dashboard | Print KOT / YTC Cancel not permission-gated |
| BUG-715 | **BUG-722** | P1 | Reports/Analytics | Audit 30D/LM/FY timeout + stale KPIs/Download-on-error |
| BUG-716 | **BUG-723** | P2 | Reports/Insights | Preset chip hard-coded (Sales/Cancellations/Dashboard) |
| BUG-717 | **BUG-724** | P1 | Reports/Order Beta | double-load / no abort guard → "0 orders" flash |
| BUG-718 | **BUG-725** | P2 | Reports/Order Beta | Payment column raw lowercase |
| BUG-719 | **BUG-726** | P2 | Reports/Order Beta | cancelled rows misalign (13 cells vs 12) |
| BUG-720 | **BUG-727** | P3 | Reports/Order Beta | `<tr>` whitespace console error |
| BUG-721 | **BUG-728** | P2 | Reports/Order Beta | Cancelled KPI (41) ≠ rows (25) |
| BUG-722 | **BUG-729** | P2 | Reports/Cancellations | Daily Trend x-axis clipped to "2026-" |
| BUG-723 | **BUG-730** | P2 | Reports/Audit | drill-down "High Risk" badge on every row |
| BUG-724 | **BUG-731** | P2 | Order Entry/ScanOrderPopOut | check-in marker shown as KOT item |
| BUG-725 | **BUG-732** | P3 | Order Entry/Cart | edited row jumps to bottom |
| BUG-726 | **BUG-733** | P3 | Credit/Reports | native date input instead of shadcn calendar |
| BUG-727 | **BUG-734** | P2 | Credit | `[null]` item names + silent Remove failure |
| BUG-728 | **BUG-735** | P2 | Reports/Credit | Change-Method/Mark-Unpaid on split row (gating) |
| BUG-729 | **BUG-736** | P3 | Shell/UX | "Update now" toast overlaps table rows |
| BUG-730 | **BUG-737** | P3 | Reports | leftover CR-003 console.log of permissions |
| BUG-731 | **BUG-738** | P2 | Order Entry/ScanOrderPopOut | channel/amount mismatch (#1578881) |
| BUG-732 | **BUG-739** | P3 | Reports/Audit | "Total Events" KPI mislabel + Excel gaps |
| CR-557 | **CR-557** | P1 | Order Entry/ScanOrderPopOut | shared `<PopoutItemRow>` for web-EDIT Mode B |
| CR-558 | **CR-558** | P2 | Order Entry/Aggregator | true per-item Accept in web-edit |

All 22 at `GATE_1_INTAKE`, sprint `nov_cr_batch`, assignee Abhishek, client ALL, release 2026-11-17. RELATED refs point to pre-existing IDs (resolve cleanly).

## B. Audit-timeout overlap (owner: register separately)
**BUG-722** (new) overlaps existing **BUG-696** (`GATE_2_IA_COMPLETE`, Audit ~43s) and our **BUG-719** (Audit ~78s). All three = insights-dashboard latency > 60s axios timeout. Registered separately per owner; `relates_to` set to [BUG-696, BUG-719]. **Consolidate during Impact Analysis if confirmed same root cause.** BUG-722 additionally carries the *new* behaviour: on timeout the previous range's KPIs remain and Download stays enabled → exports stale data under the new label.

## C. Reopen / status updates applied to existing IDs
| ID | Was | Now | Reason |
|---|---|---|---|
| BUG-684 | IMPLEMENTED | **REOPENED** | ₹1 cart-vs-pay/placed mismatch reproduced |
| BUG-679 | GATE_5A_IMPLEMENTED | **REOPENED** | web-EDIT cancelled items: no strikethrough |
| BUG-702 | GATE_5A_IMPLEMENTED | **REOPENED** | edit-mode prev items no variation row |
| CR-551 | IMPLEMENTED | **REOPENED** | placed items no variation/add-on edit |
| CR-552 | GATE_5A_IMPLEMENTED | **drift corrected → PARTIAL** | is in build; no per-item Accept (see CR-558) |
| BUG-671 | GATE_5A_IMPLEMENTED | **RETEST** | Mark Unpaid click not executed |
| CR-526 | GATE_5A_IMPLEMENTED | **RETEST** | credit tab vanished before Remove |
| BUG-712 | GATE_2_IA_AWAITING_OWNER | (kept) **annotated CONFIRMED** | name blank on reopen + empty-phone AxiosError |
| CR-523 | GATE_5A_IMPLEMENTED | (kept) **annotated CONFIRMED** | ditto (see BUG-712) |

## D. Logged as follow-ups — NO IDs minted
- **Retest required (Group 2 Batch E never ran — time limit):** BUG-686 (dashboard wipes running orders after ~10 logins), BUG-688 (socket join_restaurant once), BUG-690 (add-on list refresh), CR-547 (ScanOrderPopOut KOT item selection).
- **Env-only observations (need live probe):** CRM 401 responses in console; intermittent kitchen-stations load failure at `/loading`; BUG-707 timezone caveat (passes IST, diverges UTC) — annotate on BUG-707, no new ID.

## E. Open questions for owner — BLOCK Gate 2 (parked)
1. **BUG-720** (route bypass): which permission gates each of `/settings`, `/menu`, `/employees`, `/inventory-*`, `/pms/*`? (`/employees` urgent — PII + editable password/role.)
2. **CR-558**: true per-item Accept required, or is "cancel unwanted items then Accept all" acceptable?
3. **BUG-722**: raise insights-dashboard axios timeout / chunk request / push backend perf (or both)?

## F. Registry effect
`total` 1154 → **1176** (+22). Validated JSON. Merge executed via `/tmp/merge_qa.py` (owner-approved mapping).
