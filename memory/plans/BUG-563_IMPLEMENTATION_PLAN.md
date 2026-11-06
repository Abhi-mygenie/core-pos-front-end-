# BUG-563 — Implementation Plan (Gate 3)

**ID:** BUG-563 · **Date:** 2026-10-15 · **Role:** PLANNING (Gate 3)
**Input:** `impact/BUG-563_IMPACT_ANALYSIS.md` (Gate 2 CLOSED) · OD-563-01 = (a) LOCKED
**Code Reality:** PARTIAL (w-32 at L32, xl:w-44 unchanged)
**Conflict pre-check:** NONE — CategoryPanel.jsx last touched BUG-555 WP-A (CLOSED)
**Risk:** LOW
**Fast Lane eligible:** YES

---

## 0. Scope Lock (R14)

| WILL change | WILL NOT touch |
|---|---|
| `src/components/order-entry/CategoryPanel.jsx` | `OrderEntry.jsx`, `Sidebar.jsx`, all report pages, all API/service/transform files, any test file, `xl:w-44` class (desktop width unchanged) |

Hotspots (R5): NONE. Financial logic (R6): NONE.

---

## 1. Edit Table

| # | File:line (HEAD) | Current | New |
|---|---|---|---|
| **E1** | `CategoryPanel.jsx:32` | `className="w-32 xl:w-44 flex-shrink-0 flex flex-col min-h-0" /* BUG-555 A8 */` | `className="w-36 xl:w-44 flex-shrink-0 flex flex-col min-h-0" /* BUG-555 A8 · BUG-563 */` |

**That is the entire change: one Tailwind class token, `w-32` → `w-36`.**

Entry verification (Implementation agent MUST check before coding):
```
CategoryPanel.jsx:32 must read:
  className="w-32 xl:w-44 flex-shrink-0 flex flex-col min-h-0" /* BUG-555 A8 */
```
If the line differs → STOP and return to Planning.

---

## 2. Width Budget (re-stated for Implementation agent)

After change: category panel = 144px (<1280px), 176px (≥1280px).
Middle panel at 800px = 216px (above 140px min-w search floor). No overflow risk.

---

## 3. Verification Matrix (seeds QA)

| Edit | Check | Viewport | How | Auto? |
|---|---|---|---|---|
| E1 | `getBoundingClientRect().width` of `data-testid="category-panel"` ≈ **144px** at <1280 | V1 893×533 | DOM rect | YES |
| E1 | Same check ≈ **176px** at V6 1920×800 (xl:w-44 unchanged) | V6 1920×800 | DOM rect | YES |
| E1 | Category name shows more characters before truncation — "Indo-Fusion M..." visible at 144px (was "Indo-Fusio...") | V1 | Visual screenshot | YES |
| E1 | No horizontal overflow on Order Entry screen (scrollWidth = clientWidth) | V1 V4 800×500 | DOM | YES |
| Regression | Order Entry opens, categories load, tapping category filters menu | V1 | Click flow | MANUAL/QA |

---

## 4. Post-Code Registry Checklist (Implementation agent MUST execute)

- [ ] `registry.json`: BUG-563 → `GATE_5A_IMPLEMENTED`, `sprint_key: oct_cr_batch`, `files: ['src/components/order-entry/CategoryPanel.jsx']`
- [ ] `BUG_TRACKER.md`: BUG-563 row updated with IMPLEMENTED status
- [ ] `FILE_OWNERSHIP.md`: CategoryPanel.jsx — BUG-563 + date + E1
- [ ] Code marker: `/* BUG-563 */` appended to L32 className comment
- [ ] Compile: webpack 0 new warnings
- [ ] QA handover: `handover/QA_HANDOVER_BUG563_<DATE>.md` inheriting §3 matrix

---

## 5. Gate 4

```
OWNER APPROVAL REQUIRED
Reason: Gate 4 GO needed before implementation
Risk: LOW
Fast Lane eligible: YES (1 file, 1 line, not R5, not financial, OD-563-01 LOCKED)
Proposed next step: IMPLEMENTATION — change w-32 to w-36 on CategoryPanel.jsx:32
I will not proceed until owner gives Gate 4 GO.
```
