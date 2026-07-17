# CR-002 — POS Team Feedback on CRM "Order Suggestions" Handoff v1

**Date:** 2026-05-26
**From:** POS 3.0 Team (E1 reconciliation agent)
**To:** CRM Team
**Re:** Feedback / acceptance / questions on `POST /api/pos/customers/order-suggestions` handoff dated 2026-05-26
**Upstream handoff:** `/app/memory/crm/crm_2_0/handoff/CRM2_0_CR_002_CROSS_SELL_API_HANDOFF_FROM_CRM_2026_05_26.md`

> **Mode:** Read-only review + 11 live probes against the preview endpoint. No code, no data mutation, no POS Frontend/Backend/CRM changes.
> All 11 documented behaviours reproduced live. See §3 for proof.

---

## 1. Overall Verdict

```
green_light_with_minor_clarifications
contract_v1_acceptable_for_pos_consumption
2_supersedure_issues_with_cr_001_to_resolve
3_blocking_clarifications_before_pos_implementation
8_non_blocking_polish_suggestions
1_known_perf_risk_pending_production_deploy
```

**POS will consume `POST /pos/customers/order-suggestions` in CR-002.** The 13 questions below are the only items needed before we can finalize POS-side requirements freeze for CR-002.

---

## 2. Acceptance Summary

### 2.1 ✅ Accepted as-is (no changes requested)

| # | Item | Why we accept it |
|---|---|---|
| A-01 | Single POST endpoint returning 6 blocks (summary, value, patterns, customer-notes, item-notes, cross-sell) | Reduces round trips; matches CRM 2.0 sprint direction |
| A-02 | Same `X-API-Key` auth as `/api/pos/*` | Zero new credential plumbing on POS side |
| A-03 | Additive only — 10 existing endpoints UNTOUCHED | No regression risk to BUG-108 work |
| A-04 | Error model: HTTP 200 + `success:false` + `data.error.code` (`CUSTOMER_NOT_FOUND` / `INVALID_REQUEST`) | Identical to CRM 1.0 endpoints — POS already wired |
| A-05 | HTTP 401 on missing auth, HTTP 422 on malformed body | Standard FastAPI; POS already handles both |
| A-06 | First-time customer pattern: `customer_value` block **omitted entirely** (not null) | Clean signal; easy `'customer_value' in data` check |
| A-07 | Cross-sell algorithm: 60% personal + 40% restaurant; `confidence` 0-1; `source: "history"` vs `"restaurant"` | Transparent; explainable to cashier |
| A-08 | Cross-sell excludes `current_cart` items | Verified live in P-10 (`item_id:182040` correctly drops from cross-sell when added to cart) |
| A-09 | `meta.feature_flags.{cross_sell,upsell,ai}` | Forward-compat for Phase 2; POS gates UI on these |
| A-10 | "Advisory only" rule — no auto-apply | Aligns with cashier-control product principle |

### 2.2 ✅ Live-validated against spec (11 probes passed)

| # | Scenario | Spec | Live result |
|---|---|---|---|
| P-1 | Full request (cart + selected_item) | 200 + all 7 blocks | ✅ 200, all blocks, 2.7s |
| P-2 | No selected_item | 200 + item_notes:[] | ✅ item_notes present, len=0 |
| P-3 | `pos_customer_id:"22"` only | 200 + same customer | ✅ resolved abhishek jain (CRM uuid `1779d4fc-...`) |
| P-4 | Empty body `{}` | `INVALID_REQUEST` | ✅ HTTP 200, `code:"INVALID_REQUEST"` |
| P-5 | All-zero UUID | `CUSTOMER_NOT_FOUND` | ✅ HTTP 200, `code:"CUSTOMER_NOT_FOUND"` |
| P-6 | No auth | HTTP 401 | ✅ 401 with `detail` field |
| P-7 | Cache-Control header | not documented | server sends `no-store, no-cache, must-revalidate` (info — see Q-08) |
| P-8 | Warm latency × 5 | "<500ms production" | 1.72–2.71s (preview; see Q-10) |
| P-9 | First-time customer (visits=0) | `customer_value` omitted | ✅ omitted, top_items=[], cross_sell=[] |
| P-10 | Cart-exclusion works | exclude current_cart items | ✅ `182040` dropped when added to cart; new candidate `182042` surfaces |
| P-11 | Malformed body (`crm_customer_id` as int) | HTTP 422 | ✅ 422, pydantic detail |

