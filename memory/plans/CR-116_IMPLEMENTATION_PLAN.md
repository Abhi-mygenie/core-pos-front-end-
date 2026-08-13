# Implementation Plan — CR-116 (B2B Customer GST & Name Capture)

**ID:** CR-116
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** 2 (Independent)
**Risk:** MEDIUM
**Files:** 2 | **Lines changed:** ~50

---

## Step 0 — Starting Code State

**File 1:** `src/components/order-entry/CollectPaymentPanel.jsx`
- Customer fields at L376-377: `tabName`, `tabPhone` state
- No `custGST` or `custGSTName` state exists

**File 2:** `src/api/transforms/orderTransform.js`
- L2067-2068: `custGSTName: ''`, `custGST: ''` — hardcoded empty

---

## Edits

### Edit 1 — Add custGST + custGSTName state to CollectPaymentPanel
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**After L377** (`tabPhone` state), add:
```js
  const [custGST, setCustGST] = useState("");
  const [custGSTName, setCustGSTName] = useState("");
```

### Edit 2 — Add input fields for custGST + custGSTName in the payment panel
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Location:** Near customer info section (after tab customer fields, around L2998 area). Add:
```jsx
{/* CR-116: B2B Customer GST */}
<div className="grid grid-cols-2 gap-2 mt-2">
  <div>
    <label className="text-[10px] text-slate-500 font-medium">GST Number</label>
    <Input value={custGST} onChange={e => setCustGST(e.target.value)}
      placeholder="e.g. 22AAAAA0000A1Z5" className="h-8 text-xs"
      data-testid="collect-bill-cust-gst" />
  </div>
  <div>
    <label className="text-[10px] text-slate-500 font-medium">GST Registered Name</label>
    <Input value={custGSTName} onChange={e => setCustGSTName(e.target.value)}
      placeholder="Business name" className="h-8 text-xs"
      data-testid="collect-bill-cust-gst-name" />
  </div>
</div>
```

### Edit 3 — Pass custGST/custGSTName as overrides to print payload builder
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Location:** Where `buildBillPrintPayload` is called (in handleSettle/handlePrint). Add to overrides object:
```js
custGST,
custGSTName,
```

### Edit 4 — Wire custGST/custGSTName in print payload from overrides
**File:** `src/api/transforms/orderTransform.js`
**L2067-2068** change from:
```js
      custGSTName: '',
      custGST: '',
```
To:
```js
      custGSTName: overrides.custGSTName || '',
      custGST: overrides.custGST || '',
```

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Code: custGST state exists in CollectPaymentPanel | grep | present |
| V2 | Code: input field with data-testid="collect-bill-cust-gst" | grep | present |
| V3 | Code: overrides.custGST in print payload | grep | present |
| V4 | Compile: webpack | log | compiled successfully |
| V5 | Runtime: Open collect bill, see GST fields | Playwright | inputs visible |
| V6 | Runtime: Fill GST + settle → check print payload | Playwright | custGST + custGSTName in payload |

## Rollback
Remove state, inputs, and override wiring. Revert L2067-2068 to hardcoded empty.
