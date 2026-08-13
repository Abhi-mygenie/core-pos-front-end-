# POS2.0 Remaining Blocked Bug Planning — 2026-05-17

## 1. Purpose

This is the **Phase 4 planning document** for the POS2.0 sprint. It classifies every remaining POS2.0 bug NOT already handled by Phase 1 (clean safe), Phase 2 (owner decision / business rule), or Phase 3 (backend source-of-truth / contract).

**Explicit scope constraints:**

- No implementation was done.
- No code was changed.
- No final baseline (`/app/memory/final/`) was updated.
- No pending freeze doc was updated.
- No bug tracker statuses were changed.
- This is NOT the master implementation plan.
- Code was inspected only where needed for classification evidence.

---

## 2. Inputs Read

### Baseline docs read
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### Business rules baseline
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### Pending freeze file
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`

### Reconciliation report
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`

### Bug impact analysis
- `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md`

### Phase 1 planning doc
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_CLEAN_SAFE_BUG_IMPLEMENTATION_PLAN_2026_05_17.md`

### Phase 2 planning and decision capture docs
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_PHASE_2_OWNER_DECISION_CAPTURE_2026_05_17.md`

### Phase 3 planning, question capture, and addendum docs
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_PHASE_3_OPEN_QUESTION_COMPLETION_ADDENDUM_2026_05_17.md`

### Code files inspected
- None inspected for this Phase 4 run. All evidence was drawn from the above documentation chain.

---

## 3. Phase Assignment Summary

| Phase | Bugs | Status |
|---|---|---|
| Phase 1 Clean Safe | BUG-051, BUG-054, BUG-055, BUG-062, BUG-068, BUG-070, BUG-071, BUG-073 | Excluded from Phase 4 |
| Phase 2 Owner Decision | BUG-075, BUG-079, BUG-080 | Excluded from Phase 4 |
| Phase 3 Backend Source-of-Truth | BUG-082, BUG-083, BUG-084, BUG-085 | Excluded from Phase 4 |
| Phase 4 Remaining | BUG-050, BUG-052, BUG-053, BUG-056, BUG-057, BUG-058, BUG-059, BUG-060, BUG-061, BUG-063, BUG-064, BUG-065, BUG-066, BUG-067, BUG-069, BUG-072, BUG-074, BUG-076, BUG-077, BUG-078, BUG-081, BUG-086 | Included |

---

## 4. Phase 4 Bug Set

| Bug | Source Found In | Original Verdict | Reconciliation Classification | Reason Included In Phase 4 |
|---|---|---|---|---|
| BUG-050 | Both analysis + reconciliation | FE print-parity bug; owner repro still missing | business_rule_missing_from_baseline | Missing print source-of-truth rule; blocked on owner evidence |
| BUG-052 | Both analysis + reconciliation | API contract + FE mapping issue | needs_backend_source_of_truth_audit | Backend profile field contract missing |
| BUG-053 | Both analysis + reconciliation | Likely already-resolved / config ambiguity | needs_owner_decision_before_planning | Owner screenshot / repro needed |
| BUG-056 | Both analysis + reconciliation | FE UI bug (incomplete feature) | needs_owner_decision_before_planning | Preset discount picker UX / stacking rule unchosen |
| BUG-057 | Both analysis + reconciliation | FE UI bug (prepaid branch missing Print Bill) | needs_owner_decision_before_planning | Prepaid Print Bill surfaces / layout unchosen |
| BUG-058 | Both analysis + reconciliation | API contract / endpoint-routing issue | needs_backend_source_of_truth_audit | Prepaid Hold settlement endpoint / method contract unclear |
| BUG-059 | Both analysis + reconciliation | FE feature gap (missing Print Bill in Audit) | business_rule_missing_from_baseline | Historical reprint rule absent from baseline |
| BUG-060 | Both analysis + reconciliation | Socket / state-sync bug | needs_backend_source_of_truth_audit | Backend socket/event source-of-truth after room transfer |
| BUG-061 | Both analysis + reconciliation | FE UI gap + scope ambiguity | business_rule_missing_from_baseline | No baseline rule for room check-in time reporting surface |
| BUG-063 | Both analysis + reconciliation | FE mapping + payload gap + OD-02 | needs_backend_source_of_truth_audit | Room print field contract absent; owner + backend needed |
| BUG-064 | Both analysis + reconciliation | Notification / FCM contract gap | needs_backend_source_of_truth_audit | Transfer-notification contract absent; owner + backend needed |
| BUG-065 | Both analysis + reconciliation | FE mapping + payload gap | needs_backend_source_of_truth_audit | Corporate room GST mapping absent; owner + backend needed |
| BUG-066 | Both analysis + reconciliation | Likely already resolved for some surfaces | needs_owner_decision_before_planning | Owner confirmed: food item transfer from order screen still allows rooms |
| BUG-067 | Both analysis + reconciliation | Configuration / validation gap | business_rule_missing_from_baseline | No baseline rule for station-view readiness precondition |
| BUG-069 | Both analysis + reconciliation | Architectural / coordination issue | needs_owner_decision_before_planning | Owner says: pass to backend — backend owns sound sequencing |
| BUG-072 | Both analysis + reconciliation | FE display gap + possible BE contract gap | business_rule_missing_from_baseline | Notes taxonomy / backend field existence unresolved |
| BUG-074 | Both analysis + reconciliation | FE behavior + policy decision (security) | needs_owner_decision_before_planning | Owner says: browser-native autofill only — verify behavior |
| BUG-076 | Both analysis + reconciliation | Duplicate of BUG-051 | duplicate_or_already_resolved | Same round-off scope as BUG-051 |
| BUG-077 | Both analysis + reconciliation | Likely already resolved | duplicate_or_already_resolved | Mobile trim appears already implemented |
| BUG-078 | Both analysis + reconciliation | FE UX gap | already_in_pending_freeze | Core rule in pending freeze but timeout UX still unchosen |
| BUG-081 | Both analysis + reconciliation | Likely already resolved (stale comment) | duplicate_or_already_resolved | Snooze already 120000ms; stale comment only |
| BUG-086 | Both analysis + reconciliation | Likely already resolved | duplicate_or_already_resolved | Room grand-total key already user-confirmed |

---

## 5. Phase 4 Classification Summary

| Classification | Count |
|---|---:|
| ready_for_master_plan_after_owner_answer | 7 |
| ready_for_master_plan_after_backend_answer | 4 |
| ready_for_master_plan_after_owner_and_backend_answer | 4 |
| qa_repro_required | 2 |
| duplicate_or_already_resolved | 4 |
| defer_from_pos2_0 | 0 |
| blocked_missing_evidence | 0 |
| candidate_for_master_plan_with_constraints | 1 |
| not_safe_for_sprint | 0 |

---

## 6. Owner Clarifications Captured

| Question ID | Bug | Question | Owner Answer | Selected Option | Classification Impact |
|---|---|---|---|---|---|
| P4-01 | BUG-066 | Is BUG-066 a duplicate of BUG-062, or is there a specific remaining surface? | "For food item transfer not order, its still allowing — from order screen" | Not a duplicate; real bug on the order screen food transfer surface | Changed from `qa_repro_required` to `candidate_for_master_plan_with_constraints` — owner confirmed the surface is the order screen food item transfer |
| P4-02 | BUG-069 | Should BUG-069 be deferred from POS2.0? | "To be handled at backend — pass to backend" | Backend-owned | Changed from `not_safe_for_sprint` to `ready_for_master_plan_after_backend_answer` — backend team must implement sound/notification sequencing |
| P4-03 | BUG-074 | Should BUG-074 be deferred from POS2.0? | "B — browser-native autofill only, just verify behavior" | QA verification only | Changed from `defer_from_pos2_0` to `qa_repro_required` — no code change, just verify browser-native autofill works |

---

## 7. Bug-by-Bug Phase 4 Planning

---

### BUG-050 — Manual Bill Reprint Source-of-Truth After Cancellation

#### Current Analysis Verdict
Frontend bug — default-branch payload-builder gap. Dashboard manual reprint reconstructs totals differently from Collect Bill when cancellation/discount/tip are involved.

#### Reconciliation Finding
`business_rule_missing_from_baseline` — no frozen or pending rule defines which source-of-truth manual reprint must follow after cancellations.

#### Business Rule / Baseline Impact
Frozen baseline defines settlement totals (PAY-001, PAY-002, PAY-004) but not which source-of-truth manual reprint must use post-cancellation. Missing rule: should manual reprint always match the Collect Bill live-total path, or is the reconstruction path acceptable?

#### Owner Decision Needed?
**Yes.** Owner must confirm parity expectation and provide paired payload/bill evidence (dashboard bill vs Collect Bill bill for the same order after cancellation).

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
Yes — paired bill comparison after cancellation with discount/tip/SC.

#### Duplicate / Already Resolved Check
Not duplicate. Distinct from all other print bugs (BUG-057 = prepaid print surfaces; BUG-059 = historical audit print; BUG-063 = room print fields).

#### Dependencies
None on other Phase 4 bugs. Module 14 (Print) surface.

#### Recommended Next Action
Owner must provide: (1) reproduction order ID with cancellation, (2) paired bill screenshots or paired `/order-temp-store` payloads, (3) confirmation of whether parity with Collect Bill is the expected rule.

#### Can Enter Master Implementation Plan?
Yes, after owner answer.

#### Planning Classification
`ready_for_master_plan_after_owner_answer`

#### Notes For Master Planning Agent
High customer-visible impact (P0). Fix scope depends on owner's parity rule choice: full default-branch removal vs inject `order.discount` etc. into the dashboard reprint order shape. Both Collect Bill override path and dashboard default path use `buildBillPrintPayload` — the override path is already correct.

---

### BUG-052 — Profile-Driven Round-off Configuration

#### Current Analysis Verdict
API contract + FE mapping issue. Combined with BUG-051 = a single configuration-driven round-off rule.

#### Reconciliation Finding
`needs_backend_source_of_truth_audit` — FE hardcodes the round-off rule in `calcOrderTotals` / `CollectPaymentPanel`. Backend-owned restaurant profile field/enum/default are unknown.

#### Business Rule / Baseline Impact
No frozen configurable round-off rule. Pending freeze Part A2 (ROUND-001) captures always-ceil but not the profile config aspect.

#### Owner Decision Needed?
No.

#### Backend Confirmation Needed?
**Yes.** Exact profile field name, value enum, default behavior, and legacy fallback.

#### QA Repro Needed?
No — not a runtime repro issue; it's a missing contract.

#### Duplicate / Already Resolved Check
Not duplicate. BUG-051 (Phase 1) covers always-ceil rule reversal; BUG-052 covers the profile-driven configuration layer on top.

#### Dependencies
Depends on BUG-051 (Phase 1) for the base round-off rule. BUG-052 adds configuration on top of BUG-051.

#### Recommended Next Action
Backend team must confirm: exact field name (e.g., `round_off_type`), allowed values (e.g., `ceil`, `floor`, `nearest`), default value for restaurants without the field, and whether this field is already present in the profile API response.

#### Can Enter Master Implementation Plan?
Yes, after backend answer.

#### Planning Classification
`ready_for_master_plan_after_backend_answer`

#### Notes For Master Planning Agent
Should be sequenced after BUG-051 (Phase 1) implementation. If backend confirms the field already exists in profile, implementation is straightforward: read from `profileTransform` → pass to `calcOrderTotals`. If the field does not exist yet, BUG-052 becomes backend-first-required.

---

### BUG-053 — Hardcoded SGST/CGST Percentage Label

#### Current Analysis Verdict
Likely already-resolved / configuration ambiguity — pending owner screenshot.

#### Reconciliation Finding
`needs_owner_decision_before_planning` — owner screenshot / exact offending row needed.

#### Business Rule / Baseline Impact
Item-GST mixed-rate no-label behavior already matches current code. Item-level rows render WITHOUT a percentage; only SC/Tip/Delivery rows show a single percentage sourced from `serviceChargeTaxPct/2`. Owner may be looking at a stale build or a different surface.

#### Owner Decision Needed?
**Yes** — but only to confirm or disconfirm. Owner must provide a screenshot showing the exact row with the unwanted percentage.

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
**Yes.** This may already be resolved. A screenshot or live repro is required before any planning.

#### Duplicate / Already Resolved Check
Possibly already resolved — code shows item-level GST rows do not display percentages.

#### Dependencies
None.

#### Recommended Next Action
Owner must capture a screenshot of the exact GST row showing the unwanted hard-coded percentage. If it cannot be reproduced on the current build, close as already-resolved.

#### Can Enter Master Implementation Plan?
No, QA repro first.

#### Planning Classification
`qa_repro_required`

#### Notes For Master Planning Agent
If owner cannot reproduce: close. If owner provides a screenshot pointing to SC/Tip/Delivery rows: those percentages are intentional (sourced from profile `serviceChargeTaxPct/2`). Only actionable if a genuinely hardcoded or wrong percentage is found.

---

### BUG-056 — Preset Discount Categories Fetched But Not Rendered

#### Current Analysis Verdict
Frontend UI bug — incomplete feature. Categories are fetched from backend but no picker UI is rendered.

#### Reconciliation Finding
`needs_owner_decision_before_planning` — owner must pick preset-discount picker UX and stacking/exclusivity rule.

#### Business Rule / Baseline Impact
No baseline rule for preset-discount picker UX or stacking rule. This is a new feature surface.

#### Owner Decision Needed?
**Yes.** Must decide: (1) picker UX (dropdown / quick-select / separate rail), (2) stacking rule (can preset discount stack with manual discount, or are they mutually exclusive?), (3) display location on Collect Bill panel.

#### Backend Confirmation Needed?
No — backend already provides the discount categories.

#### QA Repro Needed?
No — the gap is confirmed (categories fetched, no render).

#### Duplicate / Already Resolved Check
Not duplicate.

#### Dependencies
None.

#### Recommended Next Action
Owner must choose: (a) picker UX pattern, (b) whether preset discount replaces or stacks with manual discount, (c) location on Collect Bill.

#### Can Enter Master Implementation Plan?
Yes, after owner answer.

#### Planning Classification
`ready_for_master_plan_after_owner_answer`

#### Notes For Master Planning Agent
Low risk — additive UI. No financial formula change if the discount value follows the existing `orderDiscountType` / `orderDiscountValue` pathway. Stacking rule is the key decision.

---

### BUG-057 — Prepaid Print Bill Missing on Some Surfaces

#### Current Analysis Verdict
Frontend UI bug — OrderCard prepaid branch missing Print Bill. CollectPaymentPanel may already have the button.

#### Reconciliation Finding
`needs_owner_decision_before_planning` — owner must confirm approved prepaid Print Bill surfaces and card layout intent.

#### Business Rule / Baseline Impact
No frozen rule for prepaid manual reprint surface. Historical BUG-005 closure said "Print Bill on prepaid not business requirement" — owner may now be reversing that.

#### Owner Decision Needed?
**Yes.** Must confirm: (1) which surfaces should show Print Bill for prepaid orders (OrderCard, CollectPaymentPanel, or both), (2) whether this reverses the BUG-005 historical closure.

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
No — the gap is confirmed in code.

#### Duplicate / Already Resolved Check
Not duplicate. BUG-050 covers post-cancellation bill parity; BUG-057 covers prepaid surface availability.

#### Dependencies
None.

#### Recommended Next Action
Owner must confirm which surfaces and whether BUG-005 closure is reversed.

#### Can Enter Master Implementation Plan?
Yes, after owner answer.

#### Planning Classification
`ready_for_master_plan_after_owner_answer`

#### Notes For Master Planning Agent
Low-medium risk. If owner confirms OrderCard needs Print Bill for prepaid: add a print button in the prepaid branch of OrderCard. Must use the override (Collect Bill) path to avoid BUG-050-style drift.

---

### BUG-058 — Prepaid Hold Collect-Bill Endpoint

#### Current Analysis Verdict
API contract / endpoint-routing issue. FE Audit drawer always calls `order-bill-payment` but the correct endpoint for prepaid-hold settlement is unknown.

#### Reconciliation Finding
`needs_backend_source_of_truth_audit` — backend must confirm which endpoint/method contract settles prepaid-hold orders.

#### Business Rule / Baseline Impact
No frozen rule for prepaid-hold collect endpoint. Frozen PAY-004 covers postpaid settle only.

#### Owner Decision Needed?
No.

#### Backend Confirmation Needed?
**Yes.** Endpoint path, accepted payment methods, and sample request/response for prepaid-hold settlement.

#### QA Repro Needed?
No — the contract gap is clear.

#### Duplicate / Already Resolved Check
Not duplicate. Related to BUG-042 series (Hold UPI/payment) but distinct: BUG-042 was about the Hold flow itself; BUG-058 is about the settle-from-Audit-Report flow for prepaid-hold orders.

#### Dependencies
None directly.

#### Recommended Next Action
Backend team must confirm: correct endpoint for prepaid-hold settlement, which payment methods are supported, and sample request/response.

#### Can Enter Master Implementation Plan?
Yes, after backend answer.

#### Planning Classification
`ready_for_master_plan_after_backend_answer`

#### Notes For Master Planning Agent
High customer-visible impact (P0) — prepaid-hold orders cannot be settled from the Audit Report if the wrong endpoint is used. Implementation is likely a small routing change once the correct endpoint is known.

---

### BUG-059 — Audit Report Historical Print Bill

#### Current Analysis Verdict
Frontend feature gap — missing Print Bill in Audit Report for paid/cancelled/completed orders.

#### Reconciliation Finding
`business_rule_missing_from_baseline` — no frozen or pending rule defines historical reprint surface, cancelled-order content, or permission gate.

#### Business Rule / Baseline Impact
No baseline rule covers historical reprint. This is a new feature surface.

#### Owner Decision Needed?
**Yes.** Must decide: (1) which Audit Report tabs get Print Bill (Paid, Cancelled, Completed, or all), (2) permission gate (manager-only or all roles), (3) cancelled-order bill content (last-known totals, or zeroed-out), (4) UX surface (row action button vs detail-sheet action).

#### Backend Confirmation Needed?
No — print uses the existing `order-temp-store` endpoint.

#### QA Repro Needed?
No — feature gap is confirmed.

#### Duplicate / Already Resolved Check
Not duplicate. BUG-050 = dashboard reprint parity; BUG-057 = prepaid surface; BUG-059 = historical audit reprint.

#### Dependencies
BUG-050 should be resolved first (manual reprint source-of-truth) to ensure the audit reprint uses the correct financial path.

#### Recommended Next Action
Owner must choose surface, permissions, and cancelled-bill behavior.

#### Can Enter Master Implementation Plan?
Yes, after owner answer.

#### Planning Classification
`ready_for_master_plan_after_owner_answer`

#### Notes For Master Planning Agent
Medium risk. Must use the override (Collect Bill) path for financial accuracy. Must respect the parity decision from BUG-050 if resolved by then.

---

### BUG-060 — Transfer-to-Room Leaves Source Table Occupied

#### Current Analysis Verdict
Socket / state-sync bug — likely backend-frontend coordination gap.

#### Reconciliation Finding
`needs_backend_source_of_truth_audit` — backend must confirm which socket/table/order events fire after `order-shifted-room`, and in what order.

#### Business Rule / Baseline Impact
OD-02 (room billing/print lifecycle) is deferred. No frozen source-table-free rule exists. The behavior intersects the deferred decision but is primarily a backend event-emission question.

#### Owner Decision Needed?
No (backend event emission is the blocker).

#### Backend Confirmation Needed?
**Yes.** Which socket events fire after `order-shifted-room`, and with which payloads? Specifically: does backend emit a table-status-change event for the source table, and does it emit an order-removal event for the source order?

#### QA Repro Needed?
Yes — live socket trace required to observe actual event sequence.

#### Duplicate / Already Resolved Check
Not duplicate.

#### Dependencies
None directly. Intersects OD-02 but is an operational bug, not a policy decision.

#### Recommended Next Action
Backend team must provide: live socket trace after a successful `order-shifted-room` API call showing (1) source table status events, (2) source order removal events, (3) target room order creation events.

#### Can Enter Master Implementation Plan?
Yes, after backend answer.

#### Planning Classification
`ready_for_master_plan_after_backend_answer`

#### Notes For Master Planning Agent
High customer-visible impact (P0) — source table stays visually "occupied" until the next poll (60-120s). Fix approach depends on backend answer: if backend already emits the right events, FE has a handler bug; if backend does not emit, FE needs an optimistic-update or explicit refetch.

---

### BUG-061 — Room Check-In Time Visibility

#### Current Analysis Verdict
Frontend UI gap + scope ambiguity. Check-in time is available on room data but the intended reporting surface is unclear.

#### Reconciliation Finding
`business_rule_missing_from_baseline` — no baseline rule defines where room check-in time should appear (Audit Report, Rooms Report, or room-child rows).

#### Business Rule / Baseline Impact
No baseline rule. ROOM-001 covers room report totals but not check-in time display.

#### Owner Decision Needed?
**Yes.** Must decide: (1) which report surface shows check-in time (Audit Report, Rooms Report, room-child rows in dashboard, or all), (2) display format (date+time, time only, relative).

#### Backend Confirmation Needed?
No — check-in time is already available in room data.

#### QA Repro Needed?
No — scope ambiguity, not a repro question.

#### Duplicate / Already Resolved Check
Not duplicate.

#### Dependencies
None.

#### Recommended Next Action
Owner must pick the target surface and display mode.

#### Can Enter Master Implementation Plan?
Yes, after owner answer.

#### Planning Classification
`ready_for_master_plan_after_owner_answer`

#### Notes For Master Planning Agent
Low risk — additive display field. Must not inadvertently re-open CR-001 room-report scope.

---

### BUG-063 — Room Bill Payload Missing Room Fields

#### Current Analysis Verdict
Frontend mapping + payload gap + room billing/print policy decision (OD-02).

#### Reconciliation Finding
`needs_backend_source_of_truth_audit` — owner must confirm required field list; backend must confirm template key names and acceptance.

#### Business Rule / Baseline Impact
ROOM-001 freezes room-report totals only. OD-02 (room billing/print lifecycle) is deferred. Adding room fields to the print payload intersects OD-02 but is additive if ROOM-001 math is preserved.

#### Owner Decision Needed?
**Yes.** Must confirm the required room fields for the bill (e.g., `room_no`, `check_in_date`, `guest_name`, `advance_amount`).

#### Backend Confirmation Needed?
**Yes.** Must confirm which field names the print template accepts and whether any template update is needed.

#### QA Repro Needed?
No.

#### Duplicate / Already Resolved Check
Not duplicate. Distinct from BUG-065 (corporate GST) and BUG-050 (reprint parity).

#### Dependencies
OD-02 deferral noted — implementation must not change ROOM-001 math.

#### Recommended Next Action
Owner provides required field list. Backend confirms template key names. Implementation adds fields to `buildBillPrintPayload` room branch.

#### Can Enter Master Implementation Plan?
Yes, after owner and backend answer.

#### Planning Classification
`ready_for_master_plan_after_owner_and_backend_answer`

#### Notes For Master Planning Agent
High customer-visible impact (P0). Must verify ROOM-001 totals are unchanged after field addition. Room print test required.

---

### BUG-064 — Room Transfer Notifications Look Like New Orders

#### Current Analysis Verdict
Notification / FCM contract gap + frontend mapping gap. Room transfer notifications use the same banner/sound as new orders.

#### Reconciliation Finding
`needs_backend_source_of_truth_audit` — backend must confirm FCM/socket marker + owner must choose message/sound behavior.

#### Business Rule / Baseline Impact
No frozen rule for room-transfer notification semantics. Module 8 (Notifications) says Firebase is canonical.

#### Owner Decision Needed?
**Yes.** Must decide: (1) should room transfer have a distinct notification sound/banner, (2) what message text.

#### Backend Confirmation Needed?
**Yes.** Must confirm: does the FCM/socket payload carry a marker distinguishing room-transfer from new-order?

#### QA Repro Needed?
No.

#### Duplicate / Already Resolved Check
Not duplicate.

#### Dependencies
BUG-060 (transfer-to-room events) is related but not blocking.

#### Recommended Next Action
Backend confirms whether a transfer-specific marker exists. Owner chooses notification UX.

#### Can Enter Master Implementation Plan?
Yes, after owner and backend answer.

#### Planning Classification
`ready_for_master_plan_after_owner_and_backend_answer`

#### Notes For Master Planning Agent
Low-medium risk. If backend already includes a marker: FE reads it and applies distinct sound/banner. If not: backend must add a marker first.

---

### BUG-065 — Corporate Room GST / Name Captured But Not Echoed to Bill

#### Current Analysis Verdict
Frontend mapping + payload gap. FE captures and posts `firm_name` / `firm_gst` on room check-in but does not parse/render them downstream to the bill.

#### Reconciliation Finding
`needs_backend_source_of_truth_audit` — response echo + print-template slot mapping are backend-owned.

#### Business Rule / Baseline Impact
OD-02 deferred. No frozen rule for corporate room GST bill slots.

#### Owner Decision Needed?
**Yes.** Confirm which bill surface should show firm name / firm GST (printed bill, Collect Bill panel, or both).

#### Backend Confirmation Needed?
**Yes.** Confirm: (1) which response keys echo `firm_name` / `firm_gst` back on `single-order-new`, (2) which print-template slots map to `custGSTName` / `custGST` or dedicated room slots.

#### QA Repro Needed?
No.

#### Duplicate / Already Resolved Check
Not duplicate. Distinct from BUG-063 (room bill fields) — BUG-065 is specifically about corporate GST echo.

#### Dependencies
BUG-063 (room bill fields) is related — may be bundled.

#### Recommended Next Action
Backend confirms echo fields and template mapping. Owner confirms bill surface.

#### Can Enter Master Implementation Plan?
Yes, after owner and backend answer.

#### Planning Classification
`ready_for_master_plan_after_owner_and_backend_answer`

#### Notes For Master Planning Agent
High customer-visible impact (P0) for corporate clients needing GST on room bills. Must only show firm fields when applicable (corporate room check-in with firm details provided).

---

### BUG-066 — Food Item Transfer From Order Screen Still Allows Rooms

#### Current Analysis Verdict
Likely already resolved for TransferFoodModal and ShiftTableModal (both exclude rooms). But owner confirmed: food item transfer from the **order screen** still allows rooms as destinations.

#### Reconciliation Finding
`needs_owner_decision_before_planning` — owner must confirm exact surface.

#### Business Rule / Baseline Impact
No frozen rule conflict. Straightforward UI gate.

#### Owner Decision Needed?
Partially answered — owner confirmed "from order screen." Exact component/modal within the order screen may need code inspection.

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
Yes — code inspection needed to identify which order-screen surface still exposes rooms for food transfer (TransferFoodModal was already patched; may be a different modal or inline action).

#### Duplicate / Already Resolved Check
NOT a duplicate of BUG-062. BUG-062 = order-level "To Room" payment button on Collect Payment; BUG-066 = item-level food transfer destination list on the order screen.

#### Dependencies
None.

#### Recommended Next Action
Code inspection of the order screen food-transfer flow to identify the exact component that still allows room destinations. Then add the room exclusion gate.

#### Can Enter Master Implementation Plan?
Yes, with constraints (code inspection first to identify the exact surface).

#### Planning Classification
`candidate_for_master_plan_with_constraints`

#### Notes For Master Planning Agent
Low risk once the surface is identified. Constraint: code inspection must precede implementation to find the exact component within the order screen that exposes rooms for food item transfer. Owner confirmed the bug is real and the surface is the order screen.

---

### BUG-067 — Station-View Toggle Should Depend on Ready Configuration

#### Current Analysis Verdict
Configuration / validation gap. Station View can be enabled even when the tenant has no usable station setup.

#### Reconciliation Finding
`business_rule_missing_from_baseline` — no baseline rule defines what "restaurant ready configuration completed" means for the station toggle.

#### Business Rule / Baseline Impact
No baseline rule. Module 9 (Station) says station fetch failure should be explicit; but no rule defines when the toggle should be available.

#### Owner Decision Needed?
**Yes.** Must define: (1) readiness condition (e.g., at least one station configured, or broader), (2) UX when not ready (disable toggle, auto-revert, or show warning).

#### Backend Confirmation Needed?
No — readiness can be determined from the profile/station data already fetched at bootstrap.

#### QA Repro Needed?
No.

#### Duplicate / Already Resolved Check
Not duplicate.

#### Dependencies
None.

#### Recommended Next Action
Owner must define the readiness condition and preferred UX behavior.

#### Can Enter Master Implementation Plan?
Yes, after owner answer.

#### Planning Classification
`ready_for_master_plan_after_owner_answer`

#### Notes For Master Planning Agent
Low risk — UI validation gate. Implementation reads station config from bootstrap data and conditionally disables/warns on the StatusConfigPage toggle.

---

### BUG-069 — Sound-Before-Order Race / Notification Sequencing

#### Current Analysis Verdict
Architectural / coordination issue. Notification sound fires before order data is available on dashboard.

#### Reconciliation Finding
`needs_owner_decision_before_planning` — architecture choice (queued-FCM vs socket-driven sound) was required.

#### Business Rule / Baseline Impact
No baseline on cross-channel sequencing. Module 8 (Notifications) says Firebase is canonical.

#### Owner Decision Needed?
Answered — owner says: "to be handled at backend — pass to backend."

#### Backend Confirmation Needed?
**Yes.** Backend team must implement the sound/notification sequencing so that order data arrives before or with the notification sound.

#### QA Repro Needed?
No — once backend implements, FE may need minor adjustments.

#### Duplicate / Already Resolved Check
Not duplicate.

#### Dependencies
None.

#### Recommended Next Action
Backend team must own the notification sequencing fix. Frontend adjustments (if any) follow backend implementation.

#### Can Enter Master Implementation Plan?
Yes, after backend answer/implementation.

#### Planning Classification
`ready_for_master_plan_after_backend_answer`

#### Notes For Master Planning Agent
Owner explicitly delegated this to backend. Frontend role is limited to consuming the correctly-sequenced events. Backend team should confirm the implementation approach and timeline.

---

### BUG-072 — Notes Taxonomy (Room Note / Table Note / Item Note)

#### Current Analysis Verdict
Frontend display gap + possible backend contract gap. Order cards currently support `order_note` + item notes only; owner asks for room note / table note / item note separation.

#### Reconciliation Finding
`business_rule_missing_from_baseline` — no baseline rule defines note categories, backend fields, or render priority.

#### Business Rule / Baseline Impact
No baseline rule. Note fields are not defined in any frozen or pending rule.

#### Owner Decision Needed?
**Yes.** Must define: (1) which note categories exist (room note, table note, item note, order note), (2) where each displays on the order card, (3) render priority / ordering.

#### Backend Confirmation Needed?
**Yes.** Must confirm: do separate `room_note` / `table_note` fields already exist in the backend API? Or is everything in a single `order_note` field today?

#### QA Repro Needed?
No.

#### Duplicate / Already Resolved Check
Not duplicate.

#### Dependencies
None.

#### Recommended Next Action
Backend confirms whether separate note fields exist. Owner defines taxonomy and display surface.

#### Can Enter Master Implementation Plan?
Yes, after owner and backend answer.

#### Planning Classification
`ready_for_master_plan_after_owner_and_backend_answer`

#### Notes For Master Planning Agent
Medium risk — touches order card rendering (Module 3) and may require backend field additions if separate fields don't exist. If backend already supports separate fields, implementation is frontend-only display mapping.

---

### BUG-074 — Remember Me / Password Autofill

#### Current Analysis Verdict
Frontend behavior + policy decision (security-sensitive).

#### Reconciliation Finding
`needs_owner_decision_before_planning` — security-sensitive policy choice.

#### Business Rule / Baseline Impact
No baseline rule. Outside current frozen business baseline.

#### Owner Decision Needed?
Answered — owner chose Option B: browser-native autofill only (no code change, just verify behavior).

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
**Yes.** Must verify that the login form's HTML attributes (`autocomplete`, `name`) properly support browser-native autofill. If they already do, close. If not, minor HTML attribute fix.

#### Duplicate / Already Resolved Check
Possibly already resolved if the login form has correct HTML attributes.

#### Dependencies
None.

#### Recommended Next Action
QA must verify browser-native autofill behavior on the login form. If it works: close. If not: add correct `autocomplete` attributes to username/password inputs.

#### Can Enter Master Implementation Plan?
No, QA repro first.

#### Planning Classification
`qa_repro_required`

#### Notes For Master Planning Agent
Lowest risk of all Phase 4 bugs. If browser autofill already works: close immediately. If not: single-line HTML attribute change on LoginPage.jsx.

---

### BUG-076 — Round-off (Duplicate of BUG-051)

#### Current Analysis Verdict
Duplicate / Already Covered — same scope as BUG-051.

#### Reconciliation Finding
`duplicate_or_already_resolved` — same round-off area as BUG-051, linked to pending freeze Part A2 ROUND-001 / BUG-002.

#### Business Rule / Baseline Impact
None beyond BUG-051.

#### Owner Decision Needed?
No.

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
No.

#### Duplicate / Already Resolved Check
**Confirmed duplicate of BUG-051.** Same round-off scope. BUG-051 is in Phase 1 with full implementation planning.

#### Dependencies
BUG-051 (Phase 1).

#### Recommended Next Action
Close with BUG-051 smoke result.

#### Can Enter Master Implementation Plan?
No, duplicate/already resolved.

#### Planning Classification
`duplicate_or_already_resolved`

#### Notes For Master Planning Agent
No separate planning needed. Close when BUG-051 passes QA.

---

### BUG-077 — Mobile Trim Before CRM Lookup

#### Current Analysis Verdict
Likely already resolved / configuration ambiguity. Code inspection suggests trim may already be implemented.

#### Reconciliation Finding
`duplicate_or_already_resolved` — pending PAY-009(a) looks stale vs current code.

#### Business Rule / Baseline Impact
Pending freeze Part B14 — PAY-009 / linked BUG-003.

#### Owner Decision Needed?
No (unless owner can reproduce a real trim miss on the current build).

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
Yes — verify whitespace phone lookup before retiring the pending item.

#### Duplicate / Already Resolved Check
**Likely already resolved.** CRM lookup trim appears to be in current code. Reconciliation report recommends "no new planning unless owner reproduces a real trim miss."

#### Dependencies
None.

#### Recommended Next Action
QA verification: enter a phone number with leading/trailing spaces and confirm CRM lookup works correctly. If it does: close. If not: minor trim fix.

#### Can Enter Master Implementation Plan?
No, duplicate/already resolved (pending QA verification to formally close).

#### Planning Classification
`duplicate_or_already_resolved`

#### Notes For Master Planning Agent
No separate planning needed. Bundle the QA verification with the BUG-078 CRM timeout work if both are in scope.

---

### BUG-078 — CRM Timeout Error Visibility

#### Current Analysis Verdict
Frontend UX gap. CRM timeout produces silent failure instead of a visible error.

#### Reconciliation Finding
`already_in_pending_freeze` — core rule captured in Part B14 PAY-009(b), but UX pattern/retry policy still unchosen.

#### Business Rule / Baseline Impact
Pending freeze PAY-009(b): "CRM timeout → show a visible error to the cashier." Approved amended rule, but the UX details (error pattern, retry option, toast vs inline) are unspecified.

#### Owner Decision Needed?
**Yes.** Must choose: (1) error display pattern (toast, inline banner, modal), (2) retry option (auto-retry, manual retry button, or no retry), (3) fallback behavior after timeout (allow manual entry, or block).

#### Backend Confirmation Needed?
No — CRM timeout handling is frontend-only.

#### QA Repro Needed?
No — the UX gap is confirmed.

#### Duplicate / Already Resolved Check
Not duplicate. Distinct from BUG-077 (mobile trim).

#### Dependencies
None.

#### Recommended Next Action
Owner must choose the visible-error pattern, retry policy, and fallback behavior.

#### Can Enter Master Implementation Plan?
Yes, after owner answer.

#### Planning Classification
`ready_for_master_plan_after_owner_answer`

#### Notes For Master Planning Agent
Medium customer-visible impact. QA assertion (from reconciliation Section 11): "Timeout/network failure shows a visible retryable error; real 'not found' still permits manual entry/new-customer path." Must distinguish timeout from genuine "not found."

---

### BUG-081 — Snooze Duration Already 120000ms

#### Current Analysis Verdict
Likely already resolved. Snooze timeout is already 120000ms (2 minutes) in current code. Stale comment cleanup only.

#### Reconciliation Finding
`duplicate_or_already_resolved` — pending SCAN-002 may already be code-aligned.

#### Business Rule / Baseline Impact
Pending freeze Part B9 — SCAN-002 / linked BUG-007.

#### Owner Decision Needed?
No (unless owner identifies another snooze surface with wrong duration).

#### Backend Confirmation Needed?
No.

#### QA Repro Needed?
Yes — verify actual snooze duration before retiring the pending item.

#### Duplicate / Already Resolved Check
**Likely already resolved.** Code shows 120000ms snooze timeout matching the owner-correct 2-minute rule.

#### Dependencies
None.

#### Recommended Next Action
QA verification: trigger snooze and confirm 2-minute duration. If correct: close. Stale comment cleanup can be bundled with any scan-order work.

#### Can Enter Master Implementation Plan?
No, duplicate/already resolved (pending QA verification to formally close).

#### Planning Classification
`duplicate_or_already_resolved`

#### Notes For Master Planning Agent
No separate planning needed. If QA confirms 120000ms: close and optionally clean up any stale "5 min" comments.

---

### BUG-086 — Room Grand-Total Key Verification

#### Current Analysis Verdict
Likely already resolved — code matches user-confirmed contract. Code comment cites 2026-04-25 user confirmation that `order_amount` is the correct key.

#### Reconciliation Finding
`duplicate_or_already_resolved` — pending TOTALS-003 looks stale vs current code.

#### Business Rule / Baseline Impact
Pending freeze Part B11 — TOTALS-003 / linked BUG-012.

#### Owner Decision Needed?
No (unless the key has changed since 2026-04-25).

#### Backend Confirmation Needed?
No (user already confirmed the key).

#### QA Repro Needed?
Yes — verify room-with-balance payload still uses `order_amount`.

#### Duplicate / Already Resolved Check
**Likely already resolved.** Code comment confirms `order_amount` was user-verified on 2026-04-25.

#### Dependencies
None.

#### Recommended Next Action
QA verification: capture a room order with pending balance and confirm `order_amount` is the grand total key. If confirmed: close and retire the pending TOTALS-003 item.

#### Can Enter Master Implementation Plan?
No, duplicate/already resolved (pending QA verification to formally close).

#### Planning Classification
`duplicate_or_already_resolved`

#### Notes For Master Planning Agent
No separate planning needed. Bundle the QA verification with any room billing work if in scope.

---

## 8. Backend Questions From Phase 4

| Question ID | Bug | Backend Question | Required Evidence | Blocks Master Plan? |
|---|---|---|---|---|
| BQ-P4-01 | BUG-052 | What is the exact profile field name, value enum, and default behavior for round-off configuration? | Profile API sample + allowed values | Yes |
| BQ-P4-02 | BUG-058 | Which endpoint/method contract settles prepaid-hold orders? What payment methods are supported? | Endpoint path + sample request/response | Yes |
| BQ-P4-03 | BUG-060 | Which socket events fire after `order-shifted-room`, and with which payloads? Does the source table get a status-change event? | Live socket trace after successful transfer | Yes |
| BQ-P4-04 | BUG-063 | Which room-print field names does the backend template accept (`room_no`, `check_in_date`, `guest_name`, etc.)? | Template field list or backend print contract | Yes |
| BQ-P4-05 | BUG-064 | Does the FCM/socket payload carry a marker distinguishing room-transfer from new-order? | FCM payload sample for a room transfer | Yes |
| BQ-P4-06 | BUG-065 | Which response keys echo `firm_name` / `firm_gst` on `single-order-new` for corporate rooms? Which print-template slots map to them? | API response sample + template mapping | Yes |
| BQ-P4-07 | BUG-069 | Backend must own notification sequencing so that order data arrives before or with the notification sound. What is the implementation approach and timeline? | Backend implementation plan | Yes |
| BQ-P4-08 | BUG-072 | Do separate `room_note` / `table_note` fields already exist in the backend API? | API sample showing note fields or confirmation they do not exist | Yes |

---

## 9. QA Repro Items From Phase 4

| Bug | Repro Needed | Suggested Flow | Evidence Required | Why Needed Before Planning |
|---|---|---|---|---|
| BUG-053 | Owner screenshot of exact GST row with unwanted percentage | Open Collect Bill for a multi-rate order → screenshot the GST breakdown | Screenshot showing the specific row | May already be resolved — item-level GST rows do not show percentage in current code |
| BUG-074 | Verify browser-native autofill on login form | Open login page in Chrome/Safari → verify username/password autofill prompt | Screenshot of autofill behavior | Owner chose "verify only" — no code change if autofill already works |
| BUG-066 | Code inspection of order screen food-transfer flow | Open order screen → attempt to transfer a food item → check if rooms appear as destinations | Screenshot + code reference | Owner confirmed the bug exists but exact component needs identification |
| BUG-077 | Verify mobile trim on CRM lookup (closing verification) | Enter phone with leading/trailing spaces → verify CRM lookup | CRM lookup result | Likely already resolved — closing verification only |
| BUG-081 | Verify snooze duration is 2 minutes (closing verification) | Trigger snooze on scan-order popup → time the re-appearance | Timer measurement | Likely already resolved — closing verification only |
| BUG-086 | Verify room grand-total key is `order_amount` (closing verification) | Capture room-with-balance order payload | Payload capture | Likely already resolved — closing verification only |

---

## 10. Duplicates / Already Resolved Items

| Bug | Duplicate Of / Covered By | Evidence | Recommended Handling |
|---|---|---|---|
| BUG-076 | Duplicate of BUG-051 (Phase 1) | Same round-off scope; both linked to pending freeze ROUND-001 / BUG-002 | Close when BUG-051 passes QA |
| BUG-077 | Covered by pending PAY-009(a) / BUG-003; likely already code-aligned | Current code appears to trim mobile before CRM lookup | QA verify → close if trim works |
| BUG-081 | Covered by pending SCAN-002 / BUG-007; likely already code-aligned | Code shows 120000ms (2 min) snooze timeout | QA verify → close if duration correct |
| BUG-086 | Covered by pending TOTALS-003 / BUG-012; code confirmed 2026-04-25 | Code comment cites user confirmation of `order_amount` key | QA verify → close if key confirmed |

---

## 11. Deferred / Not Safe For Sprint Items

| Bug | Reason Deferred / Not Safe | Risk | Recommended Future Handling |
|---|---|---|---|
| — | No bugs were classified as `defer_from_pos2_0` or `not_safe_for_sprint` in Phase 4. | — | — |

Note: BUG-069 was a candidate for deferral (architecture choice), but owner explicitly directed it to the backend team as a backend-owned fix, so it is classified as `ready_for_master_plan_after_backend_answer` rather than deferred.

---

## 12. Candidates For Master Implementation Plan

| Bug | Condition To Enter Master Plan | Constraints | Suggested Bucket |
|---|---|---|---|
| BUG-050 | Owner confirms print parity rule + provides evidence | Must define which source-of-truth manual reprint follows | owner-decision bucket |
| BUG-052 | Backend confirms profile round-off field contract | Depends on BUG-051 (Phase 1) landing first | backend-contract bucket |
| BUG-053 | Owner provides screenshot OR QA confirms already resolved | May close without implementation | QA-repro bucket |
| BUG-056 | Owner chooses preset discount picker UX + stacking rule | New feature surface | owner-decision bucket |
| BUG-057 | Owner confirms prepaid Print Bill surfaces | May reverse historical BUG-005 closure | owner-decision bucket |
| BUG-058 | Backend confirms prepaid-hold settlement endpoint | High P0 impact | backend-contract bucket |
| BUG-059 | Owner defines historical reprint rule | New feature surface; depends on BUG-050 parity rule | owner-decision bucket |
| BUG-060 | Backend confirms post-transfer socket events | High P0 impact | backend-contract bucket |
| BUG-061 | Owner picks report surface for check-in time | Low risk additive | owner-decision bucket |
| BUG-063 | Owner provides field list + backend confirms template keys | Intersects OD-02; must preserve ROOM-001 math | owner-decision + backend-contract bucket |
| BUG-064 | Backend confirms transfer marker + owner chooses UX | Can bundle with BUG-060 | owner-decision + backend-contract bucket |
| BUG-065 | Backend confirms echo fields + owner confirms bill surface | Can bundle with BUG-063 | owner-decision + backend-contract bucket |
| BUG-066 | Code inspection identifies exact order-screen surface | Owner confirmed bug exists from order screen | frontend-only low-risk bucket |
| BUG-067 | Owner defines station readiness condition + UX | Low risk | owner-decision bucket |
| BUG-069 | Backend implements sound/notification sequencing | Owner delegated to backend | backend-contract bucket |
| BUG-072 | Backend confirms note fields + owner defines taxonomy | Medium risk | owner-decision + backend-contract bucket |
| BUG-074 | QA verifies browser autofill behavior | May close without implementation | QA-repro bucket |
| BUG-078 | Owner chooses CRM timeout UX pattern | Already in pending freeze (core rule); only UX details missing | owner-decision bucket |

---

## 13. Handoff To Master Planning Agent

The future master implementation planning agent should use this Phase 4 document as follows:

### Bugs that can enter master plan NOW (0)
No Phase 4 bugs are immediately ready — all require at least one owner decision, backend answer, or QA verification.

### Bugs that can enter after OWNER answer only (7)
BUG-050, BUG-056, BUG-057, BUG-059, BUG-061, BUG-067, BUG-078

These are blocked only on owner decisions. Once the owner answers, they can be planned and implemented as frontend-only work.

### Bugs that can enter after BACKEND answer only (4)
BUG-052, BUG-058, BUG-060, BUG-069

These require backend team confirmation or implementation. Once backend answers, frontend implementation can be planned.

### Bugs that can enter after OWNER + BACKEND answer (4)
BUG-063, BUG-064, BUG-065, BUG-072

These require both owner and backend coordination. They should be grouped as a "room/cross-team" cluster for coordinated unblocking.

### Bugs that need QA REPRO first (2)
BUG-053, BUG-074

These may close without implementation if QA confirms they're already resolved.

### Bugs that are CANDIDATES with constraints (1)
BUG-066

Ready for code inspection → implementation. Owner confirmed the bug. Only constraint is identifying the exact component.

### Bugs that should be CLOSED as duplicate/resolved (4)
BUG-076, BUG-077, BUG-081, BUG-086

Close with QA verification from their parent bugs or standalone verification.

### Cannot enter master plan (0)
No bugs are permanently blocked or unsafe.

### Recommended grouping for master planning efficiency

1. **Print cluster** (BUG-050, BUG-057, BUG-059) — all need owner decisions about print surfaces/parity. Ask together.
2. **Room cluster** (BUG-063, BUG-064, BUG-065, BUG-061) — all room-related; need owner + backend coordination. Ask together.
3. **Backend-contract cluster** (BUG-052, BUG-058, BUG-060, BUG-069) — all need backend answers. Send as a batch to backend team.
4. **Quick-close cluster** (BUG-076, BUG-077, BUG-081, BUG-086) — QA verify and close.
5. **QA-first cluster** (BUG-053, BUG-074, BUG-066) — verify/inspect before planning.
6. **Standalone owner decisions** (BUG-056, BUG-067, BUG-072, BUG-078) — individual owner questions.

---

## 14. Final Status

`remaining_blocked_bug_planning_created_with_owner_questions`

- **22 Phase 4 bugs** classified.
- **3 owner questions** asked and answered during this session (P4-01, P4-02, P4-03).
- **8 backend questions** created for the backend team (BQ-P4-01 through BQ-P4-08).
- **6 QA repro items** identified (3 for classification, 3 for closing verification).
- **4 duplicate/already-resolved** items identified for closure.
- **0 bugs deferred** from POS2.0.
- **0 bugs classified as not-safe-for-sprint.**
- **No code was changed.**
- **`/app/memory/final/` was not updated.**
- **Pending freeze doc was not updated.**

---

*— End of POS2.0 Remaining Blocked Bug Planning — Phase 4 —*
