# Reports — Field-Mapping Tracker (single reference)

**Purpose:** one-stop doc for any agent picking up the "reports field mappings" work. Consolidates BE-1 + BE-2 + related frontend workarounds, current status, and the exact wire-in each backend field needs once delivered.

**As of:** 2026-05-01 (P1 / P3 / P4 / P5 shipped on FE — see §8 change log)
**Branch:** `CR-28-april`
**Tenant validated against:** Mantri (`owner@mantri.com`) — preprod
**Last full audit:** 2026-05-01 — live preprod grep (18march tenant) + code grep; see `/app/memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md`

> Rule: if you edit this doc, update the "As of" date. If a field ships or a workaround is retired, move the row out of the "OPEN" bucket and strike it from the table with a ship-date column note.

---

## 1. TL;DR

- Everything on the list is a **backend-side field delivery**, not a frontend bug.
- Frontend is already wired with **defensive fallback resolvers** (`api.X \|\| api.Y \|\| '—'`) for every open item — nothing is UI-broken today.
- 2 of 11 items have landed and been wired. 9 of 11 remain open; 6 are pure "waiting on backend", 3 have active workarounds.
- Biggest unlock = **BE-2** (lodging payment breakdown) — largest single impact on cash reconciliation reporting.

---

## 2. Canonical source docs

| Doc | What's inside | When to open |
|---|---|---|
| [`BE_1_BACKEND_ASKS_CONSOLIDATED.md`](./BE_1_BACKEND_ASKS_CONSOLIDATED.md) | Full BE-1 spec — every ask with acceptance criteria and frontend impact | When backend is scoping / replying to BE-1 items |
| [`BE_2_LODGING_PAYMENT_BREAKDOWN.md`](./BE_2_LODGING_PAYMENT_BREAKDOWN.md) | BE-2 spec — lodging payment breakdown fields | When backend is scoping / replying to BE-2 |
| [`SESSION_TRACKER.md`](./SESSION_TRACKER.md) | Full session context (Buckets A/B/C/D-1 etc), product rules, locked decisions | When you need the "why" behind current formulas |
| [`CR_004_room_orders_pms_view.md`](./CR_004_room_orders_pms_view.md) | Room Orders Report spec | Room-report-specific questions |
| [`CR_001_all_orders_status_derivation.md`](./CR_001_all_orders_status_derivation.md) | Audit report / All Orders status derivation | Audit-report-specific questions |

This tracker references them — it does **not** duplicate them. Treat this doc as the index + status board.

---

## 3. Live-code touchpoints (single pane of glass)

All field fallbacks live in exactly these two files. Grep either for the field name and you'll hit every call-site.

```
frontend/src/api/transforms/reportTransform.js    (transforms API row → UI row)
frontend/src/api/services/reportService.js        (service layer + resolvers + workarounds)
```

Secondary consumers (read-only, rely on the transform output — do not edit for mapping changes):

```
frontend/src/pages/AllOrdersReportPage.jsx
frontend/src/pages/RoomOrdersReportPage.jsx
frontend/src/components/reports/*.jsx
```

---

## 4. Per-field status table (authoritative)

Legend: ✅ closed · 🟡 open with workaround · 🔴 open blocking · 🟠 partial · ➜ merged into another ticket

### 4.1 — Shipped + frontend wired (CLOSED)

