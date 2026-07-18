# VAT Item-Level Tax Fix — Implementation Handover

> **Audience:** Next implementation agent (or human dev) picking this up cold.
> **Status:** Investigation complete + owner decisions locked. Implementation NOT started.
> **Scope:** Single file change. Item-level VAT only. Do not touch anything else.

---

## 0. TL;DR — what to do in 30 seconds

In `frontend/src/components/order-entry/CollectPaymentPanel.jsx` only, add a `vat` accumulator next to the existing `sgst` / `cgst` accumulators, fold it into the Grand Total, propagate it into the `paymentData` and `handlePrintBill` overrides, and render a separate "VAT" row in the Bill Summary when its value is > 0. **Five hunks. One file. ~15 lines net.** No backend change. No other file touched. No GST math touched. No SC / Tip / Delivery math touched.

If you're tempted to "while I'm here, also fix X" — **don't**. Scope is locked.

---

## 1. Background — why this work exists

MyGenie POS supports three tax cases per item:
1. GST (`item.tax.type === 'GST'`, percentage split into CGST + SGST halves)
2. VAT (`item.tax.type === 'VAT'`, percentage taken as a single VAT figure)
3. No tax (`item.tax.percentage === 0`)

**Bug observed in production:** VAT items collect short on the cashier "Collect Payment" screen. Customer is under-charged by the full VAT amount, the printed bill shows `vat_tax: 0`, and the BILL_PAYMENT payload is internally inconsistent (per-line `vat_amount` correct, order-level `vat_tax` = 0).

The full root-cause investigation is at:

> `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_MAPPING_GAP_INVESTIGATION.md`

**Read sections 1–10 of that report before touching code.** Especially §6 (precise broken locations), §10 (root cause classification), §11 (recommended fix plan), §12 (regression risks).

The gap is **entirely** inside `CollectPaymentPanel.jsx`. Everything upstream (Product API → cart → place-order payload → backend → fromAPI.orderItem) and everything downstream other than this panel (per-line `vat_amount` in food_detail, default-path print/temp-store payload) already handles VAT correctly. Don't re-investigate — this is already proven.

---

## 2. Owner Decisions (LOCKED — do not deviate)

### Decision 1 — VAT row UI
Render VAT as a **separate "VAT" row** in Bill Summary when item-level VAT amount > 0.
- DO NOT fold VAT into CGST / SGST.
- DO NOT collapse into a generic "Tax" row.
- Visibility gated on `taxTotals.vat > 0` (mirror the existing CGST/SGST gating).
- Label: `"VAT"` (no rate suffix in this iteration).

### Decision 2 — Service Charge / Tip / Delivery — STRICTLY NO CHANGE
- Service Charge tax logic: unchanged.
- Delivery Charge tax logic: unchanged.
- Tip tax logic: unchanged.
- GST applied on SC / Delivery / Tip: unchanged.
- Do not modify any CR-013 component GST rate code.
- This fix is **item-level VAT only**. If your edits go anywhere near SC / Tip / Delivery / `scGst` / `tipGst` / `deliveryGst` / `service_charge_tax` / `deliver_charge_gst` / `_cr013ComponentSum`, you are out of scope. Stop and re-read.

### Decision 3 — Backend interaction
- Frontend is the source of truth for `vat_tax` on the BILL_PAYMENT payload.
- Frontend MUST send a **calculated non-zero `vat_tax`** when VAT items exist.
- Frontend MUST send `vat_tax: 0` when no VAT items exist.
- Frontend MUST set `grand_amount` / `payment_amount` to include item-level VAT.
- Per-line `food_detail[i].vat_amount` already correct — leave it.
- DO NOT wait for backend changes. Backend already accepts non-zero `vat_tax` (place-order payload sends it today and works).

---

## 3. File touched (exactly one)

`frontend/src/components/order-entry/CollectPaymentPanel.jsx`

**Anything else you touch is a bug.** Tests, transforms, services, contexts, other components — all off-limits.

