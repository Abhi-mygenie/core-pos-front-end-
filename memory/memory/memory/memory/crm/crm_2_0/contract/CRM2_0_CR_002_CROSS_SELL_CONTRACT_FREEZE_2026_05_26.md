# CRM 2.0 — CR-002 Cross-Sell + Customer Intelligence — Contract Freeze v1.1

**Date:** 2026-05-26
**Sprint:** CRM 2.0
**CR ID:** `CR_002`
**Topic:** `CROSS_SELL_UPSELL`
**Type:** `CONTRACT_FREEZE`
**API version:** **v1.1** (live-verified 5/6 changes on `react-python-crm.preview.emergentagent.com`; Q-02 deploy lag tracked in open gaps)
**Status sticker:** `crm2_0_cr_002_cross_sell_contract_freeze_v1_1_2026_05_26`
**Supersedes:** CR-001 contract freeze v1 (legacy GET `/notes/items` + `/notes/orders` paths are no longer the POS primary consumer; new POST inline blocks replace them).

> **Purpose.** Lock the CRM ↔ POS API contract for cross-sell + customer intelligence so that the POS planning agent and implementation agent can build against a frozen schema. Once frozen, drift requires a `_v2` revision.

---

## 1. In-Scope Endpoint

| Method | Path | Host | Owner |
|---|---|---|---|
| `POST` | `/api/pos/customers/order-suggestions` | `https://insights-phase.preview.emergentagent.com` (preview) → production co-located CRM+Mongo (TBD) | CRM Team |

**Out of scope of this contract:**
- Legacy `GET /pos/customers/{id}/notes/items` — **NOT deprecated** (CRM confirmed S-01); kept live but POS does NOT use it after CR-002 ships
- Legacy `GET /pos/customers/{id}/notes/orders` — same as above
- `POST /api/pos/coupons/validate`, `GET /api/pos/coupons/available`, `POST /api/pos/max-redeemable` — unchanged from BUG-108
- Phase-2: upsell, AI suggestions, `net_spend` actual computation, category name resolution

---

## 2. Auth

| Field | Value |
|---|---|
| Header | `X-API-Key: <crm_token>` (same key POS uses for `/pos/coupons/*`, `/pos/max-redeemable`) |
| Alternative | `Authorization: Bearer <token>` accepted; POS uses `X-API-Key` for parity |
| Token source | `POST /api/v1/auth/vendoremployee/login` response field `crm_token` |
| Scoping | **Per-restaurant** — token is restaurant-bound at issuance (CRM Q5a confirmed) |

---

## 3. Request