| # | Ticket | Backend field | Delivered | Frontend consumer | Status |
|---|---|---|---|---|---|
| 1 | `latest_order_id` | `order_id` on `/get-room-list` | ✅ shipped as `order_id` | `roomListTransform.js` (Bucket B) | ✅ **CLOSED** |
| 2 | BE-1 G2 | Server-side filter for checked-out rooms on `/get-room-list` | ✅ shipped | `reportService.js` relies on it; no client-side guard needed | ✅ **CLOSED** |
| 3 | BE-1 P1 | `waiter_name` on `/order-logs-report` | ✅ shipped (live audit 2026-05-01) | `reportService.js::punchedBy` + transform `waiter` — no fallback | ✅ **CLOSED 2026-05-01** |
| 4 | BE-1 P3 | `cancellation_reason` (canonical key, not `cancel_reason`) on `/order-logs-report` | ✅ shipped (live audit 2026-05-01) | `reportTransform.js::cancellationReason` — no fallback | ✅ **CLOSED 2026-05-01** |
| 5 | BE-1 P4 | `cancel_type` at **item level** (`order_details_table[0].cancel_type`) with literals `Pre-Serve` / `Post-Serve` / `Order` | ✅ shipped (live audit 2026-05-01) | `reportTransform.js::cancellationType` via `normalizeCancelType()`; new Status column in Cancelled tab + CSV export | ✅ **CLOSED 2026-05-01** |
| 6 | BE-1 P5 | `table_name` (canonical key, not `table_no`) on `/order-logs-report` | ✅ shipped (live audit 2026-05-01) | `extractLocation()` + `reportService.js::tableNo` — no fallback | ✅ **CLOSED 2026-05-01** |

### 4.2 — Open items + exact wire-in when delivered

| # | Ticket | Backend ask | Current FE fallback (line ref) | 1-liner wire-in when BE ships | LOC | Status |
|---|---|---|---|---|---|---|
| 3 | BE-1 G1 | `is_room_settled` / `room_settled_at` on `/order-logs-report` `transferToRoom` rows | `getActiveSrmIds()` walks rooms + folios per Audit refresh (`reportService.js:349`) | Replace the walk with `if (api.is_room_settled) status='paid'` inside the SRM row transform; delete `getActiveSrmIds()` + its sentinel handling | ~5 | 🟡 **OPEN — workaround** (was withdrawn; now re-eligible) |
| 4 | BE-1 G3 | Refresh `associated_order_list[i].payment_status` post-checkout | Optimistic-clear Set in Bucket C with 1.5s `setTimeout` (retries through next `/get-single-order-new`) | Trust `associated_order_list[i].payment_status === 'paid'` directly; drop the optimistic Set + timeout | ~10 | 🟠 **OPEN — partial** (fields come back `null`) |
| 5 | BE-1 P1 | `waiter_name` on `/order-logs-report` | `api.waiter_name \|\| Employee #<id> \|\| '—'` (`reportService.js:723-724`, `reportTransform.js:160/195/278/385`) | Remove the `Employee #<id>` + `'—'` fallbacks; keep `waiter_name` as authoritative | ~1 | 🟡 **OPEN — placeholder shown** |
| 6 | BE-1 P2 | `*_by_name` actioned-by fields (`payment_collected_by_name`, `cancel_by_name`, `merge_by_name`, `bill_collected_by_name`, …) | `resolveName()` fallback chain across every plausible key (`reportService.js:743-766`) | Keep the chain as defence-in-depth; actual change = acceptance-test against real BE response and remove unused alternates | ~1 | 🟡 **OPEN — placeholder shown** |
| 7 | BE-1 P3 | `cancel_reason` on RM/SRM rows | `api.cancel_reason \|\| api.cancellation_reason \|\| '—'` (`reportTransform.js:216, 404`) | Trust `cancel_reason` directly once BE confirms the key name | ~1 | 🟡 **OPEN — placeholder shown** |
| 8 | BE-1 P4 | `cancel_type` (`Pre-Serve` / `Post-Serve`) on Cancelled tab | Transform reads `api.cancel_type` (`reportTransform.js:217, 405`); UI column is stubbed | Add Cancellation Status column to Cancelled tab + wire the transform field | ~10 | 🟡 **OPEN — stubbed** |
| 9 | BE-1 P5 | `table_no` consistently across all row types | Existing fallback wired (table no. resolved from alternates where available) | Will become correct automatically when BE normalises | 0 | 🟠 **OPEN — partial** |
| 10 | BE-1 P6 | `room_info` on RM rows on `/order-logs-report` | Drops the 1+N detail-fetch on `/reports/rooms` | **Subsumed into BE-2** (see §4.3 below) | ➜ | 🟡 Merged into BE-2 |
| 11 | BE-2 | Lodging payment breakdown — `lodging_collected`, `discount_amount`, `discount_reason`, optional `payment_breakdown[]` | Rule-2 approximation — residual `balance_payment > 0` on `fOrderStatus === 6` rooms treated as discount/write-off (`RoomRowCard.jsx`, `RoomOrdersReportPage.jsx`) | Precise formula `outstanding = total − lodging_collected − discount_amount`; new Discount column on Room Row Card; SummaryBar Paid stat becomes money-in-till | ~15 | 🔴 **OPEN — biggest unlock** |

