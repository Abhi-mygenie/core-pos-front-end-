# Implementation Plan — Printer Batch: BUG-315, BUG-316, BUG-317, BUG-318

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-13
**Role:** PLANNING
**Sprint:** pos_5_1
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Owner Decisions Locked

| # | Bug | Decision |
|---|---|---|
| OD-1 | BUG-318 | **Option A — Keep in both** (Printer Config + Aggregator Setup) |
| OD-2 | BUG-318 | Stage options: hardcode `["Acknowledged","Food Ready"]` as fallback; stage dropdown shows ONLY when Auto-print Bill is ON |
| OD-3 | BUG-319 | **No FE change** — backend-blocked; leave Footer Text field as-is |

**BUG-319 excluded from this plan** — no code change required.

---

## Pre-Plan Entry Verification (ALL PASS)

| Edit | File | IA Claim | Verified? |
|---|---|---|---|
| 1 | `shared.jsx:36` | `if (raw === '') return;` in NumberInput onChange | ✅ PASS |
| 2 | `PrintStyleTab.jsx:10–32` | StyleInput stateless arrow fn with `if (v === '') return;` | ✅ PASS |
| 3 | `PrintStyleTab.jsx:116,152,161` | `maxScale=(config.androidScaleRange??[1,8])[1]`, subtitle "Scale range: 1–{maxScale}", `max={maxScale}` on 3 fields | ✅ PASS |
| 4 | `printerAgentConfigTransform.js:252–253` | `aggregatorStages: [...(ap.aggregator_auto_bill_stage_options \|\| [])]` + `fonts: [...(gs.available_fonts \|\| [])]` | ✅ PASS |
| 5 | `AutoPrintTab.jsx:4,27,30–44` | `useNavigate` import, `navigate` const, aggregator banner block | ✅ PASS |

---

## Scope Lock

| File | Bugs | Touch? |
|---|---|---|
| `components/panels/settings/shared.jsx` | BUG-315 | ✅ YES |
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | BUG-315, BUG-317 | ✅ YES |
| `api/transforms/printerAgentConfigTransform.js` | BUG-316, BUG-318 | ✅ YES |
| `components/panels/settings/printerConfig/AutoPrintTab.jsx` | BUG-318 | ✅ YES |
| `BillContentTab.jsx` | BUG-319 | ❌ NO — backend-blocked, leave as-is |
| All other files | — | ❌ NO |

**New files:** NONE · **Total:** 4 files · 5 edits · ~50 lines net

---

## Execution Order

```
⚠ CONFLICT: BUG-315 and BUG-317 both touch PrintStyleTab.jsx
  → BUG-315 FIRST (changes StyleInput component definition)
  → BUG-317 SECOND (changes StyleInput usage in android card)

FILE 1: shared.jsx
  Edit 1 — BUG-315  NumberInput → stateful with localVal

FILE 2: PrintStyleTab.jsx
  Edit 2 — BUG-315  StyleInput → stateful with localVal  (+useEffect to import)
  Edit 3 — BUG-317  android card: remove max constraint + update subtitle

FILE 3: printerAgentConfigTransform.js
  Edit 4 — BUG-316 + BUG-318  add FALLBACK_FONTS + FALLBACK_AGGREGATOR_STAGES constants
                               update fonts + aggregatorStages lines

FILE 4: AutoPrintTab.jsx
  Edit 5 — BUG-318  remove banner + useNavigate; add Aggregator Orders section

→ Compile check after all 5 edits
→ Self-test V1–V11
→ EXIT GATE (5 checkboxes)
```

---

## Edit 1 — BUG-315: `shared.jsx` — NumberInput stateful

**File:** `src/components/panels/settings/shared.jsx`

**Step 1a — Add `useEffect` to import (line 1):**

```js
// BEFORE:
import { useState } from "react";

// AFTER:
import { useState, useEffect } from "react";
```

**Step 1b — Replace entire NumberInput component (lines 25–56):**

```js
// BEFORE:
export const NumberInput = ({ label, value, onChange, min, max, step, suffix }) => (
  <div className="py-2">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return;                                    // allow clearing to retype
          const n = parseFloat(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={(e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isFinite(n) || (min != null && n < min)) { onChange(min ?? 0); return; }
          if (max != null && n > max) onChange(max);
        }}
        min={min}
        max={max}
        step={step || 1}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {suffix && <span className="text-sm" style={{ color: COLORS.grayText }}>{suffix}</span>}
    </div>
  </div>
);
```

