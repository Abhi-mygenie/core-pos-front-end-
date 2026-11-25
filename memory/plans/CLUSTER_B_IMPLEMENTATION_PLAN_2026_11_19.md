# Implementation Plan (Gate 3) — Cluster B: Cancellation Reports — 2026-11-19

**Role:** PLANNING (Gate 3) · **Sprint:** nov_cr_batch · **Assignee:** Abhishek
**Items:** BUG-714, BUG-715, BUG-716, BUG-717, BUG-718, BUG-729 · **Risk:** LOW/MEDIUM
**Depends on IA:** `impact/CLUSTER_B_IMPACT_ANALYSIS_2026_11_19.md` (Code Reality: FULL).
**Line numbers verified against working tree @ origin/main `ec798d1` (2026-11-19).** Re-verify at Implementation Step 0 before editing.

> **Execution rule (conflict):** `CancellationsMockup.jsx` is also edited by **BUG-723** (Cluster E). Edits are on disjoint lines but the file must be touched in ONE session/PR. Implement Cluster B edits below, then BUG-723, compile once.

---

## Exact edits — `CancellationsMockup.jsx`

### Edit 1 — BUG-714 (scope filter persists)
**Line 662**, scope-tab button `onClick`:
- CURRENT: `onClick={() => setActiveScope(tab.id)}`
- NEW: `onClick={() => { setActiveScope(tab.id); if (tab.id !== 'all') setScopeFilter(''); }} // BUG-714`
- Rationale: the scope `<select>` is only visible on the *All* tab; clearing `scopeFilter` on entry to any non-all tab removes the invisible stale filter. No change to `filteredTable` logic needed. Add `// BUG-714` marker.

### Edit 2 — BUG-715 (punch time TZ, report screen)
**Line 1015**, Timing & Risk punch-time render:
- CURRENT: `...new Date(r.punchTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' })...`
- NEW: add `timeZone: 'Asia/Kolkata'` to the options object → `{ hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' } // BUG-715`

