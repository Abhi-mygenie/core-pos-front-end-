# QA Handover — CR-376-FU-B
## CategoryPanel: Hide Empty Categories for Active Menu + `Name (count)` + Default "All" + Popular Scoped

**Date:** 2026-09-26
**Written by:** IMPLEMENTATION agent (ALPHA v0.7 Role 3) — owner "CR-376-FU-B Gate 4 GO" 2026-09-26
**Plan:** `plans/CR-376-FU-B_IMPLEMENTATION_PLAN.md` · **IA:** `impact/CR-376-FU-B_IMPACT_ANALYSIS.md`
**Risk:** MEDIUM (OrderEntry.jsx R5 hotspot — additive edits only)

**Files changed:**
- `src/components/order-entry/CategoryPanel.jsx` — E1 (L6-8 props), E2 (L9-25 useMemo), E3 (L68 label)
- `src/components/order-entry/OrderEntry.jsx` — E4 (L102), E5 (L556-558), E6 (L1678-1679)
- `src/components/order-entry/__tests__/CategoryPanel.cr376fub.test.jsx` — NEW (E7)

---

## 1. Inherited from Plan (Verification Matrix results)

| V# | Edit | File | Verification | Self-Test Result |
|---|---|---|---|:---:|
| V1 | E2/E3 | CategoryPanel.jsx | Real cat count = active & non-disabled items by `categoryId` | PASS ✅ (unit) |
| V2 | E2 | CategoryPanel.jsx | 0-count category hidden (incl. disabled-only) | PASS ✅ (unit) |
| V3 | E2 | CategoryPanel.jsx | `All (0)` rendered alone when active menu empty | PASS ✅ (unit) |
| V4 | E2 | CategoryPanel.jsx | Popular = popular ∩ visible by `productId`; absent when setting OFF | PASS ✅ (unit) |
| V5 | E2 | CategoryPanel.jsx | Popular hidden when intersection = 0 even with setting ON | PASS ✅ (unit) |
| V6 | E2 | CategoryPanel.jsx | Row order Popular → All → cats | PASS ✅ (unit) |
| V7 | E4 | OrderEntry.jsx | Setting ON restaurant: Order Entry opens on **All (n)**, not Popular | **PENDING** — no browser creds |
| V8 | E2+E6 | both | Every visible row: click → grid tiles == bracket number; no empty grid except All (0) | **PENDING** — no browser creds |
| V9 | E5 | OrderEntry.jsx | Popular (n) → exactly n tiles, all in active menu | **PENDING** — no browser creds |
| V10 | E2 | CategoryPanel.jsx | QA_OWNER Premium station: 18 Normal-only cats absent; Normal station: 25 Premium-only absent | **PENDING** — needs QA_OWNER |
| V11 | ALL | both | Search + dietary filters still narrow grid; cart/place-order unchanged | **PENDING** — no browser creds |
| V12 | ALL | both | webpack 0 new warnings; test suite green | PASS ✅ (`webpack compiled with 1 warning` = pre-existing `isScheduled`) |

Self-test: **7/12 verified** (6 unit + compile). 5 browser checks pending credentials — see §5.
Unit run: `cd /app/frontend && CI=true npx craco test --watchAll=false --testPathPattern=CategoryPanel.cr376fub` → 6 passed.

---

## 2. Additional test cases (discovered during implementation)

| # | Test | Steps | Expected |
|---|---|---|---|
| A1 | Props default safety | Any restaurant with `showPopularCategory` OFF and Popular boot list empty | Panel renders All + cats, no console error (props default to `[]`) |
| A2 | Label truncation | Category with a very long name | Name ellipsises, no layout overflow in `w-44` panel; bracket may be cut (accepted OQ-B3) |
| A3 | `data-testid` continuity | Inspect rows | `category-all`, `category-popular`, `category-<id>` unchanged → existing QA selectors work |

---

## 3. Regression tests (R5 hotspot — from plan)

| # | What to verify | Why |
|---|---|---|
| R1 | Dine-in: open table → category → add item → cart total → place order | `getFilteredItems` touched (E5) |
| R2 | QSR / TakeAway / Delivery same flow | shared `OrderEntry` |
| R3 | Walk-in order (R13) | special flows same component |
| R4 | Search while on Popular tab → results only from popular ∩ active menu | E5 interacts with search branch |
| R5 | Setting OFF restaurant → no Popular row, default All, no errors | E2 gate |
| R6 | BUG-462 empty state still shows when active menu has 0 items (All (0) only row) | adjacent CR-376 fix |
| R7 | BUG-464 chip text + CR-376 menu chip unchanged | adjacent lines |
| R8 | Add Custom Item modal still lists all categories | uses raw `categories`, not panel list |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: CR-376-FU-B
Sprint: sep_bug_closure
EXIT GATE: ALL 5 PASSED
  1. registry.json → GATE_5A_IMPLEMENTED, sprint_key sep_bug_closure, completeness 4/7 ✅
  2. CR_REGISTRY.md row → Gate 5a IMPLEMENTED ✅
  3. FILE_OWNERSHIP.md → CR-376-FU-B section (3 files) ✅
  4. Code markers → 9 `// CR-376-FU-B` hits across CategoryPanel.jsx (5) + OrderEntry.jsx (4) + test header ✅
  5. Compile → webpack 0 new warnings ✅
```

---

## 5. Credentials + Environment

- URL: preview (see `/app/frontend/.env` `REACT_APP_BACKEND_URL`), frontend :3000 via supervisor.
- **Account: BLOCKED** — `/app/memory/test_credentials.md` is empty (gitignored; lost in the 2026-09-25 re-pull). Alias `QA_HYATT` (`owner@hyatt.com`) is referenced in prior QA reports but the password is not stored anywhere in memory (R20 compliant). Owner must restore `QA_HYATT` (and ideally `QA_OWNER` for V10) into `test_credentials.md` before Gate 5b.
- V7–V9, V11, R1–R8 runnable with `QA_HYATT`. V10 requires `QA_OWNER` (multi-menu restaurant).
- Login selectors: `login-email`, `login-password`. Panel selectors: `category-panel`, `category-all`, `category-popular`, `category-<categoryId>`.

```
Code done. QA handover at handover/QA_HANDOVER_CR376_FU_B_2026_09_26.md.
Items: CR-376-FU-B. Self-test: 7/12 verified (6 unit + compile); 5 browser checks pending credentials.
Registry synced: YES. EXIT GATE: 5/5 PASS.
12 + 3 test cases, 8 regression tests. Credentials: QA_HYATT (MISSING — owner to restore), QA_OWNER (V10).
```
