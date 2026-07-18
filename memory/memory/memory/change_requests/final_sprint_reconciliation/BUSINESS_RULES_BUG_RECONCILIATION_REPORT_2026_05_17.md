# Business Rules vs Bug Analysis Reconciliation Report — 2026-05-17

## 1. Purpose

POS2.0 BUG-050 to BUG-086 were analyzed in bug-impact form before the new frozen Business Rules Baseline was available as the primary reconciliation target. This report reconciles those already-written bug findings against the current baseline and pending-freeze register so the next agent can clearly separate:

- bugs that already match frozen business rules,
- bugs that are already captured in pending freeze,
- bugs that expose missing business rules,
- bugs that still need owner or backend source-of-truth decisions,
- bugs that are safe for implementation planning now,
- bugs that must stay blocked.

Run details:

- **Sprint / batch:** POS2.0
- **Selected bug range:** BUG-050 to BUG-086
- **Update mode:** `pending_only_report_only`
- **Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- **Branch:** `17-may`

---

## 2. Inputs Used

- **Sprint / batch:** POS2.0
- **Bug range:** BUG-050 to BUG-086
- **Source analysis file:** `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md`
- **Business rules baseline:** `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`
- **Pending freeze register:** `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- **Baseline creation report:** `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BASELINE_CREATION_REPORT_2026_05_15.md`
- **Output report:** `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`
- **Update mode:** `pending_only_report_only`
- **Repo / branch:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` / `17-may`
- **Special high-risk areas:** tax, GST/VAT, delivery_charge_gst, service-charge GST, tip, partial_payments, payment amount, grant amount, polling/socket, print template, dashboard counts, CRM autofill, room billing, backend contract, customer-visible P0 behavior
- **Special bug IDs:** BUG-075, BUG-079, BUG-080, BUG-082, BUG-083, BUG-084, BUG-085

---

## 3. Repo / Codebase Status

- **Repo URL used:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- **Branch used:** `17-may`
- **Commit hash after fresh clone:** `056bdb24c8ad762fee21dac25a91bd13ad2083ab`
- **Clone time (UTC):** `2026-05-16T18:56:13Z`
- **`/app` wiped and fresh cloned:** Yes
- **Working tree clean after clone:** Yes
- **Code inspection performed:** Yes — targeted evidence verification only (no source edits)

---

## 4. Documents Read

### 4.1 Baseline docs read
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`
- `/app/memory/final/FINAL_DOCS_SUMMARY.md`

### 4.2 Overlay / accepted sprint docs read
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `/app/memory/change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### 4.3 Reconciliation / baseline-creation docs read
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BASELINE_CREATION_REPORT_2026_05_15.md`
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_APPROVAL_SETUP_HANDOVER_2026_05_16.md`
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_OWNER_APPROVAL_RECONCILIATION_AND_BUG_HANDOFF_2026_05_16.md`

### 4.4 Bug analysis read
- `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md`

### 4.5 Required-source files attempted but missing after fresh clone
- `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_CANDIDATE_2026_05_15.md` — missing
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_CANDIDATE_2026_05_15.md` — missing
- `/app/memory/**/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md` — not present anywhere in the fresh clone
- `/app/memory/**/BUSINESS_LOGIC_OWNER_APPROVAL_SESSION_2026_05_16.md` — not present anywhere in the fresh clone

> **Evidence note:** `BUSINESS_RULE_APPROVAL_SETUP_HANDOVER_2026_05_16.md` says the nested `/app/memory/memory/...` files existed in an earlier environment. In this fresh clone they are absent. Reconciliation therefore relied on the frozen baseline, pending-freeze register, baseline-creation report, and owner handoff as the surviving documentary chain.

### 4.6 Code files inspected for targeted evidence verification
- `/app/frontend/src/hooks/useOrderPollingReconciliation.js`
- `/app/frontend/src/api/transforms/orderTransform.js`
- `/app/frontend/src/api/transforms/profileTransform.js`
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- `/app/frontend/src/api/socket/socketEvents.js`
- `/app/frontend/src/api/socket/socketHandlers.js`

