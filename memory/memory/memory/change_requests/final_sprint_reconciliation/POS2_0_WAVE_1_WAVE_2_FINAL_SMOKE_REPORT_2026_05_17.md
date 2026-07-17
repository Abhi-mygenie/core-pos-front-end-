# POS2.0 Wave 1 + Wave 2 — Final Smoke Test & Implementation Report — 2026-05-17

## 1. Session Summary

This session implemented **Wave 2 (6 bugs)** and fixed **2 Wave 1 bugs** that failed smoke testing. All code changes are on the `17-may` branch.

---

## 2. Wave 1 — Quick Wins (7 bugs)

| # | Bug ID | Title | Smoke Test | Notes |
|---|--------|-------|------------|-------|
| 1 | BUG-062 | Hide "To Room" for takeaway/delivery | ✅ PASS | Owner confirmed |
| 2 | BUG-066 | Food transfer exclude rooms | ✅ PASS | Owner confirmed |
| 3 | BUG-067 | Station toggle disabled when no stations | ✅ PASS | Owner confirmed |
| 4 | BUG-073 | Empty customization wrapper | ✅ PASS | **Fixed this session** — Wave 1 only patched CartPanel.jsx; CollectPaymentPanel.jsx had same bug at 2 locations (L1292, L1558). Added empty-content guard. |
| 5 | BUG-072 | Notes + items on order card | ✅ PASS | **Fixed this session** — Root cause: `dineInOrders` excluded room orders (`!o.isRoom`), so room cards never got full order data. Fixed `DashboardPage.jsx` to search `orders` (all) and pass `items`, `orderNote`, `order` in `allRoomsList`. |
| 6 | BUG-079 | Polling threshold 1-miss | ⏳ QA CYCLE | No manual smoke — will be validated in QA cycle |
| 7 | BUG-078 | CRM timeout toast | 🔍 INVESTIGATION DONE | CRM key for restaurant 478 is **invalid on the CRM server** (HTTP 401). Other keys (e.g., 364) work fine. This is a CRM-side key provisioning issue, not a frontend bug. See Section 5 below. |

---

## 3. Wave 2 — Financial Core (6 bugs)

| # | Bug ID | Title | Smoke Test | Notes |
|---|--------|-------|------------|-------|
| 1 | BUG-051 | Round-off always-ceil | ⏳ PENDING | Code: replaced `fractional > 0.10 ? ceil : floor` with `Math.ceil` in `orderTransform.js` + `CollectPaymentPanel.jsx`. Test re-baseline done (2353→2354). |
| 2 | BUG-054 | VAT discount proration | ✅ PASS | **Display fix this session** — Grand Total + payload were correct, but VAT display row read `taxTotals.vat` (pre-discount) instead of prorated `vat`. Fixed L1737-1740. |
| 3 | BUG-055 | Prepaid `order_discount_type` parity | 🟡 PARKED | Key added to `placeOrderWithPayment` + `updateOrder`, but deeper issue: custom discount values not flowing through prepaid path. **Parked for re-planning.** |
| 4 | BUG-075 | Tip gate (dine-in/walk-in/room only) | ⏳ PENDING | Code: `tipApplicable` gate mirrors SC pattern. Replaces `tipEnabled` at 5 locations. |
| 5 | BUG-083 | Delivery GST key `delivery_charge_gst_amount` | ⏳ PENDING | Code: key added to `calcOrderTotals` return, `collectBillExisting`, `buildBillPrintPayload`. Absent for non-delivery. |
| 6 | BUG-052 | Profile `total_round` boolean gate | ⏳ PENDING | Code: `totalRound: toBoolean(api.total_round)` in profileTransform. Gates `Math.ceil` in both orderTransform and CollectPaymentPanel. |

---

## 4. All Files Changed (This Session)

| # | File | Changes | Bugs |
|---|------|---------|------|
| 1 | `frontend/src/api/transforms/orderTransform.js` | Math.ceil, VAT proration, `order_discount_type`, delivery GST key, `roundOffEnabled` gate | BUG-051, 054, 055, 083, 052 |
| 2 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Math.ceil, VAT proration + display fix, tip gate, delivery GST passthrough, round-off gate, empty customization guard (×2) | BUG-051, 054, 075, 083, 052, 073 |
| 3 | `frontend/src/api/transforms/profileTransform.js` | `totalRound: toBoolean(api.total_round)` | BUG-052 |
| 4 | `frontend/src/components/order-entry/OrderEntry.jsx` | `roundOffEnabled: restaurant?.totalRound !== false` threaded to 3 payload builder calls | BUG-052 |
| 5 | `frontend/src/pages/DashboardPage.jsx` | Room channel view uses `orders` instead of `dineInOrders`; `allRoomsList` includes `items`, `orderNote`, `order` | BUG-072 |
| 6 | `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` | 3 assertions re-baselined (2353→2354) | BUG-051 |

