# CR-007 / Bucket A2 — Order ID Chip + Print Bill Button — Implementation Handover

**Status:** SHIPPED 2026-05-02. All owner-approved edits applied + validated.
**Author:** Implementation Agent · session 2026-05-02.
**Source planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.A2 + `/app/memory/handover/NEXT_AGENT_PICKUP_A2.md`.
**Predecessors:** Previous agent applied Bucket A2.1 Change 1 only (auto-committed in `b411d40`); A2.1 was half-applied at session start → reverted → re-shipped atomically by this session.

---

## 1. Bucket implemented

| Item | Detail |
|---|---|
| CR | CR-007 — Order ID visibility + Print Bill in Order Entry |
| Bucket | A2 (Phase A of CR-007) — three in-scope sub-buckets: A2.1 (dashboard card row split), A2.2 (chip in OrderEntry middle-panel header), A2.3 (Print Bill button in OrderEntry right-panel header) |
| In-scope bug fix | **BUG-PREPAID-MERGE-SHIFT** — Merge / Table-Shift buttons hidden on prepaid dine-in cards |
| In-scope polish | A2.1 chip ↔ amount spacing (`ml-2` on amount span) |

---

## 2. User approvals received

| Gate | Approved by | When |
|---|---|---|
| A2 Approval Gate (main handover §10.A2) | Owner | Session 2026-05-02 |
| A2.1 revert (half-applied) | Owner | Session 2026-05-02 |
| A2.1 atomic re-apply (Change 1+2+3) | Owner ("Apply") | Session 2026-05-02 |
| Bug fix A + Spacing polish B + CartPanel A2.2 (original) | Owner ("Apply A+B+C together") | Session 2026-05-02 |
| A2.2 relocation to OrderEntry middle-panel header (hotspot override) | Owner ("Apply both edits") | Session 2026-05-02 |
| A2.3 PrintBillButton (hotspot edit) | Owner ("Apply") | Session 2026-05-02 |
| A2.3 drop `canPrintBill` gate + move chip to middle-panel header | Owner ("Apply") | Session 2026-05-02 |
| Final code review gate | Owner ("Approved") | Session 2026-05-02 |

---

## 3. Open questions answered

| Q | Decision |
|---|---|
| Q-O1 — Order ID format | `#<orderId>` raw, no padding (all surfaces) |
| Q-O2 — Issue #2 chip location | Final: OrderEntry middle-panel header, between spacer and action icons (iterated from CartPanel → OrderEntry-right-panel → OrderEntry-middle-panel based on owner feedback) |
| Q-O3 — Print Bill visibility gate | **Relaxed** from handover's `canPrintBill && hasPlacedItems && orderId` to match CollectPaymentPanel: `hasPlacedItems && orderId`. Owner-directed to match existing CollectPaymentPanel Print Bill gate (no permission gate). |
| Q-O4 — Button label / icon / styling | Reused CollectPaymentPanel:593-605 styling verbatim; click handler mirrors OrderCard.handlePrintBill (honours `autoServiceCharge`, no live overrides) |
| Q-O5 — OrderCard layout for Issue #1 | Split header into 3 rows: row 1 = `[icon] [name] [#orderId chip]`; row 2 = full-width `<OrderTimeline />` sibling; row 3 = existing order-note. Amount + merge/shift buttons continue in row 1 right half. |
| BUG-PREPAID-MERGE-SHIFT — fix location | Gate Merge (L343-344) + Table-Shift (L358-359) buttons on `order.paymentType !== 'prepaid'` |

---

## 4. Files changed

### 4.1 Net file changes (committed to working tree / HEAD)
| File | Net change | Shipped edits |
|---|---|---|
| `frontend/src/components/cards/OrderCard.jsx` | Modified (committed in HEAD `b411d40` + auto-commits) | A2.1 row split, prepaid bug gate × 2, `ml-2` spacing polish |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Modified | Import `PrintBillButton`, chip in middle-panel header (L990-1003), Print Bill render in right-panel header (L1622-1631 area after final refactor) |
| `frontend/src/components/order-entry/RePrintButton.jsx` | Modified | `useOrders` added to imports; new `PrintBillButton` named export |

### 4.2 Files transiently touched then reverted
| File | Note |
|---|---|
| `frontend/src/components/order-entry/CartPanel.jsx` | Owner's initial instruction (A2.2 v1) placed a dedicated `#orderId` row at top of CartPanel. Owner then redirected the chip to OrderEntry header. CartPanel.jsx was reverted to baseline in a later edit. Net delta vs HEAD: **0 LOC**. |

### 4.3 Files NOT touched (preserved)
`CollectPaymentPanel.jsx`, `stationService.js`, `OrderContext.jsx`, `printService.js` — none modified (by design per pickup handover §5).