### 4.7 Analysis-file internal inconsistency noted
- The bug analysis file header still says **"Bugs in scope (25): BUG-050 → BUG-074"**.
- The same file body actually contains **all 37 sections BUG-050 → BUG-086**, plus an updated cross-bug summary explicitly stating the second-batch addition.
- This reconciliation used the **actual 37 bug sections present on disk**.

---

## 5. Reconciliation Summary

| Category | Count |
|---|---:|
| Total selected bugs | 37 |
| Found in analysis file | 37 |
| Missing from analysis file | 0 |
| Matches frozen business rule | 1 |
| Deviates from frozen business rule | 0 |
| Business rule missing from baseline | 5 |
| Already in pending freeze | 5 |
| Needs owner decision before planning | 6 |
| Needs backend source-of-truth audit | 7 |
| Safe for implementation planning | 6 |
| Duplicate / already resolved | 4 |
| Block implementation planning | 3 |

Additional planning view used in this reconciliation:

- **Safe for implementation planning after reconciliation:** 11 bugs (`BUG-051, BUG-054, BUG-055, BUG-062, BUG-068, BUG-070, BUG-071, BUG-073, BUG-075, BUG-079, BUG-080`)
- **Blocked from implementation planning after reconciliation:** 22 bugs
- **Bugs needing explicit owner decision / clarification before planning:** 11 bugs
- **Bugs needing backend source-of-truth audit / contract confirmation:** 11 bugs

---

## 6. Bug-by-Bug Baseline Impact Table

