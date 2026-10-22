# BUG-557 — Intake (Gate 1)
## Delivery — Assign Rider option missing when Default Order Status = "Bill"

**ID:** BUG-557
**Type:** BUG
**Date:** 2026-10-16
**Severity:** P1 — HIGH
**Risk:** MEDIUM
**Sprint:** oct_cr_batch
**Area:** Delivery (filed under: Menu / Order Entry)
**Duplicate check:** RELATED to BUG-097 (Dispatch + Assign Rider flow, BUG-097 introduced the Assign button). BUG-557 is the specific gap in the Default Status = Bill configuration.
**Source:** OWNER-REPORTED (Gate 6 smoke 2026-10-15)

---

## 1. Description

When a restaurant's **Default Order Status** is set to **"Bill"** (fOrderStatus = 5), delivery orders placed on this restaurant **skip the Ready stage (fOrderStatus=2) entirely** — jumping directly to Bill. 

The **Assign/Dispatch Rider** button in `OrderCard.jsx` only appears at `fOrderStatus === 2` (`L1140`). Since delivery orders in this config never pass through fOrderStatus=2, the Assign button is never shown. Riders can never be assigned.

**Owner confirmation:**
- Setting: Default Order Status = **Bill** (confirmed via screenshot — Restaurant Settings page)
- In this mode orders go: Placed → Bill (skips Ready, Serve)
- Delivery orders in this mode show **"Bill"** button instead of "Assign"

---

## 2. Screenshots

**Screenshot 1:** Restaurant Settings — Default Order Status = "Bill" (uat Ruby / Food Court / Gurugram)

**Screenshot 2:** Dashboard Delivery column with 2 orders:
- Left: "p • Ready" (28d old order from before setting change) → shows **Assign** ✅
- Right: "Owner • Served" (new order under Bill setting) → shows **Bill** ❌ — Assign was never offered

**Test account:** `owner@18march.com` / `Qplazm@10`

---

## 3. Code Reality

**PARTIAL** — `OrderCard.jsx:1140–1155`:
```jsx
{!isAggregator && fOrderStatus === 2 && (
  isDelivery ? (
    // BUG-097: No rider yet — show Dispatch or Assign Rider
    deliveryAssign ? (
      <button data-testid={`assign-rider-btn-${orderId}`}>Assign Rider</button>
```

**BREAK POINT:** `fOrderStatus === 2` gate — when Default Status = Bill, orders arrive at fOrderStatus=5, never passing through 2. Fix must either:
- A) Add `|| fOrderStatus === 5` to the Assign gate for delivery orders (when no rider assigned), OR
- B) Intercept delivery orders before the status jump and force them through an assign step

---

## 4. Evidence
- **Screenshot 1:** Restaurant Settings — Default Order Status = Bill
- **Screenshot 2:** Two delivery cards — one shows Assign (old, fOrderStatus=2), one shows Bill (new, fOrderStatus=5)
- **Confidence:** CONFIRMED — code trace + owner screenshot align exactly

---

## 5. Blast Radius
- **Files:** `src/components/cards/OrderCard.jsx` (Assign button condition)
- **Scope:** SMALL (1 file, 1-2 line condition change)
- **Risk note:** OrderCard.jsx is not R5, not financial. MEDIUM risk due to delivery order flow logic.

---

## 6. Open Decisions
**OD-557-01:** Should the fix add `fOrderStatus === 5` to the delivery Assign gate? Or should it use a different condition (e.g. `fOrderStatus >= 2 && !hasRiderAssigned`)? → Gate 2 IA to decide.
