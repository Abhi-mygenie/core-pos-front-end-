# Investigation Report v2 — BUG-144 Token Number Deep Dive (Curl-Validated)

**Date:** 2026-07-11
**Agent:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7)
**Steps used:** 7/10
**Confidence:** HIGH
**Restaurant:** CAFE 103 (id=644)

---

## 1. Summary

`daily_token` is **present and populated** in ALL backend API responses and socket events. The frontend **silently drops it** at the `orderTransform.js → fromAPI.order()` mapping (line 165-423). The field is never extracted, never stored, never displayed, and never sent back in place-order or print payloads.

**Classification:** FE_BUG (data available, FE ignores it)
**Confidence:** HIGH (curl-reproduced + code-traced)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | `daily_token` absent from backend responses | Curl probe: employee-orders-list | 1 | **ELIMINATED** | All 4 orders have daily_token: 0001–0004 |
| H2 | `daily_token` present in list but not single-order | Curl probe: get-single-order-new | 1 | **ELIMINATED** | daily_token: "0001" confirmed |
| H3 | `daily_token` present in API but dropped by FE transform | Code trace: orderTransform.js L165-423 | 1 | **CONFIRMED** | Field not in the return object at L194-423 |
| H4 | `use_token` setting not in profile API | Curl probe: profile endpoint | 1 | **ELIMINATED** | `settings.use_token = 'No'` present |
| H5 | `use_token` extracted by profileTransform | Code trace: profileTransform.js settings() | 1 | **ELIMINATED** | NOT mapped — grep returns 0 matches |

---

## 3. Data Flow Trace

```
API SOURCES (all confirmed via curl):
├── GET employee-orders-list → orders[].daily_token ✅ ("0001"–"0004")
├── POST get-single-order-new → orders[0].daily_token ✅ ("0001")
├── Socket new-order event → data.orders[0].daily_token ✅ ("0002" — screenshot)
└── GET profile → restaurants[0].settings.use_token ✅ ("No")

FE DATA FLOW:
├── orderTransform.js → fromAPI.order() (L165-423)
│   ├── Maps: id, restaurant_order_id, f_order_status, order_amount, etc.
│   ├── DOES NOT MAP: daily_token  ← ⚠️ BREAK POINT
│   └── Returns object without dailyToken field
├── profileTransform.js → settings() (L318-363)  
│   ├── Maps: isCoupon, isLoyalty, autoKot, autoBill, etc.
│   ├── DOES NOT MAP: use_token  ← ⚠️ BREAK POINT
│   └── Returns settings without useToken field
├── OrderCard.jsx (L432)
│   └── Displays: #{restaurant_order_id} only — no token
├── placeOrder() / placeOrderWithPayment() / updateOrder()
│   └── DOES NOT SEND: daily_token in payload  
└── buildBillPrintPayload() (L1712-2126)
    └── DOES NOT INCLUDE: daily_token in print payload
```

---

## 4. API Curl Evidence

### 4a. Running Orders (employee-orders-list)
```
GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Owner
Authorization: Bearer ***

Response: 4 orders, ALL have daily_token:
  #015044 → daily_token=0001
  #015045 → daily_token=0002
  #015046 → daily_token=0003
  #015047 → daily_token=0004
```
Evidence file: `/app/memory/evidence/BUG-144/running_orders_response.json`

### 4b. Single Order Detail (get-single-order-new)
```
POST /api/v2/vendoremployee/get-single-order-new
Body: {"order_id": 1070789}
Authorization: Bearer ***

Response: orders[0].daily_token = "0001"
```
Evidence file: `/app/memory/evidence/BUG-144/single_order_response.json`

### 4c. Socket Event (owner screenshot)
```
[useSocketEvents] Order channel event: new-order
  daily_token: "0002"
```
Evidence: Owner-provided browser DevTools screenshot

### 4d. Profile Settings
```
GET /api/v1/vendoremployee/profile
Authorization: Bearer ***

Response: restaurants[0].settings.use_token = "No"
```
Note: cafe103 has use_token="No" currently. Token values still returned on orders regardless.

---

## 5. Owner Answers to Open Questions (OQ-1 to OQ-4)

| # | Question | Owner Answer | Implication |
|---|----------|--------------|-------------|
| OQ-1 | Where does daily_token come from? | **Socket AND API response** — FE reads, not generates | FE passthrough: extract from fromAPI.order(), no local counter needed |
| OQ-2 | Replace or alongside order ID? | **Appear alongside** | OrderCard shows both: `#015044` and `Token: 0002` |
| OQ-3 | KOT/Bill need daily_token? | **Yes, both KOT and Bill** — pass in API | Add to buildBillPrintPayload + KOT print payload |
| OQ-4 | Reset cycle? | **Backend handles it** | FE is pure passthrough, no reset logic needed |

---

## 6. Scope of Work (for Planning)

| # | Task | File | Scope | Risk |
|---|------|------|-------|------|
| 1 | Extract `use_token` from profile settings | `profileTransform.js` → `settings()` ~L318-363 | +1 line: `useToken: toBoolean(apiSettings.settings?.use_token)` | LOW |
| 2 | Extract `daily_token` in order transform | `orderTransform.js` → `fromAPI.order()` ~L194 | +1 line: `dailyToken: api.daily_token \|\| null` | LOW |
| 3 | Display token alongside order ID on OrderCard | `OrderCard.jsx` | ~5-10 lines: conditional render `Token: {dailyToken}` next to `#{orderNumber}` | LOW |
| 4 | Include `daily_token` in bill print payload | `orderTransform.js` → `buildBillPrintPayload()` ~L2034 | +1 line: `daily_token: order.dailyToken \|\| ''` | MEDIUM |
| 5 | Include `daily_token` in KOT print payload | `orderService.js` → KOT print path | +1 line in KOT payload | MEDIUM |
| 6 | (Optional) Gate display by `useToken` setting | `OrderCard.jsx` + context consumer | Conditional: only show token if restaurant setting `useToken=true` | LOW |

**Estimated total: ~15-20 lines across 4 files. No new files.**

---

## 7. Recommendations

- **Classification:** FE_FIX — all data exists, FE needs extraction + display + print passthrough
- **Risk:** MEDIUM (touches print payload = financial-adjacent)
- **Planning skip eligible:** NO — touches print payload (buildBillPrintPayload) which is a hotspot (R5-adjacent), and involves 4 files
- **Recommended path:** Full Planning Gates 2-3 → Gate 4 GO → Implementation
- **Backend ask:** NONE — all data already shipped by backend

---

## 8. Retroactive Candidates
NONE — BUG-144 has zero code in the codebase.

---

## Evidence Artifacts
All saved to: `/app/memory/evidence/BUG-144/`
- `running_orders_response.json` — employee-orders-list curl output
- `single_order_response.json` — get-single-order-new curl output
