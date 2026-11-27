# BUG-581 — Intake (Gate 1)
## Item status labels and pill filter use state words instead of action words

**ID:** BUG-581 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P2 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** DISTINCT — prior label bugs (BUG-285, BUG-564) are for different label contexts
**Source:** OWNER-REPORTED during investigation session 2026-10-16

---

## Description

Two places show the **current state** of an order/item instead of the **next action** staff should take. This is inconsistent with the order footer buttons which already use action words correctly ("Ready" / "Serve" / "Bill").

### Gap 1 — Per-item status labels in OrderCard (`OrderCard.jsx:L691`)

| item.status | Currently shows | Should show | Why |
|---|---|---|---|
| `preparing` | **"Preparing"** | **"Ready"** | The action staff needs to take is to mark the dish as ready |
| `ready` | **"Ready"** | **"Serve"** | The action staff needs to take is to serve the dish |

### Gap 2 — Pill filter label for served orders (`Header.jsx:L28, L175`)

| Current | Should be | Why |
|---|---|---|
| `label: "Served"` | `label: "Serve"` | Action word — consistent with other pill labels |
| `case 3: return "Served"` | `case 3: return "Serve"` | Same — tablet dropdown variant |

### Already correct (no change)
- Column headers ("Preparing" / "Ready" / "Served") → **KEEP as-is**
- Order footer buttons ("Ready" / "Serve") → already action words ✅
- Pill labels "Preparing" and "Ready" → **KEEP**

---

## Code Reality: CONFIRMED

```
OrderCard.jsx:L691 (item label):
  const statusLabel = item.status === 'preparing' ? 'Preparing' : item.status === 'ready' ? 'Ready' : '';

Header.jsx:L28 (pill filter):
  { id: "served", fOrderStatus: 5, label: "Served" },

Header.jsx:L173-175 (tablet dropdown):
  case 1: return "Preparing";
  case 2: return "Ready";
  case 3: return "Served";   ← L175
```

---

## Blast Radius: SMALL
- `src/components/cards/OrderCard.jsx` — L691 (1 line)
- `src/components/layout/Header.jsx` — L28 + L175 (2 lines)
- No logic, data, API, or layout changes

## Open Decisions: NONE
All label values confirmed. Fast Lane eligible (2 files, 3 lines, not R5).

**Note:** `OrderCard.jsx` is R5 hotspot → requires regression checklist even though change is tiny.
