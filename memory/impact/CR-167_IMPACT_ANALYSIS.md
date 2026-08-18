# Impact Analysis — CR-167: Printer Add/Edit Wizard → Single-Step Inline Form

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-18
**Role:** PLANNING
**Sprint:** POS 5.x — BATCH-09

---

## Header

| Field | Value |
|---|---|
| Code Reality | FULL — `PrinterWizard` (lines 28–192, `PrintersTab.jsx`) fully built and working. UX-only rewrite. |
| Conflict Pre-Check | **CONFLICT** — CR-161 also modifies `PrintersTab.jsx` (adds Printing Mode section). **Execute CR-167 FIRST, then CR-161.** |
| Risk | LOW — 1 file, no API change, no financial/order logic, no hotspot files |
| Owner Decisions | All resolved: inline panel (Q5=a), keep radio cards (Q6=a) |

---

## §1 — Data Flow Trace

```
Owner clicks "Add Printer" / Edit pencil icon
  → PrintersTab.jsx: setWizard({ printer, isNew })
  → if (wizard) return <PrinterWizard .../>   ← current: 3-step wizard
  → PROPOSED: if (wizard) return <PrinterForm .../>  ← 1-step form, same mount point

PrinterForm state:
  form (printer object) — same shape as today
  showAdvanced (bool) — USB advanced toggle
  stationInput (string) — station add input
  
  Connection type selected → shows conditional fields (same as step 2 today)
  Stations section visible always (same as step 3 today)
  
  save() → validatePrinter(form) → if errors: toast → else: onDone(form)
  
  onDone(form):
    isNew → update({ printers: [...printers, form] })
    !isNew → update({ printers: printers.map(p => p.id===form.id ? form : p) })
  
  No change to: validatePrinter, newPrinter, handleWizardDone, confirmDelete
  No change to: API call — still goes through PrinterAgentConfigView.jsx handleSave → saveConfig
```

---

## §2 — Affected Files

| File | Change | Lines |
|---|---|---|
| `PrintersTab.jsx` | REWRITE lines 28–192: replace `PrinterWizard` (3-step) with `PrinterForm` (1-step). Remove `step` state, `next()`, `finish()`, Back/Next navigation. Keep all fields, validation logic, `addStation`, `showAdvanced`, `stationInput`. | ~165 lines → ~130 lines |

**Files NOT touched:**
- `PrinterAgentConfigView.jsx` — no tab change
- `printerAgentConfigService.js` — no API change
- `printerAgentConfigTransform.js` — no transform change
- `api/constants.js` — no endpoint change
- Any other file

---

## §3 — PrinterForm Component Design

**Structure (inline, replaces wizard mount point):**

```
[X] Add Printer / Edit Printer        (header with close button, same as today)

Connection Type *                      (radio cards — 3 options, same cards as step 1)
  [USB Printer] [LAN Printer] [Bluetooth (BLE) Printer]

Printer Name *          [____________]  (always visible)

── conditional: USB ──────────────────
USB Printer Name *      [____________]
[Show advanced / Hide advanced]
  Vendor ID             [____________]  (optional)
  Product ID            [____________]  (optional)

── conditional: LAN ──────────────────
IP Address *            [____________]
Port *                  [9100        ]

── conditional: Bluetooth ────────────
MAC Address *           [AA:BB:CC:DD:EE:FF]

Paper Size              [80 mm ▼     ]

Kitchen Stations (KOT routing)
[___________] [Add]
[KDS ✕] [Bar ✕]                       (chips, same as today)
⚠ No stations + no bills warning       (same as today)

Prints Bills (customer receipts)      [toggle]

[Cancel]                    [Add Printer ✓ / Update Printer ✓]
```

---

## §4 — Key Edit Specifications

**Remove from PrinterWizard → not present in PrinterForm:**
```js
const [step, setStep] = useState(1);  // REMOVE
const next = () => { ... };           // REMOVE
const finish = () => { ... };         // RENAME to save()
// "Step {step} of 3" label          // REMOVE
// Back / Next buttons               // REMOVE (single Save button instead)
```

**Keep unchanged:**
```js
const [form, setForm] = useState(printer);
const [showAdvanced, setShowAdvanced] = useState(false);
const [stationInput, setStationInput] = useState("");
const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
const addStation = () => { ... };          // unchanged
validatePrinter(form)                       // unchanged — called once in save()
onDone(form)                               // unchanged
```

**Consolidated save (replaces next+finish):**
```js
const save = () => {
  const errors = validatePrinter(form);
  if (errors.length) {
    toast({ title: "Check printer details", description: errors[0], variant: "destructive" });
    return;
  }
  onDone(form);
};
```

**Connection type cards — render unconditionally at top** (same card JSX as step 1, `printerTypes.map(...)`)

**Conditional field sections — rendered based on `form.type`:**
```jsx
{isUsb(form.type) && <> USB fields </>}
{isLan(form.type) && <> LAN fields </>}
{isBle(form.type) && <> BLE fields </>}
```

---

## §5 — Verification Matrix

| # | Check | Method |
|---|---|---|
| V1 | "Add Printer" opens 1-step form (no "Step X of 3" text) | Browser |
| V2 | Selecting USB shows USB fields only; LAN shows LAN fields only; BLE shows BLE | Browser |
| V3 | Validation fires on Save (empty name → toast error) | Browser |
| V4 | Add printer → appears in printer list immediately | Browser |
| V5 | Edit printer → pre-fills all fields correctly | Browser |
| V6 | Cancel / X dismisses form, no state change | Browser |
| V7 | Save Changes → POST to printer-agent-config → success toast | Browser DevTools |
| V8 | Station add/remove chips work correctly | Browser |
| V9 | Advanced USB fields hidden by default, visible on toggle | Browser |
| V10 | No-station + no-bill warning still appears | Browser |

---

## §6 — Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| Validation fires at wrong time | LOW | `validatePrinter` called once in `save()` — identical to `finish()` in wizard |
| Missing field in form | LOW | All 3 wizard steps' fields are present in single form — verify V2 |
| CR-161 conflict on PrintersTab.jsx | MEDIUM | Execute CR-167 FIRST. CR-161 adds a section ABOVE the printer list; CR-167 rewrites the wizard component. Non-overlapping but same file. |

---

## §7 — Post-Code Registry Checklist

```
□ registry.json: CR-167 → status: IMPLEMENTED, sprint_key: pos_5_x
□ BUG_TRACKER.md / CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: PrintersTab.jsx entry updated
□ Code marker: // CR-167 in PrintersTab.jsx
□ Webpack: 0 new warnings
```

**Impact Analysis: COMPLETE**
**Files WILL change:** `PrintersTab.jsx` (1 file, ~35 lines net reduction)
**Files WILL NOT touch:** All others
**Next:** Gate 3 (Implementation Plan) → Gate 4 GO → Gate 4 (Implementation)
