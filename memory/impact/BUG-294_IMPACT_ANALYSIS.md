# BUG-294 — Impact Analysis (Gate 2)

**ID:** BUG-294
**Title:** CustomerModal — CRM Calls Block Order Flow on 401
**Date:** 2026-08-05
**Agent:** PLANNING (Gate 2 — Impact Analysis)
**Code Reality:** PARTIAL — `CustomerModal.jsx` exists; bug confirmed at exact lines
**Conflict Pre-Check:** CLEAR — no other active registry item touches `CustomerModal.jsx`

---

## 1. Risk Classification

| Field | Value |
|---|---|
| Risk | **HIGH** |
| Trigger | Order flow — CRM failure blocks `handleSave()` → cashier cannot link customer → order stalls |
| R5 Hotspot | `CustomerModal.jsx` is called from `OrderEntry.jsx` (R5 hotspot) — indirect hotspot adjacency |
| Financial logic | NO — no money, tax, discount, settlement touched |
| Fast Lane eligible | NO — touches order flow |

---

## 2. Data Flow Trace

```
Cashier: Order Entry → "Add Customer" → CustomerModal mounts
   ↓
handleSave() [L249–384, single outer try/catch]
   ↓
BRANCH 1 — existing CRM customer (memberId set, not starting 'CUST-')
   ├── L284: await updateCustomer(...)         ← UNPROTECTED
   │         CRM 401 → propagates to outer catch L379
   │         → setError('Failed to save customer') [L381]   ✗ BLOCKS
   └── [never reaches onSave → customer NOT attached to order]

BRANCH 2 — new customer (memberId empty or CUST-…)
   ├── L307: await lookupCustomer(phone.trim())
   │     inner catch L308–321:
   │       if CRM_TIMEOUT → toast + fall through (existing = null) ✓
   │       else → L319: throw lookupErr → outer catch L379     ✗ BLOCKS
   │
   ├── if (existing):  [phone already in CRM]
   │     customerId = existing.id
   │     L339: await updateCustomer(...)       ← UNPROTECTED
   │           CRM error → outer catch L379 → setError [BLOCKS]  ✗
   │
   └── else:  [truly new customer]
         L347: await createCustomer(...)       ← UNPROTECTED
               CRM error → outer catch L379 → setError [BLOCKS]  ✗

OUTER CATCH [L379–383]:
   console.error(...)
   setError(err.readableMessage || 'Failed to save customer')  ← cashier sees this
   onSave() NEVER fires → order has no customer linked
```

**Break point:** Any CRM error (401, 500, network timeout beyond CRM_TIMEOUT) propagates to outer catch, setting the blocking error state. `onSave` never fires.

**Existing partial protection:**
- CRM_TIMEOUT specifically is caught at L309–316 and shows a toast, but then `existing` stays `null` and proceeds to createCustomer — which itself is unprotected.
- BUG-078 (CLOSED) added the CRM_TIMEOUT guard. 401 was never addressed.

---

## 3. Fix — 4 Surgical Edits (all in `CustomerModal.jsx`)

### Edit 1 — L284: Branch 1 `updateCustomer` wrap
**Current (L284–290):**
```js
await updateCustomer(customerId, {
  name: name.trim(),
  phone: phone.trim(),
  dob: birthday || undefined,
  anniversary: anniversary || undefined,
}, restaurantId);
```
**Fixed:**
```js
// BUG-294: non-blocking CRM update (matching BUG-092 pattern)
try {
  await updateCustomer(customerId, {
    name: name.trim(),
    phone: phone.trim(),
    dob: birthday || undefined,
    anniversary: anniversary || undefined,
  }, restaurantId);
} catch (crmErr) {
  console.warn('[CustomerModal] BUG-294: CRM update failed, proceeding without sync:', crmErr);
}
```

### Edit 2 — L319: Remove re-throw of non-timeout CRM errors
**Current (L317–320):**
```js
} else {
  throw lookupErr; // Re-throw unexpected errors to outer catch at L113
}
```
**Fixed:**
```js
} else {
  // BUG-294: non-blocking (matching BUG-092) — 401/5xx are also non-fatal
  console.warn('[CustomerModal] BUG-294: CRM lookup failed, proceeding:', lookupErr);
  // existing stays null → falls through to createCustomer path
}
```

