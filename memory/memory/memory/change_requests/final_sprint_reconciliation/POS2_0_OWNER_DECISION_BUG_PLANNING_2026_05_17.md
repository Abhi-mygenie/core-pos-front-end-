# POS2.0 Owner Decision / Business Rule Bug Planning — 2026-05-17

## 1. Purpose

This is the **Phase 2** planning document for POS2.0 sprint planning. It covers the three conditional-safe bugs that were flagged as top business-rule conflicts during the Business Rules vs Bug Analysis Reconciliation (completed 2026-05-17). These bugs were included in the reconciliation's "safe for implementation planning" list but simultaneously carry business-rule conflict / high-risk tags that require explicit owner or backend confirmation before any implementation agent runs.

### Bugs Covered

- **BUG-075** — Tip orderType gate (tip and tip GST on takeaway/delivery)
- **BUG-079** — Polling threshold (2-miss vs 1-miss removal)
- **BUG-080** — partial_payments hardcoded cash/card/upi vs config-driven payment modes

### What This Document Is

- An owner-decision and business-rule planning document only.
- Presents options, recommendations, and consequences for each decision.
- Provides QA assertions that must be verified after implementation.
- Provides handoff guidance for the future Master Planning Agent and Implementation Agent.

### What This Document Is NOT

- No implementation was done.
- No final baseline (`/app/memory/final/`) was updated.
- No pending freeze doc was updated.
- No bug tracker statuses were changed.
- No source code was modified.
- No QA was run.

---

## 2. Inputs Read

