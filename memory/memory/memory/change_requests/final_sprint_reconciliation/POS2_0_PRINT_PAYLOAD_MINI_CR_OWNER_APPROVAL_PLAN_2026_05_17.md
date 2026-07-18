# POS2.0 Print Payload Mini-CR — Owner Approval Plan — 2026-05-17

## 1. Purpose

Two focused fixes to the temp-store print payload (`POST /order-temp-store` payload built by `buildBillPrintPayload`), raised by owner mid-Wave-4, BEFORE Wave 4 BUG-059 is finalised.

This is a **mini change request** scoped exclusively to:
1. `grant_amount` / `payment_amount` unification for room orders.
2. New backend-requested `rtype` key on the temp-store print payload.

**Explicitly OUT of scope** (per owner directive): tax, GST, VAT, service charge, item totals, printer mapping, or any other bill-print field.

**No source files have been edited.** Inspection only.

---

## 2. Repo / Commit State

| Item | Value |
|---|---|
| Repo | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Base | `e0293f8c` |
| Wave 4 in flight | BUG-050 ✅, BUG-057 ✅ applied; BUG-059 ⏸ paused on this mini-CR |
| Commit allowed | No |

---

## 3. Owner-Confirmed Spec

| Q | Owner Answer | Locked Decision |
|---|---|---|
| Q1 — Corrected `grant_amount` for room orders | **Y** — match Grand Total = `effectiveTotal` (= ₹11,510 for owner's order #102) | Unify on single source = `effectiveTotal` from CollectPaymentPanel; kill the in-transform recompute |
| Q2a — `rtype` scope | **(i)** | Add `rtype` ONLY on the temp-store print payload (`buildBillPrintPayload`). Do NOT touch `order-bill-payment` or any other endpoint payload. |
| Q2b — `rtype` values | **(1)** | Binary: `"RM"` if `order.isRoom === true`, else `"TB"`. Walk-in / takeaway / delivery all = `"TB"`. |

---

## 4. Evidence From Live Order #102 (owner@18march.com)

| UI line | Amount |
|---|---|
| Food Total (Room Orders) | ₹2,676 |
| Transferred Total (2 orders) | ₹1,834 |
| Room Balance | ₹7,000 |
| **GRAND TOTAL (Checkout)** | **₹11,510** |

- `effectiveTotal` (live in CollectPaymentPanel) = **11,510**
- `finalTotal` (food only) = 2,676
- `roomBalance` = 7,000
- `associatedTotal` = 1,834

### Current behavior

| Endpoint | Field | Value (today) | Computed how |
|---|---|---|---|
| `order-bill-payment` | `grant_amount` | **11,510** ✅ | `paymentData.finalTotal` set to `effectiveTotal` in CollectPaymentPanel L696 |
| `order-temp-store` (print) | `grant_amount` | **buggy** — can land at 2,676 | `roomFinalPaymentAmount = finalPaymentAmount + associatedTotal + roomBalance` — fragile recompute reading socket-hydrated `order.associatedOrders` and `order.roomInfo.balancePayment`; if either is missing/stale the room balance and associated never get added and the field collapses to food-only |
| `order-temp-store` (print) | `payment_amount` | same bug — same recompute | same recompute |
| `order-temp-store` (print) | `rtype` | **not emitted** | new key required by backend |

### Target behavior

| Endpoint | Field | Value (target) | Computed how |
|---|---|---|---|
| `order-bill-payment` | `grant_amount` | 11,510 | **unchanged** — still `effectiveTotal` |
| `order-temp-store` | `grant_amount` | 11,510 | **single source**: caller (CollectPaymentPanel) passes `effectiveTotal` as `overrides.paymentAmount`; transform writes it through unchanged |
| `order-temp-store` | `payment_amount` | 11,510 | same single source |
| `order-temp-store` | `rtype` | `"RM"` (room) / `"TB"` (else) | `order.isRoom ? 'RM' : 'TB'` |

For non-room orders: `effectiveTotal === finalTotal` (associatedTotal=0 + roomBalance=0), so the on-the-wire numbers are **bit-identical** to today.

---

## 5. Fix Plan

### Fix 5.1 — `grant_amount` unification (Q1=Y)

| Step | File | Change |
|---|---|---|
| 5.1.a | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L770 | `paymentAmount: finalTotal` → `paymentAmount: effectiveTotal`. Adds comment ref to this mini-CR. |
| 5.1.b | `frontend/src/api/transforms/orderTransform.js` L1671-1677 | Remove the room-add-back recompute block. `roomFinalPaymentAmount` const is deleted. |
| 5.1.c | `frontend/src/api/transforms/orderTransform.js` L1683-1684 | `payment_amount: roomFinalPaymentAmount` / `grant_amount: roomFinalPaymentAmount` → `payment_amount: finalPaymentAmount` / `grant_amount: finalPaymentAmount`. Update the surrounding REQ3 comment block (L1630-1643) to reflect the new contract: caller passes the full payable; transform writes through. |
| 5.1.d | `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js` L93-116 | Re-baseline the "room override branch" test: pass `paymentAmount: 676` (effectiveTotal-style) and expect `payment_amount: 676`. The test name + comment updated to reflect new contract. |

### Fix 5.2 — `rtype` key (Q2a=i, Q2b=1)

| Step | File | Change |
|---|---|---|
| 5.2.a | `frontend/src/api/transforms/orderTransform.js` `buildBillPrintPayload` return object (~L1731 area) | Add `rtype: order.isRoom ? 'RM' : 'TB',` to the returned payload. Comment cross-refs this mini-CR. |
| 5.2.b | `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js` | Add small regression assertions: non-room test expects `payload.rtype === 'TB'`; room tests expect `payload.rtype === 'RM'`. |

---

## 6. Files NOT Touched

- `api/transforms/orderTransform.js` — every other field (tax, GST, VAT, service charge, item totals, discounts, tips, delivery, room enrichment fields like `roomRemainingPay`/`roomAdvancePay`, `associated_orders`, `cgst_amount`/`sgst_amount`).
- `api/transforms/orderTransform.js` — `collectBillExisting` and every other payload builder. Owner explicit: `rtype` only on print; `grant_amount` on `order-bill-payment` is already correct.
- `api/services/orderService.js` — print agent dispatch, no change.
- `api/services/paymentMutationService.js` — untouched.
- `components/cards/OrderCard.jsx`, `components/cards/TableCard.jsx`, `components/order-entry/RePrintButton.jsx` — dashboard / order-entry default-branch print paths. The default branch behavior `finalPaymentAmount = order.amount` is preserved; `order.amount` for room orders is already room-inclusive per Task 4 (`computeRoomCardAmount` in `DashboardPage.jsx`), so dashboard print continues to emit the full amount with no call-site change.
- `components/order-entry/CollectPaymentPanel.jsx` — every other line beyond L770.
- `components/order-entry/OrderEntry.jsx` — untouched (Wave 4 BUG-057 change preserved).
- BUG-050 changes in `orderTransform.js` — preserved (L211, L1505-1520, L1690 discount-cascade — untouched here).

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Non-room print bills change value | **None** | For non-room: `effectiveTotal === finalTotal`. CollectPaymentPanel sends the same number it does today; transform passes it through. Bit-identical on the wire. |
| Room print payload value drift in some path I missed | LOW | Both override and default paths verified: override now arrives correct; default trusts `order.amount` which is already room-inclusive (existing comment + tests confirm). |
| Existing `req3-room-bill-print` test fails | **Expected** | The L93-116 assertion encoded the old buggy contract. Re-baselined inside this same diff (5.1.d). |
| Dashboard reprint regression | None | Dashboard path = default branch, never hits the deleted recompute. |
| Backend rejects unknown `rtype` key | None | Owner stated backend has **added** this key (i.e., it expects it). |
| BUG-050 cascade regression | None | The discount cascade lives in a completely separate code path (`overrideDiscount` for SC/GST recompute + emitted `discount_amount`), untouched here. |

Overall risk: **LOW**. Single-source-of-truth refactor with the on-the-wire value for room orders going from "sometimes 11,510, sometimes 2,676 (bug)" → "always 11,510 (correct)". Non-room orders bit-identical.

---

## 8. Tests Impact

| Test File | Will It Break? | Action |
|---|---|---|
| `api/transforms/__tests__/req3-room-bill-print.test.js` — L93-116 ("override branch rolls assoc + balance") | **YES, by design** | Re-baseline in step 5.1.d. New contract: caller passes full amount; transform writes through. |
| Same test file — L45-91 ("default branch" + "non-room") | No | Default branch unchanged. Will add `rtype` assertions inline. |
| Same test file — L130-155 (`fromAPI.order` _raw preservation) | No | Unrelated. |
| All other transform tests (`calcOrderTotals`, `collectBillExisting`, `qa_subtotal_delivery_validation`, etc.) | No | Untouched code paths. |
| Component tests (`OrderTable.holdDisable.test.jsx`) | No | Untouched. |

I will run full `yarn test` after applying.

---

## 9. Validation Plan (Post-Implementation)

1. ESLint — clean on both files.
2. `yarn test` full suite — must pass 34/34 suites (with one re-baselined assertion).
3. Webpack compile — green.
4. Owner smoke (using order #102):
   - Open Collect Bill panel on Room #102.
   - Click **Print Bill** → inspect emitted payload (browser DevTools → Network → `/order-temp-store`).
   - **Expected:** `payment_amount: 11510`, `grant_amount: 11510`, `rtype: "RM"`.
   - Repeat on a non-room order (e.g. dine-in T1 with food only ₹200).
   - **Expected:** `payment_amount: 200`, `grant_amount: 200`, `rtype: "TB"`. Bit-identical to today aside from `rtype` addition.

---

## 10. Recommended Order

This mini-CR lands BEFORE BUG-059 because BUG-059's audit-tab reprint also calls `buildBillPrintPayload` and will inherit the corrected room behavior. Doing it the other way would temporarily ship BUG-059 audit reprint with the same room bug.

Sequence:
1. **(this mini-CR) `grant_amount` unification + `rtype`** — apply, test, smoke.
2. **BUG-059 (Wave 4 final bucket)** — resume code-diff preview previously prepared, no scope change.

---

## 11. Approval Required

- **A.** Approve the approach above → I produce the exact code-diff preview (Gate 7) for owner approval of the literal source changes.
- **B.** Modify (e.g., keep transform-side recompute and just fix CollectPaymentPanel input; or change `rtype` value naming; etc.).
- **C.** Stop / drop this mini-CR.

Reply A / B / C.

---

*— End of Print Payload Mini-CR Owner Approval Plan —*
