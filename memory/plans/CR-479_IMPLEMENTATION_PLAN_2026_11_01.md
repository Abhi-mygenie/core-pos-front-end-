# CR-479 — Implementation Plan (Gate 3)
## International Phone Number Support — Line-by-Line

**Date:** 2026-11-01
**Stage:** Gate 3 — Implementation Plan
**Risk:** MEDIUM
**CRM contract validated:** 2026-11-01 (BUG-044 + BUG-045 fixed, all probes PASS)

---

## NEW FILE F1 — PhoneInputField.jsx (~60 lines)

**Path:** `src/components/ui/PhoneInputField.jsx`

Shared country-code picker component used by 3 screens. Uses `react-phone-number-input` (already in package.json) for flag dropdown.

```jsx
// CR-479: Shared international phone input with country code picker
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumber } from 'libphonenumber-js';

Props:
  phone: string          — raw digits (e.g. '7911123456')
  countryCode: string    — e.g. '+44' (default '+91')
  onPhoneChange: fn(phone)
  onCountryCodeChange: fn(cc)
  placeholder: string
  error: boolean
  testId: string

Renders:
  - react-phone-number-input PhoneInput component
  - defaultCountry="IN"
  - value in E.164 format internally, splits for parent
  - Validation hint: "India: 10 digits · International: 6-15 digits"
```

---

## NEW FILE F2 — phoneValidation.js (~15 lines)

**Path:** `src/utils/phoneValidation.js`

```js
// CR-479: Phone validation per CRM rules
// India (+91): exactly 10 digits, starts 6-9, not all same
// International: 6-15 digits
export const validatePhone = (phone, countryCode = '+91') => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (countryCode === '+91') {
    return /^[6-9]\d{9}$/.test(digits) && !/^(\d)\1{9}$/.test(digits);
  }
  return digits.length >= 6 && digits.length <= 15;
};

export const formatPhoneDisplay = (phone, countryCode) => {
  if (!phone) return '';
  return countryCode && countryCode !== '+91' ? `${countryCode} ${phone}` : phone;
};
```

---

## MODIFY M1 — CustomerModal.jsx (G1 + G7c)

**File:** `src/components/order-entry/CustomerModal.jsx`

### Edit M1a — Add state (after L30)
```js
// AFTER: const [phone, setPhone] = useState(initialData?.phone || "");
// ADD:
const [countryCode, setCountryCode] = useState(initialData?.countryCode || '+91'); // CR-479
```

### Edit M1b — selectModalCustomer (L139, after setPhone)
```js
// AFTER: setPhone(c.phone || "");
// ADD:
setCountryCode(c.countryCode || '+91'); // CR-479: auto-populate from CRM search result
```

### Edit M1c — Replace phone input (L643-650, new customer mode)
Replace the plain `<input type="tel" maxLength={10}>` with PhoneInputField:
```jsx
// BEFORE (L647-650):
<input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={phone} onChange={handlePhoneChange}
  onFocus={() => { if (!isCustomerSelected && filteredByPhone.length > 0) setShowPhoneSuggestions(true); }}
  className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2" style={{ borderColor: COLORS.borderGray }}
  data-testid="customer-phone-input" />

// AFTER:
<PhoneInputField
  phone={phone} countryCode={countryCode}
  onPhoneChange={(v) => { handlePhoneChange({ target: { value: v } }); }}
  onCountryCodeChange={setCountryCode}
  placeholder="Phone number"
  error={false}
  testId="customer-phone-input"
/>
```

### Edit M1d — Same replacement at L749-752 (edit mode)
Same pattern as M1c.

### Edit M1e — handleSave: pass countryCode to create/update
Where `handleSave` calls `createCustomer` or `updateCustomer`, add `countryCode` to the data object.

---

## MODIFY M2 — customerTransform.js (G2 + G7a + G7b)

**File:** `src/api/transforms/customerTransform.js`

### Edit M2a — searchResult (after L57 `phone:`)
```js
// AFTER: phone: api.phone || '',
// ADD:
countryCode: api.country_code || '+91', // CR-479: from CRM search response (BUG-044)
```

### Edit M2b — customerLookup (find the phone field in the lookup transform, same pattern)
```js
// AFTER: phone: api.phone || '',
// ADD:
countryCode: api.country_code || '+91', // CR-479: from CRM lookup response (BUG-045)
```

### Edit M2c — updateCustomer (L254, add countryCode to params + payload)
```js
// BEFORE:
updateCustomer: ({ phone, name, email, dob, anniversary, gstName, gstNumber, isB2b }) => {

// AFTER:
updateCustomer: ({ phone, name, email, dob, anniversary, countryCode, gstName, gstNumber, isB2b }) => { // CR-479: +countryCode
```

And add after the `phone` line:
```js
if (countryCode) payload.country_code = countryCode; // CR-479
```

---

## MODIFY M3 — orderTransform.js (G3 — 4 payloads)

**File:** `src/api/transforms/orderTransform.js`

Add `cust_country_code` after each `cust_mobile` line:

### Edit M3a — placeOrder (after L1083)
```js
cust_mobile:                customer?.phone || '',
cust_country_code:          customer?.countryCode || '+91', // CR-479
```

### Edit M3b — updateOrder (after L1215)
```js
cust_mobile:                customer?.phone || '',           // BUG-270
cust_country_code:          customer?.countryCode || '+91', // CR-479
```

### Edit M3c — placeOrderWithPayment (after L1375)
```js
cust_mobile:                customer?.phone || '',
cust_country_code:          customer?.countryCode || '+91', // CR-479
```