---

## 5. Before / after behaviour

### 5.1 Dashboard order cards (`/dashboard`)
| Element | Before | After |
|---|---|---|
| Row 1 | `[icon] [name] [inline OrderTimeline] ... [₹amount] [PAID] [Merge] [Shift]` | `[icon] [name] [#orderId chip] ... [₹amount] [PAID] [Merge?] [Shift?]` — merge/shift hidden on prepaid |
| Row 2 | Order-note (if any) | **NEW** full-width `<OrderTimeline />` sibling |
| Row 3 | — | Order-note (if any; relocated and renumbered) |
| Amount ↔ chip gap | N/A (chip didn't exist) | `ml-2` on amount span → visible breathing room |
| Prepaid + dine-in | Merge + Table-Shift visible (bug) | Both hidden (financial-record integrity) |

### 5.2 Order Entry (`/order-entry/:tableId`)
| Element | Before | After |
|---|---|---|
| Middle-panel header (with Search, `+`, Notes, Customer icons) | Search / flex-spacer / action icons | Search / flex-spacer / **`#orderId` chip (when placed)** / action icons |
| Right-panel header (with `[TakeAway ⌄] ... [X Cancel]`) | `[order-type pill] ... [spacer] [Cancel]` | `[order-type pill] [Print Bill button] ... [spacer] [Cancel]` |
| Print Bill visibility | No button existed | Visible when `hasPlacedItems && orderId` (matches CollectPaymentPanel gate) |
| CartPanel footer Re-Print KOT | Works | Unchanged |
| CollectPaymentPanel internal Print Bill | Works | Unchanged (separate code path) |

### 5.3 Click flow — new Print Bill button
1. User clicks `Print Bill` in OrderEntry header.
2. Button enters `isPrintingBill=true` state → label flips to `Printing…`, disabled.
3. `getOrderById(orderId)` resolves live order from `useOrders()`.
4. `scPctForPrint = restaurant?.autoServiceCharge ? restaurant?.serviceChargePercentage || 0 : 0` (mirrors OrderCard.handlePrintBill).
5. `printOrder(orderId, 'bill', null, order, scPctForPrint)` fires.
6. Toast "Bill request sent — Order #<orderId>" on success; "Failed to send Bill request" on error.
7. Button re-enables.

---

## 6. API / socket / state assumptions

- **APIs:** Reuses existing `printOrder('bill', ...)` → `POST /api/v1/vendoremployee/order/order-temp-store`. **No new endpoint. No backend contract change.**
- **Sockets:** No new socket event emission/consumption. Engagement lock logic in `socketHandlers.js` untouched.
- **State:**
  - `OrderCard.jsx` reads `orderId` from props (already resolved in component at L74). No new prop drilling.
  - `OrderEntry.jsx` resolves chip/button display via `effectiveTable?.orderId || placedOrderId` (existing pattern at L892, L917, L923). No new state introduced.
  - `PrintBillButton` is self-contained: uses `useOrders()` + `useRestaurant()` + `useToast()`; internal `useState` for `isPrintingBill`.
- **Permissions:** Final implementation does NOT gate on `canPrintBill` permission per owner directive (mirrors CollectPaymentPanel's existing Print Bill button which has no permission gate).

---

## 7. Validation performed

### 7.1 Static checks
- ESLint clean on all 3 modified files.
- Webpack compiled with only the pre-existing `LoadingPage.jsx:111` baseline warning (unchanged from session start).
- No new TypeScript / React warnings introduced.

### 7.2 Manual UI validation (owner-driven Pass)
Checklist (all passed):
- A2.1 row-split renders correctly on dashboard order cards (all order types, prepaid + postpaid).
- Prepaid dine-in cards: no Merge / Table-Shift buttons. Non-prepaid dine-in: Merge + Shift visible.
- Chip ↔ amount have clear gap (no overlap on narrow cards).
- `#orderId` chip appears in OrderEntry middle-panel header when `orderId` is set.
- Print Bill button appears in OrderEntry right-panel header when `hasPlacedItems && orderId`.
- Print Bill click → toast "Bill request sent — Order #<id>".
- Brand-new carts (no items placed) → no chip, no Print Bill button.
- Collect Bill's internal Print Bill button (CollectPaymentPanel) still works.
- Re-Print KOT footer button still works.

### 7.3 Validation NOT performed
- Automated unit / component tests (project has no testing-library setup; `ItemCustomizationModal.test.jsx` absent per pickup handover §6 TEST-INFRA-001).
- Printer hardware round-trip (relied on toast confirmation + `printOrder` return resolving).
- Role-matrix sweep (cashier / manager / owner / waiter). Permission gate was dropped per owner directive, so effectively all logged-in users with placed items can see the button.
- Network / FCM / socket flood scenarios.

---

## 8. Regression checklist result

From the cross-bucket regression list (main handover §11):

| Item | Result |
|---|---|
| Dashboard card rendering — all order types | ✅ Pass |
| Prepaid badge rendering | ✅ Unchanged |
| Dashboard filtering by status / table / type | ✅ Pass |
| OrderTimeline still renders on dashboard (now in row 2) | ✅ Pass |
| OrderCard cancel / snooze / address popup | ✅ Unchanged |
| OrderEntry engagement / disengagement flow | ✅ Unchanged (no handler touched) |
| OrderEntry Collect Bill flow | ✅ Unchanged |
| CartPanel — Re-Print KOT, place items, remove items, note entry | ✅ Unchanged |
| CollectPaymentPanel — Print Bill, Split Bill, payment methods | ✅ Unchanged |
| Web / scan / PG orders | ✅ No regression observed (but see CR-011 for a pre-existing unrelated PG serve bug surfaced this session) |

---

## 9. Known limitations

1. **No permission gate on Print Bill.** Deliberately dropped per owner directive. If a role-specific hide is later required, add `canPrintBill &&` back to the gate at `OrderEntry.jsx` where `<PrintBillButton>` is rendered.
2. **Print Bill JS handler uses `autoServiceCharge` gate.** Differs from CollectPaymentPanel which uses raw `serviceChargePercentage` with live payment-overrides. Handover Q-O4 explicitly chose the OrderCard pattern; no live overrides path exposed here.
3. **Hotspot edit acknowledged.** `OrderEntry.jsx` is in the hotspot list (see pickup handover §5). Two small insertions were made with owner's explicit override. No other hotspot-critical logic was disturbed.
4. **`cancel_by_name` path unchanged.** The prepaid bug fix is purely a render gate; the underlying cancellation actor attribution issue is tracked separately under B3 / BE-V.

---

## 10. Backend pending items (none for A2)

**No backend dependency created or satisfied by A2.** All changes are pure frontend. The backend asks currently tracked (BE-T, BE-U, BE-V, BE-W) belong to parked buckets A3/A4/B3/B4 and are unrelated.

---

## 11. QA instructions

### 11.1 Smoke test (2 minutes)
1. Log in to POS (any role).
2. Dashboard: verify order cards render 3-row header: (1) info + chip, (2) timeline, (3) order-note.
3. Find a PAID / prepaid dine-in order → confirm Merge + Table-Shift icons NOT in header.
4. Find a postpaid dine-in order → confirm Merge + Table-Shift icons ARE in header.
5. Click any placed order → OrderEntry opens:
   - Middle-panel header: `#<orderId>` chip visible between search spacer and `+` icon.
   - Right-panel header: orange `[order-type ⌄]` pill, then `[Print Bill]` button, then X Cancel.
6. Click Print Bill → toast "Bill request sent — Order #<id>" appears; bill prints.
7. Open a new cart (no items placed yet): no chip, no Print Bill button.

### 11.2 Regression sweep (5 minutes)
- Place a walk-in order → confirm chip appears after place-order, Print Bill works.
- Take-away order with PG payment → confirm the bug surfaced in CR-011 is unchanged (stays on screen after serve — not fixed by A2; separate ticket).
- Open CollectPaymentPanel → internal Print Bill still works.
- Cart footer Re-Print KOT still works.
- Order-type dropdown still opens/closes when clicking the orange pill.
- Cancel Order modal still opens from X Cancel.

### 11.3 Edge cases to watch
- Very narrow viewport (<1024px) — right-panel flex row should still keep Print Bill next to the order-type pill without overflow.
- Very long customer names in row 1 — truncation on name should still kick in before the chip overflows; chip has `flex-shrink-0` so it stays intact.
- Rapid Print Bill clicks → second click should be disabled (`isPrintingBill` guard).
- Prepaid order that was edited after prepay and still has unserved items → verify Settle button branch (existing CollectPaymentPanel logic; unchanged).

---

## 12. Next recommended bucket

Per owner selection post-A2: parking sweep followed by B2-split or B1.

State at end of this handover:
- **Parked:** A3 (BE-T), A4 (BE-U), B3 (BE-V), B4 (BE-W) — see `CR_BUCKETS_A3_A4_PARKED_HANDOVER.md`
- **CR-011 opened** — PG-paid scan order stays on screen after Mark-Served; parked for owner DevTools validation; 1-line fix ready at transform boundary.
- **Remaining unblockable buckets:** B2 (to be scoped down to 2-col split per owner), B1 (after Q-V4 preprod trace), D1 (hotspot, needs go-ahead).
- **A2 complete.**

---

## 13. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-02 | Implementation Agent | Initial handover written. |

---

*End of Bucket A2 implementation handover.*