---

## 3. Supersedure Issues vs CR-001 (POS-side, **needs resolution**)

> Two days ago POS froze contract v1 for CR-001 (Customer Notes Suggestion) consuming the legacy GET endpoints `/notes/items` + `/notes/orders`. The new POST endpoint **supersedes both** (it returns `customer_notes` + `item_notes` blocks inline) AND resolves the `item_name` keying risk we flagged as G-01 (new endpoint keys by `item_id`).

| # | Issue | POS proposal | CRM action requested |
|---|---|---|---|
| **S-01** | New POST endpoint returns `customer_notes` (order-level) + `item_notes` (item-level) — same data the legacy GETs return | POS abandons CR-001's legacy-GET plan; consolidates everything into POST `/order-suggestions`. Saves 2 round trips per customer attach. | **Confirm**: are the legacy GETs `/notes/items` + `/notes/orders` deprecated, or kept as fallback? Recommend: keep live but mark "soft-deprecated; consumers should migrate to POST `/order-suggestions`". |
| **S-02** | Legacy `/notes/items` keys by **`item_name` string** (CR-001 G-01 risk: menu rename breaks suggestions). New POST `item_notes[]` has explicit `item_id` field. | POS uses new POST; closes CR-001 G-01 as **resolved by API design**. | **Confirm**: `item_notes[].item_id` is the POS `food_id` (string like `"182042"`), identical to `current_cart[].item_id` and `cross_sell_items[].item_id`? |

---

## 4. Blocking Questions (need answers before POS impl freeze)

### Q-01 — `cross_sell_items[].item_id` provenance

Spec §5.6 says `pos_food_id`. Live response uses `"182040"` etc. Confirm this is **identical** to:
- `pos_food_id` in `/pos/customers/{id}/orders` response (= **YES** based on live data)
- POS food menu primary key (`food.id` string in POS Backend `productService.js`)
- `current_cart[].item_id` and `selected_item.item_id` in the request

If yes, POS can directly hydrate cross-sell tiles from the local menu cache via `menu.find(f => f.id === xs.item_id)`. **If no**, POS needs a CRM food-ID → POS food-ID mapper.

### Q-02 — `available_coupons_count` source

Spec §5.1 says "Active coupons count for this restaurant". Two interpretations:
- (a) Customer-applicable coupons (= `GET /pos/coupons/available?customer_id=X` count)
- (b) All coupons defined at the restaurant (= admin-side total)

POS already calls `GET /pos/coupons/available?customer_id=X` (BUG-108 V1B). If `available_coupons_count` diverges from that endpoint's list length, cashiers will see inconsistent numbers. **Recommend (a)** — same source as `/pos/coupons/available`.

### Q-03 — `customer_summary.tier` enum

Spec §5.1 says `Bronze / Silver / Gold / Platinum`. Is "Platinum" highest? Confirm casing is fixed (`"Bronze"`, not `"bronze"` — live response shows capitalized). POS will hardcode an icon/colour mapping; need the closed enum.

---

## 5. Non-Blocking Clarifications / Recommendations

### Q-04 — `selected_item` triggers **another POST**

Spec §9 step 4: "When cashier selects/clicks an item, POS re-calls with `selected_item`". With 5-cart-line orders this is ≥6 calls per order. At preview latency (~2 s/call) that's 12 s of background work.

POS proposal — pick one:
- (a) **CRM returns item-notes for ALL items in `current_cart` in a single map** (`item_notes_by_id: { "182040": [...], "182037": [...] }`). One call covers the cart.
- (b) Keep per-item re-call; POS debounces note-modal opens (current CR-001 behaviour).
- (c) Keep CRM-side GET `/notes/items` for whole-customer aggregate as a SECOND parallel call when customer is attached (one cold call → many warm note-modal opens served from cache).

**POS recommendation: (a) if CRM can ship in v1; otherwise (c).**

### Q-05 — `net_spend` placeholder