| Input | Value / Path |
|---|---|
| **Repo URL** | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| **Branch** | `17-may` |
| **Commit hash after clone** | `862f413` |
| **Baseline docs read** | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`, `ARCHITECTURE_DECISIONS_FINAL.md`, `MODULE_DECISIONS_FINAL.md`, `CHANGE_REQUEST_PLAYBOOK.md`, `IMPLEMENTATION_AGENT_RULES.md`, `OPEN_QUESTIONS_FINAL_RESOLUTION.md`, `BUSINESS_RULES_BASELINE_FINAL.md` |
| **Business rules baseline** | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| **Pending freeze file** | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` |
| **Reconciliation report** | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md` |
| **Bug impact analysis** | `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md` |
| **Phase 1 planning doc** | Not present on disk after fresh clone |
| **Overlay/sprint docs read** | `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`, `PENDING_TASK_REGISTER_2026_05_04.md`, `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`, `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`, `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` |
| **Code files inspected** | `CollectPaymentPanel.jsx` (tip gating), `orderTransform.js` (calcOrderTotals, placeOrderWithPayment, collectBillExisting), `profileTransform.js` (paymentMethods), `useOrderPollingReconciliation.js` (REMOVAL_MISS_THRESHOLD, anti-rules, miss logic) |

---

## 3. Scope

### Included Bugs

| Bug | Business Area | Why Included In Phase 2 | Current Risk |
|---|---|---|---|
| **BUG-075** | Tip / Tip GST applicability by order type | Classified safe for planning AND flagged as top business-rule conflict (TIP-003 pending freeze) | High — customer-visible financial: takeaway/delivery orders currently charged tip + tip GST when feature enabled |
| **BUG-079** | Polling reconciliation threshold | Classified safe for planning AND flagged as top business-rule conflict (POLL-002 pending freeze) | Medium — operational: stale orders linger 60s longer than owner expects |
| **BUG-080** | partial_payments hardcoded modes | Classified safe for planning AND flagged as top business-rule conflict (PAY-003 pending freeze) | Medium — payload correctness: disabled payment modes sent with zero amounts; potential reporting confusion |

### Excluded Bugs

| Bug / Group | Reason Excluded | Planning Phase |
|---|---|---|
| BUG-051, BUG-054, BUG-055, BUG-062, BUG-068, BUG-070, BUG-071, BUG-073 | Clean safe bugs without business-rule conflict — belong to Phase 1 | Phase 1 (clean safe implementation planning) |
| BUG-082, BUG-083, BUG-084, BUG-085 | Blocked from implementation planning — require backend source-of-truth audit | Phase 3 (backend/source-of-truth bugs) |
| BUG-050, BUG-052, BUG-053, BUG-056, BUG-057, BUG-058, BUG-059, BUG-060, BUG-061, BUG-063, BUG-064, BUG-065, BUG-066, BUG-067, BUG-069, BUG-072, BUG-074, BUG-078 | Blocked from implementation planning — require owner decision, backend confirmation, or both | Phase 4 (remaining blocked bugs) |
| BUG-076, BUG-077, BUG-081, BUG-086 | Duplicate or already resolved | Not applicable |

---

## 4. Decision Summary

| Bug | Decision Needed | Current Code Behaviour | Baseline / Pending Rule | Recommended Status | Owner Answer Needed? | Backend Answer Needed? |
|---|---|---|---|---|---|---|
| **BUG-075** | Which order types allow tip? | Tip visible/applied for ALL order types when `features.tip` enabled (no orderType gate) | Frozen TIP-001/TIP-002 silent on orderType; Pending TIP-003 (Part A1) says tip NOT on takeaway/delivery | `ready_after_owner_confirmation` | **Yes** — confirm tip-eligible order types | No |
| **BUG-079** | How many missed polls before removal? | `REMOVAL_MISS_THRESHOLD = 2` (120s effective window) | Frozen POLL-001/POLL-004 preserved; Pending POLL-002 (Part B12) says 1-miss removal | `ready_after_owner_confirmation` | **Yes** — acknowledge false-positive trade-off | No |
| **BUG-080** | Should partial_payments be config-driven? And is tab/credit in scope? | `['cash', 'card', 'upi']` hardcoded; `restaurant.paymentMethods.{cash,upi,card,tab}` not consulted | Frozen PAY rules silent on mode filtering; Pending PAY-003 (Part B8) says "only configured modes" | `ready_after_owner_and_backend_confirmation` | **Yes** — confirm tab/credit scope | **Yes** — confirm backend tolerates variable-length `partial_payments` |

---

## 5. Per-Bug Owner Decision Planning

---

### BUG-075 — Tip OrderType Gate

#### Current Issue

Tip input and tip GST are visible and applied for **all** order types (takeaway, delivery, dine-in, walk-in, room) whenever the restaurant profile flag `features.tip` is enabled. The owner has stated that tip should NOT apply on takeaway or delivery orders.

#### Current Code Behaviour

1. **`CollectPaymentPanel.jsx:269`**: `tipEnabled = !!restaurant?.features?.tip` — gated ONLY by feature flag, NOT by orderType.
2. **`CollectPaymentPanel.jsx:507`**: `tip = tipEnabled ? (parseFloat(tipInput) || 0) : 0` — tip value computed without orderType check.
3. **`CollectPaymentPanel.jsx:1029`**: Tip input rendered when `tipEnabled` is true — no orderType gate on UI visibility.
4. **`CollectPaymentPanel.jsx:1462, 1681`**: Tip line in bill summary rendered when `tipEnabled && tip > 0` — no orderType gate.
5. **`orderTransform.js:calcOrderTotals (L585-679)`**: Receives `tipAmount` unconditionally. `tipGstAmt = tipAmount * scTaxRate` (L647). No orderType awareness anywhere in the function.
6. **`orderTransform.js:placeOrder (L841)`, `updateOrder (L954)`, `placeOrderWithPayment (L1077)`, `collectBillExisting (L1263-1264)`**: All emit `tip_amount` and `tip_tax_amount` from upstream computation — no additional orderType guard.

**Sibling pattern already exists**: Service Charge is gated by `scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom` at `CollectPaymentPanel.jsx:513` (BUG-013 closure). Tip has no equivalent gate.

#### Business Baseline Reference

- **Frozen TIP-001**: Tip input shown only when profile tip feature is enabled; when disabled, tip = 0.
- **Frozen TIP-002**: Tip GST uses SC GST rate (`service_charge_tax`); if SC rate = 0%, tip GST = 0%.
- Neither TIP-001 nor TIP-002 address order-type applicability.

#### Pending Freeze Reference

- **Part A1 — TIP-003 (REJECTED)**: Original rule said "tip GST still applies on takeaway/delivery even though SC line is hidden." Owner REJECTED this.
- **Owner-correct rule**: "Tip and tip GST do NOT apply on Takeaway or Delivery orders. The tip input must not appear and tip amount must be 0 in the payload."
- **Linked to**: BUG-001 in the pending-freeze bug cross-reference.

#### Reconciliation Finding

- BUG-075 classified as `already_in_pending_freeze` and `safe for implementation planning`.
- Also flagged as a top business-rule conflict because the pending-freeze TIP-003 rejects the current code behavior.
- The reconciliation report explicitly states: "Apply one shared `tipApplicable` gate across UI + payload builders; keep final baseline untouched until code/QA gates pass."

#### Decision Needed

**Which order types should allow tip?**

The pending-freeze TIP-003 states tip is NOT allowed on takeaway/delivery. The sibling SC pattern (BUG-013) allows SC only for dine-in, walk-in, and room. The owner must confirm whether tip follows the exact same pattern.

#### Options

| Option | Description | Impact |
|---|---|---|
| **A** | Tip allowed only for dine-in | Narrowest scope. Walk-in and room would NOT have tip. Breaks symmetry with SC rule (which includes walk-in + room). |
| **B** | Tip allowed for dine-in + walk-in + room (mirror SC pattern) | Matches the established SC pattern exactly. Recommended by analysis. TIP-003 says "not takeaway/delivery" which implies all others remain eligible. |
| **C** | Tip allowed for dine-in + walk-in + room + takeaway | Broader than TIP-003. Would contradict the pending-freeze owner-correct rule. Not recommended. |
| **D** | Tip allowed for all order types (no change) | Contradicts the pending-freeze owner-correct rule. Not recommended. |
| **E** | Tip visibility/availability is restaurant-configurable per order type | Over-engineers the current requirement. No backend support for per-order-type tip config today. Defer unless owner explicitly asks. |
| **F** | Defer tip orderType rule until owner confirms | Leaves the bug open. Customer-visible financial impact continues. |

#### Recommendation If Evidence Supports It

**Option B — Tip allowed for dine-in + walk-in + room (mirror SC pattern).**

Rationale:
- TIP-003 pending-freeze explicitly says "NOT on takeaway or delivery."
- The established BUG-013 SC pattern uses `orderType === 'dineIn' || orderType === 'walkIn' || isRoom`.
- Tip rides SC GST rate (frozen TIP-002), making it a natural sibling of SC.
- This is the lowest-risk, most consistent option.

#### Implementation Impact By Option

| Option | Files Changed | Risk | Notes |
|---|---|---|---|
| B (recommended) | `CollectPaymentPanel.jsx` (add `tipApplicable` gate at L269/507/1029/1462/1681), `orderTransform.js:calcOrderTotals` (guard `tipAmount` by orderType) | Low — mirrors existing SC pattern | Must also zero `tip_amount` and `tip_tax_amount` in all payload builders for non-applicable order types |
| A | Same files | Medium — breaks walk-in/room symmetry with SC | Would need separate justification |
| C/D | No change or partial | N/A — contradicts pending freeze | Not recommended |
| E | Profile transform + new config UI + all tip consumers | High — new feature scope | Defer |
| F | None | N/A | Bug stays open |

#### QA Assertions Required

| Assertion | Test Flow | Expected Result |
|---|---|---|
| Tip hidden on takeaway | Open Collect Payment for takeaway order with `features.tip` enabled | Tip input NOT visible; tip amount = 0 in payload |
| Tip hidden on delivery | Open Collect Payment for delivery order with `features.tip` enabled | Tip input NOT visible; tip amount = 0 in payload |
| Tip visible on dine-in | Open Collect Payment for dine-in order | Tip input visible if `features.tip` enabled; tip GST computed at SC rate |
| Tip visible on walk-in | Open Collect Payment for walk-in order | Same as dine-in |
| Tip visible on room | Open Collect Payment for room order | Same as dine-in |
| Tip GST = 0 on takeaway/delivery | Capture payload for takeaway/delivery | `tip_amount: 0`, `tip_tax_amount: 0` |
| Print bill tip zero on takeaway/delivery | Print bill for takeaway/delivery | Tip line absent or shows 0 |
| Existing dine-in tip flow unchanged | Full dine-in Collect Payment with tip | Tip + tip GST computed correctly, same as before |

#### Planning Status

`ready_after_owner_confirmation`

---

### BUG-079 — Polling Threshold

#### Current Issue

The order polling reconciliation hook removes an order from the dashboard after **2 consecutive missed polls** (~120 seconds). The owner wants removal after **1 missed poll** (~60 seconds).

#### Current Code Behaviour

1. **`useOrderPollingReconciliation.js:34`**: `export const REMOVAL_MISS_THRESHOLD = 2;` — constant controls the threshold.
2. **`useOrderPollingReconciliation.js:L13` (anti-rule comment)**: "Two consecutive missing polls required before removal" — locked owner direction from the original CR.
3. **`useOrderPollingReconciliation.js:L180-217`**: Removal logic:
   - For each local order missing from the poll response, increment `missCount` (L198).
   - If `missCount >= REMOVAL_MISS_THRESHOLD` (currently 2), call `removeOrder(orderId)` (L200-214).
   - Engaged orders (currently open in OrderEntry) are skipped (L190-191).
   - Hold/Park orders (`fOrderStatus === 9`) are never removed (anti-rule L12).
4. **`useOrderPollingReconciliation.js:L104-105`**: `missCountRef` Map tracks per-order miss counts.
5. **Failure short-circuit**: When the poll API call itself fails (HTTP error), the hook does NOT increment miss counts — existing protection against false-positive removal during transient API failures.

#### Business Baseline Reference

- **Frozen POLL-001**: 60-second silent background poll as safety net. No visual disruption.
- **Frozen POLL-004**: Order currently open in Order Entry is skipped by polling.
- Neither POLL-001 nor POLL-004 define the removal threshold.

#### Pending Freeze Reference

- **Part B12 — POLL-002**: "Order is removed from dashboard after 1 missed poll (not 2). No two-miss buffer."
- **Linked to**: BUG-005 in the pending-freeze bug cross-reference.
- **Code action from pending freeze**: "Update `useOrderPollingReconciliation.js:34,104-105,180-220` to remove after 1 miss."

#### Reconciliation Finding

- BUG-079 classified as `already_in_pending_freeze` and `safe for implementation planning`.
- Also flagged as a top business-rule conflict because the code anti-rule comment at L13 explicitly says "Two consecutive missing polls required before removal" — directly contradicts pending POLL-002.
- The reconciliation addendum (Section 1 of pending freeze) states: "Treat POLL-002 as the controlling pending rule; change constant, anti-rule comment, and pinned tests together."

#### Decision Needed

**Should the removal threshold be 1 miss or 2 misses?**

The pending-freeze POLL-002 already records the owner-correct rule as 1 miss. However, the original anti-rule was deliberately set to 2 misses during the ORDER_POLLING_RECONCILIATION CR to tolerate transient API hiccups. The owner must acknowledge the trade-off.

#### Options

| Option | Description | Impact |
|---|---|---|
| **A** | Keep 2 missed polls before removal | No code change. Dashboard may show stale orders for ~120s after backend terminates them. Current behavior. |
| **B** | Change to 1 missed poll before removal | Dashboard more responsive (~60s max stale window). Higher risk of false-positive removal during a single transient API hiccup (mitigated by existing API-failure short-circuit). **Matches pending POLL-002.** |
| **C** | Make threshold configurable (per-restaurant or via profile) | Over-engineering for current scope. No backend support. Defer unless owner explicitly asks. |
| **D** | Keep current code and only document the pending decision | Leaves the bug open. Anti-rule comment remains stale vs owner intent. |
| **E** | Defer until owner/live smoke confirms acceptable false-positive rate | Safe fallback. Can revisit after observing production behavior. |

#### Recommendation If Evidence Supports It

**Option B — Change to 1 missed poll before removal.**

Rationale:
- POLL-002 pending-freeze already records this as the owner-correct rule.
- The existing API-failure short-circuit means a single failed poll (HTTP error) does NOT trigger removal — it only triggers when the poll succeeds but the order is absent from the response.
- Engaged-order skip (L190-191) and Hold protection (anti-rule L12) remain intact regardless of threshold.
- The risk of "false-positive removal during a transient backend delay" is low because the backend either includes the order in the response (= no miss) or doesn't (= legitimate removal signal).

#### Implementation Impact By Option

| Option | Files Changed | Risk | Notes |
|---|---|---|---|
| B (recommended) | `useOrderPollingReconciliation.js` (L34: change `2` to `1`; L13: update anti-rule comment; L180/201: update inline comments) | Low — single constant | Update pinned tests if any; update investigation docs trail |
| A | None | N/A | Leaves bug open |
| C | Hook + profile transform + new config surface | High | Defer |
| D | Comment update only | N/A | Stale state persists |
| E | None | N/A | Defer |

#### QA Assertions Required

| Assertion | Test Flow | Expected Result |
|---|---|---|
| Order removed after 1 missed poll | Remove an order server-side; wait for next successful poll (~60s) | Order disappears from dashboard after the next successful poll |
| Order NOT removed during API failure | Simulate poll API failure (e.g., network disconnect) | No orders removed; miss counts not incremented |
| Engaged order still protected | Open an order in OrderEntry; remove it server-side; wait for 1+ polls | Order remains on dashboard while OrderEntry is open |
| Hold order still protected | Create a Hold/Park order (fOrderStatus 9); remove from poll response | Order remains on dashboard (never removed by polling) |
| No visual disruption | Watch dashboard during polling cycle | No banner/toast/sound/overlay; only card removal |

#### Planning Status

`ready_after_owner_confirmation`

---

### BUG-080 — partial_payments

#### Current Issue

The `partial_payments` array in order payloads always includes all 3 modes (`cash`, `card`, `upi`) regardless of which payment methods are enabled for the restaurant. Disabled modes appear with `payment_amount: 0`. The owner states that only configured/enabled modes should be included.

#### Current Code Behaviour

1. **`orderTransform.js:placeOrderWithPayment (L1024-1048)`**:
   - **Split payment path (L1028-1040)**: Maps `splitPayments` to entries, then force-adds any of `['cash', 'card', 'upi']` that are missing with `payment_amount: 0`.
   - **Single payment path (L1042-1048)**: Creates entries for ALL 3 modes; selected mode gets full amount, others get 0.
   - **Neither path consults `restaurant.paymentMethods`.**
2. **`orderTransform.js:collectBillExisting (L1289-1297)`**:
   - Split branch maps `splitPayments` directly — does NOT auto-add missing modes.
   - Single/non-split branch: no `partial_payments` emitted (only `payment_method`).
   - **Does NOT consult `restaurant.paymentMethods` either.**
3. **`profileTransform.js:170-175`**: `paymentMethods: { cash, upi, card, tab }` — boolean flags from profile. Available but unused by partial_payments builders.
4. **`tab` mode**: Present in `paymentMethods` config but NOT in the hardcoded `['cash', 'card', 'upi']` list. Tab/credit payments follow a separate settlement path (`payment_status: 'success'` instead of `'paid'`).

#### Business Baseline Reference

- **Frozen PAY-001, PAY-002, PAY-004**: Define place-order and settle-order payload structure but do not specify partial_payments mode filtering.
- **Frozen PAY-008**: "TAB / Credit settlement sends customer name + mobile only; no `customer_id`." — tab follows a separate path.
- No frozen rule addresses partial_payments mode filtering.

#### Pending Freeze Reference

- **Part B8 — PAY-003**: "Prepaid `partial_payments` array includes ONLY payment modes that are configured/enabled for the restaurant. If only cash + UPI are configured, card must NOT appear in the array."
- **Linked to**: BUG-006 in the pending-freeze bug cross-reference.

#### Reconciliation Finding

- BUG-080 classified as `already_in_pending_freeze` and `safe for implementation planning with explicit tab/credit caveat`.
- Also flagged as a top business-rule conflict because the hardcoded mode list directly contradicts pending PAY-003.
- The reconciliation addendum states: "Filter by `restaurant.paymentMethods`; explicitly document tab/credit caveat before implementation."

#### Decision Needed

1. **Should partial_payments include only configured modes?** (PAY-003 says yes.)
2. **Is tab/credit in scope for partial_payments?** (Currently excluded from both the hardcoded list and the partial_payments flow.)
3. **Does the backend accept variable-length partial_payments?** (Currently always receives 3 entries.)

#### Options

| Option | Description | Impact |
|---|---|---|
| **A** | Keep partial_payments limited to cash/card/upi (no change) | No code change. Disabled modes still sent with zero amounts. Contradicts pending PAY-003. |
| **B** | Use configured payment modes dynamically (cash/card/upi filtered by `restaurant.paymentMethods`) | Matches PAY-003. `tab` is excluded because it follows a separate settlement path. **Requires backend confirmation that variable-length `partial_payments` is accepted.** |
| **C** | Use configured modes but explicitly exclude tab/credit | Same as B but with an explicit documented exclusion of tab/credit even if `paymentMethods.tab` is true. Safest option if tab has a separate payment flow. |
| **D** | Include tab/credit in partial_payments only after backend confirmation | Broader scope. Would require backend to accept `tab` as a `payment_mode` in `partial_payments`. High risk without confirmation. |
| **E** | Defer until backend/payment contract is confirmed | Leaves the bug open. Zero-amount entries continue to flow. Low customer-visible impact but incorrect payload. |

#### Recommendation If Evidence Supports It

**Option C — Use configured modes but explicitly exclude tab/credit.**

Rationale:
- PAY-003 pending-freeze says "only configured modes."
- Tab/credit follows a completely separate settlement path (frozen PAY-008) with `payment_status: 'success'` instead of `'paid'`. Including it in `partial_payments` would mix two settlement paradigms.
- The `placeOrderWithPayment` flow is specifically for prepaid (non-tab) settlement.
- Backend tolerance for variable-length `partial_payments` should be confirmed but is likely safe since the entries with `payment_amount: 0` are already informational.

**However, backend confirmation is recommended before implementation** to avoid a silent rejection of the shortened array.

#### Implementation Impact By Option

| Option | Files Changed | Risk | Notes |
|---|---|---|---|
| C (recommended) | `orderTransform.js:placeOrderWithPayment` (L1024-1048: filter by enabled modes excluding tab), `orderTransform.js:collectBillExisting` (L1289-1297: same filter for split path) | Medium — payload shape change | Requires backend tolerance confirmation |
| B | Same as C | Medium | Same, but tab could leak if `paymentMethods.tab` is true |
| A | None | N/A | Contradicts pending freeze |
| D | Same as C + additional tab handling | High | New scope without backend confirmation |
| E | None | N/A | Defer |

#### QA Assertions Required

| Assertion | Test Flow | Expected Result |
|---|---|---|
| Cash-only restaurant: only cash in partial_payments | Place+Pay on restaurant with only `pay_cash` enabled | `partial_payments` has 1 entry: `{payment_mode: 'cash', ...}` |
| Cash+UPI restaurant: only cash and upi | Place+Pay on restaurant with `pay_cash` + `pay_upi` enabled | `partial_payments` has 2 entries |
| All modes enabled: cash + card + upi | Place+Pay on restaurant with all 3 enabled | `partial_payments` has 3 entries (same as today) |
| Tab NOT in partial_payments | Place+Pay on restaurant with `pay_tab` enabled | `partial_payments` does NOT contain a `tab` entry |
| Split payment respects config | Split payment across cash+card on a cash+card enabled restaurant | Only cash and card entries; no upi entry |
| Split payment ignores disabled modes | Split payment selects card on cash-only restaurant | Edge case: card should not be selectable in UI; if somehow selected, payload should still only contain enabled modes |
| Backend accepts variable-length array | Send partial_payments with 1 entry to backend | No HTTP error; order created successfully |
| Audit report tolerates fewer entries | View audit report for an order with 1-entry partial_payments | Report renders correctly; no crash or missing data |

#### Planning Status

`ready_after_owner_and_backend_confirmation`

---

## 6. Owner Questions To Ask

| Question ID | Bug | Plain English Question | Options | Recommended Option If Any | Owner Answer |
|---|---|---|---|---|---|
| **OQ-P2-01** | BUG-075 | Which order types should allow tip input and tip GST? | A. Dine-in only / B. Dine-in + walk-in + room (mirrors SC) / C. Dine-in + walk-in + room + takeaway / D. All types / E. Restaurant-configurable per type / F. Defer | **B** (mirrors established SC pattern from BUG-013) | _Pending_ |
| **OQ-P2-02** | BUG-079 | Should an order be removed from the dashboard after 1 missed poll (~60s) instead of the current 2 (~120s)? The poll already protects against API failures and engaged/Hold orders. | A. Keep 2 misses / B. Change to 1 miss / C. Configurable / D. Document only / E. Defer | **B** (matches pending POLL-002 rule) | _Pending_ |
| **OQ-P2-03** | BUG-079 | Do you accept the trade-off that a single transient backend delay (order missing from one poll but present in the next) could cause a brief card-disappearance-then-reappearance on the dashboard? | Yes, acceptable / No, keep 2-miss buffer | **Yes** (the failure-short-circuit already prevents this for HTTP errors; backend omission from a successful response is a legitimate signal) | _Pending_ |
| **OQ-P2-04** | BUG-080 | Should the partial_payments array include only payment modes enabled in the restaurant's configuration (e.g., cash+UPI only if card is disabled)? | A. Keep all 3 always / B. Filter to configured modes / C. Filter but exclude tab/credit / D. Include tab/credit / E. Defer | **C** (configured modes excluding tab/credit, which has its own settlement path) | _Pending_ |
| **OQ-P2-05** | BUG-080 | Is tab/credit payment mode in scope for partial_payments? Currently tab uses a completely separate settlement flow. | Yes, include tab / No, keep tab on separate path / Defer | **No** (tab has its own `'success'` status path per frozen PAY-008) | _Pending_ |

---

## 7. Backend Questions If Any

| Question ID | Bug | Backend Question | Why Needed | Blocks Implementation? |
|---|---|---|---|---|
| **BQ-P2-01** | BUG-080 | Does the backend accept `partial_payments` arrays with fewer than 3 entries (e.g., 1 or 2 entries instead of always 3)? | Current code always sends 3 entries. Filtering to configured modes will produce 1-3 entries depending on restaurant config. If backend rejects shorter arrays, the fix cannot ship. | **Yes** — blocks BUG-080 implementation |
| **BQ-P2-02** | BUG-080 | Does the backend ever use the zero-amount entries in partial_payments for any purpose (e.g., audit logging, reconciliation, reporting)? | If backend relies on all 3 modes being present (even with zero), removing them could have unintended side effects. | **Yes** — informs implementation approach (remove vs keep-but-filter-UI) |
| — | BUG-075 | No backend question required. | Tip gating is purely frontend. Backend accepts `tip_amount: 0` and `tip_tax_amount: 0` without issue. | N/A |
| — | BUG-079 | No backend question required. | Polling threshold is purely frontend. The poll API does not change. | N/A |

---

## 8. Planning Impact

| Bug | Can Enter Master Implementation Plan? | Condition | Notes |
|---|---|---|---|
| **BUG-075** | Yes, after owner answer | Owner confirms OQ-P2-01 (tip-eligible order types) | If Option B chosen: implementation mirrors BUG-013 SC pattern. Low risk. |
| **BUG-079** | Yes, after owner answer | Owner confirms OQ-P2-02 + OQ-P2-03 (threshold change + trade-off acceptance) | If Option B chosen: single constant change + comment updates. Lowest risk of all three bugs. |
| **BUG-080** | Yes, after owner answer AND backend answer | Owner confirms OQ-P2-04 + OQ-P2-05 (mode filtering + tab scope) AND backend answers BQ-P2-01 + BQ-P2-02 (variable-length tolerance) | If Option C chosen + backend confirms: filter `['cash','card','upi']` by `restaurant.paymentMethods` excluding tab. |

---

## 9. QA Assertions For Future QA Agent

| Bug | QA Assertion | Test Flow | Expected Result | Evidence Required |
|---|---|---|---|---|
| BUG-075 | Tip hidden on takeaway | Collect Payment for takeaway with `features.tip` enabled | Tip input NOT visible; payload `tip_amount: 0`, `tip_tax_amount: 0` | UI screenshot + payload capture |
| BUG-075 | Tip hidden on delivery | Collect Payment for delivery with `features.tip` enabled | Same as above | UI screenshot + payload capture |
| BUG-075 | Tip visible on dine-in | Collect Payment for dine-in | Tip input visible; tip GST computed at SC rate | UI screenshot + payload capture |
| BUG-075 | Tip visible on walk-in | Collect Payment for walk-in | Same as dine-in | UI screenshot + payload capture |
| BUG-075 | Tip visible on room | Collect Payment for room order | Same as dine-in | UI screenshot + payload capture |
| BUG-075 | Print bill tip zero on takeaway/delivery | Print bill for completed takeaway/delivery | Tip line absent or 0 | Printed bill |
| BUG-079 | 1-miss removal | Remove order server-side; wait for next poll | Dashboard removes order after ~60s (1 poll cycle) | Dashboard behavior + timestamps |
| BUG-079 | No removal during API failure | Disconnect network during poll | No orders removed | Dashboard stability check |
| BUG-079 | Engaged order protected | Open OrderEntry for an order; remove server-side | Order stays while editing | Dashboard + OrderEntry state |
| BUG-079 | Hold order protected | fOrderStatus=9 order absent from poll | Order stays on dashboard | Dashboard behavior |
| BUG-080 | Only enabled modes in payload | Place+Pay on cash-only restaurant | `partial_payments` contains only `cash` entry | Payload capture |
| BUG-080 | Tab excluded from partial_payments | Place+Pay on tab-enabled restaurant | No `tab` entry in `partial_payments` | Payload capture |
| BUG-080 | Backend accepts shorter array | Send 1-entry `partial_payments` | HTTP 200; order created | API response |
| BUG-080 | Audit report tolerates fewer entries | View audit for order with 1-entry partial_payments | No crash; correct display | UI screenshot |

---

## 10. Handoff To Owner Decision Capture

### Ready-to-Copy Owner Decision Sheet

Please answer the following 5 questions to unblock implementation planning for BUG-075, BUG-079, and BUG-080:

---

**Q1 (BUG-075):** Which order types should allow tip?
- [ ] A. Dine-in only
- [ ] B. Dine-in + walk-in + room (recommended — mirrors Service Charge pattern)
- [ ] C. Dine-in + walk-in + room + takeaway
- [ ] D. All types (no change)
- [ ] E. Restaurant-configurable per order type
- [ ] F. Defer

**Q2 (BUG-079):** Should orders be removed from the dashboard after 1 missed poll (~60s) instead of the current 2 (~120s)?
- [ ] A. Keep 2 misses (current)
- [ ] B. Change to 1 miss (recommended — matches pending POLL-002 rule)
- [ ] C. Make it configurable
- [ ] D. Document only, no code change
- [ ] E. Defer

**Q3 (BUG-079):** If you choose 1 miss: do you accept that a single transient backend delay could cause a brief card-disappearance-then-reappearance? (Note: API failures are already protected; this only applies to successful polls where the order is temporarily absent.)
- [ ] Yes, acceptable
- [ ] No, keep the 2-miss buffer

**Q4 (BUG-080):** Should partial_payments include only payment modes enabled in the restaurant configuration?
- [ ] A. Keep all 3 always (no change)
- [ ] B. Filter to configured modes
- [ ] C. Filter to configured modes but explicitly exclude tab/credit (recommended)
- [ ] D. Include tab/credit in partial_payments
- [ ] E. Defer

**Q5 (BUG-080):** Is tab/credit in scope for partial_payments?
- [ ] Yes, include tab in partial_payments
- [ ] No, keep tab on its separate settlement path (recommended)
- [ ] Defer

---

**Effect of each decision:**

| Decision | If Chosen | Effect |
|---|---|---|
| Q1 = B | Implementation mirrors BUG-013 SC pattern | ~2hr frontend fix; low risk |
| Q1 = A | Walk-in and room lose tip | Breaks SC/tip symmetry |
| Q1 = F | Bug stays open | Takeaway/delivery users still see tip |
| Q2 = B | Faster stale-order cleanup | 60s max stale window vs 120s |
| Q2 = A | No change | Stale orders linger longer |
| Q3 = Yes | 1-miss implementation proceeds | Brief reappearance possible but rare |
| Q3 = No | 2-miss stays | Bug-079 not fixed |
| Q4 = C | Only enabled modes sent | Backend confirmation needed |
| Q4 = A | No change | Zero-amount entries continue |
| Q5 = No | Tab excluded from partial_payments | Tab settlement path unchanged |
| Q5 = Yes | Tab added to partial_payments | Requires new backend contract work |

---

## 11. Handoff To Master Planning Agent

When the Master Planning Agent runs (Phase 5 or later), it should treat BUG-075, BUG-079, and BUG-080 as follows:

### BUG-075 (Tip OrderType Gate)
- **If owner confirmed Option B**: Include in master implementation plan as a "pending-freeze alignment" item. Implementation mirrors the BUG-013 SC pattern. Bundle with Bucket A (quick frontend fixes). Low risk.
- **If owner chose differently**: Adjust implementation plan per the chosen option. Document the deviation from the SC pattern if applicable.
- **If owner deferred**: Keep in blocked state. Do not implement.
- **Dependencies**: None on other bugs. Can be implemented independently.

### BUG-079 (Polling Threshold)
- **If owner confirmed Option B + acknowledged trade-off**: Include in master plan as a single-constant change. Can be implemented in isolation with minimal regression risk. Update anti-rule comments and investigation docs.
- **If owner chose Option A or deferred**: Keep current behavior. Update documentation to reflect the owner's conscious choice.
- **Dependencies**: Pairs well with BUG-068 (reconnect rehydration) but is not dependent on it.

### BUG-080 (partial_payments)
- **If owner confirmed Option C + backend confirmed variable-length tolerance**: Include in master plan. Filter `['cash', 'card', 'upi']` by `restaurant.paymentMethods` (exclude tab). Pair with BUG-055 since both touch `placeOrderWithPayment` payload shape.
- **If backend does NOT accept variable-length arrays**: Implementation must instead zero-out disabled modes (keep 3 entries but set disabled modes to `payment_amount: 0, grant_amount: 0`) — which is effectively current behavior. In that case, the fix is limited to the UI side (preventing cashier from selecting disabled modes).
- **If owner deferred or backend answer pending**: Keep blocked.
- **Dependencies**: BQ-P2-01 and BQ-P2-02 (backend questions) must be answered first.

---

## 12. Final Status

`owner_decision_bug_planning_created_with_backend_questions`

---

*— End of POS2.0 Owner Decision / Business Rule Bug Planning — Phase 2 —*
