# CRM 2.0 — CR-002 Cross-Sell + Customer Intelligence — POS-Facing Handoff

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**CR ID:** `CR_002`
**Stage:** 8 of 8 (POS-facing handoff)
**Audience:** POS Backend team, CRM team, future POS engineers, QA/Ops, next-CR planning agent
**Author:** CRM 2.0 Stage 8 Handoff Drafting Agent (read-only)
**Status:** **DRAFT — awaiting live regression evidence (§13)** for final close-out

**Predecessor authoritative docs (read in this order if you are new to CR-002):**
1. `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` (ACs / test matrix)
2. `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md` (current QA truth)
3. `reconciliation/CRM2_0_CR_002_STAGE_6B_PREVIEW_GATE_CLOSURE_2026_05_27.md` (Stage 6b closure record)
4. `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md` (in-sprint P0 hotfix)
5. `open_gaps/CRM2_0_CONSOLIDATED_OPEN_GAPS_2026_05_27.md` (live open items)
6. `reconciliation/CRM2_0_SPRINT_CONSOLIDATION_2026_05_27.md` (sprint roll-up)

---

## 1. What this CR delivered (one paragraph)

CR-002 wires the CRM v1.1 endpoint `POST /pos/customers/order-suggestions` into the POS so that the moment a CRM-attached customer is on an active order, the cashier sees their **profile banner** (name, phone, tier, value band, churn risk, win-back pill, visits / total spend / loyalty points / wallet balance), their **top 5 past favourites** as one-click chips, and **3 cross-sell suggestion cards** — all inside the existing **CustomerModal**. The **ItemNotesModal** and **OrderNotesModal** populate their "Customer Preferences" / "Customer History" sections from the same live response (replacing the old mock data). Zero new top-level UI surfaces were introduced; no top header strip, no cart-panel side strip — only the three existing modals were upgraded. The legacy POS calls to `GET /notes/items` and `GET /notes/orders` have been removed at the call-site level (code audit confirms zero remaining call sites; runtime confirmation pending live QA — see §13).

---

## 2. The CRM Endpoint (contract summary)

> Full contract is frozen in `contract/CRM2_0_CR_002_CROSS_SELL_CONTRACT_FREEZE_2026_05_26.md` v1.1. This section is a quick-reference.

| Field | Value |
|---|---|
| **URL constant** | `API_ENDPOINTS.CUSTOMER_ORDER_SUGGESTIONS` (= `'/pos/customers/order-suggestions'`) |
| **Base URL** | `process.env.REACT_APP_CRM_BASE_URL` (preprod = `https://insights-phase.preview.emergentagent.com/api`) |
| **HTTP method** | `POST` |
| **Axios instance** | `crmApi` (= `src/api/crmAxios.js`) — auth header `X-API-Key` set by existing login-response `crm_token` interceptor |
| **Hard timeout** | `3000 ms` (set per-call in `customerIntelService.js`) |
| **Request body** | `{ crm_customer_id: string, current_cart: [{ item_id: string, qty: number, unit_price: number }], order_type?: 'dine_in' \| 'takeaway' \| 'delivery' }` |
| **Successful response** | `{ success: true, data: { customer_summary, customer_value?, order_patterns, customer_notes[], item_notes[], item_notes_by_id, cross_sell_items[], upsell_items[]?, meta: { feature_flags, request_id, generated_at } } }` |
| **Empty / not-found response** | `{ success: false, data: { error: { code: 'CUSTOMER_NOT_FOUND' \| 'INVALID_REQUEST' } } }` |

### Three classes of failure (and what POS does about each)

| Class | POS behaviour |
|---|---|
| HTTP 401 (auth fail) | `console.warn('customerIntel: auth fail')`, all new sections hide cleanly, no toast |
| HTTP 5xx / network / timeout > 3 s | `console.warn` with classification, all new sections hide cleanly, no toast |
| `success:false, code='CUSTOMER_NOT_FOUND'` | Empty profile rendered, no console output |
| `success:false, code='INVALID_REQUEST'` | `console.error('customerIntel: invalid request')`, sections hide |

In every failure class, the existing modal (CustomerModal new-customer entry form, etc.) **stays fully functional** — POS never blocks the cashier on a CRM hiccup.

---

## 3. What the cashier sees (UI map)

### 3.1 CustomerModal (existing surface, upgraded)

