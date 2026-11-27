# BUG-516 — INTAKE DOC

**ID:** BUG-516
**Date:** 2026-10-08
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent (owner-reported via investigation session)
**Source:** OWNER-REPORTED — screenshot at `/pms/front-desk-v2?tab=departures`, Bill button
**Confidence:** CONFIRMED (code-traced end-to-end)

---

## Title

Room orders list in FolioCheckoutPanel shows "GST 22%" label for VAT-taxed items — `folioTransform` does not capture `food_details.tax_type`, so "GST" is hardcoded in the label regardless of actual tax type

---

## Description

In the Bill panel (FolioCheckoutPanel), the **Room orders** section lists food items ordered at the room. Each item label reads: `"<name> × <qty> · GST <rate>%"`. When an item's tax type is VAT (not GST), the label still shows "GST 22%" instead of "VAT 22%".

### Observed (from screenshot)
```
ROOM ORDERS
vat test × 1 · GST 22%   ₹122   ← WRONG: should be "VAT 22%"
gst test × 1 · GST 5%    ₹105   ← CORRECT
```

### Expected
```
ROOM ORDERS
vat test × 1 · VAT 22%   ₹122   ← correct tax type label
gst test × 1 · GST 5%    ₹105
```

---

## Code Reality

**PARTIAL** — the label-rendering code exists and is active; the tax type is available from the backend (`food_details.tax_type`) but is not captured in `folioTransform`.

### Break point 1 — `folioTransform.js` L121, L135

```js
// L121: only reads tax rate, ignores tax_type
const gstPct = parseFloat(fd.tax) || 0;

// L135: returned object has no taxType field
return {
    gstPercent: gstPct,   // always "gst" regardless of VAT/GST
    // taxType: missing   ← NOT captured
};
```

`orderTransform.js` L1904 correctly reads `item.food_details?.tax_type` and handles `'VAT'` separately — the field exists in the API response. `folioTransform.js` does not.

### Break point 2 — `FolioCheckoutPanel.jsx` L193

```jsx
label={`${o.name} × ${o.qty}${o.gstPercent ? ` · GST ${o.gstPercent}%` : ''}`}
//                                               ^^^
//                              hardcoded "GST" — no taxType check
```

---

## Duplicate Check

| ID | Relation | Status |
|---|---|---|
| BUG-054 | VAT not recalculating after discount | CLOSED — different flow (order entry) |
| BUG-271 | GST/VAT wrong on print | QA PASS — different flow (print path) |
| BUG-117 | Audit side-sheet GST negative on VAT orders | CLOSED — different component |
| **BUG-516** | **DISTINCT** — folio checkout room orders label in FolioCheckoutPanel | NEW |

---

## Severity & Risk

- **Severity: P2 — MEDIUM**
  - Wrong display label ("GST" instead of "VAT") on room orders in checkout bill
  - Does NOT affect financial amounts — tax amounts are correctly computed
  - Staff using the Bill panel see incorrect tax type label
  - Workaround: staff know from context which items are VAT
- **Risk: MEDIUM** (display label mismatch — no financial formula change needed)
- **Fast Lane: NO** — owner declined all fast lane approvals this session

---

## Evidence

- Screenshot: provided by owner (see investigation report `INV-CHECKOUT-PHASE-2026-10-08.md`)
- Steps to reproduce:
  1. Navigate to `/pms/front-desk-v2?tab=departures` (or `?tab=inhouse`)
  2. Click Bill button on a room that has VAT-taxed food items ordered
  3. Observe ROOM ORDERS section — VAT item shows "GST 22%" not "VAT 22%"
- Curl output: not applicable (FE transform issue, no API response mismatch)
- Source: OWNER-REPORTED + AGENT-CONFIRMED via code trace
- Confidence: CONFIRMED

---

## Blast Radius

```bash
grep -rn "gstPercent\|taxType" /app/frontend/src/ --include="*.js" --include="*.jsx" | wc -l
# → 12 references, 2 files in active scope
```

- **Files WILL change (estimates):**
  - `src/api/transforms/folioTransform.js` — add `taxType` field
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — use `taxType` in label
- **Hotspot files touched:** NO (neither in R5 list)
- **Blast radius: SMALL** (2 files, ~3 lines, display-only)

---

## Open Owner Decisions

None — fix direction is clear. Tax type comes from `food_details.tax_type` (confirmed in `orderTransform.js` L1904). Label should show `VAT` when `taxType === 'VAT'`, else `GST`.

---

## Next

→ Gate 2 GO → PLANNING (Impact Analysis)

**Sprint:** oct_bug_batch
