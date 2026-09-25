# SESSION HANDOVER — CR-376 Gate 3 FINAL · owner-review script for next agent
**Date written:** 2026-09-25
**Written by:** PLANNING agent (AGENT_PROMPT_ALPHA v0.7 Role 2) — end of revalidation session
**For:** the next agent, whose job is to **present the final CR-376 plan to the owner, collect answers to the 4 open decisions + blockers, and only then hand to IMPLEMENTATION on a verbatim "CR-376 Gate 4 GO"**
**Language:** English only
**Supersedes:** `SESSION_HANDOVER_2026_09_25_CR376_PLAN_REVALIDATION.md` (keep for audit trail; this file is the operative one)

## SELF-ASSESSMENT (mandatory header)

| Dimension | Score | Notes |
|---|---|---|
| **Registry synced?** | ✅ | `registry.json` CR-376: GATE 3 REVALIDATED + R11 probe, `sprint_key=sep_bug_closure`, `open_decisions=[OD-376-07,08,09,10]`, `mockup`, `evidence[]`. CR_REGISTRY row · CONTROL_DASHBOARD · PRD updated. |
| **Scope drift?** | ✅ None | `git status --short frontend/src` → 0. Only `frontend/public/cr376-menu-switch-mockup.html` (static mockup, no bundle impact) + memory docs. |
| **Outputs complete?** | ✅ | Plan revalidated · IA §11 · intake OD table (07–10) · R11 probe evidence · live before-screenshots · HTML mockup · this handover |
| **Credentials scrubbed?** | ✅ | Owner account stored ONLY as alias **QA_OWNER** in gitignored `memory/test_credentials.md`. No literal anywhere else. |

---

## 1. State in one paragraph
CR-376 (Menu Switch, Design A = per-station Local Setting) is at **Gate 3, plan revalidated at HEAD on 2026-09-25**. Code Reality NONE. Owner explicitly said **"stay at gate 3"** and **"don't jump gate"**. The 2026-09-11 plan is still executable, but revalidation + the R11 API probe surfaced **4 open owner decisions** that change either the plan's scope (OD-09, OD-10) or its look (OD-07, OD-08). Nothing in `src/` has changed. **Gate 4 has NOT been given.**

## 2. What the next agent must do (in order)
1. **STEP -1 boot** per `AGENT_PROMPT_ALPHA.md`: read this handover, offer the standard menu, owner will most likely pick "continue".
2. Open the mockup with the owner: `<preview>/cr376-menu-switch-mockup.html` → section **"★ Highlighted for owner"** (id `#findings`) shows each decision visually, option (a) vs (b).
3. Ask the owner for **OD-376-07 / 08 / 09 / 10** (table in §4). Record verbatim answers in `change_requests/CR-376_MENU_SWITCH_ORDER_ENTRY_INTAKE.md` OD table (`Locked by: Owner (date)`).
4. Ask the **blocker questions** in §5. Record answers in the intake doc under a new "## Gate 4 Preconditions" block.
5. Apply the decisions to the plan (PLANNING role, doc-only, ~10 min):
   - OD-09 = (a) → remove E6 + E7 from `plans/CR-376_IMPLEMENTATION_PLAN.md`; scope lock → 5 files; hotspots → 2; verification matrix drop V10/V11; registry `files[]` drop LoadingPage/useRefreshAllData.
   - OD-10 = (b) → **STOP. Re-plan needed** (CategoryPanel.jsx enters scope; new IA §12 + plan edit E8). Do not proceed to Gate 4 in the same session.
   - OD-08 = (b) → rewrite E5h JSX block to card-row markup (title + badge + description left, pills right, `data-testid` unchanged).
   - OD-07 = (a) → E4e becomes a firm edit; (b)/(c) → mark E4e "NOT IN SCOPE" and add the exception note to OD-376-01.
6. Update `registry.json` (`open_decisions` → [], status → `GATE 3 LOCKED — awaiting Gate 4 GO`), CR_REGISTRY, dashboard.
7. Only when owner types the verbatim **"CR-376 Gate 4 GO"** → switch to IMPLEMENTATION role, run the plan's **Pre-Entry Verification** greps first (any drift → back to Planning).

