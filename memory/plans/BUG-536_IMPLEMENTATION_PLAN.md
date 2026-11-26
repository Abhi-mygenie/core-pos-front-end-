# BUG-536 — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** BUG-536 — SC GST missing from manual bill print
**Risk:** CRITICAL (R5 hotspot + R6 financial)
**Sprint:** oct_cr_batch
**Gate 3 Status:** COMPLETE — awaiting Gate 4 GO

---

## Step 0 — Entry Verification (PASS)

All target lines verified at HEAD immediately before this plan was written:

| Line | Expected fragment | Match? |
|------|------------------|--------|
| L2007 | `gst_tax += taxAmt;` (forEach accumulator) | ✅ PASS |
| L2009 | `});` (forEach close — uniqueness anchor) | ✅ PASS |
| L2010 | `gst_tax = Math.round(gst_tax * 100) / 100;` | ✅ PASS |
| L2011 | `vat_tax = Math.round(vat_tax * 100) / 100;` | ✅ PASS |
| L2012 | `    }` (else-block close) | ✅ PASS |

Collect-bill path (L1961–L1962) confirmed structurally different — will NOT be affected by `search_replace`.

No drift. Plan is valid at HEAD.

---

## Scope Lock

**Files WILL change:**
- `src/api/transforms/orderTransform.js` — 2 lines inserted in manual print path

**Files WILL NOT touch:**
- `OrderCard.jsx` · `TableCard.jsx` · `RePrintButton.jsx`
- `OrderEntry.jsx` · `CollectPaymentPanel.jsx` · `CartPanel.jsx`
- Any other file

---

## Exact Edit — Edit 1 (only edit)

**File:** `src/api/transforms/orderTransform.js`
**Location:** Inside manual print path (`else` branch, L1964–2012), after forEach close at L2009, after `gst_tax` first-round at L2010

**search_replace old_str** (unique — `});` anchor distinguishes from collect-bill path):
```javascript
      });
      gst_tax = Math.round(gst_tax * 100) / 100;
      vat_tax = Math.round(vat_tax * 100) / 100;
    }
```

**search_replace new_str:**
```javascript
      });
      gst_tax = Math.round(gst_tax * 100) / 100;
      const scTaxRateManual = (overrides.serviceChargeTaxPct || 0) / 100; // BUG-536
      gst_tax = Math.round((gst_tax + serviceChargeAmount * scTaxRateManual) * 100) / 100; // BUG-536
      vat_tax = Math.round(vat_tax * 100) / 100;
    }
```

**What this does:**
1. Declares `scTaxRateManual` from `overrides.serviceChargeTaxPct` (already passed by `OrderCard`/`TableCard`/`RePrintButton`/`OrderEntry`; `|| 0` guards callers passing `{}`)
2. Re-rounds `gst_tax` adding `serviceChargeAmount * scTaxRateManual` — mirrors collect-bill path L1954
3. `vat_tax` line and `}` closing brace unchanged

---

## Safety Analysis

| Scenario | Before fix | After fix | Regression? |
|----------|-----------|-----------|------------|
| dineIn order, SC configured, manual reprint | `gst_tax` = items only | `gst_tax` = items + SC GST | **FIXED** ✅ |
| takeaway order (`order.serviceTax = 0`), manual reprint | `gst_tax` = items | `0 * scTaxRateManual = 0`, unchanged | No regression ✅ |
| Caller passes `{}` (FolioCheckoutPanel, report reprints) | `gst_tax` = items | `scTaxRateManual = 0`, `+0` | No regression ✅ |
| Collect-bill path (`hasFinancialOverrides = true`) | Correct today | Never reaches this `else` block | No regression ✅ |

---

## Conflict Note

**CR-364-PRINT** (BACKEND-BLOCKED) touches `buildBillPrintPayload` with ~30 lines for `isRoom`. When unblocked:
- BUG-536 fix lands first at L2010–2012 region
- CR-364-PRINT adds code in a different region (isRoom block)
- CR-364-PRINT agent must re-verify BUG-536 lines are still present after merging

---

## Verification Matrix

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | Manual reprint from dashboard (OrderCard) — `gst_tax` in `order-temp-store` payload now includes SC GST | Curl `order-temp-store` on a dineIn order with SC; compare `gst_tax` = item_gst + (sc × rate) | YES (curl) |
| V2 | Collect-bill print path unchanged — same `gst_tax` as before | Print from CollectPaymentPanel; curl payload | YES (curl) |
| V3 | Takeaway order — no regression (`serviceTax = 0` → `+0`) | Curl `order-temp-store` from takeaway reprint | YES (curl) |
| V4 | Caller passing `{}` — no regression | Report-page reprint; curl payload | YES (curl) |
| V5 | Code markers present | `grep -n "BUG-536" orderTransform.js` → 2 hits | YES (grep) |
| V6 | Compile clean | `yarn build` exit 0, 0 new warnings | YES |

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | `search_replace` hits collect-bill path (L1961) instead of manual path | Mitigated: `});` anchor on L2009 is absent before L1961 (collect path has `}` not `});`) — confirmed unique |
| R2 | `overrides.serviceChargeTaxPct` undefined in some callers | Mitigated: `|| 0` guard → `scTaxRateManual = 0` → `+0` |
| R3 | `serviceChargeAmount` is 0 for non-SC orders | Correct by design — `0 * rate = 0` |
| R4 | CR-364-PRINT conflict when unblocked | Mitigated: documented — CR-364-PRINT agent must re-verify |

---

## Post-Code Registry Checklist

Implementation agent MUST execute before writing any handover:

```
□ 1. registry.json: BUG-536 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
□ 2. BUG_TRACKER.md: BUG-536 row → GATE_5A_IMPLEMENTED + files changed
□ 3. FILE_OWNERSHIP.md: orderTransform.js row — BUG-536, 2026-10-12, L2011-2012 inserted
□ 4. Code markers: grep "BUG-536" orderTransform.js → 2 hits (both inserted lines)
□ 5. yarn build: exit 0, 0 new warnings
```

---

## Summary

| Attribute | Value |
|-----------|-------|
| File | `src/api/transforms/orderTransform.js` (R5) |
| Edit | 1 site — 2 lines inserted after L2010 |
| R5 hotspot | YES |
| R6 financial | YES — `gst_tax` on bill print |
| Planning-skip | NOT eligible |
| Open decisions | NONE |
| Ready for Gate 4 GO | YES |
