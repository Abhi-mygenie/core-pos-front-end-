# SESSION HANDOVER — CR-414 / BUG-537 Gate 3 Plan Revalidation → ready for Implementation
**Date:** 2026-10-13 · **Role this session:** PLANNING (Gate 3 revalidation, no code) · **Risk:** HIGH · **Sprint:** oct_cr_batch
**Last session (2026-10-12):** CR-412 implemented (Gate 5a) · CR-414 v1 plan written, OD-414-01/02 locked.

---

## 1. What the next agent must do (owner instruction, verbatim intent)

> Next agent works on **CR-414 + BUG-537 implementation**. First **explain the v2 plan to the owner in plain English**, then **ask for Gate 4 GO**. Do NOT write code before the owner says "Gate 4 GO".

Boot sequence for the next agent:
1. Read `/app/memory/control/AGENT_PROMPT_ALPHA.md` (v0.7) → role = **IMPLEMENTATION** (approved plan exists, GO still pending).
2. Read `/app/memory/plans/CR-414_IMPLEMENTATION_PLAN.md` **v2** — §0 findings, §1 decisions, §2 anchors A–O, §4 the 15 edits, §6 desktop diff table, §7 verification matrix.
3. Explain the plan in plain English to the owner (use §3 of this handover as the script — the owner is non-technical and asked "why will it be broken / what is the fix" for each point last session).
4. Ask: **"Gate 4 GO?"** Also tell the owner OD-414-05 (dropdown mirrors pill bar) was locked on agent recommendation and can still be overridden now — only edit E-1d changes.
5. On GO → Entry Verification A–O (`sed` commands in plan §2) → apply 15 edits in 3 parallel blocks → compile → self-verify V-1..V-17 → EXIT GATE 5/5 → QA handover + session handover → **call `testing_agent`** (frontend) for CR-414 **and** the still-untested BUG-539, CR-413, CR-412.

---

## 2. What was done this session

| Step | Result |
|---|---|
| Owner asked to revalidate v1 plan ("I don't want any desktop issue or something else coming up") | Full HEAD trace of `Header.jsx` (693 L), `ChannelColumn.jsx` (361 L), `ChannelColumnsLayout.jsx` (260 L), `DashboardPage.jsx` L415-1800, `Sidebar.jsx` L488-497, evidence `INV-TABLET-001_layout_metrics.json` |
| Findings | **4 blockers + 3 major + 7 notes** — v1 plan would not compile and would not fix 10" tablets (details §4 below) |
| Plan rewritten | `plans/CR-414_IMPLEMENTATION_PLAN.md` → **v2**: 15 edits (was 9), same 3 files, ~120 lines, anchors A–O verified ✅, desktop diff table, V-1..V-17 |
| New owner decisions surfaced + locked | OD-414-03=A · OD-414-04=A · OD-414-05=A (see §5) |
| Docs synced | IA `impact/CR-414_IMPACT_ANALYSIS.md` §12 addendum · intake `change_requests/CR-414_…_INTAKE.md` addendum · `control/registry.json` (CR-414 + BUG-537 → `GATE_3_PLAN_COMPLETE_V2`, open_decisions=[]) · `control/CR_REGISTRY.md` L9/L11 · `control/BUG_TRACKER.md` BUG-537 row |
| Code | **NONE changed.** Frontend still compiling clean (1 pre-existing warning). |

---

## 3. Plain-English script for the owner (next agent: read this out, then ask for GO)

**The problem.** On Android tablets the dashboard was built for big screens only: the top bar needs 1008px of width, each channel column is a fixed pixel box (344px for Dine-In), and channels always sit side by side. On a 7" tablet (600px) Search and Add fall off the right edge; on a 10" tablet (768–960px) Add still falls off.

**What we will change — tablet only (screens narrower than 1024px):**
1. **Top bar becomes one compact row:** Logo · one filter button · a Search box that takes the remaining space · Add. The Web/POS counter chip and the Platform (POS/Web/Scan) dropdown are hidden on tablet.
2. **The filter button** replaces the row of pills. Tap it → a menu drops down below the bar showing *exactly the same filters the pills show today*: in the normal (channel) view that is YTC / Preparing / Ready / Served / Pending Pay / Paid / Schedule; in status view it is Delivery / TakeAway / Dine In / Room. Tick to turn on several; menu stays open while you tick, closes when you tap elsewhere. Same rule as today: you can't untick the last one.
3. **Search** stretches to fill the row and its results panel is pinned to the right edge so it never hangs off-screen.
4. **Channels stack vertically** (Dine-In, then Take-Away, then Delivery…), each one **full width**, each as tall as its cards need; you scroll the whole dashboard down. Cards auto-fill each row (about 3 table cards per row at 600px, 4 at 768px; order cards 1 per row at 600, 2 at 768).
5. **`< >` arrows** still save your column preference; on tablet the grid auto-fills so you won't *see* a change until you're back on desktop.

**Desktop (1024px and wider): nothing changes.** Every edit is written as "below 1024 do X, otherwise exactly what the code does today". The plan has a line-by-line table proving this (§6), and a 1280px screenshot will be compared pixel-for-pixel against the BUG-537 evidence screenshot.

**Known, not part of this fix:** if the left sidebar is *expanded* (280px) the desktop top bar already overflows at 1280 today. Candidate for a separate small CR later.

