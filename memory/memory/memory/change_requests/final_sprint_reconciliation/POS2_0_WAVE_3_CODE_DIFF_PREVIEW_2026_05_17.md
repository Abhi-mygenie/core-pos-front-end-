# POS2.0 Wave 3 Code Diff Preview (REVISED) — 2026-05-17

## 1. Purpose

Revised code-change preview incorporating owner feedback:
- **BUG-080:** By Station split is OUT OF SCOPE. Split-by-Payment uses fixed one-row-per-enabled-method (no dropdown).
- **BUG-056:** Presets go inside the SAME existing dropdown (not a separate section). Always percentage. No manual input when preset selected.

---

## 2. Per-Bug Diff Preview

---

### BUG-080 — partial_payments UI Enforcement (REVISED)

---

#### Change 1 of 4: Add `enabledPrimaryMethods` helper

**File:** `CollectPaymentPanel.jsx`  
**After line ~91 (after dynamicPaymentTypes, before DEBUG LOGS)**

**Current (L87-101):**
```jsx
  // Get dynamic payment types from API (dineout, zomato_gold, etc.)
  const dynamicPaymentTypes = useMemo(() => 
    getDynamicPaymentTypes(restaurantPaymentTypes || []),
    [restaurantPaymentTypes]
  );

  // DEBUG LOGS - Payment Configuration
  console.log('[CollectPaymentPanel] Payment Debug:', {
    restaurantPaymentMethods,
    restaurantPaymentTypes,
    paymentLayoutConfig,
    hasRooms,
    enabledLayout,
    dynamicPaymentTypes,
  });
```

**Proposed:**
```jsx
  // Get dynamic payment types from API (dineout, zomato_gold, etc.)
  const dynamicPaymentTypes = useMemo(() => 
    getDynamicPaymentTypes(restaurantPaymentTypes || []),
    [restaurantPaymentTypes]
  );

  // BUG-080: Primary methods enabled in BOTH API paymentTypes AND restaurant
  // boolean config. UI hides disabled methods. Payload unchanged (always 3 entries).
  const enabledPrimaryMethods = useMemo(() => {
    const mapping = { cash: 'cash', upi: 'upi', card: 'card' };
    return ['cash', 'upi', 'card'].filter(id =>
      enabledLayout.row1.includes(id) &&
      restaurantPaymentMethods?.[mapping[id]] !== false
    );
  }, [enabledLayout, restaurantPaymentMethods]);

  // DEBUG LOGS - Payment Configuration
  console.log('[CollectPaymentPanel] Payment Debug:', {
    restaurantPaymentMethods,
    restaurantPaymentTypes,
    paymentLayoutConfig,
    hasRooms,
    enabledLayout,
    enabledPrimaryMethods,
    dynamicPaymentTypes,
  });
```

---

#### Change 2 of 4: Smart default payment method

**File:** `CollectPaymentPanel.jsx`  
**Lines 275-287**

**Current:**
```jsx
  const [paymentMethod, setPaymentMethod] = useState(() => {
    if (!Array.isArray(allowedMethods) || allowedMethods.length === 0) return 'cash';
    const row1 = enabledLayout?.row1 || [];
    const configured = allowedMethods.filter((id) => row1.includes(id));
    if (configured.includes('cash')) return 'cash';
    return configured[0] || 'cash';
  });
```

**Proposed:**
```jsx
  // BUG-080: Non-hold callers default to first enabled primary method.
  const [paymentMethod, setPaymentMethod] = useState(() => {
    if (Array.isArray(allowedMethods) && allowedMethods.length > 0) {
      const row1 = enabledLayout?.row1 || [];
      const configured = allowedMethods.filter((id) => row1.includes(id));
      if (configured.includes('cash')) return 'cash';
      return configured[0] || 'cash';
    }
    const enabled = enabledPrimaryMethods;
    if (enabled.includes('cash')) return 'cash';
    return enabled[0] || 'cash';
  });
```

---

#### Change 3 of 4: Split payment state — one entry per enabled method (no dropdown)

**File:** `CollectPaymentPanel.jsx`  
**Lines 298-303**

**Current:**
```jsx
  const [showSplit, setShowSplit] = useState(false);
  const [splitType, setSplitType] = useState(null); // 'payment' or 'station'
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "", transactionId: "" },
    { method: "card", amount: "", transactionId: "" },
  ]);
```

