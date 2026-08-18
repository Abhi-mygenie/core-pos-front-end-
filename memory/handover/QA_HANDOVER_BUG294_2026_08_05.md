# QA Handover — BUG-294
**Date:** 2026-08-05
**Item:** BUG-294 — CustomerModal CRM Calls Block Order Flow on 401
**Implementation agent:** IMPL agent 2026-08-05
**Risk:** HIGH (order flow)
**File changed:** `components/order-entry/CustomerModal.jsx`

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Verification | Self-Test |
|---|---|---|---|
| E1: Branch-1 updateCustomer try/catch | CustomerModal.jsx L285–294 | `// BUG-294` marker present; try/catch wraps `updateCustomer` | ✅ Code verified |
| E2: `throw lookupErr` → `console.warn` | CustomerModal.jsx L324–327 | `// BUG-294` marker present; no `throw` in else branch | ✅ Code verified |
| E3: Branch-2 updateCustomer try/catch | CustomerModal.jsx L347–356 | `// BUG-294` marker present; try/catch wraps second `updateCustomer` | ✅ Code verified |
| E4: createCustomer try/catch + fallback | CustomerModal.jsx L360–375 | `// BUG-294` marker present; catch assigns `CUST-${Date.now()}` | ✅ Code verified |
| Compile | webpack | 0 new warnings | ✅ PASS |
| CRM_TIMEOUT toast UNTOUCHED | CustomerModal.jsx L314–322 | `if (lookupErr.type === 'CRM_TIMEOUT')` block unchanged | ✅ Code verified |
| Outer catch UNTOUCHED | CustomerModal.jsx L395–399 | `setError(err.readableMessage...)` still present for non-CRM errors | ✅ Code verified |

---

## 2. Test Cases for QA Agent

### T1 — Branch 1: existing customer, CRM update returns 401
**Steps:**
1. Open an order with a returning customer (member ID pre-filled)
2. Click "Add Customer" / edit customer modal opens with `initialData.id` set
3. Mock `updateCustomer` to reject with `{ response: { status: 401 } }`
4. Click Save

**Expected:** Modal closes. `onSave` called with customer data. No error message shown. `console.warn` logged with `[CustomerModal] BUG-294`.

**Previous behaviour:** Modal showed "Failed to save customer". Save button stuck.

---

### T2 — Branch 2: new customer, lookup returns non-timeout error
**Steps:**
1. Open modal with blank fields
2. Enter name + phone not in CRM
3. Mock `lookupCustomer` to throw `{ type: 'OTHER', message: 'Network error' }`
4. Click Save

**Expected:** Modal continues — does NOT block. Falls through to createCustomer path. `console.warn` logged.

---

### T3 — Branch 2: existing phone, update returns 401
**Steps:**
1. Enter phone that exists in CRM
2. Mock `lookupCustomer` to return existing customer object
3. Mock `updateCustomer` to throw 401
4. Click Save

**Expected:** Modal closes with existing `customerId`. No error shown.

---

### T4 — Branch 2: new customer, createCustomer throws 401
**Steps:**
1. Enter new name + new phone
2. Mock `lookupCustomer` → `null`
3. Mock `createCustomer` → throw 401
4. Click Save

**Expected:** Modal closes. `customerId = CUST-{timestamp}`. `onSave` called. Order proceeds.

---

### T5 — Regression: CRM_TIMEOUT toast still fires
**Steps:**
1. Enter new phone
2. Mock `lookupCustomer` → throw `{ type: 'CRM_TIMEOUT', message: 'CRM is not responding...' }`
3. Click Save

**Expected:** Toast shown ("CRM Timeout"). Modal does NOT close from this error. `existing` stays null, falls through to createCustomer.

---

### T6 — Regression: happy path (CRM working)
**Steps:**
1. Enter name + phone
2. All CRM mocks succeed (lookupCustomer → null, createCustomer → `{ customer_id: 'real-id' }`)
3. Click Save

**Expected:** `onSave` called with `id: 'real-id'`. Modal closes. No console.warn.

---

### T7 — E2E browser: order entry with CRM unavailable
**Steps:**
1. Open an order on the live app
2. Click "Add Customer"
3. Enter any name + 10-digit phone
4. Click Save (CRM is either down or returning 401)

**Expected:** Customer row appears on order. Place Order button enabled. No "Failed to save customer" error.

---

## 3. Regression Tests

| What | Why |
|---|---|
| CRM_TIMEOUT toast path (L314–322) | Edit 2 changes the `else` branch of the same catch block — verify `if` branch untouched |
| Outer catch still fires for non-CRM errors | If JWT expires mid-save, `onSave` should NOT be called |
| Loyalty fields still forwarded | `crmLoyaltyFields` assignment after each try/catch block must still reach `onSave` |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-294 → status: IMPLEMENTED, gate: 5, sprint_key: pos_5_1
EXIT GATE: ALL 5 PASSED
  □1 registry.json: PASS
  □2 BUG_TRACKER.md: PASS
  □3 FILE_OWNERSHIP.md: PASS
  □4 Code markers (4× // BUG-294): PASS
  □5 Compile (webpack 0 new warnings): PASS
```

---

## 5. Credentials + Environment

- App URL: `https://pos-frontend-deploy-27.preview.emergentagent.com`
- Test account: see `/app/memory/control/test_credentials.md`
- CRM: `https://crm.mygenie.online/api` (uses `X-API-Key` from login response `crm_token`)
- To reproduce CRM failure: use a restaurant without CRM token, or temporarily break the CRM base URL in the test environment
