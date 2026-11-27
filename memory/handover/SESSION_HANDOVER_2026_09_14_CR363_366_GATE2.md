# Session Handover — 2026-09-14 (CR-363 + CR-366 Gate 2 Impact Analysis)

```
Session date:     2026-09-14
Status at close:  CR-363 + CR-366 GATE 2 IMPACT ANALYSIS WRITTEN (joint doc). R11 probe PASS. Gate 3 NOT written (owner: IA only).
Next agent role:  PLANNING (Gate 3 — Implementation Plan) once owner answers new ODs + Sidebar SC ack
Workspace:        /app
```

## 1. Done this session
**Role:** PLANNING — Impact Analysis only (owner choice 1a).

| Step | Result |
|---|---|
| Code reality | NONE (0 hits night-audit / revenue-summary / RevPAR) |
| Conflict pre-check | `pmsService.js`, `App.js` shared with CR-364/CR-365 — additive, parallel-safe. `Sidebar.jsx` frozen post-P1 → **one combined SC ack** (CR-363 + CR-366 [+ CR-365]). `aiosellTransform.js` dropped from CR-366 scope. |
| R11 probe (preprod) | `night-audit?date=` 200 · no-date 422 · `revenue-summary` day/week 200 · no-params 422. Evidence in `evidence/CR-363/`, `evidence/CR-366/`. Credentials stored as alias only (`test_credentials.md`). |
| Owner decision | **OD-366-04 → Sidebar child under Rooms & Reservations** (resolved). |
| Doc | `impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md` (§0 header, §1 probe shapes + 9 data observations, §2 data flow, §3 risk, §4 files, §5 risk register, §6 ODs, §7 BE notes, §8 Gate 3 entry checklist, §9 scope lock) |
| Registries | `registry.json` (status, completeness 2/7, files, artifact_refs, status_history) · `CR_REGISTRY.md` rows · both intake docs gate status + footer |

**No application source code changed.**

## 2. Open before Gate 3
- OD-363-07 (past-date `room_status_close` show+badge / hide), OD-363-08 (null `guest_name` — ship "—" or wait)
- OD-366-05 (cache none / insightsCache), OD-366-06 (period deltas), OD-366-07 (default range), OD-366-08 (Booked/Collected side-by-side vs toggle)
- Combined Sidebar SC ack
- Probe `revenue-summary…group_by=month` (BN-6); confirm `utils/reportExporter.js` param contract

## 3. Backend notes to forward (informational)
BN-1..6 in IA §7 — null guest_name/room_code on outstanding rows, null reconciliation totals, `audit_trail.detail` ids null (↔ BUG-193), occupancy >100 %, null `bookings_count`/LOS/lead-time, `group_by=month` unprobed.

## 4. Do-Not-Retry
1. Do NOT add a 2nd `revenue-summary` call to Night Audit — `night-audit` already returns ADR/RevPAR/tender.
2. Do NOT implement `fromDashboardKpisRange` — obsolete.
3. No client-side money math in either transform (R6) — display BE fields.
4. Do NOT touch `Sidebar.jsx` before SC ack.

*Handover written 2026-09-14.*
