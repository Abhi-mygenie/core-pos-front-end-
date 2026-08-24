# QA Handover — BUG-291
**Date:** 2026-07-31
**Prepared by:** IMPLEMENTATION AGENT
**Item:** BUG-291 — Aggregator Rider Details Not Displayed

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit # | File | Change | Verification | Self-Test Result |
|--------|------|--------|--------------|:---:|
| 1 | `aggregatorTransform.js:86` | ADD `rider:` key | grep `rider:` present | ✅ PASS |
| 2 | `aggregatorTransform.js:91-93` | ADD `riderStatus:` derivation | grep `riderStatus:` present | ✅ PASS |
| 3 | `aggregatorTransform.js:87-94` | REMOVE `riderInfo:` block (8 lines) | grep `riderInfo` returns 0 non-comment hits | ✅ PASS |
| — | `aggregatorTransform.js` | Code markers present | `// BUG-291 R1`, `R2`, `R4` at L85/89/94 | ✅ PASS |
| — | `aggregatorTransform.js` | Compile clean | webpack compiled successfully | ✅ PASS |
| — | `OrderCard.jsx` | Reads untouched | L912/914/922/933 unchanged | ✅ PASS |

---

## 2. Test Cases for QA Agent

| # | Test | Steps | Expected | Automated? |
|---|------|-------|----------|:---:|
| TC-1 | Aggregator order WITH rider shows name | Load dashboard → find Swiggy/Zomato delivery order with `rider_info.id` non-null | Rider section shows actual name (e.g. "VEERJINDER SINGH") instead of "Awaiting Runner" | NO (browser) |
| TC-2 | Aggregator order WITH rider shows "Assigned" badge | Same order as TC-1, `f_order_status < 5` | Orange "Assigned" status pill visible | NO (browser) |
| TC-3 | Aggregator order WITH rider dispatched shows "Order Accepted" badge | Aggregator order with `rider_info.id` non-null AND `f_order_status === 5` | Green "Order Accepted" pill visible | NO (browser) |
| TC-4 | Aggregator order WITHOUT rider shows "Awaiting Runner" | Load aggregator delivery order with `rider_info.id` null | "Awaiting Runner" text shows, no rider name, no status badge | NO (browser) |
| TC-5 | POS own-delivery orders unaffected | Load non-aggregator delivery order with assigned rider | Rider section unchanged from before fix — NOT regressed | NO (browser) |
| TC-6 | riderPhone still displays | Load order from TC-1 | Phone number still visible in rider section | NO (browser) |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|------|------|
| R-1 | Non-aggregator (POS) delivery orders — rider section unchanged | `aggregatorTransform` is not called for POS orders; but verify no shared state regression |
| R-2 | Aggregator order card renders without JS error | Removal of `riderInfo` block should not break anything; confirm in browser console |
| R-3 | Socket `aggrigator-order-update` event — card updates in real-time | All socket paths flow through `aggregatorTransform.aggregatorOrder()`; fix covers live updates |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-291
Status: IMPLEMENTED — Gate 5a self-test PASS — Awaiting QA
Sprint: pos_6_0
EXIT GATE: 5/5 PASS
```

Verify:
```bash
python3 -c "
import json
d = json.load(open('/app/memory/control/registry.json'))
item = next(i for i in d['items'] if i['id']=='BUG-291')
print(item['id'], '|', item['status'], '|', item['sprint_key'])
"
```
Expected: `BUG-291 | IMPLEMENTED — Gate 5a self-test PASS — Awaiting QA | pos_6_0`

---

## 5. Credentials + Environment

| Field | Value |
|---|---|
| App URL | Use REACT_APP_BACKEND_URL from `/app/frontend/.env` |
| Restaurant | Any restaurant with active Swiggy / Zomato orders |
| Order type needed | Aggregator delivery order with `rider_info.id` non-null (rider assigned) |
| Reference data | Restaurant 749, order 45334, rider "VEERJINDER SINGH" (owner-provided sample 2026-07-31) |
| Credentials | See `/app/memory/test_credentials.md` |

---

## 6. File Changed

| File | Lines | Nature |
|---|---|---|
| `src/api/transforms/aggregatorTransform.js` | L84-94 (before) → L84-95 (after, -4 net) | Additive (`rider:`, `riderStatus:`) + removal (`riderInfo:` block) |

**Files NOT touched:** `socketHandlers.js`, `OrderCard.jsx`, `DeliveryCard.jsx`, `TableCard.jsx`, `AggregatorDispatchModal.jsx`
