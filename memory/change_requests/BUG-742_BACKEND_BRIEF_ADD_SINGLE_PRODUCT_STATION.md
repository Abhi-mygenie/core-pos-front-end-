# BACKEND BRIEF — BUG-742 — **WITHDRAWN / RESOLVED (no backend change needed)**

**Status:** WITHDRAWN 2026-11-20 · **Resolution:** FE-only fix confirmed by read-only probe.

## Why withdrawn
The original question was: "does `add-single-product` return the item's station?" A read-only probe of `get-products-list` (2026-11-20) settled it without any write:

- Product records carry `station_name` = `"KDS"`, `station_source` = `"category"`, `category_id` = `11187`.
- i.e. the backend **already resolves the station from the item's category** and exposes it as `station_name` on the product record (the same entity `add-single-product` creates and returns).

**Conclusion:** the category → station mapping already exists on the backend; nothing new is required of the backend. The frontend fix is to read `response.data.data.station_name` in `customItemFromAPI` (currently it doesn't). See `impact/BUG-742_IMPACT_ANALYSIS.md`.

Residual (handled in FE Gate-3 dev test, not a backend ask): confirm the add-single-product response key is literally `station_name`.

Evidence: `evidence/BUG-742/PRODUCT_STATION_PROBE_2026-11-20.md`.
