# BUG-296 Re-Investigation — Session 2026-08-12

## Live API Probe Results (owner@shimlaqohfoodcourt.com, rid=598, June 2026)

### Orders fetched (collect_bill sort): 6,038

### Gap Decomposition vs User's "Item Wise" (₹19,77,199.01)

| Component | Amount |
|---|---|
| Food Court current (price only) | ₹18,06,549.45 |
| + Addon revenue (total_add_on_price) | +₹25,411.00 |
| + Variation revenue (total_variation_price) | +₹36,830.00 |
| = FC + addon + var | ₹18,68,790.45 |
| + GST on items (gst_tax_amount) | +₹92,492.05 |
| = FC + addon + var + GST | ₹19,61,282.50 |
| User's "Item Wise" | ₹19,77,199.01 |
| Residual | ₹15,916.51 |

### Per-station gap after FC+addon+var+GST vs User Item Wise
| Station | FC+A+V+GST | User IW | Remaining |
|---|---|---|---|
| CREAMBELLPARLOUR | 269,798.44 | 275,154.65 | +5,356.21 |
| GUPTAJEE | 743,691.95 | 751,929.45 | +8,237.50 |
| MSB | 344,555.70 | 347,994.20 | +3,438.50 |
| ZORKO | 603,236.41 | 602,120.71 | -1,115.70 |
| TOTAL | 19,61,282.50 | 19,77,199.01 | +15,916.51 |

### Fields confirmed present in API (order_details_table items):
- total_add_on_price: present (0 for non-addon items, non-zero for addon items)
- total_variation_price: present (0 for non-variation items)
- gst_tax_amount: present
- food_amount: None (not present in this API response)

### Root cause:
Food Court toStationRow() uses only item.price (food base × qty)
Missing: total_add_on_price + total_variation_price per item