| Bug | Current Analysis Verdict | Business Rule Classification | Secondary Tags | Baseline Reference | Pending Freeze Reference | Planning Recommendation | QA Implication |
|---|---|---|---|---|---|---|---|
| BUG-050 | FE print-parity bug; owner repro still missing | business_rule_missing_from_baseline | print_logic, payment_logic, tax_logic, QA_business_rule_assertion_required, customer_visible_P0 | No frozen rule defining manual reprint source-of-truth after cancellation/discount changes | — | **Block** pending owner payload/screenshots + parity rule | Compare dashboard-card bill vs Collect Bill bill after cancellation/discount/tip |
| BUG-051 | Round-off rule reversal to always-ceil | already_in_pending_freeze | financial_logic, payment_logic, QA_business_rule_assertion_required | Frozen ROUND-002 covers scope only; always-ceil rule not promoted | Part A2 — ROUND-001 / linked BUG-002 | **Safe** to plan as pending-freeze alignment item | Verify 105.05 and 105.15 both round to 106 |
| BUG-052 | Needs profile-driven round-off config contract | needs_backend_source_of_truth_audit | payment_logic, backend_contract | No frozen configurable round-off rule | — | **Block** until profile field name/enum/default confirmed | No config-based QA until backend contract is known |
| BUG-053 | Likely stale/ambiguous GST-label report; owner screenshot needed | needs_owner_decision_before_planning | tax_logic, owner_smoke_required | Item-GST mixed-rate no-label behavior already matches current code | — | **Block** pending owner screenshot / exact row identification | Capture offending row before changing any label logic |
| BUG-054 | VAT discount proration should mirror GST | matches_frozen_business_rule | tax_logic, financial_logic, QA_business_rule_assertion_required | Frozen TAX-003 + TOTALS-002 support VAT/GST parity on taxable base | — | **Safe** to plan | Verify discounted VAT order recalculates `vat_tax` |
| BUG-055 | Prepaid payload missing `order_discount_type` | safe_for_implementation_planning | payment_logic, backend_contract, QA_business_rule_assertion_required | No business-rule conflict; payload-parity issue only | — | **Safe** to plan | Compare prepaid vs postpaid payload key parity |
| BUG-056 | Preset discount categories fetched but not rendered | needs_owner_decision_before_planning | payment_logic | No baseline rule for preset-discount picker UX or stacking rule | — | **Block** pending owner picker UX / exclusivity choice | QA only after approved picker behavior is defined |
| BUG-057 | Prepaid Print Bill missing on some surfaces; BUG-005 intent reversed | needs_owner_decision_before_planning | print_logic, payment_logic | No frozen rule for prepaid manual reprint surface | — | **Block** pending owner confirmation of approved surfaces/layout | Verify Print Bill only on approved prepaid surfaces |
| BUG-058 | Hold-prepaid collect uses wrong endpoint/contract | needs_backend_source_of_truth_audit | payment_logic, backend_contract, customer_visible_P0 | No frozen rule for prepaid-hold collect endpoint | — | **Block** until backend confirms endpoint + method contract | Verify prepaid Hold collect succeeds without API error |
| BUG-059 | Audit Report historical Print Bill missing | business_rule_missing_from_baseline | print_logic, owner_smoke_required | No rule covering historical reprint surface, permission, or cancelled-bill behavior | — | **Block** pending owner rule on surface/permissions/content | Verify print appears only on approved audit tabs/surfaces |
| BUG-060 | Transfer-to-room leaves source table occupied | needs_backend_source_of_truth_audit | room_logic, polling_socket_logic, backend_contract, customer_visible_P0 | OD-02 deferred room lifecycle intersects; no frozen source-table-free rule | — | **Block** until socket/event source-of-truth is confirmed | Verify source table frees exactly once and room order appears |
| BUG-061 | Room check-in time visibility scope unclear | business_rule_missing_from_baseline | room_logic | No baseline rule defining where room check-in time must appear | — | **Block** pending owner surface choice | Verify only approved report surface shows check-in time |
| BUG-062 | Takeaway/delivery should not expose To-Room transfer | safe_for_implementation_planning | room_logic, payment_logic, QA_business_rule_assertion_required | No frozen business-rule conflict; straightforward UI gate | — | **Safe** to plan | Verify takeaway/delivery hide To Room; dineIn/walkIn remain allowed |
| BUG-063 | Room bill payload missing room fields | needs_backend_source_of_truth_audit | room_logic, print_logic, backend_contract, customer_visible_P0 | ROOM-001 freezes room-report totals only; OD-02 room print lifecycle still deferred | — | **Block** until owner field list + backend template keys are confirmed | Verify room bill shows approved fields without changing ROOM-001 math |
| BUG-064 | Room transfer notifications look like new orders | needs_backend_source_of_truth_audit | room_logic, polling_socket_logic, backend_contract | No frozen rule for room-transfer notification semantics | — | **Block** until FCM/socket marker + owner message/sound choice are confirmed | Verify transfer uses approved banner/sound and not generic new-order tone |
| BUG-065 | Corporate room GST/name captured but not echoed to bill | needs_backend_source_of_truth_audit | room_logic, print_logic, tax_logic, backend_contract, customer_visible_P0 | OD-02 deferred; no frozen rule for corporate room GST bill slots | — | **Block** until response echo + template mapping are confirmed | Verify corporate room bill shows firm fields only when applicable |
| BUG-066 | Likely already blocked correctly; owner surface unclear | needs_owner_decision_before_planning | room_logic | Current inspected transfer surfaces already exclude rooms | — | **Block** pending owner repro / remaining-surface verification | QA needs exact modal/surface reproduction before change |
| BUG-067 | Station toggle should depend on "ready" configuration | business_rule_missing_from_baseline | dashboard_logic | No baseline rule defining readiness precondition for station-view enablement | — | **Block** pending owner definition of readiness + preferred UX | Verify disabled/auto-revert behavior on unready tenants |
| BUG-068 | Missed scan orders after reconnect need rehydration | safe_for_implementation_planning | polling_socket_logic, QA_business_rule_assertion_required | Additive to frozen POLL-001 / POLL-004 behavior | — | **Safe** to plan | Disconnect/reconnect and confirm pending Scan & Order popup appears |
| BUG-069 | Sound-before-order race needs architecture choice | needs_owner_decision_before_planning | polling_socket_logic, customer_visible_P0 | No business baseline on cross-channel sequencing; architecture choice required | — | **Block** pending owner choice (queued-FCM vs socket-driven sound) | Verify chosen sequencing model only after architecture decision |
| BUG-070 | Area grouping missing in room/channel views | safe_for_implementation_planning | dashboard_logic | No business-rule conflict; presentation-only grouping | — | **Safe** to plan | Verify area headers/grouping in table/channel views for tables + rooms |
| BUG-071 | DB ID still leaks on human-visible surfaces | safe_for_implementation_planning | customer_visible_P0, QA_business_rule_assertion_required | No business-rule conflict; display-only if payload IDs stay unchanged | — | **Safe** to plan with full grep audit | Verify all human-visible surfaces use `restaurant_order_id` |
| BUG-072 | Room/table/item note taxonomy unclear | business_rule_missing_from_baseline | room_logic, backend_contract, customer_visible_P0 | No baseline rule defining separate note types or render surfaces | — | **Block** pending backend field existence + owner taxonomy/surface decision | Verify only approved note categories render on order cards |
| BUG-073 | Empty customization placeholder line in cart | safe_for_implementation_planning | QA_business_rule_assertion_required | No business-rule conflict | — | **Safe** to plan | Verify no empty line when no variation/add-on selected |
| BUG-074 | Remember Me request is security-sensitive policy choice | needs_owner_decision_before_planning | owner_smoke_required | No baseline rule; outside current business baseline and security-sensitive | — | **Block** pending owner choice on password vs session/browser behavior | QA only after security-approved behavior is selected |
| BUG-075 | Tip/tip GST should not apply to takeaway/delivery | already_in_pending_freeze | payment_logic, tax_logic, QA_business_rule_assertion_required, customer_visible_P0 | Frozen TIP-001/TIP-002 do not settle order-type applicability | Part A1 — TIP-003 / linked BUG-001 | **Safe** to plan as pending-freeze alignment item | Verify tip hidden/zero on takeaway/delivery, preserved on dineIn/walkIn/room |
| BUG-076 | Exact duplicate of BUG-051 | duplicate_or_already_resolved | financial_logic | Same round-off area as BUG-051 | Part A2 — ROUND-001 / linked BUG-002 | No separate planning; fold into BUG-051 | Close with BUG-051 smoke result |
| BUG-077 | Mobile trim before CRM lookup already appears implemented | duplicate_or_already_resolved | CRM_logic | Pending PAY-009(a) looks stale vs current code | Part B14 — PAY-009 / linked BUG-003 | No new planning unless owner reproduces a real trim miss | Verify whitespace phone lookup before retiring pending item |
| BUG-078 | Timeout error visibility rule already captured, but UX details still open | already_in_pending_freeze | CRM_logic, QA_business_rule_assertion_required | No frozen rule; approved amended PAY-009 already captures visible timeout error | Part B14 — PAY-009 / linked BUG-004 | **Block** pending owner retry/noise preference, even though the core rule is already pending-freeze | Distinguish timeout/network failure from genuine "not found" |
| BUG-079 | 2-miss removal should be 1 miss | already_in_pending_freeze | polling_socket_logic, QA_business_rule_assertion_required | Frozen POLL-001/POLL-004 preserved; threshold itself remains unfrozen | Part B12 — POLL-002 / linked BUG-005 | **Safe** to plan as pending-freeze alignment item | Remove after first missed successful poll while preserving Hold/open-order protections |
| BUG-080 | `partial_payments` should respect configured modes | already_in_pending_freeze | payment_logic, backend_contract, QA_business_rule_assertion_required | No frozen conflict; approved amended PAY-003 already exists | Part B8 — PAY-003 / linked BUG-006 | **Safe** to plan with explicit tab/credit caveat | Verify only enabled modes appear and out-of-scope tab/credit stays unchanged |
| BUG-081 | Snooze already 120000ms; stale comment only | duplicate_or_already_resolved | scan_order_logic | Pending SCAN-002 may already be code-aligned | Part B9 — SCAN-002 / linked BUG-007 | No new planning unless owner identifies another snooze surface | Verify actual duration before retiring pending item |
| BUG-082 | Socket index-4 / `order_from` meaning is ambiguous | needs_backend_source_of_truth_audit | scan_order_logic, polling_socket_logic, backend_contract, QA_business_rule_assertion_required | Pending SCAN-003 exists, but exact contract semantics are still unclear | Part B10 — SCAN-003 / linked BUG-008 | **Block** until owner/backend confirm the authoritative socket contract | Verify popup/web counter use only the approved source-of-truth |
| BUG-083 | Need separate `delivery_charge_gst_amount` key | block_implementation_planning | tax_logic, payment_logic, backend_contract, QA_business_rule_assertion_required, customer_visible_P0 | DEL-001/002/003 intentionally excluded from frozen baseline | Part B5-B7 — DEL-001/002/003 / linked BUG-009 | **Block** until backend confirms key name + composite-retention rule | Verify separate delivery GST key and unchanged non-delivery totals |
| BUG-084 | Need per-component CGST/SGST payload split | block_implementation_planning | tax_logic, print_logic, backend_contract, QA_business_rule_assertion_required | TAX-006 intentionally excluded from frozen baseline | Part B2 — TAX-006 / linked BUG-010 | **Block** until backend confirms per-component key names + composite policy | Verify each GST component splits 50/50 and sums correctly |
| BUG-085 | Printed bill needs full GST component breakdown | block_implementation_planning | tax_logic, print_logic, backend_contract, QA_business_rule_assertion_required, customer_visible_P0 | TAX-007 intentionally excluded from frozen baseline; template adoption not frozen | Part B3 — TAX-007 / linked BUG-011 | **Block** until backend template + owner receipt UX are approved | Verify print matches approved breakdown and avoids double-counting |
| BUG-086 | Room grand-total key already documented as `order_amount` | duplicate_or_already_resolved | room_logic, backend_contract | Pending TOTALS-003 looks stale vs current code comment citing 2026-04-25 user confirmation | Part B11 — TOTALS-003 / linked BUG-012 | No separate planning unless owner says key changed | Verify room-with-balance payload still uses the approved key before retiring pending item |