```json
{
  "crm_customer_id": "1779d4fc-7161-4407-ac8c-cce30beb3e53",
  "pos_customer_id": null,
  "current_cart": [
    { "item_id": "182042", "qty": 1, "unit_price": 349.0 }
  ],
  "selected_item": { "item_id": "182042" },
  "order_type": "dine_in"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `crm_customer_id` | string (uuid) | YES *(or `pos_customer_id`)* | Preferred; comes from POS `customer.id` (already in state from BUG-108) |
| `pos_customer_id` | string | optional | Fallback; resolved server-side to CRM customer |
| `current_cart` | array | optional | If present, used to: (a) exclude items already in cart from `cross_sell_items[]`; (b) populate `item_notes_by_id` keys with every cart item |
| `current_cart[].item_id` | string | YES inside array | Equal to POS `food.id` (string form) — CRM confirms identical to `pos_food_id` (S-02, Q-01) |
| `current_cart[].qty` | int | optional, default `1` | Informational; doesn't affect suggestions |
| `current_cart[].unit_price` | float | optional, default `0` | Informational |
| `selected_item.item_id` | string | optional | If present, additionally populates the legacy single-item `item_notes[]` array (backward-compat) |
| `order_type` | string | optional | `dine_in` / `takeaway` / `delivery` — informational for now |
| `restaurant_id` | string | optional | Derived from auth token |

### 3.1 Validation rule

> **At least one of `crm_customer_id` OR `pos_customer_id` MUST be provided.** Empty body returns `INVALID_REQUEST`.

---

## 4. Response — Success Schema (v1.1)

```ts
type OrderSuggestionsResponse = {
  success: true,
  message: string,                         // human-readable; don't parse
  data: {
    customer_summary: {
      name: string,                        // .trim() on display
      phone: string,                       // raw, no country-code prefix
      tier: "Bronze" | "Silver" | "Gold" | "Platinum",  // closed enum, default Bronze (Q-03)
      visits: number,                      // int
      gross_spend: number,                 // float; show as "Total Spend ₹X"
      net_spend: number,                   // float; v1.1 = gross; POS suppresses display (Q-05)
      last_visit_at: string | null,        // see §4.4 — dual format
      loyalty_points: number,              // int, spendable balance
      wallet_balance: number,              // float
      available_coupons_count: number,     // accurate per-customer (Q-02); POS hides in v1 (F-01)
      currency: "INR"                      // P-03 v1.1; v1 → multi-currency in future
    },
    customer_value?: {                     // OMITTED entirely when visits <= 1 (first-time customer)
      score: number,                       // 0-100 float; POS does NOT display raw
      band: "low" | "medium" | "high" | "vip",
      avg_order_value: number,
      frequency_per_month: number,
      recency_days: number,
      churn_risk: "low" | "medium" | "high",
      win_back_recommendation: boolean
    },
    order_patterns: {
      top_items: Array<{                   // cap = 5 (P-02)
        item_id: string,                   // = POS food.id
        name: string,                      // human label
        order_count: number,
        last_ordered_at: string            // ISO 8601 UTC with offset
      }>,
      top_categories: Array<{              // cap = 5; POS HIDES in v1 (Q-06 — numeric ids only)
        category: string,                  // numeric id as string; Phase 2 maps to name
        order_count: number
      }>,
      avg_items_per_order: number,         // float; top_items is sampled (P-06)
      usual_channel: "dinein" | "takeaway" | "delivery" | null,
      usual_time_of_day: "morning" | "afternoon" | "evening" | "night" | "late_night" | null   // restaurant-local time
    },
    customer_notes: Array<{                // top 5 order-level notes by frequency
      text: string,
      used_count: number,
      last_used_at: string,                // ISO 8601 UTC
      source: "history"                    // v1; Phase 2: "history" | "restaurant" | "ai" (P-05)
    }>,
    item_notes: Array<{                    // populated ONLY when selected_item provided; backward-compat
      item_id: string,                     // = POS food.id (S-02)
      text: string,
      used_count: number,
      last_used_at: string,
      source: "history"
    }>,
    item_notes_by_id: {                    // NEW v1.1 (Q-04); always present (empty {} when no cart)
      [item_id: string]: Array<{           // keyed by POS food.id string
        text: string,
        used_count: number,
        last_used_at: string,
        source: "history"
      }>
    },
    cross_sell_items: Array<{              // cap = 3; excludes current_cart items
      item_id: string,                     // = POS food.id (Q-01)
      name: string,                        // v1.1: was `title` (P-04 — `title` DROPPED entirely, C-1)
      reason: string,                      // e.g. "Ordered in 8 of 20 visits"
      source: "history" | "restaurant",
      confidence: number                   // 0-1
    }>,
    meta: {
      generated_at: string,                // ISO 8601 UTC
      request_id: string,                  // UUID — NEW v1.1 (P-01)
      feature_flags: {
        cross_sell: boolean,               // true in v1.1
        upsell: boolean,                   // false in v1.1; true → upsell_items[] block appears (SL-01)
        ai: boolean                        // false
      }
    }
  }
};
```

### 4.1 First-time customer (visits ≤ 1)

`customer_value` block is **OMITTED entirely** (not `null`). POS detection:

```js
if (!('customer_value' in data)) {
  // render "New Customer" badge; skip band/churn pills
}
```

`top_items` and `cross_sell_items` arrive as `[]` for first-time customers. POS hides those sections.

### 4.2 Frozen field-name asymmetries (do NOT auto-normalize across endpoints)

| Endpoint / block | Per-note timestamp field |
|---|---|
| `data.customer_notes[i].last_used_at` | `last_used_at` |
| `data.item_notes[i].last_used_at` | `last_used_at` |
| `data.item_notes_by_id[id][i].last_used_at` | `last_used_at` |
| `data.order_patterns.top_items[i].last_ordered_at` | `last_ordered_at` |

POS transform normalises all to `lastUsedAt` (camelCase) on the JS side.

### 4.3 Sort + cap guarantees (frozen)

| Array | Server cap | Server sort | POS re-sorts? |
|---|---|---|---|
| `top_items` | 5 | `order_count` DESC | Yes — defensive |
| `top_categories` | 5 | `order_count` DESC | n/a (hidden) |
| `customer_notes` | 5 | `used_count` DESC, then `last_used_at` DESC | Yes — defensive |
| `item_notes` | small (per item) | `used_count` DESC | Yes — defensive |
| `item_notes_by_id[id]` | small (per item) | `used_count` DESC | Yes — defensive |
| `cross_sell_items` | 3 | `confidence` DESC | No |

### 4.4 `last_visit_at` dual format (P-08, frozen)

| Source | Format |
|---|---|
| Migrated orders | `"YYYY-MM-DD HH:MM:SS"` — no timezone offset (assume UTC) |
| Realtime orders | ISO 8601 `"YYYY-MM-DDTHH:MM:SS.ffffff+00:00"` |

POS transform MUST parse both:

```js
const dt = raw.includes('T')
  ? new Date(raw)                  // ISO 8601 path
  : new Date(raw.replace(' ', 'T') + 'Z');   // legacy path, assume UTC
