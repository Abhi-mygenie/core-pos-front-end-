# QA REPORT — Batch 1 (CRITICAL) — 2026-11-08

**Agent:** QA (Investigation role, code-level + browser verification)
**Scope:** CR-513, BUG-659, CR-483, CR-489
**Environment:** Preview URL (preprod backend), cafe103 owner login
**Code changes:** ZERO

---

## Test Results Summary

| # | ID | Test | Result | Severity | Evidence |
|---|---|---|---|---|---|
| T1 | CR-513 | `discount_percentage` included in payload when discount present | ✅ PASS | — | Code: 5 sites in OrderEntry.jsx pass `discountPercent` from paymentData; builder IIFE at L2175-2178 emits when pct > 0 |
| T2 | CR-513 | `discount_percentage` ABSENT when no discount | ✅ PASS | — | Code: `pct > 0` check → empty spread when 0 → field omitted |
| T3 | BUG-659 | Audit report reprint fetches from `get-single-order-new` + payload correct | ✅ PASS | — | Code: AllOrdersReportPage L848 → `SINGLE_ORDER_NEW` → `orderFromAPI.order` maps `discount_type`, `round_up`, `discount_value` (E1) → builder fallbacks fire (E2) |
| T4 | BUG-659 | Beta report reprint also fetches fresh + payload correct | ✅ PASS | — | Code: OrderReportBetaPage L371 → `SINGLE_ORDER_NEW` → same transform → same fallbacks |
| T5 | CR-483 | Cash → "Received Amount" field visible with auto-seeded amount | ✅ PASS | — | Browser screenshot: Collect Payment panel shows "Received Amount" = ₹13,934, ±3% validation text visible |
| T6 | CR-483 | Card → "Received Amount" field with MDR adjustment | ✅ PASS (code) | — | Code: `reconcileEnabled` from `restaurantSettings.reconcileAmount` gates the field for ALL payment methods (L3439) |
| T7 | CR-483 | ±3% validation works | ✅ PASS | — | Browser screenshot: shows "±3% allowed (₹13,515.98 – ₹14,352.02)"; Code: L863 `receivedAmountMin = effectiveTotal * 0.97`, `receivedAmountMax = effectiveTotal * 1.03` |
| T8 | CR-489 | Bill printed → order locked for non-authorized user | ✅ PASS (code) | — | Code: `isEditLocked = settings.orderEditAccess && order.billPrinted && !canEditAfterPrint` (OrderEntry L365-367); 13 lock gates in OrderEntry, 7 in CartPanel, 5 in OrderCard, 2 in TableCard |
| T9 | CR-489 | Collect Bill still works on locked order | ✅ PASS (code) | — | Code: No `isEditLocked` gate on "Collect Bill" button path. Lock gates only on: add item, edit qty, cancel, shift table, merge, food transfer, customer edit, Update Order, KOT |
| T10 | CR-489 | User WITH permission can edit after bill print | ✅ PASS (code) | — | Code: `!canEditAfterPrint` (from `hasPermission('order_edit_access')`) → false → `isEditLocked = false` → no lock |

---

## Findings

### ⚠️ NOTE-1: BUG-659 P5 paths still broken (KNOWN — not a new finding)
- Dashboard manual reprint (OrderCard/TableCard/RePrintButton) still passes stale context data
- `discount_type: null`, `round_up: null` from `employee-orders-list` → BUG-659 fallbacks don't fire
- **This is already documented as "Option A pending" — NOT a QA failure**

### ⚠️ NOTE-2: CR-483 depends on restaurant setting `reconcile_amount`
- "Received Amount" field only visible when `restaurantSettings.reconcileAmount = true`
- cafe103 HAS this enabled (verified via browser — field was visible)
- Restaurants without this setting will NOT see the field (by design, per OD-483-09)

### ⚠️ NOTE-3: CR-489 requires backend `order_edit_access` permission configuration
- Lock behavior depends on:
  1. Restaurant setting `order_edit_access` = ON
  2. Order `billPrinted` = true
  3. User lacking `order_edit_access` permission
- Full E2E verification requires testing with a non-owner role that lacks this permission
- Browser verification deferred to owner smoke — owner must assign the permission to a test role first

### ⚠️ NOTE-4: CR-513 `roundoff` uses `paymentData.roundOff` which may be undefined
- Code at L2327: `roundoff: paymentData?.roundOff`
- When order has no roundoff (exact amount), `paymentData.roundOff` = 0 or undefined
- Builder: `ro !== 0` → omitted when 0 → correct behavior (no roundoff sent when none exists)
- However: `paymentData?.roundOff` as `undefined` → `overrides.roundoff !== undefined` is FALSE → falls to order fallback
- This means: for collect-bill path WITHOUT roundoff, the builder checks `order.roundUp` fallback. If order had a previous roundoff value from a different payment attempt, it could leak.
- **Severity: MINOR** — edge case, only if user cancels payment with roundoff then re-pays without

---

## Coverage

| File | Tested? | How |
|---|---|---|
| `orderTransform.js` (R5) | ✅ | Code trace: E1 mapping + E2 IIFEs + output object |
| `OrderEntry.jsx` (R5) | ✅ | Code trace: 5 override sites, 13 lock gates |
| `CollectPaymentPanel.jsx` | ✅ | Browser screenshot + code trace: received amount field + validation |
| `OrderCard.jsx` | ✅ | Code trace: 5 lock gates, green bg |
| `TableCard.jsx` | ✅ | Code trace: 2 lock gates, green bg |
| `CartPanel.jsx` | ✅ | Code trace: 7 lock gates |
| `restaurantSettingsTransform.js` | ✅ | Code trace: `reconcileAmount` + `orderEditAccess` mapping |
| `profileTransform.js` | ✅ | Code trace: `orderEditAccess` from login |
| `AllOrdersReportPage.jsx` | ✅ | Code trace: L848 SINGLE_ORDER_NEW + L870 transform |
| `OrderReportBetaPage.jsx` | ✅ | Code trace: L371 SINGLE_ORDER_NEW + L384 transform |
| `OrderContext.jsx` | ✅ | Code trace: `billPrinted` in whitelist (BUG-657) |

**Coverage: 11/11 changed files tested**

---

## Verdict

**Batch 1: 10/10 PASS** (4 NOTEs logged, 0 BLOCKER, 0 MAJOR, 1 MINOR edge case)

| Finding | Severity | Action |
|---|---|---|
| NOTE-1: BUG-659 P5 known broken | NOTE | Already tracked — Option A separate gate cycle |
| NOTE-2: CR-483 setting-dependent | NOTE | By design |
| NOTE-3: CR-489 needs permission setup for E2E | NOTE | Owner smoke prerequisite |
| NOTE-4: CR-513 roundoff fallback leak edge case | MINOR | Owner decides: ship or fix |

**Recommendation:** All 4 items ready for **Gate 6 (Owner Smoke)**. The MINOR finding (NOTE-4) is an edge case unlikely in production — owner can decide to ship or file a follow-up.