```
┌─ Modal: Customer Info ──────────────────────────┐
│ ┌─ Customer Profile (data-testid=customer-profile-banner) ─┐
│ │ AJ  Abhishek Jain  +91 7505242126            │
│ │     [Bronze] [High Value] [Watch] [Win-back?] │
│ │     19 visits  ₹18,870  237 pts  ₹0 wallet   │
│ └──────────────────────────────────────────────┘
│
│ ── Past Favourites ── (data-testid=customer-favourites-section)
│ [Nuts Overload 78×]  [Pista Dream 31×]  [Falooda 20×] …
│
│ ── Smart Suggestions ── (data-testid=customer-suggestions-section)
│ ┌─ Berry Cocoa Swirl  conf 0.21 ─┐
│ │   history · Ordered in 7 of 20 visits │
│ │   [+ Add to cart  ₹309] │
│ └────────────────────────────────┘
│ [more cards…]
│
│ ── Edit Customer Info ──
│ [Name] [Phone] [Member] [Birthday] [Anniversary]
│
│            [Cancel] [Save]
└──────────────────────────────────────────────────┘
```

- The **Profile / Favourites / Suggestions** sections only appear when an existing customer (truthy `customer.id` with CRM-resolved profile) is loaded.
- The **new-customer entry mode** (when no `customer.id` yet) is **unchanged** — same input form, same Save / Cancel buttons.
- Loading state: three skeleton blocks (`customer-intel-skeleton-profile`, `…-favourites`, `…-suggestions`) while the fetch is in flight (~debounce 500 ms + endpoint latency).
- First-time customer (CRM returns no `customer_value` block) → "New Customer" badge, band / churn / win-back / favourites / suggestions sections all hidden.

### 3.2 ItemNotesModal

The existing "👤 CUSTOMER PREFERENCES" section is now driven by `customerIntel.itemNotesByItemId[currentItem.id]` (top 5, sorted by usedCount DESC then lastUsedAt DESC). When no notes exist, the section renders cleanly empty. The cashier can still **type a free note** and the **chip presets** are unchanged.

### 3.3 OrderNotesModal

The existing "👤 CUSTOMER HISTORY" section is driven by `customerIntel.customerNotes` (top 5, same sort). Cashier write-flow is unchanged.

---

## 4. Clickable behaviour

| Element | Clickable | Behaviour |
|---|---|---|
| Past Favourites chip | YES | Mirrors menu-item click — `food.customizable ? open ItemCustomizationModal : addToCart()` |
| Smart Suggestion card "+ Add" | YES | Same as above |
| Tier / value-band / churn / win-back pills | NO (cosmetic only) | — |
| Customer name / phone / stats text | NO | — |
| Anything in the loading skeleton | NO | — |

The chip / card click handler is wired in `OrderEntry.jsx` and passed into CustomerModal via `onAddToCart`, `onCustomizeItem`, `menuItems` props.

---

## 5. `data-testid` inventory (for automation engineers)

| Surface | Test IDs |
|---|---|
| **CustomerModal** | `customer-modal`, `customer-profile-banner`, `customer-tier-pill`, `customer-value-band-pill`, `customer-churn-pill`, `customer-winback-pill`, `customer-favourites-section`, `customer-suggestions-section`, `customer-intel-skeleton-profile`, `customer-intel-skeleton-favourites`, `customer-intel-skeleton-suggestions`, `customer-name-input`, `customer-phone-input`, `customer-member-input`, `customer-birthday-input`, `customer-anniversary-input`, `customer-name-suggestions`, `customer-phone-suggestions`, `customer-error`, `customer-save-btn` |
| **ItemNotesModal** | `item-notes-modal` (single container testid — interior elements use the same write-area testids as before CR-002) |
| **OrderNotesModal** | `order-notes-modal` (same convention) |
| **OrderEntry header icon** | `customer-info-btn` |

Per-chip and per-card item-level testids (`customer-favourites-chip-<id>`, `customer-suggestion-card-<id>`) — these are **not currently in code**; AC-24 lists them as required. If your automation needs per-item targeting, raise a sub-task; current automation should query the section then iterate children.

---

## 6. Kill switch & feature flags

**No client-side feature flag.** Disablement is server-driven via `response.data.meta.feature_flags`:

