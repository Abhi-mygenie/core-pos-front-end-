# Investigation Report — BUG-413
## PREPAID Badge — Backend Fix Validation

**Date:** 2026-09-15
**Role:** INVESTIGATION (ALPHA v0.7)
**Steps used:** 3/10
**Confidence:** HIGH
**Probe date:** 2026-09-15

---

## 1. Summary

**Finding:** Backend fix is **PARTIAL**. WalkIn bookings now correctly return `pah=True` (PAY AT HOTEL). However, Direct bookings created via the app's own `createDirectReservation` API (booking_id prefix `MG-69-`) still return `pah=False` (shows PREPAID badge). Channel bookings (prefix `San`) show `pah=True` correctly.

**Classification:** PARTIAL_FIX — WalkIn resolved, Direct (MG-69 prefix) still affected
**Confidence:** HIGH — confirmed from live probe of 38 reservations

---

## 2. PAH Field Distribution (live probe, 38 reservations)

| Channel | pah=True | pah=False | Badge shown |
|---|---|---|---|
| WalkIn (18 total) | **18** | 0 | ✅ PAY AT HOTEL — **FIXED** |
| Direct — San prefix (3 total) | **3** | 0 | ✅ PAY AT HOTEL — **FIXED** |
| Direct — MG-69 prefix (12 total) | 0 | **12** | ❌ PREPAID — **STILL BROKEN** |
| booking.com (5 total) | 0 | 5 | ✅ PREPAID — correct (OTA collected payment) |

---

## 3. Key Finding: Two classes of Direct bookings

```
San1ce92d141430   channel=Direct  pah=True   ← channel booking via Aiosell → FIXED ✓
San1eab3a969017   channel=Direct  pah=True   ← channel booking via Aiosell → FIXED ✓

MG-69-24CCA187    channel=Direct  pah=False  ← created via createDirectReservation → STILL BROKEN ✗
MG-69-8859D21E    channel=Direct  pah=False  ← created via createDirectReservation → STILL BROKEN ✗
MG-69-2130DDC6    channel=Direct  pah=False  ← created via createDirectReservation → STILL BROKEN ✗
```

**Booking ID pattern:**
- `San` prefix = Aiosell/channel-sourced bookings → backend fixed pah correctly
- `MG-69-` prefix = bookings created via `/aiosell/direct-reservation` API (our app's New Booking page) → pah still `false`

**Root cause (remaining gap):** The backend fix only covered channel-manager-sourced reservations. The `POST /aiosell/direct-reservation` endpoint (used by New Booking page) still creates reservations with `pah=false`.

---

## 4. What the FE shows today

| Booking source | pah value | Badge shown |
|---|---|---|
| Walk-in | True | PAY AT HOTEL ✅ |
| Aiosell-sourced Direct | True | PAY AT HOTEL ✅ |
| App-created Direct (New Booking) | False | **PREPAID ❌** |
| booking.com | False | PREPAID ✅ (correct — OTA billed) |

---

## 5. Recommendations

1. **Inform backend team:** The `POST /aiosell/direct-reservation` endpoint must also set `pah=true` for bookings created directly through the hotel's own app. Currently only channel-sourced bookings were fixed.

2. **FE workaround (optional, pending backend):** The FE could check `channel === 'Direct' && booking_id.startsWith('MG-')` → show "Direct Booking" label instead of "Prepaid". But this is brittle. Backend fix is the clean solution.

**Evidence:** `evidence/BUG-413/probe_local_reservations_2026_09_15.json`

*Investigation written 2026-09-15 · INVESTIGATION agent (ALPHA v0.7)*
