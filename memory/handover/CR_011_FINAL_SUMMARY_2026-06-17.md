# CR-011 Owner Smoke — FINAL CONSOLIDATED SUMMARY
**Date:** 2026-06-17
**Role:** Investigation Agent → handoff to Planning
**Status:** Investigation complete. All F-1 → F-10 root-caused. Awaiting Planning Gate 2.

---

## 1. Owner decisions LOCKED

| # | Decision | Implication |
|---|---|---|
| **F-1** | Contract amendment — sentinel `"default"` for no-variation rows; never `"[]"` | Backend 1-line fix + FE defensive remap + contract update |
| **F-2** | Breakfast bucket = **06:00 – 10:00** (5 hours: 06,07,08,09,10). Lunch stays `[11,15]`, Dinner stays `[18,23]` | FE-only, ~5 lines in HourlySalesMockup.jsx |
| **F-3** | ✅ Identified — tooltip `₹0 · 684 orders · 28.7% of total` = Partial payment with zero revenue. Known **BE-1** gap (partial-payment legs not split). Already parked. No new work. | None |
| **F-4** | Need full contract + consumption understanding (this doc §3) | Definitions panel + FE display fix for `0 min` |
| **F-5** | Remove "By Station (Sold)" from **ALL** Item Ledger tabs (not just All Items) | FE-only, ~30-60 lines |
| **F-6** | **Option A — remove the DAILY PAYMENT TRENDS chart.** No backend brief needed | FE-only, ~30 lines |
| **F-7** | Contract amendment — backend must publish RFM band cutoff rules | Backend brief + contract |
| **F-8** | Out of scope CR-011 → **spawn CR-011.C** (CRM wiring for S36) | Separate CR |
| **F-9** | Table Transfer **becomes a NEW screen (S31.B)**. Room Transfer (S31) stays for true rooms only | Backend split + new FE screen |
| **F-10** | Gate Room Transfer sidebar/route by `features.room === true` | FE-only, ~5 lines |

---

## 2. F-4 — Backend contract + how FE consumes prep/serve/handover

**This was a knowledge gap. Here's the truth:**

### Contract says (insights v2.0, line 230)
```
insights-dashboard.kitchen: { avg_prep_minutes, avg_serve_minutes, sla_breach_count, has_prep_data }
```
That's it. **Only top-level aggregate KPIs**, only on the `insights-dashboard` endpoint. The contract has **NO per-channel prep/serve/handover spec**.

### How S10 (Prep & Serve Time) actually works
**The screen does NOT use the `insights-kitchen` contract.** It uses `prepServeService.js`, which:

1. Calls `POST /api/v2/vendoremployee/report/order-logs-report` (the 37 MB raw orders endpoint, the same one used by Dashboard/Sales/Items/etc.)
2. Pulls each order's raw timestamps: `created_at`, `ready_at`, `serve_at`
3. **Computes prep/serve/total CLIENT-SIDE per channel** using these rules (from `prepServeService.js` lines 7–9):
   ```
   Kitchen orders:  created_at → ready_at (gap > 30s) → serve_at
                    prep = ready_at − created_at
                    serve = serve_at − ready_at
                    total = serve_at − created_at

   Bar orders:      created_at ≈ ready_at (gap ≤ 30s) → serve_at
                    prep ≈ 0 (auto-ready)
                    serve = serve_at − created_at

   Direct orders:   no timestamps, OR all ≈ created_at (auto-billed)
                    prep ≈ 0, serve ≈ 0
   ```
4. Bins by channel (POS / Delivery / Takeaway) and averages the three values **independently**.

### So why does Takeaway HANDOVER = 0 min?

Because for Takeaway orders, `serve_at ≈ ready_at` — the cashier marks the order ready AND served in a single click when the customer picks it up. The FE computes `serve_at − ready_at ≈ 0 min` and displays `0`.

**This is data behaviour, not a defect.** The POS doesn't currently capture a distinct handover event for takeaway. Two clean fix paths:

