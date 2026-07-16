# POS2.0 Master Implementation Plan — 2026-05-17

## 1. Purpose

This is the **single consolidated implementation plan** for the entire POS2.0 sprint, combining outputs from Phase 1 (clean safe), Phase 2 (owner decision), Phase 3 (backend source-of-truth), and Phase 4 (remaining blocked).

### Scope Constraints
- No implementation was done.
- No code was changed.
- No final baseline (`/app/memory/final/`) was updated.
- No pending freeze doc was updated.
- This document is the handoff artifact for the implementation agent.

---

## 2. Inputs Read

| Input | Path |
|---|---|
| Phase 1 plan | `POS2_0_CLEAN_SAFE_BUG_IMPLEMENTATION_PLAN_2026_05_17.md` |
| Phase 2 plan + decisions | `POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md` + `POS2_0_PHASE_2_OWNER_DECISION_CAPTURE_2026_05_17.md` |
| Phase 3 plan + questions + addendum | `POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md` + `POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md` + `POS2_0_PHASE_3_OPEN_QUESTION_COMPLETION_ADDENDUM_2026_05_17.md` |
| Phase 4 plan + decisions + backend + QA | `POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md` + `POS2_0_PHASE_4_OWNER_DECISION_CAPTURE_2026_05_17.md` + `POS2_0_PHASE_4_BACKEND_QUESTION_CAPTURE_2026_05_17.md` + `POS2_0_PHASE_4_QA_REPRO_AND_CLOSURE_2026_05_17.md` |
| Business rules baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| Pending freeze | `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` |
| Reconciliation report | `BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md` |
| Bug impact analysis | `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md` |

---

## 3. Full Sprint Bug Inventory (37 bugs)

| # | Bug | Phase | Status | Wave | Summary |
|---|---|---|---|---|---|
| 1 | BUG-050 | 4 | ready_for_master_plan | W4 | Manual reprint parity — use Collect Bill override path |
| 2 | BUG-051 | 1 | ready_for_implementation | W2 | Round-off always-ceil |
| 3 | BUG-052 | 4 | ready_for_master_plan_with_constraints | W2 | Profile boolean gate for round-off (after BUG-051). Constraint: identify exact field name in profileTransform during Wave 2 code inspection. |
| 4 | BUG-053 | 4 | closed | — | No hardcoded percentage found |
| 5 | BUG-054 | 1 | ready_for_implementation | W2 | VAT discount proration |
| 6 | BUG-055 | 1 | ready_for_implementation | W2 | Prepaid `order_discount_type` payload parity |
| 7 | BUG-056 | 4 | ready_for_master_plan | W3 | Preset discount dropdown (mutually exclusive) |
| 8 | BUG-057 | 4 | ready_for_master_plan | W4 | Prepaid Print Bill on Collect Bill + order screen |
| 9 | BUG-058 | 4 | qa_repro_required | W7 | Prepaid-hold settlement payload (runtime investigation) |
| 10 | BUG-059 | 4 | ready_for_master_plan | W4 | Audit Report Print Bill — Paid orders only |
| 11 | BUG-060 | 4 | candidate_with_constraints | W7 | FE context not clearing source table on room transfer |
| 12 | BUG-061 | 4 | candidate_with_constraints | W7 | Room check-in time column data not bound |
| 13 | BUG-062 | 1 | ready_for_implementation | W1 | Hide To Room for takeaway/delivery |
| 14 | BUG-063 | 4 | blocked_backend | Parked | Room bill print fields — owner will provide template mapping |
| 15 | BUG-064 | 4 | blocked_backend | Parked | Room transfer notification — backend must add marker |
| 16 | BUG-065 | 4 | blocked_backend | Parked | Corporate room GST echo — parked for backend team |
| 17 | BUG-066 | 4 | ready_for_master_plan | W1 | Food transfer exclude rooms — add `!o.isRoom` |
| 18 | BUG-067 | 4 | ready_for_master_plan | W1 | Station toggle disabled when no stations |
| 19 | BUG-068 | 1 | ready_for_implementation | W6 | Socket reconnect rehydration |
| 20 | BUG-069 | 4 | blocked_backend | Parked | Notification sequencing — backend-owned |
| 21 | BUG-070 | 1 | ready_for_implementation | W5 | Area grouping for rooms in Table/Channel View |
| 22 | BUG-071 | 1 | ready_for_implementation | W5 | DB ID vs restaurant_order_id display audit |
| 23 | BUG-072 | 4 | ready_for_master_plan | W1 | Add note fields to order card |
| 24 | BUG-073 | 1 | ready_for_implementation | W1 | Empty customization wrapper fix |
| 25 | BUG-074 | 4 | closed | — | Autofill attributes already present |
| 26 | BUG-075 | 2 | ready_for_master_plan | W2 | Tip orderType gate (dine-in + walk-in + room) |
| 27 | BUG-076 | 4 | closed_duplicate | — | Duplicate of BUG-051 |
| 28 | BUG-077 | 4 | closed_pending_verify | — | Mobile trim likely already resolved |
| 29 | BUG-078 | 4 | ready_for_master_plan | W1 | CRM timeout toast |
| 30 | BUG-079 | 2 | ready_for_master_plan | W1 | Polling threshold 1-miss |
| 31 | BUG-080 | 2 | ready_for_master_plan_with_constraints | W3 | partial_payments UI enforcement |
| 32 | BUG-081 | 4 | closed_already_resolved | — | Snooze already 120000ms |
| 33 | BUG-082 | 3 | ready_for_master_plan | W6 | Scan socket contract — index 4 primitive |
| 34 | BUG-083 | 3 | ready_for_master_plan | W2 | Delivery GST key `delivery_charge_gst_amount` |
| 35 | BUG-084 | 3 | deferred | — | Per-component CGST/SGST — future sprint |
| 36 | BUG-085 | 3 | pending_backend | Parked | Print template GST — Q-085-2 parked |
| 37 | BUG-086 | 4 | closed_already_resolved | — | Room grand-total key confirmed |

