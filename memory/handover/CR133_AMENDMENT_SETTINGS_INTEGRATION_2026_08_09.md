# CR-133 Amendment — Settings-List Field Integration
**Date:** 2026-08-09
**Raised by:** CR-132 Planning session (screen architecture review)
**Status:** AMENDMENT — awaiting Gate 4 GO from owner
**Parent doc:** `change_requests/CR-133_PRINTER_AGENT_CONFIG_IMPACT_ANALYSIS.md`

---

## Context

During CR-132 (Restaurant Settings Wizard redesign) planning, a cross-CR analysis revealed:
1. Several fields in `settings-list` API (`basic{}` / `advanced{}`) **duplicate** fields already managed by CR-133's `printer-agent-config` endpoint
2. Four fields in `settings-list` have **no equivalent** in `printer-agent-config` but logically belong there

**Decision (2026-08-09):** All printer settings consolidate under CR-133. The wizard (CR-132) will embed the PrinterAgentConfigView component as Screen 2 — no duplicate form.

---

## Section A — Duplicate Fields (Owner Must Confirm)

These fields exist in **BOTH** `settings-list` and `printer-agent-config`. Currently both endpoints are saved independently — last write wins, creating silent data conflict.

**Owner discussion needed before implementation:**

| # | Field in `settings-list` | Equivalent in `printer-agent-config` | Question for owner/backend |
|---|---|---|---|
| D1 | `basic.no_of_bill` (string "1"/"2"/"3") | `settings_config.print_copies.bill_copy_count` (int) | Are these the same setting? If YES → remove from `update-settings` payload, read/write via `printer-agent-config` only |
| D2 | `basic.no_of_kot` (string "1"/"2"/"3") | `settings_config.print_copies.kot_copy_count` (int) | Same question |
| D3 | `advanced.billing_auto_bill_print` ("Yes"/"No") | `settings_config.auto_printing.auto_print_bill` ("Yes"/"No") | Are these the same? |
| D4 | `advanced.print_kot` ("Yes"/"No") | `settings_config.auto_printing.auto_print_kot` ("Yes"/"No") | Are these the same? |
| D5 | `basic.aggregator_auto_kot` ("Yes"/"No") | `settings_config.auto_printing.aggregator_auto_kot` ("Yes"/"No") | Are these the same? |
| D6 | `basic.aggregator_auto_bill` ("Yes"/"No") | `settings_config.auto_printing.aggregator_auto_bill` ("Yes"/"No") | Are these the same? |
| D7 | `basic.aggregator_auto_bill_stage` (string) | `settings_config.auto_printing.aggregator_auto_bill_stage` (string) | Are these the same? |

**Suggested resolution (pending owner/backend confirmation):**
- If SAME → stop sending duplicates from `update-settings`. CR-133 is single source of truth.
- If DIFFERENT (serve two different systems) → keep both but add a warning note in UI that changes must be made in both places. Document the dependency.

---

## Section B — Fields Only in `settings-list` (Unique, Need Migration)

These 4 fields have no equivalent in `printer-agent-config`. They logically belong in printer settings.

**Proposed: Add to `printer-agent-config` endpoint (backend to confirm feasibility)**

| # | Field | Current location | Proposed destination in CR-133 UI | Tab |
|---|---|---|---|---|
| U1 | `basic.print_bill_customer_copy` | settings-list | Print Customer Bill Copy toggle | Auto Print tab |
| U2 | `basic.printing_in_kds` | settings-list | Print in KDS toggle | Auto Print tab |
| U3 | `basic.use_token` | settings-list | Token Number on KOT/Bill toggle | Print Settings tab |
| U4 | `basic.kot_language` | settings-list | KOT Language select (English/Hindi) | Print Settings tab |

**If backend adds these 4 to `printer-agent-config` endpoint:**
- CR-133 transform: add `use_token` → `useToken`, `kot_language` → `kotLanguage`, `print_bill_customer_copy` → `printBillCustomerCopy`, `printing_in_kds` → `printingInKds`
- CR-133 UI: add 3 toggles + 1 SelectInput to appropriate tabs
- CR-132 wizard: remove these 4 fields from `update-settings` payload

