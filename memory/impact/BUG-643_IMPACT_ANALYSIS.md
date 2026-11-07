# BUG-643 — Impact Analysis (Gate 2)

**ID:** BUG-643  **Gate:** 2 — IMPACT ANALYSIS  **Date:** 2026-11-05
**Risk:** MEDIUM  **Code Reality:** PARTIAL — root cause confirmed by code
**Conflict Pre-Check:** NONE — no open items touch CreditCustomerDetailSheet.jsx or OrderDetailSheet.jsx

---

## 1. Problem

Credit Management → customer drawer (SS2, Radix `<Sheet>`) → View → Order Details popup (SS3, `OrderDetailSheet`). Clicking the X button or backdrop on SS3 does nothing. Esc key works.

## 2. Root Cause (CONFIRMED BY CODE)

**`CreditCustomerDetailSheet.jsx` L711-724:**
```jsx
{createPortal(
  <OrderDetailSheet
    isOpen={!!billOrder}
    onClose={() => setBillOrder(null)}
    order={billOrder ? { ... } : null}
    tabId="credit"
  />,
  document.body,  // ← portaled OUTSIDE the Radix Sheet (SS2)
)}
```

**Mechanism:**
1. SS2 is a Radix `<Sheet>` (L304) — a modal Dialog variant
2. Radix modal sets `pointer-events: none` on `<body>` when open (standard Radix behavior to prevent outside interaction)
3. SS3 is portaled as a **direct child of `<body>`** via `createPortal(..., document.body)`
4. SS3 inherits `pointer-events: none` from body → **all mouse interactions on SS3 are dead** (X button, backdrop clicks)
5. Esc works because `OrderDetailSheet.jsx` L530-538 registers a `document` keydown listener which is not blocked by `pointer-events`

**Comparison — AllOrdersReportPage.jsx L1096-1101:**
```jsx
<OrderDetailSheet
  isOpen={isSheetOpen}
  onClose={handleCloseSheet}
  order={selectedOrder}
  tabId={activeTab}
/>
```
This renders OrderDetailSheet **inline** (no portal) → works perfectly. No Radix modal parent to block events.

## 3. Fix Options

| Option | Change | Risk | Lines |
|---|---|---|---|
| **A: Remove portal** | Render OrderDetailSheet inline inside CreditCustomerDetailSheet, outside the `<Sheet>` JSX | MEDIUM — z-stacking may need adjustment | ~3 lines changed |
| **B: pointer-events override** | Wrap the portal content in a `<div style={{ pointerEvents: 'auto' }}>` | LOW — surgical, preserves z-stacking intent | ~2 lines changed |
| **C: Radix-aware portal** | Use Radix's `<Portal>` instead of `createPortal` | LOW-MEDIUM — Radix Portal places inside its own stacking context | ~3 lines changed |

**Recommended: Option B** — minimal, surgical, preserves the original z-stacking design intent (SS3 needs to escape SS2's fixed/z-50 context).

## 4. Affected Files

| File | Change | Lines |
|---|---|---|
| `components/credit/CreditCustomerDetailSheet.jsx` | Wrap SS3 portal content in pointer-events:auto div | L714: ~2 lines |

**NOT touched:** `OrderDetailSheet.jsx` (the component itself is fine), `AllOrdersReportPage.jsx`, `App.js`.

## 5. Data Flow

```
CreditManagementPage
  └─ CreditCustomerDetailSheet (SS2 = Radix Sheet, modal)
       ├─ Customer details, order list
       ├─ "View" button → setBillOrder(order) → triggers SS3
       └─ createPortal(
            <div style={{ pointerEvents: 'auto' }}>  ← FIX
              <OrderDetailSheet isOpen onClose />
            </div>,
            document.body
          )
```

## 6. Downstream / Regression

| Consumer | File | Portal? | Impact |
|---|---|---|---|
| **Credit Management** | `CreditCustomerDetailSheet.jsx:714` | YES (document.body) | **THIS BUG** — fix here |
| **All Orders Report / Audit** | `AllOrdersReportPage.jsx:1096` | NO (inline) | No impact — already works |
| **CollectBillPanelDrawer** | Referenced in comments only | N/A | No impact |

- OrderDetailSheet itself unchanged → all consumers unaffected
- CreditCustomerDetailSheet is NOT an R5 hotspot
- No financial, order, or payment logic touched
- **CR-488 dependency:** CR-488 (credit bill print button) will add a Print action inside this same SS3 component. BUG-643 fix is a **prerequisite** for CR-488 since the X button must work before adding more actions.

## 7. Verification Matrix

| # | What | How to Verify |
|---|---|---|
| V-1 | SS3 X button closes the sheet | Browser: Credit → customer → View → click X |
| V-2 | SS3 backdrop click closes the sheet | Browser: Credit → customer → View → click outside |
| V-3 | Esc still works | Browser: Credit → customer → View → press Esc |
| V-4 | SS3 content is scrollable (items visible) | Browser: Credit → order with 3+ items → scroll |
| V-5 | AllOrdersReport OrderDetailSheet still works | Browser: Reports → Audit → click an order → X/Esc |
| V-6 | SS2 (customer drawer) still closes properly | Browser: Credit → open customer drawer → close it |
| V-7 | SS3 z-index layers above SS2 correctly | Visual: both open simultaneously, SS3 on top |

## 8. Open Questions

**None — all owner decisions locked at intake.**
- OD-643-01 (Esc works?) → CONFIRMED BY CODE at intake, no longer needed

## 9. Evidence

- `evidence/BUG-643/owner_ss3_order_000868_close_x_2026_11_05.png` — owner screenshot, cursor on X, order 000868
- `evidence/BUG-643/owner_ss2_credit_drawer_view_2026_11_05.png` — SS2 with View button

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| pointer-events:auto leaks to body (negating Radix intent) | VERY LOW | LOW | Applied only to the wrapper div, not to body itself; Radix still blocks everything else |
| SS3 scroll still blocked by Radix | LOW | MEDIUM | pointer-events:auto should also restore scroll on the wrapper; verify V-4 |

## 11. Next

Gate 3 → Implementation Plan (exact edit on L714).
