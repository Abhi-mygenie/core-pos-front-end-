# Investigation — CR-524 columns / BUG-579 filtering / risk badge gap — 2026-11-19

**Role:** INVESTIGATION (Role 6) · No code changes · Confidence: HIGH
**Trigger:** Owner — "CR-524 columns not in UI", "does BUG-579 filter/show in UI", "doubt: high-risk badge on item".
**Screens:** CancellationsMockup.jsx (`/reports-module/cancellations`, screenshot 1) · CancelDetailMockup.jsx (`/reports-module/cancel-detail`, screenshot 2) · AuditLogMockup.jsx (risk tiers, CR-543).

## 1. CR-524 — Punch Time + Duration columns
- Implemented ONLY in **CancellationsMockup.jsx** "Cancellation Details" table: `th` Punch Time L944, Duration (min) L945; `td` L980-981; transform `punchTime=i.created_at` L282, `cancellationDuration` from created_at→cancel_time_full L284.
- Live data confirmed present (`created_at`, `cancel_time_full`) — not a backend gap.
- **GAP A (visibility):** Punch Time + Duration are the 11th/12th columns, placed AFTER "Cancelled By". Table only scrolls inside `overflow-x-auto` (L930); on a normal viewport the user sees up to "Cancelled By" (exactly screenshot 1) and never reaches them. Effectively invisible.
- **GAP B (wrong/omitted screen):** The dedicated **Item Cancellation Detail** screen (CancelDetailMockup.jsx — screenshot 2, columns Item/Qty/Loss/Stage/Reason/By/Order/Date, L136-143) has **no Punch Time / Duration columns at all.** CR-524 was never added here. This is the screen the owner is looking at.

## 2. BUG-579 — cancelled ₹ values + filtering
- ₹ values now render: Amount (CancellationsMockup L955), Loss + totals (CancelDetail L149/L161). Original "values not displaying" symptom RESOLVED in UI.
- Filtering EXISTS in CancelDetailMockup: stage + reason dropdowns (All Stages / All Reasons, L129-130, testids `s28-filter-stage` / `s28-filter-reason`) → users CAN filter by stage & reason and see filtered loss/qty.
- **GAP C (classification):** Backend still returns `stage="Unknown"`, `cancel_type="unknown"` for order-scope cancels (live probe 2026-11-19). These surface as an "Unknown" option in the stage filter and "—"/Unknown rows → filtering by stage is incomplete for order-scope lines. This is the deferred BUG-579 backend stage-classification gap (owner-pending), not a FE defect.

## 3. Risk / high-risk badge (owner "doubt")
- Duration-based risk tier EXISTS but ONLY in the Audit Report: AuditLogMockup `getRiskTier` (L68-74) — **doubt ≥5 min, risk ≥15 min, high_risk ≥30 min** (CR-543). Rendered as "High Risk Cancellations" card + RiskBar; uses `e.risk_level || getRiskTier(e.duration_minutes)` (L245).
- **GAP D (inconsistency):** The SAME punch→cancel duration that CR-524 now computes per row is NOT shown as a doubt/risk/high-risk badge on either cancellation table. Cancellation Details shows a raw "Duration (min)" number with no risk colour/badge; Item Cancellation Detail shows neither duration nor badge. So Audit flags "High Risk (30+ min)" while the cancellation detail rows give no visual risk cue.
- Open confirm: AuditLog risk tier derives from `duration_minutes`/`risk_level` (audit payload); CR-524 derives from created_at→cancel_time_full. Both are punch→cancel gaps and should agree, but the field sources differ — align before badging.

## Recommendations (no code yet — owner to pick)
1. CR-524 reach: add Punch Time + Duration to **CancelDetailMockup.jsx**, and/or move them left (next to Date) in CancellationsMockup so they're visible without horizontal scroll.
2. Risk badge: add a per-row doubt/risk/high-risk badge driven by `cancellationDuration` using the CR-543 thresholds (5/15/30 min), consistent across Cancellation Details, Item Cancellation Detail, and Audit.
3. BUG-579 order-scope "Unknown" stage: backend classification fix (owner-pending) — until then, UI could relabel "Unknown" → "Unclassified" and note it.

All three are frontend-surfacing gaps except GAP C (backend). Suggest raising a small CR for #1 + #2 (MEDIUM risk, report-only, no money path).
