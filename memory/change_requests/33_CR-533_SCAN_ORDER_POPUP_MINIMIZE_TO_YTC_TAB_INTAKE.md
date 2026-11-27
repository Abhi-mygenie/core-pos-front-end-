# CR-533 — Scan/Confirm Order Pop-Up: Minimize to YTC Tab

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The scan/confirm order pop-up (`ScanOrderPopOut`) appears as a full-screen or large overlay when a new web/scan order arrives. The owner wants to be able to **minimise** this pop-up — and when minimised, the pending order should appear visibly in the **"Yet To Confirm" (YTC)** tab/section on the dashboard so staff can action it later without the popup blocking their view.

**Current behaviour:** The pop-up appears and can only be dismissed by accepting/rejecting the order or snoozed. There is no minimize-to-YTC-tab option; minimised/snoozed orders may not be clearly visible in the dashboard YTC section.

**Expected behaviour:**
1. A "Minimise" button on the confirmation pop-up
2. On minimise, the pop-up closes and the order is prominently shown in the YTC tab on the dashboard
3. The YTC tab counter/badge updates immediately to reflect the pending order

---

## 2. Classification

- **Type:** CR (new behaviour)
- **Severity:** P1 — High (pop-up blocks workflow; staff need a way to handle it without accepting/rejecting immediately)
- **Risk:** HIGH — `ScanOrderPopOut.jsx`, `DashboardPage.jsx` (R5), YTC queue state management
- **Area:** Aggregator / Sockets
- **Fast Lane:** NOT eligible (state management, R5)

---

## 3. Duplicate Check

- CR-056 (Toggle to show/suppress scan popup — QA PASS, Gate 6 pending): different — that's about suppressing entirely; CR-533 is minimize-to-tab
- BUG-068 (Popup after socket reconnect — CLOSED): different scope
- BUG-122 (Wrong orders triggering popup — CLOSED): different scope
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `src/components/dashboard/ScanOrderPopOut.jsx` — add Minimize button + minimise handler
- `src/pages/DashboardPage.jsx` (R5) — ensure YTC section shows minimised orders prominently
- YTC counter / `PlatformCounterChip` — badge update on minimise
- **Estimated scope:** MEDIUM (2–3 files, R5)

---

## 6. Open Questions

- OD-533-01: Where exactly is the YTC section on the dashboard — is it a tab in the "YTC" column or a chip/filter on the header?
- OD-533-02: Should minimised orders have a visual distinction in the YTC list (e.g. a "New - Pending Review" badge)?
- OD-533-03: Should snoozed orders (existing snooze feature) also appear in the YTC tab, or only explicitly minimised ones?

---

## 7. Code Reality

- **Status:** NONE — no minimize button on ScanOrderPopOut; minimised/snoozed orders not surfaced in YTC tab

---

## 8. Related

- BUG-676 (Edit order ringer — same ScanOrderPopOut context)
- CR-534 (Popup missing info — same ScanOrderPopOut)
- CR-056 (Suppress scan popup — QA PASS, different intent)
