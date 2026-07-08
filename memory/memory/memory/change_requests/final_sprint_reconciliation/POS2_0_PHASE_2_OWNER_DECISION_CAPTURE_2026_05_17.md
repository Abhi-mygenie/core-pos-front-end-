# POS2.0 Phase 2 Owner Decision Capture — 2026-05-17

## 1. Purpose

This document captures the owner's answers for the three Phase 2 conditional business-rule bugs (BUG-075, BUG-079, BUG-080) that were flagged as top business-rule conflicts during the POS2.0 reconciliation.

These answers unblock the Master Planning Agent to include these bugs in the master implementation plan.

No implementation was done. No code was changed. No baseline or pending-freeze docs were updated. No QA was run.

---

## 2. Inputs Read

| Input | Path |
|---|---|
| Phase 2 planning document | `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md` |
| Business rules baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| Pending freeze file | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` |
| Reconciliation report | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md` |

---

## 3. Owner Answers Captured

| Question ID | Bug | Question | Owner Answer | Selected Option | Business Rule Impact |
|---|---|---|---|---|---|
| **OQ-P2-01** | BUG-075 | Which order types should allow tip input and tip GST? | **B — Dine-in + walk-in + room (mirrors SC pattern)** | B | Tip and tip GST will be hidden and forced to zero on takeaway and delivery orders. Mirrors the existing Service Charge gate from BUG-013. Aligns with pending-freeze TIP-003 owner-correct rule. |
| **OQ-P2-02** | BUG-079 | Should an order be removed from the dashboard after 1 missed poll (~60s) instead of 2 (~120s)? | **B — Change to 1 missed poll** | B | `REMOVAL_MISS_THRESHOLD` changes from 2 to 1. Dashboard removes stale orders ~60s faster. Aligns with pending-freeze POLL-002. |
| **OQ-P2-03** | BUG-079 | Do you accept the trade-off that a single transient backend delay could cause a brief card-disappearance-then-reappearance? | **Yes — acceptable** | Yes | 1-miss implementation proceeds. API-failure short-circuit, engaged-order skip, and Hold protection all remain unchanged. |
| **OQ-P2-04** | BUG-080 | Should partial_payments include only payment modes enabled in the restaurant configuration? | **B — Filter to configured modes dynamically, from primary payment methods (cash, card, upi)** | B | UI must prevent cashier from selecting disabled payment modes. Payload still carries all 3 primary entries (cash/card/upi); disabled modes passed with zero amounts. Runtime validation confirms correctness. |
| **OQ-P2-05** | BUG-080 | Is tab/credit in scope for partial_payments? | **No — keep tab on its separate settlement path** | No | Tab/credit excluded from `partial_payments`. Separate settlement flow (frozen PAY-008) remains unchanged. |

---

## 4. Backend Questions Handling

| Backend Question ID | Bug | Question | Owner/Backend Answer | Handling | Blocks Master Plan? |
|---|---|---|---|---|---|
| **BQ-P2-01** | BUG-080 | Does the backend accept `partial_payments` arrays with fewer than 3 entries? | **Owner-provided answer: No — backend expects all 3 primary modes (cash, card, upi) always present. Non-enabled modes are passed with zero amounts.** | Answered by owner. No need to park for backend audit. | **No** — resolved. Implementation keeps 3-entry array shape; enforcement is at UI level. |
| **BQ-P2-02** | BUG-080 | Does the backend use zero-amount entries for any purpose? | **Owner-provided answer: Yes — zero-amount entries should remain. Runtime validation is the correctness mechanism.** | Answered by owner. No need to park for backend audit. | **No** — resolved. Zero-amount entries are intentional and expected. |

### Implementation Approach Shift for BUG-080

The original planning document (Option B/C) assumed filtering the payload array to remove disabled modes. Based on the owner's backend answers, the implementation approach changes:

- **Payload shape:** Always 3 entries (cash, card, upi). No variable-length arrays.
- **UI enforcement:** Cashier cannot select a payment mode that is disabled in the restaurant configuration (`restaurant.paymentMethods`).
- **Disabled modes:** Remain in the array with `payment_amount: 0`, `grant_amount: 0`, `transaction_id: ''`.
- **Runtime validation:** Correctness is validated at runtime — the selected mode must be an enabled mode; disabled modes must always be zero.
- **Tab/credit:** Excluded entirely from `partial_payments` (separate settlement path per frozen PAY-008).

This is a narrower, lower-risk change than the originally planned payload-shape modification. The payload contract with the backend stays stable.

---

## 5. Bug Readiness After Decisions

