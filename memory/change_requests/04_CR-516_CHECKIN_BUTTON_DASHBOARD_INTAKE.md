# CR-516 — PMS: Separate Check-In Button on Dashboard

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Currently the PMS check-in can only be initiated from the Order View (order-entry page) for a room order. The owner wants a **dedicated "Check In" button on the dashboard** that is accessible without opening an order, allowing front-desk staff to quickly initiate check-in from the main view.

**Current behaviour:** Check-in can only be performed from within an open order on the PMS order-entry/folio screen. No direct check-in action exists on the dashboard.

**Expected behaviour:** A "Check In" button (or action) is visible on the dashboard — either on the room/PMS card, in the header actions area, or as a quick-action button — that opens the check-in flow directly without needing to open an existing order first.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (front-desk friction; workaround exists via order view)
- **Risk:** HIGH — touches DashboardPage (R5 hotspot), PMS check-in flow, routing
- **Area:** PMS / Rooms
- **Fast Lane:** NOT eligible (R5 hotspot, PMS flow)

---

## 3. Duplicate Check

- Searched: "check-in button dashboard", "dashboard check in" in registry.json — no match
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — dashboard showing dine-in and delivery columns (no check-in button visible)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `DashboardPage.jsx` (R5) — add button/action entry point
- `CheckInPage.jsx` or `CheckInForm.jsx` — ensure can be opened without pre-existing order context
- Possibly `Sidebar.jsx` or header area
- **Estimated scope:** MEDIUM (2–3 files, R5 hotspot)

---

## 6. Open Questions

- OD-516-01: Where should the button appear? (a) On each room card on the PMS dashboard (b) In the header/toolbar as a global "New Check-In" button (c) Quick-access button floating near the PMS section
- OD-516-02: Does this require a new booking to exist, or should it allow walk-in check-in without a prior booking?

---

## 7. Code Reality

- **Status:** NONE — no standalone check-in button on dashboard

---

## 8. Related

- CR-385 (PMS Front Desk Unified Workstation — CLOSED)
- CR-379 (PMS Check-In CRM Gap — GATE_5B_QA_PASS)
