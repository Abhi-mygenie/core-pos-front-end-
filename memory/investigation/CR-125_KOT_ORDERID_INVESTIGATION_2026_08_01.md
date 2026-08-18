# CR-125 — Investigation Report: Aggregator KOT Order ID Gap

**ID:** CR-125-INVESTIGATION
**Role:** INVESTIGATION
**Filed:** 2026-08-01
**Steps used:** 7 / 10
**Confidence:** HIGH (fully traced — data flow confirmed)
**Evidence:** `/app/memory/evidence/CR-125/get_order_list_sample.json`

---

## 1. Summary

**Root cause:** `aggrigator_id` (the actual Zomato/Swiggy customer-visible order ID) is extracted by the FE transform and displayed on the OrderCard, but is **never sent to the backend print endpoint**. The backend `manually-print-aggregator` receives only the internal DB `id`, looks up the order, and uses `restaurant_order_id` as the "Order No" on the KOT. `aggrigator_id` never reaches the printed ticket.

**Classification:** CONTRACT_GAP — FE payload to print endpoint is incomplete. Backend print template does not include `aggrigator_id`.

**Confidence:** HIGH

**Second finding:** BUG-283 (`Order Instructions :::` strip) is FE-display-only. The backend print template reads the raw `order_note` from DB — the strip never applies to printed KOTs.

---

## 2. KOT Analysis (from owner's printed ticket)

| KOT field | Value printed | Source field | Mapped? |
|---|---|---|---|
| Order No | `#689/013677` | `order_details_order.restaurant_order_id` | ✅ BE reads from DB |
| Platform label | `Zomato` | `order_details_order.order_plateform` | ✅ BE reads from DB |
| Date/Time | `01/08/2026 17:08` | `order_details_order.created_at` | ✅ BE reads from DB |
| Order type | `DELIVERY` | `order_details_order.order_type` | ✅ BE reads from DB |
| Customer name | `Mohammad alo shahnawaz` | `customer_details.name` | ✅ BE reads from DB |
| Customer phone | `02248904962` | `customer_details.phone` | ✅ BE reads from DB |
| Item name | `Triple Chocolate Kunafa` | `order_details_food[].food_details.title` | ✅ BE reads from DB |
| Qty | `1` | `order_details_food[].quantity` | ✅ BE reads from DB |
| Notes | `Order Instructions ::: Send cutlery` | `order_details_food[].food_details.order_note` (RAW) | ⚠️ **Unstripped — BUG-283 is FE-display only** |
| **Zomato order ID** | **MISSING** | **`order_details_order.aggrigator_id`** | **❌ NOT ON KOT** |
| **Brand name** | **MISSING** | **`brand_name` (top-level)** | **❌ NOT ON KOT (CR-125)** |

---

## 3. Full Data Flow Trace

```
API: GET /api/v1/vendoremployee/urbanpiper/get-order-list
  └── orders[].order_details_order.aggrigator_id = "242569355005620"  (Swiggy/Zomato ID)
  └── orders[].order_details_order.id            = 40451             (internal DB ID)
  └── orders[].order_details_order.restaurant_order_id = "689/012486" (restaurant order no)

Transform: aggregatorTransform.js → aggregatorOrder(raw)
  └── orderId  = od.id            → 40451       ← this goes to print
  └── aggrId   = od.aggrigator_id → "242569355005620"  ← displayed on card, NOT in print
  └── orderNumber = od.restaurant_order_id → "689/012486"

UI: OrderCard.jsx line 492
  └── Displays: #{order.aggrId}  → "242569355005620" ✅ correct on screen

Print call: OrderCard.jsx line 260–265
  └── const printId = order.orderId  → 40451  ← INTERNAL DB ID (BUG-290 fixed wrong print)
  └── await manuallyPrintAggregator(printId, printType)
  └── Payload sent: { aggr_order_id: "40451", aggr_order_type: "aggr_kot" }
  └── aggrId ("242569355005620") ← NEVER INCLUDED IN PAYLOAD

Backend: /api/v1/urbanpiper/manually-print-aggregator
  └── Receives: aggr_order_id = "40451" (internal DB ID)
  └── Looks up order from DB by internal ID
  └── Prints: restaurant_order_id = "689/013677" as Order No
  └── Does NOT print: aggrigator_id → KOT shows restaurant number, not Zomato number
```

