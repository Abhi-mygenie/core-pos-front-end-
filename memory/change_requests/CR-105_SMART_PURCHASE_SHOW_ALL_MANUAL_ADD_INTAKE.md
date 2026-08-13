# CR-105 — Smart Purchase: Show All Ingredients + Manual Add to Purchase List

**ID:** CR-105
**Type:** CR
**Created:** 2026-07-25
**Severity:** P2 (no data loss, workaround exists: set minQtyAlert)
**Risk:** LOW (additive UI, no financial logic, no existing flow changes)
**Module:** Inventory — Smart Purchase
**Duplicate Check:** DISTINCT. Related: CR-078 (planner core), BUG-224 (low-stock alert rows).
**Source:** INVESTIGATION (Smart Purchase limited items investigation, 2026-07-25)
**Confidence:** CONFIRMED — code traced, behavior verified against owner ruling B2.

---

## Description

Smart Purchase currently shows **only items with a purchase deficit** (gap < 0) or items below their minQtyAlert threshold (BUG-224). This is per owner ruling B2 from CR-078.

However, this creates a **coverage gap**: ingredients with no consumption history AND no minQtyAlert configured are invisible to Smart Purchase — the restaurant cannot order them through this flow even if they want to.

**Owner reported:** Screenshot shows 36 items for 7d horizon. All are Out of Stock or Low Stock. Question: "are we showing limited items, are we not showing items in stock?"

---

## Proposed Feature (2 sub-features)

### Sub-A: "Show All" Toggle
Add a toggle/checkbox in the Smart Purchase header: **"Show all ingredients"**
- OFF (default): current B2 behavior — only deficit + low-stock items
- ON: shows ALL purchasable ingredients (gap < 0 AND gap ≥ 0), with in-stock items visually de-emphasized (greyed out, qty=0 default)

### Sub-B: Manual "Add Item" Row
Add an "Add Item" button/typeahead at the bottom of the Auto Shopping List:
- User searches/picks any ingredient from the master list
- Adds it to the purchase list with qty=0, vendor=system, rate=empty
- User fills in qty/rate/vendor to include in the purchase order

---

## Blast Radius

- `purchasePlanner.js` — modify `computePlan()` to optionally return all items (with gap annotated) when "showAll" flag is true
- `SmartPurchasePanel.jsx` — add `showAll` state + toggle UI + pass to computePlan
- `AutoShoppingList.jsx` — add "Add Item" typeahead row (reuses existing ingredientsMaster prop)
- ~30-50 lines estimated

**Blast radius: SMALL** (2-3 files, additive, no existing logic changes)

---

## Evidence

- Investigation report: `/app/memory/evidence/SP-INVESTIGATION/INVESTIGATION_REPORT_SP_LIMITED_ITEMS_2026-07-25.md`
- Owner screenshot: 36 items, all Out of Stock / Low Stock
- Code: `purchasePlanner.js:140` — `rows.filter(r => r.gap < 0)` (B2 filter)

---

## Open Questions — RESOLVED

| # | Question | Decision | Date |
|---|----------|----------|------|
| OQ-1 | Sub-A: Show All toggle — in-stock items editable or read-only? | **A) Editable — all operations (qty, rate, vendor, remove) same as deficit items.** | 2026-07-25 |
| OQ-2 | Sub-B: Manual Add — master-list only or free-text? | **A) Master-list only.** Free-text/adhoc did not work. | 2026-07-25 |
| OQ-3 | Priority: Sub-A and Sub-B together or separate? | **A) Both together.** (Implied — owner answered both without deferral.) | 2026-07-25 |

---

## Workaround (available now)

Set `minQtyAlert` on ingredients in the Ingredients setup page → they'll appear in Smart Purchase via BUG-224 Rule 2 whenever stock dips below the threshold.
