# Gate 2 — Impact Analysis: CR-374
## BulkEditor Filter Panel (Status / Type / Category)

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 2, Impact Analysis only)
**Protocol:** AGENT_PROMPT_ALPHA v0.7 — `/app/memory/control/AGENT_PROMPT_ALPHA.md`
**Stage:** Gate 2 — Impact Analysis ONLY. Do NOT implement.
**Source:** Intake doc `change_requests/CR-374_BULKEDITOR_FILTER_PANEL_STATUS_TYPE_CATEGORY_INTAKE.md`

---

## Code Reality: NONE ✅

```bash
grep -n "filterStatus\|filterType\|filterCategoryId" BulkEditor.jsx
# → 0 results — confirmed NONE
```

`groupedRows` useMemo (lines 425–471): search filter only. No status, type, or category filter passes exist. Clean slate — full implementation needed.

---

## Step 1 — Conflict Pre-Check

### FILE_OWNERSHIP — BulkEditor.jsx last modifiers
| Date | Modifier | What |
|---|---|---|
| 2026-09-01 | BUG-371 | `handleVariationPriceChange` + `isDirty.variations` + `buildPayload` variations |
| 2026-09-01 | BUG-359 | Removed taxCalc column definition (line 54) + cell renderer block |

**Last modifier: BUG-371 (2026-09-01)** — variation price edits. No overlap with filter panel area.

### Active registry items touching BulkEditor.jsx

| ID | Gate | Status | Conflict with CR-374? |
|---|---|---|---|
| BUG-392 | 2 | Impact Analysis complete (Batch A) | **PARALLEL-SAFE** — touches line 1318 (renderCell number input). CR-374 touches lines 242–244 (state), 425–471 (groupedRows), toolbar JSX ~958. Zero line overlap. Execute BUG-392 → CR-374 in that order within Batch A. |
| BUG-391 | 1 | INTAKE, all ODs locked, ready Gate 2 | **EXECUTION ORDER: CR-374 FIRST** — BUG-391 (Aggregator GST enforcement) also modifies BulkEditor. It is Batch B. Must wait until Batch A (including CR-374) clears QA. |
| CR-375 | 1 | INTAKE — BACKEND-BLOCKED | **NO CONFLICT** — backend-blocked, no FE code changes imminent. |
| BUG-135, BUG-147 | 5b | QA PASS, awaiting owner smoke | **NO CONFLICT** — already implemented. |
| Others (BUG-301, BUG-359, etc.) | 5 | Implemented | **NO CONFLICT** — done. |

### Open Gap Note
**OG-AUDIT-003 (P3):** `BulkEditor.jsx:682` has incorrect `// BUG-147` marker (BUG-147 is AddCustomItemModal, not BulkEditor). Breaks 3 tests. This is a pre-release audit concern, NOT a blocker for CR-374. Implementing agent: do not disturb line 682.

---

## Step 2 — Data Availability (all confirmed present)

| Required | Source in code | Confirmed? |
|---|---|---|
| `row.status` | `buildRow(f)`: `status: f.isActive ? 1 : 0` (~line 105). Active = 1, Inactive = 0 | ✅ |
| `row.itemType` | `buildRow(f)`: `itemType: f.itemType ?? 0` (~line 109). 0=Non-Veg, 1=Veg, 2=Egg, 3=Jain | ✅ |
| `row.categoryId` | `buildRow(f)`: `categoryId: f.categoryId` (~line 105) | ✅ |
| `categories` prop | Component signature: `BulkEditor = ({ ..., categories = [], ... })` (line ~214) | ✅ |
| `row._isNew` | Set in `handleAddRow` — new rows must always show regardless of any filter | ✅ |

**No new props needed. All filter data already in component.**

---

## Step 3 — Exact Edit Map (Gate 2 — what will change, not how)

### Edit E1 — 3 new state fields
**File:** `BulkEditor.jsx`
**After:** line 244 (`const [sortDir, setSortDir] = useState("asc");`)
**Size:** +4 lines

```js
// CR-374: filter panel state (3 new)
const [filterStatus,     setFilterStatus]     = useState('all');
const [filterType,       setFilterType]       = useState('all');
const [filterCategoryId, setFilterCategoryId] = useState(null);
```

### Edit E2 — groupedRows filter passes
**File:** `BulkEditor.jsx`
**Location:** Lines 425–427 (top of groupedRows useMemo, before `if (search)` block)
**Size:** +12 lines

Three new filter passes added before the existing search filter:
- Status: `filterStatus !== 'all'` → `row.status === 1` (active) or `=== 0` (inactive)
- Type: `filterType !== 'all'` → `row.itemType === typeMap[filterType]` where typeMap = `{veg:1, nonveg:0, egg:2, jain:3}`
- Category: `filterCategoryId !== null` → `row.categoryId === filterCategoryId`
- All passes: `r._isNew` rows always pass (new rows always visible)
- `useMemo` deps extended: add `filterStatus, filterType, filterCategoryId`

### Edit E3 — Always-visible filter strip JSX
**File:** `BulkEditor.jsx`
**Location:** After toolbar `</div>` (~line 958), BEFORE column chips `<div>` (line 959)
**Size:** +45 lines

