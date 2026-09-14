# CR-363 + CR-366 — JOINT IMPACT ANALYSIS (Gate 2)

**IDs:** CR-363 — PMS Night Audit Report · CR-366 — PMS Revenue Dashboard / Analytics
**Date:** 2026-09-14
**Role:** PLANNING (Gate 2 — Impact Analysis ONLY. Gate 3 Implementation Plan deliberately NOT written — owner instruction 2026-09-14.)
**Sprint:** pos_pms_1
**Priority / Risk:** CR-363 P1 / **HIGH** · CR-366 P2 / **MEDIUM** (both confirmed — see §3)
**Intake docs:** `change_requests/CR-363_PMS_NIGHT_AUDIT_REPORT_INTAKE.md` · `change_requests/CR-366_PMS_REVENUE_DASHBOARD_ANALYTICS_INTAKE.md`
**Backend briefs:** `backend_briefs/BACKEND_BRIEF_CR363_NIGHT_AUDIT_2026_09_16.md` · `backend_briefs/BACKEND_BRIEF_CR366_REVENUE_AGGREGATION_2026_09_15.md`
**BE reply cross-ref:** `handover/INV_BE_REPLY_CR363_364_366_2026_09_14.md`

---

## 0. Header — Code Reality + Conflict Pre-Check

| Check | Result |
|---|---|
| **Code Reality** | **NONE** — `grep -rn "night-audit\|NightAudit\|revenue-summary\|RevenueDashboard\|revpar\|RevPAR" src/` → 0 hits. `AIOSELL_ENDPOINTS` (constants.js L575–597) has no `NIGHT_AUDIT` / `REVENUE_SUMMARY` key. Sidebar `pms.children` (Sidebar.jsx L228–242) = 9 entries, none for audit/revenue. App.js PMS routes (L256–264) = 9. |
| **Conflict Pre-Check — `pmsService.js`** | Last modifier CR-358-P5 IMPL 2026-09-08 (FILE_OWNERSHIP L1246). Open items also planning to touch it: **CR-364** (`+getGuestFolio`), CR-363, CR-366. All additive appends of new exports → **parallel-safe**. Execution order irrelevant; second lander rebases import line only. |
| **Conflict Pre-Check — `App.js`** | Last modifier CR-358-P4 (route re-points). Open items: **CR-364** (`/pms/folio/:orderId`), **CR-365** (`/pms/housekeeping`), CR-363, CR-366. Each adds 1 import + 1 `<Route>` → **parallel-safe**. |
| **Conflict Pre-Check — `Sidebar.jsx`** | Last modifier CR-378 (2026-09-11, L820 restaurant name — Fast Lane). **Sidebar FROZEN after CR-358-P1** ("touched ONCE — frozen after P1", L223). Open items needing a new `pms` child: **CR-365** (Housekeeping), CR-363 (Night Audit), CR-366 (Revenue). → **ONE combined Sidebar SC ack** covering CR-363 + CR-366 (+ CR-365 if owner wants a single unfreeze) must be recorded at Gate 3/4. Until acked, Sidebar is **NOT** in scope. |
| **Conflict Pre-Check — `aiosellTransform.js`** | Last modifier CR-358-P5. CR-366 intake planned `+fromDashboardKpisRange` — **NO LONGER NEEDED** (revenue-summary replaces chunked dashboard-kpis). File dropped from CR-366 scope. |
| **Registry** | CR-363 status `BACKEND-UNBLOCKED`, gate 2, `backend_blocked:false` ✅ · CR-366 same ✅ · No CLOSED-status conflicts. |
| **R11 curl-probe** | **DONE 2026-09-14** — see §1. Both endpoints 200 on preprod. |

---

## 1. R11 Probe Results (preprod, 2026-09-14)

Account alias: `goankitchen_owner` (RID from token; credentials masked, stored as alias only in `test_credentials.md`). Auth: `POST /api/v1/auth/vendoremployee/common-login` → Bearer token (same interceptor path as all PMS calls, `api/axios.js` L24–29).

