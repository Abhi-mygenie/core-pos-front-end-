# CR-543 — Impact Analysis (Gate 2) — Late Cancellation Audit: Risk-Tiered Flagging

**ID:** CR-543
**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-17
**Risk:** HIGH (audit/compliance, fraud/waste detection)
**Code Reality:** NONE — no code exists for `late_cancel` event type
**Conflict Pre-Check:** CLEAN (see §4)

---

## 1. Owner Decision (LOCKED 2026-11-17)

**Replaces** the original configurable-threshold approach (v1) with a **fixed 4-tier risk classification**:

| Tier | Duration (punch → cancel) | Risk Level | `risk_level` value | FE Badge Color |
|------|--------------------------|------------|-------------------|---------------|
| 1 | **0–5 minutes** | ✅ OK | `"ok"` | Green |
| 2 | **5–15 minutes** | ⚠️ Doubt | `"doubt"` | Amber |
| 3 | **15–30 minutes** | 🚩 Risk | `"risk"` | Orange |
| 4 | **30+ minutes** | 🔴 High Risk | `"high_risk"` | Red |

**No restaurant setting needed.** Tiers are hardcoded — consistent audit standard across all clients.

---

## 2. What’s Needed — Backend Delivery

Backend must classify every cancellation by time-since-punch and return as audit events.

### New event type in `insights-dashboard` → `audits.orders[]`:

```json
{
  "type": "late_cancel",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 350.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:10:00",
  "cancel_time": "2026-11-16T14:45:00",
  "duration_minutes": 35,
  "risk_level": "high_risk",
  "scope": "item"
}
```

### New KPI counts:
| Field | Type | Description |
|-------|------|-------------|
| `late_cancel_count` | integer | Total cancellations (all tiers) |
| `late_cancel_ok_count` | integer | 0–5 min |
| `late_cancel_doubt_count` | integer | 5–15 min |
| `late_cancel_risk_count` | integer | 15–30 min |
| `late_cancel_high_risk_count` | integer | 30+ min |

### Dependency:
Requires `punched_at` (ASK 1 / CR-524 — ✅ DONE).

**Backend contract:** `briefs/BATCH-C_CR-543_API_CONTRACT_2026_11_17_v2.md`

---

## 3. Current Code — AuditLogMockup.jsx (208 lines after CR-528)

### AUDIT_TYPE_MAP (L23-29):
5 entries.
**Gap:** No `late_cancel` entry.

### Analytics memo (L82-100):
5 event filters + 5 counts.
**Gap:** No late_cancel filters or risk-tier counts.

### KPI strip (L151-158):
6 cards.
**Gap:** No late-cancel KPI cards. Need 3-4 cards (Doubt/Risk/High Risk + Total, or all 4 tiers).

### Table (L164-193):
10 columns with type-aware rendering.
**Gap:** No `risk_level` badge rendering, no `punch_time`, `duration_minutes` columns.

### Export (L102-126):
6 KPIs + 11 columns.
**Gap:** No late-cancel KPIs or risk/duration columns.

---

## 4. FE Edit Plan — All Changes in AuditLogMockup.jsx Only

### E1 — AUDIT_TYPE_MAP: Add 1 entry with risk-level sub-styling
```javascript
late_cancel: { label: 'Late Cancel', bg: 'bg-yellow-100', text: 'text-yellow-700' }, // CR-543: base style, overridden by risk_level
```
Plus a risk-level color map for badges:
```javascript
const RISK_COLORS = {
  ok:        { bg: 'bg-green-100',  text: 'text-green-700',  label: 'OK' },
  doubt:     { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Doubt' },
  risk:      { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Risk' },
  high_risk: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'High Risk' },
};
```
+8 lines.

### E2 — Analytics memo: Add filters + 5 counts
```javascript
const lateCancel = orders.filter(o => o.type === 'late_cancel');
// In return:
lateCancel,
lateCancelCount: audits.late_cancel_count || lateCancel.length,
lateCancelOkCount: audits.late_cancel_ok_count || lateCancel.filter(o => o.risk_level === 'ok').length,
lateCancelDoubtCount: audits.late_cancel_doubt_count || lateCancel.filter(o => o.risk_level === 'doubt').length,
lateCancelRiskCount: audits.late_cancel_risk_count || lateCancel.filter(o => o.risk_level === 'risk').length,
lateCancelHighRiskCount: audits.late_cancel_high_risk_count || lateCancel.filter(o => o.risk_level === 'high_risk').length,
```
+8 lines.

### E3 — KPI strip: Add 3 cards (Doubt + Risk + High Risk)
Amber, orange, red themed cards. "OK" omitted from KPIs (not a concern).
+9 lines.