---

## 7. Frozen Baseline Deviations

**No bug from BUG-050 to BUG-086 was confirmed to directly contradict a rule already promoted into `BUSINESS_RULES_BASELINE_FINAL.md`.**

The highest-risk reconciliation deviations instead sit against:

- pending-freeze rules not yet promoted,
- current code anti-rules/comments still carrying pre-baseline behavior,
- OD-02 room lifecycle deferral,
- backend contract uncertainty.

These are logged below so they do **not** get silently promoted into the frozen baseline.

| Bug | Frozen Rule Affected | Proposed / Observed Behaviour | Why It Deviates | Required Resolution |
|---|---|---|---|---|
| BUG-051 / BUG-076 | No direct frozen-rule breach; pending ROUND-001 boundary | Always-ceil round-off requested; code/comments still enforce conditional ceil/floor. | The corrected round-off rule is owner-approved but still parked in pending freeze, not in the frozen baseline. | Implement against pending ROUND-001 only; keep final baseline untouched this run. |
| BUG-075 | No direct frozen-rule breach; pending TIP-003 boundary | Tip/tip GST must be zero on takeaway/delivery. | Frozen TIP-001/TIP-002 do not define order-type applicability; TIP-003 remains pending-freeze only. | Implement against pending TIP-003; do not backfill baseline yet. |
| BUG-079 | No direct frozen-rule breach; pending POLL-002 boundary | One-miss removal requested; code anti-rule still says two misses. | The threshold was never promoted into the frozen baseline; current code still reflects the older anti-rule. | Treat POLL-002 as the rule source and update comments/tests with the code change. |
| BUG-082 | No direct frozen-rule breach; pending SCAN-003 boundary | Owner asks to use "index 4 as primary" for web source. | Current socket contract on disk still defines index 4 as payload, with a fallback workaround for missing `order_from`. | Backend must confirm exact socket contract before any parser/fallback change. |
| BUG-083 / BUG-084 / BUG-085 | No direct frozen-rule breach; CR-013 Phase-3 boundary | Separate delivery GST key + per-component GST split + print breakdown requested. | These GST enhancements were intentionally excluded from the frozen baseline and deferred as Phase 3 / backend-template work. | Keep blocked until backend field names/template support are confirmed; do not promote into final baseline in this run. |