**Proposed:**
```jsx
  const [showSplit, setShowSplit] = useState(false);
  const [splitType, setSplitType] = useState(null); // 'payment' or 'station'
  // BUG-080: One row per enabled primary method. Method is fixed per row
  // (no dropdown). Cashier only enters amounts. Disabled methods don't appear.
  const [splitPayments, setSplitPayments] = useState(() => {
    return (enabledPrimaryMethods.length > 0 ? enabledPrimaryMethods : ['cash']).map(m => ({
      method: m, amount: "", transactionId: "",
    }));
  });
```

---

#### Change 4 of 4: Split-by-Payment UI — fixed label per row, no dropdown

**File:** `CollectPaymentPanel.jsx`  
**Lines 2007-2076 (entire split-by-payment section)**

**Current:**
```jsx
              {/* Split by Payment */}
              {splitType === "payment" && (
                <div className="space-y-2">
                  {splitPayments.map((sp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex gap-2">
                        <select
                          value={sp.method}
                          onChange={(e) => {
                            const newSplit = [...splitPayments];
                            newSplit[idx].method = e.target.value;
                            if (e.target.value !== 'card') newSplit[idx].transactionId = '';
                            setSplitPayments(newSplit);
                          }}
                          className="px-2 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: COLORS.borderGray }}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={sp.amount}
                          onChange={(e) => {
                            const newSplit = [...splitPayments];
                            newSplit[idx].amount = e.target.value;
                            setSplitPayments(newSplit);
                          }}
                          className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: COLORS.borderGray }}
                        />
                      </div>
                      {/* BUG-241: Inline Txn ID for card split rows */}
                      {sp.method === 'card' && (
                        <div className="ml-1 flex items-center gap-2">
                          <span className="text-xs whitespace-nowrap" style={{ color: COLORS.grayText }}>Txn ID:</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            placeholder="Last 4"
                            value={sp.transactionId || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              const newSplit = [...splitPayments];
                              newSplit[idx].transactionId = val;
                              setSplitPayments(newSplit);
                            }}
                            className="w-20 px-2 py-1 rounded-lg border text-sm outline-none tracking-widest text-center"
                            style={{
                              borderColor: (sp.transactionId || '').length === 4 ? COLORS.primaryGreen : '#ef4444',
                              backgroundColor: (sp.transactionId || '').length === 4 ? `${COLORS.primaryGreen}08` : '#fef2f2',
                            }}
                            data-testid={`split-txn-id-${idx}`}
                          />
                          {(sp.transactionId || '').length > 0 && (sp.transactionId || '').length < 4 && (
                            <span className="text-xs" style={{ color: COLORS.primaryOrange }}>4 digits</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="text-xs text-right" style={{ color: COLORS.grayText }}>
                    Remaining: ₹{Math.max(0, finalTotal - splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0)).toFixed(2)}
                  </div>
                </div>
              )}
```

