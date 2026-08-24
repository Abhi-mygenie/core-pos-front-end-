# CR-133 — Gap Batch Impact Analysis (Gate 2 — CLOSED)
**Date:** 2026-08-10
**Closed:** 2026-08-11
**Role:** PLANNING (Gate 2)
**Risk:** HIGH (print style transform broken — write path does not update windows/android sub-objects)
**Sprint:** pos_5_1
**Status:** GATE 2 CLOSED — ALL BLOCKERS RESOLVED — READY FOR GATE 3

---

## Owner Decisions — ALL LOCKED (OD-A → OD-D)

| OD | Question | Answer | Impact |
|---|---|---|---|
| **OD-A** | KDS station in default printer GET response | **(c) Backend issue — VALIDATED FIXED.** Live GET `printers[]` is empty, no KDS present. ✅ | No FE change. Backend confirmed clean. |
| **OD-B** | Aggregator fields (auto_kot, auto_bill, stage) missing from printer UI | **(b) Stay in CR-135 only** — CR-133 amendment (2026-08-10) correct. Transform preserves via `_raw`. | No change to AutoPrintTab. |
| **OD-C** | employee_id — editable dropdown? | **Yes — RESOLVED.** `GET /api/v2/vendoremployee/employee/employees-list` confirmed. Constant `API_ENDPOINTS.EMPLOYEES_LIST` already exists (constants.js L144). Dropdown: `f_name (role.name)`, filter `status=1`, value = `String(id)`. | `BillContentTab.jsx` + service + transform. |
| **OD-D** | Android print style editor | **(a) Same 58mm/80mm inputs, Android constrained to 1–8 scale range** | `RowEditor` platform prop; Android: min=1, max=8, step=1; Windows: min=0, step=0.5. |

---

## Blockers — ALL RESOLVED

| # | Blocker | Status |
|---|---|---|
| B1 | Employee list API endpoint | ✅ RESOLVED — `GET /api/v2/vendoremployee/employee/employees-list` · response `{ employees: [{id, f_name, l_name, status, role:{name}}] }` · constant exists |
| B2 | KDS cleanup in backend default data | ✅ RESOLVED — validated live GET: `printers[]` is empty, no KDS station found |

---

## API Shape — Live GET Confirmed (2026-08-11)

**Critical finding from live curl:** API uses a **hybrid shape** — both old flat fields AND new `windows`/`android` sub-objects exist together on the same row.

```json
"restaurant_name": {
  "font_size_58mm": 11,   ← old flat (still present — backward compat READ)
  "font_size_80mm": 14,
  "bold": "Yes",
  "windows": { "font_size_58mm": 11, "font_size_80mm": 14, "bold": "Yes" },
  "android": { "font_size_58mm": 2,  "font_size_80mm": 2,  "bold": "Yes" }
}
```

`global_settings` — same hybrid pattern:
```json
{
  "page_margins_mm": {...},         ← old flat (still present)
  "logo_size_mm": {...},            ← old flat
  "qr_size_mm": {...},              ← old flat
  "windows": { "page_margins_mm": {...}, "logo_size_mm": {...}, "qr_size_mm": {...} },
  "android":  { "logo_size_mm": 30, "upi_qr_size_mm": 25, "feedback_qr_size_mm": 25, "size_scale_range": [1,8] }
}
```

**Why print style is broken:** Current `normalizeStyle` reads flat `row.font_size_58mm` — this still works for reading. But current `applyStyle` writes ONLY to flat `rawRow.font_size_58mm`. The backend now reads from `rawRow.windows.font_size_58mm` for Windows printing. Flat writes are silently ignored → style changes don't persist → "print style not working."

**Fix approach:** Read from `row.windows` (prefer) with flat fallback. Write to BOTH `rawRow.windows.*` (live) AND `rawRow.font_size_58mm` (backward compat for older agents).

---

## Gap Analysis — 6 Issues (all resolved)

---

### GAP 1 — Bill/KOT copies: value 1 is sticky

**Root cause:** `shared.jsx` `NumberInput`:
```js
onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
```
`parseFloat('') || 0 = 0` → clears to 0 → `Math.max(1, 0) = 1` → snaps back. User cannot clear "1" to type "2".

