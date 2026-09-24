# BUG-453 · B0 Evidence — Real FCM Payload → Card orderId Mapping

**Captured:** Feb 2026 session · normal Chrome DevTools console by owner (yabyum preprod)  
**Source:** Foreground `[Notification]` logs + parallel `[SocketHandler]` / `[OrderContext]` logs on the same order  
**Status:** ✅ **PASS** — FCM `data.orderid` value equals order card `orderId` (with `String()` normalization)

---

## Raw payload (as pasted from console)

```json
{
  "from": "969625631640",
  "messageId": "a3ee2448-45ab-459c-8811-10c6875ae62e",
  "notification": {
    "title": "Please confirm this order",
    "body": "Order ID: 000021 \nOrder Type: dinein \nTable No: No Table"
  },
  "data": {
    "sound": "forty_five_sec_buzzer",
    "orderid": "1232751",
    "channel_id": "forty_five_sec_buzzer"
  },
  "fcmOptions": {
    "link": "https://preprod.mygenie.online/dashboard"
  }
}
```

Parallel socket/context events for the same order:

```
[SocketHandler] scan-new-order received: orderId=1232751, fOrderStatus=7, orderFrom=web, hasFullPayload=true
[OrderContext] addOrder: Adding new order 1232751
```

## Mapping table

| Field | Value | Type |
|---|---|---|
| FCM `payload.data.orderid` | `"1232751"` | string |
| Socket `scan-new-order` orderId | `1232751` | number |
| `OrderContext` addOrder key | `1232751` | matches card `order.orderId` |
| Card display number (`notification.body`) | `000021` | display-only, NOT the mute key |

**Comparison:** `String(payload.data.orderid) === String(order.orderId)` → `"1232751" === "1232751"` ✅

## Findings that impact the Gate 3 plan

1. **Field key correction.** The FCM data key is **`data.orderid`** (lowercase, no underscore). The Gate 3 plan referenced `data.order_id`. All BUG-453 mute-lookup code MUST read `payload?.data?.orderid`.
2. **Normalization.** Value arrives as **string**; card `orderId` is **number**. Both sides must be coerced with `String(...)` — this already matches the existing convention (`String(order.orderId)` used by `snoozedOrders` in `DashboardPage.jsx`).
3. **Display number is not the key.** `notification.body` contains `"Order ID: 000021"` (a human-facing sequence). It must not be used for mute lookup.
4. No additional order identifiers (e.g. `restaurant_order_id`, `token_number`) are present in `data`; only `orderid`, `sound`, `channel_id`.

## B0 gate

- [x] Real FCM payload obtained
- [x] Field name identified: `data.orderid`
- [x] Normalization rule confirmed: `String(...)` on both sides
- [x] Value equals visible card `orderId` (`1232751`)
- [x] Display sequence (`000021`) excluded from mute key

**B0: PASS.** Safe to proceed to Gate 4 diff preview for BUG-453 with the field-name correction applied.
