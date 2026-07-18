# CRM 2.0 — CR-001 Customer Notes Suggestion — Discovery & Investigation

**Date:** 2026-05-26
**Sprint:** CRM 2.0 (first CR)
**CR ID:** `CR_001`
**Topic:** `CUSTOMER_NOTES_SUGGESTION`
**Mode:** Read-only discovery + live API probe. **No implementation. No data mutation.**
**Persona:** CRM 2.0 Discovery Agent

> **User direction (verbatim, 2026-05-26):**
> "I double-confirmed in `/app/backend/routers/pos.py`:
> - L2714 — `GET /api/pos/customers/{id}/notes/items` — aggregates item-level notes (groups by `item_name` + note, returns `{note, count, last_ordered}` per item, sorted by frequency)
> - L2755 — `GET /api/pos/customers/{id}/notes/orders` — aggregates order-level notes (returns `{note, count, last_used}`, sorted by frequency)
>
> need to check if these endpoints working and plan to integrate in item and order suggestion, just investigate and discover, no implementation"

---

## 1. Final Discovery Verdict

| Question | Answer |
|---|---|
| Do both endpoints exist? | ✅ **YES** on CRM host only |
| Are they reachable? | ✅ **YES** — both return HTTP 200 |
| Live response shape verified? | ✅ **YES** — both empty + populated shapes captured |
| POS Frontend already integrated? | ❌ **NO** — zero references in `/app/frontend/src` |
| POS Frontend has the upstream plumbing (notes capture)? | ✅ **YES** — `orderNote` (order-level) + `food_level_notes`/`itemNotes` (item-level) already collected and posted at order commit |
| Blocker for implementation? | None on the API side. Some product/UX decisions still open (see §10). |

**Conclusion:** Both endpoints are production-ready on CRM. POS already records the source data. The CR is purely a POS-side UX integration of an existing CRM API.

---

## 2. Endpoint Catalogue (Live-Verified)

### 2.1 Item-Level Notes Aggregation

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/pos/customers/{customer_id}/notes/items` |
| Host | `https://crm.mygenie.online` (CRM only — **404 on `preprod.mygenie.online`**) |
| Auth | `X-API-Key: <crm_token>` (Bearer also accepted) — same token POS Frontend uses for `/pos/coupons/available` |
| Path param | `{customer_id}` = customer UUID (e.g. `1779d4fc-7161-4407-ac8c-cce30beb3e53`) |
| Body | None |
| Source file (per user) | `/app/backend/routers/pos.py:L2714` (CRM backend; not present in `/app/` workspace) |
| Latency (warm, 5 calls) | **291–355 ms** (median ≈ 348 ms) |

### 2.2 Order-Level Notes Aggregation

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/pos/customers/{customer_id}/notes/orders` |
| Host | `https://crm.mygenie.online` |
| Auth | Same as 2.1 |
| Source file (per user) | `/app/backend/routers/pos.py:L2755` |
| Latency | similar (warm ≈ 250–350 ms — same backend pool) |

---

## 3. Response Schema — Captured Live

### 3.1 Item Notes — POPULATED shape (customer `04c8a911-d0ad-4969-accf-0924ad369567` / "shadab")

```json
{
  "success": true,
  "message": "2 items with notes",
  "data": {
    "customer_id": "04c8a911-d0ad-4969-accf-0924ad369567",
    "customer_name": "shadab ",
    "item_notes": [
      {
        "item_name": "Ras Royale Kunafa",
        "total_notes": 1,
        "notes": [
          { "note": "packing", "count": 1, "last_ordered": "2026-05-25T05:57:25.572145+00:00" }
        ]
      },
      {
        "item_name": "Lucknawi Malai Kunafa",
        "total_notes": 1,
        "notes": [
          { "note": "packing", "count": 1, "last_ordered": "2026-05-25T05:57:25.572145+00:00" }
        ]
      }
    ],
    "total_unique_items_with_notes": 2
  }
}
```

**Schema (TypeScript-ish):**

