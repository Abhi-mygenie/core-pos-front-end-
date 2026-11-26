# CR-479 — Impact Analysis
## International Phone Number Support (POS Frontend)

**Date:** 2026-10-31
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL — createCustomer transform ready, 5 gaps remain
**Conflict Pre-Check:** No conflicts on any target file for the international phone scope.

---

## 1. Data Flow

```
User enters phone with country picker (🇬🇧 +44 | 7911123456)
  │
  ▼
Component state: { phone: '7911123456', countryCode: '+44' }
  │
  ├── Create customer → customerTransform.createCustomer({ phone, countryCode }) 
  │     → POST /pos/customers { phone, country_code: '+44' }     ✅ ALREADY WORKS
  │
  ├── Update customer → customerTransform.updateCustomer({ phone, countryCode })
  │     → PUT /pos/customers/{id} { phone, country_code: '+44' } ❌ G2: country_code MISSING
  │
  ├── Place order → orderTransform.placeOrder(... customer ...)
  │     → { cust_mobile: '7911123456' }                          ❌ G3: no country_code field
  │
  └── CRM auto-detects on orders if E.164 sent (+447911123456)   ⚠️ Works but explicit cc preferred
```

## 2. Risk: MEDIUM
- 6 files touched, additive UI (country picker alongside existing phone input)
- No financial logic, no shared state/provider changes
- `react-phone-number-input` already installed — proven library

## 3. All 6 Gaps

| Gap | File | Line(s) | Current | Change | Effort |
|---|---|---|---|---|---|
| **G1** | `CustomerModal.jsx` | L645-650, L747-752 | Plain `<input type="tel" maxLength={10}>` | Replace with `react-phone-number-input` PhoneInput (flag dropdown, default +91) | MEDIUM |
| **G2** | `customerTransform.js` | L254 (updateCustomer) | No `countryCode` param, no `country_code` in payload | Add `countryCode` to params + `if (countryCode) payload.country_code = countryCode` | LOW (1 line) |
| **G3** | `orderTransform.js` | L1083, L1215, L1375, L1740 | `cust_mobile: customer?.phone` only | Add `cust_country_code: customer?.countryCode \|\| '+91'` after each `cust_mobile` | LOW (4 lines) |
| **G4** | `RoomCheckInModal.jsx` | L944-970 | Hardcoded `+91` span + `maxLength={10}` input | Replace with PhoneInput component (same as G1) | MEDIUM |
| **G5** | `CheckInForm.jsx` | L946-970 | Hardcoded `+91` span + `maxLength={10}` input | Replace with PhoneInput component (same as G1) | MEDIUM |
| **G6** | New shared util | — | No per-country validation | `validatePhone(phone, cc)` — India: `/^[6-9]\d{9}$/`, intl: `/^\d{6,15}$/` | LOW |

## 4. Shared PhoneInput Component

To avoid duplicating the picker in 3 places, create one shared component:

```
src/components/ui/PhoneInputField.jsx (NEW)
  Props: value, countryCode, onChange(phone, cc), defaultCountry='IN', error
  Uses: react-phone-number-input (already in package.json)
  Renders: flag dropdown + phone input + validation hint
```

Consumed by: CustomerModal (G1), RoomCheckInModal (G4), CheckInForm (G5)

## 5. Files Plan

| # | File | Type | Change |
|---|---|---|---|
| F1 | `src/components/ui/PhoneInputField.jsx` | **NEW** | Shared flag-dropdown phone input component |
| M1 | `src/components/order-entry/CustomerModal.jsx` | MODIFY | Replace phone input (2 locations: new + edit modes) with PhoneInputField |
| M2 | `src/components/modals/RoomCheckInModal.jsx` | MODIFY | Replace hardcoded +91 block with PhoneInputField |
| M3 | `src/components/pms/frontdesk/CheckInForm.jsx` | MODIFY | Replace hardcoded +91 block with PhoneInputField |
| M4 | `src/api/transforms/customerTransform.js` | MODIFY | Add countryCode to updateCustomer (+1 line) |
| M5 | `src/api/transforms/orderTransform.js` | MODIFY | Add cust_country_code to 4 payloads (+4 lines) |
| F2 | `src/utils/phoneValidation.js` | **NEW** | validatePhone(phone, cc) utility |

## 6. Verification Matrix

| # | Check | How |
|---|---|---|
| V1 | CustomerModal shows flag picker defaulting to 🇮🇳 +91 | Browser: open customer modal |
| V2 | Change to 🇬🇧 +44, type UK number → CRM create succeeds | Browser + API probe |
| V3 | Update customer with new cc → PUT includes country_code | Network tab |
| V4 | Place order → payload includes cust_country_code | Network tab |
| V5 | RoomCheckInModal shows flag picker (not hardcoded +91) | Browser: PMS check-in |
| V6 | CheckInForm shows flag picker | Browser: Front Desk v2 |
| V7 | Indian 10-digit validation still works | Enter 987654321 (9 digits) → error |
| V8 | International 6-15 digit validation works | Enter +44 79111 → valid |
| V9 | Compile clean | webpack 0 new warnings |
| REG | Existing Indian customer flow unchanged | Create/search/order with +91 number |

---

```
Planning complete: CR-479
Stage: Gate 2 — Impact Analysis
Risk: MEDIUM
Files WILL create: 2 (PhoneInputField.jsx, phoneValidation.js)
Files WILL modify: 5 (CustomerModal, RoomCheckInModal, CheckInForm, customerTransform, orderTransform)
Owner decisions: ALL 4 LOCKED
Next: Gate 3 (Implementation Plan) → Gate 4 GO
```

---

## ADDENDUM — G7: Lookup/Search Auto-Populate Country Code

### Gap Identified
CRM responses include `country_code` field on all customer endpoints, but POS transforms don't map it. When user picks a search result, only name+phone populate — countryCode is lost.

### G7 Sub-gaps

| Gap | File | Change |
|---|---|---|
| G7a | `customerTransform.js` — `searchResult` | Add `countryCode: api.country_code \|\| '+91'` |
| G7b | `customerTransform.js` — `customerLookup` | Add `countryCode: api.country_code \|\| '+91'` |
| G7c | `CustomerModal.jsx` — `selectModalCustomer` | Set `setCountryCode(c.countryCode \|\| '+91')` on pick |
| G7d | `RoomCheckInModal.jsx` — CRM lookup callback | Set countryCode from lookup result |
| G7e | `CheckInPage.jsx` — `handleCrmLookup` | Set countryCode from lookup result |

### Behavior
- **Existing customers:** country code auto-populates from CRM search/lookup — no manual selection needed
- **New customers:** user manually selects country code via flag picker (default +91)
- Search results should display country code: "John Smith 🇬🇧 +44 7911123456"

### Updated total: 7 gaps (G1-G7), 2 new files + 6 modified files