**Fix — `shared.jsx`:**
```js
// onChange: allow clearing, only fire on valid number
onChange={(e) => {
  const raw = e.target.value;
  if (raw === '') return;
  const n = parseFloat(raw);
  if (Number.isFinite(n)) onChange(n);
}}
// onBlur: enforce min/max when user leaves field
onBlur={(e) => {
  const n = parseFloat(e.target.value);
  if (!Number.isFinite(n) || (min != null && n < min)) onChange(min ?? 0);
  else if (max != null && n > max) onChange(max);
}}
```

---

### GAP 2 — KDS printer in default GET response

**Status: VALIDATED FIXED ✅**
Live GET (2026-08-11): `printers[]` is empty. No KDS station present. Backend confirmed clean.
No FE change needed. Closed.

---

### GAP 3a — Aggregator fields missing from printer UI

**Status: CLOSED BY DESIGN ✅**
OD-B: aggregator auto-print fields live in CR-135 Aggregator Setup OperationalTab only.
Transform `_raw` pass-through preserves them on POST without UI controls.

---

### GAP 3b — employee_id dropdown

**Status: FULLY PLANNED ✅**

**API:** `GET /api/v2/vendoremployee/employee/employees-list`
**Constant:** `API_ENDPOINTS.EMPLOYEES_LIST` — already in constants.js L144, no new constant
**Response:** `{ employees: [{ id, f_name, l_name, status:1, role:{id,name} }] }`

**Transform changes — `printerAgentConfigTransform.js`:**
```js
// fromAPI — add:
employeeId: String(data.employee_id ?? ''),

// toAPI — replace:
employee_id: body.employee_id,     // ← old (_raw pass-through)
// with:
employee_id: state.employeeId,     // ← new (state binding)
```

**Service change — `printerAgentConfigService.js`:**
```js
export const getEmployeeList = async () => {
  const res = await api.get(API_ENDPOINTS.EMPLOYEES_LIST);
  return (res.data.employees || [])
    .filter(e => e.status === 1)
    .map(e => ({
      value: String(e.id),
      label: `${e.f_name}${e.l_name ? ' ' + e.l_name : ''} (${e.role?.name || ''})`,
    }));
};
```

**UI change — `BillContentTab.jsx`:**
- New section "Printer Agent Employee" at top of tab
- `useEffect` on mount → `getEmployeeList()` → populate options
- `<select>` pre-selected to `config.employeeId`
- `onChange` → `update({ employeeId: value })`

---

### GAP 4 — Print style: 0 is sticky

**Root cause:** `PrintStyleTab.jsx` `RowEditor` — same `|| 0` pattern as GAP 1.
```js
onChange={(e) => onChange({ ...row, fontSize58: parseFloat(e.target.value) || 0 })}
```

**Fix — `PrintStyleTab.jsx` RowEditor:**
Replace `|| 0` with allow-empty pattern. Enforce min on blur.
- Windows inputs: `min={0}`, `step={0.5}`
- Android inputs: `min={1}`, `max={8}`, `step={1}`

---

### GAP 5 + GAP 6 — Android style missing + print style broken (CRITICAL)

**Root cause confirmed from live GET:** hybrid API shape. Backend reads from `windows.*` but FE writes only to flat fields.

