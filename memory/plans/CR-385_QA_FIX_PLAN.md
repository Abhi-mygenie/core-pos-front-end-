# CR-385 QA Fix Plan — all 31 findings (QA-385-001 … 031)
Source: plans/CR-385_QA_AUDIT_REPORT.md · Target: `/app/frontend/public/cr385-frontdesk-mockup.html` v2.25 → **v2.26**
Status: DRAFT — awaiting owner approval (decisions D-A…D-F below).
Rule: every phase = fix → self-check → testing_agent regression against the §H checklist of the audit; phase is CLOSED only when its checks pass and the audit registry row is marked ✔ with the iteration number.

## 0. Decisions needed before Phase 1
| # | Decision | Recommendation |
|---|---|---|
| D-A | Re-open LOCKED **Checkout v2.9** and **Check-In v2.16** for money-integrity fixes (QA-001/002/008/011/012/021/029) | Yes, scoped to figures/validation only — no layout change |
| D-B | QA-009 tax on penalty | Refund = Prepaid − Penalty − GST (tax charged on top); rows then reconcile |
| D-C | QA-008 partial payment on Bill | Add "Amount received" input + Outstanding line; Credit → received ₹0, outstanding to folio |
| D-D | QA-029 Checkout confirmation | Two-step inline: first click turns button into "Confirm checkout ₹X" (3 s revert) — no dialog |
| D-E | QA-030 late arrival | Keep full booking charge; add note "Late arrival · full booking charged (policy)" |
| D-F | QA-018 terminology | Check-In (noun/title), check in (verb), Bill (UI), Checkout (one word), In-House, Housekeeping/HK, OOO spelled out in detail cells |

## Phase 1 — Money integrity (P0 + P1 data) · QA-001, 002, 003, 007, 011, 020
Change
- Add `bookingCharge(o)` = (CI_RATE[type] + plan supp) × nights; `prepaidOf(o)` reads stored `o.prepaid`. Use in: Arrivals row ₹ (show per-night with "/nt" or total — total), Check-In `ciContext.charge`, Modify current, No-Show/Cancel prepaid, Room Detail "Amount".
- Room-link IIFE: recompute `amt` from `CI_RATE[r.type]` (003).
- Guests seed: add `type` rate use, `prepaid`, `pah`; `cout ≥ cin+1` for 102–105 (007); `g.bal` = bookingCharge + GST − prepaid + fnb so row = bill.
- Bill room block reads guest record instead of `adv=100/roomAmt=1000` (001); guest card badge from `g.pah` (011).
- In-House "leaving today" = `cout === T` (020).
Test
- testing_agent: for a1, a2, room 102, 113: row ₹ = Check-In charge = Modify current = Cancel prepaid basis; Departures row balance = Grand Total; no cin=cout guest; In-House leaving = Departures today; regressions on Extend/Modify/No-Show arithmetic (iteration_21/25 checks).

## Phase 2 — Validation guards (P1) · QA-004, 005, 006
Change
- `exMissing`: collected > totalPayable → "Amount ≤ total payable".
- `modMissing` / `nbMissing`: adults ≥ 1, check-in ≥ today, collected ≤ payable; `min` attrs on date inputs; check-out `min` = check-in + 1.
- Balance-remaining display clamps at ₹0 (labels "Credit …" only where Check-In already does).
Test
- testing_agent negative cases: over-collect, past date, blank/0 adults on all three → primary disabled + readiness reason; happy paths unchanged.

## Phase 3 — Refund/penalty arithmetic + Bill payment state (P1) · QA-009, 008, 021
Change
- Refund due = prepaid − penalty − (SGST+CGST) per D-B; add "Total deducted" line.
- Bill: "Amount received" input (default = grand), Outstanding line, Credit sets received 0 (D-C); Checkout button label reflects received; disabled when received > grand or invalid.
- Bill adjustments/payment state moved to per-guest draft `BILL[g.id]` (021).
Test
- No-Show F. Almeida = 9,000 − 4,500 − 225 = 4,275; Cancel a1 = 3,000 − 1,000 − 50 = 1,950; Duplicate reason → 3,000. Bill: full / partial / ₹0 / Credit / over → Outstanding correct, Checkout state correct; coupon on bill 102 does not appear on bill 103.

## Phase 4 — Consistency pass (P2) · QA-012, 013, 014, 015, 016, 017, 019, 024
Change
- `money()` → Intl en-IN INR 2-dp, sign before symbol; drop `toFixed` in F&B (013). SGST→CGST order + one label "SGST · 2.5%" everywhere (012).
- All headers "✕ Close" (014). Footers: [Close][Primary] or [Back][Danger], same `.btn` height (015). No-Show = red everywhere (016). Refund-mode/Notify → `.ci-pill` segmented (017). Tile `fd(g.cout)` (019). `plural(n,unit)` helper for nights/days/Overdue (024).
Test
- testing_agent text assertions on every panel: dismiss label, tax order, formats (`₹1,234.57`, `−₹500`), "1 night"; visual screenshots of Bill vs Extend for footer parity.

## Phase 5 — Layout / responsive (P2–P3) · QA-010, 022, 023, 031
Change
- Check-In right pane: hide reference field until method chosen; tighten `.ci-money` padding; measure no internal scroll at 1366×768 (010).
- Tab sub-line: block wrapper with ellipsis (022). Search `min-width:200px`; ≤1100px third row action → kebab (023). Room Detail actions → footer; Mark-all-clean uses standard `.exp` chrome (031).
Test
- Viewport sweep script at 1920/1440/1366/1280/1024/768: no right-pane scroll, no clipped sub-line, single-line row actions ≥1024, search ≥200px; primary buttons on-screen.

## Phase 6 — Product-decision items + content (P3) · QA-018, 025, 029, 030
Change
- Terminology sweep per D-F (018). Column header "Booking ₹" (Arrivals) / "Balance" (Departures, In-House); Room Detail "Amount · total" (025). Two-step Checkout per D-D (029). Late-arrival policy note per D-E (030).
Test
- grep-based label audit (no "Check In"/"check-out" variants); Checkout two-step: first click label changes, second click checks out, timeout reverts; counters increment once.

## Phase 7 — Accessibility + hygiene (P3) · QA-026, 027, 028
Change
- `--mu` #767676; sidebar labels 10px; global `:focus-visible` ring; replace emoji with inline SVG (lucide paths) for 🔍 🧹 ⚠ ⋮ ▾ ✕ (026). Hooks route through `nsOrCancel()`; QA plan uses `a0` (027). Single `VERSION='v2.26'` used by title, #ctl, freeze(), disclaimers (028).
Test
- Contrast check script (≥4.5:1 on ≤12px text); Tab-key focus visible on chips/tabs/row buttons; `?open=a1:cancel` now opens No-Show; all version strings equal.

## Phase 8 — Close-out
- Full regression = audit §H checklist (14 items) via testing_agent at 1920×800 + 1366×768; screenshots for owner review of Bill, Check-In, Extend, No-Show.
- Update: audit registry (✔ per ID + iteration), DESIGN_DECISIONS (D-A…D-F + lock re-close at Checkout v2.10 / Check-In v2.17), QA_TEST_PLAN (new negatives), PRD, session handover. Mockup → v2.26.
- Owner acceptance = gate close. Safari/Edge pass remains a manual owner/QA step (not available here).
