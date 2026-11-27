# BUG-648 — CR-482 P6: Weight Popup Pre-fill Not Selected → Typing Appends Instead of Replacing

**Registered:** 2026-11-05  
**Classification:** BUG  
**Severity:** P0 — CRITICAL (money: customer charged ₹4,60,230 instead of ₹230)  
**Risk:** CRITICAL (order flow, billing — R5+R6)  
**Process required:** Full gate flow. FAST LANE eligible? **NO**  
**Sprint:** TBD  
**Source:** QA-FOUND (CR-482 QA Report P6–P10, test 6.11)

---

## Description

When keyboard shortcuts are ON, pressing Enter on a weighed item opens the weight popup with `1000` pre-filled in the input box. The text is NOT selected (cursor is at the end). When the user types `500`, the box shows `1000500` instead of replacing with `500`. P6's `handleInputKeyDown` (Enter-to-add) commits this value instantly — adding a 1000.5 Kg line at ₹4,60,230 to the cart.

**Example:** Kashi Sweets, Gopal Bhog ₹460/Kg  
- Expected: type `500` → 500 gm → ₹230  
- Actual: type `500` → `1000500` gm = 1000.5 Kg → ₹4,60,230

**Pre-existing issue:** The `autoFocus` + no-select behaviour exists before CR-482 (mouse path has the same append problem). CR-482 P6 amplifies it by enabling Enter-to-commit in one keystroke.

---

## Code Reality Check

**PARTIAL** — `WeightEntryModal.jsx`:
- L196: `autoFocus` on the weight input
- L12/14: `defaultSmall: 1000` pre-fills the box
- L119: `handleInputKeyDown` — CR-482 P6 addition, Enter commits the value
- L189: `onKeyDown={handleInputKeyDown}`
- No `onFocus` select handler exists

---

## Duplicate Check

**DISTINCT.**
- BUG-431 (CheckInPage pre-fill GST double-count): PMS path, different component. RELATED pattern only.
- BUG-269/275 (Ingredient conversion pre-fill): Inventory module, different input. DISTINCT.
- No existing bug covers WeightEntryModal pre-fill selection.

---

## Evidence

- **Screenshots:** QA report p6_11 (popup showing `1000500`), p6_12 (cart line ₹4,60,230)
- **Steps to reproduce:**
  1. Shortcuts ON, open a new order on a weight-item outlet (Kashi Sweets)
  2. Type `Gopal Bhog` + Enter → weight popup opens, pre-filled `1000`, cursor at end
  3. Type `500` + Enter
  4. Cart shows 1000.5 Kg at ₹4,60,230
- **Source:** QA-FOUND
- **Confidence:** CONFIRMED (reproduced via Playwright + code traced)

---

## Blast Radius

- `WeightEntryModal.jsx` — 1 file, ~5 lines to add onFocus select
- `handleInputKeyDown` (L119) — CR-482 P6 addition
- Hotspot files touched: NO (WeightEntryModal is not R5)
- Estimated scope: **SMALL (1 file, ~5 lines)**
- But CRITICAL risk because money is wrong

---

## Open Questions

- **OD-648-01:** Should the fix apply universally (shortcuts ON or OFF) or only when shortcuts are ON? The same append issue exists with mouse workflow — just less likely because the user would click/drag to select.

---

## Next: PLANNING Gate 2-3
