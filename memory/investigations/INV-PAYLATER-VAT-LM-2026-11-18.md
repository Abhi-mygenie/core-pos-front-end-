# Investigation Report — 3 Issues (PayLater Methods · VAT Label · LM Preset)
**Role:** INVESTIGATION (Role 6) — read-only, no code written
**Date:** 2026-11-18
**Reporter:** Owner (hogwarts / woko)
**Steps used:** 9 / 10
**Confidence:** HIGH on all three

---

## 1. Summary

| # | Issue | Classification | Root Cause | Confidence |
|---|---|---|---|---|
| **I-1** | PayLater collect shows only Cash / UPI / Card | **CODE_ERROR** | `CollectBillPanelDrawer.jsx` L300 hardcodes `allowedMethods={['cash','card','upi']}` inherited from BUG-042-A (Audit Hold tab), now reused by CR-503 for OrderBeta PayLater | HIGH |
| **I-2** | VAT ₹17.6 labelled "GST" in Order Beta, correct "VAT" in CPP | **LABEL_ISSUE** | `OrderReportBetaPage.jsx` hardcodes `label: 'GST'` and `<th>GST</th>` with no VAT-type detection; CPP recalculates from cart so shows "VAT" correctly | HIGH |
| **I-3** | LM preset not persistent in Item Sales Ledger (woko) | **CODE_ERROR** | LM branch in `handlePreset` (L164 of `ItemSalesLedgerMockup.jsx`) early-returns BEFORE calling `setSharedFrom/setSharedTo` → shared context stays on today → navigating away+back resets dates | HIGH (data confirmed: 49 rows exist for Oct) |

---

## 2. Hypotheses Tested

### Issue 1 — Only 3 payment methods on PayLater collect

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | Restaurant (hogwarts) only has 3 payment types configured in profile | Live API probe (`/api/v1/vendoremployee/profile`) | INCONCLUSIVE — profile endpoint returned `{"errors":[...]}` (token expired mid-session); cannot confirm API payment types | Probe step 4 |
| H2 | `CollectBillPanelDrawer` passes `allowedMethods` that restricts Row 2 | Code trace: `CollectBillPanelDrawer.jsx` L300 | **CONFIRMED** — `allowedMethods={['cash', 'card', 'upi']}` hardcoded | `CollectBillPanelDrawer.jsx` L300 |
| H3 | `isHoldContext` in CPP gates Row 2 render | Code trace: CPP L499–502, L2942 | **CONFIRMED** — `isHoldContext = Array.isArray(allowedMethods) && allowedMethods.length > 0`; Row 2 hidden when true | CPP L500, L2942 |

**BREAK POINT confirmed:**
```
OrderReportBetaPage.jsx (L919-926)
  → CollectBillPanelDrawer (props: no allowedMethods from parent)
  → CollectBillPanelDrawer.jsx L300: allowedMethods={['cash', 'card', 'upi']}  ← HARDCODED
  → CollectPaymentPanel.jsx L502: isHoldContext = true
  → CollectPaymentPanel.jsx L2942: {!isHoldContext && (<Row 2…/>)} HIDDEN
```

Row 2 contains: **Split**, **Credit/TAB**, **To Room**, **Dynamic types** (Zomato Gold, Dineout, etc.)
Row 1 contains: Cash, UPI, Card → the only 3 visible in screenshot.

**Root cause text:**
> `BUG-042-A` (Feb-2026) added `allowedMethods={['cash','card','upi']}` to `CollectBillPanelDrawer` to restrict payment methods on the Audit Report → Hold tab Collect Bill flow — a deliberate owner-locked decision. `CR-503` (2026-11-16) reused the same `CollectBillPanelDrawer` to open collect-bill from OrderReportBeta PayLater rows **without removing or conditionalising the `allowedMethods` prop**. The restriction is now incorrectly inherited by all OrderBeta PayLater collections, hiding Split, Credit/TAB, To Room, and all dynamic payment types.

---

