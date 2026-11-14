# BUG-631 + BUG-632 — Impact Analysis + Implementation Plan

**Gate:** 2 (Impact Analysis) + 3 (Implementation Plan)
**Items:** BUG-631 (P1, narrow panel layout) + BUG-632 (P2, tablet responsive)
**Code Reality:** NONE — no compact variant, no responsive dropdown positioning
**Conflict Pre-Check:** No active items on PhoneInputField.jsx. CartPanel + CPP are R5 but changes are CSS/prop-only.

---

## IMPACT ANALYSIS (Gate 2)

### Data Flow Trace
```
PhoneInputField.jsx (shared component)
  ├── Flag picker button: L110-123 — gap-1.5 px-2.5, no compact mode
  │     └── Flag emoji (text-lg) + calling code (text-sm) + chevron SVG (w-3)
  ├── Phone input: L126-137 — flex-1 min-w-0, clips when picker is too wide
  ├── Validation hint: L141-143 — always rendered below
  └── Dropdown: L146-183 — absolute left-0 top-full w-72, no viewport check

Callers:
  CartPanel.jsx:1122         — compact=needed (narrow right panel ~280px)
  CollectPaymentPanel.jsx:3273 — compact=needed (narrow TAB section)
  CustomerModal.jsx:654,759  — full OK (modal is ~500px wide)
  RoomCheckInModal.jsx:953   — full OK (modal width)
  CheckInPage.jsx:673        — full OK (grid-cols-2 right panel ~400px per col)
```

### Risk Assessment
- **Risk:** MEDIUM — touches CartPanel (R5) and CPP (R5) but change is CSS/prop-only
- **Financial logic:** NONE — no amount, no API, no state change
- **Downstream consumers:** Phone value unchanged — only visual rendering changes

### Owner Decisions (LOCKED)
| OD | Decision |
|---|---|
| OD-631-01 | YES — compact picker shows flag + code only, no chevron |
| OD-632-01 | YES — fixed position with viewport boundary flip |

---

## IMPLEMENTATION PLAN (Gate 3)

### Edit Summary
| # | File | Edit | Lines | Risk |
|---|------|------|-------|------|
| E1 | `PhoneInputField.jsx` | Add `compact` prop + compact rendering branch | L46,113,118-122,141-143 | LOW |
| E2 | `PhoneInputField.jsx` | Add viewport-aware dropdown positioning | L147-148 | LOW |
| E3 | `CartPanel.jsx` | Pass `compact` to PhoneInputField | L1122 | LOW |
| E4 | `CollectPaymentPanel.jsx` | Pass `compact` to PhoneInputField | L3273 | LOW |

**Files WILL change:** `PhoneInputField.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`
**Files will NOT touch:** `CustomerModal.jsx`, `RoomCheckInModal.jsx`, `CheckInPage.jsx` (modals/pages have enough width)

---

### E1 — PhoneInputField.jsx: Add `compact` prop + compact rendering

**Current (L46-54):**
```jsx
export const PhoneInputField = ({
  phone = '',
  countryCode = '+91',
  onPhoneChange,
  onCountryCodeChange,
  placeholder = 'Phone number',
  error = false,
  testId = 'phone-input',
  disabled = false,
}) => {
```

**New (L46-55):**
```jsx
export const PhoneInputField = ({
  phone = '',
  countryCode = '+91',
  onPhoneChange,
  onCountryCodeChange,
  placeholder = 'Phone number',
  error = false,
  testId = 'phone-input',
  disabled = false,
  compact = false, // BUG-631: compact mode for narrow panels (flag+code, no chevron)
}) => {
```

**Current picker button (L110-123):**
```jsx
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-[7px] border-r flex-shrink-0 hover:bg-slate-50 transition-colors"
          style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
          data-testid={`${testId}-country-picker`}
          disabled={disabled}
        >
          <span className="text-lg leading-none">{countryFlag(currentCountry.code)}</span>
          <span className="text-sm font-semibold text-slate-700">{currentCountry.callingCode}</span>
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
```