```js
// AFTER (BUG-315: local display state — allows clearing to retype):
export const NumberInput = ({ label, value, onChange, min, max, step, suffix }) => {
  const [localVal, setLocalVal] = useState(value != null ? String(value) : '');
  useEffect(() => { setLocalVal(value != null ? String(value) : ''); }, [value]);
  return (
    <div className="py-2">
      <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={localVal}
          onChange={(e) => {
            setLocalVal(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => {
            const n = parseFloat(localVal);
            const minV = min ?? 0;
            if (!Number.isFinite(n) || n < minV) { onChange(minV); setLocalVal(String(minV)); return; }
            if (max != null && n > max) { onChange(max); setLocalVal(String(max)); return; }
            onChange(n);
          }}
          min={min}
          max={max}
          step={step || 1}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
        {suffix && <span className="text-sm" style={{ color: COLORS.grayText }}>{suffix}</span>}
      </div>
    </div>
  );
};
```

**Key differences:**
- Arrow fn `= () => (...)` → function body `= () => { ...; return (...); }`
- `value={value ?? ""}` → `value={localVal}` (uses local state, not prop directly)
- `onChange`: `setLocalVal` + propagate only valid numbers
- `onBlur`: clamp + `setLocalVal(String(clamped))` to keep display in sync

---

## Edit 2 — BUG-315: `PrintStyleTab.jsx` — StyleInput stateful

**File:** `src/components/panels/settings/printerConfig/PrintStyleTab.jsx`

**Step 2a — Add `useEffect` to import (line 2):**

```js
// BEFORE:
import { useState } from "react";

// AFTER:
import { useState, useEffect } from "react";
```

**Step 2b — Replace StyleInput component (lines 10–33):**

```jsx
// BEFORE:
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
    min={min}
    max={max}
    className="w-16 px-2 py-1 text-xs rounded border outline-none text-center"
    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
    data-testid={testId}
  />
);
```

```jsx
// AFTER (BUG-315: local display state — allows clearing to retype):
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

---

## Edit 3 — BUG-317: `PrintStyleTab.jsx` — Remove android max constraint

**File:** `src/components/panels/settings/printerConfig/PrintStyleTab.jsx`
*(Apply AFTER Edit 2 on same file)*

**Change 3a — Update subtitle text (line ~152):**

```jsx
// BEFORE:
          <div className="text-[10px] mb-3" style={{ color: COLORS.grayText }}>Scale range: 1–{maxScale}</div>

// AFTER (BUG-317: no upper bound for absolute sizes):
          <div className="text-[10px] mb-3" style={{ color: COLORS.grayText }}>Min: 1</div>
```

**Change 3b — Remove `max={maxScale}` from 3 android size fields (~line 161):**

```jsx
// BEFORE:
              <StyleInput value={config[stateKey]} onChange={(v) => update({ [stateKey]: v })} min={1} max={maxScale} step={1} testId={`android-${stateKey}`} />

// AFTER (BUG-317: owner confirmed — android absolute sizes have no upper bound):
              <StyleInput value={config[stateKey]} onChange={(v) => update({ [stateKey]: v })} min={1} step={1} testId={`android-${stateKey}`} />
```

**Note:** `maxScale` const (line 116) can stay — it is still used by `RowEditor` android mode (style row 58mm/80mm scale inputs). Only the 3 android card global size fields change.

---

## Edit 4 — BUG-316 + BUG-318: `printerAgentConfigTransform.js` — Fallback constants + lines

**File:** `src/api/transforms/printerAgentConfigTransform.js`

**Change 4a — Add constants near top of file (after existing comment block, before `toNum` helper):**

```js
// BUG-316: fallback when API does not return available_fonts
const FALLBACK_FONTS = [
  'Montserrat', 'Roboto', 'Poppins', 'Ubuntu', 'Open Sans', 'Lato', 'Oswald',
  'Helvetica (Sans Serif)', 'Times New Roman', 'Courier', 'Gujarati',
];
// BUG-318: fallback when API does not return aggregator_auto_bill_stage_options
const FALLBACK_AGGREGATOR_STAGES = ['Acknowledged', 'Food Ready'];
```

**Change 4b — Update `aggregatorStages` line 252:**

```js
// BEFORE:
      aggregatorStages: [...(ap.aggregator_auto_bill_stage_options || [])],

