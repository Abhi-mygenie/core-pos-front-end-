# CR-411 — CART PERSISTS ON TYPE/TABLE SWITCH, CLEARS ONLY ON DASHBOARD RETURN
**Registered:** 2026-10-12
**Type:** CR (behavioral change — revokes BUG-452 OD-452-01=B)
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

**Current behavior (BUG-452 OD-452-01=B, shipped):**
When the cashier switches order type (Walk-In → TakeAway → Delivery) or selects a different table while items are in the cart, `OrderEntry` is fully remounted via a `key={orderEntryResetNonce}` bump → all cart items are silently cleared on every switch.

**Required behavior (owner 2026-10-12):**
- Cart items **STAY** when cashier switches order type or table — the cashier is building the same order and just changing destination
- Cart items **ONLY CLEAR** when the cashier presses Cancel / X and returns to the dashboard
- Fresh open (new session) must always start with an empty cart

---

## What BUG-452 did — and why it overcorrected

**Original BUG-452 symptom:** items from a previous session were reappearing when reopening the same order type key (e.g. Walk-In). Root cause: `cartsByTable[oldKey]` was being written on switch and never cleaned up, so reopening the same key next session would restore stale items.

**BUG-452 fix (OD-452-01=B):** solved the stale-restore by bumping `orderEntryResetNonce` on every type/table switch → full remount → `cartsByTable` write never fires → no stale restore. **Side-effect: live cart also wiped on every switch.**

**The correct fix** (instead of remount-on-switch) is:
1. **Remove** nonce bump from `handleOrderTypeChange` and `handleTableClick`
2. **Carry** cart items forward on type/table switch (OrderEntry's `useEffect[table?.id, orderType]` already does this via the `else if (oldKey !== null)` branch — currently marked unreachable by BUG-452)
3. **Explicitly clear** `cartsByTable[key]` inside `handleCloseOrderEntry` so re-opening a key fresh always starts empty

This correctly separates "switch context mid-session" (cart stays) from "close and re-open" (cart empty).

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG for this behavioral change.

**RELATED — REVERSES BUG-452:**
BUG-452 OD-452-01=B is explicitly revoked by this CR. BUG-452 status: `GATE_5B_QA_CONDITIONAL_PASS` (browser QA never completed due to CORS). The nonce-bump fix from BUG-452 must be partially rolled back (only for switch paths — not for stay-on-order path at L1560).

---

## Evidence

- **Source:** OWNER-REPORTED (2026-10-12) — screenshot showing cart items + table/type dropdown open on pos-uat.mygenie.online
- **Confidence:** CONFIRMED — behavior is by design from BUG-452; code trace confirms remount wipes cart
- **Screenshot:** Provided in session — Walk-In cart with 6 items, table dropdown open
- **Investigation report:** SESSION_HANDOVER_2026_10_12 (this session)

**Code evidence at HEAD:**
```javascript
// DashboardPage.jsx L1488-1491 — handleTableClick
if (orderEntryType !== null) {
  setOrderEntryResetNonce(n => n + 1);   // ← BUG-452 fix; wipes cart on table switch
  ...
}

// DashboardPage.jsx L1513-1517 — handleOrderTypeChange
if (orderEntryType !== null) {
  setOrderEntryResetNonce(n => n + 1);   // ← BUG-452 fix; wipes cart on type switch
  ...
}

// OrderEntry.jsx L507-508
// BUG-334 carry-forward REVERSED by BUG-452 … this branch is unreachable in the switch path.
// Kept as a no-op guard.   ← must be restored
```

---

## Severity Rubric

**P1 — HIGH:** Every type/table switch wipes the cashier's unplaced draft items. Cashier loses work silently on every switch. Core order-entry flow broken for any restaurant that routinely reassigns order types or tables.

---

## Risk Classification

**CRITICAL** — Fix touches:
- `DashboardPage.jsx` (R5 hotspot) — remove nonce bumps from 2 handlers + add clear in `handleCloseOrderEntry`
- `OrderEntry.jsx` (R5 hotspot) — restore carry-forward branch (revert BUG-452 no-op guard)

Trigger: order flow + 2 R5 hotspot files.
Fast Lane eligible: **NO**

---

## Blast Radius

```
Files WILL change: DashboardPage.jsx (R5) · OrderEntry.jsx (R5)
Files WILL NOT touch: CartPanel.jsx · CollectPaymentPanel.jsx · orderTransform.js · any other
```

- **Scope:** SMALL in lines (~10–15), HIGH in risk (R5 + order flow)
- **Regression risk:** stay-on-order path (L1560 nonce bump) must NOT be changed — that path correctly remounts after collect-bill

---

## Code Reality

**FULL** — BUG-452 nonce-bump fix is present and active at HEAD (L1491, L1517). The `OrderEntry.jsx` carry-forward branch is marked unreachable (L507–508). Both must be reverted/restored.

---

## Owner Decisions — LOCKED

**OD-411-01: LOCKED = A** — On every type/table switch: clear `cartsByTable[oldKey]` immediately AND carry items forward into live cart. Belt-and-braces: no stale slot, no wipe. (Owner 2026-10-12)

**OD-411-02: LOCKED = A** — Stay-on-order nonce bump in `handleCollectBillStayOnOrder` (L1560) is out of scope — leave unchanged. (Owner 2026-10-12)

---

## Related

- **BUG-452:** REVERSES OD-452-01=B (always clear on switch). Status: `GATE_5B_QA_CONDITIONAL_PASS`
- **BUG-334:** Original "carry items forward on switch" behavior that BUG-452 reversed. This CR restores that intent.

---

## Next

→ Owner locks OD-411-01 + OD-411-02 → Gate 2 GO → Impact Analysis
