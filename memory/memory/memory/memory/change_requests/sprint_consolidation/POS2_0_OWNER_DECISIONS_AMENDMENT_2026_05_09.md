# POS2.0 Sprint — Owner Decisions Amendment

> **Date:** 2026-05-09 (post-consolidation)
> **Type:** Documentation only — captures owner decisions that arrived after `POS2_0_SPRINT_CONSOLIDATION_REPORT_2026_05_09.md`. NO code, NO `/app/memory/final/*` edits.
> **Anchor:** `change_requests/sprint_consolidation/POS2_0_SPRINT_CONSOLIDATION_REPORT_2026_05_09.md` §3 + §11 + §13

This amendment supersedes the **blocker** column for the items listed below. Owner answers shown verbatim.

---

## Decision 1 — POS2-002 OQ-1 (R-POPOUT scope)

| Field | Value |
|---|---|
| Question | Does R-POPOUT cover (a) web delivery YTC only, (b) all web YTC including takeaway / dineIn QR-menu, or (c) only delivery web orders for v1 with takeaway/dineIn deferred? |
| Owner decision | **(b) — all web YTC orders** (delivery + takeaway + dineIn QR-menu) |
| Effect | Phase 4 R-POPOUT scope locked at "all web YTC". OQ-1 closed. |
| Remaining work | n/a — implementation gate only |

---

## Decision 2 — POS2-002 OQ-3 (filter pill / badge)

| Field | Value |
|---|---|
| Question | Phase 3 dashboard web-order filter — pill (R-FILTER-2), badge (R-FILTER-8), or both? |
| Owner decision | **Deferred — to be discussed with UX / design agent.** |
| Effect | Phase 3 implementation pending design output. Phase 1 / 2 / 4 not gated on this. |
| Recommended next step | Schedule a UX session; until then, Phase 3 stays as `needs_design_input`. |

---

## Decision 3 — POS2-002 OQ-6 (confirm-order status code for web orders)

| Field | Value |
|---|---|
| Question (original framing) | Should `confirmOrder`'s existing payload (`order_status: 'paid'`) work for web orders, or does backend need a different status for web-acceptance? |
| Owner correction (2026-05-09) | **YTC is orthogonal to payment state.** YTC can be prepaid or postpaid on any channel — even a dineIn customer who scans and orders may pay later, but the order still arrives at POS for confirmation. |
| Code-walk verification (2026-05-09) | `confirmOrder()` already sends a per-tenant `defaultOrderStatus` (sourced from profile field `def_ord_status` → `F_ORDER_STATUS_API` mapping → typically `'cooking'` for kitchen routing, NOT `'paid'`). The `'paid'` literal in `orderService.js:63` is only a JS default-arg fallback. The real call site at `DashboardPage.jsx:1119` overrides it with `defaultOrderStatus` from `RestaurantContext`. **Postpaid YTC is therefore already a working flow today** (in-house POS-punched dineIn YTC + Collect Bill later). |
| Owner decision | **Pending — corrected framing below requires backend confirmation, not a fresh owner pick.** |
| Effect | OQ-6 narrowed from "FE branching needed" to "BE must confirm `order_from`-aware routing on confirm". Most likely closure: (a) existing payload works as-is, zero FE work for confirm-payload. |
| Sub-questions for backend | **BE-Q-NEW-1:** When `confirmOrder` fires on an order with persisted `order_from = 'web'`, does the backend correctly route emissions / FCM / audit using the persisted `order_from`? **BE-Q-NEW-2:** If tenant's `def_ord_status` is `1` (cooking), does backend skip any web-prepaid short-circuit and treat web-postpaid YTC the same as in-house postpaid YTC? |
| If BE confirms both | OQ-6 closes at (a). Phase 4 R-POPOUT's Confirm button reuses the existing `confirmOrder(...)` flow without payload changes. Only the auto-pop-out UI behaviour is net-new. |

### Why the original framing was wrong
- I anchored on the `orderStatus = 'paid'` default in the `confirmOrder` signature, which is a JS fallback that never fires in practice. The real call passes per-tenant `def_ord_status`.
- I implicitly assumed YTC = paid and unpaid YTC = web-only. The owner correctly pointed out YTC is orthogonal: any channel × any payment-type can be YTC.
- Postpaid YTC works today (in-house dineIn). Scan & Order web YTC is the same operator-confirmation lifecycle with a different `order_from`.

---

## Decision 4 — POS2-002 backend echo of `order_from`

| Field | Value |
|---|---|
| Question | Does the dashboard socket (`new-order` / `order-data`) echo `order_from` for tenant-routed web orders? |
| Owner decision | **Yes — they do.** |
| Effect | Backend confirmation closed. FE Phase 1 (surface `order_from` in the order model) becomes implementable as soon as OQ-6 lands. |