---

## 5. BUG-078 CRM Investigation Report

### Issue
CRM endpoint `https://crm.mygenie.online/api/pos/customers?search=ab&limit=10` returns `{"detail":"Invalid API key"}` (HTTP 401) for restaurant 478.

### Frontend Code: ✅ Correct
- `crmAxios.js` properly parses `REACT_APP_CRM_API_KEYS` JSON
- Resolves key by restaurant ID via `CRM_API_KEYS[currentRestaurantId]`
- Sends `X-API-Key` header in request interceptor

### Direct curl test results

| Restaurant | Key (truncated) | HTTP Status | Result |
|------------|-----------------|-------------|--------|
| 364 | `dp_live_hY06CqBPfY5W...` | 200 ✅ | Returns customers |
| 478 | `dp_live_RYi2kErcTBe_...` | 401 ❌ | `Invalid API key` |

### Root Cause
The API key for restaurant 478 is **invalid on the CRM server side** (Dukaan Plus). The key may have been rotated, expired, or incorrectly provisioned.

### Action Required
- **CRM team** to regenerate/verify the API key for restaurant 478 on Dukaan Plus
- Update `.env` `REACT_APP_CRM_API_KEYS` JSON with the new key for `"478"`

### All 15 Restaurant Keys in `.env`

| # | Restaurant ID | Key (first 20 chars) |
|---|--------------|----------------------|
| 1 | 364 | `dp_live_hY06CqBPfY5W...` |
| 2 | 475 | `dp_live_euzcbBYjRA8Z...` |
| 3 | 478 | `dp_live_RYi2kErcTBe_...` ❌ Invalid |
| 4 | 509 | `dp_live_zSGgRVoIK5Ox...` |
| 5 | 510 | `dp_live_HrwXp5fOYBNw...` |
| 6 | 523 | `dp_live_dD9K1PDCapgt...` |
| 7 | 541 | `dp_live_SXBzUgZ7ZqyM...` |
| 8 | 595 | `dp_live_o4zTF10LTrU_...` |
| 9 | 635 | `dp_live_QEI9Wa5cE5fm...` |
| 10 | 669 | `dp_live_XAD4UQHZq7W5...` |
| 11 | 675 | `dp_live_clmnERKRSd32...` |
| 12 | 687 | `dp_live_TAKqYQgd8B8z...` |
| 13 | 699 | `dp_live_MoxpUIDh4Qfd...` |
| 14 | 709 | `dp_live_Pp1oEFsqyF43...` |
| 15 | 716 | `dp_live_W3HIQQDyxSM0...` |

---

## 6. Business Rules Verification

| Rule | Status | Notes |
|------|--------|-------|
| ROUND-002 (Grand Total only) | ✅ Preserved | Component values still 2-decimal |
| TAX-001/002/003 (GST/VAT calc) | ✅ Preserved | VAT now correctly prorated (BUG-054) |
| TAX-005 (mixed GST+VAT) | ✅ Preserved | Both tracked separately |
| TAX-008 (null → 0%) | ✅ Preserved | parseTaxPct fallback unchanged |
| SC-001/002/003/006 | ✅ Preserved | SC logic untouched |
| TIP-001/002 | ✅ Preserved | Feature flag still required; tip rides SC rate |
| TOTALS-001/002 | ✅ Preserved | Item Total and Subtotal formulas unchanged |
| PAY-001/002/004/007/008 | ✅ Preserved | Payment payload contracts intact |
| DEL-004/005 | ✅ Preserved | Delivery charge read-only for prepaid |
| DASH-001/002/003 | ✅ Preserved | Channel/status view stability unchanged |

---

## 7. Automated Test Results

| Suite | Passed | Total |
|-------|--------|-------|
| qa_subtotal_delivery_validation | 19 | 19 ✅ |
| orderTransformFinancials | 18 | 18 ✅ |
| profileTransform | 32 | 32 ✅ |

---