| Path | What | Where |
|---|---|---|
| **A — FE cosmetic** | Render `—` instead of `0 min` when `avgServe === 0 && orders > 0` | `PrepServeTimeMockup.jsx` line 530, 2-line fix |
| **B — Backend tracking** | Add a real `handover_at` timestamp to takeaway orders at the POS, persist in order logs | Product decision + backend + POS UX work |

### Why TOTAL ≠ PREP + SERVE
Each of `avgPrep`, `avgServe`, `avgTotal` is averaged **independently** over the order set. Orders with missing `ready_at` are excluded from `avgPrep` but may still be in `avgServe` / `avgTotal`. The mean of sums ≠ sum of means when subcomponents have different missing-data patterns. **Statistically correct, just non-intuitive.**

### Status badge thresholds (line 116–122 of PrepServeTimeMockup.jsx)
| Avg minutes | Badge | Colour |
|---:|---|---|
| 0 or null | "No Data" | grey |
| ≤ 10 | "Excellent" | green |
| ≤ 15 | "Good" | blue |
| ≤ 20 | "Needs Attention" | amber |
| > 20 | "Critical" | red |

Badge uses `avgPrep` if available, falls back to `avgServe`.

### Contract gap to fix (C-V2.1-5)
The contract should explicitly add a new section: *"S10 Prep & Serve Time — computed client-side from order-logs-report. Per-channel breakdown is NOT a backend response. Backend ONLY provides the top-level `kitchen` aggregate in `insights-dashboard`."* Plus document the client-side rules. This prevents future re-implementation drift.

### Owner decision still pending
- F-4: which fix path? **A** (FE cosmetic, ship now) or **B** (proper handover tracking, separate CR)?

---

## 3. F-9 — Room Transfer Trail (S31) — what to show + table transfer split

### Owner ruling
- Backend has `order_in` discriminator upstream: `'RM'` (direct room), `'SRM'` (shifted to room), `null` (table/counter).
- Backend currently dumps EVERYTHING into `insights-locations.room_transfers[]` without consulting `order_in`.
- Fix: backend must split into two arrays + FE gets a new screen S31.B for Table Transfers.

### S31 (Room Transfer Trail) — keep as-is, but for rooms ONLY

| Section | What it shows today | Keep? |
|---|---|---|
| **Page title** | "Room Transfer Trail" — "Room-to-room order transfer history" | ✅ Keep |
| **Date controls** | From/To + 7D/30D/MTD presets + Apply + Download | ✅ Keep |
| **KPI strip (3)** | Total Transfers · Top Source Room · Avg Items/Transfer | ✅ Keep |
| **Transfer Log table** | Order # · **From Room** · → · **To Room** · Items · Date · Time | ✅ Keep, with `from_room=0` rendered as "—" |
| **Sidebar visibility** | Visible to all restaurants today | ❌ Gate by `features.room === true` (F-10) |

**Data source after backend fix:** `insights-locations.room_transfers[]`, filtered to `order_in IN ('RM','SRM')` server-side. Only rows where a real room is involved.

### S31.B (Table Transfer Trail) — NEW screen

**Purpose:** Surface table-to-table moves (customer changed table mid-meal) for cafe-style restaurants. Useful for service-quality audits ("why did 61 guests change tables in May?") and dispute resolution.

**Mirror the S31 layout (same designer pattern):**

| Section | Content |
|---|---|
| **Page title** | "Table Transfer Trail" — "Table-to-table order transfer history" |
| **Date controls** | Same as S31: From/To, 7D/30D/MTD, Apply, Download |
| **KPI strip (3)** | **Total Transfers · Top Source Table · Avg Items/Transfer** |
| **Transfer Log table** | Order # · **From Table** · → · **To Table** · Items · Date · Time |
| **Sidebar visibility** | Show whenever `features.dine_in === true` (i.e., every restaurant that has tables — almost all) |

**Resolve table_id → table_name** using the `by_table[]` block in the same `insights-locations` response (already loaded). Render `from_table = 0` as "—" / "Walk-in" (same convention as S31).