### POS2-002 — net residual blockers (after Decisions 1-4)
- **OQ-3** → UX/design agent (Phase 3 only)
- **OQ-6** → owner answer required (Phase 4 R-POPOUT-5 wire shape)
- Phases 1 + 2 are unblocked once OQ-6 lands. Phase 4 also requires OQ-6. Phase 3 requires UX.

---

## Decision 5 — POS2-001 (Delivery charge / GST / web delivery lock)

| Field | Value |
|---|---|
| Question | Is POS2-001 still an open ask, or absorbed by predecessor CRs (CR-013 / CR-008 D1-Cap / CR-008 D1-Gate)? |
| Owner decision | **(a) — close as superseded.** |
| Effect | POS2-001 is **CLOSED**. No further FE work. |
| Doc action | Mark POS2-001 as `closed_superseded` in any future tracker; consolidation report §3 row 1 updated by reference (this amendment). |

---

## Decision 6 — POS2-003-REOPEN-B (place-order v1 → v2 endpoint revert)

| Field | Value |
|---|---|
| Question (BC-5) | Was the v1 choice in POS2-003 mechanical-only or behavioural? |
| Owner decision | **Will provide the v2 endpoint paths to be replaced.** Implicit: BC-5 closes — owner approves the revert (no behavioural reason on file for keeping v1). |
| Question (BC-6) | Does backend confirm v1 / v2 are behaviourally identical? |
| Owner decision | Implicitly accepted by approving the revert; owner is comfortable proceeding without an explicit BE wire-diff. **Recommend a one-shot smoke (place a single test order, verify socket + FCM + audit log emit on v2) post-revert.** |
| Effect | REOPEN-B status moves from `parked` → **`ready_for_implementation_pending_owner_endpoint_list`**. |
| What's still needed | Owner sends the exact v2 endpoint constants to replace. Expected scope: at minimum `PLACE_ORDER` (v1 → v2); possibly also `PROFILE` if owner wants the profile endpoint flipped per the impact analysis §A note. |

### Implementation footprint when paths land
- **Shipped 2026-05-09.** 1-line change at `frontend/src/api/constants.js:41` (PLACE_ORDER v1 → v2). PROFILE not touched (owner: *"no profile end point is fine"*).
- 2 endpoint-sanity test assertions updated in `frontend/src/__tests__/integration/POS2_003_REOPEN_A_wire.test.js`.
- Full unit suite (291/291) + production build clean.
- Live one-order smoke recommended (BC-6 surrogate) on the running app — non-blocking.

---

## Decision 7 — POS2-008 Phase 2 (backend-owned tone delivery)

| Field | Value |
|---|---|
| Question | Approve queueing the Phase 2 contract ask to the backend team? |
| Owner decision | **Yes — note for backend.** |
| Effect | The backend ask is now formally requested. POS2-008 remains parked at `planning_complete_needs_backend_confirmation`; no FE action yet. |
| What's needed (next) | Backend confirms BE-T-1 (canonical tone token contract) + BE-T-2 (rollout plan) → FE picks up the predocumented Phase 1 cleanup (delete `toneMapper.js`, `restaurantRef.js`, override block, `useEffect` ref-bridge). |

### Suggested wording for the backend ask
> "Phase 2 of POS2-007 confirm-order tone — please confirm:
> 1. Where does the canonical tone token live? In `/profile` (per-restaurant) and/or in the YTC socket / FCM push payload (per-event)?
> 2. Tone token vocabulary (e.g. `default | silent | buzzer | doorbell | <new>`) and aggregator special-case behaviour.
> 3. Rollout plan — single deploy across all tenants vs per-tenant flag.
> Goal: FE removes the Phase 1 override layer (`toneMapper.js`, `NotificationContext.jsx:115-126`, `RestaurantContext.jsx:18-21`) the moment Phase 2 ships."

---

## Decision 8 — POS2-006-PG-FILTER-DROPDOWN (scope FINALISED 2026-05-09)

> **This decision supersedes both the earlier "Paid-only" proposal AND the intermediate "Paid + Hold + Cancelled" expansion.** Owner has simplified the scope to a single global dropdown.

