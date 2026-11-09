# QA Handover — BUG-536
**Date:** 2026-10-12
**Item:** BUG-536 — SC GST missing from manual bill print
**From:** IMPLEMENTATION agent
**To:** QA agent (Role 4)

---

## 1. Inherited from Plan (Verification Matrix — self-test results)

| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| E1 — L2011: `scTaxRateManual` const | orderTransform.js | Line present in manual path only | ✅ PASS |
| E1 — L2012: `gst_tax` re-round with SC GST | orderTransform.js | `gst_tax + serviceChargeAmount * scTaxRateManual` present | ✅ PASS |
| Collect-bill path untouched (L1886–1962) | orderTransform.js | `scTaxRateManual` absent in collect-bill region | ✅ PASS |
| BUG-536 markers | orderTransform.js | 2 × `// BUG-536` at L2011 + L2012 | ✅ PASS |
| Compile | — | `yarn build` exit 0, 0 new warnings | ✅ PASS |

Self-test: **5/5 PASS**

---

## 2. Test Cases for QA Execution

**Setup:** Need a dineIn or room order on a restaurant with service charge + `service_charge_tax` configured. Use RID 69 (The Goan Kitchen) — SC configured.

**How to curl-test:** Trigger a manual reprint from OrderCard (Dashboard) and capture the `order-temp-store` payload, then verify `gst_tax` includes SC component.

Alternatively verify by:
1. Login → Dashboard → find an open dineIn order
2. Click the print icon on the OrderCard
3. In browser Network tab: find `order-temp-store` POST request
4. Inspect `gst_tax` field in request payload

| # | Test | Steps | Expected | Severity if fail |
|---|------|-------|----------|:---:|
| TC-1 | Manual reprint SC GST included | Dashboard → dineIn order with SC → click print → capture `order-temp-store` payload | `gst_tax` = item_gst + (serviceCharge × serviceChargeTaxPct/100) | BLOCKER |
| TC-2 | Collect Bill print path unchanged | CollectPaymentPanel → print bill → capture payload | `gst_tax` identical to pre-fix value (collect-bill path unaffected) | BLOCKER |
| TC-3 | Takeaway order no regression | Dashboard → takeaway order → print → capture payload | `gst_tax` unchanged (serviceTax=0 → +0) | MAJOR |
| TC-4 | `scTaxRateManual` absent in collect-bill region | Code grep | `scTaxRateManual` only at L2011-2012, not in L1886-1962 block | MAJOR |
| TC-5 | webpack still clean | `yarn build` | exit 0, no new warnings | MAJOR |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | Collect-bill path gst_tax unchanged — print from CPP shows same value as before | Collect-bill path has its own SC GST (L1954); BUG-536 must not double-count |
| R2 | FolioCheckoutPanel reprint — no regression (`{}` overrides) | Folio passes `{}` → `scTaxRateManual=0` → `+0` |
| R3 | Report-page reprint — no regression | Same `{}` pattern |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-536
Status: GATE_5A_IMPLEMENTED
Sprint: oct_cr_batch
EXIT GATE: ALL 5 PASSED
  □1 registry.json:    GATE_5A_IMPLEMENTED ✅
  □2 BUG_TRACKER.md:   row updated ✅
  □3 FILE_OWNERSHIP.md: orderTransform.js BUG-536 row added ✅
  □4 Code markers:     // BUG-536 × 2 at L2011-2012 ✅
  □5 yarn build:       exit 0, 0 new warnings ✅
```

---

## 5. Credentials + Environment

- **Account:** owner@thegoankitchen.com / Qplazm@10 (RID 69, The Goan Kitchen — has SC configured)
- **Preview URL:** https://genie-core-pos.preview.emergentagent.com
- **External backend:** https://preprod.mygenie.online
- **Key route:** Dashboard → any open dineIn order → print icon
- **Network tab:** POST to `order-temp-store` — inspect `gst_tax` field