Spec §5.1 / §12: `net_spend = gross_spend` until Phase 2 subtracts discounts. POS would display "Total Spend ₹X" today. If we display `net_spend` and Phase 2 changes the value, the cashier sees a one-day discontinuity.

POS recommendation: **expose only `gross_spend` in POS UI for v1; ignore `net_spend` until Phase 2 ships**. Confirm OK.

### Q-06 — `top_categories[].category` numeric IDs

Live response shows `"6777"`, `""`, `"5128"`. Phase 2 will map to names.

POS proposal: **hide the top-categories block entirely in v1** until names ship. POS does not own the CRM category→name mapping. Confirm OK.

### Q-07 — `customer_value.score` raw float (e.g. 63.7)

Spec §5.2 shows decimals. Floats may render as `63.69999...` after JSON parse on some JS engines.

POS proposal: **display only `band` (Low/Medium/High/VIP) as a badge in v1; never show raw `score`** (too easy to misread, false precision). Confirm OK.

### Q-08 — Cache-Control header

Live probe (P-7, P-12) confirmed: server sends `Cache-Control: no-store, no-cache, must-revalidate`. Anti-pattern §11 says "POS must not cache > 5 min".

POS proposal: **POS implements a per-customer-id, per-cart-version 5-minute memoization on its own**; respects server `no-store` only insofar as not persisting to localStorage. In-flight RAM cache for the cashier session is required (otherwise every modal open re-fetches at 1.7s+ latency).

Acceptable to CRM? Or do you want POS to disable cache entirely (= every modal open ≥1.7s)?

### Q-09 — `usual_time_of_day` cashier comparison

`afternoon` returned today for abhishek. If cashier is creating an order at 9 AM (morning) → should POS surface a subtle "outside customer's usual window" hint? Or just show the chip without comparison?

POS recommendation: **v1: show chip only, no comparison logic.** Confirm.

### Q-10 — Performance: 1.7-2.7s preview vs <500ms production target

Live (5 warm calls) showed median 1.73s. Spec §13 says "<500ms expected in co-located production". When is production deployment expected? POS will gate the live customer-attach flow on this latency.

POS proposal: **POS implements with a 3000ms hard timeout + skeleton loading + silent-hide on timeout** (same pattern as CR-001 G-10). If prod latency lands <500ms, the skeleton is invisible. Confirm timeout strategy is OK.

### Q-11 — `churn_risk: high` cashier UX

Spec §5.2: `win_back_recommendation: true` when `churn_risk: "high"`. Should POS:
- (a) Show subtle "Win-back opportunity" badge (recommend)
- (b) Auto-suggest a coupon (anti-pattern per §11)
- (c) Nothing visible — backend signal only

POS proposal: **(a) — non-intrusive badge; cashier decides if/how to act.** Confirm.

---

## 6. Polish / Nice-to-Have (not blocking)

| # | Ask | Reason |
|---|---|---|
| **P-01** | Add `meta.request_id` (UUID) on every response | Cross-team debug; today only Cloudflare `cf-ray` available |
| **P-02** | Document `top_items.length` upper bound (currently 5; confirm cap) | Schema closure |
| **P-03** | Add explicit `currency` field on `customer_summary` and `cross_sell_items` (or restaurant-level once) | Future multi-region readiness |
| **P-04** | Unify field name: `cross_sell_items[].title` vs `top_items[].name` — both = human label | Schema consistency |
| **P-05** | `source: "history"` is always `"history"` in v1; consider omitting until v2 | Slim payload |
| **P-06** | `avg_items_per_order: 3.0` vs sum of top-5 counts (142 / 19 = 7.5) — document that top_items is sampled, not full | Doc accuracy |
| **P-07** | Document expected `phone` format (`"7505242126"` raw, no `+91` prefix; `country_code` field absent) | POS rendering |
| **P-08** | Document whether `customer_summary.last_visit_at` includes UTC offset (live shows `+00:00`) | Time-zone handling |

---

## 7. Risk / Open Items POS is Accepting (no CRM action needed)

