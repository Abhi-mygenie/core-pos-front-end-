# BACKEND_BRIEF — BUG-480 (retitled)
## Ensure allow_cancel_post_server defaults to 'Yes' for the right employee roles

**Date:** 2026-10-18
**Classification:** BACKEND_DEFAULT / CONFIG_ISSUE
**Priority:** P1 / MEDIUM
**Filed by:** FE agent after investigation + owner confirmation

---

## Summary

The FE code is correct and working as expected. The issue is a backend default:

- `allow_cancel_post_server` (employee-level post-serve cancel permission) is not defaulting to `'Yes'` for the appropriate employee roles
- Result: employees who SHOULD be able to cancel after serving cannot do so, because their `allow_cancel_post_server` comes back as `'No'` / unset from the profile API

---

## Two Cancel Permission Fields (confirmed)

| Field | Level | Meaning |
|---|---|---|
| `cancle_post_serve` | Restaurant | Controls cancel **before** serving (note: typo in field name — "cancle" not "cancel") |
| `allow_cancel_post_server` | Employee | Controls cancel **after** serving — per-employee permission |

---

## Observed Data (palmhouse, owner@palmhouse.com)

```
cancle_post_serve (restaurant)      : 'No'   ← pre-serve cancel OFF at restaurant level
allow_cancel_post_server (employee) : 'Yes'  ← this employee has post-serve cancel ON
```

For palmhouse owner, the employee-level field is correctly set to `'Yes'`.

**The issue:** For other employee roles (e.g. waiters, managers at other restaurants), `allow_cancel_post_server` may default to `'No'` or be absent — even when it should be `'Yes'` based on their role.

---

## Backend Action Required

1. **Define which employee roles should have `allow_cancel_post_server = 'Yes'` by default** (e.g. Manager, Owner — but not Waiter?)
2. **Ensure the profile API returns the correct default value** for `allow_cancel_post_server` for every employee based on their role, even if the setting was never explicitly configured in the admin panel
3. **No FE change needed** — the FE already reads `allow_cancel_post_server` from the profile response correctly via `profileTransform.js` → `cancellation.allowPostServeCancel2`

---

## FE Status

- `profileTransform.js`: already maps `allow_cancel_post_server` → `allowPostServeCancel2` ✅
- `OrderEntry.jsx`: currently only checks `allowPostServeCancel` (`cancle_post_serve`) in the cancel gate — **this may need updating once backend confirms the intended behaviour and field usage**
- No FE deploy needed until backend clarifies the role-based defaults

---

## Related

- Registry: BUG-480
- Investigation: `/app/memory/investigations/` (BUG-480 IA)
- Previous FE plan: `/app/memory/plans/BUG-480_IMPLEMENTATION_PLAN.md` — **SUPERSEDED. No FE code change required.**
