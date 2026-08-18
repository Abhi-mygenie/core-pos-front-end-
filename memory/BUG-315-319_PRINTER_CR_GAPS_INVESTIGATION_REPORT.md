# BUG-315 → BUG-319 — Investigation Report: Printer Agent Config — 5 Gaps

**Date:** 2026-08-13  
**Role:** INVESTIGATION  
**Confidence:** HIGH for all items  
**Steps used:** 8/10  
**Related:** CR-133 (Printer Agent Config), CR-133 Gap Batch (already QA PASS 15/15)

---

## Cross-Reference: CR-133 Gap Batch OD-B

CR-133 Gap Batch **OD-B** (owner decision, locked 2026-08-10): "Aggregator fields (auto_kot, auto_bill, stage) stay in CR-135 only — no change to AutoPrintTab."  
Owner is NOW reversing this decision — needs to be recorded as new owner directive.

---

## 1. Summary Table

| Bug ID | Title | Classification | Root Cause | Fix Type | Confidence |
|---|---|---|---|---|---|
| BUG-315 | Numeric input can't be cleared to retype | FE_BUG | Controlled input + `if (raw==='') return` pattern | FE | HIGH |
| BUG-316 | Font dropdown empty (available_fonts null) | FE_BUG | API returns null → no fallback list | FE | HIGH |
| BUG-317 | Android size inputs max=8 rejects owner values (44, 46, 23) | CONFIG_ISSUE | `androidScaleRange` defaults to [1,8]; max constraint in StyleInput | FE | HIGH |
| BUG-318 | Aggregator auto-print keys missing from printer UI + wrong API | FE_BUG | OD-B removed them from AutoPrintTab; OperationalTab saves to update-settings not printer-agent-config | FE | HIGH |
| BUG-319 | Footer text "Powered by MyGenie" hardcoded in print agent | BACKEND_BUG | Print agent device software ignores FE-configured footer_text | BACKEND_BRIEF | HIGH |

---

## 2. Individual Root Cause Analysis

---

### BUG-315 — Numeric Input Can't Be Cleared

**Symptom:** User selects "1" in Bill Copies, KOT Copies, or any style size input and presses Delete/Backspace — the digit "1" snaps back immediately.

**Root cause trace:**

```
StyleInput (PrintStyleTab.jsx:14-32):
  onChange={(e) => {
    const v = e.target.value;
    if (v === '') return;          // ← does NOT call onChange(n)
    const n = parseFloat(v);
    if (Number.isFinite(n)) onChange(n);
  }}

NumberInput (shared.jsx:34-38):
  onChange={(e) => {
    const raw = e.target.value;
    if (raw === '') return;        // ← does NOT call onChange(n)
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onChange(n);
  }}

Both are React CONTROLLED inputs: value={value ?? ""}
  → When user clears, onChange state is NOT updated
  → React re-renders with old state value
  → Input visually reverts to old number instantly
  → User cannot clear to retype a completely different number
```

**Affected files:**
- `src/components/panels/settings/printerConfig/PrintStyleTab.jsx` — `StyleInput` component
- `src/components/panels/settings/shared.jsx` — `NumberInput` component

**Note:** CR-133 Gap Batch G4 attempted to fix this with `if (raw === '') return` (intended to allow clearing). But this approach fails for controlled components because state doesn't update. The real fix requires a local display-value state separate from the prop state.

**Fix approach:**
```js
// Add local display state
const [localVal, setLocalVal] = useState(String(value ?? ''));
// Sync when prop changes externally
useEffect(() => setLocalVal(String(value ?? '')), [value]);
// onChange: update local always; propagate only if valid number
onChange={(e) => {
  setLocalVal(e.target.value);
  const n = parseFloat(e.target.value);
  if (Number.isFinite(n)) onChange(n);
}}
// onBlur: clamp and propagate
onBlur={() => {
  const n = parseFloat(localVal);
  const clamped = Number.isFinite(n) ? Math.max(min??0, Math.min(max??n, n)) : (min ?? 0);
  onChange(clamped);
  setLocalVal(String(clamped));
}}
// input value uses local state
value={localVal}
```

