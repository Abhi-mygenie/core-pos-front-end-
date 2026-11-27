# BUG-756 — Gate 3 Implementation Plan
## Print Bill 403 for PayLater Orders from Order Report Beta

**ID:** BUG-756
**Date:** 2026-11-27
**Role:** PLANNING — Gate 3 (Implementation Plan)
**Based on IA:** `impact/BUG-756_IMPACT_ANALYSIS.md`
**OD locked:** None required
**Awaiting:** Gate 4 GO

---

## 1. Entry Verification

Anchor verified at HEAD:

| Edit | File | Line | Current content | Match? |
|------|------|------|----------------|--------|
| E1 | `CollectBillPanelDrawer.jsx` | 276 | `onPrintBill={onPrintBill ?? null} // CR-503: accept external print handler` | ✅ |
| (scope) | `CollectBillPanelDrawer.jsx` | 93 | `order,` (prop destructuring — `order.id` is in scope) | ✅ |

---

## 2. Scope Lock

**Files WILL change:**
- `src/components/reports/CollectBillPanelDrawer.jsx` — 1 edit, ~4 lines

**Files WILL NOT touch:**
- `src/components/order-entry/CollectPaymentPanel.jsx` (CPP's `handlePrintBill` is not responsible for the order ID)
- `src/pages/reports-module/OrderReportBetaPage.jsx` (`handlePrintBillFromBeta` logic is correct)
- `src/pages/reports-module/AllOrdersReportPage.jsx` (benefits from the fix automatically)
- Any transform, service, or context file

---

## 3. Edit

### E1 — `CollectBillPanelDrawer.jsx` line 276

**Current:**
```javascript
              onPrintBill={onPrintBill ?? null} // CR-503: accept external print handler
```

**New:**
```javascript
              // BUG-756: inject order.id into CPP overrides before forwarding to
              // the external handler. CPP's overrides object contains financial values
              // only (no order identifier) so handlePrintBillFromBeta receives
              // undefined order_id → 403. The drawer already has order.id at mount.
              onPrintBill={
                onPrintBill
                  ? (overrides) => onPrintBill({ ...overrides, id: order?.id, order_id: order?.id })
                  : null
              } // CR-503: accept external print handler
```

**Why:** `CollectBillPanelDrawer` receives `order` as a prop (line 93). `order.id` is the numeric order ID, set by `openCollectBillDrawer` in the report page via `collectBillTarget.id = row.order_id`. The external handler `handlePrintBillFromBeta` reads `row?.order_id || row?.id` to identify the order for the API call. By injecting `id` and `order_id` into the CPP overrides before forwarding, both access patterns in the handler resolve to the correct value.

---

## 4. Verification Matrix

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | PayLater Print Bill no longer 403 | Open Order Beta, click Collect on a PayLater row, click Print Bill | No "Print failed" toast; network shows 200 on `get-single-order-new` |
| V2 | Print job sent to printer | Same as V1 | Printer receives the bill; toast "Bill request sent" |
| V3 | Paid order Reprint unaffected | Click Reprint on a Paid row (separate path: L384 guard) | Still works, no regression |
| V4 | Collect payment flow unaffected | Complete a PayLater collect-payment end-to-end | Payment succeeds normally |
| V5 | Compile clean | `yarn build` | 0 new warnings |

---

## 5. Post-Code Registry Checklist

```
[ ] registry.json: BUG-756 → status: GATE_5A_IMPLEMENTED, sprint_key: dec_sprint
[ ] BUG_TRACKER.md: row updated → GATE_5A_IMPLEMENTED
[ ] FILE_OWNERSHIP.md: CollectBillPanelDrawer.jsx entry → BUG-756 + date
[ ] Code marker: // BUG-756 comment in CollectBillPanelDrawer.jsx (already in plan above)
[ ] Compile: webpack 0 new warnings
```

---

## 6. Risk Register

| Risk | Level | Note |
|------|-------|------|
| `order?.id` is undefined at mount | LOW | If upstream `collectBillTarget.id` is undefined, same 403 as before — no regression; the root cause would then be in `openCollectBillDrawer` (outside this scope) |
| Dashboard Collect Bill flow affected | NONE | Dashboard doesn't use `CollectBillPanelDrawer`; it uses `CollectPaymentPanel` directly with its own native print |
| `AllOrdersReportPage` affected | POSITIVE | Same drawer; fix applies there too — the same PayLater 403 bug in AllOrders will also be resolved |
| CPP's internal `handlePrintBill` overrides are modified | NONE | We spread `overrides` and add two ID fields — existing financial fields untouched |

---

**Awaiting Gate 4 GO.**
