# POS2.0 Wave 4 Code Diff Preview — BUG-057 Bucket — 2026-05-17

## 1. Purpose

Exact code-change preview for **BUG-057 only** (Prepaid Print Bill on Collect Bill panel + order screen). Assumes owner option **(i) — apply the missing `canPrintBill` permission gate** at `OrderEntry.jsx` L1833 per the existing inline comment.

**No source files have been modified yet.**

---

## 2. Owner-Approved Approach

- Q-P4-PRINT-02: Option B — Print Bill inside Collect Bill panel **and** order screen for prepaid orders.
- Dashboard OrderCard does NOT get Print Bill for prepaid (owner explicit).
- Both target surfaces already have Print Bill buttons reachable for prepaid:
  - `CollectPaymentPanel.jsx` L827 — gated on `hasPlacedItems && onPrintBill`. No prepaid block.
  - `OrderEntry.jsx` L1833 — gated on `hasPlacedItems && (effectiveTable?.orderId || placedOrderId)`. No prepaid block.
- The OrderEntry button is missing the `canPrintBill` permission gate that its own inline comment (L1827-1832) explicitly says it should have. Adding that single check brings the order-screen Print Bill into line with every other print action in the app.

---

## 3. BUG-057 — Single Edit

### File

`frontend/src/components/order-entry/OrderEntry.jsx`

### Component / Function / Constant

`OrderEntry` component, header row inside the cart panel — visibility predicate for the `<PrintBillButton />` (currently L1833).

### Current Code Snippet (L1827-1835)

```jsx
                {/* CR-007 / A2.3 (May-2026): Print Bill button next to the
                    order-id chip in the same flex row. Mirrors the Print Bill
                    button inside CollectPaymentPanel verbatim (Q-O4 "same as
                    collect bill, try to reuse components and code").
                    Visibility gate: canPrintBill permission + at least one
                    placed cart item + an orderId resolved. */}
                {hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && (
                  <PrintBillButton orderId={effectiveTable?.orderId || placedOrderId} />
                )}
```

### Proposed Code Snippet (L1827-1836)

```jsx
                {/* CR-007 / A2.3 (May-2026): Print Bill button next to the
                    order-id chip in the same flex row. Mirrors the Print Bill
                    button inside CollectPaymentPanel verbatim (Q-O4 "same as
                    collect bill, try to reuse components and code").
                    Visibility gate: canPrintBill permission + at least one
                    placed cart item + an orderId resolved.
                    BUG-057 (Wave 4, May-2026): added the missing canPrintBill
                    gate that the comment above promised — aligns the
                    order-screen Print Bill with every other print action
                    (which all gate on `print_icon`). Behavior on prepaid
                    orders is preserved: button remains visible when the role
                    has `print_icon`. */}
                {canPrintBill && hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && (
                  <PrintBillButton orderId={effectiveTable?.orderId || placedOrderId} />
                )}
```

### Diff

```diff
                     Visibility gate: canPrintBill permission + at least one
-                    placed cart item + an orderId resolved. */}
-                {hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && (
+                    placed cart item + an orderId resolved.
+                    BUG-057 (Wave 4, May-2026): added the missing canPrintBill
+                    gate that the comment above promised — aligns the
+                    order-screen Print Bill with every other print action
+                    (which all gate on `print_icon`). Behavior on prepaid
+                    orders is preserved: button remains visible when the role
+                    has `print_icon`. */}
+                {canPrintBill && hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && (
                   <PrintBillButton orderId={effectiveTable?.orderId || placedOrderId} />
                 )}
```

`canPrintBill` is already declared at L239 (`const canPrintBill = hasPermission('print_icon');`). No new variable needed.

---

## 4. Why No Other Changes

| Surface | Behavior For Prepaid | Action |
|---|---|---|
| `CollectPaymentPanel.jsx` L827 — Print Bill button | Already visible for prepaid (gated on `hasPlacedItems && onPrintBill`; `onPrintBill` is always passed from OrderEntry L1317 unconditionally). | **No change.** Adding `canPrintBill` here would change behavior for non-prepaid orders too — out of scope for BUG-057. |
| `OrderEntry.jsx` L1833 — `<PrintBillButton>` | Already visible for prepaid (gated on `hasPlacedItems && orderId`; no prepaid block). Missing permission gate. | **Add `canPrintBill &&`** (this diff). |
| `OrderCard.jsx` / `TableCard.jsx` — dashboard print | Dashboard prepaid rows render "Settle" (handleSettlePrepaid), NOT Print Bill. Owner explicit. | **No change.** |
| `RePrintButton.jsx` `PrintBillButton` internals | Render-only component; permission is the parent's concern (per code comment L95). | **No change.** |

---

## 5. Files NOT Touched

- `components/order-entry/CollectPaymentPanel.jsx`
- `components/order-entry/RePrintButton.jsx`
- `components/cards/OrderCard.jsx`
- `components/cards/TableCard.jsx`
- `api/transforms/orderTransform.js` (Wave 4 BUG-050 changes preserved)
- `api/services/orderService.js`
- Any test file

---

## 6. Business Rules / Owner Decisions Verification

| Rule / Decision | Status | How verified |
|---|---|---|
| Q-P4-PRINT-02 (Option B — Collect Bill panel + order screen for prepaid) | ✅ Both surfaces visible for prepaid users with `print_icon` permission | CollectPaymentPanel button unchanged; OrderEntry button now properly gated but still visible for prepaid when role has the perm |
| Dashboard OrderCard prepaid does NOT get Print Bill | ✅ Preserved | `OrderCard.handlePrintBill` only fires from existing printer icon (canPrintBill gate at L710) — unchanged. Prepaid row's primary action is "Settle" (L150). |
| BUG-005 historical closure (reversed for these 2 surfaces only) | ✅ Honored | CollectPaymentPanel + OrderEntry behavior preserved (now permission-aligned); other surfaces unchanged. |

---

## 7. Tests Impact

| Test File | Will It Break? | Why |
|---|---|---|
| No existing test asserts on the unconditional visibility of `OrderEntry`'s Print Bill button across both `canPrintBill=true` and `canPrintBill=false` paths. | **No** | The new gate matches the documented intent of every other print action; existing tests either test `canPrintBill=true` flows or `print_icon`-permitted users. |
| All transform tests | **No** | Untouched file. |

I will run `yarn test` after applying to confirm.

---

## 8. Validation Plan (Post-Implementation)

1. ESLint clean.
2. `yarn test` — full suite pass.
3. Webpack compile green.
4. Manual smoke (owner-driven):
   - Prepaid order in OrderEntry with `print_icon` permission → Print Bill pill visible in header → click → bill prints.
   - Prepaid order with `print_icon` **revoked** → Print Bill pill hidden in OrderEntry header.
   - CollectPaymentPanel Print Bill button visible on prepaid (unchanged).
   - Dashboard OrderCard prepaid row shows only "Settle" (unchanged).

---

## 9. Approval Required

- **A.** Approve this exact diff → apply to source (Gate 8), then `yarn test`, smoke, report back.
- **B.** Modify the diff (e.g., keep gate-less / pick option (ii) "document only" instead).
- **C.** Stop / skip BUG-057.

Reply A / B / C.

---

*— End of Wave 4 Code Diff Preview — BUG-057 Bucket —*
