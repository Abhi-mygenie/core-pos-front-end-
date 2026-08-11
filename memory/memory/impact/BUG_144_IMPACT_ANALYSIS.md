# Impact Analysis — BUG-144 Token Number Display + Print

**Date:** 2026-07-11
**Agent:** PLANNING (Gate 2)
**Code Reality:** NONE — zero FE references to daily_token or use_token
**Conflict Pre-Check:** SAFE — BUG-138 (discount, L1632) and CR-058 (INTAKE only, CollectPaymentPanel) touch orderTransform.js but on unrelated lines. No merge conflict.

---

## 1. Context

BUG-144: The backend sends `daily_token` (a daily-reset sequential order number) on every order API response and socket event. The frontend silently drops it at the transform layer. Owner confirmed:

- **OQ-1:** daily_token comes from socket + API response (FE passthrough, no local counter)
- **OQ-2:** Token appears **alongside** restaurant_order_id (not replace)
- **OQ-3:** Both KOT and Bill print payloads need daily_token
- **OQ-4:** Backend handles reset cycle (FE is pure passthrough)

**Risk:** MEDIUM — touches print payload (financial-adjacent) + order transform (hotspot R5)

---

## 2. Data Flow Trace

```
SOURCES (all curl-confirmed 2026-07-11):
├── GET employee-orders-list → orders[].daily_token ✅ ("0001"–"0004")
├── POST get-single-order-new → orders[0].daily_token ✅ ("0001")
├── Socket new-order event → daily_token ✅ ("0002" — owner screenshot)
└── GET profile → restaurants[0].settings.use_token ✅ ("No")

CURRENT FE FLOW (BROKEN — field dropped):
  API daily_token → orderTransform.fromAPI.order() → ❌ NOT MAPPED
  API use_token   → profileTransform.settings()    → ❌ NOT MAPPED

TARGET FE FLOW (after fix):
  API daily_token → orderTransform.fromAPI.order() → order.dailyToken
                  → OrderCard display (alongside #{orderNumber})
                  → buildBillPrintPayload → daily_token field
                  → KOT payload → daily_token field
  API use_token   → profileTransform.settings() → settings.useToken
                  → (Optional) gate OrderCard display
```

---

## 3. Affected Files + Exact Edit Locations

### File 1: `api/transforms/profileTransform.js`

| Line | Current | Change | Risk |
|------|---------|--------|------|
| L362 (after `aggregatorOrderTone`) | No `useToken` mapping | Add: `useToken: toBoolean(apiSettings.settings?.use_token),` | LOW — additive, no existing consumer |

**Downstream:** Restaurant settings context, OrderCard gate, any future settings page display.

### File 2: `api/transforms/orderTransform.js`

| Line | Current | Change | Risk |
|------|---------|--------|------|
| L196 (inside `fromAPI.order()` return, after `orderNumber`) | No `dailyToken` field | Add: `dailyToken: api.daily_token || null,` | LOW — additive field, no existing consumer disturbed |
| L2036 (inside `buildBillPrintPayload()` return, after `restaurant_order_id`) | No `daily_token` field | Add: `daily_token: order.dailyToken || '',` | MEDIUM — print payload change, backend must accept |

**Conflict zones:**
- BUG-138 touches L1632 area (discount fields) — **no conflict**, different section.
- CR-058 is at INTAKE stage, no code yet — **no conflict**.
- BUG-166/168 touched L698-704, L1493, L1808-1826 — **no conflict**, addon math section.

### File 3: `components/cards/OrderCard.jsx`

| Line | Current | Change | Risk |
|------|---------|--------|------|
| L96 | `const orderNumber = order.orderNumber;` | Add below: `const dailyToken = order.dailyToken;` | LOW |
| L426-434 | Shows `#{orderNumber}` only | Add token display alongside: e.g., `#{orderNumber} · T{dailyToken}` or separate chip | LOW — cosmetic |

**Layout consideration:** Token should appear alongside the order number chip. The current chip at L426-434 renders `#{orderNumber}` for non-room, non-dineIn orders. Token display should be conditional on `dailyToken` being present (truthy). Gate by `useToken` setting is optional per owner — daily_token values are returned regardless of `use_token` setting.

### File 4: `api/services/orderService.js`

| Line | Current | Change | Risk |
|------|---------|--------|------|
| L147-159 (KOT payload) | No `daily_token` field | Add: `daily_token: orderData?.dailyToken || '',` | MEDIUM — KOT print payload change |

---

## 4. Downstream Consumers (verify no regression)

| Consumer | Impact |
|----------|--------|
| `socketHandlers.js` → `handleScanNewOrder` → calls `fromAPI.order()` | ✅ Gets new `dailyToken` field automatically |
| `orderService.js` → `fetchSingleOrderForSocket` → calls `fromAPI.order()` | ✅ Gets new field automatically |
| `orderService.js` → `fetchRunningOrders` → calls `fromAPI.orderList()` | ✅ Gets new field automatically |
| `DashboardPage.jsx` → renders `OrderCard` | ✅ Passes order object, OrderCard consumes new field |
| `CollectPaymentPanel.jsx` | ⚪ No impact — doesn't read dailyToken |
| `CartPanel.jsx` | ⚪ No impact — doesn't read dailyToken |
| `OrderEntry.jsx` | ⚪ No impact — doesn't read dailyToken |
| `reportService.js` → order detail sheets | ⚪ No impact — uses separate transforms |
| `AllOrdersReportPage.jsx` | ⚪ No impact — uses report transforms, not fromAPI.order |

**Regression risk:** ZERO on existing functionality. All 4 edits are additive (new fields only).

---

## 5. Owner Decisions

| # | Decision | Status |
|---|----------|--------|
| D-1 | Token display format: `#{orderNumber} · T{dailyToken}` or separate chip? | OPEN — suggest `#{orderNumber} · T{dailyToken}` inline |
| D-2 | Gate display by `useToken` setting, or always show when dailyToken is truthy? | OPEN — cafe103 has `use_token=No` but daily_token still returned. Suggest: always show when truthy (backend controls the setting) |
| D-3 | Token on TableCard.jsx too, or OrderCard only? | OPEN — suggest OrderCard only for v1, extend later |

**Non-blocking:** All 3 decisions have reasonable defaults. Agent can proceed with defaults and owner can override at smoke.

---

## 6. Risk Register

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Print backend rejects unknown `daily_token` field | LOW — backends typically ignore extra fields in `order-temp-store` | Curl-verify print endpoint accepts the field before shipping |
| `daily_token` is null/undefined on some order types | MEDIUM — walk-in or aggregator orders might not have it | Defensive: `|| ''` / `|| null` guards everywhere |
| Visual clutter on small screens | LOW | Token shown only when truthy; compact format |

---

## 7. Summary

- **4 files, 5 edits, ~10-15 lines total**
- **Risk:** MEDIUM (print payload touch)
- **Regression:** ZERO — all changes are additive (new fields only)
- **Conflict:** NONE with in-flight items
- **Backend ask:** NONE — all data already available
- **Owner decisions:** 3 non-blocking (reasonable defaults exist)

---

## 8. Handover to Gate 3

Impact analysis complete for BUG-144. Code Reality: NONE. Conflict pre-check: SAFE.
Files WILL change: `profileTransform.js`, `orderTransform.js`, `OrderCard.jsx`, `orderService.js`
Files WILL NOT touch: `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`, `socketHandlers.js`
Owner decisions: 3 (non-blocking with defaults)
Next: Gate 3 (Implementation Plan) → Gate 4 GO → Implementation
