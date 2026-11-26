# Batch Intake — Cancellation Reports parity + risk badge + filters — 2026-11-19

**Gate:** GATE_1_INTAKE (registration only — no code, no impact analysis yet)
**Sprint:** nov_cr_batch · **Assignee:** Abhishek · **Priority:** P0 · **Release date:** 2026-11-17 · **Client:** ALL
**Source of truth:** `investigations/INV-CR524-BUG579-RISK-BADGE_2026_11_19.md` + live probe `evidence/CR-524/live_probe_2026_11_19.json`
**Handover:** `handover/HANDOVER_INTAKE_CR524_BUG579_RISKBADGE_GAPS_2026_11_19.md`
**Owner confirmation:** Owner reviewed both report screens (screenshots) on 2026-11-19 and directed P0 + release 2026-11-17 in chat.

---

## Scope note (from investigation)
- **GAP A — RE-OPENED as BUG-713 (revalidated 2026-11-19).** The Punch Time + Duration columns exist in the DOM but are the **11th/12th of 13 columns** (after "Cancelled By") inside `overflow-x-auto` (`CancellationsMockup.jsx` L930; headers L944-945, cells L980-981). On a normal viewport the user only sees through "Cancelled By" and must scroll horizontally to reach them → **effectively invisible**. The handover's withdrawal relied on a scrolled/wide screenshot; owner confirms not visible on screen. Matches the original investigation GAP A. Registered as **BUG-713** (P0, 2026-11-17).
- **Backend fact:** backend returns only `created_at` (punch time) and `cancel_time_full` (cancel time); **Duration (min)** is a **frontend computation** (`created_at → cancel_time_full`). Any new duration/risk surface must reuse this FE calc, not expect a backend field.

---

## Registered items

### BUG-713 — Cancellation Report: Punch Time + Duration columns off-screen / not visible (GAP A re-opened)
- **Type:** BUG · **Priority:** P0 · **Risk:** LOW · **Area:** Reports / Analytics
- **Gap:** GAP A (visibility), re-opened after revalidation 2026-11-19. CR-524 added Punch Time + Duration to `CancellationsMockup.jsx`, but they render as columns 11-12 of 13 (after "Cancelled By"), inside `<div overflow-x-auto>` (L930). On a normal viewport only columns through "Cancelled By" are visible; Punch Time/Duration/Station require horizontal scroll → effectively invisible by default.
- **Evidence:** headers L944-945, cells L980-981, container L930 in `CancellationsMockup.jsx`. Owner confirms not visible on screen; matches investigation `INV-CR524-BUG579-RISK-BADGE_2026_11_19.md` GAP A.
- **Reverses:** the GAP A withdrawal in `handover/HANDOVER_INTAKE_CR524_BUG579_RISKBADGE_GAPS_2026_11_19.md` (which relied on a scrolled/wide screenshot).
- **Expected / fix direction (Gate 2+):** surface Punch Time + Duration without horizontal scroll (reorder or pin the columns, or responsive layout).
- **Relates to:** CR-524 (added the columns), CR-554 (detail-screen parity).

### CR-554 — Item Cancellation Detail: add Punch Time + Duration columns (parity with CR-524)
- **Type:** CR · **Priority:** P0 · **Risk:** MEDIUM · **Area:** Reports / Analytics
- **Gap:** GAP B. Screen `CancelDetailMockup.jsx` (`/reports-module/cancel-detail`). Current columns: Item / Qty / Loss / Stage / Reason / By / Order / Date (L136-143) — **no Punch Time, no Duration**.
- CR-524 added those columns only to `CancellationsMockup.jsx`, never to this detail screen. Data is available (`created_at` / `cancel_time_full`; duration = FE calc).
- **Expected:** add Punch Time + Duration columns here for parity with the main Cancellations report.
- **Relates to:** CR-524.

### CR-555 — Per-row doubt/risk/high-risk badge on BOTH cancellation report screens (CR-543 thresholds)
- **Type:** CR · **Priority:** P0 · **Risk:** MEDIUM · **Area:** Reports / Analytics
- **Gap:** GAP D. A duration-based risk tier exists only in the Audit Report (`AuditLogMockup.jsx` `getRiskTier` L68-74, CR-543): **doubt ≥5 min, risk ≥15 min, high_risk ≥30 min**. Neither `CancellationsMockup.jsx` (shows raw "Duration (min)" number) nor `CancelDetailMockup.jsx` (shows neither) displays a risk badge.
- **Expected:** per-row doubt/risk/high-risk badge driven by the FE-computed duration, using CR-543 thresholds (5/15/30 min), consistent across **both** report screens.
- **Alignment note (for Gate 2 IA):** Audit derives risk from `duration_minutes` / `risk_level` (audit payload); CR-524 derives from `created_at → cancel_time_full`. Both are punch→cancel gaps and must agree — confirm field-source consistency before badging.
- **Relates to:** CR-543, CR-524.

### CR-556 — Extend inline column filters on BOTH cancellation report screens
- **Type:** CR · **Priority:** P0 · **Risk:** MEDIUM · **Area:** Reports / Analytics
- **Gap:** Filters (owner's primary ask: "filters for these columns in both reports").
  - `CancellationsMockup.jsx`: detail table has **no inline column filters** at all.
  - `CancelDetailMockup.jsx`: only Stage + Reason dropdowns today (testids `s28-filter-stage`, `s28-filter-reason`).
- **Expected:** filters for Stage, Scope, Reason, Cancelled By, and Duration/risk-tier on both screens.
- **Relates to:** CR-554, CR-555.

---

## Carried forward (NOT a new item)
- **GAP C → BUG-579 (backend, owner-pending).** Order-scope cancels return `stage="Unknown"` / `cancel_type="unknown"` (confirmed in live probe 2026-11-19). Surfaces as an "Unknown" stage-filter option / "—" rows → incomplete stage filtering. This is the pre-existing deferred BUG-579 backend classification gap — carried forward as backend/owner decision, **not** a frontend defect. Note appended to BUG-579.

---

## Governance
- INTAKE only. No code written. Next gate for each CR = Gate 2 (Impact Analysis).
- Items CR-554..556 are pure frontend surfacing (no billing/money path) and may batch into one implementation later if the owner prefers a single change.
- When implemented, `testing_agent` verification is mandatory before any item is declared fixed.

*Registered 2026-11-19 — Intake/Registry role.*