---

## 8. Missing Business Rules Found

| Bug | Missing Business Rule | Risk If Not Documented | Recommended Destination |
|---|---|---|---|
| BUG-050 | Manual bill reprint source-of-truth after cancellation/discount/tip changes | Different print entry points will continue to emit different customer-visible bills for the same order. | pending freeze |
| BUG-059 | Historical bill reprint scope, permissions, and cancelled-order content | Audit reprint could be added inconsistently across Paid/Cancelled/Completed flows. | pending freeze |
| BUG-061 | Exact report surface for room check-in time | Teams may add the field to the wrong report or re-open CR-001 room-report decisions unintentionally. | pending freeze |
| BUG-067 | Station-view readiness precondition | Operators can enable a dead/empty station surface with no shared rule for when that is allowed. | pending freeze |
| BUG-072 | Note taxonomy and render priority (`room_note` / `table_note` / item note) | FE/BE can drift into different note models with conflicting UI expectations. | pending freeze |

---

## 9. Pending Owner Decisions

| Bug / Item | Decision Needed | Options If Known | Recommendation If Supported | Planning Impact |
|---|---|---|---|---|
| BUG-050 | Confirm manual bill reprint source-of-truth and provide mismatch evidence | Collect Bill parity vs legacy reconstruction | Prefer Collect Bill/live-total parity if owner confirms | Blocks planning |
| BUG-053 | Confirm which GST row actually shows the unwanted percentage | Item row vs SC row vs Tip row vs Delivery row | Capture screenshot first; likely already resolved for item rows | Blocks planning |
| BUG-056 | Pick preset-discount UI and stacking rule | Dropdown / quick-select / separate rail; stacked vs mutually exclusive | Keep it simple: single picker + explicitly documented stacking rule | Blocks planning |
| BUG-057 | Approve prepaid Print Bill surfaces/layout | Add alongside Settle vs replace vs only one surface | Additive alongside Settle is safest if owner wants parity | Blocks planning |
| BUG-059 | Choose historical Print Bill UX + permission gate | Row action vs detail-sheet action; manager-only vs broader | Prefer one controlled surface + explicit role gate | Blocks planning |
| BUG-061 | Choose target surface for room check-in time | Audit Report vs Rooms Report vs room-child rows | Prefer one named surface only to avoid CR-001 scope drift | Blocks planning |
| BUG-066 | Confirm exact transfer surface still allowing rooms | Transfer item modal vs merge/shift vs another surface | Reproduce first; likely duplicate of BUG-062 or already resolved | Blocks planning |
| BUG-067 | Define "restaurant ready configuration completed" | Stations configured vs broader readiness flag | Prefer explicit stations-configured rule unless owner says otherwise | Blocks planning |
| BUG-069 | Choose ordering model for sound vs render | Option 1 queued/coordinated; Option 2 socket-driven sound; hybrid | Prefer coordinated queue if Firebase remains canonical | Blocks planning |
| BUG-072 | Define note taxonomy and display surface | Separate room/table/item notes vs single `order_note` | Prefer explicit taxonomy only if backend already supports it | Blocks planning |
| BUG-074 | Choose Remember Me behavior | Password storage vs browser autofill vs token-based session vs extended session | Prefer browser/token-based approach; avoid password-in-localStorage | Blocks planning |