**BREAK POINT:** `aggregatorService.js:manuallyPrintAggregator()` — `aggrId` not included in payload.

---

## 4. Hypotheses Tested

| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | `aggrId` is not extracted at all in FE | `grep aggrigator_id aggregatorTransform.js` | ELIMINATED — it IS extracted as `aggrId` on line 33 |
| H2 | `aggrId` is not displayed on OrderCard | `grep aggrId OrderCard.jsx` | ELIMINATED — shown at line 492 |
| H3 | `aggrId` is sent to print but backend ignores it | Read `aggregatorService.js` print call | CONFIRMED — `aggrId` is NEVER sent to print |
| H4 | Backend print template includes `aggrigator_id` automatically | Read KOT + live API fields | CONFIRMED NOT — KOT shows `restaurant_order_id`, not `aggrigator_id` |
| H5 | BUG-283 strip applies to print as well | Read KOT notes field | ELIMINATED — raw note printed verbatim |

---

## 5. Variable Mapping Audit (API → FE Transform)

### `order_details_order` — ALL FIELDS

| API field | FE field | Mapped? | Notes |
|---|---|---|---|
| `id` | `orderId` | ✅ | Internal DB ID — used for print call (BUG-290) |
| `restaurant_order_id` | `orderNumber` | ✅ | What KOT shows as "Order No" |
| `urban_order_id` | `urbanOrderId` | ✅ | UrbanPiper's own ID |
| **`aggrigator_id`** | **`aggrId`** | **✅ display only** | **Swiggy/Zomato visible ID — on card, NOT in print payload** |
| `aggrator_ref_id` | — | ❌ | Dropped |
| `agg_order_status` | — | ❌ | Dropped |
| `parent_store_ref_id` | — | ❌ | Dropped |
| `user_id` | — | ❌ | Dropped |
| `user_name` | `customerName` (fallback) | ✅ | |
| `employee_id` | — | ❌ | Dropped |
| `order_status` | — | ❌ | Covered by `fOrderStatus` |
| `store_id` | — | ❌ | Dropped |
| `store_ref_id` | — | ❌ | Dropped |
| `f_order_status` | `fOrderStatus` | ✅ | |
| `b_order_status` | — | ❌ | Backend KOT status |
| `k_order_status` | — | ❌ | Kitchen status |
| `station_order_status` | — | ❌ | Per-station KDS |
| `order_type` | `orderType` | ✅ | |
| `order_amount` | `amount` | ✅ | |
| `item_total` | `itemTotal` | ✅ | |
| `total_tax_amount` | `taxAmount` | ✅ | |
| `total_gst_tax_amount` | — | ❌ | Dropped (overlap with `taxAmount`) |
| `total_vat_tax_amount` | — | ❌ | Dropped |
| `total_service_tax_amount` | — | ❌ | Dropped |
| `delivery_charge` | `deliveryCharge` | ✅ | |
| `packing_charge` | — | ❌ | **MINOR GAP — not mapped** |
| `coupon_code` | `couponCode` | ✅ | |
| `coupon_discount_amount` | `couponDiscount` | ✅ | |
| `coupon_discount_title` | — | ❌ | Dropped |
| `discount_on_product_by` | `discountBy` | ✅ | |
| `restaurant_discount_amount` | — | ❌ | Dropped |
| `order_discount` | — | ❌ | Dropped |
| `comunity_discount` | — | ❌ | Dropped |
| `payment_method` | `paymentMethod` | ✅ | |
| `payment_status` | `paymentType` | ✅ | |
| `transaction_reference` | — | ❌ | Dropped |
| `order_note` | `orderNote` (combined) | ✅ | Strip applied in FE display only |
| `created_at` | `createdAt` | ✅ | |
| `updated_at` | — | ❌ | Dropped |
| `schedule_at` | `scheduledAt` | ✅ | |
| `otp` | `deliveryOtp` | ✅ | |
| `prep_time_mins` | `prepTimeMins` | ✅ | |
| `order_plateform` | `source` | ✅ | Swiggy/Zomato label |
| `restaurant_id` | `restaurantId` | ✅ | |
| `rider_name` | `rider`, `riderName` | ✅ | |
| `rider_phone_number` | `riderPhone` | ✅ | |
| `tip_amount` | — | ❌ | **MINOR GAP — not mapped** |
| `table_id` | `tableId` (0) | ✅ | |
| `waiter_id` | — | ❌ | Dropped |
| `buzz_id` | — | ❌ | Dropped |
| `order_in` | — | ❌ | Dropped |
| `print_kot` | — | ❌ | Dropped |
| `f_order_message` | — | ❌ | Dropped |
| `f_order_reason_code` | — | ❌ | Dropped |
| `cancellation_reason` | — | ❌ | Dropped |
| `canceled_by` | — | ❌ | Dropped |
| Lifecycle timestamps (`accepted`, `confirmed`, `processing`, `ready_at`, etc.) | — | ❌ | All dropped |