Layout (per design spec OD-374-01 locked):
```
[Toolbar row — unchanged]
[NEW always-visible filter strip]
  Status: [All●] [Active] [Inactive]
  Type: [All●] [Veg] [Non-Veg] [Egg] [Jain]
  Category: [All Categories ▼] (searchable <select>)
  [Clear Filters] (only when any filter ≠ default)
[Column chips bar — unchanged]
[Grid — unchanged]
```

Visual: strip background = `COLORS.sectionBg`. Active pill = orange fill + white text (matches column chip active state). Category = `<select>` dropdown populated from `categories` prop.

### Edit E4 — menuType reset useEffect
**File:** `BulkEditor.jsx`
**Location:** Near other useEffects (~line 270 area)
**Size:** +5 lines

```js
// CR-374: OD-374-03 — reset filters on menu type switch
useEffect(() => {
  setFilterStatus('all');
  setFilterType('all');
  setFilterCategoryId(null);
}, [menuType]);
```

---

## Step 4 — Full Edit Summary

| Edit | File | Location | Lines | Risk |
|---|---|---|---|---|
| E1 — 3 state fields | `BulkEditor.jsx` | After line 244 | +4 | NONE |
| E2 — groupedRows passes | `BulkEditor.jsx` | Lines 425–427 | +12 | LOW |
| E3 — Filter strip JSX | `BulkEditor.jsx` | After ~line 958 | +45 | LOW-MEDIUM |
| E4 — menuType reset | `BulkEditor.jsx` | ~Line 270 area | +5 | NONE |
| **Total** | **1 file only** | — | **~66 lines** | **MEDIUM** |

---

## Step 5 — Risk Classification

| | |
|---|---|
| **Risk** | **MEDIUM** |
| **Trigger** | BulkEditor is complex (1,438 lines) and frequently modified (5 CRs layered since June). Adding new state + computed logic + JSX strip. |
| **Financial / billing / GST** | NO |
| **API / service / transform** | NO |
| **Hotspot file** | NO (BulkEditor is complex but not in the hotspot list) |
| **Downstream consumers** | `MenuManagementPanel.jsx` (renders BulkEditor) — NO changes needed. `profileTransform.js` gstStatus — NOT affected. |
| **Fast Lane** | NOT eligible (>10 lines, new state, complex component) |

---

## Step 6 — Downstream Consumer Verification

| Consumer | Affected? | Action needed |
|---|---|---|
| `MenuManagementPanel.jsx` | NO — passes `categories` prop already. Filter state is internal. | None |
| `profileTransform.js` (gstStatus) | NO — consumed for tax validation, unrelated to filter. | None |
| `CR-036 test file` | NO — tests search behavior. Filter is additive, search unchanged. | None |
| `BulkEditor.cr027p3.test.jsx` (OG-AUDIT-003) | Pre-existing marker bug at line 682 — pre-release concern only. | Do NOT touch line 682. |

---

## Step 7 — Owner Decisions (ALL LOCKED — no blockers)

| OD | Decision |
|---|---|
| OD-374-01 | Always-visible strip ✅ locked |
| OD-374-02 | Searchable `<select>` dropdown for category ✅ locked |
| OD-374-03 | Reset filters on menuType switch ✅ locked (agent default, owner may override) |

**Zero open decisions. Gate 3 can proceed immediately after owner gives Gate 4 GO.**

---

## Step 8 — Verification Matrix (seeds QA handover)

| # | Test | Steps | Automated? |
|---|---|---|---|
| V1 | Active filter shows only active items | Open BulkEditor → click Active | Manual |
| V2 | Inactive filter shows only inactive items | Open BulkEditor → click Inactive | Manual |
| V3 | Veg / Non-Veg / Egg / Jain type filters | Click each type pill, verify itemType column | Manual |
| V4 | Category dropdown filters to selected category | Select "Starters", verify rows | Manual |
| V5 | Filters combine (Active + Veg) | Set Active + Veg — only active Veg shown | Manual |
| V6 | Select All only selects VISIBLE rows | Filter to Inactive → Select All → count | Manual |
| V7 | New rows (_isNew) always visible | Add row → set any filter → new row still visible | Manual |
| V8 | Clear Filters resets all 3 | Set 3 filters → click Clear → all rows visible | Manual |
| V9 | Filter + Search combined | Set Active filter + type search term — combined | Manual |
| V10 | menuType switch resets filters | Switch Normal → Aggregator → filters reset | Manual |
| V11 | Save / Delete operations unaffected | Save changes, bulk delete — existing ops work | Manual |
| V12 | Webpack compiles with 0 new warnings | `yarn start` | Automated |

---

## Step 9 — Post-Code Registry Checklist (for implementing agent)

```
□ registry.json: CR-374 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
□ CR_REGISTRY.md: row updated to IMPLEMENTED
□ FILE_OWNERSHIP.md: BulkEditor.jsx row → add CR-374 (date + what changed)
□ Code markers: // CR-374 comment in every modified section (E1, E2, E3, E4)
□ Compile check: webpack 0 new warnings after implementation
□ Do NOT modify BulkEditor.jsx line 682 (OG-AUDIT-003 pre-release concern)
```

---

*Gate 2 Impact Analysis complete. Code reality NONE. All ODs locked. Zero blockers.*
*Conflict: BUG-392 parallel-safe (different section). BUG-391 must wait for Batch A QA to clear.*
*Next: Gate 3 Implementation Plan — awaiting owner Gate 4 GO.*
