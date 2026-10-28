# BACKEND_BRIEF — CR-385 Front Desk Workstation · Performance & aggregation asks (not a bug)

```
ID:           BQ-385-22 (tracked in BACKEND_BRIEF_CR-385_MASTER.md §1 + §Perf; checklist section "B · Backend optimisation" in cr385-master-checklist.html)
Date:         2026-09-21 · Filed by: Implementation/QA agent (ALPHA v0.7) on owner request
From / To:    MyGenie POS frontend team → PMS backend team
Priority:     P2 · Classification: PERFORMANCE / AGGREGATION (no functional defect; Phase 0 is QA-passed on the current contract)
Status:       OPEN — asks 1–3 are backend; ask 4 is a shared decision. Nothing blocks Phase 0/1.
Probe acct:   RID 69 · hotel_code sandbox-pms · evidence/CR-385/perf_2026_09_21/lr_latency_probe.{py,json} (token redacted)
How to reply: inline under "### Backend answer" of each ask; flip the Status cell in the MASTER §1 tracker.
```

## 1. What the Front Desk (Beta) page calls

One batch per load / ↻ / window-focus (debounced 5 s, coalesced — D71):

| # | Call | Purpose on the page | Payload | Latency observed 2026-09-21 |
|---|---|---|---|---|
| 1 | `GET /api/v2/vendoremployee/aiosell/local-reservations?start_date=BD−30&end_date=BD+60&view=all` | every guest row (Arrivals / Departures / In-House), tile counts (`counts.*`), business date (`meta.business_date`) | **149 KB · 111 reservations** | **0.9 s → 6.9 s, and one 90 s read-timeout** (13:30–15:10 IST window); testing agent hit a 60 s axios timeout on the same call once |
| 2 | `GET …/aiosell/room-status-board` | Rooms tab, "N free" | 1.8 KB | 0.4 s stable |
| 3 | `GET …/aiosell/dashboard-kpis?start_date=BD&end_date=BD` | occupancy %, no-show footer | 0.7 KB | 0.6 s stable |

Login `POST /api/v1/auth/vendoremployee/common-login`: 1.1–1.5 s normally, one 11.6 s spike. The `/loading` POS boot (Categories / Profile / Popular Items — not PMS) hit 41–60 s in the same degraded window.

**Conclusion:** the page's perceived slowness is one endpoint — `local-reservations` — and its variance, not the Beta UI. The page waits for the whole batch, so a 5 s LR = 5 s "synced" delay.

## 2. Why `local-reservations` is heavy — measured shape (RID 69, 2026-09-21)

| Window | Reservations | `pending` | `in_house` | `departed` | Bytes |
|---|---|---|---|---|---|
| BD−30 / BD+60 `view=all` (what the page sends) | **111** | 14 | 2 | **95 (86 %)** | 149,078 |
| BD−7 / BD+30 `view=all` | 89 | 6 | 2 | 81 | 118,856 |

- The workstation renders **only `pending` + `in_house`** (16 of 111 rows). `departed` rows are never displayed in Phase 0–1 (Departures tab = `in_house` bucketed by checkout; departed history is not a workstation concern).
- Per-row bytes (fixture, 80 rows): `rooms[]` 29 % · `charge{}` 17 % · `guest{}` 12 % · everything else < 3 % each. `rooms[].nights_detail[]` (BQ-385-19) will grow this further for long stays.
- **Narrowing the window on the FE is NOT an option:** BD−7 dropped `pending` from 14 → 6 — the 8 lost rows are **Late arrivals** (check-in before BD−7, still pending) that the Late chip must show. The window must stay wide until the server can express "late" itself. Also `view=in_house` is a date filter, not an `operational_status` filter (aiosellService.js L111 — early check-ins return 0), so it cannot be used either.

## 3. Asks