### Issue 2 — VAT ₹17.6 labelled "GST" in Order Beta

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | CPP shows "VAT" correctly | Code trace: CPP L2787–2790 | **CONFIRMED** — `{vat > 0 && <span>VAT</span>}` renders when prorated vat > 0 | CPP L2787-2790 |
| H2 | OrderBeta always hardcodes "GST" column | Code trace: `OrderReportBetaPage.jsx` L501, L699, L881 | **CONFIRMED** — no VAT/tax-type detection exists in OrderBeta | L501, L699, L739, L881 |
| H3 | Backend sends VAT in `gst_amount` field | Code trace: OrderBeta transform L474 | **CONFIRMED** — `gst: o.gst_amount || 0` — same field for all tax types; backend places VAT amount in `gst_amount` | L474 |
| H4 | `profileTransform` exposes `taxType` for VAT detection | Code trace: `profileTransform.js` | **NOT PRESENT** — only `restaurant.tax.gstStatus: api.gst_status === true`; no `taxType` / `isVat` field mapped | L186-187 |

**BREAK POINT confirmed:**
```
CPP — recalculates from cart items:
  taxTotals() L313-347: taxType === 'VAT' → vat bucket (not SGST/CGST)
  Render L2787-2790: {vat > 0 && <span>VAT</span>}  ✅ CORRECT

OrderBeta — reads API field, no tax-type detection:
  Row transform L474: gst: o.gst_amount || 0
  Column config L501: { label: 'GST' }              ← HARDCODED
  Table header L699: <th>GST</th>                   ← HARDCODED
  Footer L881: <span>GST</span>                     ← HARDCODED
  profileTransform L187: gstStatus only (no taxType) ← MISSING FIELD
```

