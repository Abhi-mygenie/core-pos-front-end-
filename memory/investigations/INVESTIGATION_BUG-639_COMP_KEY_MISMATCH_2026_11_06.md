# INVESTIGATION — BUG-639 (re-scoped): Complimentary key mismatch — `food_details.complementary` in print payloads

**Date:** 2026-11-06
**Role:** INVESTIGATION (read-only; no code changed)
**Trigger:** Owner (2026-11-06): "there's a key mismatch … we need to pass `food_details.complementary`". The Printer Agent reads `food_details.complementary`, not `is_complementary`.
**Supersedes:** `investigations/INVESTIGATION_COMP_NO_PRINTER_PAYLOAD_2026_11_02.md`. Its `expandCompItems`-in-`updateOrder` root cause is **disproved** (see plan addendum C1-C4).
**Live probe:** ❌ NOT RUN. `preprod.mygenie.online` timed out (HTTP 000, 20-45 s) at 2026-11-06 15:22. Findings below are **code-traced**; the live payload confirmation is pending.

---

## 1. Summary

Every print to the Printer Agent goes through **one API**, `POST /api/v1/vendoremployee/order-temp-store` (`orderService.printOrder`, L130-190). It has **two payload shapes**, and only one of them sets `food_details.complementary`:

| Print type | Builder | `billFoodList[].food_details.complementary` for runtime-comp items | Status |
|---|---|---|---|
| **bill** | `buildBillPrintPayload` (orderTransform.js L1863-1882) | forced `'Yes'` (L1870) for full runtime-comp rows | ✅ fixed by BUG-641 |
| **kot** | inline in `orderService.js` L147-160 | `billFoodList: orderData?.rawOrderDetails` — **raw, no override**. `food_details.complementary` = catalog value (`'No'`), even when the row's `is_complementary` is `'Yes'` | ❌ **KEY MISMATCH — ROOT CAUSE (RC1)** |

The Printer Agent reads `food_details.complementary`, so **KOT prints / reprints show a runtime-complimentary item as normal**.

## 2. Data flow

```
Cashier marks item comp (Collect Payment checkbox / MarkCompModal)
  → collect-bill / place-order sends is_complementary:'Yes' per line (buildCartItem L788; collectBillExisting L1595)
  → backend stores order_details row: is_complementary='Yes', food_details = catalog snapshot (complementary='No')
  → fromAPI.order keeps the raw rows in order.rawOrderDetails

KOT print (OrderCard L231 · TableCard L202 · RePrintButton L56)
  → printOrder(orderId,'kot',station,order,…)
  → orderService L159  billFoodList: order.rawOrderDetails       ← no complementary override
  → Printer Agent reads food_details.complementary = 'No'  ❌

Bill print
  → buildBillPrintPayload L1867-1871: if isDetailComplimentary(d) → food_details.complementary='Yes', is_complementary='Yes', prices 0  ✅
```

## 3. Findings

| # | Finding | Location | Confidence |
|---|---|---|---|
| **RC1** | KOT payload passes `rawOrderDetails` unchanged → `food_details.complementary` not aligned with `is_complementary`. | `api/services/orderService.js` L159 | CONFIRMED (code) · live payload PENDING |
| F2 | Bill path aligns the key only for rows matched by `isDetailComplimentary` (catalog / row `is_complementary` / `runtimeComplimentaryFoodIds`). | orderTransform.js L1832-1839, L1867-1871 | CONFIRMED (code) |
| F3 | **Partial comp before settlement** (1 of 3): `runtimeComplimentaryFoodIds` includes only `isComplementaryRuntime === true` items (CPP L1333-1335, OrderEntry L2614-2616). Partial items have `false`, so they are not flagged on the pre-settle Print Bill. The raw row is one line of qty 3, so flagging it would zero all 3. | CollectPaymentPanel.jsx L1333 · OrderEntry.jsx L1071 | CONFIRMED (code) — separate gap, owner to decide scope |
| F4 | Original plan (`expandCompItems` in `updateOrder`) does not address the key and would mis-mark delta items. | plan addendum C1-C4 | CONFIRMED |
| F5 | Code marker at L1870 says `BUG-628`; the fix belongs to BUG-641 (BUG-628 = delivery dispatch). | orderTransform.js L1870 | CONFIRMED — marker drift |

## 4. Classification
- **Type:** CONTRACT_MISMATCH (FE↔Printer Agent key). FE-fixable: align `food_details.complementary` with the row's `is_complementary` on the KOT payload.
- **Risk:** MEDIUM (print only; no totals or billing change on KOT).
- **Blast radius:** SMALL. `orderService.js` L159 (1 file, not R5). The KOT callers (OrderCard, TableCard, RePrintButton) are unchanged.
- **Fast Lane:** candidate (≤10 lines, 1 non-R5 file, print-only). Owner to decide.

## 5. Recommended fix direction (for Planning — NOT implemented)
In the KOT branch, map `rawOrderDetails` so that rows with `is_complementary === 'Yes'` (or catalog `food_details.complementary === 'Yes'`) carry `food_details: { ...d.food_details, complementary: 'Yes' }`. Keep everything else raw (a KOT has no prices to zero). Reuse the same predicate as the bill path (DRY: extract `isDetailComplimentary` or an `alignCompKey` helper in orderTransform.js).

## 6. Open questions for owner
- **Q1:** Where did you see the wrong output: the **KOT** slip, the **bill**, or both? Was it a reprint from the dashboard card, or the automatic KOT on place/update order? Automatic KOTs are built by the **backend** from the stored row, so FE cannot fix those. If so → backend brief.
- **Q2:** Was the item fully complimentary or only part of its qty (F3)?
- **Q3:** Re-scope BUG-639 to RC1 (KOT key mismatch) and drop the `expandCompItems` plan? Agent recommends YES.
- **Q4:** Fix the F5 marker (`BUG-628` → `BUG-641`) in the same pass?

## 7. Pending evidence
Live payload of a KOT reprint for an order with a runtime-comp item (DevTools → `order-temp-store` request body, `billFoodList[].food_details.complementary` vs `is_complementary`). Re-run the probe once preprod responds.
