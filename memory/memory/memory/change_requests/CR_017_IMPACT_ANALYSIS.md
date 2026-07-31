# CR-017 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-09
**CR:** CR-017 — WhatsApp Payment Link
**Priority:** P1
**Sprint:** POS 4.0

---

## 1. Locked Decisions (from Gate 1 Q&A)

| # | Question | Decision |
|---|---|---|
| Q-017-1 | Placement | **OrderCard only** (not CollectPaymentPanel) |
| Q-017-2 | Channels | **All** (Dine-In, TakeAway, Delivery, Room, Walk-In) |
| Q-017-3 | Order state | **Unpaid + On Hold / Pending Payment only** (fOrderStatus: 7, 1, 2, 5, 8, 9). Hide for 6 (paid), 3 (cancelled). |
| Q-017-4 | Permission | **Reuse existing** (no new permission key) |
| Q-017-5 | Feature flag | **Show for everybody** (no gating for now). Future: backend-driven Razorpay ID flag. |
| Q-017-6 | Amount | **Order actual values** (`order.amount`), no edit |
| Q-017-7 | Missing phone | **Quick popup** — phone input + auto-populate name from order context |
| Q-017-8 | Button label | **WhatsApp icon** (no text label) |
| Q-017-9 | Post-send | **Same icon persists** — no state change. Tap again = resend (backend handles reuse). |

---

## 2. Module Mapping

| Module | Impact | Notes |
|---|---|---|
| **OrderCard.jsx** | HIGH — primary change | Add WhatsApp icon button + popup trigger |
| **api/constants.js** | LOW — add 1 endpoint | `PAYMENT_LINK: '/api/v1/razor-pay/payment-link'` |
| **api/services/paymentLinkService.js** | NEW FILE | API call wrapper |
| **DashboardPage.jsx** | NONE | No changes — OrderCard is self-contained |
| **CollectPaymentPanel.jsx** | NONE | Explicitly out of scope |
| **ChannelColumnsLayout.jsx** | NONE | Passes through OrderCard props unchanged |
| **TableCard.jsx** | NONE | WhatsApp icon is OrderCard-only |

---

## 3. Data Availability Analysis

### Order Object Fields (from orderTransform.js)
| Field | Path | Availability |
|---|---|---|
| `orderId` | `order.orderId` | Always present |
| `amount` | `order.amount` | Always present (post-tax total) |
| `customerName` | `order.customerName` | Present if customer was added to order; empty string if not |
| `customer` | `order.customer` | Display label — may be "Walk-In", "TA", "Del", or actual name |
| `phone` | `order.phone` | Present if customer was added; empty string if not |
| `fOrderStatus` | `order.fOrderStatus` | Always present (number: 1-10) |

### Restaurant Object Fields (from RestaurantContext)
| Field | Path | Availability |
|---|---|---|
| `name` | `restaurant.name` | Always present |

### What's Missing for the API Payload
| API Field | Source | Gap |
|---|---|---|
| `order_id` | `order.orderId` | ✅ None |
| `payment_amount` | `order.amount` | ✅ None |
| `customer_phone` | `order.phone` | ⚠️ May be empty — popup handles this |
| `customer_name` | `order.customerName` | ⚠️ May be empty — popup auto-populates if available, defaults to "Customer" |
| `restaurant_name` | `restaurant.name` | ✅ None |

---

## 4. Visibility Rules (fOrderStatus gating)

| fOrderStatus | Status Name | Show WhatsApp Icon? | Rationale |
|---|---|---|---|
| 7 | Yet to Confirm | ✅ Yes | Unpaid |
| 1 | Preparing | ✅ Yes | Unpaid |
| 2 | Ready | ✅ Yes | Unpaid |
| 8 | Running/Hold | ✅ Yes | On hold — unpaid |
| 5 | Served | ✅ Yes | Unpaid (pending collection) |
| 9 | Pending Payment | ✅ Yes | Explicitly pending |
| 6 | Paid | ❌ No | Already paid |
| 3 | Cancelled | ❌ No | Order cancelled |
| 10 | Reserved | ❌ No | No order yet |

**Implementation:** `const showWhatsApp = ![3, 6, 10].includes(fOrderStatus);`

---

