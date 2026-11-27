# CR-480 — Impact Analysis + Implementation Plan

**Gate:** 2 (Impact Analysis) + 3 (Implementation Plan)
**Item:** CR-480 (P2, Hourly Cancellation Trend Widget)
**Code Reality:** NONE
**Conflict Pre-Check:** BUG-555 touched CancellationsMockup (tablet responsive wrapper) — parallel-safe, different section.
**HTML Mockup:** `/app/frontend/public/cr480-hourly-cancellation-mockup.html`

---

## IMPACT ANALYSIS (Gate 2)

### Data Flow Trace
```
Backend API: POST /insights-cancellations
  → Response: { items: [...], summary: {...}, by_day: [...], by_stage: [...], by_reason: [...], by_employee: [...] }
  → Each item has: cancel_time ("21:20"), cancel_at (ISO), cancel_date, scope ("order"|"item"), value, qty
  
Current analytics useMemo (L263-310):
  → Computes: stageData, byReason, byEmployee, daily
  → MISSING: byHour ❌

NEW byHour computation:
  → Parse hour from items[].cancel_time → bucket into 24 hourly slots
  → Count orderCancels + itemCancels + loss per hour
  → Find peakHour
  → Render stacked BarChart (same pattern as daily chart L702-719)
```

### Risk Assessment
- **Risk:** LOW — additive widget, no existing logic modified
- **Financial logic:** NONE — display only
- **Downstream:** No other component consumes this data

### ODs (LOCKED per recommended)
| OD | Decision |
|---|---|
| OD-480-01 | **(a) New full-width row** below Daily+Reason, above Employee |
| OD-480-02 | **YES** — peak hour badge in header |

---

## IMPLEMENTATION PLAN (Gate 3)

### Edit Summary
| # | File | Line | Edit | Lines Added |
|---|------|------|------|-------------|
| E1 | `CancellationsMockup.jsx` | ~L100 | Add `HourlyTooltip` component (after BarTooltip) | ~14 |
| E2 | `CancellationsMockup.jsx` | ~L305 | Add `byHour` + `peakHour` computation in analytics useMemo | ~18 |
| E3 | `CancellationsMockup.jsx` | ~L737 | Add Hourly Cancellation Trend chart widget (after Daily+Reason grid, before Employee) | ~35 |

**Files WILL change:** `CancellationsMockup.jsx`
**Files will NOT touch:** Any other file

---

### E1 — HourlyTooltip component (~L117, after BarTooltip)

```jsx
// CR-480: Hourly cancellation trend tooltip
const HourlyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[180px]">
      <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{d.label} – {String(d.hour + 1).padStart(2, '0')}:00</div>
      <div className="flex justify-between py-0.5"><span className="text-red-400">Order Cancels</span><span>{d.orderCancels}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-orange-400">Item Cancels</span><span>{d.itemCancels}</span></div>
      <div className="border-t border-zinc-700 mt-1 pt-1 flex justify-between">
        <span className="text-zinc-400">Revenue Loss</span><span>{fmtINR(d.loss)}</span>
      </div>
    </div>
  );
};
```

---

### E2 — byHour + peakHour in analytics useMemo (~L305, before `return`)

Insert after `const daily = ...` block (L288-294), before the `return {` block (L308):

```jsx
    // CR-480: Hourly cancellation trend — compute from items
    const hourMap = {};
    (cancelBackend.items || []).forEach(i => {
      const time = i.cancel_time || '';
      const h = parseInt(time.split(':')[0], 10);
      if (isNaN(h) || h < 0 || h > 23) return;
      if (!hourMap[h]) hourMap[h] = { orderCancels: 0, itemCancels: 0, loss: 0 };
      const scope = (i.scope || '').toLowerCase();
      if (scope === 'order') hourMap[h].orderCancels += (i.qty || 1);
      else hourMap[h].itemCancels += (i.qty || 1);
      hourMap[h].loss += (i.value || i.amount || 0);
    });
    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      orderCancels: hourMap[h]?.orderCancels || 0,
      itemCancels: hourMap[h]?.itemCancels || 0,
      loss: hourMap[h]?.loss || 0,
      total: (hourMap[h]?.orderCancels || 0) + (hourMap[h]?.itemCancels || 0),
    }));
    const activeHours = byHour.filter(h => h.total > 0);
    const peakHour = activeHours.length > 0 ? activeHours.sort((a, b) => b.total - a.total)[0] : null;
```

Add to the `return` object:
```jsx
    return {
      ...existing fields...,
      byHour: activeHours, peakHour,  // CR-480
    };
```

---

### E3 — Hourly Cancellation Trend chart widget (~L737, after Daily+Reason grid closing `</div>`)

Insert between the closing `</div>` of the Daily+Reason grid and the `{/* ── By Employee ── */}` comment:

```jsx
                  {/* ── CR-480: Hourly Cancellation Trend ── */}
                  {analytics.byHour.length > 0 && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="cancellations-hourly-chart">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Hourly Cancellation Trend</h2>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Cancellations by hour of day</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {analytics.peakHour && (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <Clock className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-semibold text-red-700">Peak: {analytics.peakHour.label}</span>
                            <span className="text-[10px] text-red-500">{analytics.peakHour.total} cancellations</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />Orders</span>
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400" />Items</span>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={analytics.byHour} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                        <ReTooltip content={<HourlyTooltip />} cursor={{ fill: 'rgba(239,68,68,0.04)', radius: 4 }} />
                        <Bar dataKey="orderCancels" stackId="cancels" fill="#EF4444" radius={0} animationDuration={800} />
                        <Bar dataKey="itemCancels" stackId="cancels" fill="#FB923C" radius={[4, 4, 0, 0]} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  )}
```

**Note:** `Clock` icon import — check if already imported. If not, add to lucide-react import at top.

---

## Verification Matrix

| # | File | Change | How to Verify | Auto? |
|---|------|--------|--------------|:---:|
| V1 | CancellationsMockup | HourlyTooltip renders | Browser: hover over hourly bar → tooltip shows hour range, counts, loss | NO |
| V2 | CancellationsMockup | byHour computed | Browser: page loads with hourly chart visible (Oct 1-31 Palm House data) | NO |
| V3 | CancellationsMockup | Peak hour badge | Browser: header shows "Peak: HH:00 — N cancellations" | NO |
| V4 | CancellationsMockup | Empty state | Browser: date range with 0 cancellations → hourly chart hidden | NO |
| V5 | CancellationsMockup | Daily chart unchanged | Browser: daily chart still renders correctly | NO |
| V6 | CancellationsMockup | By Reason unchanged | Browser: reason chart still renders correctly | NO |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-480 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: CancellationsMockup.jsx
- [ ] Code markers: // CR-480 in every modified section
- [ ] Compile: webpack 0 new warnings
```

## Scope Lock
- **Files WILL change:** CancellationsMockup.jsx
- **Files will NOT touch:** insightsService.js, any API service, any other report page
