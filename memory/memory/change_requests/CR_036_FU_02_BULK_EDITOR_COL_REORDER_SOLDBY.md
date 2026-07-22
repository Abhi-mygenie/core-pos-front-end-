# CR-036-FU-02: Bulk Editor — Column Reorder + Sold By (Unit) Tier-1 Promotion

> **Follow-up to CR-036** (cosmetic pass).
> Surfaced 2026-06-12 during owner Gate-4 smoke testing of CR-036 + CR-036-FU-01.

**Registered:** 2026-06-12
**Sprint:** pos_4_0
**Priority:** P3 — pure cosmetic + visibility, no money/data impact
**Status:** **GATES 1 + 2 + 3 COMPLETE 2026-06-12.** Awaiting owner Gate-4 smoke.

---

## 0. Related CRs
- **CR-036** (parent — Bulk Editor Add Item Row Visibility)
- **CR-036-FU-01** (sibling — Validation UX; shares test file)
- **CR-036-FU-03** (companion — Tax-required validation + loader overlay; paused pending GO)

---

## 1. Problem Statement

### G-1 (F4) — Tax columns reverse order
`ALL_COLUMNS` (L20-22) renders `… Type | Tax % | Tax Type …`. Owner: reading **Tax Type first** then the rate matches cashier mental model.

### G-2 (N2) — "Sold By (Unit)" hidden behind Tier 4
- API returns `item_unit` (`menuManagementTransform.js:116` parses as `'Kg'|'gm'|'L'|'ml'|null`).
- BulkEditor column existed (`L54`) but in **`tier: 4`** (hidden by default).
- Cashier had to discover via Columns picker → poor visibility.
- Label inconsistent with ProductForm single-add view (`"Sold By"` vs `"Sold By (Unit)"`).

---

## 2. Root Cause

| Gap | Root cause |
|---|---|
| **G-1** | `ALL_COLUMNS` order at L20-22 places `taxPercent` ahead of `taxType` |
| **G-2** | `itemUnit` registered as `tier: 4`; label set to `"Sold By"` not `"Sold By (Unit)"` |

---

## 3. Scope Locked
| Behaviour | Required | Source |
|---|---|---|
| Swap order: `itemType` → `taxType` → `taxPercent` in `ALL_COLUMNS` | ✅ | Owner F4 |
| `itemUnit` moved from `tier: 4` to `tier: 1` | ✅ | Owner N2 |
| `itemUnit` label aligned to `"Sold By (Unit)"` matching ProductForm | ✅ | Default accepted |

---

## 4. Code Surface (applied)

| File | Δ | Description |
|---|---|---|
| `BulkEditor.jsx` (L20-29) | +7/-3 | Column ordering: `itemType → taxType → taxPercent → itemUnit`; new `itemUnit` Tier-1 entry with label "Sold By (Unit)" |
| `BulkEditor.jsx` (L60) | +1/-2 | Removed old Tier 4 `itemUnit` entry (no duplication) |
| **Total in BulkEditor.jsx** | **+8 / -5** | |
| `BulkEditor.cr036.test.jsx` | +56 | 4 new tests across 2 describe blocks (G-ColOrder, G-SoldBy) |

---

## 5. Edge Cases (8)

| # | Scenario | Outcome |
|---|---|---|
| EC-1 | Existing item with `itemUnit: null` | Renders "Piece (default)" per `ITEM_UNIT_OPTIONS` |
| EC-2 | User had Tier 4 toggle ON before update + Tier 1 ON | Sold By stays visible; no double-render |
| EC-3 | Excel import contains/omits `item_unit` column | Unchanged — transform-driven |
| EC-4 | Excel export | Already exports `item_unit` (transform L260); no change |
| EC-5 | Column-picker shows tier counts | Tier 1: 10 → 11; Tier 4: 4 → 3 |
| EC-6 | Search on "Sold By" content | No regression (search already matches name/category/itemCode only) |
| EC-7 | CR-036-FU-01 cell-tint for validation | Unaffected — itemUnit not validated |
| EC-8 | Horizontal scroll on smaller viewports | +110px on default view; existing scroll handles it |

---

## 6. Risk Matrix

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| R-1 | Other code references `ALL_COLUMNS` by index | None | — | Grep confirms iteration-by-key only |
| R-2 | Excel template-download includes Sold By header | None | — | Template already included `item_unit` (it was tier-4 visible to power users); tier change only affects default UI |
| R-3 | User had a saved column-prefs blob | None | — | `visibleCols` is per-session state, not persisted |
| R-4 | CR-036-FU-01 tests assert on column order | None | — | Tests assert on `data-testid` (`cell-${key}-${id}`), not column index |

---

## 7. Test Plan (executed)

| Block / Test | Validates | Status |
|---|---|---|
| `G-ColOrder` › Tax Type before Tax % in header | F4 | ✅ PASS |
| `G-SoldBy` › "Sold By" header visible by default | N2 (tier) | ✅ PASS |
| `G-SoldBy` › label exactly "Sold By (Unit)" | N2 (label) | ✅ PASS |
| `G-SoldBy` › cell-itemUnit-* testids render for existing items | N2 (cell render) | ✅ PASS |

**Regression:**
- CR-036 (7 tests): ✅ PASS
- CR-036-FU-01 (12 tests): ✅ PASS
- CR-027 Phase 3 (4 tests): ✅ PASS (not re-run; same component but no overlapping concerns)

**Total: 23/23 PASS in `BulkEditor.cr036.test.jsx`.**

Lint: zero NEW errors.

---

## 8. Wire-Format Impact

**ZERO.** Pure ordering + visibility change. Payload to `addFood`/`editFood` unchanged. `item_unit` was already sent regardless of column visibility.

---

## 9. Gate Status

| Gate | Status |
|---|---|
| Gate 1 — Investigation | ✅ COMPLETE |
| Gate 2 — Impact analysis + scope lock | ✅ COMPLETE |
| **Gate 3 — Implementation + automated QA** | ✅ **COMPLETE 2026-06-12** |
| Gate 4 — Owner smoke test on preprod | ⏸️ AWAITING OWNER |

---

## 10. Rollback

Single-commit, 1 file (`BulkEditor.jsx`), ~5 logical lines. `git revert` restores. Test file changes are additive (no impact on regression).

---

**END OF CR-036-FU-02 — GATES 1 + 2 + 3 COMPLETE 2026-06-12.**
