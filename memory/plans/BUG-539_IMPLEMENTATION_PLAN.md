# BUG-539 — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** BUG-539 — Report pages layout: header wraps + table clips
**Risk:** LOW
**Sprint:** oct_cr_batch
**Gate 3 Status:** COMPLETE — awaiting Gate 4 GO

---

## Step 0 — Entry Verification (PASS)

All target lines verified at HEAD immediately before this plan was written:

| Edit | Line | Expected fragment | Match? |
|------|------|------------------|--------|
| E1 | PLReportPage.jsx L176 | `flex items-center justify-between mb-6` | ✅ PASS |
| E2 | PLReportPage.jsx L265 | `overflow-hidden shadow-sm.*pl-table` | ✅ PASS |
| E2 | PLReportPage.jsx L266 | `table.*w-full text-left` | ✅ PASS |
| E3 | ConsumptionReportPage.jsx L200 | `flex items-center justify-between mb-6` | ✅ PASS |

Closing structure confirmed: `</table>` at L311 (16-space indent), `</div>` at L312 (14-space indent, closes pl-table).

No drift. Plan is valid at HEAD.

---

## OD Locked

| OD | Decision |
|----|---------|
| OD-539-01 | **B LOCKED** — PLReportPage.jsx + ConsumptionReportPage.jsx only |

---

## Scope Lock

**Files WILL change:**
- `src/pages/reports-module/PLReportPage.jsx` — E1 + E2 (2 search_replace calls)
- `src/pages/reports-module/ConsumptionReportPage.jsx` — E3 (1 search_replace call)

**Files WILL NOT touch:**
- Any other report page
- `reportService.js` · `App.js` · any service/transform/context

---

## Exact Edits

### E1 — PLReportPage.jsx: header flex-wrap

**search_replace old_str:**
```jsx
          <div className="flex items-center justify-between mb-6">
```

**search_replace new_str:**
```jsx
          <div className="flex items-center justify-between mb-6 flex-wrap gap-y-2"> {/* BUG-539 */}
```

**Why:** `flex-wrap` lets the right-side controls block drop to a 2nd row at narrow widths. `gap-y-2` (8px) separates the two rows.

---

### E2 — PLReportPage.jsx: overflow-x-auto wrapper (2 search_replace calls)

**E2a — open wrapper** (insert `<div className="overflow-x-auto">` before `<table>`):

**search_replace old_str:**
```jsx
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" data-testid="pl-table">
                <table className="w-full text-left">
```

**search_replace new_str:**
```jsx
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" data-testid="pl-table">
                <div className="overflow-x-auto"> {/* BUG-539 */}
                <table className="w-full text-left">
```

---

**E2b — close wrapper** (insert `</div>` after `</table>`, before outer container `</div>`):

**search_replace old_str:**
```jsx
                </table>
              </div>
            </>
```

**search_replace new_str:**
```jsx
                </table>
                </div> {/* BUG-539 */}
              </div>
            </>
```

**NOTE for Implementation agent:** Before applying E2b, verify L311-L314 context:
```python
lines = open('PLReportPage.jsx').readlines()
for n in range(309, 315): print(f'L{n+1}: {lines[n].rstrip()!r}')
```
Confirm: L311=`</table>`, L312=`</div>`, L313=`</>` or nearby. If the `</>` is not on L313, adjust the search to use a different unique closing context (e.g., include the tfoot row before L311).

**Why E2 pattern works:** Outer `overflow-hidden` clips children to `rounded-xl` corners. Inner `overflow-x-auto` creates a horizontal scroll container within those bounds. This is the exact pattern already used in ConsumptionReportPage.jsx (L306/L322) and all other report pages that already handle this correctly.

---

### E3 — ConsumptionReportPage.jsx: header flex-wrap

**search_replace old_str:**
```jsx
          <div className="flex items-center justify-between mb-6">
```

**search_replace new_str:**
```jsx
          <div className="flex items-center justify-between mb-6 flex-wrap gap-y-2"> {/* BUG-539 */}
```

**NOTE for Implementation agent:** Both PLReportPage.jsx and ConsumptionReportPage.jsx have the same `flex items-center justify-between mb-6` string. Apply each edit to its respective file separately — do NOT use `replace_all` across files.

---

## Execution Sequence

1. Apply E1 to `PLReportPage.jsx`
2. Apply E2a to `PLReportPage.jsx`
3. Verify E2b context (check L311-L314) then apply E2b to `PLReportPage.jsx`
4. Apply E3 to `ConsumptionReportPage.jsx`
5. Verify compile: `yarn build` exit 0
6. Run EXIT GATE checklist

---

## Verification Matrix

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | PLReportPage header: `flex-wrap gap-y-2` added to L176 | Code grep | YES |
| V2 | PLReportPage table: `overflow-x-auto` div wraps `<table>` | Code grep | YES |
| V3 | ConsumptionReportPage header: `flex-wrap gap-y-2` added to L200 | Code grep | YES |
| V4 | BUG-539 markers present (E1+E2a+E2b+E3 = 4 hits) | `grep -n "BUG-539" PLReportPage.jsx ConsumptionReportPage.jsx` | YES |
| V5 | Dashboard and report pages load without JS error | Screenshot | NO |
| V6 | PLReportPage table scrolls horizontally at narrow width | Screenshot at ~900px | NO |
| V7 | Header wraps gracefully at 390px | Screenshot at 390px | NO |
| V8 | No regression at 1920px | Screenshot | NO |
| V9 | Compile | `yarn build` exit 0, 0 new warnings | YES |

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | E2b search not unique (other `</table>` + `</div>`) | Mitigated: PLReportPage has only one main table. Include `</>` fragment close in search context for uniqueness. |
| R2 | E1/E3 same search string hits wrong file | Mitigated: apply to respective files separately, not with replace_all |
| R3 | BUG-540 PLReportPage.jsx lines shifted | Mitigated: entry verification confirmed L176/L265/L266 at HEAD post-BUG-540 |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-539 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: BUG-539 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: PLReportPage.jsx + ConsumptionReportPage.jsx rows added — BUG-539, date
- [ ] Code markers: // BUG-539 on E1 (×1), E2a (×1), E2b (×1), E3 (×1) = 4 total
- [ ] yarn build: exit 0, 0 new warnings
```

---

## Summary

| Attribute | Value |
|-----------|-------|
| Files | `PLReportPage.jsx` (3 edits) · `ConsumptionReportPage.jsx` (1 edit) |
| Total lines changed | E1: 1 · E2: +2 · E3: 1 = 4 lines |
| R5 hotspot | NO |
| R6 financial | NO |
| Planning-skip | NOT eligible (2 files) |
| Open decisions | NONE |
| Ready for Gate 4 GO | YES |
