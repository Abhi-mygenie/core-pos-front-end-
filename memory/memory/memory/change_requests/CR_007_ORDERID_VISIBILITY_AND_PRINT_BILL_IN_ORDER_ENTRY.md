# CR-007 — Order ID visibility on card + right panel, and Print Bill button in Order Entry

**Status:** Requirements gathering & impact analysis (no code changes yet).
**Author:** Requirement Gathering Agent · 2026-05-01
**Source:** User-reported issues + 3 screenshots (dashboard cards, order entry right panel, collect payment bill summary header).

---

## 1. Issues raised

| # | Issue | Type |
|---|---|---|
| 1 | Order ID not visible on the order card on dashboard | **Missing UI** — data is already on the card (`data-testid="order-card-${orderId}"`), just not rendered |
| 2 | Order ID not visible on the Order Entry right-panel header (must match Collect Bill header behaviour) | **Missing UI** |
| 3 | Print Bill button missing from Order Entry screen — reuse the exact same logic that the OrderCard's Bill button uses ("card bill button"). Do not complicate — no live overrides. | **Feature parity** |

All three are frontend-only. **No backend keys needed, no new APIs.**

---

## 2. Current behaviour — traced in code

### 2.1 Order Card (`components/cards/OrderCard.jsx`)
- **orderId is already resolved** at line 74: `const orderId = order.orderId || order.id;`
- **Used everywhere except display**: in `data-testid` (L267, L325, L671, L735, etc.) and inside toast messages (`Order #${orderId}`, L131, L150).
- **Header layout (L278-320):** `[Logo] [OrderTypeIcon] [Name] [Timeline] — [₹Amount] [PAID badge] [Action icons]`
- **No visible order ID text anywhere** in the header or the card body.

### 2.2 Order Entry right-panel header (`components/order-entry/CartPanel.jsx`)
- Receives `orderId` prop (L271). Passes it only to `<RePrintOnlyButton orderId={orderId} />` (L649, L685).
- **No header text area showing `#<orderId>`** — unlike Collect Bill.
- Collect Bill header for reference (`CollectPaymentPanel.jsx:574-581`):
  ```jsx
  <span className="ml-auto text-sm" style={{ color: COLORS.grayText }}>
    {orderNumber ? `#${orderNumber}` : ''}
  </span>
  ```

### 2.3 Print Bill in Order Entry
- **Only "Re-Print" button exists today** (`CartPanel.jsx:649, 685` → `RePrintOnlyButton`) and it prints **KOT only**, not the bill (`RePrintButton.jsx:50` → `printOrder(orderId, 'kot', stationKot)`).
- Print Bill exists in two other places, both calling `printOrder(orderId, 'bill', ...)`:
  - **OrderCard** (`OrderCard.jsx:120-140`):
    ```js
    await printOrder(orderId, 'bill', null, order, scPctForPrint);
    toast({ title: "Bill request sent", description: `Order #${orderId}` });
    ```
    ⇒ **No live overrides** — uses the stored order state as-is.
  - **CollectPaymentPanel** (`CollectPaymentPanel.jsx:527-559`):
    ```js
    const overrides = { orderItemTotal, orderSubtotal, paymentAmount, discountAmount, ... };
    await onPrintBill(overrides);
    ```
    ⇒ **With live overrides** — reflects in-progress cashier changes. More complex.

**User explicitly said "dont complicate ... it will print what card bill button prints"** ⇒ **reuse OrderCard's approach** (no overrides).

---

## 3. Proposed behaviour

### 3.1 Issue #1 — Order ID on order card header
- Add `#<orderId>` text inline in the header, right before or right after the existing display name.
- Position: between the order-type icon (L291) and the table/customer name (L295-299), OR as a second line under the name.
- Style recommendation: same small-caps gray-text as `{getDisplayName()}` or slightly dimmer to keep visual hierarchy with the amount.

### 3.2 Issue #2 — Order ID in Order Entry right panel header
- CartPanel needs a header row that includes `#<orderId>` (only when `orderId` is set — hide for unplaced/brand-new orders).
- Mirror the exact markup/styling from `CollectPaymentPanel.jsx:578-581`:
  ```jsx
  <span className="ml-auto text-sm" style={{ color: COLORS.grayText }}>
    {orderId ? `#${orderId}` : ''}
  </span>
  ```
- Note: CartPanel today has **no dedicated top-header row**. The header work lives in `OrderEntry.jsx` parent. The display surface for this order ID chip is either (a) a new CartPanel header row, or (b) OrderEntry's existing top header — needs confirmation (see Q-O2 below).

### 3.3 Issue #3 — Print Bill button in Order Entry (reuse OrderCard path)
- Add a **Print Bill** button alongside the existing **Re-Print** button in CartPanel.
- Visibility: same gate as Re-Print — only when `orderId` is set AND there are placed items.
- Click handler: mirror `OrderCard.handlePrintBill` (L120-140) exactly:
  ```js
  const scPctForPrint = restaurant?.autoServiceCharge ? (restaurant?.serviceChargePercentage || 0) : 0;
  await printOrder(orderId, 'bill', null, order, scPctForPrint);
  toast({ title: "Bill request sent", description: `Order #${orderId}` });
  ```
- **No overrides path** — exactly as user requested.
- Recommended placement: same row/section as `RePrintOnlyButton` in `CartPanel.jsx:645-687`. Could be a sibling component `PrintBillButton` in `RePrintButton.jsx` for co-location.

---

## 4. File-by-file impact

| File | Lines | Change | Scope |
|---|---|---|---|
| `components/cards/OrderCard.jsx` | 278-320 (header) | Add `#<orderId>` text span inside the left-section flex row | Issue #1 |
| `components/order-entry/CartPanel.jsx` | header area (no header today — needs small addition) | Add `#<orderId>` chip mirroring CollectPaymentPanel L578-581 | Issue #2 |
| `components/order-entry/OrderEntry.jsx` | wherever it places the Order Entry header (to confirm) | Pass `placedOrderId` / `effectiveTable.orderId` to the header text slot | Issue #2 (may not be needed if CartPanel owns it) |
| `components/order-entry/RePrintButton.jsx` | new export `PrintBillButton` (or inline in CartPanel) | New component calling `printOrder(orderId, 'bill', null, order, scPctForPrint)` | Issue #3 |
| `components/order-entry/CartPanel.jsx` | 649, 685 | Render `<PrintBillButton />` next to `<RePrintOnlyButton />` | Issue #3 |
| Tests | `__tests__/` | Add snapshot tests for order-id visibility; unit test on Print Bill handler | Issues #1, #2, #3 |

