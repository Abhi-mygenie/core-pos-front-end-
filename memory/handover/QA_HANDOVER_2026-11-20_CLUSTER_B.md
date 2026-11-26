# QA Handover — Cluster B (Cancellation Reports) — 2026-11-20

**From:** IMPLEMENTATION · **Items:** BUG-714/715/716/717/718/729 · **Risk:** LOW/MEDIUM
**Files changed:** `pages/reports-module/CancellationsMockup.jsx`, `pages/reports-module/CancelDetailMockup.jsx` (2 files, 9 edits, additive)
**Plan:** `plans/CLUSTER_B_IMPLEMENTATION_PLAN_2026_11_19.md`

## 1. Verification Matrix (self-test results)
| # | ID | File:Line | Change | Self-test | QA to verify |
|---|----|-----------|--------|:---:|---|
| 1 | BUG-714 | Cancellations:662 | clear `scopeFilter` on non-all tab | ✅ code | On *All* set Scope=Full Order → switch to *Item-Level* → rows show (not 0) |
| 2 | BUG-715 | Cancellations:1015 | punch time IST | ✅ code | In a UTC browser, Punch Time matches Order time within the duration |
| 3 | BUG-729 | Cancellations:854 | x-axis "DD Mon" | ✅ code | Daily Trend x-axis shows e.g. "19 Nov", not "2026-" |
| 4 | BUG-715 | Detail:169 | punch time IST | ✅ code | Same as #2 on detail screen |
| 5 | BUG-716 | Detail:173 | empty-state row | ✅ code | Apply filters matching nothing → "No cancellations match the current filter" row |
| 6 | BUG-717a | Detail:122 | subtitle | ✅ code | Subtitle reads "…stage, scope, reason, staff & risk" |
| 7 | BUG-717b | Detail:163 | Order date format | ✅ code | Order cell shows "01 Oct, 10:23 pm", not "2026-10-01 22:23" |
| 8 | BUG-717c | Detail:144 | scope order | ✅ code | Scope dropdown = All / Full Order / Item-Level |
| 9 | BUG-718 | Detail:109 | export punch time | ✅ code | Export Excel/PDF → Punch Time column readable, not ISO |
| 10 | — | both | compile | ✅ `webpack compiled successfully`, 0 new warnings | — |

## 2. Regression
- Scope: 2 report files, not hotspots → regression = re-run the normal Cancellation report + detail flows (KPIs, charts, download Excel/PDF) and confirm nothing else shifted.
- Risk-tier badges, filters (stage/reason/staff/risk), and totals untouched — spot-check still correct.

## 3. Environment / Credentials
- Needs a **preprod login** (owner@… account) with a date range that has cancellations (e.g. Cafe 103 / restaurant with item-level cancels).
- **BUG-715/#2/#4 require a non-IST browser timezone** to observe the fix (set TZ=UTC).
- Route: `/reports-module/cancellations` and `/reports-module/cancellations` → Item Cancellation Detail.

## 4. Not done / deferred (do NOT fail QA on these)
- **BUG-729 "Revenue Loss chart empty"** — only the x-axis clip was fixed. The empty-loss half depends on the backend `insights-cancellations` `by_day` payload returning `order_loss`/`item_loss`; needs a live payload probe before any FE/BE fix. Flagged to owner.
- **Timezone** hard-coded `Asia/Kolkata` (IA recommendation) — owner-confirmable.
- **Report-screen export parity** (same raw-ISO punch time on the main report export) intentionally NOT changed (owner-gated, out of BUG-718 scope).

## 5. Registry Sync Confirmation
- registry.json: BUG-714/715/716/717/718/729 → IMPLEMENTED, gate GATE_4, sprint nov_cr_batch. ✅
- BUG_TRACKER.md: CURRENT line added. ✅
- FILE_OWNERSHIP.md: both files listed. ✅
- Code markers present in both files. ✅
- EXIT GATE: 5/5 PASS.
