# CR-100 — Smart Purchase: Split / Partial Payment
**Plan date:** 2026-08-08 | **Risk:** HIGH | **Status:** GATE 3 COMPLETE — AWAITING GATE 4 GO

---

## Backend Contract (Validated via Curl 2026-08-08)

```
POST /api/v2/vendoremployee/inventory/add-purchase
```

| Field | Type | Notes |
|---|---|---|
| `vendor_id` | string/int | existing |
| `purchase_date` | string `DD-MM-YYYY` | existing |
| `payment_type` | enum `"paid"\|"partial"\|"unpaid"` | **was incorrectly sending PM name (BUG-244 partial fix)** |
| `tot_amount` | number | existing (BUG-244) |
| `item_total` | number | existing (BUG-244) |
| `tot_fair` | number (0) | existing (BUG-244) |
| `tot_tax` | number (0) | existing (BUG-244) |
| `partial_payments` | `[{payment_mode, amount, transaction_id?}]` | **NEW** |
| `invoice_number` | string | existing, optional |
| `notes` | — | **DROPPED — ignored by endpoint (owner 2026-08-08)** |
| `paid_amount` | — | **NOT SENT — sum of splits = tot_amount (owner 2026-08-08)** |

**`purchase_items[]` fields unchanged:** `Ingredient, Unit, quantity, rate, Amount, batch, expiry_date, origin`

---

## Variable Flow (Panel → Transform → API)

```
SmartPurchasePanel state:
  pmByVendor: { [vid]: string }               ← BEFORE
  pmByVendor: { [vid]: { type, splits[] } }   ← AFTER CR-100

handleSubmit passes to inventoryService.addPurchase():
  BEFORE: { paymentMethod: "Cash", notes: "..." }
  AFTER:  { paymentType: "partial", splits: [{method, amount, refId}] }

inventoryTransform.addPurchase(data) emits:
  BEFORE: { payment_type: data.paymentMethod, notes: data.notes }
  AFTER:  { payment_type: data.paymentType, partial_payments: splits.map(...) }
```

**`onPmChange` prop in SmartPurchasePanel line 248 — NO CHANGE NEEDED:**
```js
onPmChange={(vid, pm) => setPmByVendor(prev => ({ ...prev, [vid]: pm }))}
// Same setter — only the pm value shape changes (string → object)
```

---

## Scope Lock

**WILL change (3 files):**
1. `src/api/transforms/inventoryTransform.js` — `addPurchase()` only (lines 168–197)
2. `src/components/inventory/SmartPurchasePanel.jsx` — `validate()` lines 166–169, `handleSubmit()` lines 183–201
3. `src/components/inventory/smart/GroupedVendorPreview.jsx` — full rewrite (62 lines)

**WILL NOT touch:**
- `inventoryService.js` — interface unchanged
- `AutoShoppingList.jsx`, `HorizonPicker.jsx`, `AppProviders.jsx`
- Any other transform, service, context, or component

---

## Edit 1 — `inventoryTransform.js` lines 168–197: Replace `addPurchase()`

**OLD:**
```js
// BUG-244: payment_method→payment_type, ...
addPurchase(data) {
  const items = data.items || [];
  const totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  return {
    vendor_name: data.vendorName || '',
    vendor_id: data.vendorId || null,
    purchase_date: data.purchaseDate,
    payment_type: data.paymentMethod || '',     // ← PM name (WRONG)
    invoice_number: data.invoiceNumber || '',
    notes: data.notes || '',                    // ← DROP
    tot_amount: totalAmount,
    item_total: totalAmount,
    tot_fair: 0,
    tot_tax: 0,
    purchase_items: items.map(item => ({ ... })),
  };
},
```

**NEW:**
```js
// BUG-244: payment_method→payment_type, +tot_amount/item_total/tot_fair/tot_tax
// CR-100: payment_type now enum, partial_payments[], notes dropped
addPurchase(data) {
  const items = data.items || [];
  const totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const splits = data.splits || [];
  return {
    vendor_name: data.vendorName || '',
    vendor_id: data.vendorId || null,
    purchase_date: data.purchaseDate,
    payment_type: data.paymentType || 'paid',   // CR-100: enum 'paid'|'partial'|'unpaid'
    invoice_number: data.invoiceNumber || '',
    // notes: dropped — ignored by this endpoint (CR-100, owner 2026-08-08)
    tot_amount: totalAmount,
    item_total: totalAmount,
    tot_fair: 0,
    tot_tax: 0,
    partial_payments: splits.map(s => ({        // CR-100
      payment_mode: s.method,
      amount: s.amount,
      ...(s.refId ? { transaction_id: s.refId } : {}),
    })),
    purchase_items: items.map(item => ({
      Ingredient: item.ingredientId,
      Unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      Amount: item.amount,
      batch: item.batch || '',
      expiry_date: item.expiry ? formatDateForAPI(item.expiry) : '',
      origin: item.origin || 'legacy',
    })),
  };
},
```

---

## Edit 2 — `SmartPurchasePanel.jsx` lines 166–169: Replace last 4 lines of `validate()`

