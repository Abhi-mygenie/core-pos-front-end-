# Handover — API contracts as part of Impact Analysis (Batches B → D → C) — 2026-11-15

> Replaces `handover/HANDOVER_2026_11_15_WRITE_FINAL_API_CONTRACTS_BATCH_B_C_D.md` (kept, superseded).

## 0. Your role and rules
- **Role: PLANNING — Impact Analysis (Gate 2).** The API contract for each CR is a **part of that CR's impact analysis**. Documents only: **zero app code** (`frontend/src`, `.env`, `.emergent/` untouched). No item moves to Gate 3 or later. Nothing is sent to backend.
- **Work batch-wise, one batch at a time: B first → D → C.** Finish (owner-approved) one batch before starting the next.
- **Ask the owner first.** Never guess a field name, endpoint, type, value, default, error code or behaviour. Ask in rounds of max ~5 plain-language questions, one decision each, with a recommended option. Log every answer in that batch's decisions file (new dated round) **before** writing it into a contract.
- A contract is `DRAFT v1` until the owner says "approved" → then `FINAL v1 — LOCKED <date>`. Existing backend keys are **never renamed** (Batch A rule R19). Names in a locked contract are final; backend replies that rename fields are rejected (R20).
- No real customer/restaurant data in any doc (evidence is masked — keep it masked).

## 1. Current state (2026-11-15)
| Batch | IA state | Contracts | Blockers before contracts are FINAL |
|---|---|---|---|
| A | Gate 3 planning | 8 LOCKED (done) — do not touch | — |
| **B** | Gate 2 IA CLOSED + Gate 2.5 design APPROVED | **0 of 8** | Owner answers only (§3). No hard blockers. |
| **D** | Gate 2 IA CLOSED (R1–R6) | **0 of 2** | Owner answers (BD-06/07/08) + backend confirmation for BD-01/03 (§4) |
| **C** | **Gate 2 PAUSED — NOT FROZEN** | **0 of 2** | IA not finished: owner data + backend facts (§5). Do not lock before IA freeze. |

Because contracts are part of IA: for B and D, writing contracts **reopens Gate 2 as "IA + contracts"**; the batch is complete again only when all its contracts are LOCKED. For C, the contracts are written as part of finishing its IA.

## 2. Read first
- Contract format to copy: `contracts/BATCH-A_CR-493_API_CONTRACT_2026_11_15.md` (small), `contracts/BATCH-A_CR-494_API_CONTRACT_2026_11_15.md` (large); rules `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md`; owner rules R19–R21 in `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md`.
- Per batch: brief `backend_briefs/BACKEND_BRIEF_BATCH-<X>_2026_11_15.md`, summary `impact/BATCH-<X>_IMPACT_ANALYSIS_SUMMARY_*.md`, per-item `impact/<ID>_IMPACT_ANALYSIS.md`, decisions `change_requests/BATCH_<X>_OWNER_DECISIONS_2026_11_14.md`, masked evidence `evidence/BATCH-<X>-IA/`.
- Tracker source: `backend_briefs/BACKEND_BRIEF_TRACKER.html`; public view `/backend-tracker.html` (built by `scripts/build_public_trackers.py`).

**Contract file name (exact):** `contracts/BATCH-<X>_<CR-ID>_API_CONTRACT_<YYYY_MM_DD>.md`.
**Each contract contains:** header (`# API Contract — <CR> <title> — v1 — <date>`, backend owner, line IDs, IA doc link, "names LOCKED" line) · one section per line ID with endpoint (method + exact path) and a `Where | Field | Type | Values | Default | Status` table (`NEW` / `EXISTING — confirm unchanged` / `BEHAVIOUR`) · old-data behaviour · errors table (code, HTTP, when) · empty backend sign-off table (`ID | OK / ETA / Not feasible | Notes | Date`).

## 2a. FIRST STEP for every batch — put the MD file and HTML link in place
Start each batch by creating the files and links, before any owner round:
1. Create one `DRAFT v1` contract `.md` per CR at `contracts/BATCH-<X>_<CR-ID>_API_CONTRACT_<YYYY_MM_DD>.md`. Fill only what the brief and IA already say, and mark every open point `TBD — owner Q<n>`.
2. Update `scripts/build_public_trackers.py` so that:
   - the batch's contracts are listed in `BATCHES["<X>"]["contracts"]` (glob like Batch A);
   - `contract_cell()` links each B/C/D row to its CR's contract when the file exists (map the row's Item to the CR; `CR-525 / CR-521` → CR-525), otherwise it keeps the brief link.
3. Rebuild with `python3 memory/scripts/build_public_trackers.py`. This writes `/briefs/<contract>.html` and the raw `/briefs/<contract>.md`.
4. Open `/backend-tracker.html` and check that every row of the batch shows the contract with `[HTML · MD]` and a working **Copy .md** button. The page's own Open .md / Copy .md must work too.
5. Send the owner the tracker link plus the HTML and MD link of each draft contract, together with the round 1 questions. After each owner round, update the `.md`, rebuild and recheck the links.

Preview base URL: the value of `REACT_APP_BACKEND_URL` in `frontend/.env` (pages are served from `frontend/public`). Contracts are `.md` only. Never hand-edit files in `frontend/public/briefs/`, because the build script regenerates them.

