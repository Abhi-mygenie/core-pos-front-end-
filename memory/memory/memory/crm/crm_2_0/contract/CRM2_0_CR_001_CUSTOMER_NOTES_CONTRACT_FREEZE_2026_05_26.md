# CRM 2.0 — CR-001 Customer Notes — Contract Freeze v1

**Date:** 2026-05-26
**Sprint:** CRM 2.0
**CR ID:** `CR_001`
**Topic:** `CUSTOMER_NOTES_SUGGESTION`
**Type:** `CONTRACT_FREEZE`
**Status sticker:** `crm2_0_cr_001_customer_notes_contract_freeze_v1_2026_05_26`
**Predecessor doc:** `discovery/CRM2_0_CR_001_CUSTOMER_NOTES_SUGGESTION_DISCOVERY_2026_05_26.md`

> **Purpose.** Lock the request / response / error / auth / latency / scoping contract for the two CRM endpoints that power customer note suggestions in `ItemNotesModal` and `OrderNotesModal`.
>
> Once frozen, the **POS Frontend implementation agent must consume this contract verbatim.** Any drift requires re-opening this doc as `_v2`.

---

## 1. In-Scope Endpoints

| # | Method | Path | Host | Owner |
|---|---|---|---|---|
| 1 | `GET` | `/api/pos/customers/{customer_id}/notes/items` | `https://crm.mygenie.online` | CRM team |
| 2 | `GET` | `/api/pos/customers/{customer_id}/notes/orders` | `https://crm.mygenie.online` | CRM team |

**Out of scope for this contract:**
- POS Backend host (`preprod.mygenie.online`) — confirmed 404; not aliased
- Any `POST` / mutation on notes (note creation is via the existing order-commit flow — `food_level_notes` / `order_note` on `POST /api/pos/orders`)
- Customer search endpoint (`GET /api/pos/customers?search=…`) — already documented in BUG-108; not redefined here

---

## 2. Request Contract

### 2.1 Headers (both endpoints)

| Header | Required | Value |
|---|---|---|
| `X-API-Key` | **YES** | CRM API key — same token POS already uses for `/pos/coupons/*` and `/pos/max-redeemable`. Extracted from `POST /api/v1/auth/vendoremployee/login` response field `crm_token` |
| `Authorization: Bearer <token>` | optional | Server accepts either; POS Frontend SHOULD use `X-API-Key` for parity |
| `Accept: application/json` | recommended | — |
| `Content-Type` | n/a (GET) | — |

### 2.2 Path parameter

| Param | Type | Required | Format |
|---|---|---|---|
| `customer_id` | string | YES | CRM customer UUID v4 (e.g. `1779d4fc-7161-4407-ac8c-cce30beb3e53`) — comes from POS state `customer?.id` already in scope |

### 2.3 Query parameters

**None.** Restaurant scoping is **implicit** via the `X-API-Key` token (which is restaurant-bound at issuance time — see §6).

### 2.4 Body

None (GET).

---

## 3. Response Contract — `/notes/items`

