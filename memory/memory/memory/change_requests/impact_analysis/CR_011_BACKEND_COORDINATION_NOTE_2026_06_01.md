# Backend Coordination Note — CR-011 Reports Module (REV 2)

**From:** POS FE (E1 agent, on behalf of CR-011 owner)
**To:** Backend lead, MyGenie POS
**Date:** 2026-06-01 (rev 2 — after live verification)
**Re:** Two specific API gaps blocking CR-011 (Complete Reports Module, POS 4.0)
**Source-of-truth investigation:** Live `/api/v2/.../report/order-logs-report` + `/api/v2/.../get-single-order-new` + `/api/v1/.../get-products-list` on **preprod** for outlets **Palm House** (restaurant_id 541; 658+ orders Jan–May 2026) and **Kunafa Mahal** (restaurant_id 689; 281+ orders Jan–Jun 2026)

---

## TL;DR — 2 asks total

| # | Ask | Pick / Action |
|---|---|---|
| **BE-1 (HIGH)** | Expose split-payment breakdown for partial orders | Backend implements |
| **BE-3 (MED)** | Make category names available alongside category IDs in `food_details` | Backend picks **A** or **B**, then implements |

All other gaps I'd suspected earlier (operations writer coverage, loyalty schema, print events) were either **already shipped** or **explicitly out of scope**. See "Already-shipped, no action needed" below for what we verified.

---

## BE-1 (HIGH) — Split-payment breakdown not exposed

### Evidence

The `payment_method` enum already accepts `'partial'`. Live examples at **Kunafa Mahal (rid=689)**:

| `restaurant_order_id` | `order_id` (db) | `order_amount` | `payment_method` | `payment_status` |
|---|---|---|---|---|
| `004735` | 689914 | 148.00 | `partial` | `paid` |
| `004684` | 687063 | 628.00 | `partial` | `paid` |

For both orders we inspected, end-to-end:

- `orders_table.payment_details` — **null**
- `orders_table.payment_id` — null
- `orders_table.transaction_reference` — equals total `order_amount` (no breakdown info)
- `/get-single-order-new` payload for both — **no `payment_history`, `payments[]`, `payment_split`, or any breakdown array**
- `operations[]` — only `order_bill_payment` (single combined entry), no per-tender breakdown

The fact that the order was partial-paid is captured (`payment_method='partial'`). **The split itself (how much was cash vs UPI vs card) is not exposed by any endpoint we have FE access to.**

### Ask

Add a structured `payment_breakdown` array on every order in both `/order-logs-report` and `/get-single-order-new`:

```json
"payment_breakdown": [
  { "method": "cash", "amount": 100.00, "txn_ref": null,             "paid_at": "2026-05-22T13:45:21Z" },
  { "method": "upi",  "amount":  48.00, "txn_ref": "UPI/123456789",  "paid_at": "2026-05-22T13:45:35Z" }
]
```

Conventions requested:

- Returned **always** (even for single-tender orders → single-element array). Keeps FE logic uniform.
- `method` values consistent with the existing `payment_method` enum (`cash, card, upi, TAB, cash_on_delivery, zomato_gold, dineout, ROOM, …`).
- `amount` per entry sums to `order_amount`.
- `txn_ref` and `paid_at` optional but useful (gateway recon, settlement reports).

### Reports unblocked

- **P-1 Payment Mix** — accurate slicing for partial orders
- **P-2 Cashier Settlement** — accurate cash/card/UPI totals per shift
- **Order XLSX export parity** — populates the existing Cash / Card / UPI / TAB / Zomato Gold / Partial Payment column set correctly

---

## BE-3 (MED) — Category names not inlined in `food_details`

### Evidence

Live `food_details` JSON inside `order_details_table[]` carries category as IDs only:

```json
"food_details": {
  "name": "Blueberry Delight",
  "category_id":  6777,
  "category_ids": [{"id": "6777", "position": 0}],
  ...
}
```

No category name. Without it, the Item-wise Sales report cannot render group headers ("Desserts · Beverages · Mains · …") — it would show ID 6777 instead of the human label.

> *Note:* owner has clarified `cuisines` is currently unused, so the previous "consistency with cuisines" framing is dropped — this ask stands on its own merit.

### Ask — backend picks ONE of two options

#### Option A (preferred) — Inline category in `food_details` (single JOIN, no new endpoint)

Change the response shape so each item carries its category name:

```json
"food_details": {
  "name": "Blueberry Delight",
  "category":   { "id": 6777, "name": "Desserts" },
  "categories": [{ "id": 6777, "name": "Desserts", "position": 0 }]
}
```

- **Backend change:** add a JOIN on the category master in the ORM query that builds `food_details`; include the name column.
- **FE change:** read `food_details.category.name`. One-line change.
- **Pros:** zero extra API calls; consistent shape per item.
- **Cons:** ~30 bytes extra per item over the wire.

#### Option B (acceptable) — New `/categories` master endpoint

Expose a small read-only endpoint:

```
GET /api/v2/vendoremployee/categories

Response:
[
  { "id": 6777, "name": "Desserts",  "parent_id": null, "position": 0 },
  { "id": 6778, "name": "Beverages", "parent_id": null, "position": 1 },
  …
]
```

