# Impact Analysis — Batch 2: Printer Agent (BUG-315 + BUG-316 + BUG-317 + BUG-318 + BUG-319)

**Gate:** 2 — Impact Analysis  
**Date:** 2026-08-13  
**Role:** PLANNING  
**Sprint:** pos_5_1  
**Status:** GATE 2 COMPLETE

---

## Header

| Field | Value |
|---|---|
| Code Reality | CONFIRMED for all 5 items — bugs exist exactly as described |
| Conflict Pre-Check | **ONE CONFLICT** — BUG-315 and BUG-317 both touch `PrintStyleTab.jsx`. Execution order required: BUG-315 first. |
| Items | BUG-315, BUG-316, BUG-317, BUG-318, BUG-319 |
| Risk (highest) | MEDIUM (BUG-318) |

---

## §1 — BUG-315: Numeric Inputs Cannot Be Cleared (Controlled Input Snap-Back)

### Data Flow Trace

```
StyleInput (PrintStyleTab.jsx:10-32) — controlled input:
  value={value ?? ""}            ← driven by parent state
  onChange={(e) => {
    const v = e.target.value;
    if (v === '') return;        ← no setState called
    const n = parseFloat(v);
    if (Number.isFinite(n)) onChange(n);
  }}

User presses Delete on "1":
  onChange fires → v = '' → return (no state update)
  → parent state still = 1
  → React re-renders → input.value reset to "1"
  → User cannot clear field to type "12" or "0.5"

Same pattern in NumberInput (shared.jsx:34-38):
  if (raw === '') return;
  → Same snap-back behaviour on Bill Copies + KOT Copies fields
```

### Root Cause Detail

The `if (v === '') return` pattern was the CR-133 Gap G4 attempt — it intended to let the input show empty while the user retyped. But because both `StyleInput` and `NumberInput` are **controlled inputs** (`value={value ?? ""}` driven by prop/state), React will force-reset the DOM on the next render. Since no state update is triggered, the next render restores the old value, making the clear invisible.

**Fix pattern:** Local `localVal` state decoupled from the prop value:
- Tracks the raw display string independently
- Propagates to parent only on valid numbers
- `useEffect` syncs back when parent changes the prop externally

### Affected Files

| File | Component | Lines | Change |
|---|---|---|---|
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | `StyleInput` (local) | 10–32 | Convert from stateless function to stateful, add local display state |
| `components/panels/settings/shared.jsx` | `NumberInput` (exported) | 25–55 | Convert from stateless function to stateful, add local display state |

### Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot file (R5) | NO |
| API impact | NONE — only UI display, saved values unchanged |
| `NumberInput` downstream consumers | `AutoPrintTab.jsx` (Bill Copies, KOT Copies). Fix keeps same onBlur clamping — values sent to API unchanged |
| `StyleInput` downstream consumers | Used only within `PrintStyleTab.jsx` |

**Risk: LOW**

### Edit Specification — StyleInput (PrintStyleTab.jsx)

**Current (stateless arrow function):**
```js
const StyleInput = ({ value, onChange, min, max, step, testId }) => (
  <input
    type="number"
    step={step ?? 0.5}
    value={value ?? ""}
    onChange={(e) => {
      const v = e.target.value;
      if (v === '') return;
      const n = parseFloat(v);
      if (Number.isFinite(n)) onChange(n);
    }}
    onBlur={(e) => {
      const n = parseFloat(e.target.value);
      const minV = min ?? 0;
      if (!Number.isFinite(n) || n < minV) { onChange(minV); return; }
      if (max != null && n > max) onChange(max);
    }}
    ...
  />
);
```

**Proposed (stateful):**
```js
// BUG-315: local display state — allows clearing to retype without snap-back
const StyleInput = ({ value, onChange, min, max, step, testId }) => {
  const [localVal, setLocalVal] = useState(value != null ? String(value) : '');
  useEffect(() => { setLocalVal(value != null ? String(value) : ''); }, [value]);
  return (
    <input
      type="number"
      step={step ?? 0.5}
      value={localVal}
      onChange={(e) => {
        setLocalVal(e.target.value);
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const n = parseFloat(localVal);
        const minV = min ?? 0;
        const clamped = Number.isFinite(n) ? Math.max(minV, max != null ? Math.min(max, n) : n) : minV;
        onChange(clamped);
        setLocalVal(String(clamped));
      }}
      min={min}
      max={max}
      className="w-16 px-2 py-1 text-xs rounded border outline-none text-center"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      data-testid={testId}
    />
  );
};
```

