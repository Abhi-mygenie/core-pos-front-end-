# Handover — Write the final API contract for every backend line item (Batches B, C, D) — 2026-11-15

**Your job:** write one locked FE↔backend API contract per CR for Batches B, C and D, so that every line in the backend tracker links a real contract (not "Brief §… / no contract yet").
**Role:** PLANNING, documents only. **Zero app code** (`frontend/src`, `.env`, `.emergent/` untouched). No item moves to Gate 3 or later. Nothing is sent to backend.

## 0. Golden rule — ASK THE OWNER FIRST
Before writing ANY final detail you are not 100% sure of (field name, type, values, default, endpoint, error code, behaviour, which CR owns a line), **ask the owner and wait for the answer**. Never guess, never invent a field name.
- Ask in small rounds (max ~5 questions per round), plain language, one decision per question, with a recommended option.
- Log every answer in the batch decisions file as a new dated round (see §4) **before** you write it into a contract.
- A contract is only **FINAL / LOCKED** after the owner says "approved" for it. Until then mark it `DRAFT v1`.
- Existing backend keys are **never renamed** (Batch A owner rule R19). If a key already exists, the contract uses the existing name and marks it `EXISTING — confirm unchanged`.

## 1. Read first (in this order)
1. Format to copy: `memory/contracts/BATCH-A_CR-493_API_CONTRACT_2026_11_15.md` (small) and `memory/contracts/BATCH-A_CR-494_API_CONTRACT_2026_11_15.md` (large). Rules index: `memory/contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` (superseded, but its rules still apply).
2. Batch A owner rules R19–R21: `memory/change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md` (names locked; rename → backend reply rejected).
3. Tracker (status rows = source of truth): `memory/backend_briefs/BACKEND_BRIEF_TRACKER.html`. Public view: `/backend-tracker.html`.
4. Per batch:

| Batch | Brief (asks) | Impact analysis | Owner decisions | Evidence | Gate state |
|---|---|---|---|---|---|
| B | `backend_briefs/BACKEND_BRIEF_BATCH-B_2026_11_15.md` (BB-01..BB-13 + BB-10b) | `impact/BATCH-B_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md` + `impact/<ID>_IMPACT_ANALYSIS.md` (BUG-671, BUG-672, CR-526, CR-542, CR-514, CR-522, CR-527, CR-536, BUG-607, CR-394) | `change_requests/BATCH_B_OWNER_DECISIONS_2026_11_14.md` | `evidence/BATCH-B-IA/` | Gate 2.5 APPROVED (mockups M1–M9 + M4b) |
| C | `backend_briefs/BACKEND_BRIEF_BATCH-C_2026_11_15.md` (ASK 1 CR-524, ASK 2 CR-528) | `impact/BATCH-C_IMPACT_ANALYSIS_SUMMARY_2026_11_15.md`, `impact/CR-503/524/528_IMPACT_ANALYSIS.md`, `impact/BUG-675_IMPACT_ANALYSIS.md`, `impact/BATCH-C_GATE2_OWNER_ROUND3_2026_11_15.md` | `change_requests/BATCH_C_OWNER_DECISIONS_2026_11_14.md` | `evidence/BATCH-C-IA/` (round 1 + write probe) | **Gate 2 PAUSED, not frozen** |
| D | `backend_briefs/BACKEND_BRIEF_BATCH-D_2026_11_15.md` (BD-01..BD-09) | `impact/BATCH-D_IMPACT_ANALYSIS_SUMMARY_2026_11_15.md` + `impact/<ID>_IMPACT_ANALYSIS.md` (BUG-667, BUG-669, BUG-673, CR-525, CR-521, CR-523) | `change_requests/BATCH_D_OWNER_DECISIONS_2026_11_14.md` (R1–R6) | `evidence/BATCH-D-IA/probes_2026_11_15/` | Gate 2 CLOSED |

## 2. Contracts to write (one file per CR)
**Order: Batch B first** (Gate 2.5 approved, ready) → **Batch D** (Gate 2 closed) → **Batch C last** (Gate 2 paused; ask the owner whether to wait for the freeze).

File name: `memory/contracts/BATCH-<X>_<CR-ID>_API_CONTRACT_<YYYY_MM_DD>.md` (exactly this pattern — the tracker build script finds contracts by it).

| Batch | Contract file (CR) | Tracker lines it must cover |
|---|---|---|
| B | BUG-672 | BB-01 |
| B | CR-526 | BB-02, BB-03 |
| B | CR-542 | BB-04, BB-05 |
| B | CR-514 | BB-06, BB-07 |
| B | CR-522 | BB-08 |
| B | CR-527 | BB-09 |
| B | CR-536 | BB-10, BB-10b |
| B | BUG-607 | BB-11, BB-12 |
| B | CR-394 | BB-13 |
| C | CR-524 | ASK 1 |
| C | CR-528 | ASK 2 |
| D | CR-525 (+CR-521) | BD-01, BD-02, BD-03, BD-04 |
| D | CR-523 | BD-05, BD-06, BD-07, BD-08 |
| D | BD-09 (test data) | **No contract** — cleanup task, not an API. Confirm with owner. |