| Flag | What it controls | Default | Source of truth |
|---|---|---|---|
| `cross_sell` | Smart Suggestions section visibility | `true` (CRM returns) | CRM `feature_flags` on the response — flip per-restaurant or globally on CRM side |
| `upsell` | Upsell rendering (Phase 2 — **not implemented yet** in POS) | `false` | CRM forward-compat; POS silently ignores `upsell_items[]` today |
| `ai` | AI-generated copy (future) | `false` | CRM forward-compat |

**Effect of flipping `cross_sell` to `false`:**
- Smart Suggestions section is hidden immediately on next fetch.
- Profile banner, Past Favourites, Customer Preferences, Customer History remain visible (they are gated by data presence, not by `cross_sell`).
- No POS deploy required.

**Hard disable (everything):** point the CRM endpoint to return HTTP 5xx or 401 → POS silently hides all new sections, modals continue to work for plain customer entry / item notes / order notes.

---

## 7. Rollback procedures

### 7.1 Roll back Phase 2 (UI) only — keep Phase 1 (API) alive

Revert these four files to their pre-Phase-2 state:
- `frontend/src/components/order-entry/CustomerModal.jsx` (revert profile/favourites/suggestions sections)
- `frontend/src/components/order-entry/ItemNotesModal.jsx` (revert `customerIntel` consumption; re-enable `getCustomerPreferences` mock)
- `frontend/src/components/order-entry/OrderNotesModal.jsx` (same)
- `frontend/src/components/order-entry/OrderEntry.jsx` (remove the three modal prop wires — `customerIntel`, `customerIntelLoading`, `onAddToCart`, `onCustomizeItem`, `menuItems`)

The hook in `OrderEntry.jsx` still runs and caches data — it just isn't rendered.

### 7.2 Roll back Phase 1 (API) and Phase 2 together

Additionally remove / revert:
- `frontend/src/utils/relativeTime.js` (NEW — safe to delete)
- `frontend/src/api/services/customerIntelService.js` (NEW — safe to delete)
- `frontend/src/api/transforms/customerIntelTransform.js` (NEW — safe to delete)
- `frontend/src/hooks/useCustomerIntel.js` (NEW — safe to delete)
- `frontend/src/api/constants.js` — remove the `CUSTOMER_ORDER_SUGGESTIONS` line
- `frontend/src/components/order-entry/OrderEntry.jsx` — remove `useCustomerIntel` import + the `const { intel, loading } = useCustomerIntel(...)` line at L18 / L159

No data migration. No persisted state. RAM cache disappears with the page.

### 7.3 Customer-icon hotfix rollback (separate)

The 2026-05-27 hotfix removed `{canCustomerManage && (...)}` wrapping the customer button in `OrderEntry.jsx` L1382. To revert, re-add the conditional. **Not recommended** — the wrapper hid the icon for non-`customer_management` users, which was the original P0 bug.

---

## 8. Caching behaviour (operator notes)

| Property | Value |
|---|---|
| Storage | **RAM only** — never written to `localStorage`, `sessionStorage`, IndexedDB, or cookies |
| TTL | **5 minutes** |
| Cache key | `${customerId}__${cartFingerprint}` where `cartFingerprint = JSON.stringify(sortedNonCancelledCart)` |
| Debounce | **500 ms** on cart change |
| Eviction | On customer change (immediate), on TTL expiry (lazy), or on page reload |

**Operational implications**
- "Customer's data is stale" reports → tell the cashier to close and reopen the customer popup once 5 minutes have passed, or refresh the page.
- Network panel will show **one** `POST /pos/customers/order-suggestions` per cache-miss; same customer + same cart within 5 min = **zero** subsequent calls.

---

## 9. Known limitations carried into production

Owner decisions on 2026-05-27 (recorded in `open_gaps/CRM2_0_CONSOLIDATED_OPEN_GAPS_2026_05_27.md`):