- **Backend change:** one new endpoint (~5–10 lines).
- **FE change:** call once at session start, cache `id → name`, look up at render time.
- **Pros:** reusable for menu management, filter UIs, search.
- **Cons:** one extra round-trip per session; FE has to maintain a cache.

### Reports unblocked

- **I-1 Item-wise Sales** — category grouping
- **Item XLSX export parity** — populates the Category column

---

## Already-shipped, no action needed (these were closed during live verification)

| Topic | Verified live in | What we confirmed |
|---|---|---|
| `operations[]` writer coverage | Palm House Apr–May 2026 (304 ops across 9 distinct types); Kunafa Mahal May–Jun 2026 (`order_cancel` op verified) | All needed events emitted — `order_bill_payment`, `paid_prepaid_order`, `order_edit` (food_id + delta), `customer_order_update`, `order_cancel` (full reason + note + actor + stage), `waiter_dinein_order_status_update` (with `reason` field), `order_shifted_room`, `transfer_to_room`, `split_order_in/out`, `make_unpaid`, `payment_method_change` |
| `cancellation_reason` capture | Kunafa Mahal order `009523` (`order_cancel` operation) | Reason + note captured on the operation entry (not on the order row) — full attribution chain works |
| Lifecycle config (Mode A / B / C) | `/get-products-list` for both outlets | Resolved on FE: `packed_food` (Yes→Packaged) + `prepration_time_min` (>0 → Kitchen flow; else Direct serve). No backend ask. |
| `delivery_address` schema (including DOB/Anniversary/membership_id) | Kunafa Mahal order `009591` (a live delivery) | Fully captured in `orders_table.delivery_address` JSON. No backend ask. |
| `loyalty_info` schema drift | Owner decision | FE uses Shape B only; older Shape A renders as "Loyalty: not tracked". No backend ask. |
| `zomato_gold` / `dineout` payment methods | Kunafa Mahal orders `009592` and earlier samples | Both are separate `payment_method` enum values (prepaid third-party tenders). FE handles in Payment Mix. No backend ask. |

---

## Out of scope (won't be asked for)

| Topic | Why dropped |
|---|---|
| Print / Reprint operations (`kot_reprinted`, `bill_reprinted`) | Owner: C-3 Reprint Audit report not in scope for CR-011 |
| Cuisine-wise reports | Owner: cuisines not used currently |
| Historical backfill of `operations[]` | Owner: forward-only is fine; FE shows "Event-log coverage starts dd-mmm-yyyy" banner for date ranges spanning the cutoff |
| Loyalty schema normalisation | Owner: discard Shape A; report only Shape B fields |

---

## 8 small verifications (yes/no answers, no API change)

These won't change FE code, but pinning down the enums means the report transform won't get surprised by a value it hasn't seen:

| # | Field | Values FE has observed | Question |
|---|---|---|---|
| V-1 | `payment_method` | `cash, card, upi, TAB, cash_on_delivery, partial, dineout, zomato_gold, ROOM, Merge, Cancel, pending` | Complete? Anything else FE should anticipate (Razorpay direct, Paytm, BharatQR, …)? |
| V-2 | `order_type` | `pos, dinein, delivery` | Where do `takeaway` and `homedelivery` slot in? They're documented in old transforms but not seen live. |
| V-3 | `order_in` | `null, RM, SRM` | Complete? |
| V-4 | `f_order_status` | `0, 2, 3, 5, 6` | Meaning of each integer? (`5=served, 6=paid, 3=cancelled`?) |
| V-5 | `b_order_status` / `k_order_status` | `0, 5, 6` | Meaning of each? |
| V-6 | `food_status` (item-level) | `1=Preparing, 2=Ready, 3=Cancelled, 5=Served, 6=Paid` per FE transform comments | Confirm; is `4` reserved/used? |
| V-7 | `discount_on_product_by` | `'vendor'` (only value seen across 939 orders) | Other values possible? (`manager, system, promo, member`?) |
| V-8 | `discount_for` / `discount_member_category` | Empty across both outlets | What populates these? Can you share a restaurant_id that runs member-discount programs so FE can validate the enum? |

---

## What FE will do in parallel (no waiting)

1. Build the **27 reports** that are fully unblocked today (Sales · Tax · most Items · Cancellations · Locations · Staff · Audit / Activity Log · Edit Audit · Payment Mix for non-partial orders).
2. Build the lifecycle-aware Prep & Serve / Station Performance reports using the product-master config.
3. For BE-1: scaffold Payment Mix and Cashier Settlement with a "split-payment breakdown shows once backend exposes `payment_breakdown[]`" banner on partial orders.
4. For BE-3: ship Item-wise Sales without category headers initially, switch to grouped layout the day BE-3 lands.

---

## Suggested response format

A simple table back is enough:

| Ask | Status | ETA | Notes |
|---|---|---|---|
| BE-1 (`payment_breakdown[]`) | TBD | | |
| BE-3 (Option A or B) | TBD | | |
| Verifications V-1..V-8 | inline yes/no | | |

---

*Generated 2026-06-01 (rev 2) by E1 agent for CR-011, POS 4.0. Evidence cross-referenceable against `/app/memory/memory/change_requests/impact_analysis/CR_011_FIELD_TO_REPORT_ATLAS_2026_06_01.md`.*
