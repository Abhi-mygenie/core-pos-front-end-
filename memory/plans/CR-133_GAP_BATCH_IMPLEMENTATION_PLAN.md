# CR-133 Gap Batch — Implementation Plan (Gate 3)
**Date:** 2026-08-11
**Role:** PLANNING (Gate 3)
**Risk:** HIGH (transform affects live printing)
**Sprint:** pos_5_1
**Status:** AWAITING GATE 4 GO

---

## Entry Verification (MANDATORY — confirm before coding)

| # | Plan says | Verify |
|---|---|---|
| E1 | `shared.jsx` L33: `onChange={(e) => onChange(parseFloat(e.target.value) \|\| 0)}` | `sed -n '33p' shared.jsx` |
| E2 | `printerAgentConfigTransform.js` L108: `fontSize58: toNum(row.font_size_58mm),` | `sed -n '108p' transform` |
| E3 | `printerAgentConfigTransform.js` L125-126: writes flat `rawRow.font_size_58mm` | `sed -n '125,126p' transform` |
| E4 | `printerAgentConfigTransform.js` L194: `top: gs.page_margins_mm?.top ?? 0` | `sed -n '194p' transform` |
| E5 | `printerAgentConfigTransform.js` L276: `gs.page_margins_mm = {...}` | `sed -n '276p' transform` |
| E6 | `printerAgentConfigTransform.js` L296: `employee_id: body.employee_id` | `sed -n '296p' transform` |
| E7 | `PrintStyleTab.jsx` L17: `onChange={(e) => onChange({ ...row, fontSize58: parseFloat(e.target.value) \|\| 0 })}` | `sed -n '17p' PrintStyleTab.jsx` |
| E8 | `BillContentTab.jsx` L23: `export const BillContentTab = ({ config, update }) => (` | `sed -n '23p' BillContentTab.jsx` |
| E9 | `printerAgentConfigService.js` L27 is last line (closing blank after `};`) | `wc -l printerAgentConfigService.js` |

---

## Execution Sequence

```
EDIT-1  shared.jsx                        (NumberInput fix — no dependency)
EDIT-2  printerAgentConfigTransform.js    (core transform — 5 sub-edits A→E)
EDIT-3  PrintStyleTab.jsx                 (UI split — depends on EDIT-2 for new state shape)
EDIT-4  printerAgentConfigService.js      (additive — no dependency)
EDIT-5  BillContentTab.jsx               (depends on EDIT-2 for employeeId in state)
```

EDIT-1 and EDIT-4 can be done in parallel.
EDIT-2 must complete before EDIT-3 and EDIT-5.

---

## EDIT-1 — `shared.jsx` — NumberInput allow-empty

**File:** `/app/frontend/src/components/panels/settings/shared.jsx`

**Current (line 30-43):**
```jsx
export const NumberInput = ({ label, value, onChange, min, max, step, suffix }) => (
  <div className="py-2">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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

**Replace with:**
```jsx
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

**Self-test:** Open Bill Copies. Clear "1". Type "3". Field shows "3". Blur → stays "3". ✓

---

## EDIT-2 — `printerAgentConfigTransform.js` — 5 sub-edits (A→E)

**File:** `/app/frontend/src/api/transforms/printerAgentConfigTransform.js`

### EDIT-2A: `normalizeStyle` (lines 100-115) — prefer windows sub-object

**Replace lines 99-115:**
```js
/** Hybrid API shape: rows have BOTH flat keys AND windows{}/android{} sub-objects.
 *  Prefer windows sub-object (backend now reads this). Fall back to flat for old configs. */
const normalizeStyle = (styleSection = {}) => {
  const out = {};
  Object.entries(styleSection).forEach(([sectionKey, rows]) => {
    if (!rows || typeof rows !== 'object') return;
    out[sectionKey] = {};
    Object.entries(rows).forEach(([rowKey, row]) => {
      if (!row || typeof row !== 'object') return;
      const w = row.windows || row;    // prefer windows sub-object; flat is backward compat
      const a = row.android || {};
      out[sectionKey][rowKey] = {
        windows: {
          fontSize58: toNum(w.font_size_58mm),
          fontSize80: toNum(w.font_size_80mm),
          bold:       toBool(w.bold),
        },
        android: {
          fontSize58: toNum(a.font_size_58mm, 1),
          fontSize80: toNum(a.font_size_80mm, 1),
          bold:       toBool(a.bold),
        },
      };
    });
  });
  return out;
};
```