| # | Call | HTTP | Evidence |
|---|---|---|---|
| P1 | `GET /api/v2/vendoremployee/aiosell/night-audit?date=2026-09-03` | **200** | `evidence/CR-363/probe_night_audit_2026_09_14.json` |
| P2 | `GET …/aiosell/night-audit` (no date) | **422** `{"errors":{"date":["The date field is required."]}}` | `evidence/CR-363/probe_night_audit_nodate_2026_09_14.json` |
| P3 | `GET …/aiosell/revenue-summary?start_date=2026-08-28&end_date=2026-09-03&group_by=day` | **200** (7 buckets) | `evidence/CR-366/probe_revenue_summary_day_2026_09_14.json` |
| P4 | `GET …/aiosell/revenue-summary?start_date=2026-06-01&end_date=2026-09-03&group_by=week` | **200** | `evidence/CR-366/probe_revenue_summary_week_2026_09_14.json` |
| P5 | `GET …/aiosell/revenue-summary` (no params) | **422** `start_date`/`end_date` required | `evidence/CR-366/probe_revenue_summary_noparams_2026_09_14.json` |

### 1.1 `night-audit` verified response shape (`data.*`)
```
date, business_day{start,end}, is_forecast, status_as_of ("current")
occupancy{ rooms_total, rooms_ooo, rooms_available, rooms_sold, rooms_complimentary,
           occupancy_percent, occupancy_percent_physical, arrivals_expected, arrivals_actual,
           departures_expected, departures_actual, in_house, day_use,
           by_room_type[]{room_code,capacity,available,sold,occupancy_percent} }
revenue{ room_sales_booked, room_revenue_collected, room_gst_collected,
         collected_by_tender{cash,card,upi,tab,ota_remittance,other},
         collected_by_stage{advance_at_booking,advance_at_checkin,mid_stay,checkout},
         refunds, adr_booked, adr_collected, revpar_booked, revpar_collected, other_revenue_posted }
fnb_posted_to_rooms{ orders, amount, gst, collected, outstanding, trevpar }
outstanding{ total_room_balance, total_fnb_balance, total_balance,
             rows[]{order_id,reservation_id,room_no,room_code,guest_name,checkin,checkout,channel,
                    booking_payment_type,room_booked,room_collected,room_balance,
                    fnb_posted,fnb_collected,fnb_balance,payment_status} }
no_shows{ count, fee_charged, rows[] }
departures{ checked_out_paid[], checked_out_unpaid[], overdue_in_house[], early_checkouts[] }
room_status_close{ available,occupied,occupied_hk,booked,hk,ooo, status_as_of,
                   rows[]{room_no,room_code,status,hk_status} }
reconciliation{ settlement_total_collection, settlement_room_share, settlement_fnb_share,
                night_audit_room_cash_card_upi, delta,
                by_waiter[]{waiter_id,name,today_collection,room_share,fnb_share} }
audit_trail[]{ at, type, order_id, by, detail{previous_table_id,current_table_id} }
```
Maps to intake sections: A=occupancy · B=revenue · C=outstanding · D=no_shows · E=departures · F=room_status_close · G=audit_trail · H=reconciliation · (F&B line = fnb_posted_to_rooms).

### 1.2 `revenue-summary` verified response shape (`data.*`)
```
generated_at, currency, range{start_date,end_date,days,group_by}
totals{ rooms_available, rooms_sold, rooms_complimentary, occupancy_percent, occupancy_percent_physical,
        room_revenue_booked, room_revenue_collected, fnb_revenue_posted, other_revenue_posted, tax_collected,
        adr_booked, adr_collected, revpar_booked, revpar_collected, trevpar,
        bookings_count, arrivals, departures, cancellations_count, no_show_count,
        avg_los_nights, avg_lead_time_days, outstanding_balance,
        room_revenue_collected_by_tender{…}, by_channel[], by_booking_payment_type[], by_room_type[] }
series[]{ bucket_start, bucket_end, is_forecast, rooms_capacity, rooms_ooo, rooms_available, rooms_sold,
          rooms_complimentary, occupancy_percent, arrivals, departures, in_house, no_shows, cancellations,
          room_revenue_booked, room_revenue_collected, fnb_revenue_posted, other_revenue_posted, tax_collected,
          adr_booked, adr_collected, revpar_booked, revpar_collected,
          by_room_type[]{room_code,capacity,ooo,available,sold,complimentary,room_revenue_booked,
                         room_revenue_collected,occupancy_percent,adr_booked},
          by_channel[], room_revenue_collected_by_tender{…} }
by_channel[]{ channel, room_nights, room_revenue_booked, room_revenue_collected, bookings, cancellations,
              no_shows, adr_booked, share_of_revenue_percent }
by_booking_payment_type[]{ booking_payment_type, room_nights, room_revenue_booked, room_revenue_collected, outstanding }
by_room_type[]{ room_code, capacity_nights, available_nights, sold_nights, room_revenue_booked,
                room_revenue_collected, occupancy_percent, adr_booked, revpar_booked }
by_booking_status{ confirmed_pending_arrival, checked_in, checked_out, cancelled, no_show, modified }
```
`group_by` accepted values verified: `day`, `week`. (`month` documented by BE Q-366-10 — not probed; Gate 3 must probe once.)