---

## 4. Sprint Counts

| Category | Count | Bugs |
|---|---|---|
| Implementable NOW (Waves 1-6) | **22** | See Waves below |
| Constraint resolution / investigation (Wave 7) | **3** | BUG-058, 060, 061 |
| Blocked on backend | **4** | BUG-063, 064, 065, 069 |
| Deferred to future sprint | **1** | BUG-084 |
| Pending backend answer | **1** | BUG-085 |
| Closeable (no implementation) | **6** | BUG-053, 074, 076, 077, 081, 086 |
| **Total** | **37** | |

---

## 5. Implementation Waves

### Wave 1 — Quick Wins (7 bugs)

**Priority:** P0 — fastest turnaround, lowest risk, highest confidence
**Estimated effort:** 1-2 days
**Risk:** LOW

| Bug | Fix Summary | Primary File(s) | Change Size |
|---|---|---|---|
| BUG-062 | Add `&& (orderType === 'dineIn' \|\| orderType === 'walkIn')` to To Room render gate | `CollectPaymentPanel.jsx` L1953 | 1 condition |
| BUG-073 | Add `(size \|\| variants?.length \|\| addons?.length)` to customization gate | `CartPanel.jsx` L65 | 1 condition |
| BUG-066 | Add `&& !o.isRoom` to food transfer destination filter | `TransferFoodModal.jsx` L19 | 1 condition |
| BUG-067 | Disable Station View toggle when no stations in bootstrap data | `StatusConfigPage.jsx` | 1 conditional gate + tooltip |
| BUG-079 | Change `REMOVAL_MISS_THRESHOLD = 2` to `1`; update comments | `useOrderPollingReconciliation.js` L34, L13 | 1 constant + comments |
| BUG-078 | Add toast on CRM timeout; distinguish from "not found"; allow manual proceed | `customerService.js` or CRM error handler | Toast call + error type check |
| BUG-072 | Map existing note fields (room_note, table_note, item_note) onto OrderCard render — mirror order-screen note format | `OrderCard.jsx` | Additive display lines |

**Wave 1 QA:**
- Takeaway/delivery → To Room hidden; dine-in/walk-in → visible
- Empty customization → no empty line; partial → still renders
- Food transfer modal → rooms not in destination list
- Station toggle → disabled when no stations; enabled when stations exist
- Remove server-side order → disappears after 1 poll (~60s)
- CRM timeout → toast shows; cashier can proceed manually
- Order card → notes visible when present

**File overlap:** `CollectPaymentPanel.jsx` touched by BUG-062 only (L1953) — non-overlapping with Wave 2 financial section (L520-590).

---

### Wave 2 — Financial Core (6 bugs)

**Priority:** P0 — highest business impact, highest risk
**Estimated effort:** 3-4 days
**Risk:** HIGH — touches `orderTransform.js` (calcOrderTotals, payload builders) + `CollectPaymentPanel.jsx` (financial section)