### EDIT-2B: `applyStyle` (lines 117-130) — write windows (primary) + flat (backward compat) + android

**Replace lines 117-130:**
```js
/** Write to windows{} (backend reads this) AND flat fields (backward compat for older agents).
 *  Android values written to android{} sub-object. */
const applyStyle = (rawSection = {}, styleState = {}) => {
  Object.entries(styleState).forEach(([sectionKey, rows]) => {
    const rawRows = rawSection[sectionKey];
    if (!rawRows) return;
    Object.entries(rows).forEach(([rowKey, row]) => {
      const rawRow = rawRows[rowKey];
      if (!rawRow) return;
      // Windows (primary — backend reads these for Windows printing)
      if (!rawRow.windows) rawRow.windows = {};
      rawRow.windows.font_size_58mm = toNum(row.windows?.fontSize58);
      rawRow.windows.font_size_80mm = toNum(row.windows?.fontSize80);
      rawRow.windows.bold           = toYesNo(row.windows?.bold);
      // Flat (backward compat — keep in sync with windows values)
      rawRow.font_size_58mm = rawRow.windows.font_size_58mm;
      rawRow.font_size_80mm = rawRow.windows.font_size_80mm;
      rawRow.bold           = rawRow.windows.bold;
      // Android
      if (!rawRow.android) rawRow.android = {};
      rawRow.android.font_size_58mm = toNum(row.android?.fontSize58, 1);
      rawRow.android.font_size_80mm = toNum(row.android?.fontSize80, 1);
      rawRow.android.bold           = toYesNo(row.android?.bold);
    });
  });
};
```

### EDIT-2C: `fromAPI` — global_settings (lines 193-206) — prefer windows + add android

**Replace lines 193-206:**
```js
    pageMargins: {
      top:    gs.windows?.page_margins_mm?.top    ?? gs.page_margins_mm?.top    ?? 0,
      bottom: gs.windows?.page_margins_mm?.bottom ?? gs.page_margins_mm?.bottom ?? 0,
      left:   gs.windows?.page_margins_mm?.left   ?? gs.page_margins_mm?.left   ?? 0,
      right:  gs.windows?.page_margins_mm?.right  ?? gs.page_margins_mm?.right  ?? 0,
    },
    logoSize: {
      width:  gs.windows?.logo_size_mm?.width  ?? gs.logo_size_mm?.width  ?? 30,
      height: gs.windows?.logo_size_mm?.height ?? gs.logo_size_mm?.height ?? 30,
    },
    qrSize: {
      upi:      gs.windows?.qr_size_mm?.upi      ?? gs.qr_size_mm?.upi      ?? 25,
      feedback: gs.windows?.qr_size_mm?.feedback ?? gs.qr_size_mm?.feedback ?? 25,
    },
    // Android global sizes (scalar int, scale range 1–8)
    androidLogoSize:       gs.android?.logo_size_mm          ?? 30,
    androidUpiQrSize:      gs.android?.upi_qr_size_mm        ?? 25,
    androidFeedbackQrSize: gs.android?.feedback_qr_size_mm   ?? 25,
    androidScaleRange:     gs.android?.size_scale_range       ?? [1, 8],
```

### EDIT-2D: `fromAPI` — add `employeeId` field (after line 163 `_raw: deepClone(data),`)

**After line 163, insert:**
```js
    employeeId: String(data.employee_id ?? ''),
```

Result: line 164 becomes `employeeId: String(data.employee_id ?? ''),`

### EDIT-2E: `toAPI` — global_settings write (lines 273-289) + employee_id bind (line 296)

