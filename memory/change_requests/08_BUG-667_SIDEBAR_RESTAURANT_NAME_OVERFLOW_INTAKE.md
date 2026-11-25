# BUG-667 — Sidebar: Restaurant Name Overflows When Name Is Too Long

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

At the bottom of the sidebar, the restaurant name is displayed. When the restaurant name is too long, it **overflows outside the sidebar container** into the dashboard/main content area rather than truncating or wrapping correctly.

**Current behaviour:** Long restaurant names overflow the sidebar bottom section visually.

**Expected behaviour:** Long restaurant names should be truncated with an ellipsis (`…`) or wrap cleanly within the sidebar bounds without overflowing.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P2 — Medium (cosmetic, layout break)
- **Risk:** LOW — CSS/layout fix only, no logic change
- **Area:** Other (affects all restaurant types)
- **Fast Lane:** ELIGIBLE — 1 file, ≤5 lines CSS fix (owner approval needed)

---

## 3. Duplicate Check

- **Result: DISTINCT** — no prior registration for restaurant name overflow

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** not provided but described clearly
- **Confidence:** CONFIRMED

---

## 5. Root Cause (preliminary)

Sidebar.jsx restaurant name display at bottom — the container likely lacks `overflow-hidden`, `text-ellipsis`, or `truncate` class. Only 2 `restaurantName` references found in Sidebar.jsx — targeted fix.

---

## 6. Blast Radius

- `Sidebar.jsx` — 1 file, 1–2 lines (add `truncate` or `overflow-hidden max-w-full`)
- **Estimated scope:** SMALL (1 file, Fast Lane eligible)

---

## 7. Code Reality

- **Status:** NONE (bug — fix not in codebase)

---

## 8. Related

- CR-378 (Sidebar profile shows restaurant name + ID — GATE_5A_IMPLEMENTED): same area