| Bug | Fix Summary | Primary File(s) | Phase Source |
|---|---|---|---|
| BUG-051 | Replace conditional ceil/floor with `Math.ceil`; update comments + tests | `orderTransform.js` L655-661, `CollectPaymentPanel.jsx` L579-585, test files | Phase 1 |
| BUG-054 | Apply `(1 - discountRatio)` to `vatTax`/`vat` | `orderTransform.js` L649-651, `CollectPaymentPanel.jsx` L575 | Phase 1 |
| BUG-055 | Add `order_discount_type` to `placeOrderWithPayment` + `updateOrder` | `orderTransform.js` L1080, L959 | Phase 1 |
| BUG-075 | Add `tipApplicable` gate (mirrors SC pattern) across UI + payload | `CollectPaymentPanel.jsx` L269/507/1029/1462/1681, `orderTransform.js` calcOrderTotals | Phase 2 |
| BUG-083 | Add `delivery_charge_gst_amount` key to calcOrderTotals return + 4 payload builders; absent for non-delivery | `orderTransform.js` L648/669/678, `collectBillExisting`, `placeOrderWithPayment`, `buildBillPrintPayload` | Phase 3 |
| BUG-052 | Read profile boolean for round-off; gate `Math.ceil` on it (after BUG-051) | `profileTransform.js`, `orderTransform.js`, `CollectPaymentPanel.jsx` | Phase 4 |

**Recommended internal sequence:**
1. BUG-051 (round-off rule reversal — base for BUG-052)
2. BUG-054 (VAT proration — independent math, same flow)
3. BUG-055 (payload key addition — mechanical)
4. BUG-075 (tip gate — mirrors SC pattern; independent of above)
5. BUG-083 (delivery GST key — adds new key to all payload builders)
6. BUG-052 (profile boolean gate — wraps BUG-051 with config; CONSTRAINT: identify exact field name in profileTransform first)

**Wave 2 QA:**
- Round-off: 105.05 → 106, 105.15 → 106, 100.00 → 100
- VAT: discounted VAT order recalculates correctly; non-discounted unchanged
- Discount type: prepaid/update payloads include `order_discount_type`
- Tip: hidden/zero on takeaway+delivery; visible on dine-in+walk-in+room
- Delivery GST: separate key present for delivery; absent for non-delivery; composite unchanged
- Profile gate: round-off disabled → raw total used; enabled → ceiling

**Business rules to preserve:** Frozen TAX-001-008, SC-001-006, TIP-001-002, ROUND-002, TOTALS-001-002, PAY-001-008, DEL-004-005.

---

### Wave 3 — Payment / Discount (2 bugs)

**Priority:** P1
**Estimated effort:** 2 days
**Risk:** MEDIUM

| Bug | Fix Summary | Primary File(s) | Phase Source |
|---|---|---|---|
| BUG-080 | Prevent cashier from selecting disabled payment modes in UI; keep 3-entry payload | `CollectPaymentPanel.jsx` (payment mode selector), `orderTransform.js` (validation) | Phase 2 |
| BUG-056 | Render preset discount dropdown from fetched categories; mutually exclusive with manual | `CollectPaymentPanel.jsx` (new dropdown component) | Phase 4 |

**Wave 3 QA:**
- Disabled payment mode → not selectable in UI; payload still has 3 entries; disabled at zero
- Tab → not in partial_payments
- Preset discount → dropdown populates from categories; selecting preset clears manual; entering manual clears preset
- Preset discount → flows through existing `orderDiscountType`/`orderDiscountValue` pathway

**Depends on:** Wave 2 landing first (shared `CollectPaymentPanel.jsx` file; Wave 2 touches L520-590, Wave 3 touches payment selector + new discount component).

---

### Wave 4 — Print Cluster (3 bugs)

**Priority:** P1
**Estimated effort:** 2-3 days
**Risk:** MEDIUM — new print surfaces; must use override path for financial accuracy

| Bug | Fix Summary | Primary File(s) | Phase Source |
|---|---|---|---|
| BUG-050 | Dashboard card reprint → inject stored order totals into `buildBillPrintPayload` default branch (or redirect to override branch) | `OrderCard.jsx`, `TableCard.jsx`, `orderTransform.js` (buildBillPrintPayload) | Phase 4 |
| BUG-057 | Add Print Bill button in Collect Bill panel + order screen for prepaid orders | `CollectPaymentPanel.jsx`, `OrderEntry.jsx` | Phase 4 |
| BUG-059 | Add Print Bill row action on Paid tab in Audit Report; current permissions; no cancelled print | `OrderTable.jsx`, `OrderDetailSheet.jsx` | Phase 4 |