**Risk:** LOW — UI only, no API change, no financial logic. 2 files, ~15 lines each.  
**Planning skip eligible:** YES (owner approval needed).

---

### BUG-316 — Font Dropdown Empty

**Symptom:** Font Family dropdown in Print Style tab is empty — no options selectable.

**Root cause trace:**
```
API GET /printer-agent-config → global_settings.available_fonts = null

Transform (printerAgentConfigTransform.js:253):
  fonts: [...(gs.available_fonts || [])]   → fonts = []

PrintStyleTab.jsx:122:
  <SelectInput options={options.fonts.map((f) => ({ value: f, label: f }))} />
  → options = [] → dropdown shows nothing

Owner-specified available fonts:
  ['Montserrat','Roboto','Poppins','Ubuntu','Open Sans','Lato','Oswald',
   'Helvetica (Sans Serif)','Times New Roman','Courier','Gujarati']
```

**Fix approach:** Add fallback list in transform when `gs.available_fonts` is null/empty:
```js
// printerAgentConfigTransform.js:253
const FALLBACK_FONTS = [
  'Montserrat','Roboto','Poppins','Ubuntu','Open Sans','Lato','Oswald',
  'Helvetica (Sans Serif)','Times New Roman','Courier','Gujarati'
];
fonts: gs.available_fonts?.length ? [...gs.available_fonts] : FALLBACK_FONTS,
```

**Risk:** LOW — UI only, non-financial. 1 file, 3 lines.  
**Planning skip eligible:** YES (owner approval needed). Owner has explicitly stated the valid font list.

---

### BUG-317 — Android Size Fields Constrained to Max 8

**Symptom:** Android Logo Size, UPI QR, Feedback QR inputs reject values > 8 (owner needs 44, 46, 23).

**Root cause trace:**
```
API → global_settings.android = {} (empty for this restaurant)

Transform (printerAgentConfigTransform.js:237):
  androidScaleRange: gs.android?.size_scale_range ?? [1, 8]
  → defaults to [1, 8]

PrintStyleTab.jsx:116:
  const maxScale = (config.androidScaleRange ?? [1, 8])[1];  → maxScale = 8

PrintStyleTab.jsx:161:
  <StyleInput min={1} max={maxScale} step={1} ... />
  → max=8 → browser input rejects 44, 46, 23
  → onBlur clamps to 8
```

**Owner directive:** Android Logo Size, UPI QR size, Feedback QR size should accept **any positive integer** (no upper bound). Values like 44, 46, 23 are valid.

**Fix approach:** Remove `max` constraint on android-specific size fields:
```js
// PrintStyleTab.jsx lines 155-163: remove max={maxScale} for android size fields
// OR: set maxScale = undefined for these 3 specific fields
{ label: 'Logo Size', stateKey: 'androidLogoSize', maxOverride: undefined },
{ label: 'UPI QR',    stateKey: 'androidUpiQrSize', maxOverride: undefined },
{ label: 'Fdbk QR',  stateKey: 'androidFeedbackQrSize', maxOverride: undefined },
```

**Risk:** LOW — display only, no financial logic. 1 file, 5 lines.  
**Planning skip eligible:** YES (owner approval needed).

---

### BUG-318 — Aggregator Auto-Print Keys Missing from Printer Agent UI

**Symptom:** Owner tries to set `aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage` in the printer config page but:
1. They are not shown in AutoPrintTab (removed in CR-133 amendment per OD-B)
2. They are shown in AggregatorSetup → OperationalTab but save to the WRONG API

**Root cause trace:**
```
AutoPrintTab.jsx:2:
  "CR-133 amendment: Aggregator Orders section removed — moved to CR-135 AggregatorSetup OperationalTab"

OperationalTab.jsx (AggregatorSetup) saves:
  → aggregatorConfigService.updateOperationalSettings()
  → POST /api/v2/vendoremployee/restaurant-settings/update-settings { basic: { aggregator_auto_kot, ... }}

BUT: Printer agent device software reads from:
  → GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config
  → settings_config.auto_print.aggregator_auto_kot (currently empty {})

DISCONNECT: FE saves to update-settings API; printer agent reads from printer-agent-config API.
  → Owner sets auto_kot = Yes in AggregatorSetup → saved to update-settings
  → Printer agent reads printer-agent-config → auto_print is empty → auto_kot never triggers
```