**Required import addition:** `import { useState, useEffect } from "react";` (currently only `useState` imported in PrintStyleTab).

**Edit Specification — NumberInput (shared.jsx):**
Same pattern — add `localVal` state, sync with `useEffect`, use `localVal` as input value.

**Lines changed:** ~20 lines in PrintStyleTab, ~20 lines in shared.jsx

### Verification Steps

| # | Step | Method |
|---|---|---|
| V1 | Bill Copies field: click, select "1", press Delete → input shows empty → can type "3" | Browser |
| V2 | KOT Copies: same as V1 | Browser |
| V3 | Style size field (e.g., 58mm value): select value, delete, type new value → saves correctly | Browser |
| V4 | onBlur clamp: clear field, blur → clamps to min value | Browser |
| V5 | External prop change (parent update): value resets correctly in input | Browser |

---

## §2 — BUG-316: Font Family Dropdown Empty

### Data Flow Trace

```
API GET /printer-agent-config → global_settings.available_fonts = null

printerAgentConfigTransform.js:253:
  fonts: [...(gs.available_fonts || [])]
        → null || [] = []
        → options.fonts = []

PrintStyleTab.jsx:122:
  <SelectInput
    options={options.fonts.map((f) => ({ value: f, label: f }))}
  />
  → options = [] → empty <select> → no font can be selected
```

### Affected Files

| File | Lines | Change |
|---|---|---|
| `api/transforms/printerAgentConfigTransform.js` | 253 | Add `FALLBACK_FONTS` constant + conditional |

**Files NOT touched:** PrintStyleTab.jsx, SelectInput, any API endpoint.

### Owner-Specified Font List

```js
const FALLBACK_FONTS = [
  'Montserrat', 'Roboto', 'Poppins', 'Ubuntu', 'Open Sans', 'Lato', 'Oswald',
  'Helvetica (Sans Serif)', 'Times New Roman', 'Courier', 'Gujarati'
];
```

### Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot file | NO |
| API impact | NONE — fonts are display-only UI options |
| Downstream | Only `PrintStyleTab.jsx:122` uses `options.fonts` — unchanged |

**Risk: LOW**

### Edit Specification

**File:** `api/transforms/printerAgentConfigTransform.js`

**Add near top of file (after imports):**
```js
// BUG-316: fallback when API does not return available_fonts
const FALLBACK_FONTS = [
  'Montserrat', 'Roboto', 'Poppins', 'Ubuntu', 'Open Sans', 'Lato', 'Oswald',
  'Helvetica (Sans Serif)', 'Times New Roman', 'Courier', 'Gujarati',
];
```

**Change line 253:**
```js
// Before:
fonts: [...(gs.available_fonts || [])],
// After (BUG-316):
fonts: gs.available_fonts?.length ? [...gs.available_fonts] : [...FALLBACK_FONTS],
```

**Lines changed:** +5 lines (constant) + 1 line change = 6 lines total

### Verification Steps

| # | Step | Method |
|---|---|---|
| V1 | Open Print Style tab → Font Family dropdown shows 11 options | Browser |
| V2 | Select "Poppins" → saves → reloads → Poppins pre-selected | Browser |
| V3 | If API starts returning available_fonts → those are used instead of fallback | N/A until backend ships |

---

## §3 — BUG-317: Android Size Fields Reject Values > 8

### Data Flow Trace

```
API GET /printer-agent-config → global_settings.android = {} (empty)

printerAgentConfigTransform.js:237:
  androidScaleRange: gs.android?.size_scale_range ?? [1, 8]
  → defaults to [1, 8]

PrintStyleTab.jsx:116:
  const maxScale = (config.androidScaleRange ?? [1, 8])[1];  → 8

PrintStyleTab.jsx:154-163 (Android card):
  [Logo, UPI QR, Fdbk QR].map(({ stateKey }) => (
    <StyleInput value={config[stateKey]} onChange={...}
      min={1} max={maxScale} step={1} ... />   ← max=8
  ))

Browser <input type="number" max="8"> rejects 44,46,23 at OS/browser level
onBlur: if (max != null && n > max) onChange(max) → clamps to 8
```

### Owner Directive

"For android only for logo size, UPI QR and fdbk QR — we can put any value like 44, 46, 23." This overrides CR-133 Gap Batch OD-D ("Android constrained to 1–8 scale range").

### Affected Files

| File | Lines | Change |
|---|---|---|
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | 154–163 | Remove `max={maxScale}` for the 3 android-specific size fields ONLY |

