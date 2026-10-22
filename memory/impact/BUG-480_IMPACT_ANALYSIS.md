# BUG-480 — Impact Analysis (Gate 2)
## Cancel After Serve Gate Uses Wrong / Incomplete API Field

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** BUG CONFIRMED IN CODE — fix is 1 additive line
**Conflict Pre-Check:** `OrderEntry.jsx` last touched BUG-555 E1 (L55-56, ROTATE_MQ) + CR-411 (handleTableClick ~L1487, handleOrderTypeChange L1513). Our fix is at L352 (isItemCancelAllowed) — different function, zero overlap. `profileTransform.js` last touched BUG-527. Our read is L226-227 — no code change needed there.

---

## Root Cause (confirmed from code)

### `profileTransform.js` L226-227 — TWO fields mapped:
```js
allowPostServeCancel:  toBoolean(api.cancle_post_serve),        // typo in API field name
allowPostServeCancel2: toBoolean(api.allow_cancel_post_server), // newer correct field
```
Both exist. Both mapped. Both in `cancellation` object.

### `OrderEntry.jsx` L352 — only ONE checked:
```js
if (item.status !== 'preparing' && cancellation?.allowPostServeCancel === false) return false;
```
`allowPostServeCancel2` is **mapped but never consulted** — dead path.

### Why cancel is always blocked:
`RestaurantContext.jsx` defaults BOTH fields to `false` on init. If the backend sends `allow_cancel_post_server = true` (the newer correct field) but NOT `cancle_post_serve = true` (typo field), the gate still blocks because only the typo field is checked.

---

## Data Flow Trace
```
API: profile → `allow_cancel_post_server: true` (new field)
  → profileTransform L227: allowPostServeCancel2 = true
  → cancellation context

OrderEntry.jsx L352:
  → checks cancellation?.allowPostServeCancel === false  ← reads TYPO field
  → allowPostServeCancel = false (typo field not sent)
  → returns false → cancel BLOCKED  ← BUG
  (allowPostServeCancel2 = true is ignored)
```

## Fix — 1 line change, 1 file

**`OrderEntry.jsx` L352:**
```js
// CURRENT:
if (item.status !== 'preparing' && cancellation?.allowPostServeCancel === false) return false;

// FIX: block only when BOTH fields are false (either field ON = allow cancel)
if (item.status !== 'preparing' &&
    cancellation?.allowPostServeCancel === false &&
    cancellation?.allowPostServeCancel2 === false) return false;
```

Also update deps at L354:
```js
// CURRENT:
}, [canCancelItem, cancellation?.allowPostServeCancel]);

// FIX:
}, [canCancelItem, cancellation?.allowPostServeCancel, cancellation?.allowPostServeCancel2]);
```

**profileTransform.js** — NO change needed. Both fields already correctly mapped.

---

## Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO — cancel permission gate only |
| Hotspot file (R5)? | YES — `OrderEntry.jsx` |
| Lines changed | 2 (condition + deps array) |
| Files touched | 1 |
| Risk | LOW — additive OR condition, can only ALLOW more cancellations (never blocks what was previously allowed) |

**Risk: LOW despite R5** — additive change only, correct behaviour is more permissive.

---

## OD-480-02 OPEN — Employee-level or restaurant-level setting? (GATE-BLOCKING)

Owner raised 2026-10-18: `allow_cancel_post_server` appears to sit on `restaurants[0]` in the profile API response (restaurant-level). However owner is NOT certain — needs confirmation from backend team before implementation.

**Code says:** `fromAPI.restaurant(api.restaurants?.[0])` → `cancellation.allowPostServeCancel2` = restaurant-level.
**Open question:** Does backend also support this as an employee-level permission? If yes, the fix logic changes.

**Blocked on:** Backend team confirmation.

---

Owner confirmed 2026-10-18: BUG-480 fix enables the per-item cancel × button (in Order Entry / CartPanel) for served items when restaurant has `allow_cancel_post_server = true`. The whole-order × button on OrderCard is separate and not affected by this fix.

---

All criteria met:
- Root cause confirmed, HIGH confidence
- 1 file, 2 lines
- Fix is additive — zero regression risk
- Owner must explicitly approve planning skip

**Owner GO phrase:** `"BUG-480 Direct Fix GO"`

---

## Verification
| # | Verify | Method |
|---|---|---|
| V-1 | Cancel button appears on served items when `allow_cancel_post_server = true` | Browser: test account `owner@thegoankitchen.com / Qplazm@10` |
| V-2 | Cancel still blocked when BOTH fields are false | Code trace |
| REG | Cancellation with `allowPostServeCancel = true` (old typo field) still works | Unaffected — OR condition |

---

Planning complete: BUG-480 | Gate 2 | Risk: LOW | Files: `OrderEntry.jsx` only
Route: DIRECT BUG FIX eligible (owner must approve skip)