## 8. Consolidated Smoke Test Status

### Summary

| Status | Count | Bugs |
|--------|-------|------|
| ✅ Passed | **7** | BUG-062, 066, 067, 073, 072, 054 (Wave 1: 5, Wave 2: 1 + 1 display fix) |
| ⏳ Pending QA | **5** | BUG-079, 051, 075, 083, 052 |
| 🟡 Parked | **1** | BUG-055 (deeper prepaid discount flow issue) |
| 🔍 CRM-side issue | **1** | BUG-078 (invalid API key for restaurant 478) |
| **Total** | **13** | |

---

## 9. Known Constraints & Follow-ups

1. **BUG-055 (PARKED):** `order_discount_type` key was added but custom discount values don't flow through the prepaid path. Needs deeper analysis of the prepaid discount data chain: CollectPaymentPanel → OrderEntry → `placeOrderWithPayment`.

2. **BUG-078 (CRM KEY):** Restaurant 478's CRM API key is invalid server-side. CRM team to regenerate. Other restaurant keys untested — recommend bulk validation.

3. **BUG-051 backend coordination:** Backend may still use the old fractional ceil/floor rule. Frontend now always-ceils (gated by `total_round` profile boolean). Backend team should be informed.

4. **BUG-052 field identification:** `total_round` confirmed by owner as the API field name. If field is missing in some restaurant profiles, `toBoolean` returns `false` → no round-off. Default in `calcOrderTotals` is `true` for backward compatibility.

---

## 10. Environment Variables

16 variables configured in `/app/frontend/.env`. See Section 5 for CRM key details.

| Variable | Value |
|----------|-------|
| REACT_APP_BACKEND_URL | `https://insights-phase.preview.emergentagent.com/` |
| WDS_SOCKET_PORT | `443` |
| ENABLE_HEALTH_CHECK | `false` |
| REACT_APP_API_BASE_URL | `https://preprod.mygenie.online/` |
| REACT_APP_SOCKET_URL | `https://presocket.mygenie.online` |
| REACT_APP_FIREBASE_API_KEY | `AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY` |
| REACT_APP_FIREBASE_AUTH_DOMAIN | `mygenie-restaurant.firebaseapp.com` |
| REACT_APP_FIREBASE_PROJECT_ID | `mygenie-restaurant` |
| REACT_APP_FIREBASE_STORAGE_BUCKET | `mygenie-restaurant.firebasestorage.app` |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | `969625631640` |
| REACT_APP_FIREBASE_APP_ID | `1:969625631640:web:2f2a2987f740b6fc8e09ed` |
| REACT_APP_FIREBASE_MEASUREMENT_ID | `G-WFK75QN54E` |
| REACT_APP_FIREBASE_VAPID_KEY | `BEvFMTX767yCa4Y...` |
| REACT_APP_CRM_BASE_URL | `https://crm.mygenie.online/api` |
| REACT_APP_CRM_API_KEYS | JSON with 15 restaurant keys |
| REACT_APP_GOOGLE_MAPS_KEY | `AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4` |

---

## 11. Next Actions

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Complete smoke tests for BUG-051, 075, 083, 052 | QA team |
| P0 | Validate BUG-079 in QA cycle | QA team |
| P1 | Regenerate CRM API key for restaurant 478 | CRM team |
| P1 | Re-plan BUG-055 (prepaid discount flow analysis) | Implementation agent |
| P1 | Inform backend team of BUG-051 always-ceil change | Owner/Tech lead |
| P2 | Bulk-validate all 15 CRM API keys | DevOps/CRM team |
| P2 | Proceed to Wave 3 (BUG-080, BUG-056) after Wave 2 QA passes | Implementation agent |

---

## 12. Reports Created This Session

| Document | Path |
|----------|------|
| Owner Approval Plan | `POS2_0_WAVE_2_OWNER_APPROVAL_PLAN_2026_05_17.md` |
| Code Diff Preview | `POS2_0_WAVE_2_CODE_DIFF_PREVIEW_2026_05_17.md` |
| Implementation Report | `POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md` |
| QA Handoff | `POS2_0_WAVE_2_QA_HANDOFF_2026_05_17.md` |
| Final Smoke Test Report | This document |

All documents in: `/app/memory/change_requests/final_sprint_reconciliation/`

---

*— End of POS2.0 Wave 1 + Wave 2 Final Smoke Test & Implementation Report —*