// AFTER (BUG-318):
      aggregatorStages: ap.aggregator_auto_bill_stage_options?.length
        ? [...ap.aggregator_auto_bill_stage_options]
        : [...FALLBACK_AGGREGATOR_STAGES],
```

**Change 4c — Update `fonts` line 253:**

```js
// BEFORE:
      fonts: [...(gs.available_fonts || [])],

// AFTER (BUG-316):
      fonts: gs.available_fonts?.length ? [...gs.available_fonts] : [...FALLBACK_FONTS],
```

---

## Edit 5 — BUG-318: `AutoPrintTab.jsx` — Remove banner, add Aggregator Orders section

**File:** `src/components/panels/settings/printerConfig/AutoPrintTab.jsx`

**Replace entire file** (59 lines → ~80 lines):

```jsx
// CR-133: Auto Print tab — copies, in-house toggles (incl. Auto Settle)
// BUG-318: Aggregator Orders section restored — OD-B overridden by owner 2026-08-13
import { COLORS } from "../../../../constants";
import { NumberInput, SelectInput, SectionTitle } from "../shared";

const Toggle = ({ label, hint, checked, onChange, testId }) => (
  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
    <div>
      <span className="text-sm block" style={{ color: COLORS.darkText }}>{label}</span>
      {hint && <span className="text-xs" style={{ color: COLORS.grayText }}>{hint}</span>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? COLORS.primaryGreen : COLORS.borderGray }}
      data-testid={testId}
    >
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow" style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  </div>
);

