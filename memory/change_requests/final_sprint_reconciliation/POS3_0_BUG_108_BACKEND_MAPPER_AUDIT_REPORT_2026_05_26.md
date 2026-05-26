# POS3.0 — BUG-108 Backend Mapper Audit Report (POS Backend ↔ CRM)

**Date:** 2026-05-26
**Sprint:** BUG-108 Coupon + Loyalty (final QA wave)
**Author:** QA + Documentation Agent (read-only)
**Status sticker:** `bug_108_backend_mapper_audit_blocked_by_test_data_and_backend_repo_access_2026_05_26`

> ⚠️ This audit covers the **POS Backend (Laravel)** stage of the data
> pipeline:
>
> ```
> POS Frontend  →  POS Backend (Laravel @ preprod.mygenie.online)  →  CRM (crm.mygenie.online)
>   coupon_* +    [mapper]: forwards body to CRM /api/pos/orders     [persists coupon_usage]
>   loyalty_*
>   items[]
> ```
>
> Items I-1 through I-5 are **POS Backend mapper** concerns, NOT POS
> Frontend concerns. The POS Backend repo is **not present** in this
> workspace (`/app/backend/` contains only the FastAPI test boilerplate
> `server.py`, not the Laravel POS Backend). All five items therefore
> sit in **NOT_RUN** until either (a) the Laravel mapper source is
> available, or (b) preprod request/response evidence is captured for a
> live commit.

---

## 1. What the Frontend Sends Today (confirmed)

| Wire field | Source on frontend | Reference |
|---|---|---|
| `coupon_code` | `discounts.couponCode` (Flow 3 + Flow 4) | `orderTransform.js` L1168, L1381 |
| `coupon_discount` | `discounts.couponDiscount` | L1169, L1382 |
| `coupon_title` | `discounts.couponTitle` | L1170, L1383 |
| `coupon_type` | `discounts.couponType` | L1171, L1384 |
| `cart[]` (→ CRM `items[]`) | `buildCart(billableItems, …)` | already passed in Flow 3 / Flow 4 payloads |
| `used_loyalty_point` | `discounts.loyaltyPointsRedeemed` (gated by `loyaltyRatioLive`) | L1178, L1395 |
| `loyalty_points_used` | same | L1181, L1398 |
| `loyalty_discount` | `discounts.loyaltyPoints` | L1184, L1401 |
| `loyalty_redemption_id` | `null` (POS Backend supplies) | L1187, L1404 |
| `loyalty_idempotency_key` | **NOT emitted by frontend** | POS Backend generates as `order_{id}_loyalty` per Phase C contract |

The frontend side of all five mapper items is consistent with the
CR-001C-C handoff and CR-001C-LR Phase C contract.

---

## 2. Audit Items