**New picker button (compact-aware):**
```jsx
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          className={`flex items-center ${compact ? 'gap-0.5 px-1.5' : 'gap-1.5 px-2.5'} py-[7px] border-r flex-shrink-0 hover:bg-slate-50 transition-colors`}
          style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
          data-testid={`${testId}-country-picker`}
          disabled={disabled}
        >
          <span className={`${compact ? 'text-sm' : 'text-lg'} leading-none`}>{countryFlag(currentCountry.code)}</span>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-700`}>{currentCountry.callingCode}</span>
          {!compact && (
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
```

**Current validation hint (L141-143):**
```jsx
      <p className="text-[10px] mt-1" style={{ color: '#94A3B8' }}>
        {countryCode === '+91' ? '10 digits, starts 6-9' : '6-15 digits'}
      </p>
```

**New (hide in compact):**
```jsx
      {!compact && (
        <p className="text-[10px] mt-1" style={{ color: '#94A3B8' }}>
          {countryCode === '+91' ? '10 digits, starts 6-9' : '6-15 digits'}
        </p>
      )}
```

---

### E2 — PhoneInputField.jsx: Viewport-aware dropdown positioning (BUG-632)

**Current dropdown container (L147-148):**
```jsx
        <div
          className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 w-72 max-h-[240px] overflow-hidden flex flex-col"
```

**New (viewport-aware with useEffect for position):**

Add state + ref for dropdown position (inside component body, after L59):
```jsx
  const [dropAbove, setDropAbove] = useState(false); // BUG-632: viewport flip

  // BUG-632: Check if dropdown fits below, flip above if not
  useEffect(() => {
    if (!open || !dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropAbove(spaceBelow < 260); // 240px dropdown + 20px margin
  }, [open]);
```

**New dropdown container:**
```jsx
        <div
          className={`absolute left-0 ${dropAbove ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-slate-200 rounded-xl shadow-lg z-50 ${compact ? 'w-64' : 'w-72'} max-h-[240px] overflow-hidden flex flex-col`}
```

---

### E3 — CartPanel.jsx:1122: Pass `compact`

**Current:**
```jsx
          <PhoneInputField
            phone={customerPhone} countryCode={customerCountryCode}
```

**New:**
```jsx
          <PhoneInputField
            compact
            phone={customerPhone} countryCode={customerCountryCode}
```

---

### E4 — CollectPaymentPanel.jsx:3273: Pass `compact`

**Current:**
```jsx
                  <PhoneInputField
                    phone={tabPhone} countryCode={tabCountryCode}
```

**New:**
```jsx
                  <PhoneInputField
                    compact
                    phone={tabPhone} countryCode={tabCountryCode}
```

---

## Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|--------------|:---:|
| V1 | PhoneInputField.jsx | compact prop accepted | Unit: render with compact=true, no chevron SVG | YES |
| V2 | PhoneInputField.jsx | compact hides hint | Unit: render compact, validation text absent | YES |
| V3 | PhoneInputField.jsx | dropdown flips above when near bottom | Browser: open dropdown near viewport bottom | NO |
| V4 | CartPanel.jsx | compact passed | Browser: open order entry, flag+code only, no chevron, no clipping | NO |
| V5 | CollectPaymentPanel.jsx | compact passed | Browser: open TAB/Credit phone, same compact rendering | NO |
| V6 | CustomerModal.jsx | NOT compact | Browser: open customer modal, full picker with chevron + hint | NO |
| V7 | RoomCheckInModal.jsx | NOT compact | Browser: PMS modal, full picker | NO |
| V8 | CheckInPage.jsx | NOT compact | Browser: walk-in form, full picker | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-631, BUG-632 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: PhoneInputField.jsx, CartPanel.jsx, CollectPaymentPanel.jsx
- [ ] Code markers: // BUG-631 and // BUG-632 in every modified file
- [ ] Compile: webpack 0 new warnings
```

---

## Scope Lock
- **Files WILL change:** PhoneInputField.jsx, CartPanel.jsx, CollectPaymentPanel.jsx
- **Files will NOT touch:** CustomerModal.jsx, RoomCheckInModal.jsx, CheckInPage.jsx, orderTransform.js, customerTransform.js, any service/context
