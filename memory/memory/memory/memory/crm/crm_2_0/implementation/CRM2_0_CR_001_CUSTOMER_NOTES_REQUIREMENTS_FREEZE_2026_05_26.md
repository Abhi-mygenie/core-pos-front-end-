# CRM 2.0 — CR-001 Customer Notes — Requirements Freeze (Planning Handoff)

**Date:** 2026-05-26
**Sprint:** CRM 2.0
**CR ID:** `CR_001`
**Topic:** `CUSTOMER_NOTES_SUGGESTION`
**Type:** `REQUIREMENTS_FREEZE`
**Stage:** 4 of 8 (per CRM 2.0 README §4 workflow)
**Predecessor docs:**
- `discovery/CRM2_0_CR_001_CUSTOMER_NOTES_SUGGESTION_DISCOVERY_2026_05_26.md`
- `contract/CRM2_0_CR_001_CUSTOMER_NOTES_CONTRACT_FREEZE_2026_05_26.md`

> **Audience.** This is the baton handed to the **planning agent**. After reading this doc the planning agent produces `implementation/CRM2_0_CR_001_CUSTOMER_NOTES_IMPL_PLAN_<date>.md` and **stops** (does not write code).

---

## 1. What this CR delivers (1-line)

> **Replace the mocked `getCustomerPreferences()` lookup in `ItemNotesModal` and `OrderNotesModal` with real CRM calls (`GET /pos/customers/{id}/notes/items|orders`), so cashiers see a customer's actual past notes — sorted by frequency, with count + relative-time suffix — and can one-click add them to the current order.**

---

## 2. Why now (1-line)

> The UI placeholders ("Customer Preferences" / "Customer History" sections) already exist and already receive `customerId` from `OrderEntry.jsx`. Only the data source is mocked. Real CRM endpoints are live (HTTP 200, ~350 ms warm). This CR is a small, low-risk, additive integration.

---

## 3. Scope — IN

| # | Item |
|---|---|
| IN-1 | Wire `GET /pos/customers/{id}/notes/items` into `ItemNotesModal.jsx` |
| IN-2 | Wire `GET /pos/customers/{id}/notes/orders` into `OrderNotesModal.jsx` |
| IN-3 | Add `customerNotesService.js` + `customerNotesTransform.js` per contract §10-11 |
| IN-4 | Add 2 endpoint constants in `api/constants.js` |
| IN-5 | Modify mock `getCustomerPreferences()` OR refactor modals to call service directly (planning agent picks the cleaner of the two paths) |
| IN-6 | Filter item-notes by `item.name` (case-insensitive trim) per contract §8.4 |
| IN-7 | Sort by `count` DESC, ties by timestamp DESC per contract §8.2 |
| IN-8 | Render top 5 + "Show more ▾" expand button per contract §8.3 |
| IN-9 | Render `<note>  (<count>× · <relative>)` per contract §8.6 |
| IN-10 | Loading state (skeleton placeholder) while fetch in flight |
| IN-11 | Silent hide on AUTH_FAIL / NETWORK_FAIL / NOT_FOUND / OK_EMPTY (contract §5.4) |
| IN-12 | `console.warn` on item_name mismatch (contract §8.4 + Owner Q3=C) |

## 4. Scope — OUT

