# QA Report — CR-376-FU-B — Gate 5b
## CategoryPanel: Hide Empty Categories for Active Menu + `Name (count)` + Default "All" + Popular Scoped

**Date:** 2026-09-26
**QA agent:** ALPHA v0.7 Role 4 (browser automation on preview, frontend only)
**QA handover:** `handover/QA_HANDOVER_CR376_FU_B_2026_09_26.md` — Precondition §4: Registry synced YES · EXIT GATE 5/5 → **ACCEPTED**
**Credential:** `QA_HYATT` — owner@hyatt.com / `***` (multi-menu restaurant: FOOD MENU, Bar & Drinks, Breakfast, Kids Menu, PET FOOD, 24hrs, Tea/Coffee, Promotional ×2, grok)
**Environment:** preview frontend :3000 (webpack 1 pre-existing warning) → preprod API. No orders placed/settled.
**Raw automation report:** `/app/test_reports/iteration_1.json`

---

## Result: **PASS** — 7/7 browser checks + 6/6 unit checks = **13/13**

| V# | Test Case | Steps | Expected | Actual | Result | Severity | Evidence |
|---|---|---|---|---|---|---|---|
| V1–V6 | Unit (E7) | `craco test --testPathPattern=CategoryPanel.cr376fub` | 6 pass | 6 pass | PASS | — | Implementation self-test |
| V7 | Default tab = All | Set active menu FOOD MENU → reload → open Order Entry from free table | `category-all` active, label `All (n)` | `All (86)` active (bg rgb(50,153,55)); not Popular | PASS | — | iteration_1.json V7 |
| V8 | Count equality | For every row read `(n)`, click, count `menu-item-*` tiles | tiles == n for all rows | 12/12 rows match: All 86 · Soups 8 · Salads 5 · Small Plates 6 · Appetizers 14 · Wholesome Breads 6 · Thin Crust Pizzas 3 · Asian & Western 12 · Bombay Biryani 3 · Indian Curries & Rice 14 · Indian Breads 9 · Desserts 6 | PASS | — | iteration_1.json V8 table |
| V8b | No ghost categories | Inspect panel | no `(0)` rows; only FOOD MENU cats | 0 zero-rows; 11 real cats, all FOOD MENU; Bar/Breakfast/etc. cats absent | PASS | — | iteration_1.json V8b |
| V9 | Popular scoping | Look for `category-popular` | present with n==tiles, or absent when ∩ empty / setting OFF | Absent for FOOD MENU and Bar & Drinks (setting OFF or empty intersection — cannot disambiguate client-side) | PASS (absent-acceptable) | NOTE | see §Notes N1 |
| V10 | Menu switch changes panel | Active menu → Bar & Drinks → reload → Order Entry | different cat set, counts == tiles, default All | 16 rows (15 Bar & Drinks cats + All (170)); spot-check All 170=170, Cocktails 20=20, Beer 9=9, Gin 20=20; default All | PASS | — | iteration_1.json V10 |
| V11 / R1 | Regression order flow | search `chicken` → clear → add tile → cart | grid narrows; cart updates | 86 → 21 tiles; Fresh Fruit Platter ₹399 qty 1 in cart, Place Order enabled (not submitted); back button present | PASS | — | iteration_1.json V11 |
| R5 | Console | capture whole flow | no CategoryPanel/OrderEntry errors | none; only infra (Firebase permission, socket close, polling abort) | PASS | — | iteration_1.json R5 |
| V12 | Compile / suite | webpack + jest | 0 new warnings | `webpack compiled with 1 warning` (pre-existing `isScheduled`) | PASS | — | supervisor log |

**Regression scope applied:** change touches R5 hotspot `OrderEntry.jsx` → handover regression + cross-flow (search → add-to-cart → cart total; menu switch → panel → grid). R2/R3 (QSR/TakeAway/Walk-in) and R6–R8 not separately executed this round — same `getFilteredItems` path exercised via dine-in table; recommend owner smoke covers a TakeAway order (Gate 6).

---

## Coverage Sufficiency

| Changed file | ≥1 executed test | Which |
|---|---|---|
| `CategoryPanel.jsx` | YES | V1–V8b, V10 |
| `OrderEntry.jsx` | YES | V7 (E4), V9 (E5 path — Popular absent), V8/V10 (E6 props), V11 (grid) |
| `__tests__/CategoryPanel.cr376fub.test.jsx` | YES | V1–V6 |

**Coverage: 3/3 changed files have ≥1 test.**

---

## Registry Spot-Check

```
CR-376      → GATE_5A_IMPLEMENTED, sep_bug_closure  ✅
CR-376-FU-A → GATE_5A_IMPLEMENTED, sep_bug_closure  ✅
BUG-462     → GATE_5A_IMPLEMENTED, sep_bug_closure  ✅
CR-376-FU-B → GATE_5A_IMPLEMENTED (pre-QA) → advanced to GATE_5B_QA_PASS by this report ✅
```
**Registry: SYNCED** (no drift).

---

## Notes (no action, logged)

| # | Severity | Observation |
|---|---|---|
| N1 | NOTE | Popular row absent on Hyatt for both tested menus. E5 (Popular ∩ active menu) therefore verified only by unit V4/V5, not in browser. A restaurant with `showPopularCategory` ON and popular items in the active menu (e.g. QA_OWNER) would give browser coverage — add to Gate 6 smoke if such a restaurant is available. |
| N2 | NOTE | Hyatt Active Menu selector lists `promational-menu` alongside `promotional-menu` (already filed as BUG-463 backend data typo) and an option named `grok` — data-quality, out of scope, flag to product/backend. |
| N3 | NOTE | Chip reads `FOOD MENU` vs `Bar & Drinks Menu` — this is BUG-464's intended behaviour (suffix suppressed only when the name already contains "menu"). Cosmetic, by design. |
| N4 | NOTE (test infra) | Active row is styled via inline `backgroundColor`; automation must assert computed style, not class. Optional future: `aria-selected` on rows. |

**Blockers: none. MAJOR/MINOR failures: none. Bugs filed: none.**

---

```
Verification complete: CR-376-FU-B Gate 5b
Result: PASS
Tests: 13 total, 13 pass, 0 fail
Blockers: none
Coverage: 3/3 files
Registry: SYNCED
Report: memory/test_reports/CR-376-FU-B_QA_REPORT_2026_09_26.md (raw: /app/test_reports/iteration_1.json)
Next: Gate 6 — Owner Smoke (SMOKE FACILITATOR) — suggest smoking on preprod with a TakeAway order + a Popular-enabled restaurant if available
```