### 1.3 Data observations from probe (NOT FE defects — flag to backend as notes, do not block Gate 2)

| # | Observation | Where | FE handling |
|---|---|---|---|
| N1 | `occupancy.by_room_type[executive].occupancy_percent = 200` (sold 2 / capacity 1) | night-audit P1 | Display raw; clamp visual bar at 100 %; do **not** recompute (R6). Flag in backend note. |
| N2 | `outstanding.rows[].room_code / guest_name / checkin / checkout = null` on all rows | night-audit P1 | Render "—" for null; **BE note** — guest name is required for section C usability (B-363 follow-up). |
| N3 | `reconciliation.settlement_total_collection`, `settlement_fnb_share`, `by_waiter[].name/today_collection/fnb_share = null` | night-audit P1 | Only `settlement_room_share`, `night_audit_room_cash_card_upi`, `delta`, `by_waiter[].room_share` populated → section H v1 shows these four only; other cells "—". BE note. |
| N4 | `audit_trail[].detail.previous_table_id / current_table_id = null` for `transfer_to_room` | night-audit P1 | Show type + order_id + by + time; detail hidden when both null. **Cross-ref BUG-193** (room transfer trail shows 0 / table transfers) — same lifecycle-log gap, likely same root. |
| N5 | `fnb_posted_to_rooms.orders = null` (not `0`/`[]`) | night-audit P1 | Treat null as 0 / empty. |
| N6 | `totals.bookings_count / avg_los_nights / avg_lead_time_days / outstanding_balance = null` | revenue-summary P3 | Widgets "Lead time / LOS" from intake → **v1 shows "—" / hidden** until BE populates. `by_channel[].bookings = 0` while `room_nights = 3` — BE note. |
| N7 | `adr_collected` (14,655) ≫ `adr_booked` (4,380) on a day with checkout-stage collections for stays booked earlier | both | Expected per Q-366-01/02 (collected recognised on receipt date). UI must label the two columns "Sales (booked)" vs "Revenue (collected)" exactly as OD-363-02 / OD-366-01 — never blend. |
| N8 | `room_status_close.status_as_of = "current"` for a past date | night-audit P1 | Mandatory badge "Room status as of now" (Q-363-06 limitation). |
| N9 | `business_day` = IST midnight→midnight expressed in UTC (`…T18:30:00+00:00`) | night-audit P1 | Display converted to local; FE sends plain `date` YYYY-MM-DD only (`localDate()` helper, pmsService L20–23). No `businessDay.js` use (OD-363-01). |

---

## 2. Data Flow Trace (target state)

### 2.1 CR-363 Night Audit
```
UI  NightAuditPage (date picker, default localDate(0))
 → pmsService.getNightAudit(date)
     → api.get(AIOSELL_ENDPOINTS.NIGHT_AUDIT, { params: { date } })       [NEW constant]
     → nightAuditTransform.fromAPI(res.data)                             [NEW, pure, unit-testable]
         · number-coerce only (num()), null→'—'/0, NO arithmetic (R6)
         · flattens sections A–H into view models
 → state {audit, loading, error}
 → sections render (KPI tiles, tables), export via utils/reportExporter.js (exportReportAsPDF/Excel — existing, called only)
```
Optional 2nd call (intake said `revenue-summary?start_date=D&end_date=D`) — **DROPPED**: night-audit already returns `adr_*`, `revpar_*`, tender split, `trevpar`. One call per date. Fewer moving parts, no reconciliation between two responses.

