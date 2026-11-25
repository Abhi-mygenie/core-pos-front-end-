# CR-501 — On Update Order: Running Order Print in KOT

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH
**Risk:** MEDIUM (Printer Agent team scope — FE tracking only)
**Process required:** TRACKING ONLY — to be done by Printer Agent team
**Sprint:** TBD
**Owner:** Printing Team

---

## Description

When an order is updated (items added/modified to a running order), the KOT (Kitchen Order Ticket) should print showing the running order state — i.e., the full current order or the delta of changes, as per kitchen workflow requirements.

**Expected behavior:** On order update, a KOT is printed reflecting the running order changes so the kitchen has accurate, up-to-date item information.

**Current behavior:** KOT printing on update exists in `orderTransform.js` (L1177-1271, `CR-POS2-003-REOPEN-A`) with station-based printer agent routing. The update KOT currently sends only newly-added lines. The CR may require printing the full running order state or additional context.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Confidence:** REPORTED (Printer Agent team scope)

---

## Code Reality Check

**Code reality: PARTIAL** — Update order KOT logic exists in `orderTransform.js` L1177-1271 (`printerAgentForUpdate`). Routes newly-added lines to station printers. Running order context may not be included in the KOT payload sent to Printer Agent.

---

## Duplicate Check

**RELATED** to:
- CR-395 (Order-Wise KOT — INTAKE): KOT grouping, different scope
- POS2-003-REOPEN-A (Update/cancel printer_agent — CLOSED): original update KOT implementation

**Verdict: DISTINCT** — existing update KOT sends delta only; this asks for running order context.

---

## Blast Radius

- **FE scope: NONE (tracking only)** — Printer Agent team handles implementation
- Estimated scope: N/A for POS frontend

---

## Open Questions

- None — Printer Agent team owns implementation. FE tracks for visibility only.