**Proposed:**
```jsx
              {/* Split by Payment — BUG-080: one fixed row per enabled method, no dropdown */}
              {splitType === "payment" && (
                <div className="space-y-2">
                  {splitPayments.map((sp, idx) => (
                    <div key={sp.method} className="space-y-1.5">
                      <div className="flex gap-2 items-center">
                        {/* Fixed method label — not a dropdown */}
                        <span
                          className="px-3 py-1.5 rounded-lg border text-sm font-medium min-w-[60px] text-center"
                          style={{
                            borderColor: COLORS.primaryGreen,
                            backgroundColor: `${COLORS.primaryGreen}10`,
                            color: COLORS.primaryGreen,
                          }}
                          data-testid={`split-method-label-${sp.method}`}
                        >
                          {sp.method === 'cash' ? 'Cash' : sp.method === 'card' ? 'Card' : 'UPI'}
                        </span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={sp.amount}
                          onChange={(e) => {
                            const newSplit = [...splitPayments];
                            newSplit[idx].amount = e.target.value;
                            setSplitPayments(newSplit);
                          }}
                          className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: COLORS.borderGray }}
                          data-testid={`split-amount-${sp.method}`}
                        />
                      </div>
                      {/* BUG-241: Inline Txn ID for card row */}
                      {sp.method === 'card' && (
                        <div className="ml-1 flex items-center gap-2">
                          <span className="text-xs whitespace-nowrap" style={{ color: COLORS.grayText }}>Txn ID:</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            placeholder="Last 4"
                            value={sp.transactionId || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              const newSplit = [...splitPayments];
                              newSplit[idx].transactionId = val;
                              setSplitPayments(newSplit);
                            }}
                            className="w-20 px-2 py-1 rounded-lg border text-sm outline-none tracking-widest text-center"
                            style={{
                              borderColor: (sp.transactionId || '').length === 4 ? COLORS.primaryGreen : '#ef4444',
                              backgroundColor: (sp.transactionId || '').length === 4 ? `${COLORS.primaryGreen}08` : '#fef2f2',
                            }}
                            data-testid={`split-txn-id-${idx}`}
                          />
                          {(sp.transactionId || '').length > 0 && (sp.transactionId || '').length < 4 && (
                            <span className="text-xs" style={{ color: COLORS.primaryOrange }}>4 digits</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="text-xs text-right" style={{ color: COLORS.grayText }}>
                    Remaining: ₹{Math.max(0, finalTotal - splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0)).toFixed(2)}
                  </div>
                </div>
              )}
```

**Visual result:**
```
┌──────────────────────────────────────┐
│  By Payment              By Station  │
│                                      │
│  [ Cash  ]    [  Amount  ]           │
│  [ Card  ]    [  Amount  ]           │
│    Txn ID: [Last 4]                  │
│  [ UPI   ]    [  Amount  ]           │
│                                      │
│                Remaining: ₹150.00    │
└──────────────────────────────────────┘
```

If card is disabled → only Cash + UPI rows appear. No Card row at all.

**NOT touched (out of scope):**
- Split-by-Station dropdowns (Bar/Kitchen) — separate CR
- Row 1 primary buttons filter — same as original diff (Change 4 from v1)

---

#### Row 1 buttons (same as original diff — included for completeness)

**Lines 1856-1890:**

**Current:**
```jsx
          <div className="grid grid-cols-3 gap-2 mb-2">
            {(() => {
              const primaryMethodIds = ['cash', 'upi', 'card'];
              const row1Methods = primaryMethodIds
                .filter(id => enabledLayout.row1.includes(id))
                .slice(0, 3);
              
              return row1Methods.map((methodId) => {
```

**Proposed:**
```jsx
          <div className={`grid grid-cols-${Math.min(enabledPrimaryMethods.length, 3) || 3} gap-2 mb-2`}>
            {(() => {
              return enabledPrimaryMethods.map((methodId) => {
```

---

### BUG-056 — Preset Discount in Same Dropdown (REVISED)

---

#### Change 1 of 1: Add preset categories to existing discount dropdown

**File:** `CollectPaymentPanel.jsx`  
**Lines 865-907 (discount section)**

**Current:**
```jsx
        {/* 1. Discount Section - Always visible */}
        <div
          className="p-3 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="discount-section"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🏷️ Discount</span>
            <div className="flex gap-2 flex-1 justify-end">
              <select
                value={discountType || ""}
                onChange={(e) => setDiscountType(e.target.value || null)}
                className="px-2 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: COLORS.borderGray, minWidth: "80px" }}
              >
                <option value="">None</option>
                <option value="percent">%</option>
                <option value="flat">₹</option>
              </select>
              {discountType && (
                <input
                  type="number"
                  placeholder={discountType === 'percent' ? "%" : "₹"}
                  value={discountValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (e.target.value === '' || e.target.value === '-') { setDiscountValue(''); return; }
                    if (val < 0) { setDiscountValue(''); return; }
                    if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
                    setDiscountValue(e.target.value);
                  }}
                  min="0"
                  max={discountType === 'percent' ? "100" : undefined}
                  className="w-20 px-2 py-1.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: COLORS.borderGray }}
                />
              )}
              {manualDiscount > 0 && (
                <span className="text-sm font-medium self-center" style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount}</span>
              )}
            </div>
          </div>
        </div>
```