### Hard "DO NOT TOUCH" list (regression-critical)
- `frontend/src/api/transforms/orderTransform.js` — `buildCartItem`, `calcOrderTotals`, `collectBillExisting` food_detail row, `buildOrderTempStorePayload` default path, `fromAPI.orderItem`. All already VAT-correct.
- `frontend/src/api/transforms/productTransform.js` — VAT already mapped correctly.
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx` — inherits the fix automatically (reuses `CollectPaymentPanel`).
- `frontend/src/components/order-entry/OrderEntry.jsx` — collect-payment wiring, do not modify.
- Any backend / API / endpoint file.
- The existing GST `if`-branch inside `taxTotals` — must remain byte-identical (regression risk).
- The `rawFinalTotal` arithmetic structure — only ADD a `+ vat` term, do not reorganise the expression.
- Any SC / Tip / Delivery tax math (Owner Decision #2).
- The PayLater `payment_status: sucess` line in `collectBillExisting` (already shipped — do not revert).

---

## 4. Five hunks — exact locations + intent

Open `frontend/src/components/order-entry/CollectPaymentPanel.jsx` and apply these in order. Verify each line with `grep`/`view_file` before editing.

### Hunk 1 — `taxTotals` memo (~L204–L226)
**Add a VAT accumulator. Do not change the GST branch.**

Today (paraphrased):
```js
const taxTotals = useMemo(() => {
  let sgst = 0, cgst = 0;
  billableItems.forEach(item => {
    const tax = item.tax;
    if (!tax || tax.percentage === 0) return;
    const linePrice = getItemLinePrice(item);
    let taxAmt;
    if (tax.isInclusive) {
      taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
    } else {
      taxAmt = linePrice * (tax.percentage / 100);
    }
    if ((tax.type || 'GST').toUpperCase() === 'GST') {
      sgst += taxAmt / 2;
      cgst += taxAmt / 2;
    }
    // ← VAT items hit here and silently disappear
  });
  return {
    sgst: Math.round(sgst * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
  };
}, [billableItems]);
```

Expected shape after fix:
```js
let sgst = 0, cgst = 0, vat = 0;
...
if ((tax.type || 'GST').toUpperCase() === 'GST') {
  sgst += taxAmt / 2;
  cgst += taxAmt / 2;
} else if ((tax.type || '').toUpperCase() === 'VAT') {
  vat += taxAmt;
}
...
return {
  sgst: Math.round(sgst * 100) / 100,
  cgst: Math.round(cgst * 100) / 100,
  vat:  Math.round(vat  * 100) / 100,
};
```

Constraints:
- GST branch byte-identical.
- VAT branch uses **full** `taxAmt` (NOT halved — VAT does not split into CGST/SGST halves).
- Untaxed items (`percentage === 0`) keep short-circuiting at the existing early-return.
- Inclusive-VAT items: the existing `if (tax.isInclusive)` formula handles them; no special case needed.

### Hunk 2 — `rawFinalTotal` (~L451)
**Add `+ vat` to the Grand Total expression. Nothing else.**

Today:
```js
const rawFinalTotal = Math.round((subtotal + sgst + cgst) * 100) / 100;
```

After:
```js
const rawFinalTotal = Math.round((subtotal + sgst + cgst + vat) * 100) / 100;
```

You will need to destructure `vat` from `taxTotals` wherever `sgst` / `cgst` are destructured (search for `const { sgst, cgst } = taxTotals` or similar — pattern visible at the top of the component body).

Constraints:
- `subtotal` already includes SC + Tip + Delivery pre-tax (BUG-281). Do not alter it.
- Do not change the order of operands. Just append `+ vat`.

### Hunk 3 — `paymentData` build (~L549–L598)
**Replace two hardcoded zeros with the live `vat` value.**

Today:
```js
const paymentData = {
  ...
  vatAmount:    0,            // L561
  ...
  printVatTax:  0,            // L591
  ...
};
```

After:
```js
const paymentData = {
  ...
  vatAmount:    Math.round(vat * 100) / 100,
  ...
  printVatTax:  Math.round(vat * 100) / 100,
  ...
};
```

Downstream effects (free / automatic):
- `collectBillExisting` (`orderTransform.js` L1248) writes `vat_tax: vatAmount || 0` → BILL_PAYMENT now carries the right value.
- `finalTotal` was derived from `rawFinalTotal` (Hunk 2) → `payment_amount` / `grand_amount` are now VAT-inclusive.
- Per-line `food_detail[i].vat_amount` already correct (built by `collectBillExisting` from `item.tax.type`) — no change there.

### Hunk 4 — `handlePrintBill` override (~L630–L631)
**Replace the hardcoded VAT zero in the print override.**

Today:
```js
gstTax: Math.round((sgst + cgst) * 100) / 100,
vatTax: 0,                                     // VAT not aggregated in UI
```

After:
```js
gstTax: Math.round((sgst + cgst) * 100) / 100,
vatTax: Math.round(vat * 100) / 100,
```

Either delete the `// VAT not aggregated in UI` comment or replace it with a brief note pointing at this handover doc.

Downstream (free): `buildOrderTempStorePayload` (`orderTransform.js` L1583, L1693) already honours the override → manual Print Bill from Collect Payment screen now prints VAT correctly.

### Hunk 5 — VAT row in Bill Summary UI (~L1586–L1605 region)
**Add a new row mirroring the existing CGST / SGST rows.**

Today there are two rendered rows (paraphrased):
```jsx
{taxTotals.cgst > 0 && (
  <div data-testid="bill-tax-cgst-items"> ... CGST {amount} </div>
)}
{taxTotals.sgst > 0 && (
  <div data-testid="bill-tax-sgst-items"> ... SGST {amount} </div>
)}
```

Add directly after (do not reorder existing rows):
```jsx
{taxTotals.vat > 0 && (
  <div data-testid="bill-tax-vat-items"> ... VAT {amount} </div>
)}
```

Constraints:
- Use the **same row container / spacing / typography** as the CGST and SGST rows in the same file — copy the surrounding JSX structure exactly, only change the testid and label.
- `data-testid="bill-tax-vat-items"` (new, unique).
- Label: `"VAT"` (no rate suffix).
- Amount formatting: same `currencySymbol + value.toFixed(2)` (or whatever pattern the CGST/SGST rows use in this file — match it precisely).
- Do not modify the gating logic of the existing CGST / SGST rows.

---

## 5. Net behaviour after fix (acceptance contract)

| Order composition | Bill Summary rows | Grand Total | BILL_PAYMENT `gst_tax` | BILL_PAYMENT `vat_tax` | `payment_amount` | Print Bill |
|---|---|---|---|---|---|---|
| GST-only | CGST, SGST | subtotal + GST | non-zero | **0** | unchanged | unchanged |
| VAT-only | **VAT** only | subtotal + VAT | 0 | **non-zero** | **+VAT** | **shows VAT** |
| Mixed GST + VAT | CGST, SGST, **VAT** | subtotal + GST + VAT | non-zero | **non-zero** | **+VAT** | **shows both** |
| No-tax | none | subtotal only | 0 | 0 | unchanged | unchanged |
| VAT + SC ON / Tip / Delivery | VAT + SC GST behaviour unchanged | subtotal + VAT + GST-on-SC (as today) | as-today | **non-zero VAT** | correct | shows VAT, SC GST as today |

Owner Decision #2 is preserved: SC / Tip / Delivery and the GST applied on them stay byte-identical.

---

## 6. Verification protocol (run after implementation, before declaring done)

### 6.1 Lint
```
mcp_lint_javascript path_pattern="frontend/src/components/order-entry/CollectPaymentPanel.jsx"
```
Expect: `No issues found`.

### 6.2 Git diff sanity check
```
cd /app && git diff --stat frontend/src/components/order-entry/CollectPaymentPanel.jsx
```
Expect: 1 file changed, ≈ 8–18 lines added / ≈ 3 lines removed. **If any other file shows in the diff, revert it.**

### 6.3 Manual QA matrix
The app is already deployed at `https://insights-phase.preview.emergentagent.com/` (hot-reload). Run the following cases and verify Bill Summary UI + Network tab BILL_PAYMENT body + printed bill:

| # | Case | Expected |
|---|---|---|
| 1 | GST-only exclusive | regression: identical to today |
| 2 | GST-only inclusive | regression: identical |
| 3 | No-tax order | regression: identical |
| 4 | VAT-only exclusive | new "VAT" row visible; Grand Total +VAT; payload `vat_tax > 0`; `payment_amount` includes VAT; printed bill shows VAT |
| 5 | VAT-only inclusive | same as 4; verify no double-count (Subtotal already net of VAT) |
| 6 | Mixed GST + VAT | all three rows: CGST, SGST, VAT |
| 7 | Mixed GST + VAT + no-tax | same as 6, untaxed items contribute 0 |
| 8 | VAT-only + SC ON + Tip + Delivery | VAT row present, SC / Tip / Delivery GST behaviour byte-identical |
| 9 | VAT order with discount / coupon / loyalty / wallet | VAT computed on post-discount item totals (same convention as GST) |
| 10 | VAT order with rounding (round-off ON) | rounding applies on the new VAT-inclusive Grand Total |
| 11 | Hold-tab Collect Bill of a PayLater VAT order | inherits #4 / #6 behaviour via shared `CollectPaymentPanel` |
| 12 | Split Bill of VAT order | each share `payment_amount` proportional to VAT-inclusive total |
| 13 | Manual Print Bill from Collect Payment screen (VAT order) | printed `vat_tax` matches UI VAT row |
| 14 | Reprint from dashboard card (VAT order, no override) | regression: already correct, still correct |
| 15 | Place-order payload (VAT items) | regression: `vat_tax` non-zero, `order_amount` includes VAT — already correct |
| 16 | Update-order payload (VAT items) | regression: same |

For each case, verify three layers:
- Bill Summary UI (visual)
- Grand Total numeric (visual + match to expected)
- Network tab: BILL_PAYMENT body fields (`gst_tax`, `vat_tax`, `grant_amount`, `payment_amount`, per-line `gst_amount`, `vat_amount`)
- Printed bill (visual)

### 6.4 Regression sentinel (most important)
For any **GST-only order**, the new diff must produce **byte-identical** Bill Summary UI and BILL_PAYMENT body as before. If GST-only behaviour changes, the GST `if`-branch was inadvertently modified — revert and retry.

### 6.5 Optional — call `testing_agent_v3`
Only if owner explicitly asks for automated coverage. The owner has been doing manual validation in this thread, so default is **do not** call it; ship after manual QA.

---

## 7. What is intentionally NOT done in this change

| Item | Why |
|---|---|
| Touch any file other than `CollectPaymentPanel.jsx` | Scope locked; gap is in this one file only |
| VAT on Service Charge / Tip / Delivery | Owner Decision #2: strictly no change |
| Rate suffix on VAT row label ("VAT 5%") | Owner Decision #1: label is just "VAT" |
| Backend change | Owner Decision #3: frontend is source of truth |
| Adjust `food_detail[i].vat_amount` math | Already correct in `buildCartItem` and `collectBillExisting` |
| Adjust `calcOrderTotals` | Already correct — place-order payload already carries `vat_tax` |
| Adjust print/temp-store default path | Already correct — only the override path needed fixing (Hunk 4) |
| Refactor `taxTotals` to a switch statement or extract helper | Out of scope; minimum diff is the goal |
| Touch the PayLater `payment_status: sucess` line | Already shipped earlier in this thread |
| Run `testing_agent_v3` | Owner is on manual QA; only run if asked |

---

## 8. Files / commits / git rules

- Do **not** commit. The user uses the platform's "Save to GitHub" button. Just make the edits and leave the working tree dirty.
- Do **not** rebase, merge, cherry-pick, or branch-switch.
- Do **not** delete or modify `/app/.git` or `/app/.emergent`.
- Working tree currently has `frontend/yarn.lock` as untracked (from the earlier `yarn install` during deploy). Leave it alone.

---

## 9. References

- Investigation report (mandatory read for §1 background): `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_MAPPING_GAP_INVESTIGATION.md`
- Related earlier deliverable (PayLater status fix, already shipped): `frontend/src/api/transforms/orderTransform.js` L1130–L1330+ (`collectBillExisting`), specifically the `isPayLater ? 'sucess' : ...` line. **Do not revert.**
- Related earlier investigation (snooze, scope-unrelated to this fix): `/app/memory/change_requests/web_order_snooze_investigation/WEB_ORDER_SNOOZE_INVESTIGATION.md`
- Related earlier investigation (Hold-tab branch validation, scope-unrelated to this fix): `/app/memory/change_requests/on_hold_payment_branch_validation/ON_HOLD_PAYMENT_BRANCH_VALIDATION.md`

---

## 10. Sign-off prompts for the implementing agent

Before submitting your final response to the user, confirm:

- [ ] Only `frontend/src/components/order-entry/CollectPaymentPanel.jsx` is in the diff (`git diff --stat` confirms).
- [ ] GST-only orders are byte-identical in payload + UI vs pre-fix.
- [ ] VAT-only and Mixed orders show the new "VAT" row, correct Grand Total, correct BILL_PAYMENT `vat_tax`, correct `payment_amount`.
- [ ] SC / Tip / Delivery / GST-on-SC math untouched.
- [ ] PayLater `payment_status: sucess` line preserved.
- [ ] No lint errors in the touched file.
- [ ] No backend / endpoint / transform / service file modified.
- [ ] No commit / push / merge attempted.

If all eight check, reply to the user with: unified diff, screenshot of Bill Summary on a VAT order, network-tab capture of the BILL_PAYMENT body for a VAT order, summary of QA cases run, and a "Ready for your verification" footer.

— End of handover.