### Ask 1 — `operational_status[]` filter on `local-reservations` (P2, smallest change, biggest win)
`GET …/local-reservations?start_date&end_date&operational_status[]=pending&operational_status[]=in_house` → returns only those rows; **`counts.*` and `meta.business_date` must still be computed over the full window** (counts are authoritative for the tiles — BQ-385-12 / DEC-7). Expected: 111 → 16 rows, ~149 KB → ~20 KB, proportional DB/serialisation time saved.
Contract notes: filter is additive (absent → today's behaviour); `view` untouched; `counts` semantics unchanged.
### Backend answer
_(pending)_

### Ask 2 — Late / overdue without a 30-day look-back (P2)
Today the FE sends BD−30 only to catch `pending` rows whose `checkin < BD` (Late) and `in_house` rows whose `checkout < BD` (Overdue). Ask: with Ask 1 in place, guarantee that **`pending` and `in_house` rows are returned regardless of `start_date`** (status-driven, not date-driven), so the FE can send BD / BD+60 (or smaller) and still receive every Late/Overdue row. Alternative: a `include_open=1` flag. Either way `counts.arrivals_late` / `counts.departures_overdue` stay server-computed.
### Backend answer
_(pending)_

### Ask 3 — Field trimming for the list view (P3)
Optional `fields=list` (or `view=workstation`) returning per reservation only: `id, booking_id, channel, checkin, checkout, operational_status, pah, prepaid_amount, special_requests, guest{first_name,last_name,phone,email}, rooms[]{restaurant_table_id,table_no,room_type,adults,children}, charge{total_with_gst,advance_payment,balance_due,sgst,cgst}` — i.e. what `frontDeskTransform.fromReservation` reads. Everything else (`cm_booking_id`, `cancel_*`, `user_id_document_id`, `amount_before/after_tax`, `nights_detail[]`, `booked_on`, …) stays available on the default view / detail fetch. Frozen rule stays: money only from `charge.*`.
### Backend answer
_(pending)_

### Ask 4 — Single snapshot endpoint (`front-desk-snapshot`) — existing BQ-385-02 A1, Phase 2
List + counts + board + kpis in one call would remove two round-trips and the FE's `Promise.allSettled` degrade logic. Not requested now; recorded here so the perf discussion and BQ-385-02 point at the same evidence.
### Backend answer
_(pending — Phase 2)_

### Ask 5 — Server-side timing headers / logging (P3, diagnostics)
`Server-Timing: db;dur=…, serialize;dur=…` (or a log line with `restaurant_id`, window, row count, ms) on `local-reservations`, so the next slow spell can be attributed (DB vs PHP serialisation vs network) instead of probed from the client.
### Backend answer
_(pending)_

## 4. What the FE will do (no backend dependency)
- Nothing in Phase 0/1 — the contract is QA-passed; ↻ coalescing + 5 s focus debounce (D71) already prevents duplicate batches.
- When Ask 1 ships: add `operational_status[]` to `frontDeskService.getSnapshot` (1 line) + a fixture with the filtered shape; the transform is unchanged.
- When Ask 2 ships: shrink the window to BD / BD+60 (D-decision needed: keep `+60` for Upcoming).
- We will keep measuring: `evidence/CR-385/perf_2026_09_21/lr_latency_probe.py` (re-run any time; appends nothing, rewrites the JSON).

## 5. Evidence
- `evidence/CR-385/perf_2026_09_21/lr_latency_probe.json` — 3 samples per endpoint, shapes, byte counts (2026-09-21 15:15 IST).
- `evidence/CR-385/perf_2026_09_21/probe.log` — console log of the run; the previous run at 15:08 hit a **90 s read timeout** on the −30/+60 call (see PRD 2026-09-21 perf note).
- `/app/test_reports/iteration_7.json` — testing agent 60 s axios timeout on `local-reservations` (round 1, 13:xx IST).
- Fixture byte-split: `frontend/src/__fixtures__/cr385/local_reservations_view_all.json` (80 rows, 106 KB).
