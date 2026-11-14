# QA Handover — CR-405 Phase A + Phase B
**Date:** 2026-10-01
**Items:** CR-405-A (room discount at checkout) + CR-405-B (order-shifted-room v1)
**Implementation gate:** GATE_5A_PHASE_A_B_IMPLEMENTED
**Phases NOT yet implemented:** D (check-in discount), C (partial_payments_room) — out of scope for this QA run

---

## 1. Inherited from Plan (Verification Matrix results)

### Phase A — FolioCheckoutPanel.jsx (8 edits)

| # | Edit | File | Verification | Self-Test |
|---|---|---|---|:---:|
| E-A1 | roomDiscount/roomDiscountReason state | FolioCheckoutPanel.jsx:115-117 | State declared after payError | ✅ |
| E-A2 | Statement call +4 props | FolioCheckoutPanel.jsx:179-182 | roomDiscount/setRoomDiscount passed | ✅ |
| E-A3 | Statement signature +4 props | FolioCheckoutPanel.jsx:85 | New signature | ✅ |
| E-A3b | RoomSection call +4 props | FolioCheckoutPanel.jsx:93-96 | Props threaded | ✅ |
| E-A4 | RoomSection signature +4 props | FolioCheckoutPanel.jsx:39 | New signature | ✅ |
| E-A4b | Disabled btn → live discount UI | FolioCheckoutPanel.jsx:52-74 | `bill-room-discount-input` + `bill-room-discount-reason` + `bill-room-discount-applied` | ✅ |
| E-A5 | Inject room_discount in handlePaid | FolioCheckoutPanel.jsx:145-152 | room_discount/apply_to/type/value/reason injected when >0 | ✅ |
| E-A5b | handlePaid deps updated | FolioCheckoutPanel.jsx:159 | roomDiscount/roomDiscountReason in deps array | ✅ |

### Phase B — 3 files

| # | Edit | File | Verification | Self-Test |
|---|---|---|---|:---:|
| E-B1 | ORDER_SHIFTED_ROOM v2→v1 | constants.js:96 | `/api/v1/...` | ✅ |
| E-B2 | +roomOrderId in paymentData | CollectPaymentPanel.jsx:1190 | `selectedRoom.orderId` passed | ✅ |
| E-B3 | Rewrite transferToRoom | orderTransform.js:1760-1764 | `{source_order_id, target_order_id, transfer_note}` only | ✅ |

**Unit tests:**
- Phase A: `src/__tests__/components/pms/FolioCheckoutPanel.cr405a.test.jsx` → 8/8 PASS
- Phase B: `src/__tests__/api/transforms/orderTransform.cr405b.test.js` → 8/8 PASS
- Build: `yarn build` exit 0, 0 new warnings

---

## 2. Test Cases for QA Agent

### Phase A: Room discount UI + payload

| # | Test Case | Steps | Expected |
|---|---|---|---|
| TC-A1 | Discount inputs rendered | Open Front Desk → Bill panel for a room | `bill-room-discount-input` and `bill-room-discount-reason` present, NOT disabled |
| TC-A2 | Applied badge hidden at 0 | Bill panel loaded, no value entered | `bill-room-discount-applied` NOT in DOM |
| TC-A3 | Applied badge shown | Enter `100` in discount input | `bill-room-discount-applied` shows `−₹100` in green |
| TC-A4 | Payload — discount > 0 | Enter ₹100, settle order | Network: `room_discount=100`, `room_discount_apply_to=room`, `room_discount_type=Amount` |
| TC-A5 | Payload — no discount | Settle with no discount entered | Network: NO `room_discount` key in POST body |
| TC-A6 | Payload — reason | Enter ₹50 + reason "Test" | Network: `room_discount_reason=Test` |
| TC-A7 | Payload — empty reason → null | Enter ₹50, leave reason blank | Network: `room_discount_reason=null` |
| TC-A8 | BUG-386 regression | Settle room order (any amount) | `room_gst_tax` still present in payload if roomInfo.gstTax > 0 |

### Phase B: order-shifted-room v1 contract

