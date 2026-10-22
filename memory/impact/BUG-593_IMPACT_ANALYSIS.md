# BUG-593 — Impact Analysis (Gate 2)

**ID:** BUG-593
**Date:** 2026-10-22
**Code Reality:** NONE — no fix applied
**Risk:** MEDIUM
**Conflict Pre-Check:** CLEAN

---

## 1. Summary

When a new customer is created via POS, CRM receives "noname" as the customer name. Traced the full data flow from UI to API.

## 2. Data Flow Trace

### Call sites (3 paths create customers):

| # | Component | Line | Name source | Code |
|---|-----------|:---:|-------------|------|
| 1 | `CartPanel.jsx` | L1018 | `merged.name.trim()` | `createCustomer({ name: merged.name.trim(), phone: phone10 }, restaurantCtx?.id)` |
| 2 | `CollectPaymentPanel.jsx` | L549 | `tabName.trim()` | `createCustomer({ name: tabName.trim(), phone: tabPhone }, restaurant?.id)` |
| 3 | `CustomerModal.jsx` | L367 | Form `name` field | `createCustomer({ name, phone, email, ... }, restaurant?.id)` |

### Transform (`customerTransform.js:229-247`):

```js
createCustomer: ({ name, phone, ... }) => {
  const payload = {
    pos_id: 'mygenie',
    restaurant_id: '',
    name,      // ← passed directly, even if undefined/empty
    phone,
  };
  ...
  return payload;
};
```

**Key finding:** `name` is **always included** in the payload — even when it's `undefined`, `""`, or `null`. Unlike `email`, `dob`, `anniversary` (which have `if (x) payload.x = x` guards), `name` is unconditionally set.

### What CRM does

When `name` is `""` or `undefined`, the CRM backend defaults to `"noname"`.

## 3. Root Cause

Two contributing factors:

**Factor A (FE — transform):** `createCustomer` transform always sends `name` even when empty. It should either:
- Validate that `name` is non-empty before sending
- Or not include the field if empty (let CRM's default handle it — but that gives "noname")

**Factor B (Call sites):** CartPanel (L1017) and CollectPaymentPanel (L548) both have guards (`if (merged.name?.trim())` / `if (tabName.trim())`) that prevent calling `createCustomer` when name is empty. BUT:
- CartPanel guard: `else if (merged.name?.trim())` — only triggers for new customers. If the phone matches an existing customer, the create path is skipped. But if `merged.name` is empty AND no existing customer found, the guard prevents creation. **This path looks safe.**
- CollectPaymentPanel: `if (tabName.trim())` — same guard. **Also looks safe.**
- CustomerModal: The main create flow — need to check if the name field has validation.

**Likely culprit:** A path where `createCustomer` is called with name set to `""` — possibly the CustomerModal form allowing submission without a name, or an edge case where `merged.name` is a whitespace-only string that `.trim()` makes empty but the guard lets through.

## 4. Recommended Fix

### Option A (Transform guard — safest)

Add a name validation in the transform:
```js
createCustomer: ({ name, phone, ... }) => {
  const payload = {
    pos_id: 'mygenie',
    restaurant_id: '',
    name: name?.trim() || phone || 'Customer',  // BUG-593: fallback to phone or generic
    phone,
  };
```

### Option B (Call site validation)

Add `name` required validation in CustomerModal form before submitting.

## 5. Owner Decision Needed

| ID | Question |
|---|---------|
| OD-593-01 | When name is empty, should FE block the create (require name) or send a fallback (phone number as name)? |

## 6. Files Affected

| File | Change |
|------|--------|
| `customerTransform.js` L233 | Add name fallback/validation |
| Possibly `CustomerModal.jsx` | Add required validation on name field |

**Files WILL NOT touch:** `customerService.js` (just passes through), `CartPanel.jsx`, `CollectPaymentPanel.jsx` (already have guards).

## 7. Scope Lock

1-2 files, ~3-5 lines. Low risk.