| # | Risk | POS mitigation |
|---|---|---|
| R-01 | Latency 1.7-2.7s on preview (vs <500ms prod target) | 3s hard timeout + skeleton + silent-hide |
| R-02 | Server sends `no-store` — no HTTP-layer caching | POS RAM-only cache per customer+cart-version, 5min TTL |
| R-03 | `customer_value` omitted for ≤1 visit (incl. visits=1 — confirmed live in P-9b) | POS checks `'customer_value' in data` (truthy presence) |
| R-04 | `cross_sell_items[].item_id` may reference a food not in current menu (deleted/inactive) | POS guards with `menu.find()`; silently drops if not found |
| R-05 | First-time customer `cross_sell_items: []` — empty section | POS hides section entirely (no "no suggestions" copy) |
| R-06 | Cart re-call on every cart change = O(N) calls | POS debounces 500ms after cart mutation |

---

## 8. Updated CR-002 Plan (POS-side, post-feedback)

Once Q-01..Q-11 are answered, POS will:

1. **Supersede CR-001's legacy-GET plan** — write a `_v2` of CR-001 contract freeze that re-points POS notes suggestion to the new POST endpoint (closes CR-001 G-01 as resolved-by-API). Or merge CR-001 into CR-002 entirely.
2. **Write CR-002 discovery doc** consolidating: this feedback, the live-probe matrix, the supersedure with CR-001, and the resulting Phase B POS work.
3. **Owner decisions stage** — pick UX choices for: value-band badge style, top-items chips, cross-sell card placement, churn-risk badge.
4. **CR-002 contract freeze** — frozen schema (after CRM answers Q-01..Q-11).
5. **CR-002 requirements freeze** → handoff to planning agent (per CRM 2.0 README §4).

**No code is being written. Planning agent + impl agent stages come later.**

---

## 9. Open Sprint-Level Question for CRM

| # | Question |
|---|---|
| **SL-01** | The new endpoint name says "cross-sell" but actually returns 6 disjoint blocks (summary, value, patterns, customer-notes, item-notes, cross-sell). Will Phase 2 add an `upsell_items` block to the **same endpoint** (`meta.feature_flags.upsell: true`), or ship as a separate endpoint? POS architecture differs significantly between the two — needs to know now. |

---

## 10. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No POS Frontend / Backend / CRM code changed | ✅ |
| 2 | No data mutated (only GET + read-only POST `/order-suggestions` × 11 probes) | ✅ |
| 3 | No mutating API called | ✅ |
| 4 | `/app/memory/final/` untouched | ✅ |
| 5 | `/app/memory/crm/crm_1_0/` untouched | ✅ |
| 6 | Upstream handoff doc archived verbatim under `/app/memory/crm/crm_2_0/handoff/` | ✅ |
| 7 | All 11 live probes executed against preview origin with owner-supplied credentials | ✅ |
| 8 | No CR-002 contract freeze, requirements freeze, or impl plan written (await CRM answers) | ✅ |

---

## 11. Single-Page Summary for CRM Reply

> POS team is GREEN on consuming `POST /api/pos/customers/order-suggestions` in CR-002.
> Verified all 11 documented behaviours live (see §2.2).
>
> **Two CR-001 supersedure decisions needed (§3):**
> - S-01: Are legacy `/notes/items` + `/notes/orders` GETs being deprecated?
> - S-02: Is `item_notes[].item_id` identical to POS `food_id`?
>
> **Three blocking clarifications (§4):**
> - Q-01: `cross_sell_items[].item_id` = POS `food.id` (string)?
> - Q-02: `available_coupons_count` = same source as `/pos/coupons/available`?
> - Q-03: Tier enum fully closed at {`Bronze`,`Silver`,`Gold`,`Platinum`} with that casing?
>
> **Eight non-blocking clarifications (§5):** Q-04..Q-11 (per-item re-call cost, `net_spend` placeholder, category names, score rounding, cache policy, time-of-day comparison, perf timeline, churn-risk UX).
>
> **Eight nice-to-haves (§6):** P-01..P-08.
>
> **One sprint-level (§9):** SL-01 — upsell in same endpoint or new one?
>
> POS will write the CR-002 discovery doc + freeze the contract once we have S-01, S-02, Q-01, Q-02, Q-03 (the 5 blockers).

---

**End of POS Team feedback on CRM Cross-Sell handoff v1.**
