# CR-405 Evidence — Owner Screenshot: Collect Payment "To Room" UI (2026-10-01)

**Asset URL:** https://customer-assets-lqy194kg.emergentagent.net/job_react-app-preview-14/artifacts/itxjuova_image.png
**Context:** Owner-provided to answer OD-405-05 (where does the shift dine-in UI live)

## What the screenshot shows

- Collect Payment panel, order #000205, Grand Total ₹113
- PAYMENT METHOD row: Cash | UPI | Card | Split | Credit | **To Room** (orange border = selected)
- B2B Invoice (Optional) section below
- **Select Room** section: "3rd floor - Rr3" chip | "first floor - Rr2" chip (active/selected)
- Refresh button next to "Select Room"
- CTA: **"Transfer ₹113 to first floor - Rr2"** (large orange button, bottom)

## Owner instruction

"at collect payment screen option to transfer to room — screenshot given **keep as is**"

## Implication for CR-405 sub-item B

The "To Room" button + room selector + Transfer CTA already exists in the codebase:
- `CollectPaymentPanel.jsx:2792-2799` — "To Room" button, sets `paymentMethod = 'transferToRoom'`
- `CollectPaymentPanel.jsx:1187-1188` — `paymentData.isTransferToRoom = true`
- `OrderEntry.jsx:2095-2096` — calls `orderToAPI.transferToRoom()`
- `orderTransform.js:1743` — stub comment: `Endpoint: POST /api/v2/vendoremployee/order/order-shifted-room`
- `constants.js:96` — `ORDER_SHIFTED_ROOM: '/api/v2/...'` ← **version mismatch** (should be v1)

Sub-item B scope = fix v2→v1 (Fast Lane approved OD-405-06) + validate payload matches handover_5 §6 contract + post-shift settlement uses F&B-only amounts.
