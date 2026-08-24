# QA Handover — BUG-271

**ID:** BUG-271  
**Title:** GST/VAT Wrong on Print — Manual Print Path Missing food_details.tax Fallback  
**Risk:** CRITICAL  
**Sprint:** pos_5_0  
**Handover Date:** 2026-07-30  
**Implementation Agent:** IMPLEMENTATION role  
**Status:** Code complete. Awaiting QA.

---

## 1. Inherited Verification Matrix (from Plan)

| Edit # | File | Change | Self-Test Result |
|--------|------|--------|:---:|
| 1a | `orderTransform.js:1879` | `lineTotal` + `food_details.tax` fallback added to manual print path | PASS ✅ — Python simulation: `vat_tax=8.76` (was 0.0); confirmed with real API evidence `single_order_940279.json` |
| 1b (regression) | — | Collect Bill path untouched | PASS ✅ — `hasFinancialOverrides=true` branch (L1807-1869) not modified; verified by visual diff |
| 1f | — | Compile: 0 new warnings | PASS ✅ — `webpack compiled with 1 warning` (pre-existing only) |

---

## 2. Test Cases for QA Execution

| # | Test | Steps | Expected |
|---|------|-------|----------|
| TC-1 | **Manual print from TableCard** | Open active dine-in order → TableCard → Print Bill → inspect Network tab → `POST order-temp-store` payload | `gst_tax > 0` OR `vat_tax > 0` (not both zero). Exact value = `Σ (lineTotal × taxPct/100)` per item. |
| TC-2 | **Manual print from OrderCard** | Dashboard → active order → OrderCard → Print Bill → Network tab | Same as TC-1: non-zero tax field |
| TC-3 | **Collect Bill print unchanged** | CollectPaymentPanel → complete a payment → auto-print or "Print Bill" button → Network tab | Values match TC-1 (both paths should now produce same tax totals for same order) |
| TC-4 | **GST item routes to gst_tax** | Order an item with `tax_type=GST` → manual print → Network tab | `gst_tax > 0`, `vat_tax = 0` |
| TC-5 | **VAT item routes to vat_tax** | Order an item with `tax_type=VAT` → manual print → Network tab | `vat_tax > 0`, `gst_tax = 0` |
| TC-6 | **Reprint from AllOrdersReportPage** | Reports → find settled order → Reprint → Network tab | `gst_tax` or `vat_tax` non-zero |
| TC-7 | **Zero-tax item** | Order item with `tax=0` in food_details → manual print | Both fields remain 0 (correct — no tax configured) |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | `payment_amount` field in `order-temp-store` payload unchanged | Critical: settlement total must not change |
| R2 | `order_sub_total` field unchanged | Subtotal must not change |
| R3 | Complimentary item in order → it contributes 0 to `gst_tax`/`vat_tax` | `isDetailComplimentary` guard preserved |
| R4 | Cancelled item not in payload at all | `isDetailCancelled` filter at L1771 preserved |
| R5 | BUG-270 fields (`cust_mobile`, `cust_membership_id`) still present in payload | orderTransform change isolated to L1879-1910 only |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
BUG-271: status=IMPLEMENTED, gate=0-5, sprint=pos_5_0
EXIT GATE: 5/5 PASSED
  ✅ 1. registry.json: IMPLEMENTED / pos_5_0
  ✅ 2. BUG_TRACKER.md: IMPLEMENTED row
  ✅ 3. FILE_OWNERSHIP.md: BUG-271 FIX-COMPLETE (2026-07-30)
  ✅ 4. Code marker: // BUG-271 FIX-COMPLETE in orderTransform.js
  ✅ 5. Compile: 0 new warnings
```

---

## 5. Credentials + Environment

```
Env: https://preprod.mygenie.online
Credential aliases (see AGENT_PROMPT_ALPHA.md §TEST CREDENTIALS):
  - cafe103_no_rooms_postpaid_gst (RID 644) — use for GST-type item tests (TC-4)
  - delivery_assign_no (RID 478)            — use for VAT-type item tests (TC-5, evidence order)
Login: POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login
Raw credentials: /app/memory/control/ENV_REGISTRY.md (never print inline)
```

---

## 6. Files Changed

| File | Lines | Change |
|------|-------|--------|
| `src/api/transforms/orderTransform.js` | 1879-1910 | Replaced 12 lines (broken stub) with 32 lines (fallback complete). Net: +20 lines. |

---

## 7. Scope Lock Confirmation

Files changed: `orderTransform.js` ONLY  
Files NOT touched: `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `orderService.js`, all callers  
Scope expansion: NONE
