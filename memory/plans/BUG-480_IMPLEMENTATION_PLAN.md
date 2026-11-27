# BUG-480 — Implementation Plan (Gate 3)
## Fix Cancel After Serve Gate — Add allowPostServeCancel2 to condition

**Date:** 2026-10-18 | Stage: Gate 3 | Based on: BUG-480 Impact Analysis

---

## Decisions Locked

**OD-480-01 LOCKED:** Scope = per-item × button in Order Entry (CartPanel). Whole-order × on OrderCard is separate.

**OD-480-02 LOCKED (2026-10-18 — backend team confirmed):**
- `cancle_post_serve` → **RESTAURANT level** (same for all employees)
- `allow_cancel_post_server` → **EMPLOYEE level** (backend pre-computes per logged-in employee, delivers in `restaurants[0]`)
- Probe validated: both at `restaurants[0]` in profile. `profileTransform.js` reading is already correct.
- Plan unchanged — same 2-line fix in `OrderEntry.jsx`.

---

## Scope Lock

**File WILL change:** `src/components/order-entry/OrderEntry.jsx` (R5)
**Files WILL NOT touch:** `profileTransform.js` (no change needed — both fields already mapped) · any other file

---

## Entry Verification

| # | File | Line | Must read |
|---|---|---|---|
| V-A | `OrderEntry.jsx` | L352 | `if (item.status !== 'preparing' && cancellation?.allowPostServeCancel === false) return false;` |
| V-B | `OrderEntry.jsx` | L354 | `}, [canCancelItem, cancellation?.allowPostServeCancel]);` |

---

## Edit 1 — E-1: Fix gate condition (L352)

**BEFORE:**
```js
    if (item.status !== 'preparing' && cancellation?.allowPostServeCancel === false) return false;
```

**AFTER:**
```js
    // BUG-480: check both fields — old typo field (cancle_post_serve) + new correct field (allow_cancel_post_server)
    if (item.status !== 'preparing' &&
        cancellation?.allowPostServeCancel === false &&
        cancellation?.allowPostServeCancel2 === false) return false;
```

**Delta:** +2 lines (comment + split condition)

---

## Edit 2 — E-2: Add allowPostServeCancel2 to deps (L354)

**BEFORE:**
```js
  }, [canCancelItem, cancellation?.allowPostServeCancel]);
```

**AFTER:**
```js
  }, [canCancelItem, cancellation?.allowPostServeCancel, cancellation?.allowPostServeCancel2]); // BUG-480
```

**Delta:** 1 line changed

---

## Verification Matrix

| # | Verify | Method |
|---|---|---|
| V-1 | Restaurant with `allow_cancel_post_server = true` — × button visible on Ready/Served items | Browser: `owner@thegoankitchen.com / Qplazm@10` |
| V-2 | Restaurant with both fields false — × hidden on Ready/Served items (unchanged) | Code trace |
| V-3 | Items still in Preparing state — × always visible (unchanged) | Browser: verify |
| REG | Compile: 0 new warnings | webpack output |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-480 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: BUG-480 entry for OrderEntry.jsx
- [ ] Code marker: // BUG-480 on modified lines
- [ ] Compile: 0 new warnings
```

Planning complete: BUG-480 | Gate 3 | Risk: LOW | File: OrderEntry.jsx (R5)
⚠️ OD-480-02 NOT LOCKED — proceed to Gate 4 only after backend confirms employee vs restaurant level
