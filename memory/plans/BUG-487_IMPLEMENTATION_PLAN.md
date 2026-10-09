# BUG-487 — Implementation Plan

**ID:** BUG-487
**Gate:** 3 — IMPLEMENTATION PLAN (AMENDED 2026-10-05)
**Date:** 2026-10-05
**Risk:** HIGH
**Scope lock:**
- Files WILL change: `api/transforms/orderTransform.js` · `api/services/roomOrdersService.js`
- Files will NOT touch: `RoomRowCard.jsx`, `RoomOrdersReportPage.jsx`, `RoomOrdersMockup.jsx` (auto-correct via transform fix)

**Amendment note:** Initial plan missed `roomOrdersService.js:42` — a parallel `parseRoomInfo()` function that also reads `roomInfo.discount_amount` directly from the raw API. Both files must be fixed together.

---

## Edit E-1 — orderTransform.js: fix key names + add 3 new fields

**File:** `src/api/transforms/orderTransform.js`
**Lines:** 413–415 (the stale comment + 2 wrong-key lines)

**Current (lines 413–415):**
```javascript
        // BE-2 §4.1 (still pending backend) — keep null fallbacks until BE
        // ships explicit discount fields. Until then, `discount` is derived
        // in RoomRowCard.numbers as (room_price - lodging_collected) on
        // settled rooms.
        discountAmount:     parseFloat(api.room_info.discount_amount) || 0,
        discountReason:     api.room_info.discount_reason || null,
```

**After:**
```javascript
        // BUG-487: backend ships room_discount_amount / room_discount_reason (not discount_amount/discount_reason).
        // "still pending backend" note is now stale — fields confirmed shipped 2026-10-05.
        discountAmount:      parseFloat(api.room_info.room_discount_amount) || 0,
        discountReason:      api.room_info.room_discount_reason || null,
```

**Lines changed:** 3 (2 renamed + comment updated)
**Hotspot R5:** YES — orderTransform.js

---

## Edit E-2 — roomOrdersService.js: fix key name + add new fields in parseRoomInfo()

**File:** `src/api/services/roomOrdersService.js`
**Comment above this block (line ~26):** `"Parse room_info from a raw wrapper into the canonical roomInfo shape. Mirrors orderTransform.js:373-407"`

**Current (line 42):**
```javascript
    discountAmount: parseFloat(roomInfo.discount_amount) || 0,
```

**After:**
```javascript
    // BUG-487: backend ships room_discount_amount (not discount_amount).
    discountAmount: parseFloat(roomInfo.room_discount_amount) || 0,
```

**Lines changed:** 1 (key renamed)

---

| # | Check | Method | Automated? |
|---|-------|--------|:---:|
| V-1 | `orderTransform.js:414` reads `room_discount_amount` (not `discount_amount`) | grep | YES |
| V-2 | `orderTransform.js:415` reads `room_discount_reason` (not `discount_reason`) | grep | YES |
| V-3 | Stale "still pending backend" comment removed | grep | YES |
| V-4 | `roomOrdersService.js:42` reads `room_discount_amount` (not `discount_amount`) | grep | YES |
| V-5 | Non-room orders unaffected (both blocks guarded) | Code confirm | YES |
| V-6 | RoomRowCard `ri.discountAmount` now shows real value (not 0) | Code confirm | NO |
| V-7 | Room Orders Report page discount column now correct | Code confirm | NO |
| V-8 | yarn build exit 0, 0 new warnings | build | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-487 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row BUG-487 updated with GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: api/transforms/orderTransform.js + api/services/roomOrdersService.js — BUG-487 + date
- [ ] Code markers: // BUG-487 on both edited blocks
- [ ] Compile check: yarn build exit 0, 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| R1: `room_discount_amount` is null/undefined on older orders that never had a discount | Already handled — `|| 0` and `|| null` fallbacks preserve existing behavior |
| R2: consumers that relied on `discountAmount === 0` as a "no discount" check | All three consumers use `parseFloat(ri.discountAmount) || 0` already — safe |
| R3: R5 hotspot regression | Non-room paths unaffected; `api.room_info` block is guarded by `api.room_info ?` ternary |