### E4 — Table: Risk-level badge + duration columns
`late_cancel` rows show:
- Risk-level sub-badge (colored by `RISK_COLORS[o.risk_level]`) instead of generic type badge
- `punch_time` in a column
- `duration_minutes` with suffix "min"
- `food_name` in Item column
+6 lines.

### E5 — Export: Add 4 KPIs + columns
```javascript
{ label: 'Late Cancel — Doubt', value: analytics.lateCancelDoubtCount },
{ label: 'Late Cancel — Risk', value: analytics.lateCancelRiskCount },
{ label: 'Late Cancel — High Risk', value: analytics.lateCancelHighRiskCount },
{ label: 'Late Cancel — Total', value: analytics.lateCancelCount },
// Columns:
{ key: 'punch_time', label: 'Punch Time', ... },
{ key: 'duration_minutes', label: 'Duration (min)', ... },
{ key: 'risk_level', label: 'Risk Level', ... },
```
+8 lines.

---

## 5. Conflict Pre-Check

| Item | File | Conflict? |
|------|------|-----------|
| CR-528 (IMPLEMENTED) | AuditLogMockup.jsx | **NO** — additive |
| CR-544 (IA) | AuditLogMockup.jsx | **NO** — different type keys |
| CR-546 (IA) | AuditLogMockup.jsx | **NO** — different type keys |

**Result: CLEAN.**

---

## 6. Files Changed Summary

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `AuditLogMockup.jsx` | E1-E5: type map, risk colors, analytics, KPIs, table, export | ~39 | LOW (additive) |
| **Total** | **1 file** | **~39** | **LOW** |

**Files WILL NOT touch:** insightsService.js, any transform, any other page, any settings page

---

## 7. Verification Matrix

| # | Check | Expected |
|---|-------|----------|
| V1 | 3 new KPI cards (Doubt/Risk/High Risk) | Amber/Orange/Red cards with counts |
| V2 | Risk-level badge per late_cancel row | Colored badge: OK/Doubt/Risk/High Risk |
| V3 | `punch_time` and `duration_minutes` render | Time + "35 min" format |
| V4 | Existing 5 event types unchanged | No regression |
| V5 | Excel export includes 4 KPIs + 3 columns | risk_level, punch_time, duration |
| V6 | `// CR-543` markers | ≥4 hits |
| V7 | Webpack 0 new warnings | compiled |

---

## 8. Combined Audit Page Evolution (all CRs)

| Sprint | Event Types | KPI Cards |
|--------|------------|----------|
| CR-011 (original) | 2 | 3 |
| + CR-528 | 5 | 6 |
| + CR-544 | 6 | 7 |
| + CR-546 | 8 | 9 |
| **+ CR-543** | **9** | **12** (9 + 3 risk tiers) |

---

## 9. Dependencies

| # | Dependency | Status |
|---|-----------|--------|
| D1 | Backend: `late_cancel` events with `risk_level` + 5 KPI counts | **BLOCKING** — ASK 3 v2 |
| D2 | CR-524 `punched_at` delivered | ✅ DONE |
| D3 | CR-528 implemented (page exists) | ✅ DONE |

---

```
Planning complete: CR-543
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: HIGH (fraud detection) / LOW (FE scope)
Files WILL change: AuditLogMockup.jsx (~39 lines)
Owner decisions: LOCKED — 4-tier risk (OK/Doubt/Risk/High Risk), no settings
Docs: impact/CR-543_IMPACT_ANALYSIS.md
Next: Gate 3 (Plan) once backend delivers ASK 3
```

---

## 10. REVISED DESIGN DECISIONS (2026-11-17 Owner Review)

**Supersedes §4 E3 (KPI strip) and §8 (Combined Evolution).**

### Changes from original IA:
1. **Card 1 shows FULL risk bar** — Doubt (5–15 min) + Risk (15–30 min) + High Risk (30+ min). Not just 30+.
2. **₹ Money leakage** shown on card: sum of cancelled amounts where duration ≥ 5 min.
3. **Card click → Cancellation Report** (`?filter=high_risk`) — timing tier details live there, NOT on Audit page.
4. **Overlap Approach C:** Late cancel events also appear in Card 2 (Leakage After Unpaid) or Card 3 (Leakage After Print) if the same event matches those conditions. Each row gets multi-category tags in drill-down.
5. **KPI bar:** No separate late-cancel KPI count in top bar. Card 1 is the risk view.

### Ref: `design/AUDIT_REPORT_DESIGN_DECISIONS_LOCKED_2026_11_17.md` (consolidated decisions)
