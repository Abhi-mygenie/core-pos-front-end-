# CR-524 — Cancellation Report: Punch Time + Cancellation Duration — Impact Analysis (Gate 2) — 2026-11-15

**Role:** PLANNING (Gate 2 only)
**Code Reality:** PARTIAL — `createdAt` field mapped in FE transform but API does NOT return it; duration computation missing entirely
**Conflict Pre-Check:** CLEAR — no open items on CancellationsMockup.jsx
**Risk:** LOW (additive columns, no logic/financial change) — but BACKEND-BLOCKED for `created_at`
**Backend-blocked:** YES — `created_at` (punch timestamp) absent from `insights-cancellations` API

> **REVISED 2026-11-15 (write probe + owner round 2) — see bottom section. It adds the split-line and timezone rules.**

---

## Owner Decisions (locked)

| Decision | Value |
|----------|-------|
| Punch Time | When the item was added = `created_at` from API |
| Cancellation Duration | Minutes elapsed between punch time and cancellation time |
| Duration format | Minutes only (integer) |

---

## Probe Results — `POST /api/v2/vendoremployee/report/insights-cancellations`

Probed 2026-11-15 on RID 644 (CAFE 103), Nov 1–15 window. 23 items returned.

**Fields present in API response per item:**

```
food_id, name, food_name, unit_price, scope, qty, amount, value, item_total,
discount, service_charge, gst, vat, stage, cancel_type, reason, notes,
cancel_date, cancel_time, cancelled_by, punched_by, station,
order_id, order_number, restaurant_order_id, table_no, table_name, order_date
```

**Key finding:**
- `cancel_time: "16:15"` — time of cancellation (HH:MM only, no date component)
- `cancel_date: "2026-11-01"` — date of cancellation (no time component)
- `order_date: "2026-11-01"` — date of order placement (no time component)
- **`created_at`: MISSING** — not in API response
- **`punched_at`: MISSING** — not in API response
- No full punch timestamp (date + time) is available to compute duration

Evidence: `/app/memory/evidence/BATCH-C-IA/probes_2026_11_15/01c_cr524_items_full.txt`

---

## Data Flow Trace

```
API: POST /api/v2/vendoremployee/report/insights-cancellations
  → response.items[*]
  → CancellationsMockup.jsx (cancelledItems useMemo, L252-283):
      createdAt: i.created_at || ''   ← MAPPED but always '' (API never sends it)
      orderTime: i.cancel_time || ''  ← cancellation time HH:MM (exists in API)
      cancelAt: i.cancel_at || ''     ← also mapped; not in API response
      
  → columns array (L394-408):
      { key: 'orderNumber', label: 'Order #' },
      { key: 'orderDate', label: 'Date' },
      { key: 'orderTime', label: 'Time' },   ← this shows cancel_time
      { key: 'foodName', label: 'Item' },
      { key: 'qty' }, { key: 'amount' }, { key: 'stage' },
      { key: 'scope' }, { key: 'reason' }, { key: 'cancelledBy' },
      { key: 'station' }
      
  MISSING: punchTime column, cancellationDuration column
  BLOCKER: cancel_time is HH:MM only; created_at not returned by API
           → cannot compute duration (need full ISO timestamps from backend)
```

---

## Affected Code (once backend adds the field)

| Site | File | Line | Change |
|------|------|------|--------|
| T-1 | `CancellationsMockup.jsx` | ~L259 | Add `punchTime: i.created_at \|\| ''` to transform mapping (or reuse existing `createdAt`) |
| T-2 | `CancellationsMockup.jsx` | ~L260 | Add `cancellationDuration` computation: `Math.round((new Date(i.cancel_time_full) - new Date(i.created_at)) / 60000)` |
| T-3 | `CancellationsMockup.jsx` | ~L405 | Add column `{ key: 'punchTime', label: 'Punch Time', format: 'text', align: 'left', width: 80 }` |
| T-4 | `CancellationsMockup.jsx` | ~L406 | Add column `{ key: 'cancellationDuration', label: 'Duration (min)', format: 'integer', align: 'right', width: 80 }` |

**Note on T-2:** Backend must return both `created_at` (full ISO, e.g. `2026-11-01T16:10:00`) AND `cancel_time` as full ISO (or the existing `cancel_time` HH:MM paired with `cancel_date`). Duration = `cancel_datetime − created_at` in minutes.

---

## Files WILL change

| File | Change |
|------|--------|
| `src/pages/reports-module/CancellationsMockup.jsx` | Add `punchTime` + `cancellationDuration` to transform + columns array |

