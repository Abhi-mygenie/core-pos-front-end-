# BUG-455 — Impact Analysis (Gate 2)
**Current Stock: `display_qty_text` not mapped or displayed — user sees "9.8 pkt" instead of "9 pkt 400 gm"**

**Planning agent:** 2026-09-24 · **Code Reality:** NONE · **Conflict Pre-Check:** CLEAN
**Risk:** MEDIUM · **R11 API Probe:** PASS (see §3)

---

## Header

| Field | Value |
|---|---|
| Code Reality | **NONE** — `grep display_qty_text\|displayQtyText src/` = 0 hits (re-verified 2026-09-24) |
| Conflict Pre-Check | **CLEAN** — none of the 4–5 target files touched by sep_bug_closure or any active CR/BUG |
| Hotspot files (R5) | **NONE** |
| Financial logic (R6) | **NO** — display only, no API payload, no calculation |
| OD open for IA | OD-455-02 LOCKED=YES (export) · OD-455-03 LOCKED=YES (shopping list) · **Gate 2 CLOSED 2026-09-24** |

---

## §1 · R11 — API Probe (MANDATORY, PASS)

**Endpoint:** `GET /api/v2/vendoremployee/inventory/stock-inventory`
**Restaurant:** kunafamahal.com · **Date:** 2026-09-24 · **Items returned:** 108

```
display_qty_text present: TRUE
Sample values:
  Base Cream        → display_qty_text = "1.05 gm"   (no conversion; equals plain qty)
  Biscoff Biscuit   → display_qty_text = "1 kg 640 gm"  ← mixed unit breakdown ✅
  Biscoff Syrup     → display_qty_text = "0 kg 660 gm"
  biscuit digestive → display_qty_text = "5 pkt"
```

**Bonus finding:** `display_qty_parts` also present in response — not mapped, not needed for this fix; note for future.

**Field name confirmed:** `display_qty_text` (snake_case, no alias). Safe to map as `displayQtyText` in transform.

---

## §2 · Data Flow Trace (Break Point)

```
API:       current_stocks[].display_qty_text = "1 kg 640 gm"
           get-inventory-master[].display_qty_text = (same field)

Transform: inventoryTransform.js
           fromAPI.stockItems()  L56–84  → field NOT mapped         ← BREAK POINT (S1)
           fromAPI.ingredients() L10–32  → field NOT mapped         ← BREAK POINT (S2)

State:     item.displayQtyText = undefined everywhere

UI render (CurrentStockPanel.jsx L325–326):
           <span>{item.displayQty || item.quantity}</span>           ← shows "9.8"
           <span>{item.displayUnit || item.unit}</span>              ← shows "pkt"
           → "9.8 pkt"   (display_qty_text "9 pkt 400 gm" never shown)
```

---

## §3 · Affected Files — Exact Edit Sites

### E0 — `src/api/transforms/inventoryTransform.js`
Add `displayQtyText` mapping in both transform functions.

| Function | Line | Current | Change |
|---|---|---|---|
| `fromAPI.ingredients()` | L24–25 (after `displayUnit`) | — | + `displayQtyText: item.display_qty_text \|\| '',` |
| `fromAPI.stockItems()` | L70–71 (after `displayUnit`) | — | + `displayQtyText: item.display_qty_text \|\| '',` |

**~2 lines added.** No existing line changed.

---

### E1 — `src/components/inventory/CurrentStockPanel.jsx`
Three sub-sites within this one file:

| Sub | Lines | What to change |
|---|---|---|
| E1a — table cell render | L325–326 | After `{item.displayUnit \|\| item.unit}` span, add: `{item.displayQtyText && item.displayQtyText !== \`${item.displayQty} ${item.displayUnit}\` && (<span className="text-xs text-slate-400 ml-1">({item.displayQtyText})</span>)}` |
| E1b — Excel export header | L119 | `'Current Stock'` → keep as-is; add new column `'Stock (text)'` alongside **only if OD-455-02 = YES** |
| E1c — PDF export row | L150 | same gate — **only if OD-455-02 = YES** |

**OD-455-02 LOCKED — YES.** **OD-455-03 LOCKED — YES.** All ODs locked. Gate 2 CLOSED 2026-09-24.

