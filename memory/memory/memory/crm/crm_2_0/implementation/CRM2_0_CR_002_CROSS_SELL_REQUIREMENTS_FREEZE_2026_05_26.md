# CRM 2.0 — CR-002 Cross-Sell + Customer Intelligence — Requirements Freeze (Planning Handoff)

**Date:** 2026-05-26
**Sprint:** CRM 2.0
**CR ID:** `CR_002`
**Topic:** `CROSS_SELL_UPSELL`
**Type:** `REQUIREMENTS_FREEZE`
**Stage:** 4 of 8 (per CRM 2.0 README §4)
**API contract version:** v1.1
**Predecessor docs:**
- `discovery/CRM2_0_CR_002_POS_FEEDBACK_TO_CRM_HANDOFF_2026_05_26.md`
- `contract/CRM2_0_CR_002_CROSS_SELL_CONTRACT_FREEZE_2026_05_26.md`
- `handoff/CRM2_0_CR_002_CROSS_SELL_API_HANDOFF_FROM_CRM_2026_05_26.md`

> **Audience:** the planning agent (Stage 5). After reading, planning agent produces `implementation/CRM2_0_CR_002_CROSS_SELL_IMPL_PLAN_<date>.md` and stops.

> **⚠ THREE NON-NEGOTIABLE RULES added 2026-05-26 (owner directive, updated 2026-05-26):**
> 1. **Mandatory UI Preview Approval Gate** — ANY new user-facing UI introduced by this CR (or any future CR) MUST receive an owner-approved visual preview BEFORE the production UI code is written. No production UI code may be committed until the owner has explicitly approved the preview. Details in §13.1.
> 2. **Two-Phase Impl Plan with Preview Checkpoint** — the impl plan MUST be structured into exactly **two implementation phases with a mandatory preview checkpoint between them**: Phase 1 = API/service/transform/cache (Python/backend code to consume the CRM API — no production UI), then a **UI Preview Approval Checkpoint** (owner reviews and approves the visual preview), then Phase 2 = UI implementation (only after owner approval). No phase may be skipped, merged, or reordered. Details in §13.2.
> 3. **Clean Handover Guarantee** — the impl plan must be complete enough that the implementation agent needs NO owner clarification except the single UI preview approval moment between Phase 1 and Phase 2. Details in §13.5.

---

## 1. What this CR delivers (1-line)

> **Wire the CRM `POST /pos/customers/order-suggestions` (v1.1) endpoint into the POS, so cashiers see customer profile + value band + favourites + past notes + cross-sell suggestions during order build. All UI changes live INSIDE the existing CustomerModal + ItemNotesModal + OrderNotesModal — zero new top-level UI surfaces.**

---

## 2. Why now (1-line)

> CRM v1.1 endpoint is live, all 5 blocker answers in, the 8 non-blockers answered, all 6 polish items absorbed into v1.1. POS notes-suggestion UI (CR-001 placeholders) already exists; profile data has no rendered home today and is lost. This CR closes the loop.

---

## 3. Scope — IN