## 5. UI Placement (OrderCard footer) — OWNER APPROVED

Current footer layout:
```
[KOT] [Cancel]  ←spacer→  [Ready / Serve / Bill / Settle / Dispatch]
```

Proposed layout — WhatsApp icon goes in the **left group** after Cancel:
```
[KOT] [Cancel] [WhatsApp]  ←spacer→  [Ready / Serve / Bill / Settle / Dispatch]
```

The WhatsApp icon follows the same 44×44px touch target pattern as KOT and Cancel.
- Icon: WhatsApp brand logo (filled SVG)
- Color: #25D366 (WhatsApp green)
- Border: 1px solid #25D366
- Hover state: light green background (#E8F8ED)

**Visual Mockup:** `/app/frontend/public/cr017-mockup.html`
- Shows 3 card states: Preparing (fOrderStatus=1), Ready (fOrderStatus=2), Served (fOrderStatus=5)
- Owner approved placement on 2026-06-09

---

## 6. Popup Component Design

**Trigger:** Tap WhatsApp icon on OrderCard
**Type:** Small modal / dialog (not a full panel)
**Fields:**
- **Customer Name** — text input, auto-populated from `order.customerName` if available, editable
- **Phone Number** — tel input, auto-populated from `order.phone` if available, editable. 10-digit validation.
- **Amount** — read-only display of `order.amount` (for confirmation, not editable)
- **Send button** — triggers API call

**States:**
- Default: form visible
- Loading: button shows spinner, inputs disabled
- Success: toast "Payment link sent to {phone} via WhatsApp" + close popup
- Resend: toast "Payment link resent to {phone}" (when `source: "db"`)
- Error: toast with error message, popup stays open for retry

---

## 7. Affected Files (Final)

| File | Change Type | Lines (est.) | Risk |
|---|---|---|---|
| `frontend/src/api/constants.js` | Add 1 constant | +1 | ZERO |
| `frontend/src/api/services/paymentLinkService.js` | **NEW** — API wrapper | ~30 | ZERO (isolated) |
| `frontend/src/components/cards/OrderCard.jsx` | Add WhatsApp icon + popup state + handler | ~80 | LOW (additive, no existing logic changed) |
| `frontend/src/components/cards/WhatsAppPaymentModal.jsx` | **NEW** — popup component | ~120 | ZERO (isolated) |

**Total: 2 new files, 2 modified files. ~230 lines added. 0 lines removed/changed.**

---

## 8. Regression Risk

| Area | Risk | Mitigation |
|---|---|---|
| OrderCard footer layout | LOW | Additive — new icon inserted, no existing buttons moved or resized |
| OrderCard performance | ZERO | No new API calls on render; WhatsApp only fires on explicit tap |
| Other card types (TableCard, DineInCard) | ZERO | Not touched |
| CollectPaymentPanel | ZERO | Not touched |
| Order flow (place/update/cancel) | ZERO | Not touched |

---

## 9. Cross-Sprint Dependencies

| File | Other Active CRs | Conflict Risk |
|---|---|---|
| `OrderCard.jsx` | BUG-120 (Menu Mgmt — no OrderCard touch) | NONE |
| `api/constants.js` | Shared — any CR can add endpoints | NONE (additive) |

---

## 10. Test Strategy (Gate 5)

| Test | Type | Description |
|---|---|---|
| T-1 | Manual | WhatsApp icon visible on all unpaid order cards (all channels) |
| T-2 | Manual | WhatsApp icon hidden on paid (6), cancelled (3), reserved (10) cards |
| T-3 | Manual | Tap icon → popup shows with auto-populated name/phone (when available) |
| T-4 | Manual | Tap icon on order without customer → popup shows with empty fields |
| T-5 | Manual | Submit with valid phone → API call → success toast → popup closes |
| T-6 | Manual | Submit with empty phone → validation error (10-digit required) |
| T-7 | Manual | API error → error toast → popup stays open for retry |
| T-8 | Manual | Re-tap icon on same order → popup reopens → send → "resent" toast |
| T-9 | Visual | Icon aligned with KOT/Cancel buttons, 44×44px touch target |

---

*CR-017 Impact Analysis — Gate 2 complete. Ready for Gate 3 (Implementation Plan).*