| # | Item | Reason |
|---|---|---|
| OUT-1 | Red allergy variant (`isAlert: true`) rendering | Owner Q2=A — keep code path unused; CRM may ship `is_alert` flag in `_v2` |
| OUT-2 | Keyword-based client-side allergy detection | Owner Q2=A — no false-positive risk for v1 |
| OUT-3 | `food_id`-based matching | Owner Q3=C — `_v2` once CRM team adds it |
| OUT-4 | Retry on network failure | Contract §7.2 — non-blocking feature |
| OUT-5 | Eager fetch on customer-attach | Owner Q4a=A — per-modal-open only |
| OUT-6 | Recency filter (e.g. last-90-days) | Owner Q4c=C — show all |
| OUT-7 | Per-line discount allocation, multi-restaurant aggregation, note creation via POST | Out of this CR; potentially `_v2` |
| OUT-8 | Auto-trim / normalize `note` text | Contract §8.1 — cashier intent preserved as-is |
| OUT-9 | Changes to outbound `food_level_notes` / `order_note` payload | This CR is read-only on the order-commit path |
| OUT-10 | POS Backend changes | Endpoint is on CRM host only — POS Backend has no role |
| OUT-11 | CRM changes | This CR consumes existing endpoints unchanged |
| OUT-12 | Any change to `BUG108_FLAGS.js` | Not BUG-108 work |
| OUT-13 | Removing / archiving the `mockCustomerPreferences` constant from `notePresets.js` | Planning agent may keep it as fallback / decide; not required |

---

## 5. Acceptance Criteria (frozen)

| AC | Criterion | Verifier |
|---|---|---|
| **AC-01** | When a registered customer (`customer.id` truthy) is on the active order AND the cashier opens `ItemNotesModal` for any cart line, POS fires exactly **one** `GET /pos/customers/{customer.id}/notes/items` request | Network panel |
| **AC-02** | When the same conditions hold and cashier opens `OrderNotesModal`, POS fires exactly **one** `GET /pos/customers/{customer.id}/notes/orders` request | Network panel |
| **AC-03** | Walk-in / guest order (`customer == null` or `customer.id` falsy) → **NO** fetch fired; modals show "No customer linked. Add customer to see preferences." | Network panel + UI |
| **AC-04** | Closing and re-opening the same modal in the same session re-fires the fetch (per-event, not per-session cache) — Owner Q4a=A | Network panel |
| **AC-05** | For item modal: only entries whose `item_name.trim().toLowerCase() === cartItem.name.trim().toLowerCase()` are rendered. All other entries are ignored. If no match → empty state. | Manual smoke on `shadab` customer with cart item "Ras Royale Kunafa" (preprod data) |
| **AC-06** | Preference rows are sorted by `count` DESC, ties by `last_ordered`/`last_used` DESC, ties by `note` ASC | Inspect render order |
| **AC-07** | At most 5 rows visible by default; if more exist a "Show more ▾" button reveals the rest | UI |
| **AC-08** | Each row shows `<note>  (<count>× · <relative time>)` (e.g. `"packing  (1× · just now)"`) | UI smoke on populated customer |
| **AC-09** | Clicking a preference row APPENDS it to "Added" as a green chip with `type: "preference"` (pre-existing behaviour — confirm not regressed) | UI |
| **AC-10** | A clicked preference can be removed via the X on its green chip (pre-existing behaviour — confirm not regressed) | UI |
| **AC-11** | The same preference can be added multiple times (per click → new chip) — pre-existing behaviour | UI |
| **AC-12** | When fetch is in flight, a loading skeleton or "Loading…" placeholder is shown in the preferences section (NOT the empty state, NOT a spinner overlay) | UI |
| **AC-13** | Fetch timeout >= 3000 ms → POS aborts and renders empty state. `console.warn` emitted. | DevTools throttle to slow-3g |
| **AC-14** | HTTP 401 → empty state + `console.warn('customerNotes: auth fail')`. No toast. No redirect. | Manipulate token |
| **AC-15** | HTTP 5xx → empty state + `console.warn('customerNotes: server error', err)`. No toast. | Force via CRM mock OR observe natural failure |
| **AC-16** | `{success: false, message: "Customer not found"}` (HTTP 200) → empty state, NOT an error. No console output. | Test with all-zero UUID |
| **AC-17** | `{success: true, ..., item_notes: []}` (HTTP 200, empty) → empty state. No console output. | Test on `abhishek jain` customer |
| **AC-18** | `item_name` mismatch (CRM has data but no item_name matches current cart line) → empty state + `console.warn('customerNotes: item_name mismatch — CRM had data for [...] but cart item is "..."')` | Open ItemNotesModal for an item the customer has never ordered |
| **AC-19** | `isAlert` is always `false` for CRM-returned rows; the red AlertTriangle path in `ItemNotesModal.jsx` is never taken from CRM data | Code inspection |
| **AC-20** | No new feature flag introduced (no entries in `BUG108_FLAGS.js`); feature is unconditionally on when `customer.id` truthy | Code inspection |
| **AC-21** | No regression to outbound `food_level_notes` / `order_note` on order commit (Flow 1/2/3/4) | Capture commit payload before + after |
| **AC-22** | Build clean (`yarn build`); no new ESLint errors (existing pre-existing `OrderEntry.jsx:1301` warning may remain) | CI |
| **AC-23** | Token used for CRM call MUST be the active `crmToken` (same as `/pos/coupons/*`) — verified via Authorization or X-API-Key header | Network panel |