**Live API evidence:**
```
GET /printer-agent-config → auto_print keys: [] (empty)
```
The printer-agent-config API returns empty auto_print for this restaurant, meaning no aggregator settings have ever been saved to this endpoint.

**Transform: already maps these keys** (printerAgentConfigTransform.js:201-203, 283-285):
```js
// fromAPI — already reads:
aggregatorAutoKot: toBool(ap.aggregator_auto_kot),
aggregatorAutoBill: toBool(ap.aggregator_auto_bill),
aggregatorAutoBillStage: ap.aggregator_auto_bill_stage ?? 'Acknowledged',

// toAPI — already writes:
ap.aggregator_auto_kot = toYesNo(state.aggregatorAutoKot);
ap.aggregator_auto_bill = toYesNo(state.aggregatorAutoBill);
ap.aggregator_auto_bill_stage = state.aggregatorAutoBillStage;
```

**The transform is correct.** Only the UI (AutoPrintTab) needs the 3 fields restored.

**Fix approach:** Re-add to AutoPrintTab:
- Toggle: Auto KOT (aggregator orders)
- Toggle: Auto Bill (aggregator orders)  
- Dropdown: Bill Stage — `["Acknowledged", "Food Ready"]` (owner-specified options)
- Remove the info banner pointing to AggregatorSetup

**Also:** `aggregator_auto_bill_stage_options` should come from API. Currently the API returns empty auto_print. Need to either:
- a) Hardcode the 2 options (owner specified: "Acknowledged", "Food Ready")
- b) Use `config.options.aggregatorStages` (transform already reads `ap.aggregator_auto_bill_stage_options || []`)

**Risk:** MEDIUM — touches auto-print settings. 1 file (AutoPrintTab.jsx), ~25 lines.  
**Owner decision changed:** OD-B is being overridden — document as new owner directive.  
**Planning skip eligible:** NO — requires full Gate 2-3 (touches aggregator print flow).

---

### BUG-319 — Footer Text Hardcoded in Print Agent

**Symptom:** Bill prints always show "Powered by MyGenie" footer regardless of what is configured in the FE.

**Root cause:**
```
API GET /printer-agent-config → bill_footer.footer_text = 'Powered by MyGenie'
  → This IS the value from the API — FE correctly reads and saves it
  → But: the physical print agent (device software/backend) ignores the footer_text field
  → Print agent has "Powered by MyGenie" hardcoded in its own codebase

FE evidence: BillContentTab.jsx:74 renders editable TextInput for footerText
  → User can edit → FE saves → API stores new value
  → BUT print agent reads its own hardcoded value, not from this API field
```

**This is a BACKEND / print agent firmware issue.** No FE change can resolve it.

**Backend Brief:** The print agent must read `footer_text` from the `bill_footer` key in the printer config API response instead of using its hardcoded string.

---

## 3. Evidence Artifacts

Saved to: `/app/memory/evidence/CR-133-PRINTER-GAPS/`
- `printer_config_api.txt` — full API probe results

**Key API findings:**
- `auto_print keys: []` — aggregator + copies fields completely absent from this restaurant's config
- `available_fonts: None` — backend doesn't return font list  
- `android keys: []` — android size range absent, defaults to [1,8]
- `bill_footer.footer_text = 'Powered by MyGenie'` — hardcoded in backend
- `aggregator_auto_bill_stage_options` — not returned by API (must hardcode in FE)

---

## 4. Retroactive Candidates

- OD-B (CR-133 Gap Batch, 2026-08-10) declared aggregator fields "stay in AggregatorSetup". Owner is now reversing this. Document as owner-directive change, not retroactive code issue.
