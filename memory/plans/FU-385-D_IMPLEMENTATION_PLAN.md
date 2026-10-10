# FU-385-D — Implementation Plan (Gate 3)
## Split Button Re-enabled in Folio Checkout (D88 Reversal)

**Date:** 2026-10-09
**Risk:** LOW
**Impact Analysis:** `impact/FU-385-D_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/frontdesk.css` — 2 lines removed (L32-33)
- `src/tests/cr385/hideSectionRows.cr385.test.js` — L8 TOGGLES + L25-27 assertion flipped

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5)
- `FolioCheckoutPanel.jsx`
- Any other file

---

## Edits

### E1 — `frontdesk.css` L32-33: remove D88 hide rule

**Current L32-33:**
```css
/* CR-385 D88 / Phase 4.5b — Split tile hidden ONLY inside the Front Desk bill (Split → FU-385-D); /dashboard keeps it. */
.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }
```

**New:** *(both lines deleted)*

---

### E2 — `hideSectionRows.cr385.test.js` L8: remove `'payment-split-btn'` from TOGGLES

**Current L8:**
```js
const TOGGLES = ['checkout-room-booking-toggle', 'checkout-transferred-toggle', 'checkout-room-service-toggle', 'tab-customer-section', 'payment-split-btn']; // + BUG-448 / OD-385-21 + D88 split
```

**New L8:**
```js
const TOGGLES = ['checkout-room-booking-toggle', 'checkout-transferred-toggle', 'checkout-room-service-toggle', 'tab-customer-section']; // + BUG-448 / OD-385-21 · FU-385-D: payment-split-btn removed (D88 reversed)
```

---

### E3 — `hideSectionRows.cr385.test.js` L25-27: flip D88 assertion → reverse regression guard

**Current L25-27:**
```js
    // D88 / Phase 4.5b: Split hidden only under .frontdesk-bill — the only rule that mentions the split testid is the scoped one
    const splitLines = css.split('\n').filter((l) => l.includes('payment-split-btn'));
    expect(splitLines).toEqual(['.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }']);
```

**New L25-27:**
```js
    // FU-385-D: D88 reversed — assert Split is NO LONGER hidden (regression guard: if rule re-added, test fails loudly)
    const splitLines = css.split('\n').filter((l) => l.includes('payment-split-btn'));
    expect(splitLines).toHaveLength(0); // FU-385-D: no hide rule for Split in frontdesk.css
```

---

## Execution Order

E1 → E2 → E3 (different files — can run in parallel)

---

## Verification Matrix

| Edit | File | How to verify | Automated? |
|---|---|---|:---:|
| E1 | frontdesk.css | `grep -c "payment-split-btn" frontdesk.css` → 0 | YES |
| E2 | hideSectionRows test | `grep "payment-split-btn" hideSectionRows.cr385.test.js` → only in comment | YES |
| E3 | hideSectionRows test | `grep "toHaveLength(0)" hideSectionRows.cr385.test.js` | YES |
| V1 | Browser: Split visible in Folio | Open Folio → PAYMENT METHOD → Split btn present in row 2 | NO |
| V2 | Browser: Dashboard unaffected | Dashboard CPP → Split still shows | NO |
| V3 | Test suite | `npx craco test --watchAll=false --testPathPattern=hideSectionRows` → PASS | YES |
| V4 | Compile | webpack 0 new warnings | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: FU-385-D → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
□ 2. CR_REGISTRY.md: FU-385-D row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: frontdesk.css + hideSectionRows.cr385.test.js → FU-385-D, 2026-10-09
□ 4. Code markers: // FU-385-D in test edits ✓ (in plan above)
□ 5. Compile check: webpack 0 new warnings
```
