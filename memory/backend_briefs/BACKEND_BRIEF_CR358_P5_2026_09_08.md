# BACKEND BRIEF — CR-358-P5 + BUG-384
## PMS Phase 5: Rates & Restrictions + Mark No-Show + room-payment 403

**From:** MyGenie POS frontend team
**To:** Backend / Dev team
**Date:** 2026-09-08
**Priority:** P1 — blocks Gate 3 implementation planning for CR-358-P5
**Related items:** CR-358-P5, BUG-384 (OG-PMS-014), B-P5-01, B-P5-02, B-P5-03

---

## What we have already confirmed (no action needed)

Fresh probes run today against preprod (restaurant 69, sandbox-pms). These are resolved — listing them so you have full context:

| Endpoint | Status | Notes |
|---|---|---|
| `POST /aiosell/fetch-rates` | ✅ Working | Returns 8 rateplans, camelCase keys (`roomCode`, `rateplanCode`, `rate`) |
| `POST /aiosell/push-rates` | ✅ Working | HTTP 200, "Rates pushed successfully". Probe 11b verified a live push. Accepts snake_case (`room_code`, `rateplan_code`, `rate`) |
| `POST /aiosell/push-inventory-restrictions` | ✅ Route live, hits Aiosell | Question below on `restrictions[]` content |
| `POST /aiosell/push-rate-restrictions` | ✅ Route live, hits Aiosell | Question below on `restrictions[]` content |
| `POST /aiosell/fetch-inventory` | ✅ Working | Returns `available` count per `roomCode` per date |
| `POST /aiosell/mark-no-show` | ✅ Route live | Question below on failure case |

---

## Questions — we need answers before writing the implementation plan

---

### Q1 — `restrictions[]` item schema for push-inventory-restrictions and push-rate-restrictions

**The problem:**

We probed both endpoints with an empty `restrictions: []` array. Both hit Aiosell and got back "Payload Parsing Failed!" — so the route works and our payload is structurally correct, but Aiosell rejects empty restrictions. We need to know what goes inside each restriction item.

