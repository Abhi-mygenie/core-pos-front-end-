# CR-152 — Test Connection for LAN Printer

**Type:** Change Request (New Feature)
**ID:** CR-152
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner needs a "Test Connection" button for LAN printers in the POS settings. This would allow staff to verify that a configured LAN printer is reachable before using it for KOT/bill printing, without having to print a test document.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Printers / LAN Printer Configuration |
| Priority | P2 |
| Severity | MEDIUM — operational convenience; printing still works without it |
| Risk | LOW (no financial/order logic; network ping/socket test only) |
| Fast Lane | POSSIBLE if confined to 1 component — needs owner approval |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce: Open LAN printer configuration — no "Test Connection" or "Ping" button available
- Confidence: REPORTED

## Code Reality Check

```bash
grep -rn "testConnection\|test.*connection\|LAN\|lan.*printer" src/ → 9 matches
  - api/services/couponService.js (unrelated — coupon connection test)
  - hooks/useOrderPollingReconciliation.js (unrelated)
  - utils/auditManifest.js (unrelated)
```

- **Code reality: NONE** — no LAN printer test connection functionality exists
- Note: Printers tile is currently "Coming Soon" (CR-149 removes it from settings menu). This CR is for when Printers feature ships — test connection should be part of that implementation.
- DEPENDENCY: This CR is logically dependent on the Printers feature being built

## Blast Radius

- 0 existing lines for this feature (SMALL)
- Estimated scope: SMALL (1 new button in printer config component + service call)

## Expected Behavior

- In LAN Printer settings: "Test Connection" button
- On click: attempts TCP connection to printer IP:port (or sends ping via printer agent)
- Shows: "Connected ✓" or "Connection failed: timeout/refused"
- No print job sent — connectivity check only

## Owner Decisions Needed

1. Is the LAN printer test done via a local printer agent (like the existing printer agent config) or direct from browser?
2. What is the test endpoint/protocol? (TCP ping, HTTP to agent, or WebSocket to printer?)

## Dependency

- CR-152 is blocked until Printers feature is live (see CR-149 for Printers removal context)
- Recommend implementing as part of the Printers feature sprint

## Duplicate Check

RELATED to BUG-315-319 (printer/CR gaps investigation report in memory). DISTINCT from that scope (that was about KOT routing, not LAN test).

---

**Next:** Planning Gate 2 (dependency on Printers feature noted)
