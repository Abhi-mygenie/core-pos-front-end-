# Session Handover — 2026-07-31 QA Closure

**Session type:** QA  
**Date:** 2026-07-31  
**Status:** QA PASS — Gate 6 (Owner Smoke) next

---

## QA Result: ALL PASS

Registry: BUG-280 and BUG-281 → gate=6, status=QA PASS — AWAITING OWNER SMOKE

### Key Live Evidence

**BUG-280 (settlement payload):**
- `"cust_name": "QA Test Customer"` ✅ 
- `"cust_mobile": "9876543210"` ✅
- `"cust_membership_id": ""` ✅ (expected — customer typed in field, no CRM ID)
- `"email": ""` — legacy field, `cust_email` key ABSENT ✅ (OD-BUG280-1 honored)

**BUG-281 (settlement + auto-print):**
- `"custGST": "QAGST001TEST"` in `[CollectBill] payload:` ✅
- `"custGSTName": "QA Test Company Ltd"` in `[CollectBill] payload:` ✅
- `"custGST": "QAGST001TEST"` in `order-temp-store` (auto-print) ✅
- `"custGSTName": "QA Test Company Ltd"` in `order-temp-store` ✅

**Regression:**
- Settlement response: `{message: Bill cleared via cash}` — HTTP 200 ✅
- Financial fields correct (gst_tax: 17.96, vat_tax: 0, service_tax: 35.90) ✅
- Jest: 63/63 PASS ✅

### Pre-Existing Failures (not regression)
- `qa_subtotal_delivery_validation.test.js` — 2 tests, confirmed pre-existing

---

## Gate 6 — Owner Smoke Test Instructions

1. Open any dine-in table with a placed order (or create one)
2. Open Collect Payment panel
3. Under "B2B Invoice (Optional)": enter a GST number and company name
4. Click Pay
5. Verify:
   - Settlement succeeds (table clears)
   - Bill print / auto-print contains correct GST number and name
   - Check API logs / print receipt for `custGST` and `custGSTName`

For BUG-280 (customer name in settlement):
1. Select a CRM customer on an order (via CRM lookup, not just typing)
2. Collect Bill → Pay
3. Verify backend records show customer name + phone on the settled order

---

## QA Report Location

`/app/memory/evidence/BUG-280/QA_REPORT_BUG280_BUG281_20260731.md`