**Zero backend changes. Zero transform changes. Zero API changes.**

---

## 5. Code-reuse map (verified)

| Function | Location | Reuse for Issue #3? |
|---|---|---|
| `printOrder(orderId, 'bill', null, order, scPctForPrint)` | `api/services/orderService.js:132-151` | ✅ Direct reuse — same call |
| `toast({ title: "Bill request sent", description: "..." })` | via `useToast` hook | ✅ Direct reuse |
| `handlePrintBill` pattern | `OrderCard.jsx:120-140` | ✅ Copy verbatim into new `PrintBillButton` |
| `scPctForPrint` derivation | `OrderCard.jsx:129` | ✅ Reuse — depends on `restaurant` context |

**No new business logic, no new API, no new state.**

---

## 6. Permission gating (preserve existing)

- `canPrintBill` permission check already exists (`OrderCard.jsx:31`, `CartPanel.jsx:266`). The new Print Bill button in CartPanel MUST honour `canPrintBill` — render nothing when false. Pattern to follow: `CartPanel.jsx:683` already gates `RePrintOnlyButton` behind `canPrintBill`.

---

## 7. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | OrderCard header row is crowded — adding order ID may overflow on narrow cards | Low | Truncate with ellipsis; or show only on hover as secondary label |
| R-2 | CartPanel does not currently render a header section — new layout row may shift downstream content | Low | Keep chip inline near customer fields or within existing header region |
| R-3 | Print Bill without overrides may print stale bill if cashier has edited discount in-session but not placed the order yet | Low (matches OrderCard behaviour, which user explicitly approved) | None — documented as intentional |
| R-4 | Re-Print (KOT) and Print Bill buttons side by side may confuse user | Low | Clear labels — "Re-Print KOT" vs "Print Bill" |

---

## 8. Open questions

| ID | Question | Suggested default |
|---|---|---|
| Q-O1 | Order ID display format: `#001285` or `#1285` or `Order 001285`? | `#<restaurantOrderId>` — matches CollectPaymentPanel |
| Q-O2 | For Issue #2: does the order ID chip live inside CartPanel (right panel), OR in OrderEntry's top header (`OrderEntry.jsx` header bar)? | CartPanel — matches user phrasing "in right panel as we show in collect bill" |
| Q-O3 | Print Bill button in CartPanel — show always (when placed & permission) or only when `hasPlacedItems && !hasUnplacedItems`? | Show always when `orderId && canPrintBill && hasPlacedItems` — same rule as Re-Print at L683 |
| Q-O4 | Print Bill button label and icon: `Print Bill` + Printer icon (matches CollectPaymentPanel L593-604)? | Yes — exact visual parity |
| Q-O5 | For Issue #1 on order card: inline after name, or on a second line? | Inline — keeps single-row layout |

---

## 9. Acceptance criteria

1. Order card on dashboard shows `#<orderId>` in the header row (Issue #1).
2. Order Entry right panel shows `#<orderId>` when an order has been placed (Issue #2) — hidden for brand-new unplaced carts.
3. Order Entry right panel shows a **Print Bill** button when `orderId && canPrintBill && hasPlacedItems` (Issue #3).
4. Clicking Print Bill triggers the same API call flow as OrderCard's bill button (`printOrder(orderId, 'bill', null, order, scPctForPrint)`) and shows the same toast.
5. No regression in existing Re-Print (KOT) button.
6. All additions respect `canPrintBill` permission.

---

## 10. Hand-off note

Frontend-only CR. Zero backend dependencies. Zero parked items.

Suggested implementation sequence:
1. **Issue #1** — single-line change in OrderCard header. 10 minutes.
2. **Issue #2** — CartPanel header chip. 20 minutes.
3. **Issue #3** — new `PrintBillButton` component + wire-up. 30 minutes.

Total effort: ~1 hour. Can go into a single PR.

---

## 11. Decision log

| Date | Decision | Source |
|---|---|---|
| 2026-05-01 | Reuse OrderCard's Print Bill logic (no live overrides), not CollectPaymentPanel's | User ("dont complicate ... what card bill button prints") |
| 2026-05-01 | All 3 issues are frontend-only; no new backend keys or APIs required | Code inspection |
