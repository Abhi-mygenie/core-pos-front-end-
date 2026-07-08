# POS2.0 Wave 5 — BUG-071 Implementation Report — 2026-05-17

## 1. Status
**APPLIED** — exactly per `POS2_0_WAVE_5_CODE_DIFF_PREVIEW_BUG_071_2026_05_17.md`
(Owner approval: "A" 2026-05-17).

---

## 2. Files modified

| File | Surface | Lines changed |
|------|---------|---------------|
| `frontend/src/components/cards/OrderCard.jsx` | Add `orderNumber` const; chip guard + 2 toasts | +12 / -3 |
| `frontend/src/components/cards/TableCard.jsx` | 3 toasts (KOT, Bill, Settle) | +6 / -3 |
| `frontend/src/components/cards/DeliveryCard.jsx` | Drop `\|\| order.id` fallback in `orderNumber`; guard chip | +5 / -1 |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Header chip (visible text → `orderNumber`; `data-testid` unchanged) | +4 / -1 |
| `frontend/src/components/order-entry/RePrintButton.jsx` | Bill print toast | +2 / -1 |
| `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | `orderLabel` source | +2 / -1 |
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | Drawer title | +3 / -1 |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | Missing-order placeholder copy | +3 / -1 |
| `frontend/src/components/reports/OrderTable.jsx` | Fallback chain `displayOrderId \|\| orderNumber \|\| ''` | +8 / -3 |
| `frontend/src/components/reports/ExportButtons.jsx` | CSV/HTML export cell fallback chain | +1 / -1 |
| **Total** | | **+46 / -16** |

---

## 3. Owner directives honored

| Directive | Where enforced |
|-----------|---------------|
| All visible chips, toasts, dialog titles read from `order.orderNumber` | 10 surfaces above |
| Q5 — no fallback to DB id when `orderNumber` missing; hide chip/toast/title entirely | `OrderCard` chip guard, `DeliveryCard` chip guard, `MarkUnpaidConfirmDialog` empty `orderLabel`, all toasts use `'Bill request sent'` / `'Order settled'` / `''` empty descriptions when missing |
| `data-testid` selectors stay on DB `orderId` | OrderCard L312-320, OrderEntry L1117-1124 |
| React `key` props unchanged | All preserved (no `key` edits) |
| API call args unchanged | `printOrder(orderId, ...)`, `completePrepaidOrder(orderId, ...)` all preserved |
| Print payload fields unchanged | No changes to `buildBillPrintPayload` |

---

## 4. Validation

| Gate | Result |
|------|--------|
| ESLint on all 10 files (parallel) | ✅ No issues found |
| `yarn test --watchAll=false` | ✅ **498/498 passed**, 34 suites, 6.226 s |
| Webpack hot-reload | ✅ Dev server compiles green |

---

## 5. Owner smoke checklist

1. **Dashboard OrderCard chip** — confirm chip flips from `#886544` (DB) to `#000059` (user-facing) once `orderNumber` is hydrated; brand-new pre-engage cards render no chip
2. **Dashboard Bill print toast** — confirm description reads `Order #000059`, not `Order #886544`
3. **Dashboard Settle prepaid toast** — confirm description reads `Order #000059`
4. **Dashboard KOT print toast** — confirm description reads `Order #000059` when no station specified; reads `Stations: KDS,BAR` when station picker used
5. **OrderEntry header chip** — confirm `#000059` visible after engaging an order
6. **DeliveryCard chip** — confirm `#000059` on Zomato / Swiggy / Own delivery cards
7. **Audit Report → Mark Unpaid dialog** — confirm title reads `Mark order #000059 as Unpaid?`
8. **Audit Report → Collect Bill drawer** — confirm header reads `Collect Bill · #000059`
9. **Audit Report → table `Order #` column** — confirm cell shows `T-002913` (prefixed) or `000059` (raw orderNumber), never the DB id
10. **CSV / HTML export** — open exported file → first column shows `T-002913` / `000059`, never DB id
11. **Audit Report → Missing-order placeholder** — when clicking a missing order row, popup reads "This order is missing from records." (no DB id leak)
12. **OrderEntry / Dashboard with no `orderNumber` yet** — confirm no chip, no `#...` in toast (Q5 rule)

---

## 6. Wave 5 progress

| Item | Status |
|------|--------|
| BUG-071 (UI / bills user-facing ID) | ✅ APPLIED — awaiting owner smoke |
| BUG-070 (Area-wise segregation) | ⏳ Next — diff preview to be filed after BUG-071 smoke |

---

*— End of Wave 5 BUG-071 Implementation Report —*
