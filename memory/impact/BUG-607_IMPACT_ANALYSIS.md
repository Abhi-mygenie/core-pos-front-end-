# BUG-607 — GST mode "category" ignored by POS — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: PARTIAL — FE already computes GST per item from product `tax / tax_type / tax_calc` (productTransform L71-76; CPP taxTotals L279-310; orderTransform L752/1320/1585/1643/1929/2021). FE never reads `restaurant_gst` (0 hits).
Risk: CRITICAL (tax). Backend-blocked: mainly backend (Gyan); FE change small.
Conflict Pre-Check: none on FE calc files (no FE calc edit proposed).

## Owner decisions (locked)
- OD-607-A: `restaurant_gst = category` means ITEM-level GST, always; **no restaurant-level fallback**.
- Assignee: Gyan (backend).

## Probe evidence
- 03 (RID 644): `advanced.restaurant_gst = category`, `gst_tax = 5.00`, `gst.status = 1`.
- R5 33 (RID 541): `restaurant_gst = category`, `gst_tax = 0.00`, `gst_status = 1`.
- R5 32 (RID 541, 286 products): every product carries its own tax — (5, GST, Exclusive) 220, (0, GST, Exclusive) 61, (0, VAT, Exclusive) 5. 9 of 32 categories have mixed rates → rates are truly item-level, not one per category. No product has `Inclusive`.

## FE conclusion
POS billing already = item-level (matches OD-607-A). Items with `tax 0` get 0 GST in POS (no restaurant fallback) — correct per OD-607-A.
Restaurant-level GST % is used only in: Settings tax edit (`panels/settings/ViewEditViews.jsx` L102-123) and the custom-item GST box gate (`OrderEntry.jsx` L3146 `gstStatus || gstPercentage>0`).

## Impact (FE — small)
| File | Change |
|---|---|
| settings transform | Map `restaurant_gst` → `gstMode` ('category' / 'restaurant') |
| `panels/settings/ViewEditViews.jsx` L102-123 | When `gstMode='category'`: show note "GST is set per item" next to restaurant GST %, field read-only (Gate 2.5 M9) |
| Calc files | **No change** |

## Backend asks (Gyan)
- BB-11: when `restaurant_gst=category`, every server-side tax path (scan / web / aggregator orders, bill print, reports, e-invoice) must use item `tax`, never `gst_tax`.
- BB-12: confirm the reported mismatch case (which screen/print showed restaurant-level GST) — owner/Gyan to give one order id for regression.

## Open
None for FE. Backend reply needed for BB-11/12.

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M9 approved. OD-607-B: show "GST is set per item" note + restaurant GST % read-only when `restaurant_gst = category`.
