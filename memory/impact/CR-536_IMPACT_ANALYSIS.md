# CR-536 — B2B invoice: customer billing address — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: PARTIAL — CPP "B2B Invoice (Optional)" with GST Number + GST Registered Name (CR-116) L3385-3404, state L525-527; sent as `custGST/custGSTName` in bill payment (`orderTransform.collectBillExisting` L1525-1526, L1759-1760), print overrides (`orderTransform` L2199-2200), OrderEntry print calls (L1762, 1807, 1886, 2339, 2627). Customer record has `gst_number` (customerTransform L67/106/148). No address field.
Risk: CRITICAL (tax invoice / print). Backend-blocked: YES (store + print address).
Conflict Pre-Check: CPP + orderTransform (see CR-514). OrderEntry print calls — 5 sites, same pattern.

## Owner decisions (locked)
- All restaurants, one CR ("Prana" removed).
- OD-536-A: add **customer billing address** next to GST no. + name; shown in report + print when saved.
- OD-536-B: **no UPI ID** — dropped.

## Impact
| File | Change |
|---|---|
| `CollectPaymentPanel.jsx` L525-527, L3385-3404 | New "Billing Address" input (full width, under GST fields); include in payment data (L1311-1312) and print data (L1385-1386) |
| `api/transforms/orderTransform.js` L1525-1526, L1759-1760, L2199-2200 | Add `custGSTAddress` (key per backend) |
| `OrderEntry.jsx` 5 print sites | Forward address |
| Reports (Order Beta / Audit detail) | Show B2B block (GST no., name, address) when present — needs backend to return fields |
| Optional: pre-fill from customer record when customer has `gst_number` (Gate 2.5 decision) |

## Backend asks
- BB-10: `order-bill-payment` + `place-order` accept + store `custGSTAddress`; bill print (backend template) prints it under GST name; order report APIs return `cust_gst`, `cust_gst_name`, `cust_gst_address`.

## Open
- Gate 2.5: pre-fill from customer profile — yes/no (M7).

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M7 approved. OD-536-C: **pre-fill** GST no. / name / address from the selected customer profile when it has a GST number; fields stay editable. (Address pre-fill source: customer profile has only delivery `addresses[]` (customerTransform L101/L138), no billing address → Gate 3 picks: default/first address, or backend adds a billing address with `gst_number` (BB-10b).)

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-B_CR-536_API_CONTRACT_2026_11_15.md`