**OLD (lines 166–169):**
```js
    // B1 · PM per vendor group
    const missingPm = Object.keys(groupedByVendor).find(vid => !pmByVendor[vid]);
    if (missingPm) return `Payment method required for ${vendorNamesById[missingPm] || 'vendor #' + missingPm}`;
    return null;
```

**NEW:**
```js
    // CR-100: validate split payment per vendor group
    for (const [vid, group] of Object.entries(groupedByVendor)) {
      const pm = pmByVendor[vid];
      const vName = vendorNamesById[vid] || `vendor #${vid}`;
      if (!pm?.type) return `Select a payment type for ${vName}`;
      if (pm.type !== 'unpaid') {
        if (!pm.splits?.length) return `Add at least one payment row for ${vName}`;
        if (pm.splits.some(s => !s.method)) return `Select a payment mode for all rows for ${vName}`;
        const subtotal = group.reduce((s, r) => s + (Number(r.qty || r.suggest_qty || 0) * Number(r.rate || 0)), 0);
        const splitTotal = pm.splits.reduce((s, sp) => s + Number(sp.amount || 0), 0);
        if (Math.abs(splitTotal - subtotal) > 0.01) return `Payment ₹${splitTotal.toFixed(2)} ≠ PO total ₹${subtotal.toFixed(2)} for ${vName}`;
      }
    }
    return null;
```

---

## Edit 3 — `SmartPurchasePanel.jsx` lines 183–201: Replace `addPurchase()` call args

**OLD (lines 183–201):**
```js
        await inventoryService.addPurchase({
          vendorName: vendorNamesById[vid] || '',
          vendorId: vid === 'null' ? null : (vid === 'system' ? null : vid),
          purchaseDate,
          paymentMethod: pmByVendor[vid],
          invoiceNumber: '',
          notes: `Stock Update · horizon ${horizonDays}d`,
          items: group.map(r => ({ ... })),
        });
```

**NEW:**
```js
        const pmData = pmByVendor[vid] || {};                          // CR-100
        await inventoryService.addPurchase({
          vendorName: vendorNamesById[vid] || '',
          vendorId: vid === 'null' ? null : (vid === 'system' ? null : vid),
          purchaseDate,
          paymentType: pmData.type || 'paid',                         // CR-100
          splits: pmData.splits || [],                                 // CR-100
          invoiceNumber: '',
          // notes: removed — ignored by endpoint (CR-100)
          items: group.map(r => ({
            ingredientId: r.ingredient_id,
            unit: r.unit,
            quantity: Number(r.qty ?? r.suggest_qty),
            rate: Number(r.rate),
            amount: Number(r.qty ?? r.suggest_qty) * Number(r.rate),
            conversionFactor: 1,
            batch: r.batch || '',
            expiry: r.expiry || '',
            origin: r.origin || 'planner',
          })),
        });
```

---

## Edit 4 — `GroupedVendorPreview.jsx`: Full rewrite

**UI per vendor card:**
- Item list + subtotal (unchanged)
- **3 payment-type buttons:** `Paid` (green) | `Partial` (amber) | `Unpaid` (red)
- **Paid:** 1 split row, amount auto-filled = subtotal, method dropdown + optional Ref ID
- **Partial:** N split rows (add/remove), each: method + amount + optional Ref ID. Live sum indicator goes green when splits = subtotal.
- **Unpaid:** Red notice showing outstanding amount. No split rows.

**Prop contract (no change to parent):**
```
pmByVendor[vid] shape changes:  string  →  { type: 'paid'|'partial'|'unpaid', splits: [{method, amount, refId}] }
onPmChange(vid, pmData)         same signature, pmData now object
```

---

## Verification Matrix

| # | What | How |
|---|---|---|
| V1 | Transform output shape | `toAPI.addPurchase({paymentType:'partial', splits:[{method:'Cash',amount:100,refId:''}]})` → output has `payment_type:'partial'`, `partial_payments:[{payment_mode:'Cash',amount:100}]`, no `notes` |
| V2 | Split sum mismatch blocks submit | Select Partial, set splits to ₹50+₹50 for a ₹200 PO → toast "Payment ₹100.00 ≠ PO total ₹200.00" |
| V3 | No payment type blocks submit | Don't click any type button → toast "Select a payment type" |
| V4 | No method in split blocks submit | Add split row but leave method blank → toast "Select a payment mode" |
| V5 | Valid partial submits correctly | Cash ₹100 + Card ₹100, total ₹200 → Network tab → `payment_type:"partial"`, `partial_payments:[{payment_mode:"Cash",amount:100},{payment_mode:"Card",amount:100}]` |
| V6 | Unpaid submits with empty splits | Unpaid → Network tab → `payment_type:"unpaid"`, `partial_payments:[]` |
| V7 | Paid (single) submits correctly | Paid, method=Cash → Network tab → `payment_type:"paid"`, `partial_payments:[{payment_mode:"Cash",amount:<subtotal>}]` |

---

## Post-Code Registry Checklist
- [ ] `registry.json`: CR-100 → `status: IMPLEMENTED`, `sprint_key: pos_5_0`
- [ ] `CR_REGISTRY.md`: row status updated
- [ ] `FILE_OWNERSHIP.md`: 3 files listed with CR-100 + 2026-08-08
- [ ] Code markers: `// CR-100` in every modified file
- [ ] Compile check: webpack 0 new errors/warnings