**`normalizeStyle` fix — prefer `windows`, fallback to flat:**
```js
const normalizeStyle = (styleSection = {}) => {
  const out = {};
  Object.entries(styleSection).forEach(([sectionKey, rows]) => {
    if (!rows || typeof rows !== 'object') return;
    out[sectionKey] = {};
    Object.entries(rows).forEach(([rowKey, row]) => {
      if (!row || typeof row !== 'object') return;
      const w = row.windows || row;          // prefer windows sub-object; fall back to flat
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

**`applyStyle` fix — write to BOTH windows (primary) and flat (backward compat):**
```js
const applyStyle = (rawSection = {}, styleState = {}) => {
  Object.entries(styleState).forEach(([sectionKey, rows]) => {
    const rawRows = rawSection[sectionKey];
    if (!rawRows) return;
    Object.entries(rows).forEach(([rowKey, row]) => {
      const rawRow = rawRows[rowKey];
      if (!rawRow) return;
      // Primary: write to windows sub-object (what backend now reads)
      if (!rawRow.windows) rawRow.windows = {};
      rawRow.windows.font_size_58mm = toNum(row.windows.fontSize58);
      rawRow.windows.font_size_80mm = toNum(row.windows.fontSize80);
      rawRow.windows.bold           = toYesNo(row.windows.bold);
      // Backward compat: keep flat fields in sync
      rawRow.font_size_58mm = rawRow.windows.font_size_58mm;
      rawRow.font_size_80mm = rawRow.windows.font_size_80mm;
      rawRow.bold           = rawRow.windows.bold;
      // Android
      if (!rawRow.android) rawRow.android = {};
      rawRow.android.font_size_58mm = toNum(row.android.fontSize58, 1);
      rawRow.android.font_size_80mm = toNum(row.android.fontSize80, 1);
      rawRow.android.bold           = toYesNo(row.android.bold);
    });
  });
};
```

**`fromAPI` global_settings fix — prefer windows sub-object:**
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
// NEW: Android global settings
androidLogoSize:       gs.android?.logo_size_mm          ?? 30,
androidUpiQrSize:      gs.android?.upi_qr_size_mm        ?? 25,
androidFeedbackQrSize: gs.android?.feedback_qr_size_mm   ?? 25,
androidScaleRange:     gs.android?.size_scale_range       ?? [1, 8],
```

**`toAPI` global_settings fix — write to BOTH windows (primary) + flat (backward compat):**
```js
// Windows (primary)
if (!gs.windows) gs.windows = {};
gs.windows.page_margins_mm = { top: toNum(state.pageMargins.top), bottom: toNum(state.pageMargins.bottom), left: toNum(state.pageMargins.left), right: toNum(state.pageMargins.right) };
gs.windows.logo_size_mm    = { width: toNum(state.logoSize.width), height: toNum(state.logoSize.height) };
gs.windows.qr_size_mm      = { upi: toNum(state.qrSize.upi), feedback: toNum(state.qrSize.feedback) };
// Backward compat flat (for older printer agents)
gs.page_margins_mm = gs.windows.page_margins_mm;
gs.logo_size_mm    = gs.windows.logo_size_mm;
gs.qr_size_mm      = gs.windows.qr_size_mm;
// Android
if (!gs.android) gs.android = {};
gs.android.logo_size_mm        = toNum(state.androidLogoSize);
gs.android.upi_qr_size_mm      = toNum(state.androidUpiQrSize);
gs.android.feedback_qr_size_mm = toNum(state.androidFeedbackQrSize);
// size_scale_range: read-only — preserved via _raw, never overwritten
```

**`PrintStyleTab.jsx` UI fix:**
- `RowEditor` shows Windows + Android sub-editors per row
- Windows: `[58mm] [80mm] [B]` — step=0.5, min=0
- Android: `[58mm] [80mm] [B]` — step=1, min=1, max=8 (scale_range)
- Global settings section splits into Windows card + Android card
- Platform toggle button (Windows / Android) shows which set is active

---

## Files Affected (deduplicated — final)

| File | Change | Risk |
|---|---|---|
| `components/panels/settings/shared.jsx` | Fix `NumberInput`: allow temp empty, enforce min/max on blur | LOW |
| `api/transforms/printerAgentConfigTransform.js` | Fix `normalizeStyle` (prefer windows), `applyStyle` (write windows + flat), `fromAPI` global_settings (prefer windows + android), `toAPI` global_settings (write windows + flat + android), add `employeeId` in fromAPI + bind in toAPI | **HIGH** |
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | `RowEditor`: Windows+Android columns, allow-empty inputs. Global section: split Windows/Android cards. | **HIGH** |
| `api/services/printerAgentConfigService.js` | +`getEmployeeList()` using `API_ENDPOINTS.EMPLOYEES_LIST` | LOW |
| `components/panels/settings/printerConfig/BillContentTab.jsx` | +"Printer Agent Employee" section with dropdown at top of tab | MEDIUM |

