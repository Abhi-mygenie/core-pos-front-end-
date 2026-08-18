# Implementation Plan — CR-127: Room Check-In `cust_membership_id`

**ID:** CR-127
**Gate:** 3 (Implementation Plan)
**Date:** 2026-08-04
**Impact Analysis verified:** ✅ — `roomService.js` L58-60 unchanged from Gate 2

---

## Scope Lock

**Files WILL change:** `api/services/roomService.js`
**Files WILL NOT touch:** `orderTransform.js`, `RoomCheckInModal.jsx`, `customerTransform.js`, CRM endpoints

---

## Edit Sequence

### Edit 1: Add `cust_membership_id` to room check-in FormData

**File:** `/app/frontend/src/api/services/roomService.js`
**Line:** After L59 (inside the `if (params.customerId)` block)
**Risk:** LOW

**Current (L57-60):**
```js
  // BUG-092: Send CRM customer_id if available (backend ignores until ready)
  if (params.customerId) {
    fd.append('customer_id', String(params.customerId));
  }
```

**New (L57-61):**
```js
  // BUG-092: Send CRM customer_id if available (backend ignores until ready)
  if (params.customerId) {
    fd.append('customer_id', String(params.customerId));
    fd.append('cust_membership_id', String(params.customerId)); // CR-127: parity with order flow
  }
```

**Why:** All 4 order flows send `cust_membership_id` (orderTransform.js L1005, L1133, L1293, L1645). Room check-in was the only flow missing it. Owner confirmed Q1=B (different fields, FE must send both).

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `roomService.js:59` | Add `cust_membership_id` FormData append | Curl: POST room check-in, inspect FormData keys | NO |
| 1b | `roomService.js:59` | Value matches `customer_id` | Code review: both use `String(params.customerId)` | YES (grep) |
| 1c | — | No regression on existing check-in flow | Browser: complete a room check-in, verify success toast | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-127 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: CR-127 row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add roomService.js → CR-127
- [ ] Code markers: // CR-127 comment in roomService.js
```

---

```
Plan ready: CR-127. 1 edit in 1 file.
Code reality: NONE.
Scope: roomService.js WILL change / everything else WILL NOT touch.
Verification matrix: 3 checks (1 automated, 2 manual).
Owner decisions needed: none (all locked).
Awaiting Gate 4 GO.
```
