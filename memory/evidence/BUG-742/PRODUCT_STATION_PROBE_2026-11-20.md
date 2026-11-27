# BUG-742 — Product station probe (read-only) — 2026-11-20

**Account:** owner@thegoankitchen.com (preprod) · **Role:** Owner · token masked (***)
**Endpoint (read-only GET):** `/api/v1/vendoremployee/get-products-list?limit=50&offset=1&type=all` → HTTP 200, 4 products.

## Result — category→station mapping is backend-resolved and surfaced on the product record
| field | value |
|---|---|
| `station_name` | **"KDS"** |
| `station_source` | **"category"** |
| `category_id` | 11187 |
| `restaurant_printer_id` / `effective_restaurant_printer_id` | present |

Every product returned carries these keys (`productTransform.js:106-109` maps `station: api.station_name`, `stationSource: api.station_source`).

## Interpretation
- The backend already maps category → station (`station_source:'category'`) and returns it as `station_name`.
- `add-single-product` creates a product and returns that record shape → `response.data.data.station_name` is populated from the chosen category.
- **No backend change needed.** FE fix = `customItemFromAPI` read `data.station_name` (1 line).

## Caveat
Confirmed on `get-products-list`; the exact `add-single-product` response was not written-to in this read-only probe. Field-name parity (`station_name`) to be confirmed in the FE Gate-3 dev test (same product entity → expected identical).
