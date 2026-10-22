# CR-433 — Intake (Gate 1)
## Order Card Visual Redesign — Orange border, orange amount, orange table/order number

**ID:** CR-433 · **Type:** CR · **Date:** 2026-10-16
**Severity:** P2 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** DISTINCT — follow-up to CR-432 (masonry layout). Visual design improvements, no layout changes.
**Source:** OWNER-DIRECTED + screenshot (2026-10-16)

---

## Description

After the CR-432 masonry fix, cards now sit side-by-side in columns but blend into the white background — there is no clear visual boundary between cards. Owner wants a more prominent card identity.

**Requirements (confirmed):**
1. **Orange border** on cards — replace current thin gray border (`1px solid borderGray`) with orange border for clear visual distinction between cards
2. **Amount in orange** — ₹168, ₹932, ₹536 etc. currently `COLORS.grayText` (L517) → change to `COLORS.primaryOrange`
3. **Table/order number in orange** — currently `COLORS.darkText` (L481) → change to `COLORS.primaryOrange`
4. **Customer name** — treatment TBD (OD-433-01): owner wants to see design options

**Applies to:** OrderCard + TableCard (both card types in dashboard)

---

## Code Reality: PARTIAL

Current `OrderCard.jsx`:
- Card border `L455`: `border: 1px solid ${COLORS.borderGray}` → change to orange
- Amount `L517-518`: `style={{ color: COLORS.grayText }}` + `₹{...}` → change to `COLORS.primaryOrange`
- Table/order label `L481`: `style={{ color: COLORS.darkText }}` → change to `COLORS.primaryOrange`

---

## Evidence
- Screenshot: masonry layout with "Ready 4" showing cards blending into white background
- Current state: subtle gray border, gray amount, dark text for order number

---

## Blast Radius: SMALL
- `src/components/cards/OrderCard.jsx` — 3-4 lines (border, amount color, label color)
- `src/components/cards/TableCard.jsx` — similar lines (to be verified)

---

## Open Decisions

**OD-433-01 (customer name):** What treatment for customer name (e.g., BRAD OWNER, coworking regular)?
- Options: (a) orange like table number, (b) keep dark/gray, (c) owner to review design options first

**OD-433-02 (border style):** Full orange border on all 4 sides OR just a left-side orange accent bar?
- Options: (a) full `2px solid primaryOrange` border, (b) left accent `4px solid primaryOrange` with thin gray on other sides

**OD-433-03 (scope):** Apply to TableCard (table view cards) as well, or OrderCard only?
- Owner said "for order and table card" — confirmed both ✅ → OD-433-03 = BOTH