**Optional enhancements (P3, future):**
- "Reason for transfer" column (if backend ever captures it)
- Filter by waiter (which server made the most transfers)
- Highlight rapid transfers (< 5 min apart on same order — usually mistakes)

### Backend brief B-130-7 (UPDATED scope)
Backend must:
1. In `insights-locations` aggregation, **read `order_in` from each transfer event**.
2. Route into:
   - `room_transfers[]` if `order_in IN ('RM','SRM')`
   - `table_transfers[]` if `order_in IS NULL` AND a `table_id` change occurred
3. Add new array `table_transfers[]` to response with identical shape but using `from_table_id` + `from_table_name` + `to_table_id` + `to_table_name` keys.
4. Add `items_count` (currently always 0 — see F-9b).
5. For palmhouse: `table_transfers[]` may be empty (or small); `room_transfers[]` carries the real signal.
6. For cafe103: `room_transfers[]` should be empty; `table_transfers[]` carries all 61.

---

## 4. Full work plan post-investigation

### A. FE-only sub-CR (CR-011.A) — ship together
Single sub-CR covering 6 items (all FE-only, no backend dependency to ship):

| # | Item | File(s) | Effort |
|---|---|---|---|
| F-1 | Defensive remap `"[]" → "No Variation"` in Variations sub-tab | `ItemSalesHybridMockup.jsx` | 2 lines |
| F-2 | Add Breakfast 06–10 KPI card | `HourlySalesMockup.jsx` | 5 lines |
| F-4 (A) | Render `0 min` as "—" on Takeaway Handover | `PrepServeTimeMockup.jsx` | 2 lines |
| F-5 | Remove "By Station (Sold)" block from ALL Item Ledger tabs | `ItemSalesHybridMockup.jsx` | 30–60 lines |
| F-6 | Remove "DAILY PAYMENT TRENDS" chart; keep period totals only | `PaymentsMockup.jsx` | 30 lines |
| F-9 (cosmetic) | Render `from_room = 0` as "—" in S31 | `RoomTransfersMockup.jsx` | 3 lines |
| F-10 | Gate Room Transfer sidebar/route by `features.room === true` | `Sidebar.jsx` + `App.js` | 5 lines |

**Total scope:** ~80 lines across 5 files. Risk: **LOW**. No hotspot files. Eligible for Fast Lane subject to owner approval.

### B. Backend briefs to write (6)

| ID | What | Severity |
|---|---|---|
| B-130-2 | Publish RFM band cutoff rules — contract + (ideally) response | P2 |
| B-130-4 | Stop emitting `variations[].label = "[]"`; emit `"default"` | P2 |
| B-130-5 | Populate `room_transfers[].items_count` (and `table_transfers[].items_count` once split) | P2 |
| B-130-6 | Decide whether to add `handover_at` timestamp for takeaway | P2 (PRODUCT) |
| **B-130-7** | Split `insights-locations` into `table_transfers[]` + `room_transfers[]` using `order_in` discriminator | **P1** |
| B-130-8 | Contract clarity: `insights-locations` should surface `order_in`, `from_room_name`, etc. | P1 |

### C. Contract amendments (5)

| ID | What |
|---|---|
| C-V2.1-1 | `insights-items.variations[].label` sentinel = `"default"` |
| C-V2.1-2 | `insights-customers.rfm_bands` — band rules schema (R/F/M cutoffs documented) |
| C-V2.1-3 | `insights-locations` — add `table_transfers[]`, surface `order_in`, clarify id vs name |
| C-V2.1-4 | Document S10 Prep & Serve client-side computation; explicitly state backend does NOT provide `byChannel` aggregates |
| C-V2.1-5 | `room_transfers[].from_room=0` semantics — sentinel for "no source room (newly assigned)" |

### D. New screen (S31.B Table Transfer Trail)
- Treat as **Phase 3 Batch H extension** — same gate flow (Mockup → Sign-off → API wire → Validation)
- Build only AFTER B-130-7 ships (table_transfers[] in response)
- Mirror S31 visual + interaction model exactly
- Sidebar entry under "LOCATIONS" group