**Replace lines 273-289 (gs.page_margins_mm through gs.qr_size_mm):**
```js
  const gs = style.global_settings;
  gs.font_family = state.fontFamily;
  gs.divider_line_style = state.dividerLineStyle;
  // Windows (primary) + flat (backward compat)
  if (!gs.windows) gs.windows = {};
  gs.windows.page_margins_mm = { top: toNum(state.pageMargins.top), bottom: toNum(state.pageMargins.bottom), left: toNum(state.pageMargins.left), right: toNum(state.pageMargins.right) };
  gs.windows.logo_size_mm    = { width: toNum(state.logoSize.width), height: toNum(state.logoSize.height) };
  gs.windows.qr_size_mm      = { upi: toNum(state.qrSize.upi), feedback: toNum(state.qrSize.feedback) };
  gs.page_margins_mm         = gs.windows.page_margins_mm;   // backward compat
  gs.logo_size_mm            = gs.windows.logo_size_mm;
  gs.qr_size_mm              = gs.windows.qr_size_mm;
  // Android global (scalar int — size_scale_range is read-only, preserved via _raw)
  if (!gs.android) gs.android = {};
  gs.android.logo_size_mm        = toNum(state.androidLogoSize);
  gs.android.upi_qr_size_mm      = toNum(state.androidUpiQrSize);
  gs.android.feedback_qr_size_mm = toNum(state.androidFeedbackQrSize);
```

**Replace line 296 (`employee_id: body.employee_id,`):**
```js
    employee_id: state.employeeId || body.employee_id,  // use state (from dropdown); fall back to raw
```

---

## EDIT-3 — `PrintStyleTab.jsx` — full rewrite

**File:** `/app/frontend/src/components/panels/settings/printerConfig/PrintStyleTab.jsx`

Complete rewrite (157 lines → new version below).
Key changes:
- `RowEditor` accepts `platform` prop; edits only the active platform sub-object
- `StyleAccordion` receives `platform` and passes to `RowEditor`
- `PrintStyleTab` adds `platform` state (windows/android toggle)
- Global settings: Windows card + Android card
- All inputs use allow-empty onChange + blur-clamp pattern (GAP 4 fix)