```ts
{
  success: boolean,
  message: string,
  data: {
    customer_id: string (uuid),
    customer_name: string,
    item_notes: Array<{
      item_name: string,
      total_notes: number,
      notes: Array<{
        note: string,
        count: number,                 // how many times this customer used this note for this item
        last_ordered: string (ISO 8601 UTC with offset)
      }>
    }>,
    total_unique_items_with_notes: number
  }
}
```

**Key behaviour observed:**
- `item_notes[]` is grouped by `item_name` (note: **string item name, NOT `food_id`** — see Gap §10.G-01).
- Inside each item, `notes[]` is a frequency-ranked list of distinct notes.
- The user-supplied spec said "sorted by frequency" — sort observed; with only `count=1` samples available, sort order cannot be 100% confirmed but message text + spec is consistent.

### 3.2 Item Notes — EMPTY shape

```json
{
  "success": true,
  "message": "0 items with notes",
  "data": {
    "customer_id": "1779d4fc-7161-4407-ac8c-cce30beb3e53",
    "customer_name": "abhishek jain ",
    "item_notes": [],
    "total_unique_items_with_notes": 0
  }
}
```

### 3.3 Order Notes — EMPTY shape

```json
{
  "success": true,
  "message": "0 unique order notes",
  "data": {
    "customer_id": "1779d4fc-7161-4407-ac8c-cce30beb3e53",
    "customer_name": "abhishek jain ",
    "order_notes": [],
    "total_orders_with_notes": 0
  }
}
```

### 3.4 Order Notes — POPULATED shape (NOT captured live; inferred from spec + item-notes symmetry)

```ts
{
  success: boolean,
  message: string,
  data: {
    customer_id: string (uuid),
    customer_name: string,
    order_notes: Array<{
      note: string,
      count: number,
      last_used: string (ISO 8601 UTC with offset)   // spec says last_used, not last_ordered
    }>,
    total_orders_with_notes: number
  }
}
```

> **Gap G-02:** populated shape for order-notes NOT verified live (28 candidate customers scanned across `search=ab/ra/sa/ka/ji/rahul/rohit/sunil/anil/amit/vikash/raj/test` — none had `order_notes`). Need to seed at least one order with `order_note != ''` for a registered customer to lock the schema.

### 3.5 Edge cases

| Edge case | URL pattern | HTTP | Body |
|---|---|---|---|
| All-zero UUID | `/notes/items` | **200** | `{"success": false, "message": "Customer not found", "data": null}` |
| Malformed UUID (`not-a-uuid`) | `/notes/items` | **200** | `{"success": false, "message": "Customer not found", "data": null}` |
| No auth header | `/notes/items` | **401** | `{"detail": "Authentication required. Provide X-API-Key header or Bearer token."}` |
| Existing customer / zero notes | `/notes/items` | **200** | success=true, empty `item_notes: []` |
| Existing customer / 1+ notes | `/notes/items` | **200** | success=true, populated `item_notes[]` |

**Important:** the API returns **HTTP 200 with `success:false`** for "Customer not found" — **not** HTTP 404. POS code must check `response.data.success`, not just HTTP status.

---

## 4. POS Frontend — Current Upstream Plumbing (Already in Place)

Notes capture at order-entry time is **already wired**; only the suggestion fetch is missing.

| Layer | Field | Code reference |
|---|---|---|
| Cart item — itemNote model | `item.itemNotes: [{label, ...}]` or `item.notes: string` | `orderTransform.js#L602` — `food_level_notes: Array.isArray(item.itemNotes) ? item.itemNotes.map(n => n.label).join(', ') : (item.notes \|\| '')` |
| Outbound API field (per-item) | `food_level_notes` | `orderTransform.js#L136`, L602 |
| Cart item — note display on cards | `item.notes` | `OrderCard.jsx#L595, L631-635` |
| Order — orderNote model | `order.orderNote: string` | `OrderContext.jsx#L328`, `OrderCard.jsx#L531-539` |
| Outbound API field (order) | `order_note` | `orderTransform.js#L284` ("Notes" comment) |
| Order-note collection UI | `<Textarea value={orderNote} />` | `RoomCheckInModal.jsx#L1227`; legacy at `OrderEntry.jsx.bak.d1cap#L1055-L1056` (StickyNote icon + count badge) |
| Order-note rendering | "Order Note: ..." block | `OrderCard.jsx#L531-539`, `ScanOrderPopOut.jsx#L434-440` |
| Per-item-note modal (legacy) | `itemNotesModal` state, modal at `OrderEntry.jsx.bak.d1cap#L1844` | currently archived under `.bak.d1cap`; **see Gap G-03** |
| Custom item with note | `customItemFromAPI(data, qty, notes)` | `orderTransform.js#L1904, L1910` |