| # | Item |
|---|---|
| IN-1 | New service `src/api/services/customerIntelService.js` — `getOrderSuggestions({ customerId, cart, selectedItemId, orderType })` POST wrapper |
| IN-2 | New transform `src/api/transforms/customerIntelTransform.js` — normalises v1.1 response to camelCase POS shape; handles dual `last_visit_at` format; applies defensive sort |
| IN-3 | New endpoint constant in `src/api/constants.js` — `CUSTOMER_ORDER_SUGGESTIONS = '/pos/customers/order-suggestions'` |
| IN-4 | Memoization layer with `(customer.id, cart_fingerprint, selected_item_id)` cache key, 5 min TTL, RAM-only |
| IN-5 | **CustomerModal redesign** — keep current design language (typography, padding, colours, border radius, spacing scale); add new sections WHEN an existing customer is loaded: |
|     | • Customer Profile banner (name, phone, tier pill, value-band pill, churn pill, win-back pill, stats row: visits / total spend / loyalty points / wallet) |
|     | • "Past Favourites" section — top 5 chip row (powered by `data.order_patterns.top_items`) |
|     | • "Smart Suggestions" section — 3 cross-sell cards (powered by `data.cross_sell_items`) |
|     | Each chip / card click mirrors existing menu-item click: `customizable ? open ItemCustomizationModal : addToCart` |
| IN-6 | `ItemNotesModal` — populate existing "👤 CUSTOMER PREFERENCES" section from `data.item_notes_by_id[selected_item.item_id]` (top 5 sorted) |
| IN-7 | `OrderNotesModal` — populate existing "👤 CUSTOMER HISTORY" section from `data.customer_notes` (top 5 sorted) |
| IN-8 | Fetch trigger — on customer attach AND on debounced cart-change (500 ms); not on every keystroke |
| IN-9 | Loading skeleton states for each section (Profile / Favourites / Suggestions); avoid spinners |
| IN-10 | First-time customer rendering — `'customer_value' in data === false` → render "New Customer" badge + hide band/churn/win-back/favourites/suggestions |
| IN-11 | Error / empty / timeout handling — silent-hide pattern per contract §5 |
| IN-12 | `feature_flags.cross_sell` server-driven gate — when `false`, hide Smart Suggestions section even if `cross_sell_items` is populated |
| IN-13 | Forward-compat tolerance for `data.upsell_items[]` block (no rendering yet; just don't throw if it arrives) |
| IN-14 | `data-testid` hooks on every new interactive element (per coding guidelines) |

## 4. Scope — OUT

| # | Item | Reason |
|---|---|---|
| OUT-1 | Top header strip / sticky banner / new top-level surfaces | Owner Q1 = redesign CustomerModal; no new surfaces |
| OUT-2 | Cart-panel inline cross-sell strip | Same as OUT-1 |
| OUT-3 | Render `data.customer_summary.available_coupons_count` | F-01 = hide in v1 (semantic divergence from coupons dropdown) |
| OUT-4 | Render `data.customer_summary.net_spend` | Q-05 = display `gross_spend` only until Phase 2 |
| OUT-5 | Render `data.order_patterns.top_categories` | Q-06 = numeric IDs only in v1; hide |
| OUT-6 | Render raw `customer_value.score` | Q-07 = band only |
| OUT-7 | `usual_time_of_day` comparison logic ("outside usual window" hint) | Q-09 = chip only in v1 |
| OUT-8 | Auto-apply coupons on churn-risk | CRM anti-pattern §11 |
| OUT-9 | Auto-add cross-sell items | CRM anti-pattern §11 |
| OUT-10 | Persistent localStorage cache | Q-08 = RAM-only |
| OUT-11 | Retry on network failure | Contract §5 — silent hide |
| OUT-12 | Upsell rendering (`data.upsell_items[]`) | Phase 2; `feature_flags.upsell = false` in v1.1 |
| OUT-13 | AI-generated note copy / cross-sell copy | Phase 2 — `feature_flags.ai = false` |
| OUT-14 | Changes to outbound `food_level_notes` / `order_note` on order commit | Read-only consumer; outbound paths unchanged |
| OUT-15 | Backend / CRM changes | POS Frontend only |
| OUT-16 | `BUG108_FLAGS.js` changes | Not BUG-108 work |
| OUT-17 | Legacy `GET /notes/items` + `/notes/orders` consumers (services / transforms / calls) | Replaced by new POST; safe to delete (planning agent decides) |
| OUT-18 | Variant/add-on aware cross-sell | CRM engine doesn't differentiate variants (legacy gap) |
| OUT-19 | CRM customer profile editing | OUT — POS edits via existing customerService unchanged |

---

## 5. Data → Existing UI Surface Mapping (frozen)

| API block | Existing surface | What we change |
|---|---|---|
| `data.customer_summary` | **CustomerModal** | NEW Profile header banner (only when existing customer loaded) |
| `data.customer_value` | **CustomerModal** | Pills in same Profile banner |
| `data.order_patterns.top_items[]` | **CustomerModal** | NEW "Past Favourites" chip row section |
| `data.cross_sell_items[]` | **CustomerModal** | NEW "Smart Suggestions" 3-card section |
| `data.customer_notes` | **OrderNotesModal** | Fill existing "👤 CUSTOMER HISTORY" empty placeholder |
| `data.item_notes_by_id[item_id]` | **ItemNotesModal** | Fill existing "👤 CUSTOMER PREFERENCES" empty placeholder |
| `data.item_notes[]` (legacy single-item) | **NOT USED** by POS | Backward-compat only on CRM side; POS reads from `item_notes_by_id` |
| `data.order_patterns.top_categories[]` | none | HIDDEN (Q-06) |
| `data.order_patterns.avg_items_per_order` | none | not rendered |
| `data.order_patterns.usual_channel` | **CustomerModal** Profile banner | optional small chip (e.g. "Usual: Dine-in") — planning agent decides if shown |
| `data.order_patterns.usual_time_of_day` | **CustomerModal** Profile banner | optional small chip (e.g. "Usual: Afternoon") — planning agent decides |
| `data.customer_summary.available_coupons_count` | none | HIDDEN (F-01) |
| `data.customer_summary.net_spend` | none | HIDDEN (Q-05) |
| `data.meta.feature_flags.cross_sell` | none | Drives Smart Suggestions section visibility |
| `data.meta.feature_flags.upsell` | none | Forward-compat gate (currently false; future Smart Suggestions extension) |
| `data.meta.request_id` | none | Logged for cross-team debug (console only) |
| `data.upsell_items[]` (Phase 2) | none | Forward-compat — silently ignored in v1 |

---

## 6. Acceptance Criteria (frozen)

| AC | Criterion |
|---|---|
| **AC-01** | When a CRM-attached customer (truthy `customer.id`) is on the active order, opening `CustomerModal` triggers exactly one `POST /pos/customers/order-suggestions` if the cache key is cold |
| **AC-02** | When cart changes (≥1 item add/remove), a debounced 500 ms re-fetch fires only if the cart fingerprint changes; same fingerprint = no re-call |
| **AC-03** | Opening `ItemNotesModal` for an item that's in `current_cart` shows the matching notes from `data.item_notes_by_id[item.id]` (top 5 sorted); does NOT re-fetch (data already cached from CustomerModal open or cart attach) |
| **AC-04** | Opening `OrderNotesModal` shows `data.customer_notes` (top 5 sorted) in the "Customer History" section; does NOT re-fetch |
| **AC-05** | Walk-in / guest order (no `customer.id`) → no fetch fired; modals show existing empty states ("No customer linked. Add customer to see preferences.") |
| **AC-06** | First-time customer (`'customer_value' in data === false`) → Profile banner shows "New Customer" badge; band/churn/win-back/favourites/suggestions sections HIDDEN |
| **AC-07** | Tier pill colour mapping (frozen): Bronze=bronze, Silver=silver, Gold=gold, Platinum=platinum+star |
| **AC-08** | Value band pill mapping: Low=gray, Medium=yellow, High=green, VIP=purple+crown |
| **AC-09** | Churn pill mapping: low=hidden, medium=yellow "Watch", high=red "At Risk" |
| **AC-10** | Win-back pill renders ONLY when `win_back_recommendation === true` |
| **AC-11** | `customer_value.score` is NEVER displayed in UI (band only) |
| **AC-12** | `customer_summary.net_spend` is NEVER displayed; `gross_spend` displayed as "Total Spend ₹X" |
| **AC-13** | `customer_summary.available_coupons_count` is NEVER displayed in CustomerModal |
| **AC-14** | `top_categories` section is NEVER rendered in v1 |
| **AC-15** | Past Favourites chip click — if menu item `food.customizable === true` → opens `ItemCustomizationModal`; else adds directly to cart (mirrors `OrderEntry.jsx#L1437`) |
| **AC-16** | Smart Suggestions card click — same behaviour as AC-15 |
| **AC-17** | Cross-sell card displays: name, reason text, source pill ("history" / "restaurant"), confidence (rounded to 0.X1), unit_price from local menu |
| **AC-18** | Cross-sell items already in `current_cart` are NOT rendered (server-side filter; POS does additional defensive filter) |
| **AC-19** | Suggestion section hides entirely when `feature_flags.cross_sell === false` |
| **AC-20** | HTTP 401 / 5xx / network timeout > 3000 ms → all new sections hide silently; `console.warn` emitted |
| **AC-21** | `success: false, code: CUSTOMER_NOT_FOUND` → render empty profile banner state; no console output |
| **AC-22** | Cache TTL = 5 min RAM-only; never persisted to localStorage |
| **AC-23** | `last_visit_at` parsed correctly for both `YYYY-MM-DD HH:MM:SS` (legacy, assume UTC) and ISO 8601 with offset (realtime) formats |
| **AC-24** | `data-testid` hooks present on every new interactive element: `customer-profile-banner`, `customer-tier-pill`, `customer-value-band-pill`, `customer-churn-pill`, `customer-winback-pill`, `customer-favourites-chip-<id>`, `customer-suggestion-card-<id>` |
| **AC-25** | `data.meta.request_id` logged via `console.debug('customerIntel: rid=', data.meta.request_id)` for cross-team trace |
| **AC-26** | No regression to existing `food_level_notes` / `order_note` outbound payload on order commit (Flow 1/2/3/4) |
| **AC-27** | Build clean (`yarn build`); no new ESLint errors beyond pre-existing `OrderEntry.jsx:1301` warning |
| **AC-28** | CustomerModal redesign keeps existing input form intact for new-customer entry mode; new sections only appear when an existing customer is loaded (`selectedCRMCustomer` truthy) |
| **AC-29** | `data.upsell_items[]` if present is silently ignored (forward-compat) |
| **AC-30** | When customer-attach fires from CartPanel, the fetch is triggered (not deferred until CustomerModal opens) |

---

## 7. Definition of Done

- [ ] All 30 acceptance criteria pass (QA stage 7 verifies)
- [ ] Build clean (`cd /app/frontend && CI=false yarn build` → Exit 0)
- [ ] No regression to BUG-108 BUG-108 commit payloads (Flow 1-5)
- [ ] Live smoke pass on preprod restaurant 689 with at minimum:
  - abhishek jain (19 visits, populated favourites + customer_value)
  - priti (0 visits, customer_value omitted, first-time customer flow)
  - one walk-in (no customer) — confirms empty state path
- [ ] QA report under `qa/`
- [ ] Open gaps register under `open_gaps/`
- [ ] Reconciliation doc under `reconciliation/`
- [ ] POS-facing handoff doc under `handoff/` (POS Backend / KDS / downstream consumers — likely n/a since this CR is purely POS Frontend ↔ CRM; planning agent confirms)

---

## 8. Test Matrix (frozen — for QA at stage 7)

| # | Scenario | Customer | Cart | Expected |
|---|---|---|---|---|
| T-01 | CustomerModal open with populated customer | abhishek jain | empty | Profile banner with `Bronze` tier, `High` band, `Watch` churn, no win-back, stats 19/₹18870/237/₹0 |
| T-02 | Past Favourites populated | abhishek jain | empty | 5 chip row: Nuts Overload 78×, Pista Dream 31×, Falooda 20×, Berry Cocoa 7×, Dates 6× |
| T-03 | Cross-sell populated | abhishek jain | empty | 3 cards with name, reason, source pill, confidence |
| T-04 | Cross-sell excludes cart items | abhishek jain | `[182040]` | Card for 182040 NOT present; new top-3 shown |
| T-05 | First-time customer flow | priti | empty | Profile shows "New Customer"; bands/churn/favourites/suggestions hidden |
| T-06 | Walk-in / no customer | n/a | empty | All new sections hidden; existing empty states preserved |
| T-07 | OrderNotesModal Customer History | abhishek jain (after seed of order_note) | n/a | Top-5 notes rendered (after owner-seed order — see open gap OF-01) |
| T-08 | ItemNotesModal Customer Preferences (cart match) | shadab + cart contains "Ras Royale Kunafa" | `[182040 or matching id]` | "packing" chip rendered |
| T-09 | ItemNotesModal Customer Preferences (cart miss) | shadab + cart contains different item | other | Empty state |
| T-10 | Click favourite chip — customizable item | any | empty | Opens ItemCustomizationModal |
| T-11 | Click favourite chip — non-customizable item | any | empty | Adds directly to cart |
| T-12 | Click cross-sell card — customizable | any | empty | Opens ItemCustomizationModal |
| T-13 | Click cross-sell card — non-customizable | any | empty | Adds directly to cart |
| T-14 | Cart-change debounce — single rapid add | any | rapid add 5 items | Single fetch fires 500 ms after last add |
| T-15 | Cart-change debounce — fingerprint unchanged (e.g. qty mutation) | any | qty 1→2→1 | No re-fetch if fingerprint same |
| T-16 | Cache hit | any | same cart twice | Second open uses cached response (verifiable via network panel) |
| T-17 | Cache TTL expiry | any | > 5 min later | New fetch fired |
| T-18 | HTTP 401 | any | n/a | All new sections hidden + `console.warn` |
| T-19 | HTTP 5xx | any | n/a | All new sections hidden + `console.warn` |
| T-20 | Timeout 3 s | any | throttle to slow-3g | Sections hidden + `console.warn` |
| T-21 | `success: false, CUSTOMER_NOT_FOUND` | invalid UUID | n/a | Empty profile; no console |
| T-22 | `success: false, INVALID_REQUEST` | empty body | n/a | (POS shouldn't trigger this; if it does, `console.error`) |
| T-23 | `feature_flags.cross_sell: false` | server flag flipped | any | Smart Suggestions section hidden |
| T-24 | `feature_flags.upsell: true` forward-compat | server flag flipped | any | No crash; `upsell_items[]` ignored |
| T-25 | Dual `last_visit_at` format | migrated customer (legacy format) | any | Parsed correctly; displayed |
| T-26 | Tier pill mapping | each tier value | any | All 4 colours rendered |
| T-27 | `data-testid` audit | n/a | n/a | All 7 testids present |
| T-28 | Regression: commit payload for paid order with customer | abhishek jain | any | `food_level_notes` / `order_note` unchanged from BUG-108 baseline |
| T-29 | Regression: commit payload for walk-in | n/a | any | Unchanged |
| T-30 | Build green + lint clean | n/a | n/a | Exit 0 |

---

## 9. Touch-Point Summary (planning agent finalises)

| File | Action | Approx size |
|---|---|---|
| `src/api/constants.js` | ADD endpoint constant | +1 line |
| `src/api/services/customerIntelService.js` | NEW | ~60 lines |
| `src/api/transforms/customerIntelTransform.js` | NEW | ~120 lines (incl. dual-format date helper, sort, cap) |
| `src/components/order-entry/CustomerModal.jsx` | MODIFY — add profile banner, favourites section, suggestions section, conditional render on `selectedCRMCustomer` | ~+200 lines |
| `src/components/order-entry/ItemNotesModal.jsx` | MODIFY — replace mock `getCustomerPreferences()` with cached intel data | ~+15 lines, ~-10 lines |
| `src/components/order-entry/OrderNotesModal.jsx` | MODIFY — replace mock with cached intel data | ~+15 lines, ~-10 lines |
| `src/components/order-entry/OrderEntry.jsx` | MODIFY — wire fetch on customer-attach + cart-change debounced re-fetch | ~+40 lines |
| `src/contexts/OrderContext.jsx` (or new hook `useCustomerIntel.js`) | NEW (planning agent decides where the cache lives) | ~80 lines |
| `src/data/notePresets.js` | MODIFY — deprecate `mockCustomerPreferences` lookup or strip entirely | ~-20 lines |
| `src/data/index.js` | maybe touch barrel | trivial |
| `src/utils/relativeTime.js` (or inside transform) | NEW helper for relative time formatting | ~30 lines |

**Files NOT touched:**
- POS Backend
- CRM
- `BUG108_FLAGS.js`
- `/app/memory/final/`
- `*.bak.*` archives
- Coupon / Loyalty / Wallet code paths

**Estimated effort:** 8-12 dev hours + 1 QA cycle. **No external dependencies.**

---

## 10. CustomerModal Redesign — Design Constraints (Owner Q1)

> Owner directive: **"we can redesign customer modal keeping design elements same to accommodate all other required information"**

| Preserve | Add |
|---|---|
| Existing typography (font, sizes, weights) | New section headers with consistent style |
| Existing colour palette (greens, grays, oranges) | Tier / band / churn / win-back pill colours per AC-07, AC-08, AC-09 |
| Existing border-radius (modal corners, input fields, buttons) | Same radius on new pills (rounded-full) and new cards |
| Existing padding/spacing scale | Same padding on new sections |
| Existing form input behaviour (Name, Phone, Member ID, Birthday, Anniversary) | Profile banner sits ABOVE the form when an existing customer is loaded |
| Existing save/close button placement | No change |
| Existing typeahead suggestions behaviour | No change |

**Modal layout (new-customer entry mode — unchanged):**
```
┌─ Modal: New Customer ──────────────┐
│ [Member ID typeahead]              │
│ [Name typeahead]  [Phone typeahead]│
│ [Birthday]        [Anniversary]    │
│                                    │
│             [Cancel] [Save]        │
└────────────────────────────────────┘
```

**Modal layout (existing customer mode — NEW):**
```
┌─ Modal: Customer Info ──────────────────────────┐
│ ┌─ Customer Profile ───────────────────────────┐│
│ │ AJ  Abhishek Jain  +91 7505242126            ││
│ │     [Bronze] [High Value] [Watch] [Win-back?]││
│ │     19 visits  ₹18,870  237 pts  ₹0 wallet   ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ── Past Favourites ──                           │
│ [Nuts Overload 78×]  [Pista Dream 31×]  [...]   │
│                                                  │
│ ── Smart Suggestions ──                         │
│ ┌─ Berry Cocoa Swirl Loua  conf 0.21 ─┐         │
│ │   history · Ordered in 7 of 20 visits│         │
│ │           [+ Add to cart  ₹309]      │         │
│ └──────────────────────────────────────┘         │
│ [more cards...]                                  │
│                                                  │
│ ── Edit Customer Info ──                        │
│ [name] [phone] [birthday] [anniversary]         │
│                                                  │
│            [Cancel] [Save]                       │
└──────────────────────────────────────────────────┘
```

Planning agent owns final pixel-perfect layout; this is the conceptual blueprint.

---

## 11. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Q-02 fix not yet deployed on the working host → `available_coupons_count` may briefly mismatch CRM intent | M | L | POS hides field entirely (F-01); no UX impact |
| R-02 | CRM endpoint latency 1.7-2.7s on preview | H (preview) / L (prod) | M | 3 s hard timeout + skeleton + silent hide |
| R-03 | `cross_sell_items[].item_id` references food not in current menu | L | L | Defensive `menu.find()` + silent drop |
| R-04 | Walk-in customer flow regressions (no customer.id but modal still opens) | L | M | T-06 regression; explicit conditional render |
| R-05 | CustomerModal redesign breaks existing input flow | L | H | T-28 / T-29 regression; planning agent must preserve form section |
| R-06 | Cache key collision across customers | L | M | Cache key includes customer.id |
| R-07 | First-time customer detection via `'customer_value' in data` is brittle | L | L | Documented as v1.1 frozen contract; CRM commits to never returning `customer_value: null` for first-timers |
| R-08 | Click-to-add for cross-sell breaks if food.id type mismatch | L | M | T-15 / T-16; planning agent verifies string comparison |
| R-09 | Phase 2 upsell ships before POS upgrades; POS receives `upsell_items[]` and ignores | L | L | Forward-compat tolerance (T-24); planning agent confirms no parse crash |
| R-10 | OrderEntry.jsx ESLint warning at L1301 (pre-existing) | n/a | n/a | Out of CR scope |

---

## 12. Rollback / Kill Switch

- **No new POS-side feature flag** (Owner Q6c-A — server-driven via `feature_flags.cross_sell`)
- **Server-side kill** = CRM flips `feature_flags.cross_sell: false`; POS Smart Suggestions section hides immediately. Profile / Favourites / Notes sections remain visible (they're not gated by this flag — they're driven by data presence).
- **Code-side rollback** = revert the implementation commit. Existing mock `getCustomerPreferences()` brings the UI back to v1 empty state for real customers; no migration / no data loss.

---

## 13. Stage Handoff to Planning Agent

The planning agent SHOULD now:

1. Read in order:
   - This requirements freeze
   - Contract freeze (`contract/CRM2_0_CR_002_CROSS_SELL_CONTRACT_FREEZE_2026_05_26.md`)
   - Discovery feedback (`discovery/CRM2_0_CR_002_POS_FEEDBACK_TO_CRM_HANDOFF_2026_05_26.md`)
   - Upstream CRM handoff (`handoff/CRM2_0_CR_002_CROSS_SELL_API_HANDOFF_FROM_CRM_2026_05_26.md`)

2. Decisions delegated to planning agent (do NOT re-open):
   - Where the cache lives (`OrderContext` vs new `useCustomerIntel` hook vs service-internal)
   - `notePresets.js` migration path (deprecate fully vs keep as fallback)
   - Pixel-level CustomerModal redesign within §10 constraints
   - Loading-state UX (skeleton element vs inline shimmer vs delayed-render)
   - Whether `usual_channel` / `usual_time_of_day` chips appear in Profile banner
   - Whether to also surface "View Profile" expand/collapse for power-users

3. Produce ONE doc:
   ```
   /app/memory/crm/crm_2_0/implementation/CRM2_0_CR_002_CROSS_SELL_IMPL_PLAN_<date>.md
   ```
   With at minimum:
   - File-by-file diff plan (touch-point map fleshed out with actual code structure)
   - Per-file change kind (NEW vs MODIFY vs DELETE)
   - Two-phase structure with UI preview checkpoint (per §13.2)
   - Pixel-level CustomerModal layout (Figma-like description)
   - UI preview artifact spec (per §13.1)
   - Rollback verified
   - Risk extension (R-01 … R-N additions if found)
   - Clean handover checklist for implementation agent (per §13.5)

4. STOP. Do not write code. Implementation agent owns Stage 6.

---

### 13.1 UI PREVIEW APPROVAL GATE (Non-Negotiable)

**Rule:** ANY new user-facing UI introduced by CR-002 (or any future CR) MUST receive an explicit owner-approved visual preview BEFORE any production UI code is written by the implementation agent.

**What the preview must show:**

| # | Preview element | Required detail |
|---|---|---|
| P-1 | CustomerModal — existing-customer mode with Profile banner | Full mock-up showing: avatar/initials, name, phone, tier pill, value-band pill, churn pill, win-back pill, stats row (visits / total spend / loyalty points / wallet balance) |
| P-2 | CustomerModal — Past Favourites chip row | Top-5 chips with item name + order count, click affordance |
| P-3 | CustomerModal — Smart Suggestions 3-card section | Each card showing: name, reason text, source pill, confidence, price, "+ Add" button |
| P-4 | CustomerModal — new-customer entry mode (UNCHANGED) | Proof that existing form inputs (Name, Phone, Member ID, Birthday, Anniversary, Cancel, Save) are untouched |
| P-5 | CustomerModal — first-time customer mode | "New Customer" badge, band/churn/favourites/suggestions sections hidden |
| P-6 | ItemNotesModal — Customer Preferences section populated | Top-5 notes with `<note> (count x relative-time)` format, green chip on click |
| P-7 | OrderNotesModal — Customer History section populated | Same format as P-6 |
| P-8 | Loading skeleton states | Skeleton placeholders for Profile / Favourites / Suggestions while fetch is in flight |
| P-9 | Empty / error states | Sections hidden cleanly when no data, timeout, or auth failure |

**Preview artifact format:**

The planning agent MUST specify which format the implementation agent will use for the preview. Options (planning agent picks one):

- **(A) Static HTML preview page** — standalone `.html` file under `/app/frontend/public/` with hardcoded mock data, demonstrating every P-1..P-9 state. Owner opens the page, reviews, approves or requests changes. Deleted after approval.
- **(B) Storybook / isolated component render** — if Storybook is available; otherwise use (A).
- **(C) Screenshot + annotated mockup** — implementation agent renders the components with mock data, takes screenshots, annotates with data-testid labels and section boundaries. Owner reviews the images.

**Approval flow:**

```
1. Implementation agent completes Phase 1 (API/service/transform/cache — no UI)
2. Implementation agent builds the UI preview artifact (per format above)
3. Implementation agent presents preview to owner with:
   - Link / path to preview
   - Checklist mapping each P-1..P-9 to a visible element
   - Note: "No production UI code committed yet. Awaiting your approval."
4. Owner reviews and responds:
   - APPROVED → implementation agent proceeds to Phase 2 (production UI)
   - CHANGES_REQUESTED → implementation agent updates preview, re-presents
   - REJECTED → escalate to planning agent for redesign
5. Preview artifact is deleted after Phase 2 is complete (cleanup)
```

**Enforcement:** The implementation agent MUST NOT commit any production UI changes (modifications to `CustomerModal.jsx`, `ItemNotesModal.jsx`, `OrderNotesModal.jsx`) until the owner has approved the preview. Phase 1 (service/transform/cache) code CAN be committed before approval since it has zero UI impact.

---

### 13.2 TWO-PHASE IMPLEMENTATION WITH PREVIEW CHECKPOINT (Non-Negotiable)

The impl plan MUST structure implementation into exactly **two phases with a mandatory preview checkpoint between them**:

```
┌──────────────────────────────────────────────────────────────┐
│ PHASE 1 — API / Service / Transform / Cache                 │
│                                                              │
│  1a. Add endpoint constant to constants.js                   │
│  1b. Create customerIntelService.js (POST wrapper)           │
│  1c. Create customerIntelTransform.js (normalize response)   │
│  1d. Create cache layer (useCustomerIntel hook or similar)   │
│  1e. Create relativeTime utility                             │
│  1f. Wire fetch trigger on customer-attach + cart-change     │
│  1g. Verify via console.log / curl that API round-trip works │
│                                                              │
│  Deliverable: API data flows into POS, logged to console.    │
│  Zero visual changes to the app.                             │
│  CAN be committed.                                           │
├──────────────────────────────────────────────────────────────┤
│ ★ UI PREVIEW CHECKPOINT (BLOCKING GATE)                      │
│                                                              │
│  - Implementation agent builds preview artifact (§13.1)      │
│  - Owner reviews P-1..P-9 states                             │
│  - Owner approves / requests changes / rejects               │
│  - MUST NOT proceed to Phase 2 until APPROVED                │
├──────────────────────────────────────────────────────────────┤
│ PHASE 2 — UI Implementation (only after owner approval)      │
│                                                              │
│  2a. CustomerModal.jsx — add Profile banner, Past Favourites,│
│      Smart Suggestions sections (per approved preview)       │
│  2b. ItemNotesModal.jsx — replace mock getCustomerPreferences│
│      with cached intel data for "Customer Preferences"       │
│  2c. OrderNotesModal.jsx — replace mock with cached intel    │
│      data for "Customer History"                             │
│  2d. notePresets.js — deprecate mock (per planning decision) │
│  2e. data-testid hooks on all new interactive elements       │
│  2f. Loading skeleton states                                 │
│  2g. Empty / error / timeout state handling                  │
│                                                              │
│  Deliverable: Full working UI matching approved preview.     │
│  CAN be committed after QA passes.                           │
└──────────────────────────────────────────────────────────────┘
```

**Rules:**
- Phase 1 MUST be completed and verified (API data round-trip working) BEFORE building the preview.
- The preview checkpoint MUST happen BEFORE any Phase 2 code is written.
- No phase may be skipped, merged, or reordered.
- If the owner requests changes at the preview checkpoint, only the preview is updated — Phase 1 code is unaffected.

---

### 13.3 PHASE 1 COMPLETION CRITERIA

Phase 1 is "done" when:

| # | Criterion | Verification |
|---|---|---|
| P1-C1 | `customerIntelService.js` exists and `getOrderSuggestions()` returns a valid response for a known customer (e.g. abhishek jain UUID) | `console.log` or curl test |
| P1-C2 | `customerIntelTransform.js` normalizes the response to camelCase POS shape with dual `last_visit_at` format handling | Unit-level verification |
| P1-C3 | Cache layer stores response keyed by `(customer_id, cart_fingerprint)` with 5 min TTL | Verify second call returns cached data |
| P1-C4 | Debounced cart-change re-fetch fires correctly (500 ms, only on fingerprint change) | Manual test or console log |
| P1-C5 | Error paths (401, 5xx, timeout, `CUSTOMER_NOT_FOUND`) are handled gracefully (console.warn, no crash) | Force each error condition |
| P1-C6 | `yarn build` passes — no new ESLint errors | Build output |
| P1-C7 | Zero visual changes to the app — existing UI is identical to pre-Phase-1 | Screenshot comparison |

---

### 13.4 PHASE 2 COMPLETION CRITERIA

Phase 2 is "done" when:

| # | Criterion | Verification |
|---|---|---|
| P2-C1 | CustomerModal renders Profile banner for existing customer matching approved preview | Visual comparison to approved preview |
| P2-C2 | CustomerModal renders Past Favourites chip row matching approved preview | Visual comparison |
| P2-C3 | CustomerModal renders Smart Suggestions cards matching approved preview | Visual comparison |
| P2-C4 | CustomerModal new-customer entry mode is unchanged (form inputs, save/close buttons) | Regression test |
| P2-C5 | ItemNotesModal "Customer Preferences" section populated from real CRM data | Smoke test with customer `shadab` |
| P2-C6 | OrderNotesModal "Customer History" section populated from real CRM data | Smoke test |
| P2-C7 | Click behaviour on chips/cards matches `food.customizable ? setCustomizationItem : addToCart` | Manual test |
| P2-C8 | All `data-testid` hooks present per AC-24 | DOM inspection |
| P2-C9 | Loading skeletons, empty states, error states render correctly | Manual test of each state |
| P2-C10 | All 30 ACs from §6 pass | QA agent (Stage 7) |
| P2-C11 | `yarn build` passes | Build output |
| P2-C12 | No regression to existing flows (BUG-108 commit payloads, walk-in orders, etc.) | Regression tests T-28, T-29 |

---

### 13.5 CLEAN HANDOVER GUARANTEE (Non-Negotiable)

The planning agent's impl plan MUST be complete enough that the implementation agent can execute Phase 1 and Phase 2 with **NO owner clarification** except the single UI preview approval moment between phases.

**The impl plan MUST contain all of the following:**

| # | Required content | Why |
|---|---|---|
| CH-1 | Exact file paths for every NEW file and every MODIFIED file | Implementation agent must not guess file locations |
| CH-2 | Per-file change description with enough detail to write code (function signatures, state shape, prop types) | No ambiguity on what to build |
| CH-3 | Exact CRM endpoint URL construction (base URL env var + path constant) | No guessing how to call the API |
| CH-4 | Exact auth header wiring (which axios instance, which interceptor, which token) | Implementation agent uses existing `crmAxios.js` — plan must confirm this |
| CH-5 | Exact cache key formula and TTL | No implementation-time decision on cache shape |
| CH-6 | Exact cart fingerprint formula | No implementation-time decision |
| CH-7 | Exact data-testid values for every new interactive element | No implementation-time invention of testid names |
| CH-8 | Exact pill colour / icon mapping table (copy from contract §8.4 or extend) | No implementation-time design decision |
| CH-9 | Exact CustomerModal layout — section order, conditional visibility rules, which data fields render where | No implementation-time layout decision |
| CH-10 | Exact click behaviour for every clickable element (chips, cards, buttons) | No implementation-time UX decision |
| CH-11 | Exact error/empty/loading state behaviour per section | No implementation-time decision on error UX |
| CH-12 | Exact migration path for `notePresets.js` / `getCustomerPreferences()` | No implementation-time decision on how to replace mock |
| CH-13 | UI preview artifact format (A, B, or C from §13.1) and instructions for building it | Implementation agent knows exactly what to produce for owner review |
| CH-14 | Phase 1 completion criteria checklist (from §13.3) | Implementation agent knows when Phase 1 is "done" |
| CH-15 | Phase 2 completion criteria checklist (from §13.4) | Implementation agent knows when Phase 2 is "done" |
| CH-16 | Rollback instructions for both phases independently | Implementation agent can roll back Phase 1 without affecting Phase 2 and vice versa |

**If any CH-1..CH-16 item is missing or ambiguous in the impl plan, the planning agent has NOT met the Clean Handover Guarantee and must revise before handing off to implementation.**

---

## 14. Document Linkages

| Doc | Path |
|---|---|
| Sprint scaffold | `/app/memory/crm/crm_2_0/README.md` |
| Upstream CRM handoff | `handoff/CRM2_0_CR_002_CROSS_SELL_API_HANDOFF_FROM_CRM_2026_05_26.md` |
| POS feedback (Stage 1 — discovery output) | `discovery/CRM2_0_CR_002_POS_FEEDBACK_TO_CRM_HANDOFF_2026_05_26.md` |
| Contract freeze (Stage 3) | `contract/CRM2_0_CR_002_CROSS_SELL_CONTRACT_FREEZE_2026_05_26.md` |
| **Requirements freeze (Stage 4) — THIS DOC** | `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` |
| Impl plan (Stage 5) — TO BE WRITTEN BY PLANNING AGENT | `implementation/CRM2_0_CR_002_CROSS_SELL_IMPL_PLAN_<date>.md` |
| Impl report (Stage 6) — TO BE WRITTEN BY IMPL AGENT | `implementation/CRM2_0_CR_002_CROSS_SELL_IMPL_REPORT_<date>.md` |
| QA (Stage 7) | `qa/CRM2_0_CR_002_CROSS_SELL_QA_REPORT_<date>.md` |
| Reconciliation (Stage 7) | `reconciliation/CRM2_0_CR_002_CROSS_SELL_RECONCILIATION_<date>.md` |
| Open gaps (Stage 7) | `open_gaps/CRM2_0_CR_002_CROSS_SELL_OPEN_GAPS_<date>.md` |

---

## 15. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | All 30 acceptance criteria derived from contract + Owner decisions | ✅ |
| 2 | All 30 test scenarios mapped to acceptance criteria | ✅ |
| 3 | Scope IN / OUT explicit and exhaustive | ✅ |
| 4 | Data → existing surface mapping complete; no orphan blocks | ✅ |
| 5 | CustomerModal redesign constraints frozen per Owner Q1 (preserve design language) | ✅ |
| 6 | No code written | ✅ |
| 7 | No impl plan written (planning agent owns Stage 5) | ✅ |
| 8 | No POS Frontend / Backend / CRM changes | ✅ |
| 9 | `/app/memory/final/` untouched | ✅ |
| 10 | `/app/memory/crm/crm_1_0/` untouched | ✅ |
| 11 | Sprint workflow stage 4 of 8 reached; stages 5-8 are downstream agents' responsibility | ✅ |

---

**End of CRM 2.0 CR-002 Cross-Sell + Customer Intelligence Requirements Freeze. Stage 4 complete. Handoff to planning agent.**