### 3.1 Success — populated

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "success": true,
  "message": "<N> items with notes",
  "data": {
    "customer_id": "04c8a911-d0ad-4969-accf-0924ad369567",
    "customer_name": "shadab ",
    "item_notes": [
      {
        "item_name": "Ras Royale Kunafa",
        "total_notes": 1,
        "notes": [
          {
            "note": "packing",
            "count": 1,
            "last_ordered": "2026-05-25T05:57:25.572145+00:00"
          }
        ]
      }
    ],
    "total_unique_items_with_notes": 2
  }
}
```

### 3.2 Schema — `/notes/items`

```ts
type ItemNotesResponse = {
  success: true,
  message: string,                                 // human-readable; do NOT parse
  data: {
    customer_id: string,                           // UUID, echoes the request
    customer_name: string,                         // may have trailing whitespace; POS MUST trim
    item_notes: Array<{
      item_name: string,                           // CRM display name (case as stored); POS matches case-insensitive trimmed
      total_notes: number,                         // >=1
      notes: Array<{
        note: string,                              // raw user-typed note text
        count: number,                             // total occurrences across customer's history
        last_ordered: string                       // ISO 8601 UTC with offset (RFC 3339)
      }>
    }>,
    total_unique_items_with_notes: number          // length of item_notes[]
  }
};
```

### 3.3 Empty (no notes)

```json
{
  "success": true,
  "message": "0 items with notes",
  "data": {
    "customer_id": "<uuid>",
    "customer_name": "<name>",
    "item_notes": [],
    "total_unique_items_with_notes": 0
  }
}
```

---

## 4. Response Contract — `/notes/orders`

### 4.1 Success — populated (inferred from `/notes/items` symmetry — not captured live, pending owner test seed per discovery §10 G-02)

```json
{
  "success": true,
  "message": "<N> unique order notes",
  "data": {
    "customer_id": "<uuid>",
    "customer_name": "<name>",
    "order_notes": [
      {
        "note": "Pack neatly",
        "count": 3,
        "last_used": "2026-05-25T05:57:25.572145+00:00"
      }
    ],
    "total_orders_with_notes": 1
  }
}
```

### 4.2 Schema — `/notes/orders`

```ts
type OrderNotesResponse = {
  success: true,
  message: string,
  data: {
    customer_id: string,
    customer_name: string,
    order_notes: Array<{
      note: string,
      count: number,
      last_used: string                            // ISO 8601 UTC; **field name is `last_used`, NOT `last_ordered`** (asymmetric with item-notes — frozen)
    }>,
    total_orders_with_notes: number
  }
};
```

### 4.3 Empty

```json
{
  "success": true,
  "message": "0 unique order notes",
  "data": {
    "customer_id": "<uuid>",
    "customer_name": "<name>",
    "order_notes": [],
    "total_orders_with_notes": 0
  }
}
```

### 4.4 Frozen field-name asymmetry

| Endpoint | Per-note timestamp field |
|---|---|
| `/notes/items` | `last_ordered` |
| `/notes/orders` | `last_used` |

POS Frontend transform layer MUST handle both as `lastUsedAt: string` (camelCase, unified) — see §10.2.

---

## 5. Error Contract

### 5.1 "Customer not found" — returned as HTTP 200 with `success: false`

```http
HTTP/1.1 200 OK
```

```json
{
  "success": false,
  "message": "Customer not found",
  "data": null
}
```

> **Important.** This is HTTP **200**, NOT 404. POS code MUST check `body.success` to detect this case. Verified live in discovery §3.5 with `customer_id="not-a-uuid"` and all-zero UUID.

### 5.2 Missing / invalid auth

```http
HTTP/1.1 401 Unauthorized
```

```json
{
  "detail": "Authentication required. Provide X-API-Key header or Bearer token."
}
```

### 5.3 Server / network errors

| HTTP | Body shape (assumed) | POS behaviour (frozen) |
|---|---|---|
| 5xx | `{ "detail": "..." }` or HTML page | Silently hide preferences section. `console.warn('customerNotes: fetch failed', err)`. No toast. |
| Network / timeout (>3 s) | n/a | Same — silent hide. |
| Non-JSON body | n/a | Same — silent hide. |
| `{success:false, message:"Customer not found"}` | as §5.1 | Render empty state — same as "no customer linked" path |

### 5.4 Frozen error-code table for POS

| Class | Detection | POS UX |
|---|---|---|
| `OK_POPULATED` | `body.success===true && body.data.item_notes.length>0` (or `order_notes.length>0`) | Render preferences section |
| `OK_EMPTY` | `body.success===true && len===0` | Render empty state — same path as null-customer |
| `NOT_FOUND` | `body.success===false && body.message==="Customer not found"` | Render empty state |
| `AUTH_FAIL` | HTTP 401 | Render empty state + `console.warn` |
| `NETWORK_FAIL` | HTTP 5xx / timeout / non-JSON | Render empty state + `console.warn` |

---

## 6. Auth + Scoping

### 6.1 Token

Same `crm_token` POS already obtains at login (`POST /api/v1/auth/vendoremployee/login` response field `crm_token`). No new login flow.

### 6.2 Restaurant scoping — **PER-RESTAURANT** (Owner Q5a, 2026-05-26)

| Aspect | Frozen behaviour |
|---|---|
| API filtering | Per-restaurant (scoped by the `X-API-Key` token's bound `restaurant_id`) — assumed for this CR |
| POS behaviour | Always send the active restaurant's CRM token; never pass a `restaurant_id` query param (none defined) |
| Multi-restaurant chain customer | Out of scope for CR-001; if requirements change, re-open this contract as `_v2` |

> **G-09 status:** assumed per-restaurant; QA must verify. If CRM aggregates globally, this contract opens a behaviour gap (track as `open_gaps/CRM2_0_CR_001_OPEN_GAPS_*.md`).

---

## 7. Latency + Retry

### 7.1 Latency budget

| Metric | Budget (frozen) | Measured (warm, 5 calls, discovery §2.1) |
|---|---|---|
| p50 | < 500 ms | ~348 ms |
| p95 | < 1000 ms | ~355 ms |
| Hard timeout | **3000 ms** (POS aborts) | n/a |

### 7.2 Retry policy

| Failure | Retry? | Notes |
|---|---|---|
| Network failure / timeout | **NO** for v1 — non-blocking feature; user-visible delay > immediate retry value | Future enhancement |
| HTTP 5xx | NO | Silent hide |
| HTTP 401 | NO | Token issue — login flow handles re-auth |
| `success: false` | NO | Render empty state |

### 7.3 Concurrency

- POS calls each endpoint at most once per modal-open (per-event, not per-customer-session — see Owner Q4a).
- Item endpoint and order endpoint are independent — never coordinated.
- No request deduplication / cancellation in v1 (single-fire on modal open).

---

## 8. Field-Level Behaviour & Edge Cases

### 8.1 Whitespace and case (frozen)

| Field | POS handling |
|---|---|
| `data.customer_name` | `.trim()` before display |
| `data.item_notes[i].item_name` | `.trim().toLowerCase()` for matching against cart `item.name.trim().toLowerCase()` |
| `data.*.notes[i].note` | Display as-is. No trim, no case change. Cashier-typed notes are intentionally preserved. |

### 8.2 Sort order (frozen — Owner Q4c)

POS Frontend transform layer sorts ALL note arrays:

```
ORDER BY count DESC, last_ordered/last_used DESC, note ASC
```

This applies to:
- `data.item_notes[i].notes[]` — per-item notes
- `data.order_notes[]` — order notes
- POS does NOT rely on CRM-side sort (assumed correct, but re-sorted for safety)

### 8.3 Display cap (frozen — Owner Q4b)

- POS renders **top 5** preference rows by default
- If `notes.length > 5` → show a "Show more ▾" expand button that reveals the rest
- No recency-window filter (Owner Q4c)

### 8.4 Item-level matching (frozen — Owner Q3)

```
match = item_notes.find(entry =>
  entry.item_name.trim().toLowerCase() === selectedItem.name.trim().toLowerCase()
);
```

| Outcome | POS behaviour |
|---|---|
| Match found | Render top-5 from `match.notes[]` (sorted per §8.2) |
| No match | Empty state for that item (no preferences shown) |
| API returned data but no match for this item | `console.warn('customerNotes: item_name mismatch — CRM had data for [a,b,c] but cart item is "d"')` then empty state |

**Known risk (G-01, deferred):** if a food item is renamed in the menu, historical notes keyed by the old name will silently miss. Tracked as a CRM-team request for `food_id` per entry in `_v2`.

### 8.5 Alert / red-variant flag (frozen — Owner Q2 = A)

POS sets `isAlert: false` for ALL CRM-returned item-notes. The red-allergy variant in `ItemNotesModal.jsx` (lines 178-186) is retained in the component code for **future** use (CRM may add an `is_alert` flag later) but is unused by this CR.

**No keyword-based client-side detection.**

### 8.6 Relative-time rendering (frozen — Owner Q1 = C)

Each preference row renders:

```
<note text>  (<count>× · <relative time>)
```

| `count` value | Suffix |
|---|---|
| 1 | `(1× · …)` (always render — Owner Q1 chose full enrichment) |
| ≥ 2 | `(N× · …)` |

Relative time formula (UTC-based; uses `last_ordered` for item-notes, `last_used` for order-notes):

| Delta from now | Display |
|---|---|
| < 1 hour | `just now` |
| < 24 hours | `<H> hours ago` |
| < 7 days | `<D> days ago` |
| < 30 days | `<W> weeks ago` |
| < 365 days | `<M> months ago` |
| ≥ 365 days | `<Y> years ago` |

Tie-breaking note: POS uses `Date.parse()` on the ISO string; relies on UTC offset in the field (verified live).

### 8.7 Click behaviour (frozen — pre-existing, Owner Q-old G-04)

Already implemented in `ItemNotesModal.jsx#L42-L49` and `OrderNotesModal.jsx#L42-L49`:

