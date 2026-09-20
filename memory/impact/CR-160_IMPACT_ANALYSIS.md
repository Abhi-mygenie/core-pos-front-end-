# Impact Analysis — CR-160: Printer Mapping (Employee → Printer Assignment)

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-18
**Role:** PLANNING
**Sprint:** POS 5.x — BATCH-09

---

## Header

| Field | Value |
|---|---|
| Code Reality | NONE — no mapping screen, no service, no constants, no transform exists |
| Conflict Pre-Check | `PrinterAgentConfigView.jsx` touched by CR-160, CR-161, CR-167, CR-169. Execute in order: CR-167 → CR-160 → CR-161 → CR-169. CR-160 adds a NEW tab only; no conflict with other files. |
| Risk | HIGH — printer routing affects KOT delivery and bill printing on every order |
| Owner Decisions | All resolved: new tab (Q1=a), per-printer rows with multi-select dropdown (Q2=a) |

---

## §1 — API Contract (Live-Probed 2026-08-18)

### GET — Load current mappings
```
GET /api/v2/vendoremployee/restaurant-settings/printer-mapping
Auth: Bearer <token>

Response shape (confirmed live):
{
  "success": true,
  "data": {
    "restaurant": { "id": 478, "name": "18march" },
    "printers": [
      {
        "id": 485,
        "area_name": "BAR",
        "printer_name": "usb",
        "printer_type": "online",
        "mapped_default_employee_ids": [1478, 2304],   // array on regular restaurant
        // OR: "[2628, 2627]"                           // JSON string on food court
        ...
      }
    ],
    "employees": [
      { "id": 1478, "f_name": "Owner", "l_name": null, "default_user_v2": "Yes" },
      { "id": 2304, "f_name": "Saurav", "l_name": null, "default_user_v2": "Yes" },
      ...  // 33 employees in test restaurant
    ],
    "default_users": [
      { "id": 1478, ... "default_user_v2": "Yes" },
      { "id": 2304, ... "default_user_v2": "Yes" }
    ]
  }
}
```

### POST — Save printer mappings
```
POST /api/v2/vendoremployee/restaurant-settings/printer-mapping
Body:
{
  "fixed_station_v2": {
    "1478": "Yes",    // employeeId → "Yes"|"No"  (marks as default/fixed-station user)
    "2304": "Yes"
  },
  "mappings": {
    "485": [1478, 2304],   // printerId → [employeeIds]
    "486": [1478, 2304],
    "484": [1478, 2304]
  }
}
```

---

## §2 — Data Flow Trace

```
User navigates to Printer Agent Config → "Printer Mapping" tab

Mount:
  printerMappingService.getMapping()
    → GET /printer-mapping
    → printerMappingTransform.fromAPI(response.data)
    → state: { printers[], employees[], defaultUserIds: Set<id> }

Display:
  For each printer in printers[]:
    printer card header: area_name + printer_name
    assigned employees: chips showing employee NAMES (resolved from employees[])
    [Edit assignments] button → opens multi-select dropdown

Edit:
  Multi-select dropdown lists all employees[] with names
  Checked = assigned to this printer
  User changes selection → local state update (not saved yet)

"Default Users" section (above printer list):
  Employees with default_user_v2 = "Yes" shown as toggled on
  Toggle = marks/unmarks as default user (fixed_station_v2)

Save:
  "Save Mapping" button (separate from main config Save Changes)
  → printerMappingTransform.toAPI(state)
  → printerMappingService.saveMapping(payload)
  → POST /printer-mapping
  → success toast / error toast
```

---

## §3 — Transform Logic (Critical Detail)

```js
// printerMappingTransform.js

// ── fromAPI ──────────────────────────────────────────────
fromAPI(data) {
  const employees = data.employees || [];
  const employeeMap = {};
  employees.forEach(e => {
    employeeMap[e.id] = [e.f_name, e.l_name].filter(Boolean).join(' ');
  });

  const defaultUserIds = new Set(
    (data.default_users || []).map(e => e.id)
  );

  const printers = (data.printers || []).map(p => {
    // Defensive parse: food court returns JSON string, regular returns array
    const rawIds = typeof p.mapped_default_employee_ids === 'string'
      ? JSON.parse(p.mapped_default_employee_ids)
      : (p.mapped_default_employee_ids || []);

    return {
      id: p.id,
      areaName: p.area_name,
      printerName: p.printer_name,
      assignedEmployeeIds: rawIds,
      assignedEmployees: rawIds.map(id => ({
        id,
        name: employeeMap[id] || `Employee ${id}`
      })),
    };
  });

  return {
    printers,
    employees: employees.map(e => ({
      id: e.id,
      name: [e.f_name, e.l_name].filter(Boolean).join(' '),
      isDefault: e.default_user_v2 === 'Yes',
    })),
    defaultUserIds,
  };
}

// ── toAPI ────────────────────────────────────────────────
toAPI(state) {
  const fixed_station_v2 = {};
  state.employees.forEach(e => {
    fixed_station_v2[String(e.id)] = state.defaultUserIds.has(e.id) ? 'Yes' : 'No';
  });

  const mappings = {};
  state.printers.forEach(p => {
    mappings[String(p.id)] = p.assignedEmployeeIds;
  });

  return { fixed_station_v2, mappings };
}
```

---

## §4 — Affected Files