export const AutoPrintTab = ({ config, update }) => {
  return (
  <div data-testid="autoprint-tab">
    <SectionTitle title="Print Copies" />
    <div className="grid grid-cols-2 gap-3">
      <NumberInput label="Bill Copies" value={config.billCopyCount} onChange={(v) => update({ billCopyCount: Math.max(1, Math.round(v)) })} min={1} max={5} step={1} />
      <NumberInput label="KOT Copies" value={config.kotCopyCount} onChange={(v) => update({ kotCopyCount: Math.max(1, Math.round(v)) })} min={1} max={5} step={1} />
    </div>

    <SectionTitle title="In-House Orders" />
    <Toggle label="Auto-print Bill" hint="Print the bill automatically when generated" checked={config.autoPrintBill} onChange={(v) => update({ autoPrintBill: v })} testId="auto-print-bill-toggle" />
    <Toggle label="Auto-print KOT" hint="Print kitchen tickets automatically on order placement" checked={config.autoPrintKot} onChange={(v) => update({ autoPrintKot: v })} testId="auto-print-kot-toggle" />
    <Toggle label="Auto Settle" hint="Settle the order automatically after bill print" checked={config.autoSettle} onChange={(v) => update({ autoSettle: v })} testId="auto-settle-toggle" />
    <Toggle label="Scan Order Auto-print" hint="Auto-print orders placed via QR scan" checked={config.scanOrderAutoPrint} onChange={(v) => update({ scanOrderAutoPrint: v })} testId="scan-order-auto-print-toggle" />

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
      />
    )}

  </div>
  );
};
```

**What changes vs current:**
- Removed `import { useNavigate } from "react-router-dom"` (no longer needed)
- Removed `const navigate = useNavigate()` (line 27)
- Removed aggregator banner block (lines 30–44) — the blue redirect banner
- Added `SectionTitle title="Aggregator Orders"` section
- Added 2 Toggle components: `aggregator-auto-kot-toggle`, `aggregator-auto-bill-toggle`
- Added conditional `SelectInput` for stage — only renders when `config.aggregatorAutoBill` is `true`
- Stage options come from `config.options.aggregatorStages` (now populated by fallback in transform Edit 4b)

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|---|---|---|
| R1 | `useEffect` sync loop — value changes trigger setLocalVal which triggers rerender | NONE | `useEffect` depends on `[value]` only; `setLocalVal` doesn't change `value` prop → no loop |
| R2 | `localVal` shows stale value if parent patches config directly | VERY LOW | `useEffect([value])` syncs on every parent prop change |
| R3 | `maxScale` removed from android size fields — RowEditor android scale inputs still have max | NONE — by design | RowEditor uses `maxV` = `isAndroid ? 8 : undefined` independently of the global size card |
| R4 | Aggregator Settings in two places (OD-1 Option A) may get out of sync | ACCEPTED | Owner confirmed both intentional. Printer Config → printer-agent-config API. Aggregator Setup → update-settings API. |
| R5 | `useNavigate` removed from AutoPrintTab — no other navigate calls in this component | NONE | Verified: only navigate call was `navigate("/aggregator/setup")` inside the banner |

---

## Verification Matrix

| # | Bug | Test | Method |
|---|---|---|---|
| V1 | BUG-315 | Bill Copies: select "1", press Delete → field shows empty → type "3" → shows "3" | Browser |
| V2 | BUG-315 | KOT Copies: same clear+retype test | Browser |
| V3 | BUG-315 | Style size field: select value, delete, type new number → saves correctly | Browser |
| V4 | BUG-315 | onBlur clamp: clear field, blur → clamps to min | Browser |
| V5 | BUG-316 | Print Style → Font Family dropdown shows 11 options incl. Montserrat, Gujarati | Browser |
| V6 | BUG-316 | Select "Poppins" → Save → reload → Poppins pre-selected | Browser |
| V7 | BUG-317 | Android Logo Size: type 44 → accepted, not clamped to 8 | Browser |
| V8 | BUG-317 | Android UPI QR: type 46 → accepted | Browser |
| V9 | BUG-317 | Android Fdbk QR: type 23 → accepted | Browser |
| V10 | BUG-317 | RowEditor android (section style rows): still constrained to 1–8 | Browser |
| V11 | BUG-318 | Auto Print tab: "Aggregator Orders" section visible — KOT toggle, Bill toggle | Browser |
| V12 | BUG-318 | Stage dropdown hidden when Auto-print Bill is OFF | Browser |
| V13 | BUG-318 | Toggle Auto-print Bill ON → Stage dropdown shows "Acknowledged" and "Food Ready" | Browser |
| V14 | BUG-318 | Toggle → Save → reload → state persists | Browser |
| V15 | BUG-318 | Network: POST /printer-agent-config includes aggregator_auto_kot, aggregator_auto_bill, aggregator_auto_bill_stage | DevTools |
| V16 | Regression | Aggregator Setup OperationalTab still works independently | Browser |

---

## Post-Code Registry Checklist

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     d = json.load(open('/app/memory/control/registry.json'))
     items = {i['id']: i for i in d['items']}
     for bid in ['BUG-315','BUG-316','BUG-317','BUG-318']:
         assert 'IMPLEMENTED' in items[bid].get('status',''), f'{bid} not IMPLEMENTED'
         assert items[bid]['sprint_key'] == 'pos_5_1', f'{bid} wrong sprint'
     print('Registry sync PASS')
     "

□ 2. BUG_TRACKER.md: BUG-315/316/317/318 → IMPLEMENTED. BUG-319 stays BACKEND-BLOCKED.

□ 3. FILE_OWNERSHIP.md:
     | shared.jsx                       | BUG-315: NumberInput → stateful localVal + useEffect |
     | printerConfig/PrintStyleTab.jsx  | BUG-315: StyleInput → stateful localVal. BUG-317: android max removed |
     | printerAgentConfigTransform.js   | BUG-316: FALLBACK_FONTS. BUG-318: FALLBACK_AGGREGATOR_STAGES + lines 252-253 |
     | printerConfig/AutoPrintTab.jsx   | BUG-318: banner removed + useNavigate removed + Aggregator Orders section added |

□ 4. CODE MARKERS:
     shared.jsx: // BUG-315
     PrintStyleTab.jsx: // BUG-315, // BUG-317
     printerAgentConfigTransform.js: // BUG-316, // BUG-318
     AutoPrintTab.jsx: // BUG-318

□ 5. COMPILE CHECK: webpack compiled with 0 new warnings
     (pre-existing: allDays useMemo in SettlementReportMockup.jsx — acceptable)
```

---

## QA Handover Seeds

**Navigate to:** `/settings` → click "Printers" tile (NOT sidebar Printers — that shows comingSoon toast)  
**Test account:** `owner@thegoankitchen.com` / `Qplazm@10`  
**App URL:** https://pos-frontend-deploy-28.preview.emergentagent.com

| Page | Tab | Tests |
|---|---|---|
| /settings → Printers | Auto Print | V1–V4 (copies clear), V11–V15 (aggregator section) |
| /settings → Printers | Print Style | V5–V6 (fonts), V7–V10 (android sizes) |
| /aggregator/setup | Operational | V16 (regression) |
