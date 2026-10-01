# Session Handover — CR-363 + CR-366 (Gate 2 complete → awaiting owner decisions)

```
Written:          2026-09-14
Status at close:  CR-363 + CR-366 Gate 2 Impact Analysis DONE. R11 preprod probes PASS.
                  BLOCKED on 6 owner Open Decisions before Gate 3 (Implementation Plan) can start.
Next agent role:  PLANNING (declare role explicitly before acting — Alpha rules, no gate-combining)
Workspace:        /app  (frontend branch PMS13; frontend-only work)
```

---

## 1. What this session covered (all done)

**Role taken:** PLANNING — Impact Analysis ONLY (owner said Gate 2 only, do not write Gate 3).

| Area | Result |
|---|---|
| Code reality | **NONE** — 0 hits for night-audit / revenue-summary / RevPAR / RevenueDashboard in `src/`. No existing constants, routes, or sidebar entries. |
| Conflict pre-check | `pmsService.js`, `App.js`, `constants.js` shared with CR-364/CR-365 → all additive, **parallel-safe**. `Sidebar.jsx` is **frozen post-P1** → needs **one combined SC ack** (CR-363 + CR-366 [+ CR-365]) before it can be touched. `aiosellTransform.js` **dropped** from CR-366 scope (`fromDashboardKpisRange` obsolete). |
| R11 preprod probes (curl) | `night-audit?date=` → **200** · no-date → **422** · `revenue-summary` day/week → **200** · no-params → **422**. Payloads saved in `evidence/CR-363/` and `evidence/CR-366/`. Verified response shapes documented in Impact doc §1.1 / §1.2. |
| 9 data observations (N1–N9) | Recorded in Impact doc §1.3 (nulls, occupancy>100%, ADR collected≫booked, `status_as_of=current` on past dates, etc.) → backend notes BN-1..6, none block Gate 2. |
| Owner decision resolved | **OD-366-04 → Revenue Dashboard = Sidebar child under Rooms & Reservations** (same as Night Audit). |
| Deliverables | `impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md` (§0–§9). Registries synced: `registry.json`, `CR_REGISTRY.md`, both intake docs. Credentials added to `test_credentials.md`. |

**No application source code was changed this session.** Documentation/analysis phase only.

---

## 2. ACTION FOR NEXT AGENT — ask these 6 questions in plain English, all at once

When the owner asks, present the following as one numbered list (plain English, no CR jargon). These are the blockers for Gate 3. Defaults are proposals only — nothing has been guessed into a plan.

> **1. Old-date Night Audit — room status board.**
> The room-status section always reflects rooms *as they are right now*, even when you pick a past date (backend limitation). For a past date, would you rather:
> a) still show it with a clear "as of now" badge, or
> b) hide that one section for past dates?
> *(proposed default: a — show with badge)*

> **2. Night Audit — outstanding guest names.**
> The backend currently sends the outstanding-balance rows without guest names (comes through blank). Do you want to:
> a) ship now showing "—" where the name is missing (and we file a backend fix request), or
> b) wait until the backend fills in guest names before shipping?
> *(proposed default: a — ship with "—")*

> **3. Revenue Dashboard — data freshness / caching.**
> The numbers are computed live each time. Do you want:
> a) always live, no caching (simplest), or
> b) briefly cache results for ~15 minutes to load faster on repeat views?
> *(proposed default: a — no cache. Note: option b stores data in the browser and bumps this feature's risk up.)*

> **4. Revenue Dashboard — compare to previous period.**
> Should each KPI tile also show the change vs the previous period (e.g. "+12% vs last week")? This needs a second backend call.
> a) yes, show comparisons · b) no, keep v1 simple
> *(proposed default: b — no, for v1)*

> **5. Revenue Dashboard — default date range when the page opens.**
> Should it open on Today, last 7 days, or last 30 days?
> *(proposed default: last 30 days)*

> **6. Revenue Dashboard — "Booked" vs "Collected" figures.**
> These are two different numbers (sales booked vs cash actually collected). Do you want them:
> a) always shown side-by-side, or
> b) one shown at a time with a toggle (Booked as default)?
> *(proposed default: a — side-by-side)*

Also flag (not a question, just confirm): a **combined Sidebar unfreeze ack** is needed to add the two new sidebar entries — confirm it can cover CR-363 + CR-366 (and CR-365 Housekeeping if the owner wants a single unfreeze).

---

## 3. After the owner answers → path forward

1. Record the 6 answers into Impact doc §6 (and intake docs) + sync `registry.json` / `CR_REGISTRY.md`. **Declare PLANNING role for Gate 3.**
2. Gate 3 entry checklist (Impact doc §8): probe `revenue-summary…group_by=month` once (BN-6); confirm `utils/reportExporter.js` param contract; get combined Sidebar SC ack; re-verify target lines in `constants.js`, `pmsService.js`, `App.js`, `Sidebar.jsx`.
3. Then write the Gate 3 Implementation Plan (still no code until plan approved).
4. Gate 4 = implementation (12 files total: 4 NEW pages/transforms, 4 shared MOD files — build as one combined change-set so Sidebar is touched once).

---

## 4. Other blocked CRs to take forward (owner wants these next, in order)

- **CR-364 — Guest Folio (data path).** Gate 2 Impact Analysis not started. `get-single-order-new` enrichment; adds route `/pms/folio/:orderId` + `getGuestFolio` in `pmsService.js`. Print-folio path deferred (backend Q-364P-10, needs `rtype='RM'` template).
- **CR-357 — Room Advance Full-Bill Deduction.** Gate 2 not started. Option B chosen (FE calculates combined balance). Goal: re-enable the disabled `+ Pay` button (`CartPanel.jsx:1484`) with F&B attribution. Workaround formula: `liveBalance = Math.min(associatedTotal, remainingRoomBalance)`. Will touch `CartPanel.jsx` + `RecordPaymentModal.jsx` at Gate 4.
- **BUG-193 — Room Transfer Trail** (shows table transfers + "From Room" = 0). Not started; needs Gate 0-1 intake/RCA. Same lifecycle-log gap family as observation N4 (`audit_trail[].detail` ids null) — likely shared backend root.

---

## 5. Do-Not-Retry (learned this session)

1. Do **not** add a 2nd `revenue-summary` call inside Night Audit — `night-audit` already returns ADR/RevPAR/tender split/TRevPAR.
2. Do **not** implement `fromDashboardKpisRange` — obsolete, dropped from scope.
3. **No client-side money math** in either transform (R6) — display backend fields as-is; only null-normalise and number-coerce.
4. Do **not** touch `Sidebar.jsx` before the combined SC ack.
5. Do **not** combine gates or skip role declaration (Alpha rules).

---

## 6. Key references
- Impact doc: `/app/memory/impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md` (§1 probe shapes, §4 files, §6 owner decisions, §8 Gate 3 checklist)
- Evidence: `/app/memory/evidence/CR-363/`, `/app/memory/evidence/CR-366/`
- Workflow rules: `/app/memory/control/AGENT_PROMPT_ALPHA.md`
- Credentials: `/app/memory/test_credentials.md` (preprod owner login for probes)
- Registries: `/app/memory/control/registry.json`, `CR_REGISTRY.md`

*Handover written 2026-09-14.*