| File | Change | Type |
|---|---|---|
| `components/panels/settings/printerConfig/PrinterMappingTab.jsx` | NEW — main mapping screen | NEW (~150 lines) |
| `api/services/printerMappingService.js` | NEW — getMapping() + saveMapping() | NEW (~25 lines) |
| `api/transforms/printerMappingTransform.js` | NEW — fromAPI() + toAPI() with defensive parse | NEW (~60 lines) |
| `api/constants.js` | ADD `PRINTER_MAPPING` endpoint | +1 line |
| `PrinterAgentConfigView.jsx` | ADD 5th tab "Printer Mapping", import + tab render | +5 lines |

**Files NOT touched:**
- `PrintersTab.jsx`, `AutoPrintTab.jsx`, `BillContentTab.jsx`, `PrintStyleTab.jsx`
- `printerAgentConfigService.js`, `printerAgentConfigTransform.js`
- `orderTransform.js`, `printerAgentSelector.js` — order flow untouched

---

## §5 — UI Component Design: PrinterMappingTab

**Layout:**
```
── Default Users ─────────────────────────────────────────
Hint: "Default users print to all printers automatically."
[Owner toggle ON]   [Saurav toggle ON]   [BAR toggle OFF]
  ...employees as toggle chips...

── Printer Assignments ────────────────────────────────────
For each printer:
┌──────────────────────────────────────────────────────┐
│ 🖨 BAR (usb)                                         │
│ Assigned: [Owner ✕] [Saurav ✕]       [+ Add Employees]│
│           multi-select dropdown expands on click      │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ 🖨 Bill (bluetooth)                                  │
│ Assigned: [Owner ✕] [Saurav ✕]       [+ Add Employees]│
└──────────────────────────────────────────────────────┘

[Save Mapping]  (separate from main Save Changes — calls POST /printer-mapping directly)
```

**Multi-select dropdown (when "+ Add Employees" clicked):**
- Lists all `employees[]` with names
- Checkmark next to currently assigned ones
- Search/filter input (since 30+ employees)
- Close on outside click

**Loading state:** spinner while GET in flight
**Save state:** "Saving..." + disabled button
**Toast on success/error** — matches existing pattern

---

## §6 — PrinterAgentConfigView.jsx Changes

**TABS constant — add 5th entry:**
```js
// Before (4 entries):
const TABS = [
  { id: "printers",  label: "Printers" },
  { id: "autoprint", label: "Auto Print" },
  { id: "content",   label: "Bill Content" },
  { id: "style",     label: "Print Style" },
];

// After (CR-160: add Printer Mapping tab):
const TABS = [
  { id: "printers",    label: "Printers" },
  { id: "autoprint",   label: "Auto Print" },
  { id: "content",     label: "Bill Content" },
  { id: "style",       label: "Print Style" },
  { id: "mapping",     label: "Printer Mapping" },  // CR-160
];
```

**Tab render block — add mapping case:**
```jsx
{activeTab === "mapping" && <PrinterMappingTab />}  // CR-160: has own state/load
```

**Important:** `PrinterMappingTab` has its OWN load/save state (separate API). It does NOT use the shared `config` / `update` props from PrinterAgentConfigView. The main "Save Changes" button does NOT save mapping data.

---

## §7 — constants.js Addition

```js
// In API_ENDPOINTS block (after PRINTER_AGENT_CONFIG):
PRINTER_MAPPING: '/api/v2/vendoremployee/restaurant-settings/printer-mapping',  // CR-160
```

---

## §8 — Verification Matrix

| # | Check | Method |
|---|---|---|
| V1 | "Printer Mapping" tab appears as 5th tab | Browser |
| V2 | Tab loads: printer list with employee name chips (not IDs) | Browser |
| V3 | Food court restaurant shows names correctly (JSON string parse) | Browser + food court login |
| V4 | "+ Add Employees" opens multi-select with employee names | Browser |
| V5 | Assigning/removing employees updates chips in real time | Browser |
| V6 | Default Users section: toggle ON marks `fixed_station_v2: "Yes"` in POST | DevTools Network |
| V7 | "Save Mapping" calls POST /printer-mapping with correct payload | DevTools Network |
| V8 | Success toast on save; error toast on failure | Browser |
| V9 | Main "Save Changes" does NOT trigger mapping save | Browser |
| V10 | 30+ employees: search/filter in dropdown works | Browser |

---

## §9 — Risk Register

| Risk | Level | Notes |
|---|---|---|
| `mapped_default_employee_ids` JSON string on food court | HIGH | Handled in transform with defensive parse. Verify on food court test account |
| Employee list scale (30+) | MEDIUM | Multi-select must have search. No checkboxes (UX degradation) |
| Separate save from main config | MEDIUM | PrinterMappingTab must NOT use shared `update` prop; uses its own POST |
| Printer mapping affects KOT routing on every order | HIGH | FE-only save (no order flow files touched). Risk: wrong mapping → wrong printer → orders go to wrong station |

---

## §10 — Post-Code Registry Checklist

```
□ registry.json: CR-160 → IMPLEMENTED
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: new files + PrinterAgentConfigView.jsx entry
□ Code markers: // CR-160 in all 5 files
□ Webpack: 0 new warnings
```

**Impact Analysis: COMPLETE**
**Files WILL change:** `PrinterAgentConfigView.jsx` (+5 lines), `api/constants.js` (+1 line)
**Files NEW:** `PrinterMappingTab.jsx`, `printerMappingService.js`, `printerMappingTransform.js`
**Files WILL NOT touch:** `PrintersTab.jsx`, all order/report/hotspot files
**Next:** Gate 3 (Implementation Plan) after owner reviews
