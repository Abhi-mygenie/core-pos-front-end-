# QA Handover — CR-163 Room-to-Table Split
**Date:** 2026-08-24
**Implementation agent:** Emergent E1
**EXIT GATE:** 5/5 PASS

---

## 1. Verification Matrix Results (self-test)

| Edit | File | Change | Self-Test |
|---|---|---|---|
| 1 | `constants.js:88` | `SPLIT_ROOM_ORDER` key | ✅ grep → 1 hit |
| 2 | `roomService.js:152` | `splitRoomOrder` exported | ✅ grep → 1 hit |
| 3 | `SplitRoomItemsModal.jsx` | NEW — 9825 bytes | ✅ file exists, webpack 0 errors |
| 4a | `CartPanel.jsx:803` | `onSplitItems = null` prop | ✅ grep → 3 hits (decl + condition + onClick) |
| 4b | `CartPanel.jsx:1205` | Trigger button, testid `move-items-trigger` | ✅ grep → 1 hit |
| 5a | `OrderEntry.jsx:7,31` | imports for splitRoomOrder + SplitRoomItemsModal | ✅ grep → 2 hits |
| 5b | `OrderEntry.jsx:146` | `showSplitModal` state | ✅ grep → 2 hits |
| 5c | `OrderEntry.jsx:1189` | `handleSplitRoomItems` handler | ✅ grep → 2 hits |
| 5d | `OrderEntry.jsx:2598` | `onSplitItems` prop on CartPanel | ✅ grep → 1 hit |
| 5e | `OrderEntry.jsx:2722` | SplitRoomItemsModal render | ✅ grep → 1 hit |
| — | Compile | webpack compiled with 1 warning (pre-existing) | ✅ 0 new |

---

## 2. Test Cases for QA Agent

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Trigger visible for room order | Open OrderEntry for a room order with placed food items | "Move Items" button visible in column header (`data-testid="move-items-trigger"`) |
| T2 | Trigger hidden for table order | Open OrderEntry for a regular dine-in table | NO "Move Items" button visible |
| T3 | Trigger hidden when no placed items | Open room order with only unplaced items | NO "Move Items" button visible |
| T4 | Modal opens | Click "Move Items" on room order | SplitRoomItemsModal opens (`data-testid="split-items-modal"`) |
| T5 | Check-in marker excluded | Room order with check-in marker | Marker shown as disabled/greyed (`data-testid="split-item-checkin"`), NOT in selectable list |
| T6 | Item selection | Click a food item row | Row highlights green, CheckCircle2 icon, price turns green |
| T7 | Running total | Select 2 items (e.g. ₹640 + ₹180) | Footer shows "Moving ₹820.00" |
| T8 | Confirm disabled until selection | Open modal, confirm button | Button disabled with text "Select Items" until ≥1 item selected |
| T9 | Confirm button label | Select 2 items | Button shows "Move 2 Items" |
| T10 | Payload to API | Select items + add remark + confirm | Network tab: POST `/api/v2/vendoremployee/order/split-room-order` with `order_detail_ids: [id,id]`, `customer_name: "Room {N}"`, `remark` |
| T11 | Success toast | Successful split | Toast "Items Moved" appears |
| T12 | Modal closes on success | After successful split | Modal closed, back to OrderEntry |
| T13 | Error shown inline | Backend returns error | Error message in `data-testid="split-items-error"` |
| T14 | Cancel button | Click Cancel | Modal closes, no API call |
| T15 | **Regression** — regular transfer | Table order → Transfer item | TransferFoodModal opens normally, unaffected |
| T16 | **Regression** — room checkout | Room order → Collect Bill | Checkout flow unaffected by new prop/button |

---

## 3. Regression Scope

Changes touch `CartPanel.jsx` (additive prop + conditional button) and `OrderEntry.jsx` (R5 hotspot). Required regression:
- T15: item-level food transfer (table→table)
- T16: room checkout / collect bill
- Confirm `onSplitItems` prop default `null` means no button for all non-room callers (DashboardPage does not pass `onSplitItems`)

---

## 4. Registry Sync Confirmation

- registry.json: CR-163 → IMPLEMENTED, pos_6_0 ✅
- EXIT GATE: 5/5 PASS ✅

---

## 5. Credentials + Environment

- Needs **active room order** on preprod for full E2E test
- Test restaurant (has rooms): any hotel/resort account — recommend using preprod restaurant 699 or similar
- Preview URL: `https://core-pos-deploy-12.preview.emergentagent.com`
- Note: splitRoomOrder API call will return 401 on platform preview (expected — preprod backend not connected). Test UI flow + payload shape via Network tab on preprod directly.
