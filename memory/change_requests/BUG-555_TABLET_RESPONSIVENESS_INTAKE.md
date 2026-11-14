# BUG-555 — Intake (Gate 1)
## Tablet Responsiveness — screens and controls cut off on tablet displays (UMBRELLA, 4 work packages)

**ID:** BUG-555
**Type:** BUG (umbrella — OD-555-01 = a)
**Date:** 2026-10-15
**Registered by:** INTAKE agent (owner session 2026-10-15)
**Sprint:** oct_cr_batch
**Area:** Layout / Responsive (Order Entry, Dashboard shell, Header, Reports module)
**Priority:** P1 — feature broken on owner's primary tablet use (Order Entry), no workaround
**Risk:** HIGH — touches R5 hotspots `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`; Sidebar mounted by 94 pages. Item risk = highest WP risk.
**Fast Lane eligible:** NO
**Related:** BUG-537, CR-414, BUG-539
**Investigation:** `evidence/BUG-555/BUG-555_INVESTIGATION_REPORT.md` (CLOSED, HIGH confidence, 9/10 steps)

---

## 1. Code Reality Check
**NONE** for the BUG-555 scope. `grep "BUG-555" frontend/src` → 0 hits. Zero `sm:/md:/lg:`/`matchMedia` in OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, CategoryPanel.jsx (investigation §3.1). Prior tablet work (CR-414 / BUG-537 / BUG-539) exists exactly as registry states (investigation §6).

## 2. Duplicate Check
**RELATED** (not duplicate).

| ID | Status | Relationship |
|---|---|---|
| BUG-537 | GATE_5A_IMPLEMENTED | Dashboard header/grid tablet fix (via CR-414). BUG-555 covers remaining screens + the 1024–1077 desktop-header gap CR-414 left. |
| CR-414 | GATE_5A_IMPLEMENTED | Keyed header + grid to 1023. OD-555-10 splits them: header <1280, grid stays <1024 (`ChannelColumnsLayout.jsx:107` unchanged). |
| BUG-539 | GATE_5A_IMPLEMENTED | `flex-wrap` on PLReportPage + ConsumptionReportPage only (OD-539-01=B). WP-D extends the same pattern to the other 34 report pages. |

## 3. Device Context
Samsung Galaxy Tab A7 Lite (SM-T225) + Xiaomi Redmi Pad SE 4G — 8.7", 1340×800 panel, DPR 1.33–1.5 → CSS **893×533** (default) / **1006×600** (small display setting); portrait **533×893**. Used via production URL + installed PWA; tablets primarily for Order Entry; reports incl. Settlement are opened on tablets.

## 4. Root Causes (all FE_BUG, HIGH confidence)
| # | Symptom | Break point | Threshold |
|---|---|---|---|
| 1 | Order Entry + Collect Payment cut off on the right | `OrderEntry.jsx:1683/1685/1863` + `CategoryPanel.jsx:32` — 176 + 367 (min-content) + 384 = 927px | breaks < 927px |
| 2 | Dashboard sidebar scrolls away | `DashboardPage.jsx:1668/1737 min-h-screen` + `Sidebar.jsx:492 h-screen` not sticky | every size tested |
| 3 | Header Add button off-screen | `Header.jsx:433/441/765-769` | portrait ≤ 600; desktop header 1024–1077 |
| 4 | Report toolbars don't wrap | `SettlementReportMockup.jsx:359-390` et al. — 34/41 report pages | Settlement ≤ 1280, Item Ledger ≤ 1024 |

