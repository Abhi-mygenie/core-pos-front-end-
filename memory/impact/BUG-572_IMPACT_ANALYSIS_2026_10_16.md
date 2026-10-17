# Impact Analysis — BUG-572
## WhatsApp payment icon: no restaurant feature gate — shown to all restaurants

**Role:** PLANNING (Gate 2) · **Date:** 2026-10-16 · **Code Reality:** PARTIAL
**Conflict:** CR-433 (OrderCard L137 is in a different block from L455/517 already changed) — CLEAN
**Files:** `profileTransform.js` (not R5) + `OrderCard.jsx` (R5)

---

## Root Cause
`OrderCard.jsx:L137` — `showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus)` has **zero restaurant gate**. Shows to every restaurant regardless of configuration.

## OD-572-01 — LOCKED
`restaurants[0].basic.whatsapp_message = "Yes" / "No"` → map as `whatsappMessage: bool` in settings.

## Fix (2 files, 3 lines)

**E-1 — `profileTransform.js`:** Add to `settings()` near end (after `printBillCustomerCopy`):
```js
whatsappMessage: apiSettings.basic?.whatsapp_message === 'Yes', // BUG-572
```

**E-2 — `OrderCard.jsx:L137`:** Add restaurant gate:
```js
// BEFORE:
const showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus);
// AFTER:
const showWhatsAppPayment = restaurant?.settings?.whatsappMessage && ![3, 6, 10].includes(fOrderStatus); // BUG-572
```

## Risk: LOW · 2 files · 2 lines · R5 for OrderCard only
## Verification
- V1: Restaurant with `whatsapp_message: "No"` → icon hidden
- V2: Restaurant with `whatsapp_message: "Yes"` → icon visible
- V3: Existing cancelled (fOs=3) / paid (fOs=6) orders → still hidden ✅
