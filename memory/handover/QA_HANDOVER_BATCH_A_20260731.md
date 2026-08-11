# QA Handover — Batch A (BUG-282, BUG-283, BUG-284, BUG-285, CR-120)

**Date:** 2026-07-31
**Items:** BUG-282, BUG-283, BUG-284, BUG-285, CR-120
**Implementation Plan:** `plans/BATCH_A_BUG-282_283_284_285_CR-120_IMPLEMENTATION_PLAN.md`

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|:----:|------|-------------|:---:|
| E1 | aggregatorTransform.js:23 | BUG-283: regex strip present | ✅ Code marker verified |
| E2 | AggregatorOrderPopOut.jsx:27-34 | BUG-284: dedup + sub_locality + landmark | ✅ Code marker verified |
| E3 | AggregatorOrderPopOut.jsx:299-321 | BUG-282: addon/variation render block | ✅ Code marker verified |
| E4 | OrderCard.jsx:1013 | CR-120: KOT → fOS=1 only | ✅ Code marker verified |
| E5 | OrderCard.jsx:1071-1079 | BUG-285: button→span | ✅ Code marker verified |
| E6 | OrderCard.jsx:1082 | CR-120: Bill → fOS=2 only | ✅ Code marker verified |
| E7 | TableCard.jsx:490-517 | BUG-285+CR-120: fOS=2 rewrite | ✅ Code + screenshot verified |

## 2. Test Cases

### BUG-282 — Addon/Variation Display

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Popup shows addons | 1. Have aggregator order with addons arrive (fOS=0/7). 2. View acceptance popup. 3. Check item list. | Addon names + prices shown as indented sub-rows with "+" prefix |
| T2 | Popup shows variations | 1. Have aggregator order with variations arrive. 2. View popup. | Variation labels shown in italic under item |
| T3 | Items without addons unchanged | 1. View popup for order with plain items (no addons/variations). | No extra rows or empty blocks |

### BUG-283 — Order Note Prefix Strip

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T4 | Zomato prefix stripped | 1. Receive Zomato order with note "Order Instructions ::: Some text". 2. View popup or OrderCard. | Note shows "Some text" only |
| T5 | Swiggy note unchanged | 1. Receive Swiggy order with note. | Note shows as-is (no prefix to strip) |
| T6 | Empty after strip → hidden | 1. Zomato order with note "Order Instructions :::". | Note section hidden (null) |

### BUG-284 — Address Dedup

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T7 | Swiggy address dedup | 1. Swiggy order with line_1="Bangalore", city="Bangalore". 2. View popup. | Shows "Bangalore" once, not "Bangalore, Bangalore" |
| T8 | Zomato address distinct | 1. Zomato order with line_1="Test Area", city="Delhi NCR". | Shows "Test Area, Delhi NCR" (no dedup needed) |

### BUG-285 — Ready to Dispatch Label

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T9 | OrderCard fOS=2 label | 1. Click aggregator order with fOS=2 on dashboard. 2. Check footer. | "Ready to Dispatch" is non-clickable text (no border, no hover cursor) |
| T10 | TableCard fOS=2 label | 1. View aggregator card with fOS=2 in dashboard grid. | "Ready to Dispatch" is non-clickable text label |

### CR-120 — KOT/Bill Split

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T11 | fOS=1 OrderCard: KOT yes, Bill no | 1. Click aggregator order with fOS=1. 2. Check footer. | KOT printer icon visible. Bill button NOT visible. |
| T12 | fOS=2 OrderCard: Bill yes, KOT no | 1. Click aggregator order with fOS=2. 2. Check footer. | Bill button (green) visible. KOT printer icon NOT visible. |
| T13 | fOS=1 TableCard: KOT yes | 1. View aggregator card fOS=1 in grid. | KOT printer icon + "Ready" button |
| T14 | fOS=2 TableCard: Bill yes, KOT no | 1. View aggregator card fOS=2 in grid. | Bill printer icon (green) + "Ready to Dispatch" label. No KOT icon. |

## 3. Regression Tests

| # | What | Why |
|---|------|-----|
| R1 | Non-aggregator orders: KOT, Cancel, Ready, Serve, Bill all work | Ensure !isAggregator paths untouched |
| R2 | Dashboard loads without errors | SOURCE_COLORS import fix |
| R3 | Aggregator acceptance popup renders (fOS=0/7) | Popup component modified (E2, E3) |
| R4 | Non-delivery POS orders not affected (Dine-in, Room, Takeaway) | Only aggregator conditions changed |

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-282, BUG-283, BUG-284, BUG-285, CR-120
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED
```

## 5. Credentials + Environment

| Field | Value |
|---|---|
| Account | owner@18march.com / Qplazm@10 |
| URL | https://4aa647f7-ca56-465f-87de-7ef976e4aa17.preview.emergentagent.com |
| API | https://preprod.mygenie.online |
| Aggregator endpoint | GET /api/v1/vendoremployee/urbanpiper/get-order-list |
| Login endpoint | POST /api/v1/auth/vendoremployee/login |
