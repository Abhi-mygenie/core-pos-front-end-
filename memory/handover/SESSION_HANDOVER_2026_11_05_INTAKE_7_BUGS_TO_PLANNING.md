# SESSION HANDOVER — 2026-11-05 — INTAKE Complete, 7 Bugs Registered → PLANNING

**From:** INTAKE agent  
**Date:** 2026-11-05  
**Session scope:** Intake of 7 bugs from 3 sources (owner-reported, cross-branch investigation, CR-482 QA)  
**Next agent role:** PLANNING (Gate 2-3)

---

## 1. What was done this session

Registered **7 new BUGs** (BUG-645 through BUG-651). No CRs. No code changes.

Updated CR-482 status to `GATE_5B_QA_FAIL` based on the P6–P10 QA report.

All intake docs, investigation references, QA report, registry.json, and BUG_TRACKER.md are synced.

---

## 2. The 7 bugs — prioritised for Planning

### BATCH A: Tax bugs (CRITICAL — must batch together, same 4 files)

| ID | Sev | Risk | Title | ODs open? | Files |
|---|---|---|---|---|---|
| **BUG-646** | P0 | CRITICAL | Inclusive tax double-counted in Grand Total | **YES — 2** | CollectPaymentPanel.jsx, orderTransform.js, OrderEntry.jsx, CartPanel.jsx |
| **BUG-647** | P0 | CRITICAL | GST OFF — payload still sends gst_tax + inflated order_amount | **YES — 2** | orderTransform.js, OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx |

**Planning note:** BUG-646 and BUG-647 share all 4 files and have overlapping edit sites. They MUST be planned and implemented as one batch. The investigation report at `memory/evidence/BUG-646-647_TAX_INCL_GST_OFF_INVESTIGATION_REPORT_2026_11_05.md` contains exact line numbers, break-points, and a 5-file scope of fix (~50 lines total). Use it as the primary source for Gate 2 Impact Analysis.

**BLOCKER — 4 ODs must be answered before Planning can write the plan:**

| OD | Question | In intake doc |
|---|---|---|
| OD-646-01 | Mixed orders (some inclusive, some exclusive): should TAXES label say "(incl.)" next to the inclusive portion? | BUG-646 intake |
| OD-646-02 | Should `order_sub_total_without_tax` in the payload subtract inclusive tax? | BUG-646 intake |
| OD-647-01 | When GST OFF, should per-item `gst_amount` be `"0.00"` or preserved for backend accounting? | BUG-647 intake |
| OD-647-02 | When GST OFF, should SC/Tip/Delivery GST also be zeroed? | BUG-647 intake |

### BATCH B: CR-482 QA BLOCKER (CRITICAL — blocks P6 smoke)

| ID | Sev | Risk | Title | ODs open? | Files |
|---|---|---|---|---|---|
| **BUG-648** | P0 | CRITICAL | Weight popup pre-fill not selected → ₹4,60,230 money bug | **YES — 1** | WeightEntryModal.jsx |

**Planning note:** Small fix (~5 lines, add `onFocus` select-all to weight input). NOT Fast Lane because the money risk is CRITICAL even though scope is small. Investigation already done in the QA report. One OD:

| OD | Question | In intake doc |
|---|---|---|
| OD-648-01 | Fix for everyone (shortcuts ON or OFF) or only when shortcuts ON? The same append issue exists with mouse — just less likely. | BUG-648 intake |

### BATCH C: Reports — partial payment filter (P1)

| ID | Sev | Risk | Title | ODs open? | Files |
|---|---|---|---|---|---|
| **BUG-645** | P1 | MEDIUM | Payment filter shows wrong amount for split (partial) payments | **No — all closed** | AllOrdersReportPage.jsx, OrderReportBetaPage.jsx, (reportTransform.js) |

**Planning note:** ODs all closed. Investigation complete with exact root cause and line numbers in `memory/handover/HANDOVER_TO_INTAKE_PARTIAL_PAYMENT_FILTER_2026_11_05.md` and intake doc. Ready for Gate 2 IA immediately — no blockers. 2-3 files, financial display (R6), NOT Fast Lane eligible.

### BATCH D: CR-482 QA MINOR fixes (LOW — can be deferred)

| ID | Sev | Risk | Title | ODs open? | Files | Fast Lane? |
|---|---|---|---|---|---|---|
| **BUG-649** | P2 | LOW | +/- typed into search when no last-added item | No | OrderEntry.jsx | **NO** (R5 hotspot) |
| **BUG-650** | P3 | LOW | Ctrl+↓ lands on top row vs newest — doc/code mismatch | **YES — 1** | OrderEntry.jsx | **NO** (R5 hotspot) |
| **BUG-651** | P3 | LOW | Cart-row highlight clipped (CSS) | No | index.css | **YES** |

**Planning note:**
- BUG-649: 1-2 lines (`e.preventDefault()` on skip path). R5 file → full gate, but trivial change.
- BUG-650: Owner must answer OD-650-01 first (keep top row or switch to newest?). If doc-only fix, no code change needed.
- BUG-651: Only genuine Fast Lane candidate. CSS-only fix in `index.css` (outline → box-shadow or ring). Owner approval needed for Fast Lane.
- BUG-649 + BUG-650 both touch OrderEntry.jsx — batch them together if planned in the same session.