### 4.3 — Notes per open item

**#3 BE-1 G1** — was originally withdrawn because frontend could derive settlement state from `f_order_status + payment_method`. The `getActiveSrmIds()` workaround at `reportService.js:349` ships that derivation. Backend is now willing to deliver; a 1-liner field read is cleaner than the folio walk.

**#4 BE-1 G3** — critical for the Outstanding-collapse behaviour on settled rooms. Today, the RM-parent's `associated_order_list[]` returns stale `payment_status` caches from transfer-time, so the frontend optimistically clears the Set for 1.5s after API success. On slow networks the SRM may briefly reappear before authoritative refetch. Non-blocking; cosmetic flicker only.

**#5 BE-1 P1 / #6 BE-1 P2** — today the Audit Report punchedBy and actionedBy columns often render `—` because backend sends only `*_by_id` (numeric) without the `*_by_name` (display) counterpart. Frontend has the chain ready; delivery of **any** `*_by_name` field unlocks real names in the column.

**#7 BE-1 P3 / #8 BE-1 P4** — Cancelled tab is the most-neglected tab. P3 unlocks the "why was it cancelled" text; P4 unlocks the Pre-Serve / Post-Serve classification column (stubbed in transform, column not rendered).

**#11 BE-2** — full spec in `BE_2_LODGING_PAYMENT_BREAKDOWN.md`. Current approximation is correct for the happy path (residual = 0) but folds discounts into the "paid" bucket for tenants that actually discount. BE-2 also subsumes BE-1 P6 (room_info on RM rows).

---

## 5. Rule-2 approximation — how the report math currently works

Until BE-2 ships, these are the **locked product rules** used by the Room Orders Report. Full context in `SESSION_TRACKER.md` §2.

```js
// Lodging math (Rule 1)
total   = room_info.room_price                             // lodging only
advance = room_info.advance_payment
balance = room_info.balance_payment
lodgingPaidSoFar = total - balance

// "Order paid" (Rule 2) — room-scoped only
isSettled   = (RM_parent.f_order_status === 6)
outstanding = isSettled ? 0 : balance
// any residual balance_payment > 0 on a settled room = treated as discount/write-off
```

This diverges from ground truth **only** for tenants that actually discount lodging. BE-2 delivers `discount_amount` + `discount_reason` so the frontend can surface the discount explicitly instead of silently absorbing it.

**Rule-2 scope is deliberately room-only** — Audit Report and OrderDetailSheet continue to use `payment_status`-based logic. Table documenting where Rule-2 does NOT apply: `SESSION_TRACKER.md` §5.

---

## 6. Test / QA references

| Tenant | What it tests |
|---|---|
| Mantri (`owner@mantri.com`) | Room flow with settled / unsettled rooms. All Bucket A/B/C changes live-verified here. |
| 18march | Secondary tenant — Audit report with cancellations, transfers, merges. Used for CR-001 Bucket D-1. |

Key QA doc: `bugs/QA_HANDOVER_BUNDLE_apr_2026_fixes.md` — has per-tab scenarios.

---

## 7. What to do next (pick one)

### If backend delivers a field between now and the next session
1. Open this doc. Find the row in §4.2. Read the "1-liner wire-in" column.
2. Make the change in `reportTransform.js` or `reportService.js`. No other file should need editing.
3. Update this doc — strike the row from §4.2, add to §4.1 with ship-date, update "As of" header.
4. Update `SESSION_TRACKER.md` §3 table to match.

