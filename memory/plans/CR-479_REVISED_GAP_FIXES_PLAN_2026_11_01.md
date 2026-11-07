# CR-479 — Revised Implementation Plan (Gap Fixes)
## 6 Edits Across 3 Files — Line-by-Line

**Date:** 2026-11-01
**Context:** First implementation pass created PhoneInputField + transforms + payloads correctly, but missed handler/callback mismatches and edit-mode UI in CustomerModal.

---

## Edit E0 — CustomerModal `handlePhoneChange` clips to 10 digits (L163)

**Current (L163-170):**
```js
  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(v);
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setSelectedCRMCustomer(null);
    }
  };
```

**Replace with:**
```js
  const handlePhoneChange = (val) => { // CR-479: accepts string (from PhoneInputField) or event
    const raw = typeof val === 'string' ? val : (val?.target?.value || '');
    const maxLen = countryCode === '+91' ? 10 : 15;
    const v = raw.replace(/\D/g, '').slice(0, maxLen);
    setPhone(v);
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setSelectedCRMCustomer(null);
    }
  };
```

**Why:** PhoneInputField passes raw string, not event. Also removes hard 10-digit clip for international.

---

## Edit E1 — CustomerModal EDIT mode phone input (L755-759)

**Current (L755-759):**
```jsx
                  <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={phone} onChange={handlePhoneChange}
                    onFocus={() => { if (!isCustomerSelected && filteredByPhone.length > 0) setShowPhoneSuggestions(true); }}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2" style={{ borderColor: COLORS.borderGray }}
                    data-testid="customer-phone-input" />
```

**Replace with:**
```jsx
                  <PhoneInputField
                    phone={phone} countryCode={countryCode}
                    onPhoneChange={(v) => { handlePhoneChange(v); if (!isCustomerSelected && filteredByPhone.length > 0) setShowPhoneSuggestions(true); }}
                    onCountryCodeChange={setCountryCode}
                    placeholder={countryCode === '+91' ? '10-digit mobile' : 'Phone number'}
                    testId="customer-phone-input"
                  />
```

---

## Edit E1b — CustomerModal new-mode callback (L652) — remove fake event wrapper

**Current (L652):**
```js
onPhoneChange={(v) => { handlePhoneChange({ target: { value: v } }); if (!isCustomerSelected ...
```

**Replace with (after E0, handler accepts string directly):**
```js
onPhoneChange={(v) => { handlePhoneChange(v); if (!isCustomerSelected ...
```

---

## Edit E2 — CustomerModal handleSave — add `countryCode` to 3 CRM calls

**E2a (L296):** `updateCustomer` — add countryCode
```js
// BEFORE:
          await updateCustomer(customerId, {
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);

// AFTER:
          await updateCustomer(customerId, {
            name: name.trim(),
            phone: phone.trim(),
            countryCode, // CR-479
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);
```

**E2b (L358):** Same pattern — add `countryCode,` after `phone:`

**E2c (L371):** `createCustomer` — add `countryCode`
```js
// BEFORE:
            const result = await createCustomer({
              name: name.trim(),
              phone: phone.trim(),
              dob: birthday || undefined,
              anniversary: anniversary || undefined,
            }, restaurantId);

// AFTER:
            const result = await createCustomer({
              name: name.trim(),
              phone: phone.trim(),
              countryCode, // CR-479
              dob: birthday || undefined,
              anniversary: anniversary || undefined,
            }, restaurantId);
```

---

## Edit E3 — RoomCheckInModal `handlePhoneChange` (L534)

**Current (L534-544):**
```js
  const handlePhoneChange = useCallback((e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(v);
    if (v) clearErr('phone');
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setCrmCustomerId(null);
      setCrmDocuments([]);
    }
  }, [isCustomerSelected]);
```

**Replace with:**
```js
  const handlePhoneChange = useCallback((val) => { // CR-479: accepts string or event
    const raw = typeof val === 'string' ? val : (val?.target?.value || '');
    const maxLen = countryCode === '+91' ? 10 : 15;
    const v = raw.replace(/\D/g, '').slice(0, maxLen);
    setPhone(v);
    if (v) clearErr('phone');
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setCrmCustomerId(null);
      setCrmDocuments([]);
    }
  }, [isCustomerSelected, countryCode]); // CR-479: +countryCode dep
```

---

## Edit E4 — RoomCheckInModal save normalization (L680-692)

**Current (L680-692):**
```js
      // BUG-092: Normalize phone to 10-digit (strip E.164 +91 prefix)
      const rawDigits = (phone || '').replace(/\D/g, '');
      const phone10 = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;

      // BUG-092: CRM customer lookup/create (non-blocking — proceed even if CRM fails)
      let customerId = null;
      if (phone10.length === 10) {
        try {
          const existing = await lookupCustomer(phone10);
```

**Replace with:**
```js
      // CR-479: Use raw digits directly (no 10-digit clip for international)
      const rawDigits = (phone || '').replace(/\D/g, '');
      const phoneForCrm = rawDigits;

      // BUG-092 + CR-479: CRM customer lookup/create (non-blocking)
      let customerId = null;
      if (phoneForCrm.length >= 6) { // CR-479: intl 6-15, india 10
        try {
          const existing = await lookupCustomer(phoneForCrm, countryCode); // CR-479: pass cc
```

---

## Edit E5 — CheckInPage `handlePhoneChange` CRM lookup trigger (L235-248)

**Current (L235-248):**
```js
  const handlePhoneChange = (digits) => {
    setField('phone', digits);
    if (digits.length === 10) {
      handleCrmLookup(digits);
    } else {
      crmLookupPhoneRef.current = null;
      setCrmLoading(false);
      setCrmCustomer(null);
      setCrmError(null);
      setCrmDocs([]);
    }
  };
```

**Replace with:**
```js
  const handlePhoneChange = (digits) => { // CR-479: trigger lookup on valid phone (not just 10 digits)
    setField('phone', digits);
    const cc = form?.countryCode || '+91';
    const isValid = cc === '+91' ? digits.length === 10 : digits.length >= 6;
    if (isValid) {
      handleCrmLookup(digits, cc);
    } else {
      crmLookupPhoneRef.current = null;
      setCrmLoading(false);
      setCrmCustomer(null);
      setCrmError(null);
      setCrmDocs([]);
    }
  };
```

Also need to update `handleCrmLookup` (L140) to pass cc:
```js
// BEFORE:
  const handleCrmLookup = useCallback(async (phone) => {
    ...
      const result = await lookupCustomer(phone);

// AFTER:
  const handleCrmLookup = useCallback(async (phone, cc) => { // CR-479: +cc
    ...
      const result = await lookupCustomer(phone, cc); // CR-479: pass cc for international
```

---

## Execution Sequence

| Step | File | Edits | Parallel? |
|---|---|---|---|
| 1 | CustomerModal.jsx | E0 + E1 + E1b + E2a/b/c | Yes (one file) |
| 2 | RoomCheckInModal.jsx | E3 + E4 | Yes (one file, parallel with step 1) |
| 3 | CheckInPage.jsx | E5 | Yes (parallel with steps 1-2) |

All 3 files can be edited in parallel — no cross-dependencies.

---
