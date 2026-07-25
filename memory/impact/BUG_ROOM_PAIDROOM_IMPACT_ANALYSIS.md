# BUG-ROOM-PAIDROOM — Gate 2: Impact Analysis

**ID:** BUG-ROOM-PAIDROOM
**Gate:** 2 — Impact Analysis
**Date:** 2026-07-07
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Investigation report:** `/app/memory/evidence/BUG-ROOM-PAIDROOM/INVESTIGATION_REPORT_BUG_ROOM_PAIDROOM.md`
**Risk:** MEDIUM — payment payload field in hotspot file
**Priority:** P1
**Fast Lane:** NO

---

## Step 0 — Code Reality Check

```bash
grep -n "paid_room" /app/frontend/src/api/transforms/orderTransform.js
```

**Result — 1 bug site confirmed:**

| Site | Function | Line | Current value | Correct value |
|---|---|---|---|---|
| 1 | `collectBillExisting` payload builder | **L1632** | `''` (hardcoded empty) | `table?.isRoom ? 'yes' : ''` |

**Code Reality: EXISTING BUG — 1 line in 1 file. `table.isRoom` is already available — no new data fetch needed.**

---

## Step 1 — Conflict Pre-Check

**File:** `api/transforms/orderTransform.js`

| Check | Result |
|---|---|
| FILE_OWNERSHIP.md | HOTSPOT — same hotspot file as BUG-VQTY above |
| Open CRs touching this file | NONE currently open |
| Proximity to BUG-VQTY changes | L1632 vs L703/L1492 — ~130 lines apart from L1492, no conflict |
| Can be done in same session as BUG-VQTY | YES — same file, no proximity conflict |
| `room_id` also needed? | NO — owner confirmed backend resolves room from `order_id` (2026-07-07) |

**Conflict Pre-Check: CLEAN. Recommended: fix in same session as BUG-VQTY (same file, 1 checkout).**

---

## Step 2 — Data Flow & Impact

### What the bug breaks

When a room order is checked out via Collect Bill:

| Payload field | Current (WRONG) | Correct |
|---|---|---|
| `paid_room` | `''` (empty) | `'yes'` for room orders |

**Result:** Backend receives `paid_room: ""` on every order type — it cannot distinguish a room checkout from a table checkout. Room booking may not close correctly on the backend.

**Non-room orders:** Unaffected. `table.isRoom = false` → `paid_room: ''` (same as today). ✅

### Affected flows (2 entry points, both via `collectBillExisting`)

| Entry | OrderEntry.jsx Line | Context |
|---|---|---|
| QSR Collect Bill (already-placed edge) | L1444 | `handleQsrCollectBill` else-branch |
| Non-QSR postpaid Collect Bill | L2112 | Collect Payment button handler |

### What is NOT affected

- `placeOrder` / `placeOrderWithPayment` — these are order placement (not checkout), `paid_room` on these is `null / ''` by design
- Non-room orders — `table.isRoom = false`, `paid_room` stays `''` ✅
- `room_id` — not needed, confirmed by owner

---

## Downstream Consumer Check

`collectBillExisting` → `OrderEntry.jsx` L1444, L2112 — passes `effectiveTable` as `table`. `effectiveTable.isRoom` already set correctly from `fromAPI.order()` normalization. No change needed in callers.

---

## `table.isRoom` Data Flow (confirmed reachable)

```
fromAPI.order()                           orderTransform.js L165
  isRoom = rtype === 'RM' || order_in === 'RM'   L169
    → normalized order { isRoom: true }          L210
      → OrderEntry effectiveTable                OE.jsx L237
        → collectBillExisting(effectiveTable)    OE.jsx L1444, L2112
          → table.isRoom ← AVAILABLE HERE ✅
            → paid_room: ''  ← NOT READING IT ❌
```

---

## Risk Classification

**Risk: MEDIUM**

| Trigger | Detail |
|---|---|
| Hotspot file | YES — `orderTransform.js` R5 hotspot |
| Payment/billing field | YES — `paid_room` is a BILL_PAYMENT payload field |
| Change type | Conditional on existing flag (`table.isRoom`) — no new data |
| Non-room orders | Completely unaffected — false path returns `''` same as before |
| `room_id` complexity | NONE — owner confirmed not needed |

**Mitigation:** `table.isRoom` is a boolean already verified at normalization time. The ternary is a simple read, no computation. Regression surface: room order checkout only.

---

```
Gate 2 complete: BUG-ROOM-PAIDROOM
Code Reality: EXISTING BUG in 1 line, 1 file
Conflict Pre-Check: CLEAN (hotspot noted; safe to combine with BUG-VQTY in same fix session)
Risk: MEDIUM — payment field, hotspot file, simple conditional
Files to change: 1 (orderTransform.js)
Lines to change: 1 (L1632)
Next: Gate 3 Implementation Plan
```