**Files NOT touched:** `printerAgentConfigTransform.js` (androidScaleRange stays — used for RowEditor min/max which IS a different context — the style rows use a different scale). The 3 size fields in the Android card are scalar pixel/mm sizes, not style scale multipliers.

**Important distinction:**
- `RowEditor` android mode (style rows: fontSize58, fontSize80): `min=1, max=8` → KEEP (these are scale multipliers 1–8)
- Android card (Logo Size, UPI QR, Fdbk QR): `min=1, max=maxScale` → CHANGE to `min={1}` (no max — these are absolute sizes in mm or pixels)

### Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot file | NO |
| API impact | NONE — backend accepts any integer for these fields |
| **CONFLICT** | BUG-315 also modifies `PrintStyleTab.jsx`. **Execute BUG-315 first**, then BUG-317. |

**Risk: LOW**

### Edit Specification

**File:** `components/panels/settings/printerConfig/PrintStyleTab.jsx:154-163`

```js
// BEFORE:
{[
  { label: 'Logo Size', stateKey: 'androidLogoSize' },
  { label: 'UPI QR',    stateKey: 'androidUpiQrSize' },
  { label: 'Fdbk QR',  stateKey: 'androidFeedbackQrSize' },
].map(({ label, stateKey }) => (
  <div key={stateKey} className="flex items-center justify-between gap-2">
    <span className="text-xs" style={{ color: COLORS.grayText }}>{label}</span>
    <StyleInput value={config[stateKey]} onChange={(v) => update({ [stateKey]: v })}
      min={1} max={maxScale} step={1} testId={`android-${stateKey}`} />
  </div>
))}

// AFTER (BUG-317: owner override OD-D — no max for android absolute sizes):
{[
  { label: 'Logo Size', stateKey: 'androidLogoSize' },
  { label: 'UPI QR',    stateKey: 'androidUpiQrSize' },
  { label: 'Fdbk QR',  stateKey: 'androidFeedbackQrSize' },
].map(({ label, stateKey }) => (
  <div key={stateKey} className="flex items-center justify-between gap-2">
    <span className="text-xs" style={{ color: COLORS.grayText }}>{label}</span>
    <StyleInput value={config[stateKey]} onChange={(v) => update({ [stateKey]: v })}
      min={1} step={1} testId={`android-${stateKey}`} />
  </div>
))}
```

**Change:** Remove `max={maxScale}` prop from 3 `StyleInput` calls. Also remove the `maxScale` display text from the Android card subtitle (or update it to remove the range restriction text).

**Also update** the subtitle text on line ~152: `Scale range: 1–{maxScale}` → remove or change to `Min: 1` for these 3 fields.

**Lines changed:** ~5 lines

### Verification Steps

| # | Step | Method |
|---|---|---|
| V1 | Android Logo Size: enter 44 → accepted | Browser |
| V2 | Android UPI QR: enter 46 → accepted | Browser |
| V3 | Android Fdbk QR: enter 23 → accepted | Browser |
| V4 | Section Style rows (RowEditor android) still constrained to 1–8 | Browser |
| V5 | Save → values persist correctly | Browser |

---

## §4 — BUG-318: Aggregator Auto-Print Keys Missing from Printer UI

### Data Flow Trace (Current — BROKEN)

```
AutoPrintTab.jsx:
  ← Removed aggregator section (CR-133 OD-B)
  ← Shows banner "Go to Aggregator Setup"

AggregatorSetup → OperationalTab.jsx:
  → updateOperationalSettings() → POST /update-settings { basic: { aggregator_auto_kot, ... }}
  → Saves to restaurant profile settings

Printer Agent device reads:
  GET /printer-agent-config → settings_config.auto_print.aggregator_auto_kot
  → API returns: auto_print: {}  (EMPTY — nothing saved here)
  → Printer agent has NO knowledge of aggregator auto-print settings
```

### Root Cause

Two separate API stores:
1. `/update-settings` (restaurant profile) — where AggregatorSetup saves
2. `/printer-agent-config` (printer agent config) — where the physical print device reads

These are different backend tables. Saving to `update-settings` does NOT propagate to `printer-agent-config`. The FE transform already maps `aggregatorAutoKot/Bill/Stage` to `auto_print.aggregator_auto_kot/bill/stage` in the printer-agent-config POST body (toAPI lines 283–285). Only the **UI** removed these fields.

### Transform State (confirmed correct)