### 4.1 Where the suggestion fetch needs to hook in

| Suggestion type | Trigger point | Display location |
|---|---|---|
| **Order-level note suggestions** | When customer is attached/selected on an in-progress order | Below the existing order-note Textarea — chip row showing top 3-5 frequent notes; clicking a chip pre-fills the textarea |
| **Item-level note suggestions** | When opening the per-item-note modal/popover for a cart line | Below the item-note input — chip row of top 3-5 notes for **that food item** (filtered by `item_name`) for this customer |

### 4.2 Active vs. archived note UI

Note: `OrderEntry.jsx.bak.d1cap` carries the **legacy** item-notes-modal wiring (`itemNotesModal` state at L150, modal at L1844). The current `OrderEntry.jsx` does **not** appear to render the item-notes modal — needs inspection in implementation phase. **G-03** open.

---

## 5. Live Test Inventory (Restaurant 689 / Kunafa Mahal)

| Customer | UUID | Notes status (this run) |
|---|---|---|
| abhishek jain (7505242126) | `1779d4fc-...` | 0 / 0 |
| Abhishek (7355013458) | `b470d70b-...` | 0 / 0 |
| abulhasan (6393479671) | `98c21332-...` | **1 / 0** (Pista - Badami Royale Kunafa: "pack hai ") |
| shadab (9795123190) | `04c8a911-...` | **2 / 0** (Ras Royale + Lucknawi Malai: "packing") |
| ABHINEET (9022417087) | `7ce24c2e-...` | 0 / 0 |
| Plus 23 more searched (rahul/rohit/sunil/amit/etc.) | various | 0 / 0 for all |

**Test data finding:** preprod has **item-level notes seeded** but **no order-level notes** anywhere in the 28-customer sample. Implementation QA will need at least one order with `order_note != ''` placed against a registered customer.

---

## 6. CRM Customer-Search Endpoint (already used by POS today)