(Root cause #5 — Firebase — split out to **BUG-560** per E-3.)

## 5. Work Packages (Phase 1 scope lock)
| WP | Scope | Files | Risk | Order |
|---|---|---|---|---|
| **WP-A** Order Entry | 3-pane fluid ≥800 landscape (`w-96` → responsive, `min-w-0` middle pane, wrapping toolbar); `CategoryPanel` `w-44` responsive; CPP container only; **new full-screen portrait "Rotate your tablet" overlay** | `OrderEntry.jsx` (R5), `CategoryPanel.jsx`, `CollectPaymentPanel.jsx` (R5, container only) | HIGH | 1 |
| **WP-D** Report toolbars | `flex-wrap gap-y-2` sweep on 34 report-module toolbars | 34 × `pages/reports-module/*.jsx` | LOW | 2 |
| **WP-B** Sidebar | hamburger / slide-over <1280, self-contained in `Sidebar.jsx`; desktop `sticky top-0` pin; Dashboard shell height | `Sidebar.jsx`, `DashboardPage.jsx:1668/1737` (R5) | HIGH | 3 |
| **WP-C** Header | tablet header <1280 (closes 1024–1077 gap); Add visible down to 533 | `Header.jsx:433-441, 765-769` | MEDIUM | 4 |

**Phase 2 (out of scope):** portrait Order Entry UX (drawer/stacked), ≤600 widths, phones.

## 6. Frozen Owner Decisions (verbatim from registry `locked_decisions` / report §5c)
| ID | Decision |
|---|---|
| OD-555-01 | a — single umbrella BUG-555 with 4 work packages (WP-A Order Entry, WP-B Sidebar hamburger + desktop pin, WP-C Header <1280 + Add <=600, WP-D 34-page report toolbar sweep) |
| OD-555-02 | c — landscape-only Order Entry, full-screen blocking rotate overlay in portrait; drawer/stacked in Phase 2 |
| OD-555-03 | Phase 1 landscape-first (follows OD-555-02/04); Phase 2 = mobile + portrait Order Entry |
| OD-555-04 | Phase 1 floor: landscape >=800px all screens; portrait >=533px Dashboard+Reports; Order Entry landscape-only; 7in/phones -> mobile phase |
| OD-555-05 | b — hamburger/slide-over sidebar on tablets inside Sidebar.jsx + sticky top-0 pin on desktop |
| OD-555-06 | a — flex-wrap sweep across all 34 report-module toolbars |
| OD-555-07 | Firebase crash reclassified P2 (prod+PWA: Push supported, no overlay) |
| OD-555-08 | Work order WP-A Order Entry > WP-D Reports > WP-B Sidebar > WP-C Header |
| OD-555-09 | No PWA manifest orientation lock |
| OD-555-10 | Header+sidebar tablet mode <1280; grid stacking stays <1024; desktop >=1280 untouched |
| OD-555-11 | Pipeline: INTAKE -> Gate 2 Impact Analysis -> design agent tablet mockups -> owner design review -> Gate 3 plan -> Gate 4 GO -> build -> QA at 893x533 / 1006x600 / 533x893 |
| E-3 Firebase | b — register as separate P2 BUG, full Gate 2-3 (no direct-fix skip) → **BUG-560** |

**Open owner decisions:** NONE.

## 7. Evidence
- Screenshots: `evidence/BUG-555/L01–L05` (landscape), `P01–P02` (portrait); owner screenshots 1–4
- Measurements: `evidence/BUG-555/BUG-555_measurements.json`, `BUG-555_resolution_matrix.json` (16 viewports × 4 screens)
- Repro scripts: `BUG-555_repro_landscape_script.py`, `BUG-555_repro_portrait_script.py` (password masked)
- Steps to reproduce: report §7 of handover `handover/SESSION_HANDOVER_2026_10_15_BUG555_INVESTIGATION.md` (iframe emulation at 893×533 / 533×893)
- Curl output: not applicable (no backend involvement)
- Source: OWNER-REPORTED (+ WP-D AGENT-DISCOVERED)
- Confidence: CONFIRMED (reproduced via DOM measurement)

## 8. Blast Radius
- ~40 files: 6 core (`OrderEntry.jsx`, `CategoryPanel.jsx`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `Sidebar.jsx`, `Header.jsx`) + 34 × `pages/reports-module/*.jsx`
- Hotspot files touched: **YES** — `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx` (R5)
- Estimated scope: **LARGE**
- Owner approval required at Gate 4 (3+ hotspot files).

## 9. Known Traps (for Planning)
- Sidebar mounted by 94 pages — hamburger must be self-contained in `Sidebar.jsx`.
- Keep `ChannelColumnsLayout.jsx:107` at 1023 (OD-555-10).
- R5 hotspots → full gate flow + regression checklist (order → settle → report cycle).
- CPP is container-only in WP-A — no financial logic touched (R6).

## 10. Next
PLANNING Gate 2 (Impact Analysis only) → design agent mockups at 893×533 / 1006×600 / 533×893 → owner design review → Gate 3.


## 11. Post-intake update (2026-10-15)
Gate 2 closed. OD-555-12..17 locked — see `impact/BUG-555_IMPACT_ANALYSIS.md` §9. CollectPaymentPanel.jsx, CartPanel.jsx, DashboardPage.jsx removed from scope; WP-B risk → MEDIUM; WP-D = 39–40 files.

## 12. Gate 3 revalidation (2026-10-15)
Plan `plans/BUG-555_IMPLEMENTATION_PLAN.md` revalidated line-by-line at HEAD (`plans/BUG-555_PLAN_REVALIDATION_2026_10_15.md`): 100% anchor match, 1 MED finding (desktop Add button would have grown 4px — fixed with `max-sm:` scoping), 8 LOW alignments to the approved mockup. OD-555-18 = static rotate icon. Plan v2. 44 files unchanged. Awaiting Gate 4 GO.
