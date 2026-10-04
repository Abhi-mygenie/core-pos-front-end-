# QA REPORT — sep_bug_closure Wave 1 (CR-386 · BUG-453 · BUG-451) — 2026-09-24 — ROUND 1

**Role:** QA (Gate 5b) · **Commit under test:** `3783ee8` · **Handover:** `handover/QA_HANDOVER_SEP_BUG_CLOSURE_WAVE1_2026_09_24.md`
**Precondition:** Registry synced YES · EXIT GATE 5/5 PASS ✅
**Environment:** preview (REACT_APP_BACKEND_URL) → preprod.mygenie.online · account alias FIVESTAR_OWNER (restaurant 739, 433 products)
**Executors:** testing_agent `/app/test_reports/iteration_1.json` (automated) + `/app/test_reports/iteration_2.json` (authenticated) + agent curl probes

## Result: **PARTIAL — no Wave 1 defect found; 13 cases blocked by external preprod KDS timeout**

| # | Test | Result | Severity | Evidence |
|---|---|---|---|---|
| VA-1 | Manifest served 200 JSON | PASS | — | iteration_1 |
| VA-2 | 3 PNGs 200 image/png (magic bytes) | PASS | — | iteration_1 |
| VA-6 | Head tags ×3 (+ SVG favicon kept) | PASS | — | iteration_1 |
| VA-7 | `yarn build` exit 0, assets in build/ | PASS | — | build log |
| VA-8 | Authenticated doc: manifest href fetch 200, theme-color #329937, 0 console errors login→loading | PARTIAL PASS | — | iteration_2 (dashboard render part blocked) |
| VA-3/4/5 | Chrome install / standalone / push icon | OWNER MANUAL (Gate 6) | — | cannot automate |
| VB-1 | Fix A race unit tests (1),(4) | PASS | — | jest 4/4 |
| VB-2 | Mute registry unit tests (2),(3) | PASS | — | jest 4/4 |
| VB-13 | Build + `BUG-453` markers in 4 files + test | PASS | — | grep |
| VB-12 | Existing `ScanOrderPopOut.test.jsx` | NOTE | NOTE | **22/29 red at clean HEAD `7aa95c4` too** (stash-verified) — pre-existing, not Wave 1 |
| VB-3..VB-9 | Runtime mute/sound/snooze on dashboard | **BLOCKED** | — | dashboard unreachable (KDS timeout) |
| VB-10/11 | BUG-034 dedup / POS2-007 tone with real FCM | OWNER MANUAL (Gate 6) | — | FCM not receivable headless |
| VC-1 | `grep "limit: 500" src/` = 0; `DEFAULT_LIMIT: 2000` = 1 | PASS | — | grep |
| VC-2 | `getProducts()` defaults unit test; `getAllProducts` gone | PASS | — | jest 3/3 |
| VC-3/VC-7 | Boot products request | **PASS (VC-7 small-menu)** | — | captured `get-products-list?limit=2000&offset=1&type=all`; API total_size 433 ≤ 500 → all in one page; agent curl: 200 in 9.9 s |
| VC-4 | Item 501+ searchable | N/A on fivestar (433) — OWNER MANUAL on yabyum | — | — |
| VC-5 | Category counts | BLOCKED | — | dashboard unreachable |
| VC-6 | Sidebar refresh `limit=2000` | BLOCKED | — | dashboard unreachable |
| VC-8 | LoadingPage tier/retry unchanged | PASS (retry UI exercised by KDS failure: "Retry Failed (1) — Attempt 1 of 3") | — | iteration_2 |
| VC-9 | Build | PASS | — | — |
| R-1 | Walk-in OrderEntry | BLOCKED | — | dashboard unreachable |
| R-3 | LoadingPage sequencing | 6/7 stations SUCCESS; KDS FAIL (external) | ENV | see backend brief |

**Totals:** 22 scoped · 12 PASS · 1 PARTIAL PASS · 1 NOTE (pre-existing) · 1 N/A · 13 BLOCKED/OWNER-MANUAL · **0 FAIL attributable to Wave 1**

## Blocker (environmental, not a Wave 1 finding)
`POST /api/v1/vendoremployee/station-order-list` (KDS) for fivestar takes ≥90 s (agent curl: attempt 1 client-timeout at 90 s, attempt 2 HTTP 200 at 90.0 s) > POS 60 s axios timeout → boot never reaches `/dashboard`. `stationService.js` is untouched by commit `3783ee8`. Brief: `backend_briefs/BACKEND_BRIEF_KDS-TIMEOUT-FIVESTAR_2026_09_24.md`.

## Observations (NOTE, no action in this sprint)
1. LoadingPage shows "Products 51 of 433 loaded" — `loaded` is post-`foodFor==='Normal'` filter, `total` is raw `total_size`. Pre-existing display semantics (productTransform L47-48), unchanged by BUG-451; may confuse VC-3 reading on yabyum (compare **request** `limit=2000` and API `total_size` vs returned count, not the filtered counter). Candidate intake.
2. `ScanOrderPopOut.test.jsx` 22/29 red pre-existing → candidate intake.

## Coverage
Files changed 13 → files with ≥1 executed test: 13/13 (static/unit/curl). Runtime coverage of `DashboardPage.toggleSnooze` + `NotificationContext` guard: **unit + static only** until dashboard reachable.

## Registry spot-check
`CR-386`, `BUG-451` → status `GATE_5A_IMPLEMENTED…`, sprint `sep_bug_closure` → **SYNCED**.

## Next
Round 2 needed for VB-3..9, VC-5/6, R-1 once either (a) preprod KDS responds < 60 s for fivestar, or (b) owner supplies a restaurant account whose KDS loads. VA-3/4/5, VB-10/11, VC-3/4 on yabyum → owner smoke (Gate 6). No Bug Fix role needed — zero Wave 1 failures.