## 3. Batch B — start here (8 contracts)
| Contract | Lines | Brief proposal (to confirm) |
|---|---|---|
| BUG-672 | BB-01 | Reject TAB/credit on prepaid order when TAB `prepaid:0` (`order-bill-payment`, `place-order`) |
| CR-526 | BB-02, BB-03 | `is_settled` + `settled_at` in `get-settlement-report`; `day_settled` on order rows; `make-order-unpaid` / change-method rejects with "Day already settled" |
| CR-542 | BB-04, BB-05 | `item_type = 'Unpaid'` in `cancellation-reasons`; `make-order-unpaid` takes `reason` + `reason_id` (null for "Other"); required also for Remove from Credit / Room (OD-542-B) |
| CR-514 | BB-06, BB-07 | `payment_types[]`: `ref_enabled`, `ref_required`, `ref_label`, `ref_max_len`; confirm `partial_payments[].transaction_id` per split part |
| CR-522 | BB-08 | `reconcile_tolerance_pct` (decimal) in settings-list `basic`; blank or 0 = no check (OD-522-B) |
| CR-527 | BB-09 | `diner_name` (+ optional `diner_mobile`) on `tap-customer-record-list` credit rows |
| CR-536 | BB-10, BB-10b | `custGSTAddress` on `order-bill-payment` / `place-order`; return `cust_gst`, `cust_gst_name`, `cust_gst_address`; optional billing address on customer profile |
| BUG-607 | BB-11, BB-12 | `restaurant_gst = category` → always item `tax`, no restaurant fallback (behaviour only); BB-12 = request one wrong order id |

No contract: BUG-671 (FE only). BB-13 (CR-394 one-time Inclusive→Exclusive data fix) = data-fix note / checklist, not an API contract — confirm with owner.

**Owner questions for Batch B (round 1 — ask these first):**
1. Who sets final names: owner locks the brief's proposed names now (recommended, like Batch A) or backend proposes first?
2. BB-01 reject error: code + message (proposal 422 `CREDIT_NOT_ALLOWED_PREPAID`, "Credit not allowed on prepaid order").
3. BB-02 signal shape: a) settlement report `is_settled` + `settled_at` and order `day_settled` (recommended) b) order flag only.
4. BB-03 error: 422 `DAY_ALREADY_SETTLED`, "Day already settled" — OK?
5. BB-04/05: confirm `'Unpaid'`, `reason` + `reason_id`, required for all 3 actions, empty → 422.
6. BB-06: confirm 4 names; default `ref_max_len` when blank (e.g. 50)?
7. BB-08: confirm name, decimal, 0/blank = off; max (e.g. 20%)?
8. BB-09: `diner_name` only or + `diner_mobile`?
9. BB-10/10b: `custGSTAddress` on order, `gst_address` on customer profile, max 255 — OK?
10. BB-12 / BB-13: checklist only, no contract — OK?

## 4. Batch D — second (2 contracts)
| Contract | Lines |
|---|---|
| CR-525 (+ CR-521) | BD-01 reset `bill_print` on add-after-print + socket · BD-02 no reset on customer-only update · BD-03 other edit paths · BD-04 keep `bill_print_count` |
| CR-523 | BD-05 customer-only `update-place-order` · BD-06 remove customer · BD-07 skip edit count · BD-08 message |

No contract: BD-09 (test-data cleanup), BUG-667 / BUG-669 / BUG-673 (FE only) — confirm.
**Owner questions:** BD-06 field (`cust_remove: true` vs empty name + mobile = unlink); BD-07 skip `order_edit_count` yes/no; BD-08 needed? final text; BD-01 socket event name.
**Backend-dependent:** BD-01/BD-03 exact list of edit paths that reset `bill_print`. Lock the names; mark the path list `BEHAVIOUR — backend to confirm` in the sign-off table.

## 5. Batch C — last (2 contracts, only after IA freeze)
| Contract | Line |
|---|---|
| CR-524 | ASK 1 — original add time per cancelled line (`punched_at` proposal), same timezone as `cancel_time` |
| CR-528 | ASK 2 — persist `print_bill_status`, log every bill print in `operations[]`, `bill_printed_at` + count in order-logs-report (BLOCKING) |

**IA blockers (from `impact/BATCH-C_GATE2_OWNER_ROUND3_2026_11_15.md`):** CR-503 Credit Collect meaning + screenshots, Hold order example, Credit collect needs customer (403); CR-505 no-filter breakdown check; CR-510 real Swiggy/Zomato order; test data list for next probe; backend facts for CR-524 / CR-528. First ask the owner whether to (a) wait for the freeze, or (b) write DRAFT contracts now and lock after freeze (recommended: b). Backend brief stays DRAFT until freeze.

## 6. After each batch's contracts are approved
1. Header → `FINAL v1 — LOCKED <date>`; log "Contract <CR> APPROVED" in the batch decisions file.
2. Add a "Contracts" section to the batch IA summary (`impact/BATCH-<X>_IMPACT_ANALYSIS_SUMMARY_*.md`) and a one-line link in each per-item IA doc.
3. Rebuild with `python3 memory/scripts/build_public_trackers.py` (links were set up in §2a). Open `/backend-tracker.html` and check that every row's HTML / MD / Copy now shows the LOCKED version.
4. `control/registry.json`: append to notes "API contract FINAL v1 <date>: contracts/<file>" (valid JSON, no status change). One line in `memory/PRD.md`.

## 7. Done when
Every backend line of the batch shows a locked contract link (agreed exceptions: BB-12, BB-13, BD-09, FE-only items), the decisions file records each approval, and the IA summary lists its contracts. Then move to the next batch.
