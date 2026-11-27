# CR-385 · Validation of BE reply `backend_replies/d17_reply_2026-09-21.md` (D17 + BQ-385-21) — 2026-09-21
## D17 — check-in collect-now amount — **FIXED, FE-validated (API + UI)**
API runner `log_d17.txt` (suite-s-ep, 2026-10-10, rooms 8525/8527/8528; `allow_early_checkin` toggled on for the run and **restored to false**; all three stays settled by TAB → `departed`, `balance_due 0`):
| Case | Form `advance_payment` / method | Booking advance | `charge.advance_payment` (resp = LR = folio) | Ledger rows |
|---|---|---|---|---|
| A (order 1232640) | 500 card | 0 | **500** · due 42,924 · folio `payment_mode card` | `500 card advance` |
| B (1232641) | 0 | 1,000 upi | **1,000** (D2 carry, not zeroed) | `1000 upi advance` |
| C (1232642) | 500 upi | 1,000 upi | **1,500** (incremental, not 2,000) | `1000 upi` + `500 upi` |
Matches the BE table rows 3, 1 and 4. Rent/GST unchanged across cases (43,424).

UI re-smoke (QA agent, `/app/test_reports/iteration_4.json`, business date 2026-09-21): **S-411 case 1 PASS twice** — 'Smoke 411B' (order 1232644) and 'Smoke 411D' (1232645): CheckInPage advance ₹500 Card → folio **Advance Paid ₹500, Balance ₹1,600** (2,100 − 500), ledger row present. Case 2 (booking advance + check-in advance) is **not reachable from the legacy UI** — `NewBookingPage` has no advance field (nb-name/phone/email/adults/children/checkin/checkout/amount only) → covered by API case C above; the new M1 form carries the advance. QA left 3 stays in-house; FE settled them by TAB (`log_cleanup_qa4.txt`: 1232643 due 2,100 · 1232644 due 1,600 · 1232645 due 1,600 → all paid, rooms → `hk`).
Testability nits (LOW, intake): `ci-amount` and `ci-advance` share `placeholder="0"` (testids fine); legacy NewBookingPage lacks an advance input (already BUG-432 area).

**S-411 → PASS. G4-04 B-7 smoke complete:** S-410 ✓ S-402 ✓ S-421/426 ✓ S-429/430 ✓ S-425/428 ✓ S-411 ✓ · S-418 N/A (BUG-418 lands in CR-385 M6 by O-5).

## BQ-385-21 — `held_fallback` live sample
BE hunted `fetch-rates` windows 2026-10, 2027-01, 2028-01, 2030-06: rates exist everywhere; BE will not delete live CM rates for a chip demo. Code emits `source: "held_fallback"` when an **added** calendar night has no CM rate. **Outcome:** no live sample obtainable in this pack → FE ships the chip on the enum (unit-tested on a synthetic fixture, V-M4-00). **G4-03(b) now needs an owner waiver** ("waive held_fallback live demo") or an ops rate-wipe outside this pack.