**What we observed Aiosell receiving (your backend's translation):**

For `push-inventory-restrictions`:
```json
{
  "hotelCode": "sandbox-pms",
  "toChannels": ["booking.com"],
  "updates": [{
    "startDate": "2026-09-20",
    "endDate": "2026-09-20",
    "rooms": [{
      "roomCode": "executive",
      "restrictions": []        ← Aiosell rejected empty array
    }]
  }]
}
```

For `push-rate-restrictions`:
```json
{
  "hotelCode": "sandbox-pms",
  "toChannels": ["booking.com"],
  "updates": [{
    "startDate": "2026-09-20",
    "endDate": "2026-09-20",
    "rates": [{
      "roomCode": "executive",
      "rateplanCode": "executive-s-ep",
      "restrictions": []        ← Aiosell rejected empty array
    }]
  }]
}
```

**What we need:**

The schema for a single item inside `restrictions[]`. For example, for a stop-sell restriction, we'd expect something like:
```json
{ "type": "stop_sell", "value": true }
```
...but we don't know the actual field names, valid types, or value formats.

**Please provide:**
1. One example `restrictions[]` item for `push-inventory-restrictions` (e.g. a stop-sell)
2. One example `restrictions[]` item for `push-rate-restrictions` (e.g. a min-LOS or CTA/CTD)
3. Full list of valid `type` values / restriction codes for each endpoint
4. Valid values for `to_channels[]` — is `"booking.com"` correct, or should it be a different format?

---

### Q2 — mark-no-show returning "Failed to mark noshow" for a booking.com booking

**What we tried:**

```
POST /api/v2/vendoremployee/aiosell/mark-no-show
Body: { "booking_id": "BDC7497606" }
Response: HTTP 422 — {"status":false,"message":"Failed to mark noshow"}
```

**Booking state:**
```
booking_id:   BDC7497606
channel:      booking.com
checkin:      2026-09-07   ← yesterday, guest never arrived
checkout:     2026-09-09
operational_status: pending   ← still pending, not departed
```

This is exactly a no-show scenario: booking.com booking, check-in date was yesterday, guest never arrived. But the endpoint returns "Failed to mark noshow."

**What we need:**

| | Answer |
|---|---|
| Q2-a | What state must a booking be in for mark-no-show to succeed? (e.g. must operational_status be something specific? Must the check-in date be exactly today — not yesterday?) | |
| Q2-b | Does mark-no-show call Aiosell to release inventory? If yes, does it also update `operational_status` on `local-reservations` to a specific value (e.g. `no_show`)? | |
| Q2-c | The earlier confirmed probe (2026-09-04, booking `BDC8899464`) worked for OTA channel. Is there something sandbox-specific about BDC7497606 that makes it fail? | |

---

### Q3 — GAP-09: Does checkout release inventory on Aiosell?

**Context:** When a guest checks out via `POST .../order/order-bill-payment`, does the backend automatically push updated inventory to Aiosell (so the room appears available on OTA channels)?

**What we need:**

| | Answer |
|---|---|
| Q3-a | Is inventory auto-pushed to Aiosell on checkout? (YES / NO) | |
| Q3-b | If YES — is there any case where the push can silently fail (e.g. if Aiosell is down)? Does your system surface this failure to the caller? | |
| Q3-c | If NO — should the frontend call `push-inventory` after checkout, or is this handled another way? | |

---

### Q4 — BUG-384: POST room-payment 403 (OG-PMS-014)

**What we observed:**

```
POST /api/v2/vendoremployee/pos/room-payment
Auth: owner@thegoankitchen.com  (restaurant 69, sandbox-pms)
Body: { "order_id": 1232218, "amount": 100, "payment_type": "cash" }
Response: HTTP 403
```

The endpoint is defined and the FE is already wired to it (`constants.js`). The 403 fires before input validation — it's a permission check failure, not a bad request.

**What we need:**

| | Answer |
|---|---|
| Q4-a | Is `room-payment` permission-gated by role, and does the sandbox-pms owner role lack this permission? | |
| Q4-b | If yes — can you grant this permission to `owner@thegoankitchen.com` on sandbox-pms (restaurant 69) so we can test the Guest Folio Record Payment flow? | |
| Q4-c | Is there a different endpoint we should be calling for PMS room payment, or is `POST /api/v2/vendoremployee/pos/room-payment` the correct one? | |

**Impact:** This blocks the entire "Record Payment" action on the Guest Folio Detail page (CR-364). Read-only folio display works fine. The frontend has no workaround — it cannot collect room payments until this 403 is resolved.

---

## Probe summary (fresh 2026-09-08)

| Probe # | Endpoint | HTTP | Result |
|---|---|---|---|
| P5-1 | `POST fetch-rates` (7-day window) | 200 | 8 rateplans, 2 room codes |
| P5-2 | `POST push-rates` (empty body) | 422 | Required fields: `start_date`, `end_date`, `rates` |
| P5-5 | `POST push-rates` (with rates[{}]) | 422 | Required: `rates.0.room_code`, `rates.0.rateplan_code`, `rates.0.rate` |
| P5-11b | `POST push-rates` (snake_case correct body) | **200** | "Rates pushed successfully" ✅ |
| P5-3 | `POST push-inventory-restrictions` (empty body) | 422 | Required: `start_date`, `end_date`, `to_channels`, `rooms` |
| P5-12 | `POST push-inventory-restrictions` (rooms[{room_code, restrictions:[]}]) | 422 | "Payload Parsing Failed" at Aiosell — restrictions[] empty |
| P5-4 | `POST push-rate-restrictions` (empty body) | 422 | Required: `start_date`, `end_date`, `to_channels`, `rates` |
| P5-13 | `POST push-rate-restrictions` (rates[{room_code, rateplan_code, restrictions:[]}]) | 422 | "Payload Parsing Failed" at Aiosell — restrictions[] empty |
| P5-9 | `POST mark-no-show` {booking_id: BDC7497606} | 422 | "Failed to mark noshow" |
| P5-14 | `POST mark-no-show` {booking_id: CM-BDC7497606} | 422 | "Reservation not found" |
| P5-10 | `POST fetch-inventory` (3-day window) | 200 | available counts per roomCode per date ✅ |
| P9 | `POST room-payment` | **403** | Permission denied (BUG-384) |

---

## What we can build without your answers

To avoid blocking development, here is what we can proceed with immediately vs what is gated on your replies:

| Feature | Can build now? | Gated on |
|---|---|---|
| View current rates (fetch-rates) | ✅ Yes | — |
| Push rates to OTAs | ✅ Yes | — |
| Inventory restrictions UI | ❌ No | Q1 (restrictions[] schema) |
| Rate restrictions UI | ❌ No | Q1 (restrictions[] schema) |
| Mark No-Show button + flow | ⚠️ Partially — can build UI, need QA data | Q2 (failure reason + state requirements) |
| Guest Folio Record Payment | ❌ No | Q4 (403 fix) |

---

## Reply format

Please copy-paste and fill in:

```
Q1 — restrictions[] schema:
  push-inventory-restrictions example restriction item: ___
  push-rate-restrictions example restriction item: ___
  Valid restriction types: ___
  Valid to_channels[] values: ___

Q2 — mark-no-show:
  Q2-a (required booking state): ___
  Q2-b (does it update operational_status + release inventory?): ___
  Q2-c (BDC7497606 sandbox issue?): ___

Q3 — checkout inventory release:
  Q3-a (auto-pushed on checkout?): YES / NO
  Q3-b (silent failure possible?): ___
  Q3-c (if NO, how should FE handle?): ___

Q4 — room-payment 403:
  Q4-a (role permission gap?): YES / NO
  Q4-b (can you grant permission to restaurant 69?): YES / NO
  Q4-c (correct endpoint?): YES / different: ___
```

---

*Written by: Frontend agent | 2026-09-08 | Source: 15 fresh probes on preprod (restaurant 69)*
*Investigation report: `memory/evidence/INV-OG-PMS-010-013-014-015/INVESTIGATION_REPORT_2026_09_08.md`*
*Related intake: `memory/change_requests/CR-358-P5_PMS_RATES_RESTRICTIONS_NO_SHOW_INTAKE.md`*