### Edit 3 — L339: Branch 2 `updateCustomer` wrap (phone already in CRM)
**Current (L339–345):**
```js
await updateCustomer(customerId, {
  name: name.trim(),
  phone: phone.trim(),
  dob: birthday || undefined,
  anniversary: anniversary || undefined,
}, restaurantId);
```
**Fixed:**
```js
// BUG-294: non-blocking CRM update
try {
  await updateCustomer(customerId, {
    name: name.trim(),
    phone: phone.trim(),
    dob: birthday || undefined,
    anniversary: anniversary || undefined,
  }, restaurantId);
} catch (crmErr) {
  console.warn('[CustomerModal] BUG-294: CRM update (existing phone) failed, proceeding:', crmErr);
}
```

### Edit 4 — L347: `createCustomer` wrap with local-id fallback
**Current (L347–360):**
```js
const result = await createCustomer({
  name: name.trim(),
  phone: phone.trim(),
  dob: birthday || undefined,
  anniversary: anniversary || undefined,
}, restaurantId);
if (result?.existing) {
  customerId = result.customer_id;
} else {
  customerId = result?.customer_id || `CUST-${Date.now()}`;
}
```
**Fixed:**
```js
// BUG-294: non-blocking CRM create with local-id fallback
try {
  const result = await createCustomer({
    name: name.trim(),
    phone: phone.trim(),
    dob: birthday || undefined,
    anniversary: anniversary || undefined,
  }, restaurantId);
  if (result?.existing) {
    customerId = result.customer_id;
  } else {
    customerId = result?.customer_id || `CUST-${Date.now()}`;
  }
} catch (crmErr) {
  console.warn('[CustomerModal] BUG-294: CRM create failed, proceeding with local id:', crmErr);
  customerId = `CUST-${Date.now()}`;
}
```

---

## 4. Affected Files

| File | Action | Lines Changed | Risk |
|---|---|---|---|
| `components/order-entry/CustomerModal.jsx` | MODIFY — 4 surgical edits | ~18 lines net (+12 added, +2 changed) | HIGH (order flow) |

**Files NOT touched:**
- `OrderEntry.jsx` — no change; receives same `onSave(customerData)` callback as before
- `customerService.js` — no change; CRM API functions unchanged
- `customerTransform.js` — no change
- `CollectPaymentPanel.jsx` — no change
- `orderTransform.js` — no change (financial sacred, R6)
- Any other file — zero

---

## 5. Downstream Consumer Analysis

| Consumer | Impact of Fix | Risk |
|---|---|---|
| `OrderEntry.jsx` | Receives `onSave(customerData)` — now fires even when CRM fails. `customerId` may be `CUST-{timestamp}`. | NONE — OrderEntry already handles `CUST-*` ids (line `!initialData.id.startsWith('CUST-')` in CustomerModal itself shows this pattern is established) |
| `CollectPaymentPanel.jsx` | Receives `customerData` via order context. If `customerId` is `CUST-{timestamp}`, loyalty features degrade gracefully (same as if customer was never looked up) | NONE — loyalty panel already has `loyalty_enabled` guards |
| `orderTransform.js` | No change to payload. `customer_id` field in order payload will be the fallback `CUST-{timestamp}` when CRM failed | NONE — backend already receives `CUST-*` ids when CRM is unreachable |

---

## 6. Degradation Contract (post-fix)

When CRM fails:

| Scenario | Before fix | After fix |
|---|---|---|
| Branch 1: existing customer, CRM 401 on update | Order BLOCKED — "Failed to save customer" | Customer saved with existing `customerId`; CRM sync skipped (warn logged) |
| Branch 2: new customer, lookup 401 | Order BLOCKED | Lookup skipped; falls to create path (or `CUST-{ts}` fallback) |
| Branch 2: existing phone, update 401 | Order BLOCKED | Update skipped (warn); `customerId` retained from lookup result |
| Branch 2: truly new, create 401 | Order BLOCKED | `customerId = CUST-{Date.now()}` (warn logged); order proceeds |

This is **identical** to the BUG-092 precedent on `RoomCheckInModal.jsx` (L612-614): CRM errors produce a console.warn, check-in proceeds with `null`/local id.

---