Batch B items with NO backend ask (BUG-671 = FE only) and Batch D items BUG-667 / BUG-669 / BUG-673 (FE only) need no contract. Batch A is DONE (8 locked contracts, R20) — do not touch.

## 3. Each contract must contain (same as Batch A)
- Header: `# API Contract — <CR> <title> — v1 — <date>`, backend owner (Gyan unless owner says otherwise), line IDs, link to IA doc, "names LOCKED" rule line.
- One section per line ID: endpoint (method + exact path), tables of `Where | Field | Type | Values | Default | Status` with Status = `NEW` / `EXISTING — confirm unchanged` / `BEHAVIOUR`.
- Exact request + response field names, types, enums, defaults, and what happens on old data.
- Errors table: code, HTTP status, when.
- Backend sign-off table: `ID | OK / ETA / Not feasible | Notes | Date` (empty).
- Use only endpoints / keys already seen in the code, the IA docs or masked probe evidence. Anything new = ask owner for the name first.

## 4. Known questions to ask the owner (start here — do not decide these yourself)
**Batch B**
- BB-01: is the TAB `prepaid` enforcement still wanted as a hard backend reject (error code + message)?
- BB-02/03: field name + shape of the "day settled" signal (per order flag vs per date endpoint); exact error text "Day already settled"?
- BB-04/05: unpaid reasons — reuse the cancellation-reasons endpoint with `item_type = "Unpaid"`? Field names `reason` / `reason_id` on make-order-unpaid?
- BB-06: names for per-payment-method `ref_enabled` / `ref_required` / `ref_label` — confirm final names and where they live (payment_types list?).
- BB-08: `reconcile_tolerance_pct` — confirm name, type (number vs string), blank/0 = off.
- BB-09: diner name field on credit rows — name?
- BB-10/10b: `custGSTAddress` naming style vs snake_case; billing address field on customer profile — name?
- BB-12: is BB-12 (share one wrong-GST order id) a contract line or just a request? (Probably no contract fields.)
- BB-13: one-time data migration — contract or ops note only?

**Batch C** (Gate 2 is PAUSED — ask the owner if contracts should wait for the IA freeze. Recommended: write DRAFT only, lock after freeze.)
- ASK 1: final name `punched_at` vs `created_at`; timezone format (IST string vs ISO with offset).
- ASK 2: name of the bill-print event in `operations[]`, fields (time, employee, amount); `bill_printed_at` / `bill_print_count` on orders_table.
- Still open from IA: OD-503-06 (Credit Collect meaning), Hold status code, CR-505 no-filter, CR-510 aggregator check.

**Batch D**
- BD-01/03: exact list of edit paths that reset `bill_print` (owner/backend to confirm); socket event name to publish.
- BD-06: remove-customer field — `cust_remove: true` vs "empty name + mobile = unlink". Owner chose "allow remove" but NOT the field name.
- BD-07: should customer-only updates skip `order_edit_count` — yes/no?
- BD-08: wanted at all (cosmetic)? Final message text?
- BD-09: confirm no contract needed.

## 5. After each contract
1. Owner approves → change header to `FINAL v1 — LOCKED <date>` and log "Contract <CR> APPROVED" in that batch's decisions file.
2. Update `memory/backend_briefs/BACKEND_BRIEF_TRACKER.html` meta line for the batch (Documents) only if needed — do NOT change row statuses (backend hasn't replied).
3. Update `memory/scripts/build_public_trackers.py`:
   - add the new contract files to `BATCHES["B"|"C"|"D"]["contracts"]` (copy the Batch A glob pattern),
   - in `contract_cell()`, make Batch B/C/D rows link `/briefs/BATCH-<X>_<CR>_API_CONTRACT_<date>.html` when the file exists (map each row's Item column → CR; BD rows use the Item column, e.g. `CR-525 / CR-521` → CR-525), else keep the brief link.
4. Rebuild: `python3 memory/scripts/build_public_trackers.py`, open `/backend-tracker.html`, check every row's Contract link opens.
5. Update `memory/control/registry.json` notes only (append "API contract FINAL v1 <date>: contracts/<file>"), keep valid JSON, no status changes. Also `memory/PRD.md` one-line status.

## 6. Don'ts
- Don't invent or rename any field. Don't change Batch A contracts.
- Don't send anything to backend; don't move any item past its current gate.
- Don't write app code.
- Don't put real customer/restaurant data (names, phones, emails, GST numbers, addresses) into contracts — evidence is masked; keep it that way.

## 7. Done when
Every tracker line in Batches B, C, D (except BD-09 and owner-agreed exceptions) shows a contract link, every contract is owner-approved (Batch C may stay DRAFT until its IA freeze if the owner agrees), and the decisions files record each approval.