---

## 10. Backend Source-of-Truth Audit Items

| Bug / Item | Field / Flow | FE Behaviour | Backend Question | Risk | Required Backend Evidence |
|---|---|---|---|---|---|
| BUG-052 | Round-off profile config | FE hardcodes round-off instead of reading profile config | What is the exact profile field name / enum / default for round-off behavior? | Medium | Profile API sample + allowed values |
| BUG-058 | Prepaid Hold settlement | Audit drawer always uses `order-bill-payment` | Which endpoint/method contract settles prepaid-hold orders? | High | Endpoint path + sample request/response |
| BUG-060 | `order-shifted-room` lifecycle | FE relies on socket to free source table/order | Which socket events fire after transfer-to-room, and with which payloads? | High | Live socket trace after successful transfer |
| BUG-063 | Room bill field set | FE print builder emits only a small room subset | Which room-print field names does the backend template accept? | High | Template field list or backend print contract |
| BUG-065 | Corporate room GST fields | FE sends `firm_name` / `firm_gst`, but does not parse/render them downstream | Which response keys echo back, and which template slots should they populate? | High | `single-order-new` room payload sample + template mapping |
| BUG-072 | Room/table note fields | FE only has `order_note` + item notes today | Do separate `room_note` / `table_note` fields already exist on the backend? | Medium | API sample showing note fields or confirmation they do not exist |
| BUG-082 | Scan socket contract | FE uses index 4 as payload and a scan-channel fallback for web orders | Is index 4 still payload, or has a new primitive `order_from` contract been agreed? | High | Socket contract sample / backend confirmation |
| BUG-083 | `delivery_charge_gst_amount` | FE computes delivery GST locally but does not emit a separate key | Exact field name? Should composite `gst_tax` still include delivery GST? | High | Backend field contract + payload sample |
| BUG-084 | Per-component GST split keys | FE UI already computes half-splits but payload does not persist them | What are the approved per-component CGST/SGST key names, and are top-level composite keys retained? | High | Backend payload spec / template contract |
| BUG-085 | Print template amount source | FE can enrich payload, but template still renders composite GST only | Which new fields will the print template render, and how will double-counting be prevented? | High | Template diff or backend rendering spec |
| BUG-086 | Room grand-total key verification | FE comment says `order_amount` was user-confirmed on 2026-04-25 | Has the backend changed that key since the 2026-04-25 confirmation? | Medium | Current backend acceptance statement or payload echo proof |

