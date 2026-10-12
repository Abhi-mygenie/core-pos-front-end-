# QA Handover — BUG-484
**Date:** 2026-10-01
**Item:** BUG-484 — Room bill-pay payment_amount F&B-only fix
**Implementation agent gate:** GATE_5A complete

---

## 1. Inherited from Plan (Verification Matrix results)

| # | Edit | File | Verification | Self-Test Result |
|---|---|---|---|:---:|
| V1 | E1 — `fbOnlyTotal` var | orderTransform.js:1509 | `const fbOnlyTotal = Math.max(0` present after gstTax line | ✅ PASS |
| V2 | E2 — `payment_amount` | orderTransform.js:1637 | `payment_amount: fbOnlyTotal` | ✅ PASS |
| V3 | E3 — `grant_amount` | orderTransform.js:1653 | `grant_amount: fbOnlyTotal` | ✅ PASS |
| V4 | E4 — `order_amount` | orderTransform.js:1660 | `order_amount: fbOnlyTotal` in spread | ✅ PASS |
| V5 | Non-room unchanged | test | `roomBalance=0 → fbOnlyTotal=finalTotal` | ✅ PASS (unit test V5/V8) |
| V6 | Room F&B-only | test | `payment_amount=228` when finalTotal=1178, roomBalance=950 | ✅ PASS (unit test V6/V9) |
| V7 | Room-only settle=0 | test | `payment_amount=0` when finalTotal=roomBalance | ✅ PASS (unit test V7) |
| V8 | `order_amount` absent non-room | test | key undefined when roomBalance=0 | ✅ PASS (unit test V8) |
| V9 | `order_amount` = fbOnlyTotal | test | emitted when roomBalance>0 | ✅ PASS (unit test V9) |
| V10 | No negative | test | `Math.max(0,…)` clamp | ✅ PASS (unit test V10) |
| V11 | Webpack | build | `yarn build` exit 0 | ✅ PASS |
| V12 | BUG-484 markers | code | `// BUG-484` ×4 in orderTransform.js | ✅ PASS |

**Self-test: 12/12 PASS**

---

## 2. Unit Tests

File: `src/__tests__/api/transforms/orderTransform.bug484.test.js`
Result: **8/8 PASS**

```
✓ V5/V8: non-room order — payment_amount equals finalTotal; no order_amount key
✓ V6/V9: room order F&B=228, roomBalance=950 — payment_amount=228, order_amount=228
✓ V7: room-only settle (finalTotal=roomBalance) — payment_amount=0, order_amount=0
✓ V10: roomBalance > finalTotal — fbOnlyTotal clamps to 0 (never negative)
✓ V9b: roomBalance=0 on a room table — order_amount key absent
✓ REG-1: room order with F&B discount — fbOnlyTotal uses post-discount finalTotal
✓ REG-2: paid_room field still present and set to "yes" for room orders
✓ REG-3: paid_room is empty string for non-room orders
```

---

## 3. Regression Tests for QA Agent

| # | What to verify | Why |
|---|---|---|
| R1 | Dine-in order settle — `payment_amount` = full food total | roomBalance=0; must be byte-identical to pre-fix |
| R2 | Walk-in order settle — `payment_amount` = full food total | Same |
| R3 | Room order settle via POS Collect Payment — `payment_amount` = F&B only | Core fix |
| R4 | Room order settle via PmsCheckoutDrawer — `payment_amount` = F&B only | Calls same collectBillExisting |
| R5 | Room order settle via FolioCheckoutPanel (Front Desk) — `payment_amount` = F&B only | Calls same collectBillExisting |
| R6 | Room order with no F&B (room-only) — `payment_amount = 0` | Handover_5 example D |
| R7 | Room order with F&B + room discount — `payment_amount` = F&B only (discount not in roomBalance) | Handover_5 example A |

---

## 4. QA Test Approach

**Automated (unit tests):** V5–V10, REG-1–REG-3 covered above.

**Manual / curl (preprod):**
- Login with `RID 69` credentials (`pal@soulking.com`)
- Open a room order that has F&B items
- Collect payment → inspect network tab → `order-bill-payment` POST body
- Assert: `payment_amount` = F&B line total only (NOT rent+F&B)
- Assert: `order_amount` = F&B line total only
- Assert: `paid_room = "yes"`
- Assert: `grant_amount` = F&B line total only

---

## 5. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-484
Status: GATE_5A_IMPLEMENTED
Sprint: oct_cr_batch
EXIT GATE: 5/5 PASS

□1 registry.json: GATE_5A_IMPLEMENTED ✅
□2 BUG_TRACKER.md: header updated ✅
□3 FILE_OWNERSHIP.md: BUG-484 section + last-updated header ✅
□4 Code markers: // BUG-484 ×4 in orderTransform.js ✅
□5 Compile: yarn build exit 0, 0 new warnings ✅
```

---

## 6. Credentials + Environment

- Preprod: `https://preprod.mygenie.online`
- Auth: `POST /api/v1/auth/vendoremployee/login` → `{ "email": "pal@soulking.com", ... }`
- Credentials file: `/app/memory/test_credentials.md`
- Test restaurant: RID 69 (Soul King)
- A room order with F&B items required on preprod for R3–R7