**Recommended internal sequence:**
1. BUG-050 first (fixes the financial parity issue — all other print surfaces must use the correct path)
2. BUG-057 (uses the now-correct print path for prepaid)
3. BUG-059 (uses the same print path for audit report)

**Wave 4 QA:**
- Dashboard reprint after cancellation/discount/tip → matches Collect Bill bill exactly
- Prepaid order → Print Bill visible on Collect Bill panel + order screen
- Audit Report → Print Bill on Paid rows; no print on Cancelled rows; permission-gated

**Depends on:** Wave 2 (financial changes affect print payload values).

---

### Wave 5 — Dashboard Presentation (2 bugs)

**Priority:** P1
**Estimated effort:** 2-3 days
**Risk:** MEDIUM — `DashboardPage.jsx` is a hotspot; memoization-sensitive

| Bug | Fix Summary | Primary File(s) | Phase Source |
|---|---|---|---|
| BUG-070 | Section-group rooms by area in Table View; expose sections in Channel View | `DashboardPage.jsx`, `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx` | Phase 1 |
| BUG-071 | Replace DB `orderId` with `restaurant_order_id` on all human-visible surfaces; preserve `data-testid` on DB ID | `OrderCard.jsx`, `OrderEntry.jsx`, `TableCard.jsx`, `OrderTable.jsx`, `OrderDetailSheet.jsx` | Phase 1 |

**Wave 5 QA:**
- Table View → rooms grouped by area; non-sectioned rooms → "Default" section
- Channel View → area headers in Dine-In and Room columns
- Order View → unchanged (flat)
- Card chip/toast → restaurant_order_id
- `data-testid` → still DB orderId
- Print payload `order_id` → still DB ID; `restaurant_order_id` → user-facing

**Depends on:** Wave 1 landing (OrderCard.jsx touched by BUG-072 in Wave 1 for notes; BUG-071 in Wave 5 for display ID — non-overlapping sections).

---

### Wave 6 — Socket / Realtime (2 bugs)

**Priority:** P1
**Estimated effort:** 2-3 days
**Risk:** MEDIUM — socket subsystem; dedupe + parser changes

| Bug | Fix Summary | Primary File(s) | Phase Source |
|---|---|---|---|
| BUG-068 | On socket reconnect (RECONNECTING → CONNECTED), call `getRunningOrders` + dedupe-merge into OrderContext | `socketService.js`, `useSocketEvents.js`, `OrderContext.jsx` | Phase 1 |
| BUG-082 | `scan-new-order` index 4 = primitive `'web'` (not full payload); `new-order` unchanged; retire channel-based fallback | `socketHandlers.js` (handleScanNewOrder), `socketEvents.js` (MSG_INDEX handling) | Phase 3 |

**Wave 6 QA:**
- Disconnect → miss scan-new-order → reconnect → popup appears without refresh
- No duplicate orders after reconnect
- Engage locks preserved
- Hold orders not surfaced
- Web order popup triggers correctly with new index-4 primitive
- POS orders do not trigger web popup
- Fallback at L508-511 retired (no dead code)

**Independent of:** Waves 1-5 (socket subsystem is isolated).

---

### Wave 7 — Constraint Resolution + Investigation (3 bugs)

**Priority:** P2 — needs code inspection or runtime evidence before implementation
**Estimated effort:** 1-2 days (code inspection) + implementation time

| Bug | What Needs To Happen | Constraint | Phase Source |
|---|---|---|---|
| BUG-058 | Capture runtime payload for "hold-paid-hold" vs "prepaid-hold" settlement | Runtime environment needed; endpoint confirmed as `order-bill-payment` | Phase 4 |
| BUG-060 | Identify why FE context does not clear source table after room transfer (paid/cancel clears fine) | Inspect `OrderContext`/`TableContext` clearing logic for room-transfer path vs paid/cancel path | Phase 4 |
| BUG-061 | Identify the check-in time field binding gap in the room report column | Inspect room report component; column exists, data not bound; use checkout format | Phase 4 |

---

## 6. Parked / Blocked Items (not in waves)

### Blocked on Backend (4 bugs)