### 2.2 CR-366 Revenue Dashboard
```
UI  RevenueDashboardPage (From/To + Today/7D/30D pills — same UX as ItemSalesLedgerMockup L408 preset row)
 → group_by auto-select (FE rule from BE compute note): days ≤ 92 → 'day' · ≤ 366 → 'week' · > 366 → 'month'
 → pmsService.getRevenueSummary({ startDate, endDate, groupBy })
     → api.get(AIOSELL_ENDPOINTS.REVENUE_SUMMARY, { params: { start_date, end_date, group_by } })   [NEW constant]
     → revenueTransform.fromAPI(res.data)                                 [NEW, pure]
         · series[] → recharts-ready rows (bucket label, occupancy %, booked, collected, adr, revpar)
         · totals → KPI tiles · by_channel / by_room_type / by_booking_payment_type / tender → tables & pies
         · NO derived money math: ADR/RevPAR/TRevPAR taken from response fields
 → charts: recharts 3.6.0 (already dep; pattern = CashierSettlementMockup.jsx L17)
 → export: utils/reportExporter.js
```
**Caching:** BE = live compute, no cache. FE options: (a) none (v1 simplest), (b) `insightsCache` (CR-044; restaurant-keyed, logout-cleared — satisfies OG-FE-CACHE-002). OD-366-05 (TTL) previously "defaultable 15 min" — see §6.

### 2.3 Shared / downstream consumers
| Consumer | Effect |
|---|---|
| `Sidebar.jsx` `pms.children` | +2 entries (`pms-night-audit` → `/pms/night-audit`, `pms-revenue` → `/pms/revenue`). Gated by existing `features.room` check (L344) — no new gate. **SC ack required.** |
| `App.js` | +2 imports, +2 `<ProtectedRoute>` routes. |
| `constants.js` `AIOSELL_ENDPOINTS` | +2 keys (additive). |
| Front Desk KPIs (`getFrontDeskKpis`) | untouched — still `dashboard-kpis`. **Risk:** Front Desk `occupancy_percent_physical` vs Night Audit `occupancy_percent` may differ on comp rooms (Q-366-04). Label accordingly. |
| Day Closure / Settlement (CR-015/016) | **not modified**; Night Audit §H reconciles to it read-only. |
| CR-364 Guest Folio | Night Audit §C `outstanding.rows[].order_id` → link target `/pms/folio/:orderId` once CR-364 ships. Additive link; no dependency at build time (render plain text if route absent). |
| CR-357 | Q-363-04 / Q-366-06 confirm `room_balance` is room-only; `fnb_balance` separate. Night Audit displays both. **No CR-357 code touched.** |

---

## 3. Risk Classification (R21)

| Item | Risk | Trigger | Why not higher/lower |
|---|---|---|---|
| CR-363 | **HIGH** (unchanged) | Report totals (R6 "Total means different things"); reconciliation vs Day Closure figures shown side-by-side | Read-only, no settlement/print mutation, no client math → not CRITICAL. Cannot be MEDIUM: money figures displayed to owner for cash reconciliation. |
| CR-366 | **MEDIUM** (unchanged) | Analytics display, non-billing, optional localStorage cache (OG-FE-CACHE-002) | Upgrade to HIGH only if owner picks `insightsCache` (localStorage + customer-data-adjacent). Flagged in §6. |

Fast Lane: **NO** for both.

---

## 4. Affected Files

### 4.1 CR-363
| File | Change | Type | Hotspot (R5)? |
|---|---|---|---|
| `src/pages/pms/NightAuditPage.jsx` | NEW page — date picker, 8 sections, export, "as of now" badge | NEW | No |
| `src/api/transforms/nightAuditTransform.js` | NEW pure transform + `__tests__` | NEW | No |
| `src/api/services/pmsService.js` | `+getNightAudit(date)` (append; import unchanged — uses existing `api`, `AIOSELL_ENDPOINTS`) | MOD (+~8 lines) | No |
| `src/api/constants.js` | `AIOSELL_ENDPOINTS.NIGHT_AUDIT` | MOD (+1 line) | No |
| `src/App.js` | +import, +route `/pms/night-audit` | MOD (+2 lines) | No (not R5) |
| `src/components/layout/Sidebar.jsx` | +child `pms-night-audit` | MOD (+1 line) — **SC ack** | Frozen-by-policy |