### If nothing has shipped from backend
- **Option A (2 min):** refresh the "As of" date on this tracker and `SESSION_TRACKER.md` after confirming grep-state is unchanged. Useful every sprint.
- **Option B (most valuable):** chase backend team on BE-1 P1 / BE-1 P4 / BE-2. These three unlock the most user-visible improvements for the least frontend LOC.
- **Option C (opportunistic cleanup, ~5 LOC):** if BE confirms BE-1 G1 is now in their sprint, drop `getActiveSrmIds()` pre-emptively — but only if BE has a confirmed ship-date. Otherwise the workaround stays.

### Don't
- Don't change fallback defaults (`|| '—'`) without a real consumer complaint — the guards are intentional and prevent white-screen errors on partial payloads.
- Don't try to reverse-engineer missing fields from other endpoints — the Rule-2 approximation already handles the most critical gap cleanly.
- Don't generalise Rule-2 globally — deferred per `SESSION_TRACKER.md` §4; needs consumer-by-consumer audit.

---

## 8. Open-item change log

> Append a line every time a field ships, a workaround is retired, or the status changes.

| Date | Item | Change | Who |
|---|---|---|---|
| 2026-04-29 | — | Initial tracking (BE-1 + BE-2 split from SESSION_TRACKER §3) | Prev session agent |
| 2026-05-01 | — | Consolidated into this single reference doc. No code changes; grep confirmed all 9 open items still have their fallbacks in place. | Current session agent |
| 2026-05-01 | BE-1 P1 | `waiter_name` wired; `Employee #<id>` + `—` fallbacks removed in `reportService.js` + `reportTransform.js`. | Implementation Agent |
| 2026-05-01 | BE-1 P3 | `cancellation_reason` wired as canonical key; `cancel_reason` alt-key dropped. | Implementation Agent |
| 2026-05-01 | BE-1 P4 | `cancel_type` wired via item-level read (`order_details_table[0].cancel_type`); `normalizeCancelType()` helper added; new "Status" column on Cancelled tab + CSV export. | Implementation Agent |
| 2026-05-01 | BE-1 P5 | `table_name` (canonical key) wired in place of `table_no`; `extractLocation()` + service-layer lookup renamed. | Implementation Agent |
| 2026-05-01 | Infra | `[BE-1 INVARIANT]` dev-mode console logger added in `getOrderLogsReport` to detect backend regressions on the 4 shipped fields. | Implementation Agent |
| 2026-05-01 | BE-1 P6 / BE-2 §4.3 | Backend confirmed shipping `room_info` + `associated_orders` at `/order-logs-report` wrapper on RM rows (discovered via screenshot follow-up on 18march 2026-04-27). `room_info` also carries new fields: `room_no`, `payment_status`, `payment_mode`, `balance_payment_mode`, `receive_balance`, checkin/out dates, guest metadata. `associated_orders[i]` has `order_id`, `order_amount`, `order_status` but **not `payment_status`** (G3 still pending). Invariant logger extended to guard these fields. **Frontend wire-up (drop 1+N detail-fetch in `RoomRowCard.jsx`) still pending product OK.** | Planning Agent |
| 2026-05-01 | BE-2 §4.1 partial | `lodging_collected` derivable as `advance_payment + receive_balance`; `discount_amount` / `discount_reason` still not explicit. Frontend math rewrite pending product sign-off on the derivation formula. | Planning Agent |
| 2026-05-01 | Validation | welcomeresort tenant (14 RM rows / 7 settled / 1 SRM linkage) confirms: (a) `balance_payment` is **stale on settled rooms** — must be ignored when `payment_status === 'paid'`; (b) `lodging_collected = advance + receive_balance` reconciles all 7 paid samples to within ₹0; (c) `associated_orders[i]` has no `payment_status` but the SRM child appears as a separate top-level row in same payload — G3 unblockable via client-side join. | Planning Agent |

---

**End of tracker.**