```js
// printerAgentConfigTransform.js — fromAPI (already reads):
aggregatorAutoKot: toBool(ap.aggregator_auto_kot),   // line 201
aggregatorAutoBill: toBool(ap.aggregator_auto_bill),  // line 202
aggregatorAutoBillStage: ap.aggregator_auto_bill_stage ?? 'Acknowledged', // line 203

// toAPI (already writes):
ap.aggregator_auto_kot = toYesNo(state.aggregatorAutoKot);   // line 283
ap.aggregator_auto_bill = toYesNo(state.aggregatorAutoBill); // line 284
ap.aggregator_auto_bill_stage = state.aggregatorAutoBillStage; // line 285

// Options (already reads from API):
aggregatorStages: [...(ap.aggregator_auto_bill_stage_options || [])], // line 252
```

### Stage Options Gap

`ap.aggregator_auto_bill_stage_options` returns `[]` for this restaurant (API probe confirmed). Owner-specified options: `["Acknowledged", "Food Ready"]`. Need fallback.

**Transform reads:** `config.options.aggregatorStages` → `[]` → SelectInput shows empty.

### Affected Files

| File | Lines | Change |
|---|---|---|
| `components/panels/settings/printerConfig/AutoPrintTab.jsx` | Full file (59 lines) | Remove aggregator banner; add SectionTitle + 2 Toggle + 1 SelectInput for aggregator fields |
| `api/transforms/printerAgentConfigTransform.js` | 252 | Add fallback for empty `aggregatorStages` |

**Files NOT touched:** `AggregatorSetup/OperationalTab.jsx` (keeping aggregator fields THERE too — see OD-1), `printerAgentConfigService.js`, `PrinterAgentConfigView.jsx`.

### Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot file | NO |
| API contract | NO change — transform already handles these fields |
| Print semantics (R6) | MEDIUM — aggregator auto-print affects when bills are printed; wrong state could over/under print |
| Regression risk | AggregatorOrderPopOut reads `settings?.aggregatorAutoKot` from RestaurantContext (profile settings path). Printer-agent-config is a separate store — no regression on order flow |

**Risk: MEDIUM**

### Edit Specification

**File 1: `api/transforms/printerAgentConfigTransform.js`**

```js
// Add near FALLBACK_FONTS constant (BUG-316):
// BUG-318: fallback when API does not return aggregator_auto_bill_stage_options
const FALLBACK_AGGREGATOR_STAGES = ['Acknowledged', 'Food Ready'];

// Change line 252:
// Before:
aggregatorStages: [...(ap.aggregator_auto_bill_stage_options || [])],
// After (BUG-318):
aggregatorStages: ap.aggregator_auto_bill_stage_options?.length
  ? [...ap.aggregator_auto_bill_stage_options]
  : [...FALLBACK_AGGREGATOR_STAGES],
```

**File 2: `components/panels/settings/printerConfig/AutoPrintTab.jsx`**

Remove the aggregator banner block (lines 30–44).

Add new section after "In-House Orders" toggles:

```jsx
// BUG-318: Aggregator auto-print fields re-added (OD-B override)
<SectionTitle title="Aggregator Orders" />
<Toggle
  label="Auto-print KOT"
  hint="Print KOT automatically when aggregator order is accepted"
  checked={config.aggregatorAutoKot}
  onChange={(v) => update({ aggregatorAutoKot: v })}
  testId="aggregator-auto-kot-toggle"
/>
<Toggle
  label="Auto-print Bill"
  hint="Print bill automatically at the selected stage"
  checked={config.aggregatorAutoBill}
  onChange={(v) => update({ aggregatorAutoBill: v })}
  testId="aggregator-auto-bill-toggle"
/>
{config.aggregatorAutoBill && (
  <SelectInput
    label="Bill Print Stage"
    value={config.aggregatorAutoBillStage}
    onChange={(v) => update({ aggregatorAutoBillStage: v })}
    options={config.options.aggregatorStages.map((s) => ({ value: s, label: s }))}
    data-testid="aggregator-bill-stage-select"
  />
)}
```

**Remove import:** `useNavigate` (no longer needed after banner removal).

**Lines changed:** AutoPrintTab ~+15 lines net. Transform +5 lines.

### Verification Steps