### `rider_info`

| API field | FE field | Mapped? |
|---|---|---|
| `id` | riderStatus (presence only) | ✅ |
| `name` | `riderName` (fallback) | ✅ |
| `Phone` | `riderPhone` (fallback) | ✅ |
| `Cahnel` | — | ❌ **NOT MAPPED** — platform channel (e.g. "swiggy") |
| `order_return_otp` | — | ❌ NOT MAPPED |
| `bag_return_otp` | — | ❌ NOT MAPPED |

### `customer_details`

| API field | FE field | Mapped? |
|---|---|---|
| `name` | `customerName` | ✅ |
| `phone` | `phone` | ✅ |
| `address` | `deliveryAddress` | ✅ |
| `email` | — | ❌ Dropped |
| `username` | — | ❌ Dropped |
| `id` | — | ❌ Dropped |

### Top-level (alongside `order_details_order`)

| API field | FE field | Mapped? |
|---|---|---|
| `brand_name` | — | ❌ **NOT MAPPED** — CR-125 filed |

### `order_details_food[]`

| API field | FE item field | Mapped? |
|---|---|---|
| `id` | `id` | ✅ |
| `food_id` | `foodId` | ✅ |
| `pos_id` | `posId` | ✅ |
| `quantity` | `quantity`, `qty` | ✅ |
| `unit_price` | `unitPrice` | ✅ |
| `price` | `price` | ✅ |
| `gst` / `tax_amount` | `tax` | ✅ |
| `tax_breakdown` | `taxBreakdown` | ✅ |
| `discount_on_food` | `discount` | ✅ |
| `discount_type` | `discountCode` | ✅ |
| `food_level_notes` | `notes` | ✅ |
| `station` | `station` | ✅ |
| `food_status` | `foodStatus` | ✅ |
| `food_details.title` | `name` | ✅ |
| `food_details.category.name` | `categoryName` | ✅ |
| `food_details.image_url` | `imageUrl` | ✅ |
| `food_details.add_ons` | `addOns` | ✅ |
| `food_details.variation` | `variation` | ✅ |
| `food_details.order_note` | contributes to `orderNote` | ✅ |
| `food_details.order_item_id` | — | ❌ |
| `order_id` | — | ❌ Redundant |
| `variation` (outer) | via `food_details` | ✅ |
| `add_ons` (outer) | via `food_details` fallback | ✅ |
| `item_campaign_id` | — | ❌ |
| `total_add_on_price` | — | ❌ |
| `reason_type` / `reason` | — | ❌ |
| `item_type` | — | ❌ |
| `item_update_count` | — | ❌ |
| `cancel_type` | — | ❌ |
| `priority` | — | ❌ |
| `ready_at` / `serve_at` / `cancel_at` | — | ❌ |
| `table_id_seq` | — | ❌ |
| `charges` | — | ❌ |

---