Used to discover the customers above. Documented here only as supporting context.

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/pos/customers` |
| Auth | `X-API-Key` |
| Query | `search=<2+ chars>&limit=N` (param **must be `search`**; `q=`, `query=`, `name=`, `phone=` are ignored / return "Provide at least 2 characters") |
| Response | `{ success, message, data: { customers: [{name, phone, total_points, wallet_balance, tier, id, last_visit}], total } } ` |

Use case for CR-001: prerequisite — POS must know the customer's `id` (uuid) before calling `/notes/items` or `/notes/orders`. POS already has customer attachment (`customer.id`) in its order-entry flow (see `discounts.customerId` pattern in `orderTransform.js`).

---

## 7. Auth Model Confirmation

- Same `crm_token` (CRM API key) extracted from `POST /api/v1/auth/vendoremployee/login` response → injected as `X-API-Key` to CRM calls.
- Identical to the auth model already wired by BUG-108 for `/pos/coupons/*` and `/pos/max-redeemable`.
- **No new auth work required** for CR-001.

---

## 8. Integration UX Plan (Proposed — for Owner Review)

> **No code is being written.** This is a design proposal only.

### 8.1 Order-level note suggestion chips

**Trigger:** when customer is selected on the order-entry / collect-bill screen AND a customer note Textarea is open.

**Behaviour:**

```
[Order Note ▼]
┌──────────────────────────────────────────────┐
│ Order note (optional)                        │
│ ┌──────────────────────────────────────────┐ │
│ │ [textarea]                               │ │
│ └──────────────────────────────────────────┘ │
│ Past notes:  ⊕ "Pack neatly" (4)             │
│              ⊕ "Less spicy"   (2)            │
│              ⊕ "Call on arrival" (2)         │
└──────────────────────────────────────────────┘
```

- Fetch `GET /pos/customers/{cust_id}/notes/orders` on customer-attach.
- Render top 3-5 chips (`count` DESC, then `last_used` DESC).
- Each chip is a button — click pre-fills the Textarea (replace or append, owner decision G-04).
- Hide section entirely when `data.order_notes.length === 0`.

### 8.2 Item-level note suggestion chips

**Trigger:** when opening per-item note modal/popover for a cart line.

**Behaviour:**

```
[Item: Lucknawi Malai Kunafa — Note]
┌──────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────┐ │
│ │ [textarea]                               │ │
│ └──────────────────────────────────────────┘ │
│ Past notes for this item:                    │
│   ⊕ "packing"        (1)                     │
│   ⊕ "extra pistachio"(0)  ← won't show       │
└──────────────────────────────────────────────┘
```

- Fetch `GET /pos/customers/{cust_id}/notes/items` once on customer-attach **OR** on first modal-open (caching decision G-05).
- Filter `data.item_notes[]` by `item_name === <selected line item name>`.
- Render top 3-5 notes from the matching item's `notes[]` array.
- Hide section entirely when no match.

### 8.3 Loading / error UX

| State | UX |
|---|---|
| Fetch in progress | Skeleton chip placeholder (no spinner) |
| `success: false` ("Customer not found") | Section hidden silently (treat as "no notes") |
| HTTP 401 / 5xx | Section hidden + console.warn (no toast — non-blocking feature) |
| `data.item_notes: []` / `data.order_notes: []` | Section hidden — no "no past notes" copy needed |
| Customer detached mid-session | Clear cached suggestions |

### 8.4 Caching strategy (proposed)

- Fetch once per customer attachment, cache in component state.
- Invalidate on customer detach OR on `commit-bill` success (the just-committed notes will appear next session anyway).
- No localStorage — privacy + small payload.

---

## 9. Implementation Touch-Points (Proposed — for Owner Review)

| File | Change kind |
|---|---|
| `src/api/constants.js` | Add 2 endpoint constants: `CUSTOMER_NOTES_ITEMS`, `CUSTOMER_NOTES_ORDERS` |
| `src/api/services/customerNotesService.js` (NEW) | `getItemNoteSuggestions(customerId)`, `getOrderNoteSuggestions(customerId)` — both return `{success, customerName, notes[]}` |
| `src/api/transforms/customerNotesTransform.js` (NEW) | `fromAPI.itemNotes`, `fromAPI.orderNotes` — normalize snake_case → camelCase + sort guarantees |
| `src/components/order-entry/CollectPaymentPanel.jsx` | Hook order-note suggestion chips below existing order-note input (if such input exists here; otherwise wherever the order-note Textarea lives today) |
| `src/components/modals/ItemNoteModal.jsx` (or current item-note popover) | Hook item-note suggestion chips below textarea |
| `src/contexts/OrderContext.jsx` | (Optional) Memoize suggestion cache per attached customer |

**Files NOT touched:**
- Backend / CRM (read-only consumer)
- `BUG108_FLAGS.js` (this is not BUG-108 work)
- Any frozen rulebook under `/app/memory/final/`

Estimated effort: **3-5 dev hours + 1 QA cycle** (very small surface; only fetch + chip render + click-to-fill).

---

## 10. Open Gaps / Questions (for Owner)

| ID | Gap | Owner | Recommended next step |
|---|---|---|---|
| **G-01** | Item-notes API keys by `item_name` (display name), not `food_id`. If CRM stores variants/renamed items, suggestions may miss after a rename. | CRM team (confirm) | Confirm whether `food_id` is also returned per item entry, or whether `item_name` is stored at note-write time |
| **G-02** | Order-level populated shape not captured live (no test data) | QA / CRM | Seed at least 1 order with `order_note != ''` against a registered customer, then re-probe |
| **G-03** | Current `OrderEntry.jsx` may have removed the legacy `itemNotesModal` (still present in `.bak.d1cap`) — need to confirm where item-note input lives in current code | POS Frontend (implementation phase) | Inspect during implementation; not a discovery blocker |
| **G-04** | Click-chip behaviour: **replace** existing textarea content vs **append** vs **toggle** | Owner / Product | Recommend **append with separator** for orders (cashiers may stack), **replace** for items (one note per line) |
| **G-05** | Fetch timing: once on customer-attach (eager) vs lazy (first modal open) | Owner / UX | Recommend **eager fetch on customer-attach** — single HTTP roundtrip, ≤350 ms, no perceptible UI delay |
| **G-06** | Show count badge on chip? E.g. `"packing" (3×)` | Owner / UX | Recommend **yes** — gives cashier confidence that it's a repeat preference, not a one-off |
| **G-07** | Chip limit: 3, 5, or scrollable | Owner / UX | Recommend **5** then "Show more ▾" if >5 |
| **G-08** | Filter by recency: only show notes within last N days? | Owner / Product | Recommend **no time filter** in v1 — `last_ordered` is informational; cashier can ignore stale ones |
| **G-09** | Privacy / per-restaurant scoping: do CRM notes leak across restaurants for a chain customer? | CRM team (confirm) | Confirm whether `notes/items` is filtered by `restaurant_id` of the calling token, or returns global per-customer aggregate |
| **G-10** | Failure rendering: should a 5xx show a small inline "couldn't load past notes" link? | Owner / UX | Recommend **silent hide** — feature is purely additive; cashiers should not be blocked |

---

## 11. Acceptance Criteria (Draft — for Owner Sign-Off)

| # | Criterion |
|---|---|
| AC-1 | When a registered customer is attached on order-entry, POS calls `/pos/customers/{id}/notes/orders` exactly once |
| AC-2 | When a registered customer is attached AND any item-note input is opened, POS shows item-specific past notes filtered by `item_name` matching the cart line |
| AC-3 | Walk-in / guest orders show no suggestion chips (no fetch) |
| AC-4 | Click on suggestion chip pre-fills the relevant textarea per G-04 owner decision |
| AC-5 | Empty / 401 / 404 / 5xx silently hide the suggestion section — never block the flow |
| AC-6 | Suggestion fetch latency < 1 s; if > 3 s, section is hidden (still non-blocking) |
| AC-7 | Suggestion list ordered by `count` DESC, ties broken by `last_ordered` / `last_used` DESC |
| AC-8 | No re-fetch within same customer attachment (cache for the session) |
| AC-9 | No new feature-flag required (gated by `restaurantSettings.isCRM` if it exists, otherwise rendered unconditionally for registered customers) |
| AC-10 | No regression to existing `food_level_notes` / `order_note` outbound payload behaviour |

---

## 12. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No POS Frontend code changed | ✅ |
| 2 | No POS Backend code changed | ✅ |
| 3 | No CRM code changed | ✅ |
| 4 | No data mutated (only `GET` calls + 1 `POST` to `/auth/login` + 1 `POST` to `/get-single-order-new` read-only) | ✅ |
| 5 | No mutating preprod API called (no order placed, no note created, no customer modified) | ✅ |
| 6 | `/app/memory/final/` untouched | ✅ |
| 7 | `/app/memory/crm/crm_1_0/` untouched | ✅ |
| 8 | All probes against `preprod.mygenie.online` + `crm.mygenie.online` with owner-supplied credentials | ✅ |

---

## 13. Next Step (Recommended)

1. Owner reviews §10 (G-01 … G-10) and approves UX choices.
2. Owner approves placing **one (1)** registered-customer order with `order_note != ''` on preprod restaurant 689 to close G-02 (populated order-notes shape).
3. After §10 + §11 sign-off, write the contract freeze + implementation plan:
   - `contract/CRM2_0_CR_001_CUSTOMER_NOTES_CONTRACT_FREEZE_<date>.md`
   - `implementation/CRM2_0_CR_001_CUSTOMER_NOTES_IMPL_PLAN_<date>.md`

**No implementation will start until both sign-offs are in.**

---

**End of CR-001 Customer Notes Suggestion Discovery.**