| # | Step | Method |
|---|---|---|
| V1 | AutoPrintTab: Aggregator Orders section visible with KOT toggle, Bill toggle, Stage dropdown | Browser |
| V2 | Stage dropdown shows "Acknowledged" and "Food Ready" options | Browser |
| V3 | Stage dropdown hidden when Auto-print Bill is OFF | Browser |
| V4 | Toggle ON → save → reload → state persists | Browser |
| V5 | Network: POST /printer-agent-config includes `aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage` | Browser DevTools |
| V6 | AggregatorSetup OperationalTab still works independently | Browser |

### Owner Decisions

| # | Question | Impact |
|---|---|---|
| **OD-1** | Should aggregator auto-print fields be **removed** from AggregatorSetup/OperationalTab? Or kept in both? | If kept in both: two separate saves to two separate APIs — can get out of sync. If removed from AggregatorSetup: cleaner but owner must remember to configure in Printer Config only. **Recommend: keep in both with a note in AggregatorSetup pointing to Printer Config for print-specific settings.** |
| **OD-2** | Stage values hardcoded as `["Acknowledged","Food Ready"]` — confirm? | Owner confirmed in session: yes. |

---

## §5 — BUG-319: Footer Text Hardcoded in Print Agent (Backend Only)

### Status: BACKEND-BLOCKED — No FE Code Change Required

**Finding:** The FE correctly reads and saves `footer_text` via `/printer-agent-config`. The physical print agent device firmware ignores this value and uses its own hardcoded string "Powered by MyGenie."

**FE-only option (minimal):** Add a note in `BillContentTab.jsx` footer section:
```
ⓘ Note: Footer text may be overridden by older print agent versions.
```

**Recommendation:** File backend brief + defer FE change until backend confirms reading the configured value.

**Files that WILL NOT change this sprint:** `BillContentTab.jsx` (unless owner approves the note option).

---

## §6 — Conflict Pre-Check

| File | Conflict? | Details |
|---|---|---|
| `PrintStyleTab.jsx` | **YES** | BUG-315 (StyleInput refactor) AND BUG-317 (max removal) both touch this file. **Execute order: BUG-315 → BUG-317.** |
| `shared.jsx` | NO | Only BUG-315 touches NumberInput. Last modifier: CR-133-GAP (IMPLEMENTED). |
| `printerAgentConfigTransform.js` | NO | BUG-316 (fonts) AND BUG-318 (aggregatorStages) both add to this file. Safe to batch — different lines, no overlap. |
| `AutoPrintTab.jsx` | NO | Only BUG-318. Last modifier: CR-133-GAP T14 (IMPLEMENTED). |

---

## §7 — Scope Lock

| File | BUG-315 | BUG-316 | BUG-317 | BUG-318 | BUG-319 |
|---|---|---|---|---|---|
| `PrintStyleTab.jsx` | ✅ WILL change | ❌ | ✅ WILL change | ❌ | ❌ |
| `shared.jsx` | ✅ WILL change | ❌ | ❌ | ❌ | ❌ |
| `printerAgentConfigTransform.js` | ❌ | ✅ WILL change | ❌ | ✅ WILL change | ❌ |
| `AutoPrintTab.jsx` | ❌ | ❌ | ❌ | ✅ WILL change | ❌ |
| `BillContentTab.jsx` | ❌ | ❌ | ❌ | ❌ | Optional note only |
| All other files | ❌ | ❌ | ❌ | ❌ | ❌ |

**Total:** 4 files changed, ~50 lines net, 0 new files

---

## §8 — Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: BUG-315/316/317/318 → IMPLEMENTED; BUG-319 → BACKEND-BLOCKED (no change)
□ BUG_TRACKER.md: rows updated for all 5
□ FILE_OWNERSHIP.md: add entries for PrintStyleTab, shared.jsx, printerAgentConfigTransform.js, AutoPrintTab.jsx
□ Code markers: // BUG-315, // BUG-316, // BUG-317, // BUG-318 in each modified file
□ Webpack: 0 new warnings after all changes
□ Execution order: BUG-315 → BUG-317 (same file); BUG-316 + BUG-318 can batch (same file, different lines)
```

---

## §9 — Owner Decision Queue

| # | ID | Question | Blocking? |
|---|---|---|---|
| OD-1 | BUG-318 | Keep aggregator auto-print in AggregatorSetup too, or remove from there? | NO — implement printer side first; AggregatorSetup cleanup as follow-up |
| OD-2 | BUG-318 | Stage options `["Acknowledged","Food Ready"]` hardcoded — confirm? | Owner confirmed YES |
| OD-3 | BUG-319 | Hide footer text FE field until backend fixes, or add info note, or leave as-is? | NO — leave as-is, just file backend brief |