---

## 11. QA Business Rule Assertions

| Bug | Business Rule Assertion | Test Flow | Expected Result | Evidence Required |
|---|---|---|---|---|
| BUG-079 | Polling threshold must match the approved rule | Remove an order from server poll output once and wait for the next successful poll | Order disappears after 1 miss only; Hold/open-order protections stay intact | Poll timestamps + dashboard evidence |
| BUG-083 | Delivery GST must not alter non-delivery totals | Compare delivery vs non-delivery orders after separate-key rollout | Delivery orders emit separate delivery-GST field; non-delivery orders remain numerically unchanged | Payload captures + total comparison |
| BUG-075 | Tip must appear only where approved by order type | Test takeaway, delivery, dine-in, walk-in, room | Tip/tip GST hidden+zero on takeaway/delivery; present only on approved order types | UI screenshots + payloads |
| BUG-080 | `partial_payments` must not break tab/credit if out of scope | Test cash-only, cash+UPI, and mixed enabled-mode tenants | Payload contains only enabled modes; no stray disabled modes; tab/credit stays unchanged unless separately approved | Payload diff across tenant configs |
| BUG-085 | Print template must not double-count GST components | Print bills on a tenant with item+SC+tip+delivery GST | Printed bill matches approved component breakdown exactly once per component | Printed bill + source payload comparison |
| BUG-082 | Socket popup must not trigger outside approved web flow | Fire approved web-origin socket event and compare with POS-origin event | Web popup/counter triggers only on the approved authoritative source | Socket payload sample + UI behavior |
| BUG-063 | Room billing/report totals must keep the frozen ROOM-001 math | Print room bill after adding room-context fields | ROOM-001 totals remain correct while new room fields are additive only | Room bill + room report comparison |
| BUG-078 | CRM autofill / timeout behavior must follow approved rule | Force CRM timeout and compare with a genuine “not found” lookup | Timeout shows visible retryable error; not-found still supports manual/new-customer path | UI evidence for both states |

---

## 12. Safe For Implementation Planning