## 7. Verification Matrix (seeds QA handover)

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | Edit 1 — Branch 1 updateCustomer | CustomerModal.jsx | Mock `updateCustomer` to throw 401; open modal with existing memberId; click Save → modal closes, customer attached | YES |
| V2 | Edit 2 — lookupErr re-throw removed | CustomerModal.jsx | Mock `lookupCustomer` to throw non-timeout error; enter new phone; click Save → modal closes | YES |
| V3 | Edit 3 — Branch 2 updateCustomer | CustomerModal.jsx | Mock `lookupCustomer` to return existing; mock `updateCustomer` to throw; click Save → modal closes with existing customerId | YES |
| V4 | Edit 4 — createCustomer wrap + fallback | CustomerModal.jsx | Mock `lookupCustomer` → null; mock `createCustomer` to throw; Save → modal closes with `CUST-` fallback id | YES |
| V5 | Regression — CRM_TIMEOUT toast preserved | CustomerModal.jsx | Mock `lookupCustomer` to throw `{ type: 'CRM_TIMEOUT' }` → toast shown (BUG-078 behavior unchanged) | YES |
| V6 | Regression — happy path still works | CustomerModal.jsx | All CRM calls succeed → onSave called with real CRM id; modal closes | YES |
| V7 | Browser: order entry flow | OrderEntry.jsx | With CRM down: Add Customer → fill name+phone → Save → customer row appears in order, Place Order proceeds | NO (browser) |

---

## 8. Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: BUG-294 → status: IMPLEMENTED, sprint_key: pos_5_1
□ BUG_TRACKER.md: BUG-294 row → status IMPLEMENTED
□ FILE_OWNERSHIP.md: CustomerModal.jsx — BUG-294 — 2026-08-05
□ Code markers: // BUG-294 comment on each of the 4 edited blocks
□ Compile check: webpack 0 new warnings
```

---

## 9. Owner Decisions

**None required.** The BUG-092 non-blocking CRM pattern is owner-approved precedent. Applying the same pattern to CustomerModal requires no new business rule decision.

---

## 10. Conflict Pre-Check Result

| File | Last modifier | Open conflict? |
|---|---|---|
| `CustomerModal.jsx` | BUG-108 / CR-002 agent (POS 3.0 era) — CLOSED | **NONE** |

---

## 10. Design Freeze — 2026-08-05

**Design session held:** Visual comparison built at `/app/frontend/public/checkin-comparison.html`
**Preview:** `https://pos-frontend-deploy-27.preview.emergentagent.com/checkin-comparison.html`

### BUG-294 UI Impact: NONE

This bug is a **pure code fix** — error handling pattern only. No UI changes whatsoever.

| Component | Change | UI Impact |
|---|---|---|
| `CustomerModal.jsx` — 4 CRM call wraps | Error handling only (try/catch) | Zero — same modal appearance |
| Error state (`setError`) | Now only reached for non-CRM errors | Cashier no longer sees "Failed to save customer" on CRM 401 |
| `onSave()` callback | Now fires even when CRM is down | Cashier sees customer attached to order — no visual change to how that looks |

### Note: Phone Field UX Fix is NOT part of BUG-294

The design comparison shows a phone field redesign (+91 fixed prefix replacing the globe/dropdown). That fix is in `RoomCheckInModal.jsx` — a different screen from `CustomerModal.jsx`. It is captured as a **scope expansion in CR-129** (same file, owner-directed during design review).

**BUG-294 scope is locked to `CustomerModal.jsx` only. Zero UI, zero visual change.**

---

## Summary

```
Planning complete: BUG-294
Stage: Impact Analysis (Gate 2) — CLOSED with design freeze 2026-08-05
Code reality: PARTIAL (file exists, 4 unprotected CRM sites at L284/L319/L339/L347)
Risk: HIGH (order flow — 1 file, ~18 lines, no financial logic)
UI changes: NONE — pure error handling fix, zero visual change
Design freeze: CONFIRMED — phone field UX fix is CR-129 scope, not this bug
Files WILL change:   components/order-entry/CustomerModal.jsx
Files WILL NOT touch: OrderEntry.jsx, customerService.js, orderTransform.js,
                      CollectPaymentPanel.jsx, customerTransform.js
Owner decisions: NONE — BUG-092 precedent is authoritative
Conflict: CLEAR
Verification matrix: 7 checks (6 automated, 1 browser)
Design comparison: /app/frontend/public/checkin-comparison.html
Docs: impact/BUG-294_IMPACT_ANALYSIS.md
Next: AWAITING GATE 4 GO → Gate 3 (Implementation Plan) → code
```
