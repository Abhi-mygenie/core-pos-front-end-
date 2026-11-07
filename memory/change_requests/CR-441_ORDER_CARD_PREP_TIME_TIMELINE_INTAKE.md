# CR-441 — Order Card: Show Prep Time as Timeline Instead of "Prep" Text

**Registered:** 2026-10-18
**Type:** CR
**Priority:** P3
**Risk:** LOW
**Area:** Dashboard / Order Card / UX
**Sprint:** backlog
**Status:** GATE_1_INTAKE

---

## Description

On order cards in the Preparing column, instead of showing a static "Prep" label or text, display a visual **timeline/progress bar** showing how long the order has been in prep relative to the expected prep time. Staff can instantly see at a glance whether an order is on time or overdue.

---

## Duplicate Check

**DISTINCT** — no prior CR for prep time timeline on order cards.

---

## Open Decisions

- **OD-441-01:** What is the expected/target prep time? Is it per order, per restaurant config, or per item category?
- **OD-441-02:** Visual format — linear progress bar, circular timer, elapsed-time countdown, or colour-coded age chip?
- **OD-441-03:** Data source — does the backend send `prep_start_time` or is it derived from `createdAt`?
- **OD-441-04:** Applies only to Preparing column (status view), or also to Channel View order cards?

---

## Blast Radius (estimate)

- `src/components/cards/OrderCard.jsx` — visual update to Preparing state UI
- Possibly `src/components/cards/TableCard.jsx` — if applies to table view too
- Estimated scope: SMALL (1–2 files, not R5)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: Blocked on OD-441-01 + OD-441-02