### 4.2 CR-366
| File | Change | Type | Hotspot (R5)? |
|---|---|---|---|
| `src/pages/pms/RevenueDashboardPage.jsx` | NEW page — range picker, KPI tiles, trend charts (recharts), breakdown tables, export | NEW | No |
| `src/api/transforms/revenueTransform.js` | NEW pure transform + `__tests__` (incl. `group_by` auto-select helper) | NEW | No |
| `src/api/services/pmsService.js` | `+getRevenueSummary({startDate,endDate,groupBy})` | MOD (+~8 lines) | No |
| `src/api/constants.js` | `AIOSELL_ENDPOINTS.REVENUE_SUMMARY` | MOD (+1 line) | No |
| `src/App.js` | +import, +route `/pms/revenue` | MOD (+2 lines) | No |
| `src/components/layout/Sidebar.jsx` | +child `pms-revenue` | MOD (+1 line) — **SC ack** | Frozen-by-policy |
| ~~`src/api/transforms/aiosellTransform.js`~~ | **REMOVED from scope** (`fromDashboardKpisRange` obsolete) | — | — |

### 4.3 Files that will NOT be touched (both)
`CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `orderTransform.js`, `DashboardPage.jsx`, `LoadingPage.jsx` (all R5), `SettlementPanel.jsx`, `DayClosurePage.jsx`, `settlementTransform.js`, `reportService.js`, `roomOrdersService.js`, `roomService.js`, `PmsCheckoutDrawer.jsx`, `CartPanel.jsx`, `RecordPaymentModal.jsx`, `aiosellTransform.js`, `aiosellService.js`, `FrontDeskPage.jsx`, `insightsCache.js` (called only if OD-366-05 ≠ none), `utils/reportExporter.js` (called only), `utils/businessDay.js`, any `/app/memory/final/*`.

**Blast radius:** CR-363 = 6 files (2 NEW, 4 MOD ≤ 12 lines total) · CR-366 = 6 files (2 NEW, 4 MOD). Shared MOD files: `pmsService.js`, `constants.js`, `App.js`, `Sidebar.jsx` → **build as one combined change-set** to touch Sidebar once (single SC ack).

---

## 5. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Owner reads "Revenue (collected)" as "Sales (booked)" or vice-versa → cash-recon confusion | M | H | Fixed column labels per OD-363-02 ("Sales" / "Revenue"); tooltip with BE definition (Q-366-01/02); never show a blended total. |
| R-2 | Night Audit §H `delta ≠ 0` vs Day Closure interpreted as FE bug | M | M | Show `delta` with explanatory note "difference between settlement report room share and room ledger cash/card/UPI"; link to BE note N3. |
| R-3 | Historical `room_status_close` is *current* board (Q-363-06) | Certain | M | Mandatory "as of now" badge (N8); hide section for dates > 1 day old? → **OD-363-07** (§6). |
| R-4 | Long ranges on `revenue-summary` = CPU-heavy live compute | M | M | FE `group_by` auto-rule; 60 s axios timeout check at Gate 3; loading skeleton; abort previous request on range change. |
| R-5 | Sidebar unfreeze conflicts with CR-365 (Housekeeping child) | H | L | One combined SC ack listing all 3 children; whichever ships second rebases the single line. |
| R-6 | Null-heavy rows (N2/N3/N6) make sections look broken | H | M | Transform normalises null→'—'; empty-state copy per section; BE follow-up note filed. |
| R-7 | Occupancy > 100 % (N1) rendered as broken chart | L | L | Clamp bar width at 100 %, show raw % text. |
| R-8 | `features.room` gate hides pages for non-hotels — expected | — | — | No change; existing L344 gate. |
| R-9 | Export utils (`reportExporter.js`) expect Insights-shaped params | M | L | Verify param shape at Gate 3 (L407–445); write adapter inside page, do not modify util. |
| R-10 | Timezone: FE `localDate()` vs BE IST | L | M | Restaurants are IST; note in plan; `date` sent as plain YYYY-MM-DD. |

---

## 6. Owner Decisions

### Resolved this session (2026-09-14)
| OD | Decision |
|---|---|
| **OD-366-04** | **Sidebar child under Rooms & Reservations** (same as CR-363) → one combined SC ack. |

### Carried (frozen earlier, unchanged)
OD-363-01..06 (2026-09-16) · OD-366-01/02/03 (2026-09-15).

### NEW — surfaced by probe (non-blocking for Gate 2; **must be answered before Gate 3**)
| OD | Question | Options | Default if silent |
|---|---|---|---|
| **OD-363-07** | Past-date Night Audit: show `room_status_close` (which is *today's* board) with an "as of now" badge, or hide the section for dates ≠ today? | a) show + badge · b) hide for past dates | a |
| **OD-363-08** | §C Outstanding rows currently have `guest_name` = null from BE. Ship v1 with "—" + BE follow-up, or wait for BE fix? | a) ship with "—" · b) wait | a |
| **OD-366-05** | Cache TTL — BE is live compute. | a) no FE cache (v1) · b) `insightsCache` 15 min (raises risk to HIGH — localStorage) | a |
| **OD-366-06** | Compare-to-previous-period deltas on KPI tiles? (needs a 2nd `revenue-summary` call) | yes / no | no (v1) |
| **OD-366-07** | Default range on page open | Today / 7D / 30D | 30D |
| **OD-366-08** | KPI tile basis default toggle — show Booked and Collected side-by-side always, or a toggle? | a) side-by-side · b) toggle (Booked default) | a |

No business rule has been guessed (R3). Defaults above are proposals only.

---

## 7. Backend Notes (to append to next BE brief — informational, not blockers)

| # | Endpoint | Note |
|---|---|---|
| BN-1 | night-audit | `outstanding.rows[].guest_name / room_code / checkin / checkout` null (N2) |
| BN-2 | night-audit | `reconciliation.settlement_total_collection / settlement_fnb_share / by_waiter[].name / today_collection` null (N3) |
| BN-3 | night-audit | `audit_trail[].detail.previous_table_id / current_table_id` null on `transfer_to_room` (N4) — same symptom family as **BUG-193** |
| BN-4 | night-audit | `by_room_type.occupancy_percent` can exceed 100 (N1) — capacity mapping? |
| BN-5 | revenue-summary | `totals.bookings_count / avg_los_nights / avg_lead_time_days / outstanding_balance` null; `by_channel[].bookings = 0` with `room_nights > 0` (N6) |
| BN-6 | revenue-summary | `group_by=month` not yet probed by FE |

---

## 8. Gate 3 Entry Requirements (checklist for the Implementation-Plan session)
- [ ] OD-363-07/08, OD-366-05..08 answered (or owner accepts defaults in writing)
- [ ] Combined Sidebar SC ack (CR-363 + CR-366 [+ CR-365]) acknowledged
- [ ] One probe of `revenue-summary…&group_by=month` (BN-6)
- [ ] Confirm `utils/reportExporter.js` param contract (R-9)
- [ ] Re-verify target lines: `constants.js` L596–597 (end of `AIOSELL_ENDPOINTS`), `pmsService.js` EOF, `App.js` L264, `Sidebar.jsx` L241

---

## 9. Scope Lock (preliminary — finalised at Gate 3)
**WILL change:** `pages/pms/NightAuditPage.jsx` (NEW), `pages/pms/RevenueDashboardPage.jsx` (NEW), `api/transforms/nightAuditTransform.js` (NEW), `api/transforms/revenueTransform.js` (NEW), `api/services/pmsService.js`, `api/constants.js`, `App.js`, `components/layout/Sidebar.jsx` (post SC ack).
**WILL NOT touch:** everything in §4.3.

---

```
Planning complete: CR-363, CR-366
Stage: Impact Analysis (Gate 2 only)
Code reality: NONE
Risk: CR-363 HIGH · CR-366 MEDIUM
Files WILL change: NightAuditPage.jsx (NEW), RevenueDashboardPage.jsx (NEW), nightAuditTransform.js (NEW),
                   revenueTransform.js (NEW), pmsService.js, constants.js, App.js, Sidebar.jsx (SC ack)
Files WILL NOT touch: CollectPaymentPanel, OrderEntry, orderTransform, Settlement/DayClosure, reportService,
                      aiosellTransform, aiosellService, PmsCheckoutDrawer, CartPanel, insightsCache (unless OD-366-05 b)
Owner decisions: OD-366-04 RESOLVED (sidebar). NEW: OD-363-07, OD-363-08, OD-366-05, OD-366-06, OD-366-07, OD-366-08
Docs: impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md · evidence/CR-363/ · evidence/CR-366/
Next: Owner answers new ODs + Sidebar SC ack → PLANNING Gate 3 (Implementation Plan)
```