## 3. Evidence the next agent can cite
| Item | Path |
|---|---|
| Products API probe (258 items; Normal 117 · Premium 141 · Party 0 · Aggregator 0) | `memory/evidence/CR-376/CR-376_products_probe_2026_09_25.json` |
| Category × menu matrix (45 cats: 25 Premium-only, 18 Normal-only, 2 shared; 7 duplicate names) | `memory/evidence/CR-376/CR-376_category_menu_matrix_2026_09_25.json` |
| Impact Analysis + revalidation addendum | `memory/impact/CR-376_IMPACT_ANALYSIS.md` §11 |
| Implementation Plan (revalidated; line anchors at HEAD) | `memory/plans/CR-376_IMPLEMENTATION_PLAN.md` |
| Plain-English design change map | `memory/plans/CR-376_DESIGN_CHANGE_MAP.md` |
| HTML mockup (before/after + highlighted decisions) | `frontend/public/cr376-menu-switch-mockup.html` |
| Live "before" screenshots (Local Settings, Order Entry 116 items, Customer modal) | taken 2026-09-25 via screenshot tool; not persisted (tool sandbox) — re-take with QA_OWNER if needed |

## 4. Open owner decisions (present these — do not decide for the owner, R3)

| OD | Question (plain English) | (a) | (b) | Agent recommends | If chosen, plan effect |
|---|---|---|---|---|---|
| **07** | Customer-modal Favourites/Smart Suggestions can add a Normal item into a Premium order after CR-376. Scope them to the active menu? | scope `menuItems` to `activeMenuProducts` — 1 line, `OrderEntry.jsx:2844`; off-menu rows become inert | leave as-is (exception to OD-376-01) / (c) park | **(a)** | (a) E4e firm; (b)/(c) E4e removed + exception note |
| **08** | How should the "Active Menu" selector look in Local Settings? | pills under a heading (as planned) | card row matching neighbouring toggle-cards | **(b)** | E5h JSX rewrite only, same file |
| **09** | Plan edits E6/E7 scope a category `itemCount` that **no screen renders**. Drop them? | drop E6 + E7 → 5 files, 2 hotspots | keep for data correctness | **(a)** | (a) scope lock shrinks; LoadingPage.jsx leaves scope |
| **10** | Category column lists categories that are empty for the active menu (already true today: 25 Premium-only cats on Normal stations). Hide them now? | accept, raise follow-up CR | hide now → `CategoryPanel.jsx` enters scope | **(a)** | (b) = **re-plan required**, Gate 4 cannot be same session |

## 5. Blocker / precondition questions to ask the owner
1. **Sequencing on `OrderEntry.jsx`:** 7 items share the file and are awaiting Gate 6 owner smoke (CR-104, BUG-281, BUG-305, BUG-335, BUG-398, BUG-399, BUG-452). Lines are disjoint (parallel-safe). Implement CR-376 **now in parallel**, or **after** those clear Gate 6?
2. **Sprint gate order:** `sep_bug_closure` is itself at Gate 6 (owner smoke pending for BUG-451…460, CR-386/387). Does CR-376 implementation wait for that smoke, or run alongside?
3. **Test restaurant for QA/smoke:** QA_OWNER's restaurant has Normal + Premium (no Party). Is that the intended smoke restaurant, or should QA also get a Normal-only restaurant to prove "zero change" (V15/V16)?
4. **Design A confirmation:** switching in Local Settings takes effect on the **next** Order Entry open, not live in an open order. Still acceptable? (Was implied by OD-376-02; confirm once more since the mockup makes it concrete.)
5. **Follow-ups to register now or later:** (i) hide inert off-menu suggestion rows (`CustomerModal.jsx`), (ii) hide empty categories per active menu (`CategoryPanel.jsx`), (iii) per-restaurant (server-side) active menu instead of per-device. Register as CRs today, or after CR-376 ships?
6. **BUG-461 Fast Lane** (P0, unrelated, 1 line in `IngredientBulkEditor.jsx`) is still waiting for "FAST LANE APPROVED" — remind the owner so it isn't lost behind CR-376.