```jsx
// CR-133-GAP: Print Style tab — Windows/Android split + allow-empty inputs (G4, G5+G6 fix)
import { useState } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { COLORS } from "../../../../constants";
import { SelectInput, SectionTitle } from "../shared";

const humanize = (key) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// G4 fix: allow clearing value to retype; clamp on blur
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

// RowEditor: shows inputs for the active platform sub-object only
const RowEditor = ({ rowKey, row, onChange, platform }) => {
  const isAndroid = platform === 'android';
  const pd = row?.[platform] || {};
  const minV = isAndroid ? 1 : 0;
  const maxV = isAndroid ? 8 : undefined;
  const stepV = isAndroid ? 1 : 0.5;

  const patch = (field, val) => onChange({ ...row, [platform]: { ...(row?.[platform] || {}), [field]: val } });

  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
      <span className="flex-1 text-xs truncate" style={{ color: COLORS.darkText }}>{humanize(rowKey)}</span>
      <StyleInput value={pd.fontSize58 ?? minV} onChange={(v) => patch('fontSize58', v)} min={minV} max={maxV} step={stepV} testId={`style-row-${rowKey}-58mm`} />
      <StyleInput value={pd.fontSize80 ?? minV} onChange={(v) => patch('fontSize80', v)} min={minV} max={maxV} step={stepV} testId={`style-row-${rowKey}-80mm`} />
      <button
        onClick={() => patch('bold', !pd.bold)}
        className="w-8 h-7 text-xs font-bold rounded border"
        style={{
          borderColor: pd.bold ? COLORS.primaryOrange : COLORS.borderGray,
          backgroundColor: pd.bold ? "rgba(242,107,51,0.1)" : "transparent",
          color: pd.bold ? COLORS.primaryOrange : COLORS.grayText,
        }}
        data-testid={`style-row-${rowKey}-bold`}
      >B</button>
    </div>
  );
};

const StyleAccordion = ({ styleKey, style, update, config, platform }) => {
  const [open, setOpen] = useState({});
  return (
    <>
      {Object.entries(style).map(([sectionKey, rows]) => (
        <div key={sectionKey} className="rounded-lg border mb-2" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, [sectionKey]: !p[sectionKey] }))}
            className="w-full flex items-center justify-between px-3 py-2.5"
            data-testid={`style-section-${styleKey}-${sectionKey}`}
          >
            <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>{humanize(sectionKey)}</span>
            {open[sectionKey] ? <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} /> : <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />}
          </button>
          {open[sectionKey] && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 py-1 text-[10px] font-medium" style={{ color: COLORS.grayText }}>
                <span className="flex-1">Field</span>
                <span className="w-16 text-center">58mm</span>
                <span className="w-16 text-center">80mm</span>
                <span className="w-8 text-center">Bold</span>
              </div>
              {Object.entries(rows).map(([rowKey, row]) => (
                <RowEditor
                  key={rowKey}
                  rowKey={rowKey}
                  row={row}
                  platform={platform}
                  onChange={(next) =>
                    update({
                      [styleKey]: {
                        ...config[styleKey],
                        [sectionKey]: { ...config[styleKey][sectionKey], [rowKey]: next },
                      },
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export const PrintStyleTab = ({ config, update }) => {
  const [subTab,   setSubTab]   = useState("bill");
  const [platform, setPlatform] = useState("windows");
  const { options } = config;
  const isAndroid = platform === 'android';

  return (
    <div data-testid="print-style-tab">
      <SectionTitle title="Global Typography" />
      <div className="grid grid-cols-2 gap-3">
        <SelectInput label="Font Family" value={config.fontFamily} onChange={(v) => update({ fontFamily: v })} options={options.fonts.map((f) => ({ value: f, label: f }))} />
        <SelectInput label="Divider Line" value={config.dividerLineStyle} onChange={(v) => update({ dividerLineStyle: v })} options={options.dividerStyles.map((d) => ({ value: d, label: d }))} />
      </div>

      {/* Global sizes — Windows + Android split */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        {/* Windows */}
        <div className="rounded-lg border p-3" style={{ borderColor: COLORS.borderGray, background: "#F9FAFB" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: COLORS.primaryOrange }}>🖥 Windows</div>
          <SectionTitle title="Page Margins (mm)" />
          <div className="grid grid-cols-2 gap-2">
            {["top", "bottom", "left", "right"].map((side) => (
              <div key={side} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: COLORS.grayText }}>{humanize(side)}</span>
                <StyleInput value={config.pageMargins[side]} onChange={(v) => update({ pageMargins: { ...config.pageMargins, [side]: v } })} min={0} step={1} testId={`margin-${side}`} />
              </div>
            ))}
          </div>
          <SectionTitle title="Logo & QR (mm)" />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>Logo W</span><StyleInput value={config.logoSize.width} onChange={(v) => update({ logoSize: { ...config.logoSize, width: v } })} min={0} step={1} testId="logo-w" /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>Logo H</span><StyleInput value={config.logoSize.height} onChange={(v) => update({ logoSize: { ...config.logoSize, height: v } })} min={0} step={1} testId="logo-h" /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>UPI QR</span><StyleInput value={config.qrSize.upi} onChange={(v) => update({ qrSize: { ...config.qrSize, upi: v } })} min={0} step={1} testId="qr-upi" /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>Fdbk QR</span><StyleInput value={config.qrSize.feedback} onChange={(v) => update({ qrSize: { ...config.qrSize, feedback: v } })} min={0} step={1} testId="qr-feedback" /></div>
          </div>
        </div>
        {/* Android */}
        <div className="rounded-lg border p-3" style={{ borderColor: "#86efac", background: "#F0FFF4" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: COLORS.primaryGreen }}>📱 Android</div>
          <div className="text-[10px] mb-3" style={{ color: COLORS.grayText }}>Scale range: 1–{(config.androidScaleRange ?? [1, 8])[1]}</div>
          <div className="space-y-2">
            {[
              { label: 'Logo Size', key: 'androidLogoSize' },
              { label: 'UPI QR',    key: 'androidUpiQrSize' },
              { label: 'Fdbk QR',   key: 'androidFeedbackQrSize' },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: COLORS.grayText }}>{label}</span>
                <StyleInput value={config[key]} onChange={(v) => update({ [key]: v })} min={1} max={(config.androidScaleRange ?? [1, 8])[1]} step={1} testId={`android-${key}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section styles — Bill / KOT × Windows / Android */}
      <SectionTitle title="Section Styles" />

      {/* Bill / KOT toggle */}
      <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }}>
        {[{ id: "bill", label: "Bill" }, { id: "kot", label: "KOT" }].map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md"
            style={{ backgroundColor: subTab === t.id ? "#FFFFFF" : "transparent", color: subTab === t.id ? COLORS.darkText : COLORS.grayText, boxShadow: subTab === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}
            data-testid={`style-subtab-${t.id}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Windows / Android platform toggle */}
      <div className="flex gap-1 mb-3 rounded-lg overflow-hidden border" style={{ borderColor: COLORS.borderGray, width: 'fit-content' }}>
        {[{ id: 'windows', label: '🖥 Windows' }, { id: 'android', label: '📱 Android' }].map((p) => (
          <button key={p.id} onClick={() => setPlatform(p.id)}
            className="px-4 py-1.5 text-xs font-semibold"
            style={{ background: platform === p.id ? COLORS.primaryOrange : '#fff', color: platform === p.id ? '#fff' : COLORS.grayText, border: 'none', cursor: 'pointer' }}
            data-testid={`style-platform-${p.id}`}
          >{p.label}</button>
        ))}
      </div>

      {isAndroid && (
        <div className="text-[10px] px-2 py-1.5 rounded mb-2" style={{ background: '#F0FFF4', color: COLORS.primaryGreen, border: '1px solid #86efac' }}>
          Android scale: 1–{(config.androidScaleRange ?? [1, 8])[1]} · Values are scale multipliers, not pt sizes
        </div>
      )}

      {subTab === "bill" ? (
        <StyleAccordion styleKey="billStyle" style={config.billStyle} update={update} config={config} platform={platform} />
      ) : (
        <StyleAccordion styleKey="kotStyle" style={config.kotStyle} update={update} config={config} platform={platform} />
      )}

      {/* Phase 2/3 coming soon */}
      <div className="p-3 rounded-lg opacity-60 mt-3" style={{ backgroundColor: "#F9FAFB", border: `1px dashed ${COLORS.borderGray}` }} data-testid="style-alignment-coming-soon">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
          <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Coming soon</span>
        </div>
        <p className="text-xs" style={{ color: COLORS.grayText }}>
          Text alignment, section reordering, and live receipt preview.
        </p>
      </div>
    </div>
  );
};
```

---

## EDIT-4 — `printerAgentConfigService.js` — add `getEmployeeList`

**File:** `/app/frontend/src/api/services/printerAgentConfigService.js`

**After line 26 (`};`) insert:**
```js

/**
 * Fetch employee list for printer agent employee dropdown
 * Response: { employees: [{ id, f_name, l_name, status, role:{name} }] }
 * @returns {Promise<Array>} - [{ value: String(id), label: 'f_name (role)' }]
 */
export const getEmployeeList = async () => {
  const res = await api.get(API_ENDPOINTS.EMPLOYEES_LIST);
  return (res.data.employees || [])
    .filter((e) => e.status === 1)
    .map((e) => ({
      value: String(e.id),
      label: `${e.f_name}${e.l_name ? ' ' + e.l_name : ''} (${e.role?.name || ''})`,
    }));
};
```

---

## EDIT-5 — `BillContentTab.jsx` — add employee dropdown

**File:** `/app/frontend/src/components/panels/settings/printerConfig/BillContentTab.jsx`

Full rewrite (add hooks, add employee section at top):

```jsx
// CR-133-GAP: Bill Content tab — +employee dropdown (G3b), footer, QR, display, Windows options
import { useState, useEffect } from "react";
import { Store, Lock } from "lucide-react";
import { COLORS } from "../../../../constants";
import { TextInput, SectionTitle } from "../shared";
import { getEmployeeList } from "../../../../api/services/printerAgentConfigService";

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

export const BillContentTab = ({ config, update }) => {
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);

  useEffect(() => {
    getEmployeeList()
      .then(setEmployees)
      .catch(() => setEmployees([]))
      .finally(() => setEmpLoading(false));
  }, []);

  return (
    <div data-testid="bill-content-tab">

      {/* Employee dropdown — G3b */}
      <SectionTitle title="Printer Agent Employee" />
      <div className="py-2" data-testid="employee-dropdown-section">
        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Employee</label>
        <p className="text-xs mb-2" style={{ color: COLORS.grayText }}>
          The employee identity used by the printer agent for API authentication
        </p>
        {empLoading ? (
          <div className="text-xs" style={{ color: COLORS.grayText }}>Loading employees…</div>
        ) : (
          <select
            value={config.employeeId || ''}
            onChange={(e) => update({ employeeId: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 bg-white"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            data-testid="employee-dropdown"
          >
            <option value="">— Select employee —</option>
            {employees.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Read-only restaurant info banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg mb-4 mt-2" style={{ backgroundColor: "#F9FAFB", border: `1px solid ${COLORS.borderGray}` }} data-testid="restaurant-info-banner">
        <Store className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.grayText }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{config.restaurantInfo.name || "—"}</p>
          <p className="text-xs" style={{ color: COLORS.grayText }}>{config.restaurantInfo.phone || "—"} · Printed on bill header (managed in Restaurant Info)</p>
        </div>
      </div>

      <SectionTitle title="Bill Footer" />
      <TextInput label="Footer Text" value={config.footerText} onChange={(v) => update({ footerText: v })} placeholder="e.g. Thank you, visit again!" />

      <SectionTitle title="QR Codes on Bill" />
      <Toggle label="UPI Payment QR" hint="Show a UPI QR code on printed bills" checked={config.upiQrEnabled} onChange={(v) => update({ upiQrEnabled: v })} testId="upi-qr-toggle" />
      {config.upiQrEnabled && (
        <TextInput label="UPI ID" value={config.upiId} onChange={(v) => update({ upiId: v })} placeholder="yourname@upi" required />
      )}
      <Toggle label="Dynamic UPI QR" hint="QR pre-filled with the exact bill amount" checked={config.upiDynamicEnabled} onChange={(v) => update({ upiDynamicEnabled: v })} testId="upi-dynamic-toggle" />
      <Toggle label="Feedback QR" hint="Show a feedback / review QR code on bills" checked={config.feedbackQrEnabled} onChange={(v) => update({ feedbackQrEnabled: v })} testId="feedback-qr-toggle" />
      {config.feedbackQrEnabled && (
        <TextInput label="Feedback URL" value={config.feedbackQrUrl} onChange={(v) => update({ feedbackQrUrl: v })} placeholder="https://…" required />
      )}

      <SectionTitle title="Display Options" />
      <Toggle label="Show Item Date (80mm)" hint="Print the item date column on 80mm paper" checked={config.showItemDateOn80mm} onChange={(v) => update({ showItemDateOn80mm: v })} testId="show-item-date-toggle" />

      <SectionTitle title="Windows Printing" />
      <Toggle label="Use PDF Printing on Windows" hint="Render prints as PDF on the Windows agent" checked={config.usePdfOnWindows} onChange={(v) => update({ usePdfOnWindows: v })} testId="use-pdf-windows-toggle" />
      {config.usePdfOnWindows && (
        <Toggle label="PDF for Bills Only" hint="KOTs keep using direct (ESC/POS) printing" checked={config.usePdfForBillsOnly} onChange={(v) => update({ usePdfForBillsOnly: v })} testId="use-pdf-bills-only-toggle" />
      )}

      {/* Phase 2/3 — visible-disabled per OD-8 */}
      <SectionTitle title="Field Visibility" />
      <div className="p-3 rounded-lg opacity-60" style={{ backgroundColor: "#F9FAFB", border: `1px dashed ${COLORS.borderGray}` }} data-testid="field-visibility-coming-soon">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
          <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Coming soon</span>
        </div>
        <p className="text-xs" style={{ color: COLORS.grayText }}>
          Choose which fields appear on bills and KOTs (waiter name, customer phone, and more).
        </p>
      </div>
    </div>
  );
};
```

---

## Verification Matrix (V1–V15)

| # | Check | File | How |
|---|---|---|---|
| V1 | Clear "1" in Bill Copies → type "3" → shows "3" | AutoPrintTab via shared.jsx | browser |
| V2 | Click down arrow on "1" → stays 1 (min enforced on blur not keystroke) | shared.jsx | browser |
| V3 | Print style row: clear value → type "8" → shows 8 | PrintStyleTab | browser |
| V4 | Android row: type "9" → blur → clamps to 8 | PrintStyleTab | browser |
| V5 | `normalizeStyle` result: `row.windows.fontSize58` is set | transform | unit test |
| V6 | `applyStyle` writes to `rawRow.windows.font_size_58mm` | transform | unit test |
| V7 | `applyStyle` also writes to flat `rawRow.font_size_58mm` (backward compat) | transform | unit test |
| V8 | `fromAPI` reads `gs.windows.page_margins_mm` preferring windows over flat | transform | unit test |
| V9 | `toAPI` writes `gs.windows.page_margins_mm` | transform | unit test |
| V10 | `fromAPI` maps `employeeId = String(data.employee_id)` | transform | unit test |
| V11 | `toAPI` uses `state.employeeId` for `employee_id` (not body.employee_id) | transform | unit test |
| V12 | Bill Content tab shows employee dropdown | browser |
| V13 | Employee dropdown pre-selects current `config.employeeId` | browser |
| V14 | Print Style tab shows Windows / Android toggle + platform-specific inputs | browser |
| V15 | Save → reload → style change persists (windows sub-object written) | browser + network tab |

---

## Post-Code Registry Checklist

```
□ registry.json: CR-133 gap batch → status IMPLEMENTED
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: 5 files updated with CR-133-GAP + date
□ Code markers: // CR-133-GAP in first line of every modified file
□ Webpack: 0 new errors, 0 new warnings vs current baseline
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `normalizeStyle` shape change breaks existing StyleAccordion rendering | `RowEditor` now reads `row[platform]` — if `row.windows` missing (old config), `pd = {}` → inputs show `minV` defaults safely |
| `toAPI` uses `state.employeeId` but old configs have no employeeId in state | `state.employeeId \|\| body.employee_id` fallback in EDIT-2E line 296 |
| `applyStyle` writes flat backward compat — could overwrite old-agent configs | Intentional — flat and windows always kept in sync |
| Employee list fetch fails | `catch(() => setEmployees([]))` in BillContentTab → dropdown shows empty, no crash |
| Android scale inputs allow empty briefly | `onBlur` enforces min=1 before save fires → POST always sends valid value |

---

## Scope Lock

**WILL change (5 files):**
`shared.jsx`, `printerAgentConfigTransform.js`, `PrintStyleTab.jsx`, `printerAgentConfigService.js`, `BillContentTab.jsx`

**WILL NOT touch:**
`AutoPrintTab.jsx`, `PrintersTab.jsx`, `PrinterAgentConfigView.jsx`, `api/constants.js`, `AggregatorSetupView.jsx`, all R5 hotspots

---

```
Planning complete: CR-133 Gap Batch
Stage: Gate 3 — Implementation Plan COMPLETE
Risk: HIGH
Files: 5 (3 HIGH + 1 MEDIUM + 1 LOW)
Verification matrix: 15 checks (6 automated, 9 browser)
Owner decisions: OD-A → OD-D all locked
Next: Gate 4 GO from owner → Implementation
```