```

---

## 5. Response — Errors (HTTP 200 + `success: false` pattern)

```json
{
  "success": false,
  "message": "<human readable>",
  "data": { "error": { "code": "...", "detail": "..." } }
}
```

| `code` | Trigger | POS UX |
|---|---|---|
| `CUSTOMER_NOT_FOUND` | UUID / pos_customer_id matches no customer under this restaurant | Render empty state (no profile banner); section hidden silently |
| `INVALID_REQUEST` | Neither id provided | POS treats as bug — `console.warn`; do not retry |

**Native HTTP errors (do not return `success` body):**

| Status | Trigger | POS UX |
|---|---|---|
| `401` | Missing / invalid auth | Hide all CR-002 sections; `console.warn('customerIntel: auth fail')` |
| `422` | Pydantic validation (e.g. wrong type) | Treat as bug — `console.error`; do not retry |
| `5xx` | Server error | Hide sections silently; `console.warn` |
| Network / timeout > 3000 ms | Slow link or down | Hide sections silently; show placeholder skeleton briefly then hide |

---

## 6. Caching + Latency

| Aspect | Frozen behaviour |
|---|---|
| Server cache headers | `Cache-Control: no-store, no-cache, must-revalidate` (verified live) |
| POS-side cache | RAM-only memoization keyed by `(customer_id, cart_fingerprint)`; TTL = 5 min; never persisted to localStorage (Q-08, anti-pattern §11) |
| Hard timeout | **3000 ms** (Q-10) |
| Expected latency | Preview: 1.7-2.7 s (Mongo via internet). Production: <500 ms (co-located CRM+Mongo). |
| Cart-change re-call | Debounced 500 ms after cart mutation; only re-call if cart fingerprint changed |

### 6.1 Cart fingerprint

```js
fingerprint = JSON.stringify(
  cart.map(line => [line.item_id, line.qty]).sort()
);
```

Cache key: `${customer.id}__${fingerprint}__${selected_item?.item_id || ''}`.

---

## 7. Auth + Restaurant Scoping

| Aspect | Frozen |
|---|---|
| Auth | `X-API-Key` (restaurant-scoped token from login) |
| Multi-restaurant aggregation | OUT OF SCOPE for v1.1; per-restaurant only (CRM Q5a) |
| Cross-restaurant suggestions | DEFERRED to future CR |

---

## 8. Field-by-Field Behaviour (frozen)

### 8.1 Whitespace / case

| Field | POS handling |
|---|---|
| `customer_summary.name` | `.trim()` before display |
| `customer_summary.phone` | display as-is; format depends on POS-side write (P-07) |
| `*.name`, `*.text`, `*.reason` | display as-is; no normalization |

### 8.2 Item matching

`top_items[].item_id` / `cross_sell_items[].item_id` / `item_notes_by_id[id]` / `item_notes[].item_id` ALL equal POS `food.id` (string). POS uses the local menu cache:

```js
const food = menu.find(f => f.id === apiItem.item_id);
if (!food) {
  // CRM references a food not in current menu — silently drop
  return null;
}
```

### 8.3 Click-to-add behaviour (Owner Q3 — Customer Favourites + Cross-sell rows)

Mirrors **existing menu-item click behaviour** in `OrderEntry.jsx#L1437`:

```js
onClick={() => food.customizable ? setCustomizationItem(food) : addToCart(food)}
```

- If `food.customizable === true` → opens `ItemCustomizationModal`
- Else → adds directly to cart

### 8.4 Bands + churn colours (Owner Q3, Q6a — locked)

| State | Pill colour | Icon |
|---|---|---|
| Tier `Bronze` | bronze | medal |
| Tier `Silver` | silver | medal |
| Tier `Gold` | gold | medal |
| Tier `Platinum` | platinum | medal + star |
| Band `low` | gray | trending-down |
| Band `medium` | yellow | minus |
| Band `high` | green | trending-up |
| Band `vip` | purple + star | crown |
| Churn `low` | (no pill) | — |
| Churn `medium` | yellow | alert-triangle "Watch" |
| Churn `high` | red | alert-octagon "At Risk" |
| Win-back (`win_back_recommendation: true`) | cyan | rotate-cw "Win-back" |

---

## 9. Open Sub-Items (track in `open_gaps/`)