**Total: 5 files.**

**NOT touching:** `AutoPrintTab.jsx` (OD-B), `PrintersTab.jsx`, `PrinterAgentConfigView.jsx`, `api/constants.js` (EMPLOYEES_LIST already exists), `AggregatorSetupView.jsx`, all R5 hotspots.

---

## Conflict Pre-Check

| File | Last modifier | Conflict? |
|---|---|---|
| `shared.jsx` | CR-133 IMPL agent 2026-08-07 | None — targeted fix, existing consumers unaffected |
| `printerAgentConfigTransform.js` | CR-133 IMPL agent 2026-08-07 | None — same file, extending existing functions |
| `PrintStyleTab.jsx` | CR-133 IMPL agent 2026-08-07 | None — same file |
| `printerAgentConfigService.js` | CR-133 IMPL agent 2026-08-07 | None — additive |
| `BillContentTab.jsx` | CR-133 IMPL agent 2026-08-07 | None — additive section at top |

---

## Scope Lock

**WILL change:** `shared.jsx`, `printerAgentConfigTransform.js`, `PrintStyleTab.jsx`, `printerAgentConfigService.js`, `BillContentTab.jsx`

**WILL NOT touch:** `AutoPrintTab.jsx`, `PrintersTab.jsx`, `PrinterAgentConfigView.jsx`, `api/constants.js`, `AggregatorSetupView.jsx`, `RestaurantContext.jsx`, all R5 hotspots

---

## Verification Matrix (seeds Gate 5 QA)

| # | Check | How |
|---|---|---|
| V1 | NumberInput: clear "1", type "2" → shows 2, not stuck | browser |
| V2 | NumberInput: try to go below min → snaps to min on blur | browser |
| V3 | Print style 0 row: clear value, type new → works | browser |
| V4 | Android row: values clamped 1–8, cannot enter 0 or 9 | browser |
| V5 | `normalizeStyle` reads `row.windows.font_size_58mm` for Windows rows | unit test |
| V6 | `applyStyle` writes to `rawRow.windows.font_size_58mm` AND `rawRow.font_size_58mm` | unit test |
| V7 | `fromAPI` reads `gs.windows.page_margins_mm` (prefers windows over flat) | unit test |
| V8 | `toAPI` writes `gs.windows.page_margins_mm` AND `gs.page_margins_mm` | unit test |
| V9 | Employee dropdown renders in Bill Content tab | browser |
| V10 | Employee dropdown pre-selects current `employee_id` from saved config | browser |
| V11 | Save → POST sends `employee_id` from selected dropdown value | network tab |
| V12 | Style change → save → reload → style persists (windows sub-object written) | browser + network |
| V13 | Android style values saved and loaded correctly | browser |
| V14 | Aggregator fields NOT in AutoPrintTab (OD-B confirmed) | browser |
| V15 | KDS: printers list has no printer with handled_stations KDS | browser (confirmed via live GET) |

---

## Post-Code Registry Checklist

```
□ registry.json: CR-133 gap batch → status IMPLEMENTED, sprint_key pos_5_1
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: 5 files listed with date
□ Code markers: // CR-133-GAP in every modified file
□ Webpack: 0 new errors vs current baseline
```

---

## Gate 2 Exit Checklist

- [x] 6 gaps identified and root-caused
- [x] All 4 ODs locked (OD-A → OD-D)
- [x] All 2 blockers resolved (B1 employee API, B2 KDS validation)
- [x] API shapes curl-verified (POST curl + live GET)
- [x] Hybrid API shape documented (flat + windows/android both present)
- [x] G2 KDS validated live — confirmed fixed
- [x] File plan clean, deduplicated — 5 files
- [x] Conflict pre-check: none
- [x] Scope lock declared
- [x] Verification matrix: 15 checks
- [x] Design preview built and approved: `/printer-config-preview`
- [x] Impact Analysis document clean and closed

**GATE 2: CLOSED**
**Next: Gate 4 GO from owner → Gate 3 Implementation Plan**