| Bug | Why Safe | Constraints For Planning | QA Assertion Required |
|---|---|---|---|
| BUG-051 | Correct rule already captured in pending freeze; single-locus round-off change | Keep backend parity note + update pinned tests/comments | Always-ceil on all non-integer totals |
| BUG-054 | Clear FE financial bug; aligned with frozen VAT/GST parity | Touch VAT-only logic only; preserve non-discounted VAT flows | Discounted VAT order recalculates correctly |
| BUG-055 | Clear payload-parity gap | Check `updateOrder` in same plan | Prepaid/postpaid payload parity |
| BUG-062 | Clear UI gate; no rule ambiguity found | Preserve walk-in eligibility unless owner says otherwise | No To Room for takeaway/delivery |
| BUG-068 | Clear reconnect-rehydration gap | Must de-dupe to avoid double-adds | Reconnect restores missed web orders |
| BUG-070 | Clear presentation/data-shape gap | Keep Order View unchanged | Area grouping appears in approved views |
| BUG-071 | Clear display audit; payload IDs stay unchanged | Preserve `order_id` for API/test IDs | Human-visible IDs use restaurant order number |
| BUG-073 | Tiny UI-only condition fix | Preserve partial-customization rendering | No empty customization placeholder |
| BUG-075 | Correct rule already captured in pending freeze | Apply gate consistently in UI + payload + print paths | Tip/tip GST zero on takeaway/delivery |
| BUG-079 | Correct rule already captured in pending freeze | Preserve Hold/open-order protections and failure short-circuit | One-miss removal only |
| BUG-080 | Correct rule already captured in pending freeze | Record tab/credit caveat unless owner expands scope | `partial_payments` reflects enabled methods only |

---

## 13. Blocked From Implementation Planning

| Bug | Blocker | Required Resolution | Next Agent |
|---|---|---|---|
| BUG-050 | Missing print source-of-truth rule + owner evidence | Get paired payloads / bill screenshots and confirm parity target | Owner Decision Agent |
| BUG-052 | Backend profile contract missing | Confirm round-off field name / enum / default | Backend Contract Agent |
| BUG-053 | Repro ambiguity | Get screenshot / exact offending row | Owner Decision Agent |
| BUG-056 | UI rule not chosen | Approve preset-discount picker + stacking rule | Owner Decision Agent |
| BUG-057 | Prepaid print UX unresolved | Approve surface/layout for prepaid Print Bill | Owner Decision Agent |
| BUG-058 | Prepaid Hold settlement contract unclear | Confirm endpoint + method rules | Backend Contract Agent |
| BUG-059 | Historical reprint rule absent | Approve surface, permissions, cancelled-order behavior | Owner Decision Agent |
| BUG-060 | Source-table-free ownership unclear | Confirm socket/event source-of-truth after room transfer | Backend Contract Agent |
| BUG-061 | Reporting surface absent from baseline | Approve target surface for check-in time | Owner Decision Agent |
| BUG-063 | Room print field contract absent | Confirm required field list + template key names | Owner + Backend Coordination |
| BUG-064 | Transfer-notification contract absent | Confirm backend marker + owner message/sound | Owner + Backend Coordination |
| BUG-065 | Corporate room GST mapping absent | Confirm response echo + print slot mapping | Owner + Backend Coordination |
| BUG-066 | Surface not reproduced | Confirm exact modal/surface still allowing room transfer | Owner Decision Agent |
| BUG-067 | Readiness rule absent | Define "restaurant ready configuration" for station toggle | Owner Decision Agent |
| BUG-069 | Architecture choice pending | Choose queued-FCM vs socket-driven sound approach | Owner Decision Agent |
| BUG-072 | Note taxonomy / backend field existence unresolved | Confirm backend fields + owner taxonomy/surface | Owner + Backend Coordination |
| BUG-074 | Security-sensitive Remember Me rule unresolved | Choose password/browser/session policy | Owner Decision Agent |
| BUG-078 | Core rule pending-freeze, but UX still not chosen | Choose visible-error / retry policy | Owner Decision Agent |
| BUG-082 | Socket contract ambiguous | Confirm exact meaning of “index 4 as primary” | Owner + Backend Coordination |
| BUG-083 | BE-G9 field contract missing | Confirm separate delivery-GST key name + composite policy | Backend Contract Agent |
| BUG-084 | Per-component GST key contract missing | Confirm payload/template key names | Backend Contract Agent |
| BUG-085 | Backend print template + owner receipt UX missing | Confirm rendered fields and no-double-count template behavior | Owner + Backend Coordination |

---

## 14. Documentation Changes Made

- **Final baseline was not updated.**
- **Pending freeze doc was updated** with a dated reconciliation addendum:
  - `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- **Reconciliation report was created:**
  - `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`
- **No unrelated docs were updated.**
- **No source code was changed.**

---

## 15. Final Status

`business_rules_bug_reconciliation_complete_pending_only`