E1b/E1c and E4/E5 are now **IN SCOPE** — include in Gate 3 plan.

---

### E2 — `src/components/inventory/SubRecipeStockPanel.jsx`
| Sub | Lines | What to change |
|---|---|---|
| E2a — `getCurrentQty()` helper | L61–62 | Returns `qty` + `unit`. Add `text: s?.displayQtyText \|\| ''` to returned object. |
| E2b — qty display in table | L291–292 | After `{displayUnit}`, append muted `({displayQtyText})` when non-trivial (same guard as E1a). |

---

### E3 — `src/components/inventory/StockAuditPanel.jsx`
| Sub | Lines | What to change |
|---|---|---|
| E3a — book-stock display | L174–175 | After `{item.displayUnit \|\| item.unit}` span, append muted `({item.displayQtyText})` with same guard. |

---

### E4/E5 — `src/utils/purchasePlanner.js` + `src/components/inventory/smart/AutoShoppingList.jsx`
**OD-455-03 LOCKED — YES. Include E4 + E5 in Gate 3 plan.**

---

## §4 · Scope Lock

**Files WILL change:** `inventoryTransform.js` · `CurrentStockPanel.jsx` · `SubRecipeStockPanel.jsx` · `StockAuditPanel.jsx`
**Files will NOT touch:** `purchasePlanner.js` · `AutoShoppingList.jsx` (pending OD-455-03) · any hotspot file · `toAPI` functions (read-only display change) · any test file unless adding unit test for transform

**Total estimated lines:** ~10–15 lines added across 4 files.

---

## §5 · Open Owner Decisions (block plan)

| OD | Question | Impact if YES | Impact if NO |
|---|---|---|---|
| OD-455-02 | Add "Stock (text)" column to Excel / PDF export? | +E1b + E1c (~4 lines) | skip E1b/E1c |
| OD-455-03 | Include `displayQtyText` in Stock Update shopping-list On-hand column? | +E4 + E5 (~6 lines, `purchasePlanner.js` + `AutoShoppingList.jsx`) | skip E4/E5 |

**Recommendation:** YES for both (cheap, consistent). Plan can proceed without them for the 3-screen core fix if owner defers.

---

## §6 · Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | `display_qty_text` value == plain qty+unit for simple items (e.g. "1.05 gm") → redundant text | HIGH — confirmed in probe | Guard: only show when `displayQtyText !== \`${displayQty} ${displayUnit}\`` |
| R2 | Field absent on older backend versions (gradual rollout) | LOW — confirmed present on all 108 items | `\|\| ''` fallback + conditional render |
| R3 | `SubRecipeStockPanel` passes `getCurrentQty()` return to 3 render sites — missing destructure | LOW | E2a adds `text` to return, E2b destructures it — low blast radius |

---

## §7 · Verification Matrix (seeds Gate 3 plan + QA)

| # | Edit | How to verify | Automated? |
|---|---|---|---|
| V1 | E0: `displayQtyText` mapped in transform | Unit test: `inventoryTransform.stockItems` — item with `display_qty_text:"9 pkt 400 gm"` → `item.displayQtyText === "9 pkt 400 gm"` | YES |
| V2 | E0: fallback when absent | Transform test: `display_qty_text: undefined` → `displayQtyText: ''` | YES |
| V3 | E1a: "1 kg 640 gm" shows in Current Stock table cell alongside "1.64" | Browser: Operations › Current Stock → find multi-unit item → cell shows both | NO |
| V4 | E1a: guard hides text when qty text == plain value | Browser: simple-unit item (e.g. "5 gm") shows no parenthetical | NO |
| V5 | E2b: Sub-Recipe Stock tab shows displayQtyText on sub-recipe ingredients | Browser: Operations › Stock Update › Sub-Recipe tab | NO |
| V6 | E3a: Stock Audit book-stock cell shows mixed-unit text | Browser: Operations › Stock Audit | NO |
| V7 | No changes to API payloads (add/update ingredient) | grep `display_qty_text` in `toAPI` functions → 0 hits | YES |

---

## §8 · Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-455 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: inventoryTransform.js, CurrentStockPanel.jsx, SubRecipeStockPanel.jsx, StockAuditPanel.jsx
- [ ] Code markers: // BUG-455 on every modified line
```
