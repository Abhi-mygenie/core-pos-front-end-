# BATCH-C CR-543 API Contract v2 — Late Cancellation Audit: Risk-Tiered Flagging

**CR:** CR-543
**Batch:** C — ASK 3
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`
**Assigned to:** Gyan
**Priority:** P0
**Date:** 2026-11-17 (v2 — owner: fixed 4-tier risk, replaces configurable threshold)
**Status:** BLOCKING
**Supersedes:** `BATCH-C_CR-543_API_CONTRACT_2026_11_17.md` (v1 — single threshold approach)

---

## Owner Decision (LOCKED 2026-11-17)

Replace single configurable `cancel_audit_threshold_minutes` with a **fixed 4-tier risk classification** based on time between item punch and cancellation:

| Tier | Duration (punch → cancel) | Risk Level | Color (FE) |
|------|--------------------------|------------|------------|
| 1 | **0–5 minutes** | ✅ OK | Green |
| 2 | **5–15 minutes** | ⚠️ Doubt | Yellow/Amber |
| 3 | **15–30 minutes** | 🔶 Risk | Orange |
| 4 | **30+ minutes** | 🔴 High Risk | Red |

**No restaurant setting needed.** Tiers are fixed for all restaurants. This simplifies the backend (no settings API) and gives consistent audit standards across clients.

---

## Detection Logic

For every cancelled item in the date range:
1. Compute `duration_minutes = cancel_time − punch_time` (minutes)
2. Classify into risk tier based on the table above
3. Emit `late_cancel` event with `risk_level` field

**All cancellations get classified** — even "OK" tier items are returned so the audit page can show the full picture with color-coded breakdown.

---

## New Event Type: `late_cancel`

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

| Field | Type | Description |
|---|---|---|
| `type` | string | `"late_cancel"` LOCKED |
| `order_id` | string | Order ID (preserve leading zeros) |
| `food_name` | string | Cancelled item name (null for full-order cancel) |
| `amount` | number | ₹ value of cancelled item/order |
| `by` | string | Employee who cancelled |
| `punch_time` | datetime | When item was originally punched/added |
| `cancel_time` | datetime | When the cancel happened |
| `duration_minutes` | integer | Minutes between punch and cancel |
| `risk_level` | string | **NEW** — `"ok"` / `"doubt"` / `"risk"` / `"high_risk"` |
| `scope` | string | `"item"` or `"order"` |

### Risk level values (LOCKED):

| `risk_level` value | Duration range |
|---|---|
| `"ok"` | 0–5 min |
| `"doubt"` | 5–15 min |
| `"risk"` | 15–30 min |
| `"high_risk"` | 30+ min |

---

## New KPI Counts

| Field | Type | Description |
|---|---|---|
| `late_cancel_count` | integer | Total cancellations (all tiers) |
| `late_cancel_ok_count` | integer | 0–5 min cancellations |
| `late_cancel_doubt_count` | integer | 5–15 min cancellations |
| `late_cancel_risk_count` | integer | 15–30 min cancellations |
| `late_cancel_high_risk_count` | integer | 30+ min cancellations |

---

## What Changed from v1

| v1 (superseded) | v2 (current) |
|---|---|
| Single configurable `cancel_audit_threshold_minutes` | Fixed 4-tier risk classification |
| Need settings API (`GET /settings-list`, `POST /update-settings`) | **No settings needed** — tiers are hardcoded |
| Only flags cancels ABOVE threshold | Classifies ALL cancels into tiers |
| 1 KPI count | 5 KPI counts (total + per tier) |
| No `risk_level` field | `risk_level` field per event |

---

## Dependency

Requires `punched_at` / `created_at` per item (ASK 1 / CR-524 — ✅ DONE). Backend uses existing timestamp data.

---

## FE Preview (once backend delivers)

| Element | What it shows |
|---|---|
| 4 KPI cards | Doubt (amber), Risk (orange), High Risk (red), Total |
| Table rows | Color-coded risk badge per row |
| Filter | Optional: filter by risk tier |
| "OK" items | Shown but de-emphasized (green/grey) — not a concern |

---

## Backward Compatibility

- Additive only — no breaking changes
- **No settings API changes** (removed the threshold setting requirement)
- Same endpoint, same response structure
- No migration needed
