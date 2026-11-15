# QA Handover — BUG-555 — 2026-10-15

## 0. Registry Sync Confirmation
Registry synced: YES
Items: BUG-555
Sprint: oct_cr_batch
Status: GATE_5A_IMPLEMENTED
EXIT GATE: ALL 5 PASSED
- ☑ registry.json: GATE_5A_IMPLEMENTED, sprint=oct_cr_batch, 44 files, qa_handover path
- ☑ BUG_TRACKER.md: row updated with IMPLEMENTED + exit gate note
- ☑ FILE_OWNERSHIP.md: 44 files listed under BUG-555 IMPL 2026-10-15
- ☑ Code markers: BUG-555 in all 44 changed files (grep confirmed)
- ☑ Compile: webpack compiled with 1 warning (pre-existing react-hooks/exhaustive-deps — 0 new)

**WP-C HELD:** Header.jsx C1–C11 deferred until CR-414 QA PASS. 43 files touched, not 44.

---

## 1. Verification Matrix (from Plan §6)

### WP-A — Order Entry

| Edit | Check | Viewports | Method | Self-Test |
|---|---|---|---|---|
| A4–A6, A8 | Right pane `getBoundingClientRect().right ≤ innerWidth`; no horizontal overflow | V1 V2 V4 | DOM overflow check | Compile PASS ✅ |
| A5, A10 | Middle header wraps to 2 rows; search on row 1; icon group right-aligned on row ≤2; all 5 icons ≥40px | V4 V1 | Screenshot + DOM rect | Code verified ✅ |
| A8–A9 | Category rail 128px <1280, 176px at V6; long names truncate with `title` | V1 V6 | DOM width of `category-panel` | A8: `w-32 xl:w-44` = 128/176px ✅; A9: title={} added ✅ |
| A2–A3, A7 | `order-entry-rotate-overlay` visible at V3 (533×893); absent at V1/V2/V6; `backdropFilter` contains `blur`; icon static | V3 V1 V6 | testid presence + computed style | State+MQ code verified ✅ |
| A7 | Add 2 items → rotate to portrait → back to landscape → same items in cart | V1↔V3 | Resize sequence | MANUAL/QA |
| A7 | Overlay above an open modal | V3 | Open modal at V1, resize to V3 | z-[120] > z-[100]/z-[110] ✅ |
| WP-A regression | Place order → Collect Bill → settle | V1+V6 | E2E | MANUAL/QA |

### WP-D — Report Toolbars

| Edit | Check | Viewports | Method | Self-Test |
|---|---|---|---|---|
| D1–D40 | Each toolbar: no element right>innerWidth; controls wrap | V1 V3 | Loop 40 routes overflow check | Post-scan: 0 NOWRAP ✅ |
| D1–D40 | Desktop toolbar single row, pixel-identical | V6 | Screenshot diff 5 sample pages | MANUAL/QA |

### WP-B — Sidebar

| Edit | Check | Viewports | Method | Self-Test |
|---|---|---|---|---|
| B2–B6 | `<1280`: `sidebar-rail` 56px visible; `sidebar-hamburger-btn` opens `sidebar-drawer` (280px) + `sidebar-drawer-backdrop` (blur); backdrop/Escape/nav-item closes; closed drawer: visibility hidden, inert set, Tab never focuses inside drawer | V1 V5 | Click flow + keyboard | Code: invisible+inert+Escape+pathname effect ✅ |
| B3 | localStorage `mygenie_sidebar_expanded` unchanged after open/close drawer | V1 | Read before/after | Local state only, setIsExpandedProp never called on open ✅ |
| B4 | ≥1280: sidebar in-view after scrolling (sticky top-0) | V6 | Scroll + rect | `sticky top-0` when !isTablet ✅ |
| B4 | CR-052 flyout works when collapsed at ≥1280 | V6 | Click flow | `flyoutItem && !isExpanded` still reads local `isExpanded` ✅ |
| B | Logout, Switch Restaurant, sound toggle, view toggles inside drawer | V1 | Click flow | MANUAL/QA |

---

## 2. Regression Tests (R5 hotspot)

1. Login → Dashboard → open table → add items → Collect Bill → settle → report shows order (V6 + V1).
2. Walk-in order separately (R13).
3. Shift table / merge table from Order Entry header icons at V4 (800×500).
4. Scan-order edit opens Order Entry with cart intact.
5. Desktop 1920: Dashboard, Order Entry, Settlement report, Sidebar expanded/collapsed — identical to pre-change baseline.
6. CR-414 header cases deferred (WP-C on hold).

---

## 3. Viewports

- V1: 893×533 (tablet landscape)
- V2: 1006×600
- V3: 533×893 (tablet portrait — rotate overlay expected)
- V4: 800×500
- V5: 1024×768
- V6: 1920×800 (desktop regression)

---

## 4. Credentials + Environment

- Login: preprod.mygenie.online (test restaurant credentials from `/app/memory/test_credentials.md`)
- Preview URL: https://pos-frontend-app-4.preview.emergentagent.com
- Port: 3000 (local), supervisor: running, PID: see `supervisorctl status frontend`
- WP-C HELD: Header.jsx NOT touched — CR-414 header QA cases unchanged.