| Bug | Summary | Blocker | What Backend Must Do | Can Unblock To |
|---|---|---|---|---|
| BUG-063 | Room bill print fields | Owner will provide template field mapping at runtime | Provide template key names for room fields | Wave 4 (print cluster) |
| BUG-064 | Room transfer notification | Backend has no transfer marker | Add notification marker (e.g., `notification_type: 'room_transfer'`) to FCM/socket payload | Wave 6 (socket) or new Wave |
| BUG-065 | Corporate room GST echo | Parked for backend team | Confirm echo field names + template mapping | Wave 4 (print cluster) |
| BUG-069 | Notification sequencing | Parked for backend team | Implement sound/notification sequencing so order data arrives with notification | Backend-only fix; FE may need minor adjustments after |

### Deferred (1 bug)

| Bug | Summary | Reason |
|---|---|---|
| BUG-084 | Per-component CGST/SGST payload keys | Backend does not need per-component keys this sprint. Frontend UI already correct. Deferred to future sprint. |

### Pending Backend Answer (1 bug)

| Bug | Summary | Question |
|---|---|---|
| BUG-085 | Print template GST display | Q-085-2 parked: does print template have a slot for `delivery_charge_gst_amount`? If yes → bundles with BUG-083. If no → needs template update first. |

---

## 7. Closures (6 bugs — no implementation needed)

| Bug | Closure Reason | Close With |
|---|---|---|
| BUG-053 | No hardcoded percentage found; all rates from profile | Close immediately |
| BUG-074 | `autoComplete="email"` and `autoComplete="current-password"` already present | Close immediately |
| BUG-076 | Duplicate of BUG-051 | Close when BUG-051 passes QA |
| BUG-077 | Mobile trim likely already resolved | QA verify with BUG-078 work; close if trim works |
| BUG-081 | Snooze already 120000ms | QA verify; close if confirmed |
| BUG-086 | Room grand-total key already user-confirmed | QA verify; close if `order_amount` confirmed |

---

## 8. Dependency Chain

```
No dependency (independent):
  Wave 1 (all 7 bugs)
  Wave 6 (BUG-068, BUG-082)

Sequential:
  Wave 2 (financial core) → Wave 3 (payment/discount) → Wave 4 (print cluster)
  BUG-051 → BUG-052 (profile gate wraps round-off)
  BUG-050 → BUG-057, BUG-059 (print parity must land before new print surfaces)

Parallel tracks:
  Track A: Wave 1 → Wave 5 (dashboard)
  Track B: Wave 2 → Wave 3 → Wave 4 (financial → payment → print)
  Track C: Wave 6 (socket — fully independent)
  Track D: Wave 7 (constraint resolution — code inspection phase)
```

**Recommended parallel execution:**

| Day | Track A | Track B | Track C |
|---|---|---|---|
| Day 1-2 | Wave 1 (quick wins) | — | — |
| Day 3-4 | Wave 5 (dashboard) | Wave 2 starts (financial) | Wave 6 (socket) |
| Day 5-7 | QA Wave 1+5 | Wave 2 continues | QA Wave 6 |
| Day 8-9 | — | Wave 3 (payment) | — |
| Day 10-11 | — | Wave 4 (print) | — |
| Day 12 | — | Wave 7 (constraints) | — |
| Day 13-14 | Full regression QA | Full regression QA | Full regression QA |

---

## 9. File Touch Map (Cross-Wave)

| File | Waves | Bugs | Risk |
|---|---|---|---|
| `orderTransform.js` | W2, W4 | BUG-051, 054, 055, 075, 083, 052, 050 | **CRITICAL** — 7 bugs; must sequence carefully |
| `CollectPaymentPanel.jsx` | W1, W2, W3, W4 | BUG-062, 051, 054, 075, 080, 056, 057 | **CRITICAL** — 7 bugs across 4 waves; non-overlapping sections |
| `DashboardPage.jsx` | W5 | BUG-070 | HIGH — hotspot; memoization |
| `OrderCard.jsx` | W1, W4, W5 | BUG-072, 050, 071 | MEDIUM — 3 bugs; non-overlapping |
| `OrderEntry.jsx` | W4, W5 | BUG-057, 071 | MEDIUM |
| `socketHandlers.js` | W6 | BUG-082 | MEDIUM |
| `socketService.js` | W6 | BUG-068 | MEDIUM |
| `useSocketEvents.js` | W6 | BUG-068 | MEDIUM |
| `OrderContext.jsx` | W6 | BUG-068 | MEDIUM |
| `useOrderPollingReconciliation.js` | W1 | BUG-079 | LOW |
| `CartPanel.jsx` | W1 | BUG-073 | LOW |
| `TransferFoodModal.jsx` | W1 | BUG-066 | LOW |
| `StatusConfigPage.jsx` | W1 | BUG-067 | LOW |
| `profileTransform.js` | W2 | BUG-052 | LOW |
| `OrderTable.jsx` | W4, W5 | BUG-059, 071 | LOW |
| `OrderDetailSheet.jsx` | W4, W5 | BUG-059, 071 | LOW |
| `TableCard.jsx` | W4, W5 | BUG-050, 071 | LOW |
| Test files | W2 | BUG-051 re-baseline | LOW |

