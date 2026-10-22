# BUG-539 — Implementation Plan: ml-64/ml-16 Double-Offset Fix (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** BUG-539 — P&L and Consumption Report pages: 256px gap between sidebar and content
**Risk:** LOW-MEDIUM
**Sprint:** oct_cr_batch
**Gate 2 IA:** `/app/memory/impact/BUG-539_IMPACT_ANALYSIS_ML64.md`

---

## Entry Verification (MANDATORY — agent must run before writing any code)

Before any edit, verify these exact strings still match at HEAD:

### Anchor A — PLReportPage.jsx L172
```
Plan says L172 reads:
  <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>

Verify: sed -n '172p' /app/frontend/src/pages/reports-module/PLReportPage.jsx
Expected: exactly the string above (backtick template literal with ml-64/ml-16)
If differs → STOP. Return to Planning agent.
```

### Anchor B — ConsumptionReportPage.jsx L196
```
Plan says L196 reads:
  <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>

Verify: sed -n '196p' /app/frontend/src/pages/reports-module/ConsumptionReportPage.jsx
Expected: exactly the string above
If differs → STOP. Return to Planning agent.
```

**Anchor verification confirmed at plan-write time (2026-10-12 same session):** ✅ PASS

---

## Scope Lock

**Files WILL change:**
- `src/pages/reports-module/PLReportPage.jsx` — L172 only
- `src/pages/reports-module/ConsumptionReportPage.jsx` — L196 only

**Files WILL NOT touch:**
- `DashboardPage.jsx` (R5 hotspot — explicitly forbidden by handover §6)
- `Sidebar.jsx`
- Any service / transform / context
- `App.js`
- Any other file

**If scope expands beyond 2 files or 2 lines → STOP. Re-declare. Get owner confirmation.**

---

## Edits

### E4 — PLReportPage.jsx L172

| Field | Value |
|-------|-------|
| File | `src/pages/reports-module/PLReportPage.jsx` |
| Line | **172** |
| Operation | Replace entire className expression |
| Lines changed | 1 |

**Before (current at HEAD):**
```jsx
      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>
```

**After:**
```jsx
      <div className="flex-1 flex flex-col overflow-hidden"> {/* BUG-539 */}
```

**Rationale:**
- `flex-1` — keep: fills remaining width after in-flow sidebar
- `flex flex-col overflow-hidden` — add: matches `OrderReportBetaPage` pattern; ensures vertical column flow and inner overflow containers work correctly
- `transition-all duration-300` — remove: Sidebar handles its own animation; `transition: all` is a performance anti-pattern
- `${isSidebarExpanded ? 'ml-64' : 'ml-16'}` — remove: this is the double-offset. `flex-1` already starts content after the in-flow sidebar; no manual margin needed
- `{/* BUG-539 */}` — required code marker (Rule R18)

**Tool call:**
```
search_replace on /app/frontend/src/pages/reports-module/PLReportPage.jsx
old_str: "      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>"
new_str: "      <div className=\"flex-1 flex flex-col overflow-hidden\"> {/* BUG-539 */}"
```

---

### E5 — ConsumptionReportPage.jsx L196

| Field | Value |
|-------|-------|
| File | `src/pages/reports-module/ConsumptionReportPage.jsx` |
| Line | **196** |
| Operation | Replace entire className expression |
| Lines changed | 1 |

**Before (current at HEAD):**
```jsx
      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>
```

**After:**
```jsx
      <div className="flex-1 flex flex-col overflow-hidden"> {/* BUG-539 */}
```

Identical rationale to E4.

**Tool call:**
```
search_replace on /app/frontend/src/pages/reports-module/ConsumptionReportPage.jsx
old_str: "      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>"
new_str: "      <div className=\"flex-1 flex flex-col overflow-hidden\"> {/* BUG-539 */}"
```

---

## Execution Sequence

```
1. Run Entry Verification (Anchors A + B) — abort if mismatch
2. Apply E4 (PLReportPage.jsx L172) via search_replace
3. Apply E5 (ConsumptionReportPage.jsx L196) via search_replace
4. Verify webpack compiles: yarn build (or check /var/log/supervisor/frontend.out.log for "Compiled successfully")
5. Run Self-Verification (Verification Matrix below)
6. Run EXIT GATE (5 checkboxes)
7. Write QA Handover
8. Write Session Handover
```

Edits E4 and E5 are **independent** — either can be applied first. Recommended order: E4 then E5 (P&L is the primary reported symptom).

---

## Verification Matrix (Step 4 — seeds QA handover)

