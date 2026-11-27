# BUG-754 — INTAKE DOC
## Order Beta Tax Label Shows 'GST' Instead of 'VAT' When Both Tax Toggles Are OFF

```
ID:          BUG-754
Type:        BUG
Severity:    P3 — LOW
Risk:        LOW (display label only — no financial logic)
Sprint:      nov_cr_batch
Client:      ALL (corner-case config)
Assignee:    Abhishek (FE — not backend-blocked)
Area:        Reports — Order Beta
Status:      GATE_1_INTAKE
Source:      QA-FOUND (Session 4 Beanmeup code review — 2026-11-26)
Confidence:  CONFIRMED (code trace)
```

---

## 1. Description

The `taxLabel` formula in `OrderReportBetaPage.jsx` (L273) is:

```javascript
const taxLabel = restaurant?.tax?.gstStatus ? 'GST' : (restaurant?.tax?.vatStatus ? 'VAT' : 'GST');
// BUG-706: VAT vs GST label from profile
```

**Edge case:** When a restaurant has **both** `gstStatus = false` AND `vatStatus = false` (i.e. a VAT-type restaurant that has turned VAT off in settings), the formula falls through to the final `'GST'` default — showing **'GST'** as the Tax column header in Order Report Beta, even though this is a VAT restaurant.

**Current state:** Not affecting Beanmeup (RID 742) right now because `vatStatus = true`. But any VAT restaurant that temporarily disables VAT would see 'GST' in Order Beta.

---

## 2. Steps to Reproduce

1. Find (or configure) a VAT-type restaurant where **both** `restaurant.tax.gstStatus = false` AND `restaurant.tax.vatStatus = false`
2. Open Order Report Beta
3. Check the Tax column header
4. **Expected:** Shows 'VAT' (the restaurant's tax type)
5. **Actual:** Shows 'GST' (incorrect fallback)

---

## 3. Evidence

- Code at `frontend/src/pages/reports-module/OrderReportBetaPage.jsx` L273:
  ```javascript
  const taxLabel = restaurant?.tax?.gstStatus ? 'GST' : (restaurant?.tax?.vatStatus ? 'VAT' : 'GST');
  ```
- Same formula used at L511, L709, L893 — all inherit the same 'GST' fallback
- Discovered during code review in QA Session 4 (Beanmeup VAT testing)
- Code Reality: **FULL** — gap exists in current code at the lines above

---

## 4. Blast Radius

- File: `frontend/src/pages/reports-module/OrderReportBetaPage.jsx`
- Lines: L273 (formula), L511, L709, L893 (uses of `taxLabel`)
- Scope: SMALL (1 file, 1-line formula fix → 4 usages auto-updated)
- Hotspot: NO

---

## 5. Risk Classification

- **Risk: LOW**
- Trigger: Display label only — no calculation, no financial value, no API change
- Fast Lane eligible: **YES** — if owner approves: 1 file, ≤3 lines, no hotspot, no financial logic

---

## 6. Duplicate Check

- RELATED to **BUG-706** (VAT label mislabelled 'GST' in Order Beta — now GATE_5B_QA_PASSED 2026-11-26)
- BUG-706 fixed the label for the normal case; BUG-754 covers the edge case where `vatStatus = false`
- DISTINCT from BUG-706 (different condition — BUG-706 was `vatStatus=true` displaying 'GST'; BUG-754 is `vatStatus=false` falling through to 'GST')

---

## 7. Proposed Fix (Fast Lane eligible — owner approval needed)

```javascript
// Current (BUG-754 gap):
const taxLabel = restaurant?.tax?.gstStatus ? 'GST' : (restaurant?.tax?.vatStatus ? 'VAT' : 'GST');

// Proposed fix — use restaurant tax_type or vatStatus as primary discriminator:
const isVatRestaurant = restaurant?.tax?.vatStatus !== undefined
  ? restaurant.tax.vatStatus
  : (restaurant?.tax?.tax_type || '').toLowerCase() === 'vat';
const taxLabel = restaurant?.tax?.gstStatus ? 'GST' : (isVatRestaurant ? 'VAT' : 'GST');
```

**Owner decision needed:**
- OD-754-01: What is the correct fallback when both `gstStatus` and `vatStatus` are false? Options:
  - (a) Use `restaurant.tax.tax_type` field to determine (recommended — source of truth)
  - (b) Default to empty string `''` (no tax label shown when both off)
  - (c) Keep 'GST' as fallback (current behaviour — owner accepts the edge case)

---

## 8. Assignee Routing

Area = Reports (Order Beta) → not Printer Agent, not PMS, not backend-blocked → **Abhishek**

---

## Open Questions

- OD-754-01: Correct fallback when both GST and VAT are off? (a) tax_type field / (b) empty / (c) keep 'GST'?