---

## 10. Business Rules Protection Checklist

The implementation agent must verify these frozen rules are preserved after each wave:

| Rule | Applicable Waves | Check |
|---|---|---|
| TAX-001/002 (GST calc) | W2 | GST exclusive/inclusive math unchanged for non-affected flows |
| TAX-003 (VAT) | W2 | VAT follows same formula; BUG-054 aligns this |
| TAX-005 (mixed GST+VAT) | W2 | Separate tracking preserved |
| TAX-008 (null rate → 0%) | W2 | Force-zero fallback preserved |
| SC-001/002/003/006 | W2 | SC calculation unchanged |
| TIP-001/002 | W2 | Tip GST rate sourced from SC rate |
| ROUND-002 | W2 | Round-off applies to Grand Total only |
| TOTALS-001/002 | W2, W4 | Item Total and Subtotal formulas unchanged |
| PAY-001/002/004/007/008 | W2, W3, W4 | Payment payload contracts preserved |
| DEL-004/005 | W2 | Delivery charge read-only for prepaid preserved |
| DASH-001/002/003 | W5 | Hold orders on Hold tab only; channel/status consistency |
| POLL-001/004 | W1, W6 | 60s poll unchanged; open-order skip preserved |
| ROOM-001 | W4, W7 | Room report totals formula unchanged |
| BOOT-001/002 | W6 | Profile loads first; station progress visible |

---

## 11. Handoff To Implementation Agent

### Start here:
1. Read this master plan
2. Confirm Wave 1 bugs are still accurate against current code
3. Implement Wave 1 (7 quick wins)
4. QA Wave 1
5. Proceed to Wave 2 (financial core — highest risk, most careful)
6. Continue wave-by-wave per the dependency chain

### Critical rules:
- **Never modify `/app/memory/final/`** during implementation — only after full QA + owner reconfirmation
- **Never promote pending-freeze rules to baseline** — that requires a separate approval cycle
- **Always use `buildBillPrintPayload` override path** for new print surfaces (Wave 4)
- **Re-baseline affected test files** in Wave 2 before proceeding to Wave 3
- **Preserve `data-testid` on DB orderId** in Wave 5 (BUG-071)
- **Do not change composite `gst_tax` calculation** when adding `delivery_charge_gst_amount` in Wave 2 (BUG-083) — composite retains delivery GST per DEL-001 policy

### Per-wave handover:
After each wave, create:
1. Implementation summary (files changed, what changed)
2. QA report (assertions passed/failed)
3. Regression checklist (frozen rules verified)

### When blocked bugs unblock:
- BUG-063/065 → slot into Wave 4 (print cluster)
- BUG-064 → slot into Wave 6 (socket) or new wave
- BUG-069 → backend-only; FE adjustments if needed
- BUG-085 → if Q-085-2 confirmed, bundles with BUG-083 in Wave 2

---

## 12. Final Status

`master_implementation_plan_created_audited_corrected`

### Summary

| Metric | Count |
|---|---|
| Total POS2.0 bugs | 37 |
| Implementable now (Waves 1-6) | 22 |
| Constraint resolution / investigation (Wave 7) | 3 |
| Blocked on backend | 4 |
| Deferred to future sprint | 1 |
| Pending backend answer | 1 |
| Closeable (no implementation) | 6 |
| Implementation waves | 7 |
| Estimated calendar days | 14 (with parallel tracks) |
| Highest risk wave | Wave 2 (financial core) |
| Fastest turnaround wave | Wave 1 (quick wins) |
| Audit corrections applied | 3 (BUG-052 dual placement, Sprint Count fix, BUG-072 constraint note) |

---

*— End of POS2.0 Master Implementation Plan —*
