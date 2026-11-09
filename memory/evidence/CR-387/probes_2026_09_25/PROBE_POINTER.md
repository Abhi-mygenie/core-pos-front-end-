# CR-387 · OD-387-06 probe (read-only) — STATUS: EXECUTED 2026-09-25 · RESOLVED
- Script: `od387_06_probe.py` — login + `GET /api/v2/vendoremployee/inventory/vendor-item-list` only. No mutation.
- Result: HTTP 200, 42 rows. Keys: ID, Ingredient_Name, Quantity ("1 pkt"), stock_quantity_raw, Amount, line_total, unit_price, vendor_id, Purchase_Date, Payment_Type.
- `unit_price = Amount ÷ BASE quantity` (Quantity × conversion factor): 13760 "1 PKT"@800 ₹1 → 0.00125 · 13759 "2 pkt"(=1.5) ₹1.5 → 0.00125 · 13758 "100 gm" ₹100 → 1 · 13742 "1 pkt"@500 ₹100 → 0.2 · 13743 "250 gm" ₹50 → 0.2.
- Conclusion: hint "last total ₹" = `unit_price × baseQty` (plan E-A7 default). CR-387 sending display units does NOT change this: backend derives unit_price from Amount ÷ calculate_quantity (base).
- Evidence: `od387_06_vendor_item_list.json`. Credentials alias QA_INV (gitignored `memory/test_credentials.md`), never printed.
