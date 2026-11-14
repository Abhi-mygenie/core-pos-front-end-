# BUG-429 — Room Orders GST Under-Counted in Folio and In-House (BUG-426/427 Implementation Gap)

**ID:** BUG-429
**Date:** 2026-09-16
**Source:** AGENT-DISCOVERED — Investigation following BUG-426/427 implementation. Owner confirmed gap via screenshot comparison.
**Confidence:** CONFIRMED (code-traced + screenshot evidence)

---

## Description

BUG-426 (pmsService.js) and BUG-427 (folioTransform.js) were implemented to include room-native food orders in the In-House balance and Folio Total Balance Due respectively. Both implementations compute the GST on room orders **incorrectly** — they under-count GST compared to what the checkout (CollectPaymentPanel/orderTransform.js) computes.

**Observed gap (test gst, order #000069):**

| Surface | Room Orders shown | Expected (checkout reference) | Gap |
|---------|-------------------|-------------------------------|-----|
| Folio (BUG-427) | ₹238 | ₹256 | **−₹18** |
| In-House (BUG-426) | ~₹239.4 | ₹256 | **~−₹17** |
| Total Balance Due (Folio) | ~₹1,929 | ₹1,947 | **~−₹18** |
| In-House balance | ₹1,930.4 | ₹1,947 | **−₹16.6** |

Room balance (₹950) and transferred F&B (₹741) are **correct** in both fixes. Only room orders GST is wrong.

---

## Root Cause (Two Gaps)

### Gap 1 — `gst_tax_amount` / `tax_amount` pre-computed field ignored (PRIMARY)

`orderTransform.js` L1907 (used by checkout):
```js
let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
```
The backend stores the **actual computed GST** per line item in `gst_tax_amount` or `tax_amount` at order time (via slab logic). If present, this is the authoritative value.

Our BUG-426 (`pmsService.js`) and BUG-427 (`folioTransform.js`) **never read this field**. We always recompute from `food_details.tax %` — which is the catalog rate and may differ from the slab-applied rate stored at order time.

### Gap 2 — `tax_calc = 'Inclusive'` not handled

`orderTransform.js` L1911-1914:
```js
const isInclusive = (item.food_details.tax_calc || '').toLowerCase() === 'inclusive';
taxAmt = isInclusive
  ? lineTotal * taxPct / (100 + taxPct)   // extract from inclusive price
  : lineTotal * taxPct / 100;             // add on top
```

Our BUG-426/427 always apply `amt * taxPct / 100` — treating every item as GST-exclusive. For inclusive-priced items, this double-adds GST onto a price that already contains it.

---

## Classification

- **Type:** BUG (implementation gap in BUG-426 and BUG-427)
- **Severity:** P1 — HIGH (financial display; Total Balance Due and In-House balance both wrong by ~₹18 on test guest)
- **Risk:** CRITICAL (same financial calculations that drive what staff charges guest at checkout)
- **Duplicate check:** RELATED to BUG-426 (GATE_5A_IMPLEMENTED) and BUG-427 (GATE_5A_IMPLEMENTED) — this is a correction of their GST logic, not a duplicate
- **Fast Lane:** NOT eligible (CRITICAL financial, 2 files)

---

## Evidence

- Screenshot (owner, 2026-09-16): Folio shows Room Orders Total ₹238, Checkout shows ROOM ORDERS ₹256
- Screenshot (owner, 2026-09-16): In-House shows test gst balance ₹1,930.4, Checkout Grand Total ₹1,947
- Code: `folioTransform.js` — zero mentions of `gst_tax_amount`, `tax_amount`, `tax_calc`, `inclusive`
- Code: `pmsService.js` — zero mentions of same fields
- Reference: `orderTransform.js` L1907-1914 — correct 3-step pattern
- Source: AGENT-DISCOVERED + OWNER-CONFIRMED | Confidence: CONFIRMED

---

## Blast Radius

- `src/api/transforms/folioTransform.js` — L116-117: gstPct/gstAmt computation (~3 lines, match orderTransform pattern)
- `src/api/services/pmsService.js` — L126-129: roomOrdersTotal GST block (~3 lines, same fix)
- `src/pages/pms/GuestFolioPage.jsx` — **NO CHANGE** (reads `r.totalAmount` from folioTransform; auto-corrects when transform is fixed)
- `src/pages/pms/InHouseGuestsPage.jsx` — **NO CHANGE** (reads `row.balance` from pmsService; auto-corrects when service is fixed)
- Estimated scope: SMALL (2 files, ~6 lines total)
- Hotspot: NONE

---

## Fix Pattern (from orderTransform.js reference)

Both `folioTransform.js` and `pmsService.js` should replace their current simple GST computation with:

```js
// Step 1: use pre-computed field if available (slab-applied authoritative GST)
let gstAmt = parseFloat(d.gst_tax_amount || d.tax_amount || 0);

// Step 2: only recompute from % if pre-computed field absent
if (!gstAmt) {
  const taxPct = parseFloat(fd.tax) || 0;
  if (taxPct > 0) {
    const isInclusive = (fd.tax_calc || '').toLowerCase() === 'inclusive';
    gstAmt = isInclusive
      ? amt * taxPct / (100 + taxPct)   // extract from inclusive price
      : amt * taxPct / 100;             // add on top
  }
}
```

---

## Owner Decisions

| ID | Question | Answer |
|----|----------|--------|
| OD-429-01 | Use `gst_tax_amount || tax_amount` as primary GST source (same as orderTransform.js)? | Pending Gate 2 |
| OD-429-02 | Handle `tax_calc = 'inclusive'` in fallback path? | Pending Gate 2 |

---

## Next

Gate 2 — Impact Analysis
