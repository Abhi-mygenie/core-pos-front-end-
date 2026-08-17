# BUG-223 — Impact Analysis
**Gate:** 2
**Produced:** 2026-07-22
**Agent Role:** PLANNING

---

## Header

| Field | Value |
|---|---|
| ID | BUG-223 |
| Title | Wastage & Recipe Deduction Auto-Trigger Without Explicit Save |
| Priority | P1 |
| Code Reality | **CONFIRMED (UX)** — No API call fires on blur/scroll. Root cause is `StockAuditPanel.jsx:155-169` drift column showing red negative numbers immediately on `onChange` state update with no "preview / unsaved" label |
| Conflict Pre-Check | `StockAuditPanel.jsx` — last modified by CR-079 (2026-07-xx). No other open items touch this file. **CLEAR.** |

---

## Data Flow Trace

```
StockAuditPanel.jsx:149
  onChange={e => updateEntry(item.id, 'qty', e.target.value)}
    → setPhysicalEntries({...}) ← pure React state, NO API call

StockAuditPanel.jsx:135
  const drift = getDrift(item)  ← recomputes on every render (state change)

StockAuditPanel.jsx:162-164
  drift.diff < 0 → RED badge with TrendingDown icon + "{drift.diff} {unit}"
  ← This is what owner sees as "deduction happening"

StockAuditPanel.jsx:62
  await inventoryService.addStock(...)  ← ONLY fires from handleSaveAll()
  handleSaveAll() ← ONLY triggered by "Save Adjustments" button click (line 96)
```

**Confirmed: stock is never changed until button is clicked. Drift is preview-only.**

---

## Exact Lines to Change

### Fix A — Drift column: change colour + add "(preview)" sub-text
**File:** `components/inventory/StockAuditPanel.jsx`
**Location:** lines 162-168 (the red/green drift badges)

Change the **negative drift** badge (red) from:
```jsx
<span className="... text-red-600 bg-red-50 ...">
  <TrendingDown className="w-3 h-3" /> {drift.diff.toFixed(2)} {drift.unit}
</span>
```
To:
```jsx
<span className="... text-amber-600 bg-amber-50 ...">
  <TrendingDown className="w-3 h-3" /> {drift.diff.toFixed(2)} {drift.unit}
  <span className="block text-[9px] text-amber-400 font-normal">preview</span>
</span>
```
*(Amber = unsaved state; red = error. Green "Match" stays green. Positive drift stays green.)*

### Fix B — Sticky "unsaved changes" banner
**File:** `components/inventory/StockAuditPanel.jsx`
**Location:** After the toolbar `<div>` (around line 115), conditional on `hasEntries`

```jsx
{hasEntries && (
  <div className="mx-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
    You have unsaved adjustments — click <strong className="mx-1">Save Adjustments</strong> to apply changes to stock.
  </div>
)}
```
*(Requires `AlertCircle` import from lucide-react — already installed)*

---

## Risk Classification: **LOW**
- Blast radius: 1 file (`StockAuditPanel.jsx`)
- Lines: ~15-20 changed/added
- No API changes, no data model changes
- No regression risk on existing save flow
- Pure visual/UX change

---

## Owner Decision Queue

**No owner decisions required.** UX-only fix — amber vs red colour + "preview" label + banner. All safe defaults.

---

## Effort Estimate
- Files: 1 (`StockAuditPanel.jsx`)
- Lines: ~15-20
- Test: Enter physical qty → drift shows amber "preview" → click Save Adjustments → drift resets
- Risk: LOW
