# BUG-636 — Impact Analysis + Implementation Plan

**Gate:** 2 (Impact Analysis) + 3 (Implementation Plan)
**Item:** BUG-636 (P2, CPP TAB CRM lookup per-keystroke for intl)
**Code Reality:** NONE — no debounce, no countryCode in createCustomer/tabContact
**Conflict Pre-Check:** No active items modifying CPP L576-590 or L1200. Parallel-safe.

---

## IMPACT ANALYSIS (Gate 2)

### Data Flow Trace
```
User types phone digits in CPP TAB section
  → handleTabPhoneChange (L652) sets tabPhone state
  → useEffect (L576-590) deps: [tabPhone, tabIsCustomerSelected, isTabPayment]
    → For +91: fires ONLY at exactly 10 digits ✅
    → For intl: fires at 6, 7, 8, 9, 10, 11... digits ❌ (per-keystroke)
      → lookupCustomer(tabPhone, tabCountryCode)
        → If not found + name exists → createCustomer({ name, phone }) ← MISSING countryCode
          → Creates junk CRM profile with partial phone
  
On Pay:
  → handlePay builds payload with tabContact (L1200)
    → tabContact: { name, phone, crmId } ← MISSING countryCode
```

### Risk Assessment
- **Risk:** MEDIUM — CPP is R5, but change is effect timing + payload fields only
- **Financial logic:** NONE — CRM lookup/create is non-blocking, never affects bill amount
- **Downstream:** CRM receives correct countryCode; debounce prevents junk profiles

### 3 Gaps

| # | Line | Gap | Impact |
|---|------|-----|--------|
| G1 | L576-590 | useEffect fires per-keystroke for intl ≥6 digits | 5+ CRM API calls per phone entry; junk createCustomer calls |
| G2 | L584 | createCustomer missing `countryCode` | CRM stores customer without country info |
| G3 | L1200 | tabContact missing `tabCountryCode` | Order payload lacks country code for TAB customer |

---

## IMPLEMENTATION PLAN (Gate 3)

### Edit Summary
| # | File | Line | Edit | Risk |
|---|------|------|------|------|
| E1 | `CollectPaymentPanel.jsx` | L576-590 | Add debounce ref + setTimeout/clearTimeout wrapper around CRM lookup | LOW |
| E2 | `CollectPaymentPanel.jsx` | L584 | Add `countryCode: tabCountryCode` to createCustomer payload | LOW |
| E3 | `CollectPaymentPanel.jsx` | L1200 | Add `countryCode: tabCountryCode` to tabContact | LOW |

**Files WILL change:** `CollectPaymentPanel.jsx`
**Files will NOT touch:** Any other file

---

### E1 — Debounce CRM lookup (L576-590)

**Current:**
```jsx
  useEffect(() => {
    const isValidPhone = tabCountryCode === '+91' ? tabPhone.length === 10 : tabPhone.length >= 6;
    if (!isTabPayment || tabIsCustomerSelected || !isValidPhone) return;
    lookupCustomer(tabPhone, tabCountryCode)
      .then((found) => {
        if (found?.id) {
          setTabCrmId(found.id);
        } else if (tabName.trim()) {
          createCustomer({ name: tabName.trim(), phone: tabPhone }, restaurant?.id)
            .then((created) => { if (created?.id) setTabCrmId(created.id); })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [tabPhone, tabIsCustomerSelected, isTabPayment]);
```

**New:**
```jsx
  const tabCrmLookupTimer = useRef(null); // BUG-636: debounce intl CRM lookup
  useEffect(() => {
    const isValidPhone = tabCountryCode === '+91' ? tabPhone.length === 10 : tabPhone.length >= 6;
    if (!isTabPayment || tabIsCustomerSelected || !isValidPhone) {
      if (tabCrmLookupTimer.current) clearTimeout(tabCrmLookupTimer.current); // BUG-636
      return;
    }
    // BUG-636: debounce 600ms for intl to avoid per-keystroke CRM calls; fire immediately for India (exact 10)
    const delay = tabCountryCode === '+91' ? 0 : 600;
    if (tabCrmLookupTimer.current) clearTimeout(tabCrmLookupTimer.current);
    tabCrmLookupTimer.current = setTimeout(() => {
      lookupCustomer(tabPhone, tabCountryCode)
        .then((found) => {
          if (found?.id) {
            setTabCrmId(found.id);
          } else if (tabName.trim()) {
            createCustomer({ name: tabName.trim(), phone: tabPhone, countryCode: tabCountryCode }, restaurant?.id) // BUG-636 E2: +countryCode
              .then((created) => { if (created?.id) setTabCrmId(created.id); })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }, delay);
    return () => { if (tabCrmLookupTimer.current) clearTimeout(tabCrmLookupTimer.current); }; // BUG-636: cleanup
  }, [tabPhone, tabIsCustomerSelected, isTabPayment]); // eslint-disable-line react-hooks/exhaustive-deps
```

### E3 — Add countryCode to tabContact (L1200)

**Current:**
```jsx
      tabContact: isTabPayment ? { name: tabName, phone: tabPhone, crmId: tabCrmId } : null,
```

**New:**
```jsx
      tabContact: isTabPayment ? { name: tabName, phone: tabPhone, crmId: tabCrmId, countryCode: tabCountryCode } : null, // BUG-636 E3: +countryCode
```

---

## Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|--------------|:---:|
| V1 | CPP L576-590 | Debounce 600ms for intl | Browser: type UK number slowly — Network tab should show 1 lookup (not 5) | NO |
| V2 | CPP L576-590 | India fires immediately | Browser: type 10-digit Indian — lookup fires at exactly 10 digits | NO |
| V3 | CPP L584 | countryCode in createCustomer | Code review: payload includes `countryCode: tabCountryCode` | YES |
| V4 | CPP L1200 | countryCode in tabContact | Code review: tabContact includes `countryCode: tabCountryCode` | YES |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-636 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx
- [ ] Code markers: // BUG-636 in every modified section
- [ ] Compile: webpack 0 new warnings
```

## Scope Lock
- **Files WILL change:** CollectPaymentPanel.jsx
- **Files will NOT touch:** PhoneInputField.jsx, CartPanel.jsx, CustomerModal.jsx, any service/transform