### Edit 3 — BUG-729 (Daily Trend x-axis clipped)
**Line 854**, `<XAxis dataKey="date" ... tickFormatter={(v) => v.slice(0, 5)} />`:
- CURRENT: `tickFormatter={(v) => v.slice(0, 5)}`
- NEW: `tickFormatter={(v) => { const d = new Date(v + 'T12:00:00'); return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }} /* BUG-729 */`
- Result: `"2026-11-19"` → `"19 Nov"` instead of `"2026-"`.
- **NOT in this edit:** the "empty Loss chart" half of BUG-729 — gated on the `by_day` payload probe (IA owner-decision #2). Do not guess backend keys.

---

## Exact edits — `CancelDetailMockup.jsx`

### Edit 4 — BUG-715 (punch time TZ, detail screen)
**Line 169**, Timing & Risk punch-time render:
- CURRENT: `...new Date(item.punchTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' })...`
- NEW: add `timeZone: 'Asia/Kolkata'` to the options object. Marker `// BUG-715`.

### Edit 5 — BUG-716 (detail empty-state row)
**After line 171** (close of `analytics.items.slice(0,200).map(...)`, before `</tbody>`), insert:
```jsx
{analytics.items.length === 0 && (
  <tr data-testid="s28-empty-row"><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 text-sm">No cancellations match the current filter</td></tr>
)}
```
- `colSpan={7}` = the 7 `<th>` columns (`L153-159`). Mirrors report `Cancellations L1023-1025`. Marker `{/* BUG-716 */}`.

### Edit 6 — BUG-717a (stale subtitle)
**Line 122**:
- CURRENT: `Per-item cancellation breakdown · filterable by stage & reason`
- NEW: `Per-item cancellation breakdown · filterable by stage, scope, reason, staff & risk {/* BUG-717 */}`

### Edit 7 — BUG-717b (raw Order timestamp)
**Line 163**, Order cell date:
- CURRENT: `<div className="text-[11px] text-zinc-400 mt-0.5">{item.cancel_date} {item.cancel_time}</div>`
- NEW: format like the report with a NaN guard and IST:
```jsx
<div className="text-[11px] text-zinc-400 mt-0.5">{item.cancel_date ? (isNaN(new Date(`${item.cancel_date}T${item.cancel_time || '00:00'}`).getTime()) ? `${item.cancel_date} ${item.cancel_time || ''}`.trim() : new Date(`${item.cancel_date}T${item.cancel_time || '00:00'}`).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })) : '—'}{/* BUG-717 */}</div>
```
- Note: `cancel_date`/`cancel_time` are IST wall-clock strings (same as report `L985`), so NO `timeZone` param here — matches report exactly.

### Edit 8 — BUG-717c (scope option order)
**Line 144**, scope `<select>` options:
- CURRENT: `<option value="">All Scopes</option>{analytics.scopes.map(s => <option key={s} value={s}>{s === 'order' ? 'Full Order' : s === 'item' ? 'Item-Level' : s}</option>)}`
- NEW (fixed order, matches report `L956`): `<option value="">All Scopes</option><option value="order">Full Order</option><option value="item">Item-Level</option>{/* BUG-717 */}`

### Edit 9 — BUG-718 (export raw ISO punch time)
**Line 109**, `buildExportPayload` sheet `rows`:
- CURRENT: `rows: analytics.items,`
- NEW:
```jsx
rows: analytics.items.map(r => ({ ...r, punchTime: r.punchTime ? new Date(r.punchTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '' })), // BUG-718
```
- TZ kept consistent with BUG-715.

### (Optional, owner-gated) Edit 9b — BUG-718 report-export parity
Only if owner approves IA decision #3: apply the same `rows` pre-format in `CancellationsMockup.jsx buildExportPayload` (`L424 rows: cancelledItems`). Keep as a separate marked edit; otherwise skip.

---

## Verification Matrix (seeds QA)

| # | ID | File:Line | Change | How to verify | Automated? |
|---|----|-----------|--------|---------------|:---:|
| 1 | BUG-714 | Cancellations:662 | clear scopeFilter on non-all tab | On *All* set Scope=Full Order → switch to *Item-Level* → rows show (not 0); Clear not needed | NO (browser) |
| 2 | BUG-715 | Cancellations:1015 | punch time IST | In a UTC browser, Punch Time matches Order time within the duration | NO (browser, set TZ) |
| 3 | BUG-729 | Cancellations:854 | x-axis label | Daily Trend x-axis shows "19 Nov" not "2026-" | NO (browser) |
| 4 | BUG-715 | Detail:169 | punch time IST | Same as #2 on detail screen | NO (browser) |
| 5 | BUG-716 | Detail:171+ | empty-state row | Apply filters that match nothing → "No cancellations match the current filter" row shows | NO (browser) |
| 6 | BUG-717a | Detail:122 | subtitle text | Subtitle lists 5 filters | NO (visual) |
| 7 | BUG-717b | Detail:163 | formatted Order date | Order cell shows "01 Oct, 10:23 pm" not "2026-10-01 22:23" | NO (visual) |
| 8 | BUG-717c | Detail:144 | scope order | Scope dropdown = All / Full Order / Item-Level | NO (visual) |
| 9 | BUG-718 | Detail:109 | export punch time | Export Excel/PDF → Punch Time column human-readable, not ISO | NO (download) |
| 10 | — | both files | compile | `webpack compiled` 0 new warnings | YES |

No unit-test harness exists for these screens → all manual/browser. QA should set a non-IST browser TZ for #2/#4.

---

## Post-Code Registry Checklist (Implementation agent executes)
- [ ] `registry.json`: BUG-714/715/716/717/718/729 → `status: IMPLEMENTED`, `sprint_key: nov_cr_batch`
- [ ] `BUG_TRACKER.md`: rows updated to IMPLEMENTED (2026-11-19)
- [ ] `FILE_OWNERSHIP.md`: add `CancellationsMockup.jsx` (BUG-714/715/729) + `CancelDetailMockup.jsx` (BUG-715/716/717/718) with date
- [ ] Code markers: `// BUG-714` / `// BUG-715` / `// BUG-716` / `// BUG-717` / `// BUG-718` / `// BUG-729` present in every edited block (specified inline above)
- [ ] `webpack compiled` with 0 new warnings
- [ ] BUG-729 "empty Loss chart" NOT marked done unless the `by_day` probe closed it; else carry as open / BACKEND_BRIEF

## Scope lock
- **WILL change:** `CancellationsMockup.jsx` (edits 1-3), `CancelDetailMockup.jsx` (edits 4-9). Optional 9b owner-gated.
- **WILL NOT touch:** `riskTier.js`, `datePresets.js` (BUG-723's), `InsightsCacheContext.jsx`, `insightsService.js`, backend.

## Edit count
9 edits across 2 files (Cancellations ×3, Detail ×6) + 1 optional parity edit. All LOW risk, no API/state-shape/localStorage change.

**Next:** Gate 4 GO (owner) → IMPLEMENTATION. BUG-723 (Cluster E) must ride the same session on `CancellationsMockup.jsx`.