### Edit M3d — collectBillExisting (after L1740)
```js
cust_mobile:        customer?.phone || '',
cust_country_code:  customer?.countryCode || '+91', // CR-479
```

---

## MODIFY M4 — RoomCheckInModal.jsx (G4)

**File:** `src/components/modals/RoomCheckInModal.jsx`

### Edit M4a — Add state (after L300)
```js
// AFTER: const [phone, setPhone] = useState('');
// ADD:
const [countryCode, setCountryCode] = useState('+91'); // CR-479
```

### Edit M4b — Replace hardcoded +91 block (L944-972)
Replace the entire `{/* CR-129: Phone */}` block with PhoneInputField:
```jsx
// BEFORE: hardcoded +91 span + maxLength={10} input
// AFTER:
<div className="relative" ref={phoneWrapRef}>
  <FieldLabel required>Phone</FieldLabel>
  <PhoneInputField
    phone={phone} countryCode={countryCode}
    onPhoneChange={(v) => handlePhoneChange(v)}
    onCountryCodeChange={setCountryCode}
    error={!!errors.phone}
    testId="checkin-phone-input"
  />
</div>
```

### Edit M4c — CRM lookup: pass countryCode
Where lookup is called (L503), send `countryCode` for international customers.

---

## MODIFY M5 — CheckInPage.jsx (G5)

**File:** `src/pages/pms/CheckInPage.jsx`

### Edit M5a — Add countryCode to form state
Where `form.phone` is managed, add `form.countryCode` (default '+91').

### Edit M5b — Replace hardcoded +91 input (L671-672)
```jsx
// BEFORE:
<span className="absolute left-3 top-2.5 text-[13px] text-[#888]">+91</span>
<input data-testid="ci-phone" value={form.phone} onChange={e => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10 digits" className={`${inputCls} pl-12`} />

// AFTER:
<PhoneInputField
  phone={form.phone} countryCode={form.countryCode || '+91'}
  onPhoneChange={(v) => handlePhoneChange(v)}
  onCountryCodeChange={(cc) => setField('countryCode', cc)}
  testId="ci-phone"
/>
```

### Edit M5c — Validation (L295)
Change `/^\d{10}$/.test(form.phone)` to `validatePhone(form.phone, form.countryCode || '+91')`.

### Edit M5d — handleCrmLookup (L140): pass countryCode
```js
const result = await lookupCustomer(phone, countryCode); // CR-479
```

---

## MODIFY M6 — customerService.js (G7 — lookup with country_code)

**File:** `src/api/services/customerService.js`

### Edit M6a — lookupCustomer: accept + send countryCode
```js
// BEFORE:
export const lookupCustomer = async (phone) => {
  const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_LOOKUP, { phone: phone.trim() });

// AFTER:
export const lookupCustomer = async (phone, countryCode) => { // CR-479: +countryCode
  const body = { phone: phone.trim() };
  if (countryCode && countryCode !== '+91') body.country_code = countryCode; // CR-479: send cc for international
  const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_LOOKUP, body);
```

---

## Execution Sequence

| Step | File | Edit | Dependencies |
|---|---|---|---|
| 1 | phoneValidation.js | F2 — create | None |
| 2 | PhoneInputField.jsx | F1 — create | F2 (validation) |
| 3 | customerTransform.js | M2a/b/c — add countryCode to transforms | None |
| 4 | customerService.js | M6a — lookup with cc | None |
| 5 | orderTransform.js | M3a/b/c/d — 4 payloads | None |
| 6 | CustomerModal.jsx | M1a-e — state + UI + save | F1 (PhoneInputField) |
| 7 | RoomCheckInModal.jsx | M4a-c — state + UI + lookup | F1 |
| 8 | CheckInPage.jsx | M5a-d — state + UI + validation + lookup | F1, F2 |

Steps 1-5 can run in parallel. Steps 6-8 depend on F1.

---

## Verification Matrix

| # | Check | How |
|---|---|---|
| V1 | PhoneInputField renders flag picker defaulting 🇮🇳 +91 | Browser: all 3 screens |
| V2 | Search "UK" → shows `🇬🇧 +44` in typeahead results | Browser: CustomerModal type "UK" |
| V3 | Pick UK customer → countryCode auto-populates to +44 | Browser: click search result |
| V4 | Create customer with +44 → CRM receives country_code | Network tab |
| V5 | Update customer → PUT includes country_code | Network tab |
| V6 | Place order → payload has cust_country_code | Network tab |
| V7 | Lookup with +44 → finds UK customer | CRM probe |
| V8 | Indian 10-digit validation works | Enter 9 digits → error |
| V9 | International 6-15 digit validation works | +44 + 7911123456 → valid |
| V10 | RoomCheckInModal shows picker (not hardcoded +91) | Browser: PMS check-in |
| V11 | CheckInPage shows picker | Browser: Front Desk v2 |
| V12 | Compile clean | webpack 0 new warnings |
| REG | Indian customer flow unchanged | Full order flow with +91 |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-479 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: row added
- [ ] FILE_OWNERSHIP.md: all 8 files listed
- [ ] Code markers: // CR-479 in every new/modified file
- [ ] Compile check: 0 new warnings
```

---

```
Planning complete: CR-479
Stage: Gate 3 — Line-by-line Implementation Plan
Risk: MEDIUM
Files WILL create: 2 (PhoneInputField.jsx, phoneValidation.js)
Files WILL modify: 6 (CustomerModal, customerTransform, orderTransform,
                       RoomCheckInModal, CheckInPage, customerService)
Total edits: ~20 across 8 files
Verification: 13 checks
Next: Gate 4 GO → Implementation
```
