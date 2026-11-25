# CR-543 — Late Cancellation Audit: Time-Threshold-Based Flagging

**Registered:** 2026-11-16
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants a **configurable time threshold** at the restaurant settings level (e.g. 20 minutes). Any item or order cancelled **more than X minutes after it was punched/added** is flagged as a "late cancellation" audit event on the **Order Edit Audit** page (`AuditLogMockup.jsx`).

**Replaces:** The earlier plan to track "cancel before serve" / "cancel after serve" as separate event types (CR-443 items 6–9). Kitchen stage data is unreliable (BUG-603/604 proved `cancel_type` is often "Order" or "unknown"). Time-based is objective and catches the real risk: food was likely cooked after X minutes, so cancelling = guaranteed waste or fraud.

**Current behaviour:** No time-based cancellation flagging exists. The Order Edit Audit page only tracks Make Unpaid and Payment Method Change events.

**Expected behaviour:**
- New restaurant setting: `cancel_audit_threshold_minutes` (integer, default 0 = off)
- When set (e.g. 20), any item or order cancelled where `cancel_time − punch_time > threshold` appears as an audit event
- Shows on Order Edit Audit page as a new KPI card ("Late Cancellations") + rows in the Audit Trail table
- Event type: `late_cancel`
- Each row shows: Order ID, item name, amount, who cancelled, punch time, cancel time, duration (minutes)

---

## 2. Classification

- **Type:** CR
- **Severity:** P0 — Critical (fraud/waste detection — owner directive)
- **Risk:** MEDIUM — touches restaurant settings + insights-dashboard audit response + AuditLogMockup.jsx
- **Area:** Reports / Audit / Settings
- **Fast Lane:** NOT eligible (new setting + new audit event type + backend dependency)

---

## 3. Duplicate Check

- CR-443 (Leakage Alerts — Batch E, deferred): was going to track cancel-before/after-serve as alerts. **CR-543 REPLACES that cancellation portion** with time-threshold approach. CR-443's non-cancel alerts (discount, comp, payment change) remain separate.
- CR-524 (Punch Time + Duration on cancellation report): RELATED — both need `punched_at` from backend. CR-524 shows duration as a report column; CR-543 uses duration for audit flagging.
- CR-494 (PIN thresholds): DISTINCT — PIN gates the action; CR-543 reports it after the fact.
- **Result: DISTINCT** — no time-threshold cancellation audit exists

---

## 4. Evidence

- **Source:** OWNER-DIRECTED (2026-11-16 session)
- **Confidence:** CONFIRMED
- **Rationale:** Kitchen stage (`cancel_type`) is unreliable per BUG-603/604 (19% of Pav2 cancellations have no stage). Time-based threshold is objective.

---

## 5. Data Flow

### Setting
| Field | Endpoint | Type | Values | Default |
|---|---|---|---|---|
| `cancel_audit_threshold_minutes` | `GET /profile` → `restaurants[0]` | integer | 0 = off, any positive integer = threshold in minutes | 0 |
| `cancel_audit_threshold_minutes` | `GET /settings-list` | integer | same | 0 |
| `cancel_audit_threshold_minutes` | `POST /update-settings` | integer | same | — |

### Audit events (two options — owner to decide)

**Option A — Backend computes:** Backend adds `late_cancel` events to `insights-dashboard` → `audits.orders[]` when `cancel_time − punch_time > threshold`. FE just renders them like existing audit events.

**Option B — FE computes:** Backend returns `punched_at` on each cancellation item (same as CR-524 ask). FE reads the threshold from settings and filters locally. Audit events are computed client-side from `insights-cancellations` data.

**Recommended:** Option A (backend computes) — keeps audit logic server-side, consistent with how Make Unpaid and Payment Method Change work today. FE only renders.

### Audit event shape (Option A)
```json
{
  "order_id": "021544",
  "type": "late_cancel",
  "food_name": "Paneer Tikka",
  "amount": 350.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:10:00",
  "cancel_time": "2026-11-16T14:45:00",
  "duration_minutes": 35,
  "scope": "item"
}
```

### FE changes
| File | Change |
|---|---|
| `AuditLogMockup.jsx` | Add "Late Cancellations" KPI card + render `late_cancel` rows in Audit Trail |
| `insightsService.js` | Map `late_cancel_count` from `audits` response |
| `RestaurantSettingsPage.jsx` | Add threshold input field in settings (if settings UI is in scope) |

---

## 6. Blast Radius

- `AuditLogMockup.jsx` — add KPI card + table row type (SMALL, additive)
- `insightsService.js` → `transformDashboardResponse` — map new count (SMALL)
- `RestaurantSettingsPage.jsx` — new setting field (SMALL)
- Backend: `insights-dashboard` audit computation + new setting key
- **Estimated scope:** MEDIUM (3 FE files + backend setting + audit computation)

---

## 7. Open Questions

- OD-543-01: Option A (backend computes audit events) or Option B (FE computes from cancellation data + threshold)?
  - **Recommended:** Option A
- OD-543-02: Should the threshold apply to both item-level AND order-level cancels, or only item-level?
  - **Recommended:** Both
- OD-543-03: Default threshold value when first enabled — 20 minutes?

---

## 8. Dependencies

- **CR-524:** Both need `punched_at` (item punch timestamp) from backend. If Option A is chosen, CR-543 doesn't directly need `punched_at` in FE — backend handles it internally. But the underlying backend data requirement is shared.
- **Backend ASK (Gyan):** New setting key `cancel_audit_threshold_minutes` + late_cancel events in `insights-dashboard` → `audits`

---

## 9. Related

- CR-524 (Punch Time + Duration — shared `punched_at` dependency)
- CR-528 (Post-bill-print audit — same audit page, additive)
- CR-443 (Leakage Alerts — cancel portion replaced by CR-543; discount/comp/payment alerts remain)
- BUG-603/604 (cancel_type unreliable — motivation for time-based approach)
