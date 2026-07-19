# Design Reference Ruling — 2026-07-18 (RESTORED · reverses prior consolidation)

## Ruling

**Both** of the following mock files are the **canonical final design references** going forward. Neither supersedes the other. They own different CR scopes.

| File | Owns CR(s) | Sub-module scope |
|---|---|---|
| `/app/frontend/public/__dev/recipe_bulk_editor_mockup.html` | **CR-073** (Recipe Bulk Editor) | **Bulk Recipe Management** — spreadsheet-style inline editor for recipes + sub-recipes + addon-recipes |
| `/app/frontend/public/cr072-inventory-mockup-v5-full.html` | **CR-075-A, CR-075-B, CR-077 (Receive), CR-078, CR-079, BUG-201** | Full Inventory module — 9 anchor screens (`#screen-dashboard`, `#screen-current-stock`, `#screen-smart-purchase`, `#screen-receive`, `#screen-audit`, `#screen-ingredients`, `#screen-recipes`, `#screen-vendors`, `#screen-wastage`) |

## History

- **Prior ruling (2026-07-18 morning):** "we shd maintian one refrrence as final mock ups to avoid confusion." → the standalone Recipe Bulk Editor mock was marked SUPERSEDED and merged into v5 as `#screen-recipes`.
- **Revised ruling (2026-07-18 evening):** Owner instructs both files are canonical again. Rationale: Recipe Bulk Editor is a distinct sub-module (bulk recipe management) with its own CR ownership; overloading v5's `#screen-recipes` risks confusion during the CR-073 implementation.

## Practical implications for planning agents

1. **CR-073 planning + implementation:** always dereference to `/__dev/recipe_bulk_editor_mockup.html`. Do NOT edit or delete this file.
2. **Inventory bundle work (CR-078/CR-079/CR-075-A/CR-075-B/CR-077 Receive/BUG-201):** dereference to `cr072-inventory-mockup-v5-full.html` anchor screens.
3. **The v5 `#screen-recipes` anchor** in the inventory mock remains but is now understood as a *thumbnail preview* of what CR-073 delivers · the full workflow lives in the standalone recipe editor mock.
4. **When both mocks disagree on a shared UI element** (e.g., recipe row visual language): the mock owning that CR wins. If CR-073 recipe display evolves, v5 mock's preview may become out-of-sync — that's acceptable · no re-merge required.

## Handover impact

- Session handover `SESSION_HANDOVER_2026_07_18_INVENTORY_PLANNING_CLOSE.md` line 42 stated the recipe bulk editor was SUPERSEDED. This DOC now amends that claim.
- All future session handovers must reference **both** mocks in their "Handover Artifacts" table when planning any inventory or recipe work.
- CR-073's plan/intake docs should keep the standalone mock as the canonical design reference (unchanged from Gate 3 Plan).