## 6. Do-NOT list for the next agent
- Do **not** write any `src/` code before the verbatim "CR-376 Gate 4 GO".
- Do **not** pick (a)/(b) on behalf of the owner (R3).
- Do **not** print the QA_OWNER email/password anywhere (R20) — alias only.
- Do **not** touch `CategoryPanel.jsx`, `CustomerModal.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` unless a re-plan puts them in scope.
- Do **not** delete `frontend/public/cr376-menu-switch-mockup.html` until CR-376 is CLOSED (owner reference).

## 7. Final response format used this session (PLANNING)
```
Planning complete: CR-376
Stage: Implementation Plan (Gate 3) — revalidated + R11 probe + mockup
Code reality: NONE
Risk: MEDIUM
Files WILL change: productTransform.js, activeMenuPrefs.js (NEW), MenuContext.jsx, OrderEntry.jsx, StatusConfigPage.jsx, [LoadingPage.jsx, useRefreshAllData.js — pending OD-376-09]
Files WILL NOT touch: CartPanel.jsx, CollectPaymentPanel.jsx, CategoryPanel.jsx (pending OD-376-10), CustomerModal.jsx, AddCustomItemModal.jsx, orderTransform.js, AppProviders.jsx, services, reports, backend
Owner decisions: OD-376-07 / 08 / 09 / 10 OPEN
Docs: plans/CR-376_IMPLEMENTATION_PLAN.md · impact/CR-376_IMPACT_ANALYSIS.md §11 · intake OD table · plans/CR-376_DESIGN_CHANGE_MAP.md · frontend/public/cr376-menu-switch-mockup.html
Next: owner locks OD-07…10 + answers §5 → PLANNING applies → "CR-376 Gate 4 GO" → IMPLEMENTATION. Gate 4 NOT given.
```

## 8. Owner question answered at session close — "If there are 4 menus, will 4 tabs show?"

**Answer: YES in Local Settings, NO tabs in Order Entry.**

| Place | 2 menus (probe restaurant) | 4 menus (e.g. Normal / Party / Premium / Buffet) |
|---|---|---|
| Local Settings → "Active Menu" selector (E5h) | 2 pills: Normal · Premium | **4 pills**, one per distinct `food_for` value that has ≥1 active, non-disabled item (Aggregator always excluded). Labels come straight from DB (OD-376-04). `flex-wrap` → wraps to a second line if needed. |
| Order Entry header (E4c) | one passive chip "Premium Menu" when ≠ Normal | still **one chip** — the active one. **No tab strip in Order Entry** (OD-376-02 Design A: waiter never switches). |
| Order Entry grid (E4b) | Premium items only | items of the one active menu only |

Mechanism: `availableMenuTypes = [...new Set(products.filter(p => p.isActive && !p.isDisabled && p.foodFor !== 'Aggregator').map(p => p.foodFor))]` (MenuContext E3b) → N menus in data = N pills. Nothing is hard-coded to 2 or 3. Verified by design; not yet exercised live (probe restaurant has only Normal + Premium — see P3 in §5).

**Three multi-menu edge cases the presenter should mention (added to plan risk register):**
1. **Pill order** — `Set` keeps first-seen order from the products array, so pill order could look random. Plan note: sort `availableMenuTypes` with `Normal` first, rest alphabetical (1-line `.sort()` inside E3b — same file, no new scope).
2. **Saved menu later loses all items** — it drops out of the selector (no pill), but `localStorage` still holds it → Order Entry shows the OD-376-06 empty-state until the manager re-saves. Expected behaviour, keep as a Gate 6 smoke step.
3. **Many menus on a narrow station screen** — pills wrap; no horizontal scroll needed. If >6 menus ever appear, consider a dropdown (follow-up, not CR-376).

**Handover status: SESSION CLOSED 2026-09-25. Gate 3. Zero code. Next agent = presenter (see §2).**
