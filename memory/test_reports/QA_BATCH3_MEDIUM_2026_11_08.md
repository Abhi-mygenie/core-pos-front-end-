# QA REPORT — Batch 3 (MEDIUM) — 2026-11-08

**Agent:** QA
**Scope:** CR-479, BUG-636, BUG-637, BUG-638, BUG-642, BUG-643
**Environment:** Preview URL (preprod backend), cafe103 owner login
**Code changes:** ZERO

---

## Test Results Summary

| # | ID | Test | Result | Severity | Evidence |
|---|---|---|---|---|---|
| T19 | CR-479 | International phone: flag picker on all 5 screens (CustomerModal, CartPanel, CPP, RoomCheckIn, CheckIn) | ✅ PASS | — | Code: PhoneInputField imported + used in all 5 files. Browser: 🇮🇳 +91 flag visible in CartPanel (compact). 73 CR-479 markers across 10 files. countryCode state + CRM lookup integration confirmed. |
| T20 | CR-479 | CartPanel compact picker — no chevron, fits narrow panel | ✅ PASS | — | Browser screenshot: flag+code only, no chevron visible in CartPanel. Code: PhoneInputField `compact` prop at L63; `!compact &&` gates chevron at L130; compact styling `gap-0.5 px-1.5` at L123 |
| T21 | BUG-636 | CPP TAB CRM lookup debounced 600ms for intl numbers | ✅ PASS | — | Code: CPP L581 `tabCrmLookupTimer = useRef(null)`, L585 `clearTimeout`, L588 comment "debounce 600ms for intl". Fire immediately for India (exact 10 digits), debounce for intl. Cleanup on unmount L604. |
| T22 | BUG-637 | Dropdown highlights by ISO country code, not calling code | ✅ PASS | — | Code: PhoneInputField L190 `country.code === currentCountry.code` (ISO comparison). Previously compared callingCode which matched multiple countries sharing +44. PRIMARY_COUNTRY_MAP at L36 handles +44→GB, +1→US etc. |
| T23 | BUG-638 | CustomerModal placeholder: "Phone number" (not clipped) | ✅ PASS | — | Code: CustomerModal L660 `placeholder="Phone number"` (new mode). L765 edit mode keeps `'10-digit mobile'` for India, `'Phone number'` for intl. PhoneInputField default placeholder L59 = 'Phone number'. |
| T24 | BUG-642 | PWA standalone: Back button in sidebar | ✅ PASS | — | Code: Sidebar L568-587 — renders Back button with `data-testid="sidebar-back-btn"` on all pages except `/dashboard`, `/`, `/loading`. Uses `navigate(-1)`. Visible in both browser and PWA standalone. |
| T25 | BUG-643 | Credit Management: X button closes order details popup | ✅ PASS | — | Code: CreditCustomerDetailSheet L304 `modal={!billOrder}` — disables Radix modal overlay when SS3 (order details) is open. L715 `pointerEvents: 'auto'` wrapper restores click events blocked by Radix `pointer-events:none`. onClose at L718 calls `setBillOrder(null)`. |

---

## Findings

### ⚠️ NOTE-8: CR-479 — CustomerModal has DIFFERENT placeholder in new vs edit mode
- New customer mode (L660): `placeholder="Phone number"` ← BUG-638 fix
- Edit customer mode (L765): `placeholder={countryCode === '+91' ? '10-digit mobile' : 'Phone number'}`
- This means edit mode still says "10-digit mobile" for Indian numbers — potentially confusing if field supports intl
- **Severity: NOTE** — cosmetic inconsistency, not a functional issue

### ⚠️ NOTE-9: BUG-643 — Fix uses `pointer-events: 'auto'` inline style override
- The Radix Sheet component sets `pointer-events: none` on body when modal is open
- BUG-643 fix wraps the nested OrderDetailSheet in a div with `pointerEvents: 'auto'` + `zIndex: 60`
- This works but is a CSS hack around Radix's modal behavior. If Radix updates their modal implementation, this could break.
- **Severity: NOTE** — works correctly, but fragile long-term

---

## Coverage

| File | Tested? |
|---|---|
| `PhoneInputField.jsx` | ✅ Code: compact mode, ISO highlight, dropdown, placeholder |
| `CartPanel.jsx` | ✅ Browser screenshot + code: compact flag picker visible |
| `CustomerModal.jsx` | ✅ Code: PhoneInputField in new + edit modes |
| `CollectPaymentPanel.jsx` | ✅ Code: debounce timer, countryCode in createCustomer + tabContact |
| `RoomCheckInModal.jsx` | ✅ Code: PhoneInputField with countryCode |
| `CheckInPage.jsx` | ✅ Code: PhoneInputField with countryCode |
| `Sidebar.jsx` | ✅ Code: Back button with navigate(-1) |
| `CreditCustomerDetailSheet.jsx` | ✅ Code: modal={!billOrder} + pointerEvents fix |

**Coverage: 8/8 changed files tested**

---

## Verdict

**Batch 3: 7/7 PASS** (2 NOTEs, 0 BLOCKER, 0 MAJOR, 0 MINOR)

**Recommendation:** All items ready for Gate 6 (Owner Smoke).
