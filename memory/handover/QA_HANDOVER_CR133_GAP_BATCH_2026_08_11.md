# QA Handover — CR-133 Gap Batch
**Date:** 2026-08-11
**Implementation agent:** CR-133-GAP IMPL
**EXIT GATE:** 5/5 PASS
**Registry:** IMPLEMENTED (Gap Batch) — AWAITING QA

---

## 4. Registry Sync Confirmation
```
Registry synced: YES
CR-133: gate 5, status: IMPLEMENTED (Gap Batch) — AWAITING QA
EXIT GATE: ALL 5 PASSED
```

---

## 1. Files Changed + Self-Test Results

| File | Gap fixed | Self-test |
|---|---|---|
| `shared.jsx` | G1: NumberInput allow-empty + blur clamp | ✅ `|| 0` removed; onChange skips empty; onBlur enforces min/max |
| `printerAgentConfigTransform.js` | G3b + G5+G6: employeeId, normalizeStyle windows, applyStyle windows+flat+android, fromAPI/toAPI global_settings | ✅ Code verified: `row.windows`, `rawRow.windows`, `gs.windows.*`, `state.employeeId` |
| `PrintStyleTab.jsx` | G4 + G5+G6: allow-empty StyleInput, platform toggle, Windows+Android split | ✅ Compiles; `StyleInput` uses allow-empty pattern; `platform` state wired through |
| `printerAgentConfigService.js` | G3b: `getEmployeeList()` added | ✅ Filters `status=1`, maps to `{value, label}` |
| `BillContentTab.jsx` | G3b: employee dropdown with `useEffect` fetch + `config.employeeId` pre-select | ✅ `useState`+`useEffect` hooks present; `data-testid="employee-dropdown"` |

---

## 2. Test Cases for QA Agent

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| T1 | Bill Copies: clear → retype | Open Auto-Print. Clear "1" in Bill Copies. Type "3". | Shows "3" during typing. Does NOT snap back to 1. | `input-bill-copies` |
| T2 | Bill Copies: blur below min | Clear Bill Copies. Blur (click away). | Snaps to 1 (min enforced on blur). | `input-bill-copies` |
| T3 | KOT Copies: same behaviour | Same as T1/T2 for KOT Copies. | Same. | `input-kot-copies` |
| T4 | Print Style: clear → retype | Open Print Style. Expand Restaurant Header. Clear a 58mm value. Type "9". | Shows "9". Does NOT snap to 0. | `style-row-restaurant_name-58mm` |
| T5 | Android scale clamp | Switch to Android. Type "9" in a row. Blur. | Clamps to 8 (maxScale=8). | `style-row-restaurant_name-58mm` |
| T6 | Platform toggle renders | Open Print Style tab. Click "📱 Android" toggle. | Column headers stay (Field/58mm/80mm/Bold). Android note "Scale range: 1–8" appears. | `style-platform-android` |
| T7 | Windows values different from Android | Open Restaurant Header. Compare Windows 58mm vs Android 58mm values. | Windows shows pt size (e.g. 11); Android shows scale (e.g. 2). Different values. | `style-row-restaurant_name-58mm` |
| T8 | Windows global card renders | Print Style tab → Global Typography. | Windows card shows margins + logo + QR size inputs. | `margin-top`, `logo-w`, `qr-upi` |
| T9 | Android global card renders | Same page. | Android card shows Logo Size + UPI QR + Fdbk QR (1-8 scale) + "Scale range: 1–8". | `android-androidLogoSize` |
| T10 | Employee dropdown renders | Open Bill Content tab. | "Printer Agent Employee" section at top. Dropdown shows employees e.g. "PA (Owner)". | `employee-dropdown` |
| T11 | Employee pre-select | Open Bill Content with saved `employeeId = "3631"`. | Dropdown pre-selects "p (All Modules)". | `employee-dropdown` |
| T12 | Employee save | Select different employee. Click Save Changes. | POST body includes `employee_id: "<selected_id>"` (network tab). | `employee-dropdown` |
| T13 | Style save persists | Change a style value on Windows. Save. Reload. | Value persists — confirming `windows.font_size_58mm` written + read. | (network tab) |
| T14 | No aggregator in AutoPrint | Open Auto-Print tab. | No auto-KOT / auto-bill section for aggregator. Banner points to Aggregator Setup. | (absent) |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | AutoPrintTab: Bill/KOT copies still show correctly | `shared.jsx` NumberInput changed — verify copies still read from config |
| R2 | `normalizeStyle` fallback: old configs with flat-only rows still load | `w = row.windows \|\| row` fallback; old rows with no `.windows` key still map to `{fontSize58: X}` |
| R3 | `applyStyle` backward compat: flat fields stay in sync | POST body has both `font_size_58mm` (flat) and `windows.font_size_58mm` updated |
| R4 | Printer tab, Bill Content non-employee fields unaffected | `BillContentTab` rewrite preserved all existing toggles/inputs |
| R5 | `getEmployeeList` 401 on unauthenticated | Expected — returns empty array gracefully (`catch(() => setEmployees([]))`) |

---

## 5. Credentials + Environment

- Preprod URL: https://preprod.mygenie.online
- Auth: Firebase login (restaurant 675 or 478)
- Navigate to Settings → Printers to reach the 4-tab screen
- Bill Content tab → employee dropdown requires `GET /employee/employees-list` → valid token needed
- Print Style tab → all interactions local state (no API call for rendering)
- Token in test: use live login for G3b employee list test