---

## 3. Recommended Planning order

```
1. Answer ODs first:
   - OD-646-01, OD-646-02, OD-647-01, OD-647-02 (tax batch — 4 questions)
   - OD-648-01 (weight popup — 1 question)
   - OD-650-01 (Ctrl+↓ target — 1 question)

2. Then plan in priority order:
   BATCH A: BUG-646 + BUG-647 (P0, CRITICAL, same files → 1 combined plan)
   BATCH B: BUG-648 (P0, CRITICAL, 1 file)
   BATCH C: BUG-645 (P1, MEDIUM, ready now — no ODs blocking)
   BATCH D: BUG-649 + BUG-650 + BUG-651 (P2-P3, LOW, can batch or defer)
```

**BUG-645 can be planned immediately** — it has no open ODs and the investigation has all the details.

---

## 4. Files to read (PLANNING boot)

### Mandatory reads
| # | File | Why |
|---|---|---|
| 1 | `memory/control/AGENT_PROMPT_ALPHA.md` | Role 2 PLANNING playbook |
| 2 | `memory/control/CONTROL_DASHBOARD.md` | Current state |
| 3 | `memory/control/FILE_OWNERSHIP.md` | Conflict check — all 4 batches touch R5 hotspot files |
| 4 | `memory/control/OPEN_GAPS_REGISTER.md` | Related open gaps |

### Per-batch reads
| Batch | Intake doc(s) | Investigation / evidence |
|---|---|---|
| A (tax) | `change_requests/BUG-646_INCLUSIVE_TAX_DOUBLE_COUNTED_GRAND_TOTAL_INTAKE.md` | `evidence/BUG-646-647_TAX_INCL_GST_OFF_INVESTIGATION_REPORT_2026_11_05.md` |
| | `change_requests/BUG-647_GST_OFF_PAYLOAD_STILL_SENDS_GST_INTAKE.md` | (same investigation report) |
| B (weight) | `change_requests/BUG-648_WEIGHT_POPUP_PREFILL_NOT_SELECTED_INTAKE.md` | `test_reports/CR-482_QA_REPORT_P6_P10_2026_11_05.md` (F4 section) |
| C (reports) | `change_requests/BUG-645_PARTIAL_PAYMENT_FILTER_WRONG_AMOUNT_INTAKE.md` | `handover/HANDOVER_TO_INTAKE_PARTIAL_PAYMENT_FILTER_2026_11_05.md` |
| D (kbd minor) | `change_requests/BUG-649_PLUS_MINUS_TYPED_INTO_SEARCH_INTAKE.md` | `test_reports/CR-482_QA_REPORT_P6_P10_2026_11_05.md` (F1/F2/F3) |
| | `change_requests/BUG-650_CTRL_DOWN_TARGET_ROW_MISMATCH_INTAKE.md` | |
| | `change_requests/BUG-651_CART_ROW_HIGHLIGHT_CLIPPED_INTAKE.md` | |

### Source files to trace (per batch)
| Batch | Source files |
|---|---|
| A | `CollectPaymentPanel.jsx` (L279-317, L808), `orderTransform.js` (L648-935), `OrderEntry.jsx` (L886-925), `CartPanel.jsx` (L389-451) |
| B | `WeightEntryModal.jsx` (L119, L183-197) |
| C | `AllOrdersReportPage.jsx` (L418-430, L1030, L1177), `OrderReportBetaPage.jsx` (L165, L456, L581), `reportTransform.js` (L851-857, L1109-1111) |
| D | `OrderEntry.jsx` (P8 handler, L637-639), `index.css` (L2), `CartPanel.jsx` (L231) |

---

## 5. Conflict warnings

- **BATCH A vs BATCH D:** Both touch `OrderEntry.jsx` and `CartPanel.jsx`. If planned in the same sprint, declare execution order (A before D recommended — A is higher risk and changes more lines).
- **BATCH A internally:** BUG-646 and BUG-647 overlap on every file. MUST be one combined plan, not two separate plans.
- **BUG-649 + BUG-650:** Both touch `OrderEntry.jsx`. Batch them in one plan.

---

## 6. Open items NOT in this handover

- **CR-482 P11–P26:** Remaining keyboard shortcut phases. Parked until P6–P10 bugs are fixed and smoke passes.
- **BUG-642, BUG-643:** PWA back nav + Credit sheet close — registered in previous session, GATE_1_INTAKE_FROZEN. Not in this batch.
- **cafe103 order #021102 on table C1** is still open on preprod (from QA testing). Not blocking anything but worth knowing.

---

## 7. Environment

- Frontend: running, compiles clean (1 pre-existing warning)
- preprod.mygenie.online: was up during QA (200 OK)
- Test logins: `owner@cafe103.com`, `owner@kashisweetsnsnacks.com` (passwords in test_credentials.md or QA report)
- Preview URL: from `/app/frontend/.env` `REACT_APP_BACKEND_URL`
