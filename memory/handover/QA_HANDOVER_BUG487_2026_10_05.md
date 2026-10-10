# QA Handover — BUG-487
**Date:** 2026-10-05
**Implemented by:** Implementation agent
**Item:** BUG-487 — orderTransform + roomOrdersService read wrong key `discount_amount` instead of `room_discount_amount`
**Risk:** HIGH (R5 hotspot: orderTransform.js)
**Files changed:**
- `src/api/transforms/orderTransform.js` (R5)
- `src/api/services/roomOrdersService.js`

---

## 1. Verification Matrix Results

| Edit | File | Check | Self-Test Result |
|------|------|-------|:---:|
| E-1 | orderTransform.js:412 | reads `room_discount_amount` | ✅ PASS |
| E-1 | orderTransform.js:413 | reads `room_discount_reason` | ✅ PASS |
| E-1 | orderTransform.js:410–411 | stale "still pending backend" comment removed | ✅ PASS — replaced with BUG-487 comment |
| E-2 | roomOrdersService.js:43 | reads `room_discount_amount` | ✅ PASS |
| V-5 | Both files | Non-room paths unaffected (`api.room_info` block is guarded) | ✅ PASS — grep confirms only room_info block changed |
| V-8 | webpack | 0 new warnings | ✅ PASS — 1 pre-existing warning, unchanged |

**Self-test: 6/6 PASS**

---

## 2. QA Test Cases

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-1 | Room order discount shows correct amount | 1. Login as `owner@thegoankitchen.com` / `Qplazm@10` 2. Navigate to Room Orders report 3. Find a room order that has a discount applied | `discountAmount` displays actual discount value (not ₹0) |
| TC-2 | Room order without discount shows ₹0 | Same — find a room order with no discount | `discountAmount` still shows ₹0 (fallback `\|\| 0` safe) |
| TC-3 | Room Orders Report page discount column | Navigate to `/reports-module/room-orders` — check Discount column | Real discount values populated (was always ₹0 before fix) |
| TC-4 | Non-room order totals unaffected | Place or view a standard dine-in order | Order totals, discounts, payment amounts identical to pre-fix |
| TC-5 | Room payment panel discountAmount | Open CollectPaymentPanel for an occupied room that has a discount | Discount line shows correct amount |

---

## 3. Regression Tests (R5 hotspot — orderTransform.js)

| # | What to verify | Why |
|---|---------------|-----|
| R-1 | Non-room order F&B flow unchanged | orderTransform.js is R5 — `api.room_info` block is guarded, but verify no bleed |
| R-2 | Room F&B payment total correct (BUG-484 path) | fbOnlyTotal logic at lines 1505–1509 must not be affected by E-1 |
| R-3 | `roomOrdersService.parseRoomInfo()` null guard intact | Pass null roomInfo → should return null (line 27: `if (!roomInfo) return null`) |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-487
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
  □1 registry.json: PASS
  □2 BUG_TRACKER.md: PASS
  □3 FILE_OWNERSHIP.md: PASS (both files)
  □4 Code markers (1× per file): PASS
  □5 Compile (0 new warnings): PASS
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | `https://core-pos-deploy-32.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Test login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Key routes | `/reports-module/room-orders` · CollectPaymentPanel for RM rooms |

---

## 6. Scope Lock

- **Files changed:** `api/transforms/orderTransform.js` + `api/services/roomOrdersService.js`
- **Files NOT touched:** `RoomRowCard.jsx`, `RoomOrdersReportPage.jsx`, `RoomOrdersMockup.jsx` (auto-correct via transform fix)
- **NOT in scope:** `roomDiscountAt`, `roomDiscountDetail`, `roomDiscountType` (CR-407 scope)
- **Scope expansion:** NONE