```js
addFromPreference(pref) → setSelectedNotes(prev => [...prev, {
  id: `pref-${Date.now()}`,
  label: pref.note,
  type: "preference"
}])
```

**Behaviour:** APPEND as a new green chip in the "Added" section. NOT replace. NOT toggle. The same preference can be added multiple times (each click → new chip). CRM is the source-of-truth for de-dup at history-write time.

> **Implementation note:** This behaviour is already correct. The CR does NOT change it.

---

## 9. Test Data — Live-Verified Inventory (Restaurant 689)

| Customer | UUID | Item notes / Order notes |
|---|---|---|
| shadab (9795123190) | `04c8a911-d0ad-4969-accf-0924ad369567` | 2 / 0 — populated item_notes captured |
| abulhasan (6393479671) | `98c21332-fc82-45bd-8a37-58b1aac56669` | 1 / 0 |
| abhishek jain (7505242126) | `1779d4fc-7161-4407-ac8c-cce30beb3e53` | 0 / 0 — empty for both |
| Plus 26 customers searched | various | All 0 / 0 |

### 9.1 Outstanding test data (Owner Q5b = A)

Owner will manually place one preprod order on restaurant 689 with `order_note != ''` against a registered customer to produce a populated `/notes/orders` response. Order ID to be added to this doc as Appendix A once captured.