### 8.1 Owner decision verbatim (2026-05-09 final)
> 1. Replace the current All/PG checkbox UI with a dropdown.
> 2. Dropdown options: **ALL** · **Non-PG** · **PG**
> 3. Dropdown should be visible **across all report tabs**.
> 4. Because the dropdown is visible across all tabs, **do not reset it when switching tabs**.
> 5. Selected PG filter should persist while navigating between report tabs.
> 6. Default value remains **ALL**.
> 7. Non-PG branch must be enabled in filtering logic.
> 8. Existing report filters should continue to work with the PG dropdown.
> 9. Hide dropdown for restaurants without PG **only if** backend/profile provides a reliable PG-enabled flag. **If no reliable flag exists, keep dropdown visible** rather than using unreliable order-data inference.

### 8.2 Locked scope summary

| Aspect | Today | Final locked target |
|---|---|---|
| **Visibility (which tabs)** | All 9 tabs (FilterBar renders unconditionally) | **Same — all tabs** ✅ no change to visibility surface |
| **UI control** | 2-checkbox toggle (☐ All  ☐ PG) | **Dropdown / Select** with 3 options: `ALL` · `Non-PG` · `PG` |
| **Tri-state status** | Schema supports 3, UI exposes 2 (`'nonGateway'` retired in CR-001 Phase 2) | UI exposes all 3; `'nonGateway'` re-enabled in filter predicate |
| **Tab-change reset** | No reset today | **No reset** — explicitly locked at item 4 |
| **Cross-tab persistence** | (effectively persists today) | **Persists** ✅ explicitly locked at item 5 |
| **Default state** | All checked = `paymentGateway: null` | `ALL` selected = `paymentGateway: null` ✅ same |
| **Tenant without PG → hide dropdown** | Filter visible | **Conditional on BE flag.** If `/profile` exposes a reliable PG-enabled flag → hide. **If not → keep visible** (per item 9) |

### 8.3 Backend PG-flag availability — checked 2026-05-09

| Field | Result |
|---|---|
| `is_razorpay` / `isRazorpay` mapped from `/profile` | **Not present** in `profileTransform.js` today |
| `payment_gateway` / `pg_active` / `pg_enabled` | **Not present** |
| Any equivalent PG-enable flag | **Not present** |

**Per item 9, the dropdown stays visible for all tenants** in the v1 implementation. If backend later adds a reliable flag, a small follow-up CR can wire the conditional hide.

### 8.4 Revised implementation footprint

The simplification (no tab-visibility predicate, no tab-reset logic, no PG-flag mapping) drops the LOC estimate substantially.

| File | Change | LOC delta |
|---|---|---|
| `components/reports/FilterBar.jsx` (~L242-303) | Replace 2-checkbox block with single `<Select>` from shadcn (`/components/ui/select.tsx`); 3 options (`ALL` / `Non-PG` / `PG`); preserve `data-testid="filter-payment-gateway"` + sub-testids | **-50 / +25** |
| `components/reports/OrderTable.jsx` (~L109) | Update `pgFilterActive` predicate to handle `'nonGateway'` branch; column visibility (`pgColumnsWhenActive` at L111) only renders for `'gateway'` (Non-PG = no PG columns) | +10 |
| `components/reports/FilterTags.jsx` (~L34-53) | Add chip label for `'nonGateway'` selection ("Non-Gateway" / "Non-PG" — match locked label exactly) | +5 |
| `pages/AllOrdersReportPage.jsx` | **No change** — items 4 + 5 explicitly forbid tab-reset; cross-tab persistence is the existing behaviour | 0 |
| `api/transforms/profileTransform.js` | **No change** in v1 — no BE flag exists; per item 9, dropdown stays visible. (Future: when BE ships flag, +3 LOC here.) | 0 |
| `contexts/RestaurantContext.jsx` | **No change** in v1 (same reason) | 0 |
| Tests — new file `__tests__/components/reports/PGFilterDropdown.test.jsx` (or extend existing `FilterBar.test.jsx`) | 6-8 cases: 3-option rendering, default = ALL, switching ALL → Non-PG → PG, predicate filters orders correctly for each value, FilterTags chip rendering for `'nonGateway'`, persistence across tab change (existing behaviour preserved) | +60-80 |
| **Total** | | **~50-80 LOC + tests** |

This is half the size of the previous (mid-discussion) estimate and ~12× the original "6-line" estimate. Net effect: small, contained, single-session implementation.

### 8.5 Status update

| Aspect | Before this lock | After this lock (final) |
|---|---|---|
| Title | `POS2-006-PG-PAID-ONLY` (then mid-renamed `POS2-006-PG-FILTER-DROPDOWN`) | **`POS2-006-PG-FILTER-DROPDOWN`** (final) |
| Status | `proposed_scope_locked_ready_for_impact_analysis` (with 5 owner Qs + UX session pending) | **`scope_locked_ready_for_implementation`** (no UX session needed; no owner Qs pending; no backend dependency) |
| Effort | ~150-180 LOC + tests | **~50-80 LOC + tests** (single agent session) |
| Backend dependency | needed `is_razorpay` flag | **none** (item 9 lets us defer; conditional hide becomes a future micro-CR if BE later ships flag) |
| UX dependency | session needed for control style + zero-state | **none** — owner specced "dropdown" + always-visible explicitly |
| Owner gate remaining | PG-Q1..Q5 | **none** — all 9 items locked verbatim |

