# CR-500 — iPhone WiFi Printing Support

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH
**Risk:** MEDIUM (Printer Agent team scope — FE tracking only)
**Process required:** TRACKING ONLY — to be done by Printer Agent team
**Sprint:** TBD
**Owner:** Printing Team

---

## Description

Enable WiFi printing from iPhone devices. This involves the Printer Agent / printing infrastructure supporting iOS devices connecting over WiFi to print bills and KOTs.

**Expected behavior:** Users on iPhones can print bills/KOTs via WiFi-connected printers through the Printer Agent.

**Current behavior:** WiFi printing infrastructure exists (`wifi_printer_ip`, `wifi_printer_name` in `printerAgentSelector.js` and `stationConfigTransform.js`), but iPhone-specific WiFi printing support is incomplete or not working.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Confidence:** REPORTED (unverified — Printer Agent team scope)

---

## Code Reality Check

**Code reality: PARTIAL** — WiFi printer fields exist in transforms (`printerAgentSelector.js:64-65`, `stationConfigTransform.js:11-12`). iPhone-specific handling not present in FE.

---

## Duplicate Check

**RELATED** to BUG-468 (Bill not printing from iPhone — GATE_6_AWAITING_OWNER_SMOKE): BUG-468 is about bills failing on iPhone, this CR is about WiFi printing capability. Different scope.

**Verdict: DISTINCT**

---

## Blast Radius

- **FE scope: NONE (tracking only)** — Printer Agent team handles implementation
- Estimated scope: N/A for POS frontend

---

## Open Questions

- None — Printer Agent team owns implementation. FE tracks for visibility only.