| # | Edit | What to verify | Method | Automated? |
|---|------|---------------|--------|:---:|
| V1 | E4 | PLReportPage — no 256px gap at 1366px sidebar expanded | Screenshot at 1366px wide | NO |
| V2 | E4 | PLReportPage — no gap at 1920px sidebar expanded | Screenshot at 1920px wide | NO |
| V3 | E4 | PLReportPage — no gap at 1366px sidebar collapsed | Screenshot, sidebar collapsed | NO |
| V4 | E5 | ConsumptionReportPage — no gap at 1366px sidebar expanded | Screenshot at 1366px wide | NO |
| V5 | E4+E5 | BUG-539 E1 regression: P&L header still flex-wraps at narrow width | Screenshot at 900px | NO |
| V6 | E4+E5 | BUG-539 E2 regression: P&L table still horizontally scrollable | Verify `overflow-x-auto` div still in place at L266 | NO |
| V7 | E4+E5 | BUG-539 E3 regression: Consumption header still flex-wraps | Verify `flex-wrap gap-y-2` at L200 still present | NO |
| V8 | E4+E5 | Sidebar smooth width animation still works | Toggle sidebar — CSS `transition` on Sidebar `<aside>` unaffected | NO |
| V9 | E4+E5 | webpack: 0 new warnings | `yarn build` exit 0 | YES |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `isSidebarExpanded` state becomes unused after removing `ml-64/ml-16` | LOW | State is still passed as prop to `<Sidebar isExpanded={isSidebarExpanded} ...>`. Not unused. No lint warning expected. |
| Inner content loses vertical layout without `flex-1` | NONE | `flex flex-col` on outer div + `flex-1` inner div (the `px-6 py-6` container) flows correctly. Verified by matching pages. |
| Sidebar animation breaks | NONE | Animation lives on `<aside>` in Sidebar.jsx — unchanged. Content div has nothing to animate. |
| BUG-539 E1/E2/E3 fixes regress | NONE | Those edits are at L176, L266, L313 (PL) and L200 (Consumption) — different lines. Search_replace is string-targeted, zero overlap. |
| Wrong line targeted | LOW | Entry verification (Anchor A + B) catches stale plans before any edit. |

---

## Post-Code Registry Checklist (Step 5 — EXIT GATE prerequisite)

```
□ 1. REGISTRY SYNC
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         data = json.load(f)
     items = {i['id']: i for i in data['items']}
     assert 'BUG-539' in items, 'BUG-539 MISSING from registry'
     print('BUG-539 status:', items['BUG-539'].get('status',''))
     print('BUG-539 sprint:', items['BUG-539'].get('sprint_key',''))
     print('Registry sync check DONE')
     "
     → status should reflect ml-64 fix shipped (GATE_5A_IMPLEMENTED or updated note)
     If missing → update registry.json NOW before handover.

□ 2. BUG_TRACKER.md
     BUG-539 row updated to note ml-64/ml-16 fix shipped.

□ 3. FILE_OWNERSHIP.md
     Add rows for:
       - PLReportPage.jsx — E4 L172 — BUG-539 IMPL (ml-64) — date
       - ConsumptionReportPage.jsx — E5 L196 — BUG-539 IMPL (ml-64) — date

□ 4. CODE MARKERS
     Both changed lines carry {/* BUG-539 */} comment.
     Verify: grep -n "BUG-539" src/pages/reports-module/PLReportPage.jsx
             grep -n "BUG-539" src/pages/reports-module/ConsumptionReportPage.jsx
     → L172 and L196 must appear.

□ 5. COMPILE CHECK
     yarn build exits 0 with ZERO new warnings beyond the pre-existing
     SettlementReportMockup exhaustive-deps warning.
```

**Do NOT write SESSION_HANDOVER or QA handover until all 5 checkboxes pass.**

---

## QA Handover Template (pre-filled for QA agent)

```markdown
## QA Handover — BUG-539 ml-64/ml-16 fix

### 1. Inherited Verification Matrix
| Edit | File | Change | Self-Test |
|------|------|--------|-----------|
| E4 | PLReportPage.jsx L172 | Removed ml-64/ml-16 | [ ] V1 V2 V3 |
| E5 | ConsumptionReportPage.jsx L196 | Removed ml-64/ml-16 | [ ] V4 |

### 2. Regression test cases
| # | Test | Steps | Expected |
|---|------|-------|---------|
| R1 | BUG-539 E1 header wrap still works | Narrow browser to 900px on P&L | Header row wraps to 2 lines gracefully |
| R2 | BUG-539 E2 table scroll still works | P&L page narrow viewport | P&L table scrolls horizontally, no clip |
| R3 | BUG-539 E3 Consumption header | Narrow browser on Consumption | Header wraps gracefully |
| R4 | BUG-539-W max-w removal still in place | Verify L173/L197 comments present in files | px-6 py-6 inner div, no max-w-7xl |

### 3. Credentials
- Owner: owner@thegoankitchen.com / Qplazm@10 (RID 69)
- Preview URL: https://genie-core-pos.preview.emergentagent.com

### 4. Registry Sync Confirmation
Registry synced: [ ] YES
EXIT GATE: [ ] 5/5 PASS
```

---

## Summary

| Field | Value |
|-------|-------|
| Edits | 2 (E4 + E5) |
| Files | 2 (PLReportPage.jsx L172 · ConsumptionReportPage.jsx L196) |
| Lines changed | 2 |
| Risk | LOW-MEDIUM |
| Owner decisions | NONE |
| Planning-skip | NOT eligible (2 files) |
| Awaiting | Gate 4 GO |