---

## 6. Definition of Done

A unit of work is "done" when:

- [ ] All 23 ACs pass (verified by QA agent, not by implementation agent)
- [ ] Build passes (`cd /app/frontend && CI=false yarn build`)
- [ ] No regression to `food_level_notes` / `order_note` commit payload
- [ ] One live smoke pass on preprod restaurant 689 with customer `shadab` (item notes) + the Owner-placed test order's customer (order notes — pending OF-01)
- [ ] QA report produced (`qa/CRM2_0_CR_001_*_QA_REPORT_*.md`)
- [ ] Open-gaps register updated (`open_gaps/CRM2_0_CR_001_*_OPEN_GAPS_*.md`)
- [ ] Reconciliation produced (`reconciliation/CRM2_0_CR_001_*_RECONCILIATION_*.md`)
- [ ] POS-facing handoff doc produced (`handoff/CRM2_0_CR_001_*_HANDOFF_TO_POS_*.md`) — NOT required for this CR if no POS Backend / external consumer is affected (planning agent confirms)

---

## 7. Test Matrix (frozen — for QA agent at stage 7)

| # | Scenario | Customer | Expected outcome |
|---|---|---|---|
| T-01 | Item modal on populated customer + matching cart item | `shadab` UUID `04c8a911-...` + cart contains "Ras Royale Kunafa" | 1 row: `packing  (1× · X days ago)` |
| T-02 | Item modal on populated customer + non-matching cart item | `shadab` + cart contains "Pista Dream Salankatia" | Empty state + `console.warn` for mismatch |
| T-03 | Item modal on empty customer | `abhishek jain` | Empty state, no warn |
| T-04 | Item modal on walk-in / no customer | n/a | Empty state ("No customer linked"), no fetch fired |
| T-05 | Order modal on customer with order notes | Owner-supplied (pending OF-01) | Top-5 rows sorted by `count` DESC |
| T-06 | Order modal on empty customer | `abhishek jain` | Empty state, no warn |
| T-07 | Order modal on walk-in / no customer | n/a | Empty state, no fetch fired |
| T-08 | Click preference row → green chip added | any populated customer | Chip in "Added" section with `type: "preference"` |
| T-09 | Click X on green chip → removed | any | Removed from "Added" |
| T-10 | Same preference clicked twice → 2 chips | any | Both chips present |
| T-11 | Network throttled to slow-3g, fetch > 3000 ms | any | Empty state, console.warn `customerNotes: timeout` |
| T-12 | Token invalid → HTTP 401 | any | Empty state, console.warn `customerNotes: auth fail` |
| T-13 | Customer UUID malformed → `success:false, message: "Customer not found"` | use UUID `not-a-uuid` | Empty state, no console output |
| T-14 | Re-open same modal twice → 2 fetches | populated customer | 2 GETs in network panel (per-event, not cached) |
| T-15 | Top-5 cap with overflow | seed 6+ notes (test data may not exist — defer to E2E later) | "Show more ▾" button visible |
| T-16 | Relative time formats | varied `last_ordered` ages | `just now`, `X hours ago`, `X days ago`, `X weeks ago`, `X months ago`, `X years ago` |
| T-17 | Sort stability — 2 notes same count | seed manually or accept whatever live data shows | Tied by `last_ordered` DESC |
| T-18 | Save modal → commit order → next session shows the saved note in suggestions | Owner-placed test order | New note appears (CRM is the source of truth; this CR doesn't write notes — it consumes the same field POS already commits) |
| T-19 | Regression: outbound `food_level_notes` unchanged for orders without customer | walk-in | Payload identical to pre-CR baseline |
| T-20 | Regression: outbound `order_note` unchanged for orders with customer | populated | Payload identical to pre-CR baseline |
| T-21 | Regression: walk-in modal still works (no fetch attempted, no errors) | walk-in | Modal opens, presets visible, save works |
| T-22 | Regression: quick-notes chips still toggle correctly | any | No regression |
| T-23 | Regression: custom note `+` button still works | any | Custom note added to "Added" |
| T-24 | Regression: legacy `item.notes` string (vs new `itemNotes[]` array) still hydrates as `custom-legacy` chip on modal open | order from old session | Chip with id `custom-legacy` visible |
| T-25 | Build green | n/a | Exit 0 |
| T-26 | No new ESLint errors introduced | n/a | Diff vs baseline |
| T-27 | All testid hooks survive: `item-notes-modal`, `order-notes-modal` | n/a | Verified |

---

## 8. Touch-Point Summary (planning agent confirms / finalizes)

| File | Action | Rough size |
|---|---|---|
| `src/api/constants.js` | +2 lines (endpoint constants) | trivial |
| `src/api/services/customerNotesService.js` | NEW (~60 lines) | small |
| `src/api/transforms/customerNotesTransform.js` | NEW (~80 lines, incl. relative-time helper) | small |
| `src/data/notePresets.js` | MODIFY `getCustomerPreferences()` OR planning agent picks a different injection point | small |
| `src/components/order-entry/ItemNotesModal.jsx` | MODIFY (async fetch, loading, cap, relative-time row format) | medium (~+30/-10 lines) |
| `src/components/order-entry/OrderNotesModal.jsx` | MODIFY (same as Item modal) | medium |
| `src/data/index.js` | maybe touch barrel | trivial |
| `src/components/order-entry/OrderEntry.jsx` | **NO CHANGE** — already passes `customerId` correctly (verified at L2290 + L2313) | n/a |

**Estimated effort:** 4-6 dev hours + 1 QA cycle. **No external dependencies.**

---

## 9. Frozen Owner Decisions (carried from contract §13)

| # | Decision | Value |
|---|---|---|
| Q1 | Row enrichment | `<note>  (count× · relative)` |
| Q2 | Alert variant | All gray; red path unused |
| Q3 | Item match key | `item_name` case-insensitive; warn on miss |
| Q4a | Fetch timing | On modal open only |
| Q4b | Display cap | Top 5 + "Show more" |
| Q4c | Sort + recency | `count` DESC, timestamp DESC; no recency filter |
| Q5a | Scoping | Per-restaurant (token-scoped) |
| Q5b | Test seed | Owner places manually |

---

## 10. Risk Register (planning agent extends)

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | `item_name` mismatch hides historic notes after a menu rename | M | L | `console.warn` (AC-18); CRM `_v2` adds `food_id` |
| R-02 | CRM endpoint slowness on staging-15-style N+1 | L | M | 3s hard timeout + silent hide (AC-13) |
| R-03 | CRM aggregates notes globally across restaurants (privacy / scope violation) | L | M | OF-04 — QA verifies at stage 7; if confirmed, `_v2` adds scoping param |
| R-04 | Concurrent modal opens fire duplicate requests (cashier rapid toggling) | L | L | Acceptable — endpoint is read-only + cheap; no dedup in v1 |
| R-05 | Loading skeleton flicker on fast networks (~50 ms) | L | L | Use 100-150 ms render delay before showing skeleton (planning agent decides) |
| R-06 | Regression to existing modal save behaviour | L | H | T-19 / T-20 / T-21 / T-22 / T-23 / T-24 regression tests |
| R-07 | `notePresets.js#getCustomerPreferences()` is consumed by both modals — sync→async change must keep both callers happy | L | M | Planning agent picks: (a) keep function name, return Promise; OR (b) replace with React hook; OR (c) inline service call inside each modal's useEffect |

---

## 11. Rollback / Kill Switch

- **No new feature flag** (Owner-implicit, see AC-20).
- Rollback strategy: revert the implementation commit. The mock `getCustomerPreferences()` lookup never matched real UUIDs anyway, so reverting brings the UI back to the "always empty state for real customers" baseline — non-disruptive.
- **No data migration.** This is a pure consumer CR.

---

## 12. Stage Handoff to Planning Agent

The planning agent SHOULD now:

1. Read this requirements freeze + the contract freeze + the discovery doc (in that order).
2. Decide the cleaner of the two `notePresets.js` migration paths (sync→async wrapper vs replace caller).
3. Decide the loading-state implementation (skeleton component vs simple text vs delayed skeleton).
4. Produce **one** doc:
   ```
   /app/memory/crm/crm_2_0/implementation/CRM2_0_CR_001_CUSTOMER_NOTES_IMPL_PLAN_<date>.md
   ```
   With at minimum:
   - File-by-file diff plan (touch-point map fleshed out with actual code structure)
   - Per-file change kind (NEW vs MODIFY vs DELETE)
   - Phasing if any (e.g. service first, then modals)
   - Rollback verified
   - Risk extension (R-01 … R-N additions if found)
   - Sign-off checklist for implementation agent

5. STOP. Do not write code. Hand off to implementation agent (stage 6).

---

## 13. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | All 23 acceptance criteria derived from contract + Owner decisions | ✅ |
| 2 | All 27 test scenarios mapped to acceptance criteria | ✅ |
| 3 | Scope IN / OUT explicit and exhaustive | ✅ |
| 4 | No code written | ✅ |
| 5 | No impl plan written (planning agent owns that — stage 5) | ✅ |
| 6 | No POS Frontend / Backend / CRM changes | ✅ |
| 7 | `/app/memory/final/` untouched | ✅ |
| 8 | `/app/memory/crm/crm_1_0/` untouched | ✅ |
| 9 | Sprint workflow rules respected (stage 4 of 8) | ✅ |

---

## 14. Document Linkages

| Doc | Path |
|---|---|
| Sprint scaffold | `/app/memory/crm/crm_2_0/README.md` |
| Discovery (stage 1) | `discovery/CRM2_0_CR_001_CUSTOMER_NOTES_SUGGESTION_DISCOVERY_2026_05_26.md` |
| Contract freeze (stage 3) | `contract/CRM2_0_CR_001_CUSTOMER_NOTES_CONTRACT_FREEZE_2026_05_26.md` |
| **Requirements freeze (stage 4) — THIS DOC** | `implementation/CRM2_0_CR_001_CUSTOMER_NOTES_REQUIREMENTS_FREEZE_2026_05_26.md` |
| Impl plan (stage 5) — TO BE WRITTEN BY PLANNING AGENT | `implementation/CRM2_0_CR_001_CUSTOMER_NOTES_IMPL_PLAN_<date>.md` |
| Impl report (stage 6) — TO BE WRITTEN BY IMPL AGENT | `implementation/CRM2_0_CR_001_CUSTOMER_NOTES_IMPL_REPORT_<date>.md` |
| QA (stage 7) | `qa/CRM2_0_CR_001_CUSTOMER_NOTES_QA_REPORT_<date>.md` |
| Reconciliation (stage 7) | `reconciliation/CRM2_0_CR_001_CUSTOMER_NOTES_RECONCILIATION_<date>.md` |
| Open gaps (stage 7) | `open_gaps/CRM2_0_CR_001_CUSTOMER_NOTES_OPEN_GAPS_<date>.md` |

---

**End of CRM 2.0 CR-001 Customer Notes Requirements Freeze. Stage 4 complete. Handoff to planning agent.**