**Root cause text:**
> `OrderReportBetaPage` was built for GST restaurants and never received a VAT-type detection pass. The column, header, and footer all hardcode the string "GST". The backend stores VAT tax amount in the same `gst_amount` field used for GST restaurants (confirmed by CPP's `taxTotals()` split logic and the live screenshot showing matching ₹17.60 value in both pages). The fix requires: (a) `profileTransform.js` to expose `taxType` or `isVat` from the API, and (b) `OrderReportBetaPage` to read it and render "VAT" / "GST" conditionally.

---

### Issue 3 — LM not working in Item Sales Ledger (woko.com)

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | woko has no October data → LM returns empty | Live API probe: `POST /top-food-sales-report {from:"2026-10-01",to:"2026-10-31"}` | **ELIMINATED** — 49 rows returned for Oct; 43 for MTD Nov | API probe step 6 |
| H2 | `computePresetRange('LM')` returns wrong dates or null | Code trace: `datePresets.js` L31-35 | **ELIMINATED** — Nov 2026: `new Date(2026,9,1)`=Oct 1, `new Date(2026,10,0)`=Oct 31; returns `{from:'2026-10-01',to:'2026-10-31'}` | `datePresets.js` L31-35 |
| H3 | `handlePreset('LM')` doesn't set `appliedFrom/appliedTo` | Code trace: `ItemSalesLedgerMockup.jsx` L164 | **ELIMINATED** — `setAppliedFrom(range.from); setAppliedTo(range.to)` ARE called; `useReportFetch` deps change → fetch fires | L164 |
| H4 | `handlePreset('LM')` missing `setSharedFrom/setSharedTo` → dates reset on navigation | Code trace: L164 vs L175 | **CONFIRMED** — LM early-returns at L164; `setSharedFrom/setSharedTo` at L175 never reached; `InsightsCacheContext` sharedFrom stays on `today`; on page remount `useState(sharedFrom)` = `useState(today)` | L164, L175, InsightsCacheContext L14 |
| H5 | LM button disabled (isLoading stuck) | Code trace: `useReportFetch.js` L40-55 | **POSSIBLE (unconfirmed)** — if initial fetch for today errors and doesn't clear `isLoading`, button stays disabled; requires browser console to confirm | L36-59 |

**BREAK POINT confirmed:**
```
handlePreset(p) in ItemSalesLedgerMockup.jsx:

L159: const handlePreset = (p) => {
L160:   setActivePreset(p);
L163:   if (p === '7D')   f = ...
L164:   else if (p === 'LM') {
           setFromDate(range.from); setToDate(range.to);
           setAppliedFrom(range.from); setAppliedTo(range.to);
           setActivePreset(p);
         }
         return;  ← EARLY RETURN — never reaches L175
...
L173:   const fs = fmtISO(f); const ts = fmtISO(now);
L174:   setFromDate(fs); setToDate(ts);
L175:   setAppliedFrom(fs); setAppliedTo(ts); setSharedFrom(fs); setSharedTo(ts);
                                              ↑ NOT called by LM branch
```

**Effect:**
- Clicking LM on the page **works** — `appliedFrom/appliedTo` change, fetch fires, 49 rows load
- Navigating away (to another Insights page) and **back** → `ItemSalesLedgerMockup` remounts → `useState(sharedFrom)` = today (unchanged) → page reloads with today's data, NOT LM
- User experience: "I clicked LM, it worked, I came back and it's gone"

**Root cause text:**
> `handlePreset('LM')` in `ItemSalesLedgerMockup.jsx` early-returns before line 175 (`setSharedFrom(fs); setSharedTo(ts)`). All other presets (7D, 30D, MTD, FY) update the `InsightsCacheContext` shared dates at L175. LM does not. `InsightsCacheContext.sharedFrom` defaults to `today`. On page remount (navigation away and back), `useState(sharedFrom)` re-initialises to `today`. The fix is 1 line: add `setSharedFrom(range.from); setSharedTo(range.to);` inside the LM branch before `return`.

---

## 3. Data Flow Traces

### I-1 Data Flow
```
OrderReportBetaPage → openCollectBillDrawer(row) [L405-407]
  → setCollectBillTarget({ ...row, id: row.order_id })
  → CollectBillPanelDrawer (open=true, order=collectBillTarget)
      L300: allowedMethods={['cash', 'card', 'upi']}      ← BUG
  → CollectPaymentPanel
      L502: isHoldContext = true
      L2942: Row 2 hidden (Split/Credit/ToRoom/Dynamic)
      L150-156: enabledPrimaryMethods = cash ∩ upi ∩ card only
  → UI: 3 methods shown (Cash, UPI, Card)
```

### I-2 Data Flow
```
API: order_detail → gst_tax_amount = 17.60 (VAT)
  
CPP path (correct):
  cart items → taxTotals() L319: taxType='VAT' → vat bucket
  → vat=17.60 → render L2789: <span>VAT</span> ₹17.60  ✅

OrderBeta path (wrong label):
  API → row transform L474: gst = o.gst_amount = 17.60
  → table L699: <th>GST</th> ₹17.60                      ← "GST" label wrong
  → footer L881: <span>GST</span> ₹17.60                 ← "GST" label wrong
```

### I-3 Data Flow
```
User clicks LM:
  handlePreset('LM') L164
  → setAppliedFrom('2026-10-01')  → useReportFetch deps change
  → setAppliedTo('2026-10-31')    → 300ms debounce
  → setSharedFrom NOT called      ← GAP
  → fetch fires → 49 rows → renders correctly on this visit

User navigates to another report page (InsightsCacheContext survives):
  sharedFrom = today (unchanged)
  sharedTo   = today (unchanged)

User navigates back to Item Sales Ledger:
  ItemSalesLedgerMockup remounts
  useState(sharedFrom) = useState(today)
  appliedFrom = today, appliedTo = today
  Fetch fires for today → 0–few rows for today
  LM "gone" — user must click it again
```

---

## 4. Evidence Artifacts

| File | Key lines | Finding |
|---|---|---|
| `components/reports/CollectBillPanelDrawer.jsx` | L300 | `allowedMethods={['cash','card','upi']}` hardcoded |
| `components/order-entry/CollectPaymentPanel.jsx` | L70-79, L500-502, L2942 | `allowedMethods` → `isHoldContext` → Row 2 hidden |
| `pages/reports-module/OrderReportBetaPage.jsx` | L474, L501, L699, L881 | `gst_amount` mapped, "GST" hardcoded in 4 places |
| `api/transforms/profileTransform.js` | L187 | Only `gstStatus` mapped; no `taxType`/`isVat` |
| `pages/reports-module/ItemSalesLedgerMockup.jsx` | L164, L175 | LM early-return before `setSharedFrom/setSharedTo` |
| `utils/datePresets.js` | L31-35 | `computePresetRange('LM')` correct (Oct 1-31) |
| `contexts/InsightsCacheContext.jsx` | L14 | `sharedFrom = useState(today)` — today default persists |
| Live API probe: woko top-food-sales | Oct 2026 | 49 rows confirmed — data exists |
| Live API probe: woko top-food-sales | Nov 2026 | 43 rows confirmed — MTD also works |

---

## 5. Recommendations

### I-1 — PayLater payment methods
- **Classification:** FE_BUG
- **Planning skip eligible:** YES (owner approval required)
  - Scope: 1 file (`CollectBillPanelDrawer.jsx`), ≤5 lines
  - Not hotspot, not financial formula — only controls which methods are shown
  - Decision needed from owner: should PayLater orders allow ALL restaurant-configured methods, or only Cash/UPI/Card?
    - Option A: Remove `allowedMethods` entirely → all configured methods shown
    - Option B: Add a prop `restrictToBasic={false}` driven by caller (Audit=true, OrderBeta=false)
- **Risk:** MEDIUM — UI-only change, no payload impact (payment type still sent correctly)
- **Blocked edits:** None
- **Files:** `CollectBillPanelDrawer.jsx` only

### I-2 — VAT label in Order Beta
- **Classification:** FE_BUG
- **Planning skip eligible:** NO — requires 2 files (profileTransform + OrderBeta)
  - `profileTransform.js`: add `taxType: api.tax_type || 'GST'` or `isVat: api.tax_type === 'VAT'`
  - `OrderReportBetaPage.jsx`: read `restaurant.tax.taxType` → render "VAT"/"GST" on L501, L699, L881 (and export column)
- **Risk:** MEDIUM — display-only, no payload or calculation changes
- **Owner decision:** Confirm the backend `api` field name that carries tax type (likely `tax_type` or `gst_type`)

### I-3 — LM preset persistence in Item Sales Ledger
- **Classification:** FE_BUG
- **Planning skip eligible:** YES (owner approval required)
  - Scope: 1 file (`ItemSalesLedgerMockup.jsx`), **1 line fix**
  - Add: `setSharedFrom(range.from); setSharedTo(range.to);` inside the LM branch (L164), before `return`
  - Not hotspot, not financial, not R5
- **Risk:** LOW — date context persistence only; no API, no calculation change
- **FY preset gap:** `FY` in `handlePreset` ALSO has the same gap (uses `computePresetRange('FY')` and early-returns without `setSharedFrom/setSharedTo`). Recommend fixing both in the same change.

---

## 6. Retroactive Candidates
None found in this investigation.

---

## Handover to Next

```
I-1: Root cause: CollectBillPanelDrawer.jsx L300 hardcodes allowedMethods={['cash','card','upi']}
     from BUG-042-A. CR-503 reused this drawer for OrderBeta PayLater without removing restriction.
     isHoldContext=true → Row 2 hidden → only Cash/UPI/Card.
     Confidence: HIGH. FE fix: 1 file, ≤5 lines. Owner decision needed (Option A or B).
     Planning skip eligible: YES (owner approve). NOT financial. Risk: MEDIUM.

I-2: Root cause: OrderReportBetaPage hardcodes 'GST' label (L501/L699/L881). No VAT detection.
     profileTransform only maps gstStatus, not taxType. Backend sends VAT in gst_amount field.
     Confidence: HIGH. FE fix: 2 files. Full gate cycle (Gate 2-3). Risk: MEDIUM.
     Backend ask: confirm field name for tax_type in /api/v1/vendoremployee/profile response.

I-3: Root cause: ItemSalesLedgerMockup handlePreset LM branch (L164) early-returns before
     setSharedFrom/setSharedTo (L175). InsightsCacheContext sharedFrom stays on today.
     Page remount resets dates. API data confirmed: 49 rows for Oct (woko).
     Confidence: HIGH. FE fix: 1 file, 1 line. Planning skip eligible: YES (owner approve).
     Also fix FY branch which has same gap. Risk: LOW.

Report: /app/memory/investigations/INV-PAYLATER-VAT-LM-2026-11-18.md
Steps: 9/10. No code written. No gates skipped.
```
