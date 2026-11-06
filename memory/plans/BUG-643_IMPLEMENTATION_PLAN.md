# BUG-643 — Implementation Plan (Gate 3)

**ID:** BUG-643  **Gate:** 3 — IMPLEMENTATION PLAN  **Date:** 2026-11-05
**Risk:** MEDIUM  **Files WILL change:** 1  **Files will NOT touch:** OrderDetailSheet.jsx, AllOrdersReportPage.jsx, App.js
**Code Reality:** PARTIAL — root cause confirmed  **Conflict:** NONE
**IA:** `impact/BUG-643_IMPACT_ANALYSIS.md`

---

## Edit E-1: Wrap SS3 portal content with pointer-events:auto + overflow wrapper

**File:** `src/components/credit/CreditCustomerDetailSheet.jsx`
**Lines:** 714-722

**Current (L714-722):**
```jsx
      {createPortal(
        <OrderDetailSheet
          isOpen={!!billOrder}
          onClose={() => setBillOrder(null)}
          order={billOrder ? { id: billOrder.orderId, orderId: billOrder.restaurantOrderId || `#${billOrder.orderId}` } : null}
          tabId="credit"
        />,
        document.body,
      )}
```

**New:**
```jsx
      {createPortal(
        <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 60 }}>{/* BUG-643: restore mouse events blocked by Radix body pointer-events:none */}
          <OrderDetailSheet
            isOpen={!!billOrder}
            onClose={() => setBillOrder(null)}
            order={billOrder ? { id: billOrder.orderId, orderId: billOrder.restaurantOrderId || `#${billOrder.orderId}` } : null}
            tabId="credit"
          />
        </div>,
        document.body,
      )}
```

**Why:**
- `pointerEvents: 'auto'` overrides the `pointer-events: none` that Radix sets on `<body>` — restores click handling for the X button and backdrop
- `position: relative` + `zIndex: 60` ensures the wrapper participates in stacking (SS3 backdrop is z-55, sheet is z-60)
- No change to OrderDetailSheet.jsx itself — the component is fine, only its portal container was broken

---

## Verification Matrix

| # | Test | Steps | Expected | Automated? |
|---|---|---|---|:---:|
| V-1 | X button closes SS3 | Credit → customer → View order → click X | Sheet closes, returns to SS2 | NO — browser |
| V-2 | Backdrop click closes SS3 | Credit → customer → View order → click outside sheet | Sheet closes | NO — browser |
| V-3 | Esc still works | Credit → customer → View order → press Esc | Sheet closes (regression) | NO — browser |
| V-4 | SS3 items scrollable | Credit → order with 3+ items → scroll down in SS3 | Items visible on scroll | NO — browser |
| V-5 | AllOrdersReport sheet unaffected | Reports → Audit → click order → X | Sheet closes normally | NO — browser |
| V-6 | SS2 still closes properly | Credit → customer drawer → click outside | Drawer closes | NO — browser |
| V-7 | z-stacking correct | Open SS2 + SS3 simultaneously | SS3 overlays SS2, both visible | NO — visual |

## Post-Code Registry Checklist

- [ ] registry.json: BUG-643 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CreditCustomerDetailSheet.jsx added
- [ ] Code marker: `// BUG-643` comment in modified file
- [ ] Compile: webpack 0 new errors

## Execution Sequence

1. Edit E-1 (single file, single edit)
2. webpack compile check
3. Self-test V-1 through V-7
