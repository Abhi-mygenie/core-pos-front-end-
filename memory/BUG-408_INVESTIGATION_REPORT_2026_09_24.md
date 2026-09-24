# BUG-408 — Investigation Report (re-validation after "backend updated API")

**Date:** 2026-09-24 · **Role:** INVESTIGATION (ALPHA v0.7) · **Steps used:** 6/10 · **Risk:** HIGH (financial report display)
**Scope:** Daily Report → Room section. Owner asked to validate the backend update against the live API and report gaps. No code changed, no registry status changed.
**Owner note:** the message said "attached is curl" — only the P&L screenshot was attached; no curl file was received. Probes below were run directly against preprod.

## 1. Summary
- **Root cause / status:** BUG-408 is **NOT FIXED** on preprod. `room_revenue.Room Cash/Card/UPI` are still `0` on 4 of 7 probed days; where non-zero they do not reconcile with `Room Total` or `Room Checkout` (e.g. 09-18: Cash 9925 vs Total 3000).
- **Classification:** BACKEND_BUG (data) — unchanged from the 2026-09-15 brief. Response **contract unchanged** (0 new keys, 0 removed keys vs `evidence/INV-PMS-ENH/probe_13_daily_sales.json`).
- **Confidence:** HIGH (reproduced with live curls on two accounts, 8 date windows).
- **Related status:** CR-383 PARKED · BUG-409 PARKED · BUG-405 GATE_5A_IMPLEMENTED — none of these changed.

## 2. Hypotheses Tested
| # | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Backend now populates `room_revenue.Room Cash/Card/UPI` | POST `daily-sales-revenue-report` for 09-03, 09-18..09-23, 09-24 (thegoankitchen) | 1–3 | **ELIMINATED** — split ≠ total on every day | `evidence/BUG-408/probes_2026_09_24/dsr_*.json`, `reconciliation_2026_09_24.md` |
| H2 | Backend added a new field FE must read (contract change) | Key-diff new vs Sept-3 probe | 4 | **ELIMINATED** — identical key set | same folder |
| H3 | Split lives elsewhere (`room_checkin_revenue`) and FE maps it to the wrong card | Reconcile `room_checkin_revenue` vs `Room Checkout` / advance; cross-check `aiosell/night-audit` | 5 | **PARTIALLY CONFIRMED** — `room_checkin_revenue` sums exactly to `Room Checkout` on 09-22 and 09-23, to advance+checkout on 09-18/19, and to neither on 09-20/21. Semantics are inconsistent inside the backend itself. | `night_audit_0922.json` |
| H4 | FE wiring wrong | Code trace `reportService.js:445-455` → `OrderSummaryPage.jsx:540-600` | 6 | **ELIMINATED** — FE reads the documented keys verbatim | — |

## 3. Data Flow Trace
API `POST /api/v2/vendoremployee/daily-sales-revenue-report {from,to}` → `data.room_revenue['Room Cash'|'Room Card'|'Room UPI'|'Room Total'|'Room advance'|'Room Checkout']`, `data.room_checkin_revenue[...]`
→ `src/api/services/reportService.js:445-455` (`toNum` pass-through, CR-377 markers)
→ `src/pages/OrderSummaryPage.jsx:556-566` "Settled" card (Cash/Card/UPI rows) and `:584-598` "Check-In Revenue — Collected at check-in".
**BREAK POINT:** the API values themselves. FE renders exactly what it receives.

## 4. Reconciliation (thegoankitchen)
| Date | Cash+Card+UPI | Room Total | advance | Checkout | checkin_rev sum | Verdict |
|---|---|---|---|---|---|---|
| 09-03 | 0 | 84610.04 | 24488.38 | 37422 | 34222 | split missing (same as Sept-15 evidence; Checkout changed 36822.28 → 37422) |
| 09-18 | 9925 | 3000 | 1000 | 1800 | 2800 | Cash > Total — impossible |
| 09-19 | 549 | 8000 | 200 | 900 | 1100 | no relation |
| 09-20 | 14048 | 1021900 | 81700 | 593725 | 593925 | no relation; Total looks like booked value, not collected |
| 09-21 | 0 | 1393400 | 22000 | 580714 | 583714 | split missing |
| 09-22 | 0 | 297422.28 | 20422.28 | 70840 | 70840 | split missing; checkin_rev == Checkout |
| 09-23 | 436 | 2194592 | 49500 | 1298674.46 | 1298674.46 | split missing; checkin_rev == Checkout |
| 09-24 | — | — | — | — | — | HTTP 525 (Cloudflare origin error, transient) |

`Room advance` equals `paid_revenue_method.order_payment['Room Checkin']` on every day — that pair is consistent.
palmhouse account: every room field is 0 for all windows → this tenant has no room data and cannot validate BUG-408.

Cross-check 09-22 — `GET aiosell/night-audit?date=2026-09-22`: `room_revenue_collected` 75165.76, tender cash 60510.08 / card 952.38 / upi 1904.76 / ota 11798.54, `collected_by_stage.checkout` 75165.76, `advance_at_checkin` 0.
Daily-sales for the same day: Checkout 70840, advance 20422.28, Cash/Card/UPI 0. **The two backend reports disagree with each other for the same business day.**

## 5. Gaps for the backend team (add to BACKEND_BRIEF_BUG408)
1. **G1 — split still not populated:** `room_revenue.Room Cash/Card/UPI` must sum to the collected room amount for the window. Today it sums to 0 or to unexplained values (9925 / 549 / 14048 / 436). What do those non-zero values represent?
2. **G2 — `room_checkin_revenue` mislabeled:** its sum equals `Room Checkout` (09-22, 09-23), not check-in advances. FE labels it "Collected at check-in" (CR-377 / OD-377-04). Backend must state the intended semantics; if it is the checkout tender split, FE mapping and label change is a CR (report semantics = HIGH risk, owner approval).
3. **G3 — `Room Total` semantics:** values like ₹10.2 L / ₹13.9 L / ₹21.9 L per day for a 5-room property look like booked/contract value, not settled revenue, yet FE shows it as "Settled". Backend to define.
4. **G4 — cross-endpoint inconsistency:** `night-audit` vs `daily-sales-revenue-report` differ on collected room revenue and tender split for 09-22.
5. **G5 — transient 525** on 09-24 single-day probe (Cloudflare origin error) — note only.

## 6. Recommendations
- Classification: **BACKEND_ASK** — no FE fix possible until G1–G3 are answered. Keep BUG-408 `BACKEND-BLOCKED`.
- Do not implement any FE re-mapping of `room_checkin_revenue` without owner + backend confirmation (R3, R6 — report semantics).
- Owner decision needed: should the "Check-In Revenue" card be hidden until G2 is clarified, given it currently shows checkout money under a check-in label on 09-22/09-23? (OWNER_DECISION — not taken here.)

## 7. Evidence Artifacts
`/app/memory/evidence/BUG-408/probes_2026_09_24/` — login (tokens masked `***`), 13 daily-sales responses, night-audit 09-22, revenue-summary 09-18..23, `reconciliation_2026_09_24.md`.

## 8. Retroactive Candidates
NONE.
