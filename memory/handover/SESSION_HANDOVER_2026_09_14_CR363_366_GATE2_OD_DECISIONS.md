# Session Handover — CR-363 + CR-366 (Gate 2 OD decisions recorded → design options presented)

```
Written:         2026-09-14
Status at close: Gate 2 complete. OD-363-07/08 + OD-366-05/06/07 resolved.
                 OD-366-08 OPEN — owner deciding. Design options presented by design agent.
Next agent role: PLANNING (declare role explicitly — Gate 3: Implementation Plan)
                 Gate 3 entry blocked only on: (1) owner resolves OD-366-08, (2) sidebar SC ack.
Workspace:       /app  (branch 14sep, frontend-only)
```

---

## 1. What this session covered

| Task | Result |
|---|---|
| Read AGENT_PROMPT_ALPHA.md | Role confirmed: PLANNING |
| Memory dir sync from remote | Pulled 626 files from `14sep` branch into `/app/memory/` |
| Owner OD decisions recorded | OD-363-07/08, OD-366-05/06/07: all resolved (see §2) |
| Backend brief for null fields | NEW: `backend_briefs/BACKEND_BRIEF_CR363_CR366_NULL_FIELDS_2026_09_14.md` |
| Impact Analysis §6 updated | OLD "awaiting" ODs → resolved decisions table |
| Gate 3 checklist updated | ODs ticked; OD-366-08 and design marked as remaining |
| Registry.json | CR-363 + CR-366 status_history entries added |
| CR_REGISTRY.md | Both rows updated to "OD DECISIONS RECORDED" |
| Design agent called | `design_guidelines.json` written with full spec for both pages incl. OD-366-08 options |

No application source code was changed this session.

---

## 2. Owner decisions recorded

| OD | Decision | Status |
|---|---|---|
| OD-363-07 | Show `room_status_close` with "as of now" badge for past dates | ✅ RESOLVED |
| OD-363-08 | Ship v1 with "—" for null guest fields + file null-fields BE brief | ✅ RESOLVED |
| OD-366-05 | No FE cache — always live data | ✅ RESOLVED |
| OD-366-06 | No compare-to-previous-period in v1 (note for next phase) | ✅ RESOLVED |
| OD-366-07 | Default range = last 7 days | ✅ RESOLVED |
| OD-366-08 | Booked vs Collected display — side-by-side (A) or toggle (B)? | ⏳ OPEN — owner to decide |

---

## 3. OD-366-08 — Owner decision needed (design agent has shown both options)

The design guidelines in `design_guidelines.json` § `od_366_08_owner_presentation` describe both options:

**Option A — Side-by-Side:**
Every KPI tile shows both figures at once. Example: `ADR Sales ₹3,714 | ADR Revenue ₹2,964`. Orange badge for Booked, green for Collected. No interaction needed. Always visible.

**Option B — Toggle Switch:**
Single set of KPI numbers with a "Booked (Sales) / Collected (Revenue)" toggle in the top-right of the KPI row. Switching the toggle updates all tiles and the trend chart simultaneously. Booked is default.

Owner: please confirm **A or B** so Gate 3 Implementation Plan can be written.

---

## 4. Sidebar SC ack needed

A combined Sidebar unfreeze acknowledgement is required to add two new children to `pms.children` in `Sidebar.jsx`:
- `pms-night-audit` → `/pms/night-audit` (CR-363)
- `pms-revenue` → `/pms/revenue` (CR-366)

Optional: include `pms-housekeeping` → `/pms/housekeeping` (CR-365) in the same unfreeze if owner wants a single ack.

Owner: confirm the SC ack covers CR-363 + CR-366 (+ CR-365?).

---

## 5. Gate 3 entry checklist (what remains before Implementation Plan can be written)

- [ ] **OD-366-08** resolved by owner (Option A or B)
- [ ] **Sidebar SC ack** acknowledged for CR-363 + CR-366
- [ ] One probe of `revenue-summary?…&group_by=month` (BN-6 — can be done at Gate 3 start)
- [ ] Design guidelines reviewed and approved (or owner requests changes)
- ~~[ ] OD-363-07/08, OD-366-05/06/07~~ → ✅ Done this session

---

## 6. Blocked CRs (unchanged from previous handover, next in queue)

- **CR-364 — Guest Folio.** Gate 2 Impact Analysis not started.
- **CR-357 — Room Advance / `+ Pay` re-enable.** `CartPanel.jsx:1484`. Gate 2 not started.
- **BUG-193 — Room Transfer Trail.** Gate 0-1 intake needed. Shares symptom with BN-3 (null audit_trail detail).

---

## 7. Key artefacts updated this session

| Artefact | Path |
|---|---|
| Impact Analysis (§6 ODs updated) | `memory/impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md` |
| Null-fields backend brief (NEW) | `memory/backend_briefs/BACKEND_BRIEF_CR363_CR366_NULL_FIELDS_2026_09_14.md` |
| Design guidelines (NEW) | `/app/design_guidelines.json` |
| Registry | `memory/control/registry.json` (CR-363 + CR-366 status_history) |
| CR Registry | `memory/control/CR_REGISTRY.md` (both rows updated) |

---

## 8. Do-Not-Retry (inherited + this session)

1. No 2nd `revenue-summary` call inside Night Audit (it already returns ADR/RevPAR).
2. No `fromDashboardKpisRange` — obsolete, dropped from scope.
3. No client-side money math in transforms (R6).
4. Do not touch `Sidebar.jsx` before combined SC ack.
5. Do not combine gates or skip role declaration.
6. `insightsCache` NOT used for CR-366 (OD-366-05 = no cache).

*Handover written 2026-09-14 · Planning agent (ALPHA v0.7)*
