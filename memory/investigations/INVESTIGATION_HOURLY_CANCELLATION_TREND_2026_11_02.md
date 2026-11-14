# Investigation Report — Hourly Cancellation Trend Widget Feasibility

**Role:** INVESTIGATION
**Item:** Can we add an hourly/time-wise cancellation trend to the Cancellations report?
**Steps Used:** 10/10
**Confidence:** HIGH

---

## 1. Summary

**YES — feasible, purely frontend, no backend change needed.**

Each cancellation item already carries `cancel_time` (e.g., `"21:20"`) and `cancel_at` (full ISO timestamp). We can group items by hour and render a bar chart identical to the existing Daily Cancellation Trend — just with hour on the X-axis instead of date.

**Classification:** FE_FEATURE — new widget using existing data fields.

---

## 2. Data Availability

### Fields already present per cancellation item (from backend `items[]`):

| Field | Example | Available? |
|---|---|---|
| `cancel_time` | `"21:20"` | ✅ In every item (L237) |
| `cancel_at` | `"2026-10-20T21:20:00"` | ✅ ISO timestamp |
| `cancel_date` | `"20/10/2026"` | ✅ Date string |
| `created_at` | `"2026-10-20T21:15:00"` | ✅ Order creation time |

### Backend pre-computed sections:

| Section | Available? | Used by |
|---|---|---|
| `by_day` | ✅ | Daily Cancellation Trend chart |
| `by_stage` | ✅ | Revenue Loss By Stage donut |
| `by_reason` | ✅ | Top Cancellation Reasons bar |
| `by_employee` | ✅ | By Employee table |
| **`by_hour`** | ❌ **Not provided** | — |

**Conclusion:** Backend does NOT provide a pre-computed `by_hour`. But we have `cancel_time` on every item — we can compute hourly buckets in the frontend `analytics` useMemo, same way HourlySalesMockup does.

---

## 3. Existing Pattern to Follow

**HourlySalesMockup** (`/app/frontend/src/pages/reports-module/HourlySalesMockup.jsx`) already implements an hourly chart:

```javascript
// L115-146: Build 24-hour buckets from hourly data
const hourly = Array.from({ length: 24 }, (_, i) => {
  const h = hourMap[i] || { revenue: 0, orders: 0 };
  return { hour: i, label: `${String(i).padStart(2,'0')}:00`, revenue: h.revenue, orders: h.orders };
});
const peakHour = activeHours.sort((a,b) => b.revenue - a.revenue)[0];
```

We replicate this pattern for cancellations.

---

## 4. Implementation Approach

### Data computation (in `analytics` useMemo, ~15 lines):

```javascript
// Compute hourly cancellation trend from items
const hourMap = {};
(cancelBackend.items || []).forEach(i => {
  const time = i.cancel_time || '';
  const hour = parseInt(time.split(':')[0], 10);
  if (isNaN(hour)) return;
  if (!hourMap[hour]) hourMap[hour] = { orderCancels: 0, itemCancels: 0, loss: 0 };
  const scope = i.scope || 'item';
  if (scope === 'order') hourMap[hour].orderCancels += (i.qty || 1);
  else hourMap[hour].itemCancels += (i.qty || 1);
  hourMap[hour].loss += (i.value || i.amount || 0);
});
const byHour = Array.from({ length: 24 }, (_, h) => ({
  hour: h,
  label: `${String(h).padStart(2,'0')}:00`,
  orderCancels: hourMap[h]?.orderCancels || 0,
  itemCancels: hourMap[h]?.itemCancels || 0,
  loss: hourMap[h]?.loss || 0,
}));
```

### Chart rendering (~25 lines, mirrors Daily Trend chart exactly):

Place it in a new row after the Daily Trend + By Reason row. Same `grid-cols-2` layout — hourly trend on the left, by-employee on the right (or rearrange as needed).

```jsx
<div className="bg-white border border-zinc-200 rounded-xl p-6">
  <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
    Hourly Cancellation Trend
  </h2>
  <ResponsiveContainer width="100%" height={240}>
    <BarChart data={analytics.byHour.filter(h => h.orderCancels + h.itemCancels > 0)}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
      <YAxis tick={{ fontSize: 10 }} />
      <Bar dataKey="orderCancels" stackId="c" fill="#EF4444" />
      <Bar dataKey="itemCancels" stackId="c" fill="#FB923C" radius={[4,4,0,0]} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

---

## 5. Scope & Risk

| Aspect | Detail |
|---|---|
| **Files** | 1 file: `CancellationsMockup.jsx` |
| **Lines** | ~40 lines (15 data + 25 chart) |
| **Backend** | NO change needed |
| **API** | NO new endpoint — uses existing `items[]` data |
| **Risk** | LOW — additive widget, no existing logic modified |
| **Fast Lane eligible** | NO (>10 lines, new feature widget) |

---

## 6. Recommendations

Register as **CR** (feature request, not a bug). Suggested ID: next available CR number.

**Optional enhancements** (can be deferred):
- Peak cancellation hour KPI card (similar to HourlySalesMockup)
- Service period breakdown (Breakfast 6-10, Lunch 11-15, Dinner 18-23)
- Loss amount on hover tooltip per hour bar

---

## 7. Retroactive Candidates
NONE.
