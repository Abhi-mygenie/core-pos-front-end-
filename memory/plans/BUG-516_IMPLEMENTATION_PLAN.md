# BUG-516 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-516
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 3)
**Risk:** MEDIUM (display label, no financial formula)
**ODs:** None
**Awaiting:** Gate 4 GO before any code change

---

## Scope Lock

**Files WILL change:**
- `src/api/transforms/folioTransform.js` — E-516-1 (add `taxType` field to roomOrders items)
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — E-516-2 (use `taxType` in label)

**Files will NOT touch:** `pmsService.js` · `frontDeskService.js` · any other file

---

## Conflict Pre-Check

| File | Last modifier | Date | Open items | Conflict? |
|---|---|---|---|---|
| `folioTransform.js` | BUG-430 (L115-120) | 2026-09-16 | None | NONE |
| `FolioCheckoutPanel.jsx` | BUG-498/499 (2026-10-06) | 2026-10-06 | BUG-517/518/519 (planned after) | NONE — this edit is at L193 (room orders label); parallel-safe with 517/518/519 |

**Execution order note:** BUG-516's `FolioCheckoutPanel.jsx` edit (L193) is in `Statement` component body. BUG-519 restructures `Statement` signature but leaves the room orders label rendering intact. BUG-516 must be applied BEFORE BUG-519 to keep the changes clean.

---

## Code Reality: PARTIAL

`gstPercent` field exists and is used in the label. `taxType` field missing — `folioTransform` doesn't capture `fd.tax_type`. Hardcoded "GST" in FolioCheckoutPanel.

---

## Entry Verification (MANDATORY before coding)

```bash
# E-516-1 anchor
grep -n "gstPercent:  gstPct" /app/frontend/src/api/transforms/folioTransform.js
# Must: line 135  exact: gstPercent:  gstPct,

# E-516-2 anchor
grep -n "gstPercent ? \`.*GST" /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 193  contains: · GST ${o.gstPercent}%
```

---

## Edit E-516-1 — `folioTransform.js` L135: add `taxType` to roomOrder return object

**File:** `src/api/transforms/folioTransform.js`
**Line:** 135 (after `gstPercent:  gstPct,`)

**Current:**
```js
          gstPercent:  gstPct,
          gstAmount:   gstAmt,
```

**New:**
```js
          gstPercent:  gstPct,
          taxType:     (fd.tax_type || 'GST').toUpperCase(), // BUG-516: VAT vs GST label
          gstAmount:   gstAmt,
```

---

## Edit E-516-2 — `FolioCheckoutPanel.jsx` L193: use `taxType` in room orders label

**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
**Line:** 193

**Current:**
```jsx
        : orders.map((o, i) => <Line key={i} label={`${o.name} × ${o.qty}${o.gstPercent ? ` · GST ${o.gstPercent}%` : ''}`} value={fmtINR(o.totalAmount)} testId={`bill-orders-${i}`} />)}
```

**New:**
```jsx
        : orders.map((o, i) => <Line key={i} label={`${o.name} × ${o.qty}${o.gstPercent ? ` · ${o.taxType === 'VAT' ? 'VAT' : 'GST'} ${o.gstPercent}%` : ''}`} value={fmtINR(o.totalAmount)} testId={`bill-orders-${i}`} />)}{/* BUG-516 */}
```

---

## Verification Matrix

| # | Edit | Verification | Auto? |
|---|---|---|---|
| V-1 | E-516-1 taxType field | `grep -n "taxType:.*tax_type.*BUG-516" folioTransform.js` | YES |
| V-2 | E-516-2 label | `grep -n "taxType === 'VAT'" FolioCheckoutPanel.jsx` | YES |
| V-3 | compile | webpack 0 new warnings | YES |
| V-4 | VAT item label | Browser: Bill → Room orders → "vat test × 1 · **VAT** 22%" | NO |
| V-5 | GST item unchanged | Browser: "gst test × 1 · **GST** 5%" still shows GST | NO |
| V-6 | no taxType on item | Browser: item with no tax rate → no label suffix (same as before) | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-516 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-516 row updated
- [ ] FILE_OWNERSHIP.md: folioTransform.js + FolioCheckoutPanel.jsx — BUG-516, date
- [ ] Code markers: // BUG-516 on every modified line
- [ ] COMPILE CHECK: webpack 0 new warnings
```