| # | Test Case | Steps | Expected |
|---|---|---|---|
| TC-B1 | Endpoint version | Code check: constants.js ORDER_SHIFTED_ROOM | Value contains `/api/v1/` NOT `/api/v2/` |
| TC-B2 | New payload shape | Code check: transferToRoom output | Only keys: `source_order_id`, `target_order_id`, `transfer_note` |
| TC-B3 | No payment fields | Code check: transferToRoom output | No `payment_mode`, `payment_amount`, `order_discount`, `gst_tax`, `room_id`, `order_id` |
| TC-B4 | roomOrderId flows | CollectPaymentPanel.jsx:1190 | `paymentData.roomOrderId = selectedRoom.orderId` line present |
| TC-B5 | source/target correct | `table.orderId=888, paymentData.roomOrderId=999` | `source_order_id=999`, `target_order_id=888` |
| TC-B6 | Regression — BUG-484 | orderTransform.collectBillExisting (non-room) | `payment_amount = finalTotal` (roomBalance=0 path) |

### Unit test re-runs

| # | Test file | Expected |
|---|---|---|
| UT-1 | `orderTransform.bug484.test.js` | 8/8 PASS |
| UT-2 | `FolioCheckoutPanel.cr405a.test.jsx` | 8/8 PASS |
| UT-3 | `orderTransform.cr405b.test.js` | 8/8 PASS |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| REG-1 | Dine-in settle `payment_amount` unchanged | BUG-484 non-room path must be byte-identical |
| REG-2 | CollectPaymentPanel renders normally on non-room orders | E-B2 is inside `if (paymentMethod === 'transferToRoom')` block |
| REG-3 | `transferToRoom` called from OrderEntry.jsx still works | E-B3 function signature unchanged (_roomId ignored) |
| REG-4 | `paid_room = "yes"` still set on room orders | BUG-484 fix must not affect paid_room |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-484 + CR-405 (Phase A + B)
BUG-484 status: GATE_5A_IMPLEMENTED ✅
CR-405 status:  GATE_5A_PHASE_A_B_IMPLEMENTED ✅
Sprint: oct_cr_batch

Phase A EXIT GATE: 5/5 PASS
  □1 registry.json ✅  □2 CR_REGISTRY.md ✅  □3 FILE_OWNERSHIP.md ✅
  □4 CR-405-A markers ×4 ✅  □5 yarn build ✅

Phase B EXIT GATE: 5/5 PASS
  □1 registry.json ✅  □2 CR_REGISTRY.md ✅  □3 FILE_OWNERSHIP.md ✅
  □4 CR-405-B markers ×3 ✅  □5 yarn build ✅
```

---

## 5. Credentials + Environment

- Preprod: `https://preprod.mygenie.online`
- QA_GOANKITCHEN: `owner@thegoankitchen.com` (credentials in `/app/memory/test_credentials.md`)
- QA_SOULKING: `pal@soulking.com`
- App preview: `https://react-app-preview-14.preview.emergentagent.com`
- Frontend running on port 3000 (supervisor managed)

---

## 6. Files of Reference

| File | Relevant section |
|---|---|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | L39 RoomSection, L85 Statement, L107 FolioCheckoutPanel, L115-117 state, L145-152 handlePaid injection, L159 deps |
| `src/api/constants.js` | L96 ORDER_SHIFTED_ROOM |
| `src/components/order-entry/CollectPaymentPanel.jsx` | L1187-1190 transferToRoom block |
| `src/api/transforms/orderTransform.js` | L1509 fbOnlyTotal, L1637 payment_amount, L1755-1764 transferToRoom |
| `src/__tests__/api/transforms/orderTransform.bug484.test.js` | All tests |
| `src/__tests__/components/pms/FolioCheckoutPanel.cr405a.test.jsx` | All tests |
| `src/__tests__/api/transforms/orderTransform.cr405b.test.js` | All tests |

---

## 7. Scope Note

**In scope this QA run:** BUG-484 + CR-405 Phase A + Phase B
**Out of scope:** CR-405 Phase D (check-in discount) + Phase C (partial_payments_room) — not yet implemented