---

## 10. Frontend Transform Contract (Frozen)

> The POS Frontend implementation agent MUST emit exactly this shape from the new transform layer. Modals already consume this shape via the existing `getCustomerPreferences()` API in `notePresets.js` — see §11.

### 10.1 Item-notes transform

```ts
fromAPI.customerItemNotes(apiResponse, selectedItemName): {
  customerName: string,                  // trimmed
  preferences: Array<{
    note: string,                        // raw
    count: number,
    lastUsedAt: string,                  // ISO; from `last_ordered`
    relativeTime: string,                // pre-computed (see §8.6)
    source: "history",                   // hardcoded — fills mock's `pref.source` slot
    isAlert: false                       // hardcoded (Owner Q2=A)
  }>
} | null                                 // null when AUTH_FAIL / NETWORK_FAIL / NOT_FOUND / OK_EMPTY / no item_name match
```

### 10.2 Order-notes transform

```ts
fromAPI.customerOrderNotes(apiResponse): {
  customerName: string,
  preferences: Array<{
    note: string,
    count: number,
    lastUsedAt: string,                  // ISO; from `last_used`
    relativeTime: string,
    source: "history"
    // no isAlert — order modal doesn't render alert variant
  }>
} | null
```

### 10.3 Sort + cap applied inside transform

- Sort: per §8.2
- Cap at top 5 (with `_overflow: Array<...>` field carrying the rest for "Show more ▾")

### 10.4 Source field convention (Owner Q1, Q2)

