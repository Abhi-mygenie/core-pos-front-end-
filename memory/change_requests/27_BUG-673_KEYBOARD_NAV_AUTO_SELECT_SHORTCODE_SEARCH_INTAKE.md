# BUG-673 — Keyboard Navigation: First Alphabetical Food Auto-Selected on Short Code Search

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

When searching for food using a **short code** in the Order Entry page (keyboard navigation mode), the **first food item in alphabetical order gets auto-selected**. When the user presses Enter to confirm, the unintended alphabetically-first food item is added to the cart instead of the intended search result.

**Current behaviour:** Typing a short code in the search box → first alphabetical item gets auto-highlighted/selected → pressing Enter adds wrong item to cart.

**Expected behaviour:** Short code search should navigate to the matching item only. No auto-selection should occur until the user explicitly navigates to and confirms a specific item.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P1 — High (wrong items added to cart; affects order accuracy in keyboard-navigation mode)
- **Risk:** HIGH — keyboard navigation (CR-482 hotspot, R5 OrderEntry.jsx)
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (R5 hotspot, keyboard nav CR-482 scope)

---

## 3. Duplicate Check

- CR-482 (Keyboard navigation — GATE_4_IN_PROGRESS): covers general keyboard navigation
- BUG-648/649/650/651/652/653/654/655: CR-482 sub-bugs already registered
- **Result: RELATED CR-482** — this is a new sub-bug in the keyboard navigation system (not in existing BUG-648–655)

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Root Cause (preliminary)

Short code search likely triggers the same auto-selection logic used for keyboard chip navigation. When search results update, the first item in the filtered list automatically gets the keyboard focus/highlight, causing Enter to fire on it.

---

## 6. Blast Radius

- `OrderEntry.jsx` (R5) — keyboard search / shortcode input handler
- Possibly `CategoryPanel.jsx` or item grid focus management
- **Estimated scope:** SMALL-MEDIUM (1–2 files, R5)

---

## 7. Code Reality

- **Status:** NONE — auto-selection bug not fixed (observed in CR-482 scope)

---

## 8. Related

- CR-482 (Keyboard Navigation — GATE_4_IN_PROGRESS, parent feature)
- BUG-648 to BUG-655 (CR-482 QA sub-bugs — all GATE_5A_IMPLEMENTED)
