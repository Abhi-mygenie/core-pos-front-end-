# Session Handover — BUG-400 + BUG-401 Intake CLOSED

```
Written:         2026-09-15
Status at close: INTAKE COMPLETE for BUG-400 + BUG-401. All ODs registered. Awaiting owner answers before Gate 2.
Next agent role: PLANNING — Gate 2 (Impact Analysis) after owner answers ODs below.
Workspace:       /app  (branch 14sep, frontend-only)
```

---

## 1. What was done this intake session

| Task | Result |
|---|---|
| Pulled 15sepqa branch | 10 QA reports + .qa_tok into `/app/memory/test_reports/` |
| T2 — Registry Gate 5b | 86 items advanced to GATE_5B_QA_PASS (2026-09-15) |
| T3 — CR_REGISTRY + BUG_TRACKER | Both updated with batch pass section |
| BUG-400 registered | P1 MEDIUM — Header Add button hit-target overlap |
| BUG-401 registered | P0 BLOCKER CRITICAL — PMS Checkout omits room_gst_tax |
| F-04/F-05/F-06 ODs mapped | Added to BUG-400 and BUG-401 intake docs |
| Regression BATCH-10 | ❌ FAIL — 53/56 PASS. Blockers: BUG-401. Major: BUG-400. |

No source code changed this session.

---

## 2. Open Decisions — ALL must be answered before Gate 2 can start

### BUG-400 (P1, MEDIUM — Fast Lane eligible)

| OD | Question | Options |
|---|---|---|
| **OD-400-01** | Fix option for Add button overlap | **A)** `overflow-hidden` on search container (recommended) · **B)** `min-w-0` on input |
| **OD-400-02** | Room Orders Y-axis ticks show colliding values on low ranges | **A)** Fix tick formatter · **B)** Ship as-is |

### BUG-401 (P0, CRITICAL R6 — full gate flow)

| OD | Question | Options |
|---|---|---|
| **OD-401-01** | Gate 3 GO for 2-line checkout GST fix | **Approve** / **Hold** |
| **OD-401-02** | Guest Folio "Total Balance Due" — should it include GST? | **A)** ₹1,000 (backend figure, no FE math) · **B)** ₹1,050 (room + GST, needs R6 approval OR backend fix) |
| **OD-401-03** | Night Audit + Revenue Dashboard — no sidebar or back button | **A)** Add Sidebar + Back button (consistent with other PMS pages) · **B)** Keep shell-less |
| **OD-401-04** | Revenue Dashboard fires 2 API requests on mount | **A)** Fix double-fetch · **B)** Ship as-is |

---

## 3. Intake final response

```
Intake complete: BUG-400
Classification: BUG, Severity: P1, Risk: MEDIUM
Duplicate check: DISTINCT
Evidence: QA-FOUND BATCH-10 F-01 — Playwright hit-target capture
Blast radius: SMALL (1 file, ≤2 lines, Fast Lane eligible)
Docs updated: change_requests/BUG-400_HEADER_ADD_BUTTON_COVERED_BY_SEARCH_INPUT_INTAKE.md
              registry.json · BUG_TRACKER.md
Next: OD-400-01 + OD-400-02 from owner → Fast Lane fix (Gate 4 direct)

Intake complete: BUG-401
Classification: BUG, Severity: P0, Risk: CRITICAL (R6)
Duplicate check: DISTINCT (RELATED BUG-386)
Evidence: QA-FOUND BATCH-10 F-02 — Playwright payload capture + curl probes
Blast radius: SMALL (2 files: PmsCheckoutDrawer.jsx + orderTransform.js R5)
Docs updated: change_requests/BUG-401_PMS_CHECKOUT_OMITS_ROOM_GST_INTAKE.md
              registry.json · BUG_TRACKER.md
Next: OD-401-01..04 from owner → Planning Gate 2 (Impact Analysis)
```

---

## 4. All artifacts updated

| Artifact | Change |
|---|---|
| `memory/test_reports/QA_REPORT_BATCH01–10_2026_09_15.md` | 10 QA reports pulled from 15sepqa |
| `memory/control/registry.json` | 86 items → Gate 5b + BUG-400/401 registered (655 total) |
| `memory/control/CR_REGISTRY.md` | Batch pass section added + regression fail noted |
| `memory/control/BUG_TRACKER.md` | Batch pass section + BUG-400/401 rows added |
| `memory/change_requests/BUG-400_*.md` | Intake doc with OD-400-01/02 |
| `memory/change_requests/BUG-401_*.md` | Intake doc with OD-401-01/02/03/04 |

---

## 5. Source code: unchanged

`diff -rq /tmp/qa-branch/frontend/src/ /app/frontend/src/` = 0 differences. QA agent made no code changes.

---

*Handover written 2026-09-15 · Intake agent (ALPHA v0.7)*
*Next: Owner answers OD-400-01/02 + OD-401-01/02/03/04 → PLANNING Gate 2 for each bug*
