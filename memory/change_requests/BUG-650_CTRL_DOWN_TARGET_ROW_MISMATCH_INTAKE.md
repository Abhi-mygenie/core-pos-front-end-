# BUG-650 — CR-482 P10: Ctrl+↓ Lands on Oldest Unsent Row — Handover Says Newest

**Registered:** 2026-11-05  
**Classification:** BUG  
**Severity:** P3 — LOW  
**Risk:** LOW (doc/behaviour mismatch, no data/money impact)  
**Process required:** Owner decision first, then gate flow. FAST LANE eligible? **NO** (OrderEntry.jsx is R5 hotspot if code fix; doc-only if docs are wrong)  
**Sprint:** TBD  
**Source:** QA-FOUND (CR-482 QA Report P6–P10, test F2)

---

## Description

When pressing Ctrl+↓ from the search box, the cursor jumps to the **oldest (top) unsent cart row**. The handover doc (`CR-482_HANDOVER_P0_TO_P9.md`) says "starting at the newest item". The implementation plan and PRD say "first unsent row", which matches the code.

This is a doc/code mismatch, not a functional bug. Owner decides the correct behaviour.

---

## Code Reality Check

**FULL** — `OrderEntry.jsx:637-639`:
```js
if (key === 'ArrowDown' && ctrlKey && !altKey && !metaKey) {
  const target = document.querySelector('[data-kbd-cart-row="new"]') || document.querySelector('[data-kbd-cart-row]');
```
Targets first `[data-kbd-cart-row="new"]` (= first unsent) or first `[data-kbd-cart-row]` (= first row overall).

---

## Duplicate Check

**DISTINCT.** No existing bug about cart row focus target.

---

## Evidence

- **Steps:** Add Americano, Banana Shake, Blue Lagoon → press Ctrl+↓ → focus goes to Americano (top), not Blue Lagoon (newest).
- **Source:** QA-FOUND
- **Confidence:** CONFIRMED

---

## Open Questions

- **OD-650-01:** Which behaviour do you want?
  - **Option A (current):** Ctrl+↓ lands on the oldest unsent row (top of cart). Fix the handover doc.
  - **Option B:** Ctrl+↓ lands on the newest unsent row (bottom of cart). Fix the code (`:last-of-type` selector).

---

## Next: Owner decision on OD-650-01