| # | Limitation | Scope | Decision | Tracking |
|---|---|---|---|---|
| L-1 | **"No customer linked" in notes modals when customer was attached via cart-panel typing (Path B) or order restore (Path C)** | Pre-existing architectural gap — feature is keyed on `customer.id`; Paths B and C do not populate `customer.id` until next CRM resolution | **Scheduled as follow-up CR (CR-002-FOLLOWUP-01).** Will trigger a CRM phone lookup on cart-panel phone-input blur. | CG-04 → status **SCHEDULED** |
| L-2 | **"New Customer" badge appears only after the first re-open of the customer popup** | First-time customer flow — fetch fires after Save closes the popup, so badge is missing on first open and visible on subsequent opens | **Scheduled as follow-up CR (CR-002-FOLLOWUP-02).** Will pre-fetch intel inside CustomerModal on search-pick or save-success. | CG-07 → status **SCHEDULED** |
| L-3 | CRM endpoint latency 1.7–2.7 s on preview host | Network — preview infra only; production is co-located | Acceptable for v1. Defended by 3 s timeout + skeleton + silent hide. | CG-05 — track until production deploy |
| L-4 | `usual_time_of_day` rendered as static chip; no timezone comparison logic | Profile banner | Acceptable for v1. | CG-09 — backlog |
| L-5 | `filteredCrossSell` defensive filter is a passthrough (returns true for all server-supplied cross-sell items) | Cart-exclusion logic | Acceptable — server-side filter is primary and reliable. | CG-08 — STRUCTURAL_PASS |
| L-6 | `upsell_items[]` block silently ignored | Forward-compat | By design — Phase 2 of CRM upsell engine. | CG-11 — VERIFIED_SAFE |

---

## 10. Performance & telemetry

| Signal | Where it lives | Notes |
|---|---|---|
| `console.debug('customerIntel: rid=', requestId)` on every successful response | DevTools console (debug level) | Cross-team trace — match `request_id` to CRM-side logs |
| `console.warn('customerIntel: auth fail' \| 'server error' \| 'timeout' \| 'fetch failed')` on failure | DevTools console | Classified for quick triage |
| `console.error('customerIntel: invalid request')` on `success:false, INVALID_REQUEST` | DevTools console | Should not occur in normal flow; if seen, raise immediately — POS is sending a malformed body |

No analytics events emitted (no Mixpanel / Segment / GA hooks in this CR). If the product team wants chip-click / card-click attribution, raise a follow-up CR.

---

## 11. Touch-point summary (what changed under the hood)

| Kind | Path | Lines | Notes |
|---|---|---|---|
| NEW | `frontend/src/utils/relativeTime.js` | 25 | "3 weeks ago" formatter |
| NEW | `frontend/src/api/services/customerIntelService.js` | 35 | POST wrapper + 3 s timeout |
| NEW | `frontend/src/api/transforms/customerIntelTransform.js` | 155 | camelCase normalize + dual date parser + sort + top-5 cap |
| NEW | `frontend/src/hooks/useCustomerIntel.js` | 155 | RAM cache + 5 min TTL + 500 ms debounce + stale-response guard |
| MODIFIED | `frontend/src/api/constants.js` | +1 | Added `CUSTOMER_ORDER_SUGGESTIONS` |
| MODIFIED | `frontend/src/components/order-entry/OrderEntry.jsx` | +8 | Hook wiring + customer-icon hotfix |
| MODIFIED | `frontend/src/components/order-entry/CustomerModal.jsx` | +206 | Profile banner + Past Favourites + Smart Suggestions + skeletons + empty states + click handlers + collapsible edit form |
| MODIFIED | `frontend/src/components/order-entry/ItemNotesModal.jsx` | +13 | CRM-driven Customer Preferences |
| MODIFIED | `frontend/src/components/order-entry/OrderNotesModal.jsx` | +10 | CRM-driven Customer History |
| UNTOUCHED | `frontend/src/data/notePresets.js` | — | Mock helper still present but **zero call sites** from production modals (audit confirmed) |
| UNTOUCHED | `/app/backend/`, CRM, `BUG108_FLAGS.js`, `/app/memory/final/`, `/app/memory/crm/crm_1_0/` | — | — |

Build: `yarn build` exit 0. Only the pre-existing ESLint warning in `OrderEntry.jsx` (`react-hooks/exhaustive-deps` near `printOrder`) survives — not introduced by this CR.

---

## 12. Cross-team checklist

### 12.1 POS Backend team — please confirm

- [ ] POS BE continues to forward `food_level_notes` and `order_note` keys on order commit unchanged. **(BC-01 / BC-02 carryover from BUG-108 — see `open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_2026_05_27.md`)**
- [ ] POS BE forwards `items[]` (OrderItem schema) to CRM `/api/pos/orders` so coupon V2/V3 revalidation can complete (BC-01).
- [ ] POS BE generates `loyalty_idempotency_key` per Owner 2026-05-25 Option B (BC-02).