**If backend CANNOT move these 4 fields:**
- These 4 remain in CR-132 wizard (Screen 2 thin section alongside embedded PrinterAgentConfigView)
- Document the split clearly

---

## Section C — Implementation Changes Required in CR-133

### C1. `printerAgentConfigTransform.js` — if U1-U4 added to endpoint

**fromAPI() additions:**
```js
// Print Settings tab additions
useToken:               toBool(data.settings_config.print_settings?.use_token),
kotLanguage:            data.settings_config.print_settings?.kot_language || 'English',
printBillCustomerCopy:  toBool(data.settings_config.auto_printing?.print_bill_customer_copy),
printingInKds:          toBool(data.settings_config.auto_printing?.printing_in_kds),
```

**toAPI() additions:**
```js
// Inside settings_config.auto_printing:
print_bill_customer_copy: toYesNo(state.printBillCustomerCopy),
printing_in_kds:          toYesNo(state.printingInKds),

// Inside settings_config.print_settings (new section or existing):
use_token:    toYesNo(state.useToken),
kot_language: state.kotLanguage,
```

### C2. `AutoPrintTab.jsx` — 2 new toggles
```
Auto Print tab additions:
  Print Customer Bill Copy  [toggle]  hint: "Print a copy for customer"
  Print in KDS              [toggle]  hint: "Send print jobs to Kitchen Display"
```

### C3. `PrintersTab.jsx` or new `PrintSettingsTab.jsx` — 2 new fields
```
  Token Number on KOT/Bill  [toggle]  hint: "Show token number on all prints"
  KOT Language              [select]  options: English / Hindi
```

### C4. `ListFormViews.jsx` — remove duplicate fields from `update-settings` call
Once backend confirms D1-D7 are duplicates:
- Stop including `no_of_bill`, `no_of_kot`, `billing_auto_bill_print`, `print_kot`,
  `aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage` in `restaurantSettingsTransform.toAPI()`
- These will be exclusively managed by `printer-agent-config`

---

## Section D — Wizard Integration (CR-132 Screen 2)

Once CR-133 amendment is complete, CR-132 Screen 2 renders:

```jsx
// RestaurantSettingsPage.jsx — Screen 2 (Printer Setup)
{currentStep === 2 && (
  <PrinterAgentConfigView
    wizardMode={true}        // hides Settings panel chrome, shows wizard nav instead
    onComplete={handleNext}  // triggers wizard save & continue
  />
)}
```

`PrinterAgentConfigView` needs one new prop: `wizardMode` — when true:
- Hides the "Settings Panel" surrounding chrome
- Bottom bar shows "Save & Continue" instead of "Save Changes"
- No tile navigation visible

---

## Owner Discussion Points (Must resolve before Gate 4 GO)

1. **D1-D7 duplicates** — Same setting or different? Backend must confirm.
2. **U1-U4 migration** — Can backend add these 4 fields to `printer-agent-config` endpoint?
3. **Wizard embed** — Confirm `wizardMode` prop approach for PrinterAgentConfigView is acceptable UX
4. **CR-133 delete bug** — Backend deep-merge ignores printer deletion (open item from QA). Resolve before wizard integration — broken delete in step 2 would confuse first-time setup.

---

## Files Affected (CR-133 Amendment)

| File | Change | Condition |
|---|---|---|
| `printerAgentConfigTransform.js` | +4 field mappings | If backend adds U1-U4 |
| `AutoPrintTab.jsx` | +2 toggles | If backend adds U1-U4 |
| `PrintersTab.jsx` or new tab | +1 toggle + 1 select | If backend adds U1-U4 |
| `restaurantSettingsTransform.js` | Remove D1-D7 from toAPI | If backend confirms D1-D7 are duplicates |
| `PrinterAgentConfigView.jsx` | Add `wizardMode` prop | For CR-132 wizard embed |

---

## Status
- Gate: **AMENDMENT — pending owner/backend OD confirmation**
- Blocking: CR-132 Screen 2 (Printer Setup) cannot be designed/implemented until D1-D7 and U1-U4 resolved
- CR-133 core (as-implemented): Gate 5 PASS — QA passed 2026-08-07, awaiting owner Gate 6 smoke