| ID | Item | Evidence | Result | Notes |
|---|---|---|---|---|
| **I-1** | `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` forwarded **unstripped** from POS Frontend → POS Backend → CRM `/api/pos/orders`. | Frontend send confirmed (see §1). POS Backend mapper source **not in workspace**. No preprod CRM request log captured. | **NOT_RUN** | **Blocker:** POS Backend Laravel repo + preprod request log required. Recommend tcpdump-equivalent or CRM `/api/pos/orders` ingress log of one preprod commit with a coupon to verify all four fields land on the CRM side identically. |
| **I-2** | For V3 BOGO/BXG/Every-Nth, `coupon_type` omission or mapping is accepted by POS Backend and CRM. CRM contract allows `coupon_type` to be omitted on V3 (BOGO/BXG/Every-Nth) because the offer-shape is conveyed via `offer_type` on the coupon row, not on the order payload. | Frontend always sends `coupon_type` (validate response's `coupon_type` field — typically `'order'` for V3-B/V3-C since `discount_scope` is order-level even when items are involved). CRM handoff §7 confirms `coupon_type` is informational. | **NOT_RUN** | Live commit of a V3-B BOGO order + a V3-C Every-Nth order needed to confirm CRM accepts whatever `coupon_type` the frontend emits. **Risk: LOW** because CRM marks the field informational. |
| **I-3** | Bill print template renders coupon discount line. | Frontend prints via `/api/v1/vendoremployee/order-temp-store` (`PRINT_ORDER`) with `couponCode` + `couponDiscount` in payload (see `OrderEntry.jsx` L1208-L1209, L1271-L1272, L1659-L1660, L1883-L1884; `CollectPaymentPanel.jsx` L1086-L1090). The bill template itself lives in POS Backend / print-agent. | **NOT_RUN** | **Blocker:** print-agent template source not in workspace. Live preprod bill (PDF / printer raw) needs to be captured after a coupon order to verify the "Coupon ABC -₹X" line renders. **Risk: MEDIUM** — pre-V1B field `coupon_code` is newly added (Owner SQ-1 = A 2026-05-25); template may have been keyed on the previous `coupon` field. |
| **I-4** | `items[]` / `OrderItem` schema forwarded for V2 / V3 final-commit CRM revalidation. | Frontend `cart[]` is built by `buildCart()` and passed in Flow 3 / Flow 4. CRM handoff §7.1 maps `pos_food_id` / `item_qty` / `item_price` / `item_category` aliases internally. | **NOT_RUN** | **Blocker:** POS Backend mapper code + preprod CRM ingress log. The risk is that the Laravel mapper strips or renames fields between POS Backend and CRM. Use a V2 item-scope coupon for the test: if mapper drops `pos_food_id`, CRM returns `NO_ELIGIBLE_ITEMS_IN_CART` despite eligible items being on the cart. |
| **I-5** | `loyalty_idempotency_key` is generated/injected by POS Backend as `order_{id}_loyalty` where required. | Frontend deliberately does **not** generate this (see Phase C handoff `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md` and `BUG108_FLAGS.js` line 38 comment). `loyaltyService.buildRedeemIdempotencyKey` exists but is **dead code** under the current kill-switched config. | **NOT_RUN** | **Blocker:** POS Backend source. Verify Laravel order-commit handler computes and forwards `loyalty_idempotency_key='order_{id}_loyalty'` (or whatever form CRM accepts) for any order with `used_loyalty_point > 0`. **Risk: MEDIUM** — without the key, CRM may double-deduct on POS retries. |

---

## 3. Live Verification Plan (when test data is unblocked)

For each audit item, the recommended evidence is:

| ID | Verification step | Expected pass criterion |
|---|---|---|
| I-1 | Capture POS Frontend → POS Backend payload (browser devtools); then POS Backend → CRM payload (CRM ingress log or Laravel `Log::info` patch); compare. | All four fields (`coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type`) present and equal on both legs. |
| I-2 | Place a V3-B BOGO commit and a V3-C Every-Nth commit. Inspect CRM response. | `coupon_usage.recorded=true` and `coupon_usage.offer_type` matches `bogo`/`bxg`/`nth_item`. |
| I-3 | Print a bill for an order with `coupon_discount>0`. Capture PDF + raw printer ESC/POS dump. | Line "Coupon <CODE>  −₹X" appears in printed bill. |
| I-4 | Place a V2 item-scope commit on `/api/pos/orders` with `coupon_code` + a cart that contains the eligible item. | CRM `coupon_usage.recorded=true` and `eligible_subtotal` > 0. If `false` with `NO_ELIGIBLE_ITEMS_IN_CART`, mapper is stripping cart fields → fix POS Backend. |
| I-5 | Place a loyalty-redeeming order, then retry the same `order_id` (idempotency replay). | `loyalty_redemption_id` present on first call. On replay, CRM returns identical `usage_id` + no double-deduct on customer's loyalty balance. |

---

## 4. Final Status

`bug_108_backend_mapper_audit_pending_backend_repo_access_and_test_data_2026_05_26`

| Item | Status |
|---|---|
| Frontend send-side (per item) | All five **VERIFIED in code** |
| POS Backend mapping (per item) | All five **NOT_RUN** |
| Final pass/fail | All five **BLOCKED_BY_TEST_DATA / BLOCKED_BY_BACKEND_SOURCE_ACCESS** |

---

## 5. Owner / Team Allocation

| Item | Probable owner |
|---|---|
| I-1 | POS Backend team (Laravel mapper for `/api/pos/orders` → CRM forward) |
| I-2 | POS Backend + CRM teams jointly |
| I-3 | POS Backend bill-print template team / print-agent team |
| I-4 | POS Backend team |
| I-5 | POS Backend team (loyalty idempotency-key generation) |

POS Frontend team has **no further work** on these five items — the
frontend payload contract is correct and verified.

---

## 6. Recommended Next Action

1. POS Backend team produces a one-shot capture of the request/response
   pair for `POST /api/pos/orders` (Laravel → CRM) for a single
   coupon-bearing order in preprod.
2. POS Backend team confirms `loyalty_idempotency_key` injection on the
   same trip when `used_loyalty_point > 0`.
3. Print-agent team prints one bill with `coupon_discount > 0` and
   shares the printed bill image / PDF.
4. After steps 1–3, this audit doc is updated row-by-row with concrete
   evidence and the per-item result flipped from **NOT_RUN** to
   **PASS / FAIL**.

No code changes are recommended at this stage — the audit is
investigative, not corrective.