These are POS-BE-owned items; POS Frontend changes in this CR are decoupled from them but live regression QA (§13) verifies that frontend payloads have not regressed.

### 12.2 CRM team — please confirm

- [ ] `POST /pos/customers/order-suggestions` v1.1 remains stable.
- [ ] `feature_flags.cross_sell` switch is configurable per restaurant.
- [ ] `feature_flags.upsell` remains `false` until CRM upsell engine ships; POS is forward-compat-safe (BC of `data.upsell_items[]` block).
- [ ] Endpoint latency target ≤ 500 ms in production (current preview observation: 1.7–2.7 s — CG-05).

### 12.3 Next CR's planning agent

- [ ] Reads §11 above for the surface map before touching CustomerModal / ItemNotesModal / OrderNotesModal.
- [ ] Reads §9 (L-1, L-2) before deciding to fold them into another CR — they are already scheduled as CR-002-FOLLOWUP-01 and CR-002-FOLLOWUP-02.

### 12.4 QA / Ops

- [ ] Knows the kill switch (§6) — flip `cross_sell` on CRM if Smart Suggestions misbehaves.
- [ ] Knows the rollback procedure (§7) — Phase 1 and Phase 2 are independently revertable.
- [ ] Knows the telemetry signals (§10) — `customerIntel: rid=` for cross-team trace.

---

## 13. Live regression evidence (RESERVED — to be appended)

This section is intentionally left empty as a placeholder. When the live regression QA agent completes the R689 paid-order session (see `reconciliation/CRM2_0_SPRINT_CONSOLIDATION_2026_05_27.md` §9 and the user-facing playbook from the 2026-05-27 chat), the following artifacts will be linked / pasted here:

| Slot | Artifact | Closes |
|---|---|---|
| 13.1 | `R689_with_customer_before_paying.har` (network log showing zero `/notes/items` + zero `/notes/orders` calls; one `/pos/customers/order-suggestions` call) | CG-02 / OG-06 |
| 13.2 | `R689_with_customer_after_paying.har` + `R689_with_customer_paid_order.txt` (commit payload diff vs BUG-108 baseline — `food_level_notes` + `order_note` shape unchanged) | CG-01 / OG-02 (T-28) |
| 13.3 | `R689_walkin_paid_order.txt` (walk-in commit payload diff vs BUG-108 baseline) | CG-01 / OG-02 (T-29) |
| 13.4 | `R689_customer_history_populated.png` (screenshot of OrderNotesModal Customer History populated with seeded note) | CG-06 / OG-08 (T-07) |
| 13.5 | `R689_first_time_badge.txt` (one-line observation) | CG-07 / OG-11 confirmation — scheduled regardless |

Once these slots are filled, CR-002 is **CLOSED**. Until then, CR-002 status is **CODE-COMPLETE, AWAITING LIVE REGRESSION EVIDENCE**.

---

## 14. Sign-off matrix

| Role | Sign-off | Date | Notes |
|---|---|---|---|
| Owner — Phase 2 UI acceptance (retroactive, Option B) | ✅ | 2026-05-27 | Recorded in Stage 6b closure doc |
| Owner — customer-icon hotfix smoke | ✅ | 2026-05-27 | Recorded in hotfix doc |
| Owner — decision on L-1 (CG-04) | ✅ Option 2 (scheduled CR) | 2026-05-27 | See §9 |
| Owner — decision on L-2 (CG-07) | ✅ Option 2 (scheduled CR) | 2026-05-27 | See §9 |
| POS Backend team — §12.1 | ⏳ Pending | — | — |
| CRM team — §12.2 | ⏳ Pending | — | — |
| QA / Ops — §12.4 | ⏳ Pending live regression | — | See §13 |

---

## 15. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed by this handoff | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Owner decisions on CG-04, CG-07 recorded verbatim (Option 2 / Option 2) | CONFIRMED |
| 7 | Live regression evidence section reserved at §13 — to be appended | CONFIRMED |
| 8 | Code is treated as final truth for §2 / §4 / §5 / §8 / §11 | CONFIRMED |

---

**End of CR-002 POS-Facing Handoff (Stage 8 — DRAFT). Awaiting §13 evidence to flip to FINAL.**
