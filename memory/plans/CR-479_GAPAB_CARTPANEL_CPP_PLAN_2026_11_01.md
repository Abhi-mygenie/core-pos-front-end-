# CR-479 — GAP-A + GAP-B Implementation Plan
## CartPanel Inline Phone + CollectPaymentPanel Credit Phone

**Date:** 2026-11-01
**Context:** Two additional phone entry points discovered outside the CustomerModal/PMS screens.

---

## GAP-A: CartPanel.jsx — Inline phone input on order entry right panel

### Edit A1 — Add import (top of file)
```js
// ADD after existing imports:
import { PhoneInputField } from '../ui/PhoneInputField'; // CR-479
```

### Edit A2 — Add countryCode state (after L848)
**Current (L848):**
```js
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || "");
```
**After:**
```js
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || "");
  const [customerCountryCode, setCustomerCountryCode] = useState(customer?.countryCode || '+91'); // CR-479
```

### Edit A3 — Fix handlePhoneChange (L963-973)
**Current:**
```js
  const handlePhoneChange = (e) => {
    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(newPhone);
    if (!newPhone.trim() && isCustomerSelected) {
      setCustomerName("");
      setIsCustomerSelected(false);
      onCustomerChange?.(null);
    }
  };
```
**Replace with:**
```js
  const handlePhoneChange = (val) => { // CR-479: accepts string or event
    const raw = typeof val === 'string' ? val : (val?.target?.value || '');
    const maxLen = customerCountryCode === '+91' ? 10 : 15;
    const newPhone = raw.replace(/\D/g, '').slice(0, maxLen);
    setCustomerPhone(newPhone);
    if (!newPhone.trim() && isCustomerSelected) {
      setCustomerName("");
      setIsCustomerSelected(false);
      onCustomerChange?.(null);
    }
  };
```

### Edit A4 — Fix phoneMissing validation (L859)
**Current:**
```js
  const phoneMissing = isPhoneRequired && customerPhone.replace(/\D/g, '').length !== 10;
```
**Replace with:**
```js
  const phoneMissing = isPhoneRequired && (customerCountryCode === '+91' ? customerPhone.replace(/\D/g, '').length !== 10 : customerPhone.replace(/\D/g, '').length < 6); // CR-479
```

### Edit A5 — Replace phone input JSX (L1118-1138)
**Current (L1118-1138):** Plain `<input type="tel" maxLength={10}>` with Phone icon
**Replace with:**
```jsx
        <div className="relative" ref={phoneInputRef}>
          <PhoneInputField
            phone={customerPhone} countryCode={customerCountryCode}
            onPhoneChange={(v) => { handlePhoneChange(v); if (!isRoom && v.length >= 3) setShowPhoneSuggestions(filteredCustomers.length > 0); }}
            onCountryCodeChange={setCustomerCountryCode}
            placeholder={isPhoneRequired ? 'Phone *' : 'Phone number'}
            error={phoneMissing}
            testId="cart-phone-input"
            disabled={isRoom}
          />
```

### Edit A6 — Auto-populate countryCode on customer select
Where `setCustomerPhone(customer.phone)` is called on search-pick (L878):
```js
// AFTER: setCustomerPhone(customer.phone || "");
// ADD:
setCustomerCountryCode(customer.countryCode || '+91'); // CR-479
```

---

## GAP-B: CollectPaymentPanel.jsx — Credit/TAB phone input

### Edit B1 — Add import (top of file)
```js
// ADD after existing imports:
import { PhoneInputField } from '../ui/PhoneInputField'; // CR-479
```

### Edit B2 — Add tabCountryCode state (after L512)
**Current (L512):**
```js
  const [tabPhone, setTabPhone] = useState(customer?.phone || "");
```
**After:**
```js
  const [tabPhone, setTabPhone] = useState(customer?.phone || "");
  const [tabCountryCode, setTabCountryCode] = useState(customer?.countryCode || '+91'); // CR-479
```

### Edit B3 — Fix handleTabPhoneChange (L649-658)
**Current:**
```js
  const handleTabPhoneChange = (e) => {
    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
    setTabPhone(newPhone);
    ...
  };
```
**Replace with:**
```js
  const handleTabPhoneChange = (val) => { // CR-479: accepts string or event
    const raw = typeof val === 'string' ? val : (val?.target?.value || '');
    const maxLen = tabCountryCode === '+91' ? 10 : 15;
    const newPhone = raw.replace(/\D/g, '').slice(0, maxLen);
    setTabPhone(newPhone);
    ...
  };
```

### Edit B4 — Fix lookup trigger (L575)
**Current:**
```js
    if (!isTabPayment || tabIsCustomerSelected || tabPhone.length !== 10) return;
    lookupCustomer(tabPhone)
```
**Replace with:**
```js
    const isValid = tabCountryCode === '+91' ? tabPhone.length === 10 : tabPhone.length >= 6; // CR-479
    if (!isTabPayment || tabIsCustomerSelected || !isValid) return;
    lookupCustomer(tabPhone, tabCountryCode) // CR-479: pass cc
```

### Edit B5 — Replace phone input JSX (L3268-3283)
**Current:** Plain `<input type="tel" maxLength={10} placeholder="Phone Number * (10 digits)">`
**Replace with:**
```jsx
                <div className="relative" ref={tabPhoneInputRef}>
                  <PhoneInputField
                    phone={tabPhone} countryCode={tabCountryCode}
                    onPhoneChange={(v) => { handleTabPhoneChange(v); if (tabFilteredByPhone.length > 0) setTabShowPhoneSuggestions(true); }}
                    onCountryCodeChange={setTabCountryCode}
                    placeholder="Phone Number *"
                    error={tabPhone.length > 0 && (tabCountryCode === '+91' ? tabPhone.replace(/\D/g, '').length !== 10 : tabPhone.replace(/\D/g, '').length < 6)}
                    testId="tab-customer-phone-input"
                  />
```

### Edit B6 — Validation border color (remove inline style from L3279-3282)
The old input had inline `borderColor` + `backgroundColor` based on `length === 10`. PhoneInputField handles its own error styling via the `error` prop — no inline style needed.

---

## Execution Sequence

| Step | File | Edits | Parallel? |
|---|---|---|---|
| 1 | CartPanel.jsx | A1-A6 | Yes |
| 2 | CollectPaymentPanel.jsx | B1-B6 | Yes (parallel with step 1) |

---

## Verification Matrix

| # | Check | How |
|---|---|---|
| VA1 | Cart panel shows flag picker (not plain phone input) | Browser: open order entry |
| VA2 | Cart panel flag defaults 🇮🇳 +91 | Browser: visual check |
| VA3 | Cart panel accepts international number | Switch to +44, type 7911123456 |
| VB1 | Credit panel shows flag picker | Browser: Collect Bill → Credit → phone field |
| VB2 | Credit panel CRM lookup works for Indian | Type 10-digit → lookup fires |
| VB3 | Credit panel CRM lookup works for intl | Switch +44, type 7911123456 → lookup fires |
| REG | Existing Indian flow unchanged | 10-digit Indian number → works as before |