`source: "history"` hardcoded for all CRM-returned entries (replaces the mock's free-text values like `"order_history"` / `"profile"` / `"visit_history"`). Display layer ignores this field today; it's kept for future segmentation (e.g. `source: "profile"` for manually entered allergens once CRM Phase 2 ships `is_alert`).

---

## 11. POS Frontend Touch-Point Map (informational; planning agent owns final list)

| File | Change kind | Reason |
|---|---|---|
| `src/api/constants.js` | ADD 2 constants: `CUSTOMER_NOTES_ITEMS`, `CUSTOMER_NOTES_ORDERS` | Endpoint catalogue |
| `src/api/services/customerNotesService.js` | NEW | `getItemNotes(customerId)`, `getOrderNotes(customerId)` thin axios wrappers |
| `src/api/transforms/customerNotesTransform.js` | NEW | `fromAPI.customerItemNotes`, `fromAPI.customerOrderNotes` per §10 |
| `src/data/notePresets.js` | MODIFY `getCustomerPreferences()` | Replace mock lookup with async CRM call; keep export signature compatible with existing modal callers (or refactor modals to call service directly — planning agent decides) |
| `src/components/order-entry/ItemNotesModal.jsx` | MODIFY | (a) Make `customerData` fetch async (useEffect on customerId + item.name); (b) Add loading skeleton; (c) Top-5 cap + Show More button; (d) Show count + relative-time suffix per §8.6 |
| `src/components/order-entry/OrderNotesModal.jsx` | MODIFY | Same as above (minus item-name filter) |
| `src/data/index.js` | possibly update barrel exports | If notePresets refactor changes exports |

**Files NOT touched:**
- POS Backend
- CRM
- `BUG108_FLAGS.js` (not BUG-108 work)
- `/app/memory/final/`
- Any `*.bak.*` files

---

## 12. Versioning + Backwards Compat

- This is **v1**. Frozen by Owner approval 2026-05-26.
- Any change in CRM response shape → CRM team raises a `_v2` of this doc; POS does NOT auto-adapt.
- Any change in POS behaviour after v1 (e.g. add `food_id` matching when CRM ships it) → POS Frontend raises a `_v2`; CRM doesn't need to know.
- `isAlert: true` rendering path stays in `ItemNotesModal.jsx` source code unused (future-proof).

---

## 13. Locked Owner Decisions (audit trail)

| # | Decision | Owner choice (2026-05-26) |
|---|---|---|
| Q1 (N-1/N-2) | Row enrichment | **C** — `<note>  (<count>× · <relative>)` |
| Q2 (N-3) | Alert variant | **A** — All gray (isAlert=false); red path retained unused |
| Q3 (G-01) | Item match key | **C** — `item_name` (case-insensitive trim); `console.warn` on miss; CRM `food_id` request deferred |
| Q4a (G-05) | Fetch timing | **A** — On modal open only |
| Q4b (N-4) | Display cap | **B** — Top 5 + "Show more ▾" |
| Q4c (G-08) | Sort + recency | **C** — `count` DESC, ties by timestamp DESC; no recency filter |
| Q5a (G-09) | Scoping | **Per-restaurant** (token-scoped) always for this phase |
| Q5b (G-02) | Test seed | **A** — Owner places manually |
| Q5c | Next docs | **A** — Contract freeze + requirements freeze, then stop |
| Q-old G-04 | Click behaviour | **APPEND** (pre-existing in code; no change) |

---

## 14. Open Items After Freeze

| ID | Item | Owner | Tracking |
|---|---|---|---|
| OF-01 | Populated `/notes/orders` shape — needs live capture | Owner (Q5b) | Add as Appendix A when received |
| OF-02 | `food_id` per item-notes entry — request CRM team for `_v2` | CRM team | Backlog |
| OF-03 | `is_alert` per item-notes entry — request CRM team for `_v2` | CRM team | Backlog |
| OF-04 | QA must verify per-restaurant scoping assumption (Q5a) | QA agent | Stage 7 |

---

## 15. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | Contract derived from live-verified discovery (§3 of discovery doc) | ✅ |
| 2 | All 10 Owner decisions audited at §13 | ✅ |
| 3 | No code, no POS BE, no CRM changes | ✅ |
| 4 | No data mutated | ✅ |
| 5 | `/app/memory/final/` untouched | ✅ |
| 6 | `/app/memory/crm/crm_1_0/` untouched | ✅ |
| 7 | No impl plan written (per Owner Q5c — handoff to planning agent) | ✅ |

---

## 16. Handoff

This contract is now **frozen v1**. Next stage:

```
/app/memory/crm/crm_2_0/implementation/
   └── CRM2_0_CR_001_CUSTOMER_NOTES_REQUIREMENTS_FREEZE_2026_05_26.md   ← companion to this doc
```

After the requirements freeze, the **planning agent** takes over and writes the impl plan.

No code is written by this agent or by the planning agent — code is owned by the implementation agent (stage 6).

---

**End of CRM 2.0 CR-001 Customer Notes Contract Freeze v1.**
