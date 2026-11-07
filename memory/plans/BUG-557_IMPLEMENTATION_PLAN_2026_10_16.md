# Implementation Plan — BUG-557
## Delivery Assign/Dispatch missing when Default Order Status = "Bill"

**Role:** PLANNING (Gate 3 — Implementation Plan)
**Date:** 2026-10-16
**Based on:** `impact/BUG-557_IMPACT_ANALYSIS_2026_10_16.md` (Gate 2 CLOSED, OD-557-01 locked = Option A)
**Code Reality:** NONE — OrderCard.jsx unchanged, all anchors verified at HEAD
**Risk:** MEDIUM · 1 file · ~22 lines · not R5 · not financial

---

## Scope Lock

**WILL change:**
- `src/components/cards/OrderCard.jsx` — E-1 (new block, ~20 lines) + E-2 (1 word added to condition)

**WILL NOT touch:**
- `DashboardPage.jsx` — no new props needed (`deliveryAssign`, `hasRiderAssigned`, `setShowAssignRider` already in OrderCard scope)
- Any transform, service, context, API, or auth file

---

## Step 0 — Entry Verification

```bash
# Confirm E-2 anchor
sed -n '1206p' /app/frontend/src/components/cards/OrderCard.jsx
# Expected: {!isAggregator && fOrderStatus === 5 && canBill && (

# Confirm E-1 insertion point (line before 1206)
sed -n '1205p' /app/frontend/src/components/cards/OrderCard.jsx
# Expected: )}

# No existing BUG-557 markers
grep -c "BUG-557" /app/frontend/src/components/cards/OrderCard.jsx
# Expected: 0
```

---

## Edit E-1 — Add NEW delivery Assign/Dispatch block at fOrderStatus=5

**File:** `src/components/cards/OrderCard.jsx`
**Location:** Insert immediately BEFORE the existing `{!isAggregator && fOrderStatus === 5 && canBill && (` at L1206

```jsx
            {/* BUG-557: delivery order at fOS=5 with no rider assigned — show Assign/Dispatch
                Fires when Default Order Status = "Bill" skips fOS=2 (normal assign window).
                Uses same deliveryAssign branch logic as fOS=2 block (L1140-1165). */}
            {!isAggregator && fOrderStatus === 5 && isDelivery && !hasRiderAssigned && (
              deliveryAssign ? (
                <button
                  data-testid={`assign-rider-btn-${orderId}`}
                  className={`min-h-[44px] flex-1 min-w-0 px-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                  onClick={() => setShowAssignRider(true)}
                  disabled={isActionInProgress}
                >
                  Assign Rider
                </button>
              ) : (
                <button
                  data-testid={`dispatch-btn-${orderId}`}
                  className={`min-h-[44px] flex-1 min-w-0 px-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                  onClick={handleDispatch}
                  disabled={isActionInProgress}
                >
                  {isDispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch'}
                </button>
              )
            )}
```

**Why this works:**
- `fOrderStatus === 5 && isDelivery && !hasRiderAssigned` → only fires for delivery orders with no rider at Bill status
- `deliveryAssign` check mirrors L1146 — same Assign Rider vs Dispatch logic
- All state/handlers (`showAssignRider`, `setShowAssignRider`, `handleDispatch`, `deliveryAssign`, `hasRiderAssigned`) are already in scope at L120-121

---

## Edit E-2 — Gate existing Bill block behind rider assignment

**File:** `src/components/cards/OrderCard.jsx`
**Line:** 1206

```jsx
// BEFORE:
            {!isAggregator && fOrderStatus === 5 && canBill && (

// AFTER:
            {!isAggregator && fOrderStatus === 5 && canBill && (!isDelivery || hasRiderAssigned) && ( // BUG-557
```

**Why this is needed:**
Without this gate, when Default=Bill and delivery order arrives at fOS=5 with no rider, BOTH the E-1 Assign block AND the E-2 Bill block would render simultaneously. Adding `(!isDelivery || hasRiderAssigned)` ensures:
- Delivery + no rider → E-2 hidden (E-1 shows Assign) ✅
- Delivery + rider assigned → E-2 shows (existing dispatched/settle/bill logic) ✅
- Non-delivery → E-2 shows unchanged ✅

---

## Execution Sequence

```
1. Step 0: Entry verification (3 checks)
2. Apply E-1 (insert new block before L1206)
3. Apply E-2 (add condition to L1206)
4. Compile check: webpack 1 pre-existing warning, 0 new
5. Self-verify: grep -c "BUG-557" OrderCard.jsx ≥ 2
6. EXIT GATE (5 checkboxes)
```

---

## Scenario Coverage (post-fix)

| Scenario | fOS | isDelivery | hasRiderAssigned | E-1 fires? | E-2 fires? | Button shown |
|---|---|---|---|---|---|---|
| Default=Bill, delivery, no rider | 5 | ✅ | ❌ | ✅ | ❌ | **Assign/Dispatch** |
| Default=Bill, delivery, rider assigned | 5 | ✅ | ✅ | ❌ | ✅ | Dispatched / Settle / Bill |
| Default=Bill, non-delivery (dine-in) | 5 | ❌ | N/A | ❌ | ✅ | Bill/Settle (unchanged) |
| Default=Ready, delivery, fOS=2 | 2 | ✅ | ❌ | — | — | Assign/Dispatch (unchanged, fOS=2 block) |
| Default=Ready, delivery, fOS=5 | 5 | ✅ | ✅ | ❌ | ✅ | Bill/Settle (unchanged) |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Double-render (E-1 + E-2 both show) | Very low | E-2 gate `(!isDelivery \|\| hasRiderAssigned)` excludes E-1's case |
| AssignRiderModal not wired | None | `showAssignRider` + `setShowAssignRider` already in scope (L100-101) |
| Dispatch not wired | None | `handleDispatch` already in scope (L313-323) |
| Non-delivery orders regress | None | E-1 gated by `isDelivery` — completely invisible to dine-in/takeaway |
| Normal flow (Default=Ready) regresses | None | E-1 only fires at `fOrderStatus === 5` — fOS=2 block (L1140) untouched |

---

## Verification Matrix

| # | Edit | Check | Method | Automated? |
|---|---|---|---|---|
| V1 | E-1 | `assign-rider-btn` or `dispatch-btn` visible on delivery card at fOS=5, no rider | Browser + data-testid | NO |
| V2 | E-1+E-2 | After rider assigned → Bill button appears, Assign gone | Browser | NO |
| V3 | E-2 | Non-delivery (dine-in) at fOS=5 → Bill unchanged | Browser | NO |
| V4 | E-1 | Normal flow (Default=Ready, fOS=2) unchanged — Assign still at fOS=2 | Browser | NO |
| V5 | E-2 | `rider-on-the-way-btn` still shows for delivery + dispatched rider | Browser | NO |
| V6 | — | Compile: 1 pre-existing warning, 0 new | CLI | YES |
| V7 | — | `grep -c "BUG-557" OrderCard.jsx` ≥ 2 | CLI | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-557 → GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: prepend new Last Updated row
- [ ] FILE_OWNERSHIP.md: OrderCard.jsx entry — append BUG-557 IMPL 2026-10-16
- [ ] Code markers: // BUG-557 in E-1 comment block + E-2 inline comment
- [ ] Compile: webpack 1 pre-existing warning, 0 new
```

---

## Test Account
- Restaurant with Default Order Status = "Bill": `owner@18march.com` / `Qplazm@10`
- Dashboard → Delivery channel → place a delivery order → verify Assign/Dispatch appears