**Proposed:**
```jsx
        {/* 1. Discount Section - Always visible
            BUG-056: Preset discount categories from restaurant profile added to the
            same dropdown. Always percentage. Mutually exclusive with manual % / ₹.
            When a preset is selected, the value input is hidden (% is fixed).
            Selecting manual (% or ₹) clears preset. Selecting preset clears manual. */}
        <div
          className="p-3 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="discount-section"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🏷️ Discount</span>
            <div className="flex gap-2 flex-1 justify-end">
              <select
                value={selectedDiscountType ? `preset_${selectedDiscountType.id}` : (discountType || "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' ) {
                    // "None" — clear everything
                    setDiscountType(null);
                    setDiscountValue("");
                    setSelectedDiscountType(null);
                  } else if (val === 'percent' || val === 'flat') {
                    // Manual mode — clear preset
                    setDiscountType(val);
                    setSelectedDiscountType(null);
                  } else if (val.startsWith('preset_')) {
                    // Preset mode — clear manual
                    const presetId = val.replace('preset_', '');
                    const found = (discountTypes || []).find(dt => String(dt.id) === presetId);
                    setSelectedDiscountType(found || null);
                    setDiscountType(null);
                    setDiscountValue("");
                  }
                }}
                className="px-2 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: COLORS.borderGray, minWidth: "80px" }}
                data-testid="discount-type-select"
              >
                <option value="">None</option>
                <option value="percent">%</option>
                <option value="flat">₹</option>
                {/* BUG-056: Preset discount categories (always percentage) */}
                {Array.isArray(discountTypes) && discountTypes.length > 0 && (
                  <optgroup label="Presets">
                    {discountTypes.map((dt) => (
                      <option key={dt.id} value={`preset_${dt.id}`}>
                        {dt.name} — {dt.discountPercent}%
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {/* Manual input — shown only for manual % or ₹, hidden for preset */}
              {discountType && !selectedDiscountType && (
                <input
                  type="number"
                  placeholder={discountType === 'percent' ? "%" : "₹"}
                  value={discountValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (e.target.value === '' || e.target.value === '-') { setDiscountValue(''); return; }
                    if (val < 0) { setDiscountValue(''); return; }
                    if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
                    setDiscountValue(e.target.value);
                  }}
                  min="0"
                  max={discountType === 'percent' ? "100" : undefined}
                  className="w-20 px-2 py-1.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="discount-value-input"
                />
              )}
              {/* Show calculated amount for both manual and preset */}
              {(manualDiscount > 0 || presetDiscount > 0) && (
                <span className="text-sm font-medium self-center" style={{ color: COLORS.primaryGreen }}>
                  -₹{manualDiscount > 0 ? manualDiscount : presetDiscount}
                </span>
              )}
            </div>
          </div>
        </div>
```

**Visual result — dropdown content:**
```
┌──────────────────────────┐
│  ✓ None                  │
│    %                     │
│    ₹                     │
│  ── Presets ──           │
│    Staff Discount — 10%  │
│    Manager Disc — 20%    │
│    Member Disc — 15%     │
└──────────────────────────┘
```

**When "Staff Discount — 10%" selected:**
```
🏷️ Discount    [ Staff Discount — 10% ▼ ]   -₹45
```
- Input field is **hidden** (percentage is fixed from the category)
- Green `-₹45` shows the calculated amount

**When "%" selected (manual mode):**
```
🏷️ Discount    [ % ▼ ]  [ 5 ]   -₹22.50
```
- Input field **visible** — cashier types value
- Preset is cleared

---

## 3. Scope Summary

| Change | Bug | Status |
|---|---|---|
| `enabledPrimaryMethods` helper | BUG-080 | ✅ In scope |
| Smart default payment method | BUG-080 | ✅ In scope |
| Split init — one row per enabled method | BUG-080 | ✅ In scope |
| Split-by-Payment — fixed labels, no dropdown | BUG-080 | ✅ In scope |
| Row 1 buttons filter | BUG-080 | ✅ In scope |
| ~~Split-by-Station (Bar/Kitchen)~~ | ~~BUG-080~~ | ❌ OUT OF SCOPE (separate CR) |
| Preset categories in same discount dropdown | BUG-056 | ✅ In scope |

---

## 4. Approval Required

**A.** Approve all changes — proceed to implementation  
**B.** Approve with modifications  
**C.** Do not implement  

---

*— End of Revised Code Diff Preview —*
