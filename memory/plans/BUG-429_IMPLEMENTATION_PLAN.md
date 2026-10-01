# BUG-429 — Implementation Plan (Gate 3)

**ID:** BUG-429  
**Date:** 2026-09-16  
**Risk:** CRITICAL (financial — room orders GST)  
**Gate 4 GO required before coding**

---

## Scope Lock

**Files WILL change:**
1. `src/api/transforms/folioTransform.js` (L116-117)
2. `src/api/services/pmsService.js` (L126-129)

**Files will NOT touch:**
- `GuestFolioPage.jsx` (auto-corrects via folioTransform)
- `InHouseGuestsPage.jsx` (auto-corrects via pmsService)
- `CollectPaymentPanel.jsx` (R5 hotspot — not needed)
- `orderTransform.js` (reference only — not changed)

**⚠ Must implement BEFORE Gate 5b QA of BUG-426 and BUG-427.**

---

## Edit 1 — `src/api/transforms/folioTransform.js`

### Target: L116-117 (current 2-line GST compute inside `.map(d => {...})`)

**Current (L116-117):**
```js
        const gstPct = parseFloat(fd.tax)  || 0;
        const gstAmt = Math.round(amt * gstPct / 100 * 100) / 100;
```

**New (replace with 3-step pattern matching orderTransform.js):**
```js
        // BUG-429: match orderTransform GST logic — pre-computed field first, then fallback
        const gstPct = parseFloat(fd.tax) || 0; // kept for gstPercent display field
        let gstAmt   = Math.round(parseFloat(d.gst_tax_amount || d.tax_amount || 0) * 100) / 100;
        if (!gstAmt && gstPct > 0) {
          const isInclusive = (fd.tax_calc || '').toLowerCase() === 'inclusive';
          gstAmt = isInclusive
            ? Math.round(amt * gstPct / (100 + gstPct) * 100) / 100
            : Math.round(amt * gstPct / 100 * 100) / 100;
        }
```

**Note:** `gstPct` is retained (unchanged) because the existing return object uses it for the `gstPercent` display field (L123). `gstAmt` is now correctly computed — `totalAmount`, `sgst`, `cgst` all cascade correctly since they reference `gstAmt`.

---

## Edit 2 — `src/api/services/pmsService.js`

### Target: L126-129 (current GST block inside `roomOrdersTotal` reduce)

**Current (L126-129):**
```js
            if (!roomGstApplicable) return s + amt;
            const gstPct = parseFloat(d.food_details?.tax ?? 0);
            const gstAmt = Math.round(amt * gstPct / 100 * 100) / 100;
            return s + amt + gstAmt;
```

**New (replace with 3-step pattern matching orderTransform.js):**
```js
            if (!roomGstApplicable) return s + amt;
            // BUG-429: match orderTransform GST logic — pre-computed field first, then fallback
            const fd2 = d.food_details || {};
            let gstAmt = Math.round(parseFloat(d.gst_tax_amount || d.tax_amount || 0) * 100) / 100;
            if (!gstAmt) {
              const gstPct = parseFloat(fd2.tax ?? 0);
              if (gstPct > 0) {
                const isInclusive = (fd2.tax_calc || '').toLowerCase() === 'inclusive';
                gstAmt = isInclusive
                  ? Math.round(amt * gstPct / (100 + gstPct) * 100) / 100
                  : Math.round(amt * gstPct / 100 * 100) / 100;
              }
            }
            return s + amt + gstAmt;
```

**Note:** Variable named `fd2` to avoid collision with outer scope. The `roomGstApplicable` guard (early return) remains untouched as the first line.

---

## Verification Matrix

| # | Edit | File | How to Verify | Manual/Auto |
|---|------|------|---------------|:---:|
| V1 | `gstPct` kept for display, `gstAmt` now `let` | `folioTransform.js` L116 | Read — `const gstPct` unchanged, `let gstAmt` starts with pre-computed read | Manual |
| V2 | `gst_tax_amount \|\| tax_amount` read first | `folioTransform.js` | Read — `parseFloat(d.gst_tax_amount \|\| d.tax_amount \|\| 0)` present | Manual |
| V3 | Inclusive branch present in folioTransform | Same | Read — `(fd.tax_calc \|\| '').toLowerCase() === 'inclusive'` | Manual |
| V4 | `totalAmount`, `sgst`, `cgst` auto-cascade from corrected `gstAmt` | `folioTransform.js` L125-127 | Read — unchanged, reference `gstAmt` | Manual |
| V5 | `roomGstApplicable` early-return intact | `pmsService.js` | Read — first line of replace block | Manual |
| V6 | `gst_tax_amount \|\| tax_amount` read first in pmsService | Same | Read — `parseFloat(d.gst_tax_amount \|\| d.tax_amount \|\| 0)` present | Manual |
| V7 | Inclusive branch present in pmsService | Same | Read — `(fd2.tax_calc \|\| '').toLowerCase() === 'inclusive'` | Manual |
| V8 | webpack 0 new warnings | Terminal | yarn start log | Manual |
| V9 | Folio: Room Orders tile = ₹256 (was ₹238) | Browser | folio for test gst | Manual |
| V10 | Folio: Total Balance Due = ₹1,947 (was ₹1,929) | Browser | Same folio | Manual |
| V11 | In-House: test gst balance = ₹1,947 (was ₹1,930.4) | Browser | In-House Guests page | Manual |
| V12 | roomGstApplicable=false: no GST added (early return still fires) | Code | Read guard at first line of replace | Manual |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-429 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
- [ ] BUG_TRACKER.md: BUG-429 row updated
- [ ] FILE_OWNERSHIP.md: folioTransform.js + pmsService.js listed under BUG-429
- [ ] Code markers: // BUG-429 in every modified section
- [ ] Compile: webpack 0 new warnings
```

---

## Execution Sequence

1. Edit `folioTransform.js` (Edit 1)
2. Edit `pmsService.js` (Edit 2)
3. Verify webpack compiles
4. Self-test V1-V12
5. EXIT GATE
6. Write combined QA handover (BUG-426 + BUG-427 + BUG-429)

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `gst_tax_amount` field absent for all items (backend not sending it) | MEDIUM | Falls through to existing `food_details.tax %` path — no regression, same as before BUG-429 |
| `tax_calc` absent or empty string | LOW | `(fd.tax_calc \|\| '').toLowerCase()` defaults to `''` → exclusive branch → same as before |
| `gstPct` now `const` but `gstAmt` is `let` — lint warning | LOW | Pattern matches orderTransform.js exactly; compile already clean |
| `fd2` name collision in pmsService reduce | NONE | Scoped inside `reduce` callback; no outer `fd2` |
| BUG-426 `roomGstApplicable=false` path broken | NONE | Guard `if (!roomGstApplicable) return s + amt` is the FIRST line — unchanged and fires before any GST logic |