**Scope:** 15 small edits in 3 files — `Header.jsx`, `ChannelColumn.jsx`, `ChannelColumnsLayout.jsx`. Not touching DashboardPage, Sidebar, OrderEntry, payments, services or data.

**Ask:** "Gate 4 GO?"

---

## 4. Why v1 was unsafe (for the record — all fixed in v2)

| # | Severity | v1 gap | v2 fix |
|---|---|---|---|
| F1 | BLOCKER | `{/* CR-414 */}` placed inside JSX opening tags (E-3b, E-3c) → compile error | JS `//` comments on own line |
| F2 | BLOCKER | `md`=768 threshold → 768/800/960 tablets still get the 1008px desktop header | `lg`=1024 + `matchMedia('(max-width:1023px)')` |
| F3 | BLOCKER | `ChannelColumn.jsx` L191-202 inline px `width/minWidth` (`cols×160+gap+16`, `flex-shrink-0`) untouched → stacked column still 344px, grid fills only 344px (the `empty_right_px:170` symptom) | tablet: `width:'100%'`, `minWidth:0` |
| F4 | BLOCKER | `h-full` on each stacked channel → every channel one screen tall | tablet: `h-auto` |
| F5 | MAJOR | Pills are dual-mode (status pills + Schedule in default channel view; channel pills in status view). v1 dropdown = channels only via dead exclusive-select `handleChannelToggle` → status filters lost, multi-select wrong | dropdown mirrors nav, reuses the pills' exact handlers |
| F6 | MAJOR | Search `w-48`/`w-64` fixed → row ≈580px > 530px usable at 600 | tablet: `flex-1 min-w-0 w-full`; desktop `lg:w-48/lg:w-64` |
| F7 | MAJOR | Results panel `w-96` centred under a right-edge box → clips off-screen | tablet: `right-0 w-80`; desktop `lg:left-1/2 lg:-translate-x-1/2 lg:w-96` |
| F10 | NOTE | V-11 "tap `>` → count changes" would false-fail on tablet (auto-fill ignores count) | V-11 verifies localStorage/console |
| F11 | NOTE | no separator between stacked channels | `gap-2 lg:gap-0` |
| F12 | NOTE | pre-existing: expanded 280px sidebar overflows header at 1280; 1024-1078 marginal | documented, out of scope |

---

## 5. Decisions (all locked — none open)

| OD | Choice | Source |
|---|---|---|
| OD-537-01/02/03 | tablets 600 + 768+ · single-row header w/ dropdown · vertical stacking, auto-fill, desktop unchanged | owner 2026-10-12 |
| OD-414-01 | A — dropdown opens downward below header | owner 2026-10-12 |
| OD-414-02 | A — `< >` arrows + localStorage persist on tablet | owner 2026-10-12 |
| OD-414-03 | A — desktop/tablet threshold **`lg` = 1024px** (supersedes `md`=768 wording) | owner 2026-10-13 |
| OD-414-04 | A — stacked channels natural height, whole dashboard scrolls | owner 2026-10-13 |
| OD-414-05 | A — dropdown mirrors pill bar (status+Schedule / channels by view) | agent rec accepted 2026-10-13 — **owner may override at Gate 4; only E-1d changes** |

---

## 6. Implementation quick-reference (from plan v2 §4)

| Block | File | Edits |
|---|---|---|
| 1 | `src/components/layout/Header.jsx` | E-1a state+ref · E-1b click-outside (mousedown+touchstart) · E-1c `hidden lg:flex` nav · E-1d tablet filter dropdown · E-1e `hidden lg:flex` PlatformDropdown · E-1f `px-2 lg:px-4` · E-1g `hidden lg:flex` counter chip · E-1h fluid search · E-1i results panel anchoring |
| 2 | `src/components/dashboard/ChannelColumn.jsx` | E-2a `isTablet=false` prop · E-2b `h-auto`/`100%`/`minWidth 0` on tablet · E-2c fluid grid (`140px` table / `280px` order) |
| 3 | `src/components/dashboard/ChannelColumnsLayout.jsx` | E-3a `isTablet` via matchMedia · E-3b pass prop (JS comment!) · E-3c `flex-col lg:flex-row gap-2 lg:gap-0` |

Imports already present: `ChevronDown`, `Check` (Header L2); `useState`, `useEffect` (Layout L1). No new imports, no new files.
Code markers target: `grep -c CR-414` ≥ 9 / ≥ 4 / ≥ 4.
Screenshots required: 600×960, 768×1024, 960×600, 1024×768, 1280×800 (collapsed sidebar) + 1280 vs `evidence/BUG-537/l1280.png`.

---

## 7. Other open items (unchanged this session)
- **Testing debt:** `testing_agent` has NOT yet been run for BUG-539, CR-413, CR-412 (system reminder outstanding) — fold into the CR-414 test run.
- BUG-538 (role-based discount in CPP) — blocked on OD-538-01.
- CR-410 — backend-blocked (`loyalty_info` in `update-order` socket).

## 8. Environment
Frontend on :3000 via supervisor, compiling clean (1 pre-existing warning). Preview URL = `REACT_APP_BACKEND_URL` in `/app/frontend/.env`. Test creds: `/app/memory/test_credentials.md`.