### 8.6 Immediate next-agent instructions

1. **Skip impact analysis** — scope is locked tightly enough that the implementation summary alone is sufficient documentation. (Optional: a short ~1-page impact-analysis stub for traceability if the playbook requires it.)
2. **No UX session required.** Use shadcn `<Select>` from `/app/frontend/src/components/ui/select.tsx`. Match the visual treatment of the existing `<Select>` controls in `FilterBar.jsx` (Channel filter at L223-230, Platform filter at L233-241).
3. **Implement in one pass:** FilterBar rewrite → OrderTable predicate → FilterTags chip → tests.
4. **Validation:** unit suite green, production build clean, FilterBar rendering verified via screenshot on the running app.
5. **Live smoke (non-blocking):** verify dropdown renders correctly on Paid / Hold / Cancelled / Running / All Orders tabs; verify `Non-PG` filter shows orders without PG payments; verify `PG` filter shows orders with PG payments; verify selection persists across tab switches.

---

## Updated sprint dashboard (delta only)

| Item | Old status | New status (post-amendment) |
|---|---|---|
| **POS2-001** | not started / no on-disk doc | **`closed_superseded`** by CR-013 + CR-008 D1-Cap / D1-Gate |
| **POS2-002 OQ-1** | open | **closed: scope = (b) all web YTC** |
| **POS2-002 OQ-3** | open | **deferred to UX/design agent** |
| **POS2-002 OQ-6** | open | **narrowed: payload likely works as-is; needs BE-Q-NEW-1 + BE-Q-NEW-2** (backend confirms `order_from`-aware routing) |
| **POS2-002 BE field echo** | open | **closed: `yes they do`** |
| **POS2-003-REOPEN-B** | parked / BC-5 + BC-6 open | **`implementation_complete_ready_for_QA`** (place-order flipped 2026-05-09; PROFILE stays as-is per owner) |
| **POS2-008 Phase 2** | parked / BE bandwidth | parked / BE asked (formal note queued) |
| **POS2-006-PG-PAID-ONLY** | proposed / 6-line CR | **renamed `POS2-006-PG-FILTER-DROPDOWN`** / **scope FINALISED 2026-05-09** / `scope_locked_ready_for_implementation` / ~50-80 LOC / single-pass implementation |

---

## Net residual gates (across the 4 items in this amendment)

| Gate | Owner | Effect |
|---|---|---|
| **POS2-002 OQ-3** | UX/design agent session | unblocks Phase 3 only |
| **POS2-002 OQ-6** | backend | unblocks Phases 1 + 2 + 4 (most likely zero FE payload change once BE confirms) |
| **POS2-003-REOPEN-B paths** | ✅ closed 2026-05-09 — owner sent `place-order` v2 path + clarified PROFILE stays | shipped |
| **POS2-008 backend reply** | backend team reply on BE-T-1 / BE-T-2 | unblocks FE Phase 1 cleanup |
| **POS2-006-PG-FILTER-DROPDOWN UX session** | ✅ closed 2026-05-09 — owner specced full behaviour verbatim (9 items locked); no UX session required; no PG-Q1..Q5 pending; no BE dependency | ready for single-pass implementation (~50-80 LOC) |

All gates are owner / UX / backend driven. No FE-internal questions remain on these items.

---

## Recommended next agent invocations (no immediate FE work yet)

1. **POS2-006-PG-FILTER-DROPDOWN implementation** — scope is locked; no UX session, no owner Qs, no BE dependency. Single-pass implementation: FilterBar dropdown → OrderTable tri-state predicate → FilterTags chip → unit tests. Skip the impact-analysis doc unless playbook requires it (a short stub is fine for traceability).
2. **POS2-003-REOPEN-B implementation** — wait for owner endpoint list, then 1-line revert + endpoint-sanity test update + 1-order live smoke.
3. **POS2-008 Phase 2** — formal backend ask routed; FE on standby.
4. **POS2-002** — Phase 1 / 2 / 4 implementation plan can start the moment OQ-6 lands; Phase 3 plan after UX session.
5. **POS2-001** — close in tracker as `closed_superseded`. No agent action.

---

— End of POS2.0 Sprint Owner Decisions Amendment 2026-05-09 —