## 6. GAPS Summary (Prioritised)

| # | Gap | Severity | Type | CR/BUG |
|---|---|---|---|---|
| **G-1** | `aggrigator_id` NOT in print payload → Zomato/Swiggy order ID missing from KOT | **P1 / HIGH** | FE print payload gap | CR-125 |
| **G-2** | Backend print template does not include `aggrigator_id` on KOT at all | **P1 / HIGH** | Backend template gap | Needs BACKEND_BRIEF |
| **G-3** | BUG-283 `Order Instructions :::` strip is FE-display only — KOT still shows raw prefix | **P2 / MEDIUM** | Backend print reads raw DB note | Needs BACKEND_BRIEF |
| **G-4** | `brand_name` not in transform or print payload | **P2 / MEDIUM** | FE transform + print gap | CR-125 (filed) |
| **G-5** | `packing_charge` not mapped in transform | **P3 / LOW** | FE transform gap | No CR |
| **G-6** | `tip_amount` not mapped in transform | **P3 / LOW** | FE transform gap | No CR |
| **G-7** | `rider_info.Cahnel` not mapped | **P3 / LOW** | FE transform gap | No CR |

---

## 7. Recommendations

**G-1 + G-2 (Zomato/Swiggy ID on KOT) — FE + Backend:**
- FE: Pass `aggrId` in print payload → `manuallyPrintAggregator(orderId, printType, aggrId)`
- Backend: Update KOT template to include `aggrigator_id` as a second ID line (e.g., "Zomato: 242569355005620" below Order No)
- This needs a BACKEND_BRIEF — backend template change is out of FE scope

**G-3 (Order Instructions strip on KOT) — Backend only:**
- BUG-283 fix is in the FE transform (display). The print goes directly from backend DB `order_note` without FE processing.
- Fix needed in backend KOT template — strip `Order Instructions :::` prefix before printing
- BACKEND_BRIEF needed

**G-4 (brand_name) — Already registered as CR-125**

**G-5, G-6, G-7 — Low priority, add to OPEN_GAPS_REGISTER if needed**

---

## 8. OQ-3 Answer (from CR-125 intake)

> "Does the backend print endpoint need `brand_name` from FE, or does it look it up?"

**Answer: Backend already has all fields from DB (looks up by internal `aggr_order_id`).** It can include `aggrigator_id` and `brand_name` without FE passing them — it just needs the backend template updated. However, passing them explicitly from FE is the safer approach and allows immediate verification.

**Revised CR-125 scope:** FE still needs to add `aggrId` and `brand_name` to the print payload (as currently these aren't being sent). The backend template change is a BACKEND_BRIEF item regardless.

---

## 9. Evidence Artifacts

- API response sample: `/app/memory/evidence/CR-125/get_order_list_sample.json`
- KOT image: owner-provided (attached in session)
- Code traces: `aggregatorTransform.js`, `OrderCard.jsx:260-266`, `aggregatorService.js:18-24`

---

## 10. Next Steps

| Action | Owner | Blocking? |
|---|---|---|
| File BACKEND_BRIEF for G-1 (KOT template: add `aggrigator_id`) | Agent → Backend | YES for full fix |
| File BACKEND_BRIEF for G-3 (KOT strip `Order Instructions :::`) | Agent → Backend | YES for full fix |
| CR-125 Planning (FE: add `aggrId` + `brand_name` to print payload + transform) | Planning agent | After backend confirms |
| Register G-3 as new bug in BUG_TRACKER | Intake agent | NO |

---

```
Root cause: CONTRACT_GAP — aggrId extracted in FE, shown on card, but NEVER passed to print payload.
             Backend KOT template uses restaurant_order_id, not aggrigator_id.
Classification: FE_GAP + BACKEND_TEMPLATE_GAP
Confidence: HIGH
Steps used: 7/10
Planning skip eligible: NO — print payload change (HIGH risk, R6 print semantics)
Retroactive candidates: NONE
Investigation report: /app/memory/investigation/CR-125_KOT_ORDERID_INVESTIGATION_2026_08_01.md
```