| Bug | Decision Status | Backend Status | Can Enter Master Plan? | Conditions |
|---|---|---|---|---|
| **BUG-075** | Owner confirmed Option B (dine-in + walk-in + room) | No backend dependency | **ready_for_master_plan** | Implementation mirrors BUG-013 SC pattern. Add `tipApplicable` gate across UI + payload. |
| **BUG-079** | Owner confirmed Option B (1-miss) + accepted trade-off | No backend dependency | **ready_for_master_plan** | Change `REMOVAL_MISS_THRESHOLD = 2` to `1`. Update anti-rule comments and pinned tests. |
| **BUG-080** | Owner confirmed Option B (filter to configured primary modes) + No tab in partial_payments | Backend answered by owner: keep 3-entry array, UI-enforce mode selection | **ready_for_master_plan_with_constraints** | Keep all 3 entries in payload. Enforce at UI that cashier cannot select disabled modes. Zero-amount entries for disabled modes remain. Runtime validate. |

---

## 6. Business Rule / Baseline Impact

### Items Requiring Later Update (NOT done in this document)

| Document | Bug | What Needs Updating | When |
|---|---|---|---|
| **Pending freeze — TIP-003 (Part A1)** | BUG-075 | After implementation + QA: promote corrected TIP-003 rule ("Tip allowed for dine-in, walk-in, room only") to baseline. | After BUG-075 code fix + QA pass + owner reconfirmation. |
| **Pending freeze — POLL-002 (Part B12)** | BUG-079 | After implementation + QA: promote corrected POLL-002 rule ("1-miss removal") to baseline. | After BUG-079 code fix + QA pass + owner reconfirmation. |
| **Pending freeze — PAY-003 (Part B8)** | BUG-080 | After implementation + QA: amend PAY-003 to reflect the owner-clarified approach: "All 3 primary modes always present; UI prevents selecting disabled modes; disabled modes carry zero amounts. Tab excluded." | After BUG-080 code fix + QA pass + owner reconfirmation. |
| **Business rules baseline** | All | No update now. Rules are promoted only after all four gates pass (code fix, bug closure, runtime verification, owner reconfirmation). | After each bug's full implementation cycle. |
| **QA assertions** | All | The QA assertions from the Phase 2 planning document (Section 9) remain required for each bug. | During QA phase after implementation. |

### What This Document Does NOT Update

- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` — NOT updated.
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` — NOT updated.
- Bug tracker statuses — NOT changed.
- Source code — NOT modified.

---

## 7. Handoff To Master Planning Agent

### BUG-075 — Tip OrderType Gate
- **Status:** `ready_for_master_plan`
- **Owner decision:** Option B — tip allowed for dine-in + walk-in + room only.
- **Implementation:** Mirror BUG-013 SC pattern. Add `tipApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom` gate at:
  - `CollectPaymentPanel.jsx` (UI visibility: L269/507/1029/1462/1681)
  - `orderTransform.js:calcOrderTotals` (payload: guard `tipAmount` and `tipGstAmt`)
  - All payload builders that emit `tip_amount` / `tip_tax_amount`
- **Risk:** Low — mirrors established pattern.
- **Bundle with:** Bucket A (quick frontend fixes). No dependency on other bugs.
- **QA:** Verify tip hidden/zero on takeaway+delivery; visible on dine-in+walk-in+room; print bill correct.

### BUG-079 — Polling Threshold
- **Status:** `ready_for_master_plan`
- **Owner decision:** Option B — 1-miss removal. Trade-off accepted.
- **Implementation:** Change `REMOVAL_MISS_THRESHOLD = 2` to `1` in `useOrderPollingReconciliation.js:34`. Update anti-rule comment at L13. Update inline comments at L180/201.
- **Risk:** Low — single constant change. Existing protections (API-failure short-circuit, engaged-order skip, Hold protection) all remain.
- **Bundle with:** Can be implemented independently. Pairs well with BUG-068 (reconnect rehydration) but not dependent on it.
- **QA:** Verify 1-miss removal works; API failure protected; engaged/Hold orders unaffected.

### BUG-080 — partial_payments
- **Status:** `ready_for_master_plan_with_constraints`
- **Owner decision:** Option B — filter to configured primary modes (cash/card/upi). Tab excluded.
- **Backend clarification (owner-provided):** Keep all 3 entries in payload always. Disabled modes carry zero. Enforcement is at UI level.
- **Implementation:** Ensure the Collect Bill / Place+Pay UI does not allow the cashier to select a payment mode that is disabled in `restaurant.paymentMethods`. The payload continues to send all 3 entries; disabled modes remain at zero. Add runtime validation that the selected mode is enabled.
- **Constraint:** Payload array shape (always 3 entries) must NOT change. This is a UI-enforcement + validation fix, not a payload-shape fix.
- **Risk:** Low-medium — UI enforcement change only; payload contract unchanged.
- **Bundle with:** Pair with BUG-055 since both touch `placeOrderWithPayment`. Tab settlement path (frozen PAY-008) stays untouched.
- **QA:** Verify disabled modes not selectable; payload still has 3 entries; disabled modes at zero; tab excluded; audit report displays correctly.

---

## 8. Final Status

`phase_2_owner_decisions_captured_all_ready`

---

*— End of POS2.0 Phase 2 Owner Decision Capture —*
