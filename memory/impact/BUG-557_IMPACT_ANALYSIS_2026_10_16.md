# Impact Analysis — BUG-557
## Delivery Assign/Dispatch missing when Default Order Status = "Bill"

**Role:** PLANNING (Gate 2 — Impact Analysis)
**Date:** 2026-10-16
**Code Reality:** PARTIAL — Assign/Dispatch button exists at fOrderStatus=2; gap is that Default=Bill skips status 2
**Conflict Pre-Check:** BUG-561 touched `OrderCard.jsx` (L1044 footer layout). Different lines — CLEAN. BUG-569 (CLOSED_OWNER_ACCEPTED) also touched L1046. CLEAN.

---

## 1. Root Cause (HIGH confidence)

**File:** `src/components/cards/OrderCard.jsx` · **Line:** 1140

```jsx
{!isAggregator && fOrderStatus === 2 && (    // ← L1140: ONLY gate for Assign/Dispatch
  isDelivery ? (
    !hasRiderAssigned ? (
      deliveryAssign ? <Assign Rider btn> : <Dispatch btn>
    ) ...
  ) ...
```

**Normal flow (Default Status = Ready/Serve):**
```
Order placed → fOrderStatus=1 (Preparing) → KOT → fOrderStatus=2 (Ready) ← Assign appears here
→ rider assigned → fOrderStatus=5 (Served/Bill)
```

**Broken flow (Default Status = Bill):**
```
Order placed → confirmOrder(orderId, role, defaultOrderStatus=5)
→ fOrderStatus=5 directly (skips 1, 2, 3)
→ OrderCard shows Bill button (L1206: fOrderStatus===5)
→ Assign/Dispatch window (fOrderStatus===2) NEVER reached
→ Rider can never be assigned
```

**Evidence:**
- `RestaurantContext.jsx:62`: `defaultOrderStatus = restaurant?.defaultOrderStatus || 'paid'`
- `DashboardPage.jsx:1344`: `confirmOrder(order.orderId, permissions?.[0], defaultOrderStatus)` — passes `5` when setting = Bill
- `orderTransform.js:204`: `fOrderStatus: api.f_order_status` — frontend mirrors backend directly
- `OrderCard.jsx:1206`: `{!isAggregator && fOrderStatus === 5 && canBill && (` — Bill path at status 5 (no delivery-specific branch)
- Screenshot confirms: "Owner • Served" card shows "Bill" not "Assign" (restaurant: uat Ruby, Default=Bill)

---

## 2. Affected File

| File | Line | Change |
|---|---|---|
| `src/components/cards/OrderCard.jsx` | L1140 + L1206 area | Add delivery Assign/Dispatch at fOrderStatus=5 when !hasRiderAssigned |

**Only 1 file, ~5-8 lines. Not R5.**

---

## 3. Proposed Fix (E-1)

**Option A (recommended):** Add a delivery-specific Assign/Dispatch branch within the existing `fOrderStatus === 5` block at L1206. When `isDelivery && !hasRiderAssigned`, show Assign/Dispatch instead of (or before) Bill.

```jsx
// CURRENT (L1206):
{!isAggregator && fOrderStatus === 5 && canBill && (
  // Bill / Settle logic
)}

// PROPOSED:
{!isAggregator && fOrderStatus === 5 && isDelivery && !hasRiderAssigned && !isAggregator && (
  // Show Assign Rider (or Dispatch) — same as fOrderStatus===2 branch
  // BUG-557
)}
{!isAggregator && fOrderStatus === 5 && canBill && (!isDelivery || hasRiderAssigned) && (
  // Bill / Settle — gated: only show when rider is assigned (or not delivery)
  // BUG-557
)}
```

**Option B:** Change `fOrderStatus === 2` to `(fOrderStatus === 2 || fOrderStatus === 5)` — simpler but may have side effects for non-delivery orders at status 5.

**OD-557-01:** Option A or B? Recommendation: **Option A** — delivery-specific, no risk to non-delivery Bill flow.

---

## 4. Risk Classification

**Risk: MEDIUM**
- Changes delivery order action button logic in OrderCard
- Not financial (no payment, no settlement)
- Not R5 hotspot
- Affects only: delivery orders + restaurant with Default Order Status = Bill

**Fast Lane:** NOT eligible — logic change + MEDIUM risk + OD needed

---

## 5. Conflict Pre-Check

| Item | Lines | Status | Interaction |
|---|---|---|---|
| BUG-561 | OrderCard.jsx L1044 | GATE_5B_QA_PASSED | Different lines (footer outer div) — CLEAN |
| BUG-097 | OrderCard.jsx L1140-1165 | GATE_5B_QA_PASSED | BUG-097 introduced this block — WP-C changes EXTEND the same block. Plan must re-verify BUG-097 anchors. |

---

## 6. Downstream Consumers

`DashboardPage.jsx` passes `onMarkReady`, `onMarkServed`, `onBillClick` etc. to OrderCard. The Assign Rider button calls `setShowAssignRider(true)` (local state) — no new props needed. `deliveryAssign` comes from `restaurant?.features?.deliveryAssign` (already read at L120). **DashboardPage.jsx: no changes needed.**

---

## 7. Verification Matrix

| # | Check | Viewport | Expected |
|---|---|---|---|
| V1 | Delivery order with Default=Bill → shows Assign (or Dispatch) | Dashboard | Assign/Dispatch button visible on delivery card |
| V2 | After rider assigned → shows Bill | Dashboard | Bill button appears (rider assigned = hasRiderAssigned=true) |
| V3 | Non-delivery order at fOrderStatus=5 | Dashboard | Bill/Settle unchanged (Option A scopes to isDelivery) |
| V4 | Normal flow (Default=Ready) unchanged | Dashboard | Assign still appears at fOrderStatus=2 |
| V5 | Compile clean | — | 1 pre-existing warning, 0 new |

---

## 8. Owner Decisions

**OD-557-01 — LOCKED 2026-10-16**
Fix approach: **Option A confirmed.**

**Requirement locked:**
> "A delivery order MUST always be assigned to a rider, regardless of which status it arrives at. Either it has been made Ready or not — Assign must always appear for a delivery order with no rider assigned."

**Full status investigation (locked):**

| Setting | fOrderStatus | Delivery Assign shown? |
|---|---|---|
| Default=Ready (1) | 1 → 2 via Ready btn | ✅ Assign at fOS=2 |
| Default=Serve (2) | 2 directly | ✅ Assign immediately |
| Default=Bill (5) | 5 directly | ❌ Gap — this bug |
| Default=Accept (4) | 4 (reserved code) | ⚠️ No button at all — future gap |

**Fix locked (Option A):**
At `fOrderStatus === 5` + `isDelivery` + `!hasRiderAssigned` → show Assign/Dispatch.
Bill button at fOS=5 gated: show only when `!isDelivery || hasRiderAssigned`.

---

## Gate 2 Status: CLOSED — 2026-10-16
All ODs locked. No open questions. Gate 3 plan can proceed.

---

## Artifacts
- IA: `/app/memory/impact/BUG-557_IMPACT_ANALYSIS_2026_10_16.md`
- Intake: `change_requests/BUG-557_DELIVERY_ASSIGN_MISSING_DEFAULT_BILL_INTAKE.md`
- Evidence: Screenshots (owner@18march.com, uat Ruby restaurant, Default=Bill setting)