### E. New CR (CR-011.C — CRM wiring for S36)
- Spawn separate intake doc
- Owner to decide: stub S36 with "Coming Soon" banner during transition, OR leave visible?

### F. Already-parked backend item (no new work — keep parked)
- **BE-1:** Partial payment leg splits — affects F-3 (`₹0 · 28.7%`), S19 (Cashier Settlement), S20 (Gateway Recon), S33 (Cashier Activity)

---

## 5. Re-freeze impact (Screen Freeze Log update needed)

Items that **re-open** a previously-FROZEN screen — each will need an owner-attested re-freeze entry once shipped:

| Screen | Was | Reopens because | Re-freeze after |
|---|---|---|---|
| S5 Item Ledger | FROZEN 2026-06-05 + Batch B 2026-06-16 | F-1 remap + F-5 By Station removal | CR-011.A ships |
| S6 Order Ledger | FROZEN 2026-06-05 | — | (no change) |
| S8 Payments | FROZEN 2026-06-05 | F-6 chart removal | CR-011.A ships |
| S10 Prep & Serve | FROZEN 2026-06-07 | F-4 cosmetic + Definitions panel | CR-011.A ships |

Items 🟠 awaiting Gate ②, now with revisions baked in:
- S12 (F-2 breakfast added)
- S14 (F-3 confirmed = BE-1, no further work)
- S31 (F-9 cosmetic + F-10 gating + post-B-130-7 contract realignment)
- S36 (F-7 RFM explainer; F-8 → CR-011.C dependency)

Phase 3 Gate ② sign-off plan should batch:
- A first round of 22 screens that don't need any of these revisions
- A second round of 2 screens (S12, S14) after CR-011.A ships
- S31 split-out delayed until backend ships B-130-7

---

## 6. Open owner decisions remaining (2)

1. **F-4:** Path A (FE renders `—`, ship now) OR Path B (backend adds `handover_at`, separate CR)? Recommend **A** as immediate; **B** can be a future product CR if takeaway throughput matters.
2. **CR-011.C:** During CRM transition, stub S36 with "Coming Soon — wiring to CRM" banner, OR leave visible with the known phone-null issue?

---

## 7. Artifacts

| Doc | Purpose |
|---|---|
| `/app/memory/handover/CR_011_OWNER_FEEDBACK_LOG_2026-06-17.md` | Running log of all 10 owner observations + readbacks |
| `/app/memory/handover/CR_011_INVESTIGATION_REPORT_2026-06-17.md` | Round 1 root-cause findings (7/10 steps) |
| `/app/memory/handover/CR_011_INVESTIGATION_REPORT_R2_2026-06-17.md` | Round 2 contract deep-dive (9/10 steps) |
| `/app/memory/handover/CR_011_FINAL_SUMMARY_2026-06-17.md` | **This file — consolidated handoff to Planning** |
| `/app/memory/evidence/INSIGHTS_2026_06_17/` | 7 live API probe JSONs (cafe103 + palmhouse) |

---

## 8. Handoff to Planning Agent

Planning should produce, in this order:

1. **CR-011.A** (FE-only sub-CR) — Impact Analysis + Implementation Plan for the 7 FE changes (F-1, F-2, F-4-A, F-5, F-6, F-9-cosmetic, F-10). LOW risk. Likely Fast Lane.
2. **6 backend briefs** (B-130-2 / 4 / 5 / 6 / 7 / 8) — one doc per brief in `/app/memory/backend_briefs/`.
3. **5 contract amendments** (C-V2.1-1 through C-V2.1-5) — single doc in `/app/memory/contracts/CONTRACT_V2.1_AMENDMENTS.md`.
4. **CR-011.C intake** (new CR) — CRM wiring for S36. Just intake, planning deferred.
5. **S31.B Table Transfer Trail** — Phase 3 extension, planning queued behind B-130-7.

**No code, no docs in `/app/frontend`, no registry edits performed in this investigation cycle.** Registry will be updated by Planning Agent at Gate 2/3 of CR-011.A.
