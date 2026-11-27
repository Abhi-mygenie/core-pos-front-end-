# CR-521 — Color Effect After Bill Print: Make It More Attractive

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants the visual color-change animation/effect that occurs after a bill is printed to be more visually attractive and noticeable. The current implementation (green border via CR-512 / BUG-583) is functional but subtle.

**Current behaviour:** After bill print, the order card shows a green solid border (CR-512 GATE_5A_IMPLEMENTED). The transition is functional but visually plain.

**Expected behaviour:** A more polished, attractive visual effect — could include a smoother color transition animation, a more prominent visual treatment, a brief flash or pulse animation, or a more distinctly different card appearance after printing.

---

## 2. Classification

- **Type:** CR (cosmetic enhancement)
- **Severity:** P3 — Low (cosmetic only; core functionality works)
- **Risk:** LOW — CSS/animation change only, no logic change
- **Area:** Menu / Order Entry
- **Fast Lane:** ELIGIBLE if change is CSS-only, ≤10 lines, owner approval given

---

## 3. Duplicate Check

- BUG-583 (card color logic — GATE_5A_IMPLEMENTED via CR-512)
- CR-512 (Print Confirmation Flow — GATE_5A_IMPLEMENTED, green card working)
- CR-433 (Order card visual redesign — GATE_5B_QA_PASS)
- **Result: RELATED CR-512, CR-433, BUG-583** — these implement the base; CR-521 enhances the visual effect

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — table card showing "Bill" button (before print); green card effect already deployed
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `TableCard.jsx` / `OrderCard.jsx` — animation/CSS change
- `index.css` or Tailwind config — potential animation class
- **Estimated scope:** SMALL (1–2 files, CSS only)

---

## 6. Open Questions

- OD-521-01: What specific effect is desired? (a) Pulse/glow animation on the border (b) Full background colour flash (c) A brief checkmark overlay (d) Owner to describe or provide reference

---

## 7. Code Reality

- **Status:** PARTIAL — green border exists (CR-512); animation/enhanced effect not implemented

---

## 8. Related

- CR-512 (Print Confirmation Flow — GATE_5A_IMPLEMENTED)
- BUG-583 (Card colour logic — GATE_5A_IMPLEMENTED via CR-512)
- CR-433 (Order card visual redesign — GATE_5B_QA_PASS)
