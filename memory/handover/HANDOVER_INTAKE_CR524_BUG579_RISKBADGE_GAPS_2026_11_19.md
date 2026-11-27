# Handover → INTAKE/REGISTRY agent — CR-524 / BUG-579 / Risk-Badge gaps — 2026-11-19

**From:** Investigation (Role 6) · **To:** Intake/Registry agent
**Action required:** Summarize the gaps below to the owner, then **register the appropriate BUG(s) and/or scope-increase CR(s)** in the registry. Do NOT implement — this is intake only.
**Source of truth:** `/app/memory/investigations/INV-CR524-BUG579-RISK-BADGE_2026_11_19.md` + live probe `/app/memory/evidence/CR-524/live_probe_2026_11_19.json`.
**Owner was shown and confirmed these findings in chat on 2026-11-19 (screenshots of both report screens).**

---

## Owner correction (IMPORTANT — overrides investigation report GAP A)
The investigation report flagged "GAP A: Punch Time/Duration off-screen in Cancellations report." The owner's screenshot **disproves this** — in `CancellationsMockup.jsx` → "Cancellation Details" table, the owner CAN see the full column set end-to-end:
`ORDER # · ITEM · DATE · AMOUNT · STAGE · SCOPE · REASON · NOTES · CANCEL NOTE · CANCELLED BY · PUNCH TIME · DURATION (MIN) · STATION`.
➡️ **GAP A is WITHDRAWN.** Punch Time + Duration are present and visible on the Cancellations report. Do not register anything for GAP A.

## Backend fact confirmed with owner
Backend returns **only `created_at` (punch time) and `cancel_time_full` (cancel time)** — it does NOT send a precomputed time difference. The **Duration (min)** value is a **frontend computation** (`created_at → cancel_time_full`). Any new duration/risk surface must reuse this FE calc, not expect a backend field.

---

## Confirmed gaps to register

### GAP B — Item Cancellation Detail screen missing Punch Time + Duration columns  → register as **CR (scope increase on CR-524)** or new BUG
- Screen: `CancelDetailMockup.jsx` (`/reports-module/cancel-detail`, owner's screenshot 2).
- Current columns: Item / Qty / Loss / Stage / Reason / By / Order / Date (L136-143). **No Punch Time, no Duration.**
- CR-524 added those columns only to `CancellationsMockup.jsx`, never to this detail screen.
- Data is available (same `created_at` / `cancel_time_full`).
- **Owner wants parity:** add Punch Time + Duration columns here too.

### GAP D — No doubt/risk/high-risk badge per row on either cancellation report  → register as **scope-increase CR** (owner said "revamp of both screens")
- A duration-based risk tier EXISTS only in the Audit Report (`AuditLogMockup.jsx` `getRiskTier` L68-74, CR-543): **doubt ≥5 min, risk ≥15 min, high_risk ≥30 min**.
- Neither `CancellationsMockup.jsx` nor `CancelDetailMockup.jsx` shows a risk badge — Cancellations shows a raw "Duration (min)" number; Item Cancellation Detail shows neither.
- **Owner request:** add a per-row doubt/risk/high-risk badge driven by the FE-computed duration, using CR-543 thresholds (5/15/30 min), consistent across **both** report screens.
- ⚠️ **Alignment note for planning:** Audit derives risk from `duration_minutes`/`risk_level` (audit payload); CR-524 derives from `created_at→cancel_time_full`. Both are punch→cancel gaps and must agree — confirm field-source consistency before badging.

### Filters for these columns (owner's explicit clarification: "I am referring to filters for these columns in both reports")  → register as **scope-increase CR**
- **Cancellations report (`CancellationsMockup.jsx`):** detail table has **no inline column filters** at all. Owner wants to filter by Stage, Scope, Reason, Cancelled By, and Duration/risk-tier.
- **Item Cancellation Detail (`CancelDetailMockup.jsx`):** only Stage + Reason dropdowns exist today (testids `s28-filter-stage`, `s28-filter-reason`). Owner wants filters extended to the other columns incl. duration/risk tier.
- Net: filter coverage is incomplete on both screens and is the owner's primary ask.

### GAP C — order-scope cancels return `stage="Unknown"` / `cancel_type="unknown"`  → **BACKEND, owner-pending (do NOT register as FE bug)**
- Confirmed in live probe 2026-11-19. These surface as an "Unknown" stage-filter option / "—" rows, making stage filtering incomplete for order-scope lines.
- This is the pre-existing deferred BUG-579 backend classification gap — carry forward as backend/owner decision, not a frontend defect.

---

## Suggested registry entries (intake agent to finalize wording/IDs with owner)
1. **Scope increase on CR-524** (or new CR): add Punch Time + Duration columns to `CancelDetailMockup.jsx` (GAP B). MEDIUM risk, report-only, no money path.
2. **New CR**: per-row doubt/risk/high-risk badge on both cancellation report screens, CR-543 thresholds (GAP D). MEDIUM risk, report-only.
3. **New CR**: extend column filters (Stage/Scope/Reason/Cancelled By/Duration-risk) on both report screens. MEDIUM risk, report-only.
4. **Backend carry-forward** under BUG-579: order-scope stage/cancel_type "Unknown" classification (GAP C) — owner decision.

> Items 1–3 are pure frontend surfacing (no billing/money path) and can likely batch into one "Cancellation Reports parity + filters + risk badge" CR if the owner prefers a single change. Item 4 stays backend.

## Governance reminders for next agent
- This is INTAKE only — register in `memory/CR_REGISTRY.md` / `memory/control/registry.json`, set gate state accordingly, do NOT write code.
- When any of items 1–3 later get implemented and a reported-bug fix is applied, `testing_agent` verification is mandatory before declaring fixed.
- No secrets in chat; redact any owner-supplied credentials/tokens in summaries.