| ID | Item | Status |
|---|---|---|
| OG-Q02 | `available_coupons_count` Q-02 fix verified in code spec but observed return value still matches v1 broad semantic (24) on the working preview host across 3 test customers. **Does not block CR-002** since POS hides this field per F-01 Option A. | Track until QA stage confirms deploy. |
| OG-T1 | Production co-located deploy timeline unknown — POS ships defensively with 3 s timeout. | Wait for CRM ops update. |
| OG-T2 | `usual_time_of_day` parsed in restaurant-local time but POS does not yet know the restaurant's IANA timezone. v1 doesn't do comparison; future enhancement. | Backlog. |
| OG-OA1 | Legacy `/notes/items` + `/notes/orders` still in repo; POS does not consume them after CR-002 lands. Recommend QA verifies zero calls. | Track during QA. |
| OG-OA2 | When `feature_flags.upsell` flips to `true`, `data.upsell_items[]` block will appear. POS must include forward-compat render gate. | Honoured in §10 spec. |

---

## 10. Versioning + Forward-Compat

- **v1.1** is the frozen baseline.
- Forward-compat fields POS will silently tolerate without breaking:
  - New top-level `data.upsell_items[]` array (gated by `feature_flags.upsell`)
  - New `customer_value.score_factors` breakdown sub-object
  - New `cross_sell_items[].discount_offer` sub-object
  - Any new `meta.*` informational field
- Breaking changes require a `_v2` doc. Until then POS treats unknown fields as informational.

---

## 11. Audit Trail — Owner + CRM Decisions Locked

| # | Decision | Owner / Team | Value |
|---|---|---|---|
| S-01 | Legacy `/notes/*` GETs status | CRM | KEPT live; POS does not consume after CR-002 |
| S-02 | `item_notes[].item_id` keying | CRM | = POS `food_id` (string) |
| Q-01 | `cross_sell_items[].item_id` keying | CRM | = POS `food_id` (string) |
| Q-02 | `available_coupons_count` semantic | CRM | per-customer (engine-driven); POS hides in v1 (F-01) |
| Q-03 | Tier enum closure | CRM | `{Bronze, Silver, Gold, Platinum}` closed |
| Q-04 | Batch `item_notes_by_id` | CRM | shipped in v1.1 (additive) |
| Q-05 | `net_spend` rendering | POS Owner | display `gross_spend` only |
| Q-06 | `top_categories` numeric ids | POS Owner | hide section in v1 |
| Q-07 | `customer_value.score` display | POS Owner | band only, no raw score |
| Q-08 | POS cache strategy | POS Owner | RAM-only, 5 min, per `(customer, cart_fp)` |
| Q-09 | `usual_time_of_day` comparison | POS Owner | chip only, no comparison logic |
| Q-10 | Latency / timeout | POS Owner | 3 s hard timeout |
| Q-11 | Churn-risk UX | CRM + POS Owner | red (high) / yellow (medium) / none (low); win-back pill |
| SL-01 | Phase 2 upsell location | CRM | Same endpoint, `feature_flags.upsell` gate |
| P-01 | `meta.request_id` | CRM | shipped v1.1 |
| P-02 | top_items / top_categories cap | CRM | doc-confirmed = 5 |
| P-03 | `currency` field | CRM | shipped v1.1 (`"INR"`) |
| P-04 | `title` → `name` rename | CRM | shipped v1.1 (`title` DROPPED, not aliased — C-1) |
| P-05 | `source` field future enum | CRM | kept in v1; future `"history" \| "restaurant" \| "ai"` |
| P-06 | top_items sampled note | CRM | doc-only |
| P-07 | phone format | CRM | doc-only — raw as POS sent it |
| P-08 | `last_visit_at` dual format | CRM | doc-only — POS parses both |
| F-01 | `available_coupons_count` display | POS Owner | hide in v1 |
| F-02 | dual-format `last_visit_at` | POS | parse both — baked into transform |
| C-1 | `title` alias kept? | CRM | NO — dropped entirely |
| C-2 | `item_notes` backward-compat | CRM | YES — kept as additive alongside `item_notes_by_id` |

---

## 12. Handoff to Requirements Freeze

This contract is frozen. The companion `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` (Stage 4) consumes this and adds POS-side scope, ACs, test matrix, and the data → existing surface mapping.

After that, **planning agent** takes over (Stage 5).

---

## 13. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | Contract derived from 11 live probes + CRM's 5-blocker reply + v1.1 phase-1 expansion + verification re-probe (5/6 changes verified live) | ✅ |
| 2 | All 27 audit-trail decisions traceable to source | ✅ |
| 3 | No POS Frontend / Backend / CRM code changed | ✅ |
| 4 | No data mutated; all probes read-only | ✅ |
| 5 | `/app/memory/final/` untouched | ✅ |
| 6 | `/app/memory/crm/crm_1_0/` untouched | ✅ |
| 7 | CRM upstream handoff archived under `handoff/` | ✅ |
| 8 | No impl plan written (planning agent owns Stage 5) | ✅ |

---

**End of CRM 2.0 CR-002 Cross-Sell + Customer Intelligence Contract Freeze v1.1.**