## Files WILL NOT touch

| File | Reason |
|------|--------|
| `reportService.js` | No new API call needed; same endpoint |
| `reportTransform.js` | Cancellations use their own inline transform in Mockup |
| All other report pages | Zero blast radius |

---

## Backend Dependency (BLOCKING)

| Field needed | Endpoint | Current | Required |
|---|---|---|---|
| `created_at` | `insights-cancellations` | MISSING | Full ISO datetime of item punch (e.g. `2026-11-01T16:10:00`) |
| `cancel_time` (full ISO) | Same | HH:MM only | Full ISO datetime of cancellation OR keep `cancel_date` + `cancel_time` and let FE combine |

**Minimum ask to backend:** Add `created_at` (item punch timestamp, full ISO) to the `insights-cancellations` items response.

**Duration FE computation (once field available):**
```js
const punchDt = new Date(`${i.cancel_date}T${i.created_at}`); // if only time returned
// OR: new Date(i.created_at) if ISO full timestamp
const cancelDt = new Date(`${i.cancel_date}T${i.cancel_time}`); // combine existing fields
const durationMin = Math.max(0, Math.round((cancelDt - punchDt) / 60000));
```

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | Backend doesn't track punch time for order-level cancellations | LOW | Column shows `—` when field absent; no blank crash |
| R-2 | Negative duration if clocks skew / data anomaly | LOW | `Math.max(0, ...)` guards negative values |
| R-3 | Additive columns widen table on small screens | LOW | Fixed width 80px per column; existing horizontal scroll |

---

## Open Owner Decisions

| OD | Question | Status |
|----|----------|--------|
| OD-524-01 | Backend `created_at` field not in API — confirm backend can add it | OPEN → backend brief |
| OD-524-02 | Duration format confirmed as minutes integer | LOCKED |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-524 → status: GATE_5A_IMPLEMENTED once backend replies
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: CancellationsMockup.jsx + CR-524 + date
- [ ] Code marker: // CR-524 on new lines
- [ ] Compile: webpack 0 new warnings
```

---

## Scope Lock

**Files WILL change (FE):** `src/pages/reports-module/CancellationsMockup.jsx`
**Files WILL NOT touch:** reportService.js · reportTransform.js · all other pages
**BLOCKER: BACKEND** — `created_at` missing from `insights-cancellations` API. Gate 3 can be written now; implementation waits for backend reply.

```
Planning complete: CR-524
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (createdAt mapped but always empty; duration not computed)
Risk: LOW (FE additive only)
Files WILL change: CancellationsMockup.jsx
Files WILL NOT touch: reportService.js, reportTransform.js, all other pages
Owner decisions: LOCKED (minutes; punch = created_at)
Backend-blocked: YES — created_at missing from insights-cancellations
Docs: memory/impact/CR-524_IMPACT_ANALYSIS.md
Next: Backend brief to Gyan → Gate 3 after reply
```

---

## REVISION 2026-11-15 — Write probe + Owner Round 2

Evidence: `WRITE_PROBE_FINDINGS_2026_11_15.md` (W-5..W-8), order 1578757 (#021540).

**Probe facts**
- `created_at` still missing on our own item cancel → backend ask stands.
- Partial cancel (qty 2 → cancel 1) splits the line: new row 3969224 gets `created_at` = cancel moment; the original punch stays on row 3969222. Sending the cancelled row's own `created_at` would give duration 0.
- Timezones are mixed: `cancel_time`, `cancel_at`, `orders.created_at` = local IST; `order_details_table.created_at` = UTC ISO Z. The earlier note "assume same timezone" is withdrawn.
- Backend returns `cancel_type` 'Pre-Cooking' / stage 'Before Cooking'.

**Owner decision (round 2, locked)**
| OD | Decision |
|---|---|
| OD-524-03 | Whole-order cancels: use **each item's own add time** → one duration per item in the cancelled order |

**Impact:** order-scope rows today are aggregated per order (qty 2, one row). Per-item duration means backend must return item-level lines (or per-item punch times) for order-scope cancels. Added to the brief.

**Backend ask (updated):** per cancelled line, `punched_at` = the original line's add time (for split lines, the parent line), full datetime in the same timezone as `cancel_time` (or ISO with offset); item-level lines for order-scope cancels.
**FE rule:** duration = max(0, round((cancel_date+cancel_time − punched_at)/60000)); show "—" if `punched_at` is absent.
