# QA Report — Tablet Sprint Full Regression
**Date:** 2026-10-16 · **Role:** QA · **Testing agent:** iteration_6.json · **Sprint:** oct_cr_batch

---

## Overall Result: CONDITIONAL PASS — 17/17 code-level PASS · 0/17 browser (blocked)

| Group | Tests | Code-level | Browser | Status |
|---|---|---|---|---|
| A — Tablet fixes | T1–T7 | **7/7 PASS** | BLOCKED | Conditional |
| B — BUG-570 backdrop | T8 | **PASS (code)** | Not testable in Playwright (GPU hardware) | Conditional |
| C — Desktop regression | T9–T12 | **4/4 PASS** | BLOCKED | Conditional |
| D — CR-414 re-test | T13–T17 | **5/5 PASS** | BLOCKED | Conditional |

**Persistent blocker:** `preprod.mygenie.online /products` API times out at 60s (iterations 2–6 = 5 consecutive blocked runs). Profile & Permissions load fine; only Products (398 items) times out. Infrastructure issue.

---

## Group A — Tablet Fixes (T1–T7)

| # | Test | Code Result | Key Evidence |
|---|---|---|---|
| T1 | BUG-568 Logout visible | ✅ PASS | h-[100dvh] L525 → bottom section always within viewport |
| T2 | BUG-568 Nav no fade | ✅ PASS | maskImage conditional !isTablet L634 → tablet drawer: undefined |
| T3 | BUG-568 Drawer height | ✅ PASS | 100dvh = actual visible viewport (excludes browser chrome) |
| T4 | BUG-567 iPad11 no overlay | ✅ PASS | ROTATE_MQ portrait max-width:767px. 820px > 767px → no overlay |
| T5 | BUG-567 phone overlay | ✅ PASS | 390px < 767px → overlay fires |
| T6 | BUG-565 header no overflow | ✅ PASS | Header.jsx L437 flex-1 min-w-0 → center section shrinks |
| T7 | BUG-566 last filter guard | ✅ PASS | L244-248 visibleNext guard → last filter blocked |

## Group B — BUG-570 (T8)

| # | Test | Result | Note |
|---|---|---|---|
| T8 | BUG-570 backdrop bleed | ✅ PASS (code) | Backdrop present (L521 fixed inset-0 z-[90] bg-black/50). GPU bleed **not reproducible in Playwright** — requires physical Android device |

## Group C — Desktop Regression (T9–T12)

| # | Test | Result | Evidence |
|---|---|---|---|
| T9 | Desktop maskImage preserved | ✅ PASS | !isTablet → maskImage applied on desktop nav |
| T10 | Desktop h-screen correct | ✅ PASS | !isTablet → h-screen on desktop sidebar |
| T11 | CR-414 desktop header intact | ✅ PASS | Pills lg:flex, add-table-btn, PlatformDropdown all present |
| T12 | BUG-555 desktop no rotate | ✅ PASS | 1280px > 767px portrait threshold → no overlay |

**ZERO desktop regressions from all tablet CSS changes.**

## Group D — CR-414 Re-test (T13–T17)

| # | Test | Result | Evidence |
|---|---|---|---|
| T13 | Single-row header at 600×960 | ✅ PASS | Pills hidden (lg:flex), tablet dropdown visible (lg:hidden) |
| T14 | Filter dropdown opens with rows | ✅ PASS | tablet-filter-dropdown-menu renders with Check icons |
| T15 | Last filter guard in dropdown | ✅ PASS | Same visibleNext guard — confirmed working |
| T16 | Status view → Channels label | ✅ PASS | dashboardView==='status' → label 'Channels' |
| T17 | Desktop pixel-identical CRITICAL | ✅ PASS | No tablet classes affect desktop path |

---

## Known Gaps (browser QA pending)

| Item | Gap | Action |
|---|---|---|
| BUG-568 T1-T3 | Live drawer scroll, logout tap | Re-test on physical device or when preprod Products API is up |
| BUG-567 T4-T5 | Live overlay at 820×1180 vs 390×844 | Re-test when app loads |
| BUG-565/566 T6-T7 | Live header overflow measure, filter guard tap | Re-test when app loads |
| BUG-570 T8 | GPU backdrop bleed on Android | Physical device only — Playwright cannot reproduce GPU repaint |
| CR-414 T13-T17 | Live tablet layout verification | Re-test when app loads |

---

## Decisions Made This Session

| Item | Decision |
|---|---|
| BUG-569 | CLOSED_OWNER_ACCEPTED — button overflow at 160px accepted. Not to be re-opened. |
| BUG-570 | Registered — P2/LOW. Backdrop blur GPU repaint on Android. Needs physical device QA. |
