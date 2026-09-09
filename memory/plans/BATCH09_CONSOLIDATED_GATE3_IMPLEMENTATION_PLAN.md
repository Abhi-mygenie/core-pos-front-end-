# BATCH-09 — Consolidated Gate 3 Implementation Plan
# Printer Setup: Local Printer + Printer Agent

**Gate:** 3 — Implementation Plan (consolidated)
**Date:** 2026-08-27
**Role:** PLANNING
**Sprint:** POS 5.x — BATCH-09
**Execution order:** CR-167 → CR-160 → CR-161 → CR-351 → CR-169

---

## Scope Lock

**Files WILL change:**
- `PrintersTab.jsx` (CR-167 rewrite lines 28–192, CR-161 add Printing Mode section)
- `PrinterAgentConfigView.jsx` (CR-160 5th tab, CR-161 6th tab)
- `PrintStyleTab.jsx` (CR-169 replace Coming Soon)
- `api/constants.js` (CR-160 +1, CR-161 +3, CR-351 +1)
- `api/services/printerAgentConfigService.js` (CR-167 +getAreaOptions)
- `api/transforms/printerAgentConfigTransform.js` (CR-167 +areaOptions)
- `LocalPrinterSetupView.jsx` (CR-161 creates, CR-351 adds tabs)

**Files NEW:**
- `printerConfig/PrinterMappingTab.jsx` (CR-160)
- `api/services/printerMappingService.js` (CR-160)
- `api/transforms/printerMappingTransform.js` (CR-160)
- `localPrinter/LocalPrinterSetupView.jsx` (CR-161)
- `localPrinter/StationsTab.jsx` (CR-161)
- `api/services/stationConfigService.js` (CR-161)
- `api/transforms/stationConfigTransform.js` (CR-161)
- `localPrinter/BillContentTab.jsx` (CR-351)
- `localPrinter/BillStyleTab.jsx` (CR-351)
- `api/services/billPrinterConfigService.js` (CR-351)
- `api/transforms/billPrinterConfigTransform.js` (CR-351)
- `printerConfig/PrintPreviewPanel.jsx` (CR-169)

**Files WILL NOT touch:**
- `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx` (R5 hotspots)
- `AutoPrintTab.jsx`, `BillContentTab.jsx` (printerConfig — printer agent version)
- Any report, socket, financial file

---

## ── CR-167: Printer Wizard → Single-Step Form ──────────────────────────────

### Entry Verification
- [ ] `PrintersTab.jsx` lines 28–192 currently contain `PrinterWizard` — confirmed ✅

### E1 — `PrintersTab.jsx`: Replace PrinterWizard with PrinterForm (lines 28–192)

**Replace lines 28–192** (the entire `PrinterWizard` component) with:

```jsx
// CR-167: Single-step inline form — replaces 3-step PrinterWizard
const PrinterForm = ({ printer, isNew, options, onCancel, onDone }) => {
  const { toast } = useToast();
  const [form, setForm] = useState(printer);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const save = () => {
    const errors = validatePrinter(form);
    if (errors.length) {
      toast({ title: "Check printer details", description: errors[0], variant: "destructive" });
      return;
    }
    onDone(form);
  };

  return (
    <div data-testid="printer-form">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100" data-testid="printer-form-close-btn">
          <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </button>
        <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
          {isNew ? "Add Printer" : "Edit Printer"}
        </h3>
      </div>

      {/* Connection type cards */}
      <p className="text-xs mb-2" style={{ color: COLORS.grayText }}>How is this printer connected?</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {options.printerTypes.map((t) => (
          <button
            key={t}
            onClick={() => set("type", t)}
            className="flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center"
            style={{
              borderColor: form.type === t ? COLORS.primaryOrange : COLORS.borderGray,
              backgroundColor: form.type === t ? "rgba(242,107,51,0.05)" : "transparent",
            }}
            data-testid={`printer-type-option-${t.toLowerCase().replace(/[^a-z]+/g, "-")}`}
          >
            {isLan(t) ? <Wifi className="w-4 h-4" style={{ color: COLORS.grayText }} /> : <Printer className="w-4 h-4" style={{ color: COLORS.grayText }} />}
            <span className="text-xs font-medium" style={{ color: form.type === t ? COLORS.primaryOrange : COLORS.darkText }}>{t}</span>
          </button>
        ))}
      </div>

      {/* Printer name */}
      <TextInput label="Printer Name" value={form.label} onChange={(v) => set("label", v)} required placeholder="e.g. Kitchen Printer" />

      {/* USB fields */}
      {isUsb(form.type) && (
        <>
          <TextInput label="USB Printer Name" value={form.usbPrinterName} onChange={(v) => set("usbPrinterName", v)} required placeholder="As shown in system devices" />
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-medium py-1"
            style={{ color: COLORS.primaryOrange }}
            data-testid="printer-advanced-toggle"
          >
            {showAdvanced ? "Hide advanced" : "Show advanced (Vendor / Product ID)"}
          </button>
          {showAdvanced && (
            <>
              <TextInput label="Vendor ID" value={form.vendorId} onChange={(v) => set("vendorId", v)} placeholder="0 (optional)" />
              <TextInput label="Product ID" value={form.productId} onChange={(v) => set("productId", v)} placeholder="0 (optional)" />
            </>
          )}
        </>
      )}

      {/* LAN fields */}
      {isLan(form.type) && (
        <>
          <TextInput label="IP Address" value={form.lanIpAddress} onChange={(v) => set("lanIpAddress", v)} required placeholder="e.g. 192.168.1.50" />
          <TextInput label="Port" value={form.lanPort} onChange={(v) => set("lanPort", v)} required placeholder="9100" />
        </>
      )}

      {/* BLE field */}
      {isBle(form.type) && (
        <TextInput label="Bluetooth MAC Address" value={form.bluetoothMacAddress} onChange={(v) => set("bluetoothMacAddress", v)} required placeholder="AA:BB:CC:DD:EE:FF" />
      )}

      {/* Paper size */}
      <SelectInput
        label="Paper Size"
        value={form.paperSize}
        onChange={(v) => set("paperSize", v)}
        options={options.paperSizes.map((o) => ({ value: o, label: o }))}
      />

      {/* KOT Routing — CR-167: multi-select dropdown from area-options (owner decision 2026-08-18) */}
      <div className="mt-3">
        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
          Kitchen Stations (KOT routing)
        </label>
        <select
          multiple
          value={form.handledStations}
          onChange={(e) => set("handledStations", Array.from(e.target.selectedOptions, o => o.value))}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText, minHeight: 72 }}
          data-testid="printer-stations-multiselect"
        >
          {(options.areaOptions || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <p className="text-[10px] mt-0.5" style={{ color: COLORS.grayText }}>Hold Ctrl/Cmd to select multiple</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {form.handledStations.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(242,107,51,0.1)", color: COLORS.primaryOrange }}
              data-testid={`printer-station-chip-${s.toLowerCase().replace(/\s+/g, "-")}`}>
              {s}
              <button onClick={() => set("handledStations", form.handledStations.filter((x) => x !== s))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Bills toggle */}
      <div className="mt-3">
        <ToggleSwitch label="Prints Bills (customer receipts)" checked={form.handlesBill} onChange={(v) => set("handlesBill", v)} />
      </div>

      {!form.handlesBill && form.handledStations.length === 0 && (
        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#D97706" }} data-testid="printer-orphan-warning">
          <AlertTriangle className="w-3 h-3" /> This printer has no stations and doesn't print bills — it won't be used.
        </p>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border"
          style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
          data-testid="printer-form-cancel-btn"
        >
          Cancel
        </button>
        <button
          onClick={save}
          className="px-5 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="printer-form-save-btn"
        >
          {isNew ? "Add Printer" : "Update Printer"}
        </button>
      </div>
    </div>
  );
};
```

**Also update line 222–223** — change `PrinterWizard` reference to `PrinterForm`:
```jsx
// Line 222 (was): if (wizard) { return <PrinterWizard ...
// Line 222 (new):
  if (wizard) {
    return <PrinterForm printer={wizard.printer} isNew={wizard.isNew} options={options} onCancel={() => setWizard(null)} onDone={handleWizardDone} />;  // CR-167
  }
```

### E2 — `printerAgentConfigService.js`: Add getAreaOptions()

**After line 42** (end of file), add:
```js
// CR-167: area options for KOT routing dropdown in PrinterForm
export const getAreaOptions = async () => {
  const res = await api.get(API_ENDPOINTS.STATION_CONFIG_AREA_OPTIONS);  // CR-161 adds this constant
  return res.data?.data?.options || [];
};
```

### E3 — `printerAgentConfigTransform.js`: Add areaOptions to options

Find the `options:` block in `fromAPI()` (around line 258–259 based on grep):
```js
// ADD areaOptions to options block:
options: {
  paperSizes: [...(sc.paper_settings?.available_options || [])],
  printerTypes: [...(sc.printer_type?.available_options || [])],
  areaOptions: [],   // CR-167: populated separately via getAreaOptions() on PrinterAgentConfigView mount
  ...
}
```

**Note:** `areaOptions` starts empty — populated by a separate `getAreaOptions()` call in `PrinterAgentConfigView.jsx` (or `PrintersTab` on mount). Wire this at Implementation time.

### CR-167 Verification
| # | Check | Method |
|---|---|---|
| V1 | Add Printer opens 1-step form (no "Step X of 3" header) | Browser |
| V2 | Connection type shows as 3 cards at top | Browser |
| V3 | USB/LAN/BLE conditional fields show correctly | Browser |
| V4 | KOT routing shows dropdown populated from area-options | Browser |
| V5 | Add/Edit saves and appears in printer list | Browser DevTools |
| V6 | Cancel/X dismisses form | Browser |

---

## ── CR-160: Printer Mapping Tab ─────────────────────────────────────────────

### E1 — `api/constants.js`: Add PRINTER_MAPPING

**After line 116** (`PRINTER_AGENT_CONFIG`):
```js
  PRINTER_MAPPING: '/api/v2/vendoremployee/restaurant-settings/printer-mapping',  // CR-160
```

### E2 — Create `printerMappingTransform.js`

**New file:** `src/api/transforms/printerMappingTransform.js`
```js
// CR-160: Printer Mapping transform — employee → station assignment
export const fromAPI = (data) => {
  const employees = data.employees || [];
  const employeeMap = {};
  employees.forEach(e => { employeeMap[e.id] = [e.f_name, e.l_name].filter(Boolean).join(' '); });

  const defaultUserIds = new Set((data.default_users || []).map(e => e.id));

  const printers = (data.printers || []).map(p => {
    // CR-160: defensive parse — food court returns JSON string, regular = array
    const rawIds = typeof p.mapped_default_employee_ids === 'string'
      ? JSON.parse(p.mapped_default_employee_ids)
      : (p.mapped_default_employee_ids || []);
    return {
      id: p.id,
      areaName: p.area_name,
      printerName: p.printer_name,
      assignedEmployeeIds: rawIds,
      assignedEmployees: rawIds.map(id => ({ id, name: employeeMap[id] || `Employee ${id}` })),
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
};

export const toAPI = (state) => {
  const fixed_station_v2 = {};
  state.employees.forEach(e => {
    fixed_station_v2[String(e.id)] = state.defaultUserIds.has(e.id) ? 'Yes' : 'No';
  });
  const mappings = {};
  state.printers.forEach(p => { mappings[String(p.id)] = p.assignedEmployeeIds; });
  return { fixed_station_v2, mappings };
};
```

### E3 — Create `printerMappingService.js`

**New file:** `src/api/services/printerMappingService.js`
```js
// CR-160: Printer Mapping Service
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/printerMappingTransform';

export const getMapping = async () => {
  const res = await api.get(API_ENDPOINTS.PRINTER_MAPPING);
  return fromAPI(res.data.data);
};

export const saveMapping = async (state) => {
  const res = await api.post(API_ENDPOINTS.PRINTER_MAPPING, toAPI(state));
  return res.data;
};
```

### E4 — Create `PrinterMappingTab.jsx`

**New file:** `src/components/panels/settings/printerConfig/PrinterMappingTab.jsx`
```jsx
// CR-160: Printer Mapping Tab — employee → printer station assignment
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getMapping, saveMapping } from "../../../../api/services/printerMappingService";
import { SectionTitle } from "../shared";

export const PrinterMappingTab = () => {
  const { toast } = useToast();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setState(await getMapping());
    } catch (e) {
      toast({ title: "Failed to load mappings", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleDefault = (empId) => {
    setState(prev => {
      const next = new Set(prev.defaultUserIds);
      next.has(empId) ? next.delete(empId) : next.add(empId);
      return { ...prev, defaultUserIds: next };
    });
  };

  const setAssigned = (printerId, empId, checked) => {
    setState(prev => ({
      ...prev,
      printers: prev.printers.map(p => p.id !== printerId ? p : {
        ...p,
        assignedEmployeeIds: checked
          ? [...p.assignedEmployeeIds, empId]
          : p.assignedEmployeeIds.filter(id => id !== empId),
      }),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMapping(state);
      toast({ title: "Mapping saved" });
    } catch (e) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} /></div>;
  if (!state) return null;

  return (
    <div data-testid="printer-mapping-tab">
      {/* Default Users */}
      <SectionTitle title="Default Users — Print to All Stations" />
      <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>These employees print to all printers automatically.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {state.employees.map(emp => (
          <button
            key={emp.id}
            onClick={() => toggleDefault(emp.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            style={{
              borderColor: state.defaultUserIds.has(emp.id) ? COLORS.primaryOrange : COLORS.borderGray,
              backgroundColor: state.defaultUserIds.has(emp.id) ? "rgba(242,107,51,0.08)" : "transparent",
              color: state.defaultUserIds.has(emp.id) ? COLORS.primaryOrange : COLORS.darkText,
            }}
            data-testid={`default-user-chip-${emp.id}`}
          >{emp.name}</button>
        ))}
      </div>

      {/* Printer Assignments */}
      <SectionTitle title="Printer Assignments" />
      {state.printers.map(printer => (
        <div key={printer.id} className="rounded-lg border p-3 mb-3" style={{ borderColor: COLORS.borderGray }} data-testid={`printer-mapping-card-${printer.id}`}>
          <div className="text-sm font-semibold mb-2" style={{ color: COLORS.darkText }}>
            {printer.areaName} <span className="text-xs font-normal" style={{ color: COLORS.grayText }}>({printer.printerName})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.employees.map(emp => {
              const assigned = printer.assignedEmployeeIds.includes(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => setAssigned(printer.id, emp.id, !assigned)}
                  className="px-2.5 py-1 text-xs rounded-full border"
                  style={{
                    borderColor: assigned ? COLORS.primaryOrange : COLORS.borderGray,
                    backgroundColor: assigned ? "rgba(242,107,51,0.08)" : "transparent",
                    color: assigned ? COLORS.primaryOrange : COLORS.grayText,
                  }}
                  data-testid={`assign-emp-${emp.id}-printer-${printer.id}`}
                >{emp.name}</button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
        style={{ backgroundColor: COLORS.primaryGreen }}
        data-testid="printer-mapping-save-btn"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saving ? "Saving…" : "Save Mapping"}
      </button>
    </div>
  );
};
```

### E5 — `PrinterAgentConfigView.jsx`: Add 5th tab (Printer Mapping)

**Line 11** (after `import { PrintStyleTab }...`), add:
```js
import { PrinterMappingTab } from "./PrinterMappingTab";  // CR-160
```

**Lines 13-18** (TABS constant), add 5th entry:
```js
const TABS = [
  { id: "printers",  label: "Printers" },
  { id: "autoprint", label: "Auto Print" },
  { id: "content",   label: "Bill Content" },
  { id: "style",     label: "Print Style" },
  { id: "mapping",   label: "Printer Mapping" },  // CR-160
];
```

**Line 135** (after `activeTab === "style"` render), add:
```jsx
        {activeTab === "mapping" && <PrinterMappingTab />}  {/* CR-160: own load/save state */}
```

### CR-160 Verification
| # | Check | Method |
|---|---|---|
| V5 | "Printer Mapping" tab appears as 5th in Printer Agent Config | Browser |
| V6 | Printer list loads with employee name chips | Browser |
| V7 | Default Users toggles update correctly | Browser |
| V8 | Save Mapping → POST /printer-mapping | DevTools |
| V9 | Main "Save Changes" does NOT fire when on Mapping tab | Browser |

---

## ── CR-161: Local Printer — Printing Mode + Stations CRUD ───────────────────

### E1 — `api/constants.js`: Add 3 constants

**After the CR-160 PRINTER_MAPPING line** (after line 116+1):
```js
  STATION_CONFIG:              '/api/v2/vendoremployee/restaurant-settings/printer-config',               // CR-161
  STATION_CONFIG_AREA_OPTIONS: '/api/v2/vendoremployee/restaurant-settings/printer-config/area-options',  // CR-161
  PRINTING_OPTION:             '/api/v2/vendoremployee/restaurant-settings/printing-option',              // CR-161
```

### E2 — Create `stationConfigTransform.js`

**New file:** `src/api/transforms/stationConfigTransform.js`
```js
// CR-161: Station Config Transform — local printer stations + printing mode
export const fromAPI = {
  stations(rawList) {
    return (rawList || []).map(s => ({
      id: s.id,
      areaName: s.area_name,
      printerName: s.printer_name || '',      // connection type: usb/bluetooth/wifi
      printerType: s.printer_type || 'online',
      printerPaperRoll: s.printer_paper_roll || 58,
      printerIp: s.printer_ip || '',
      wifiPrinterIp: s.wifi_printer_ip || '',
      wifiPrinterName: s.wifi_printer_name || '',
      vendorId: s.vendor_id || '',
      productId: s.product_id || '',
      defaultStage: s.default,               // null | 1(Ready) | 2(Serve) | 5(Delivered)
      stationGst: s.station_gst || '',
      autoServe: s.auto_serve === 'Yes',
    }));
  },
  areaOptions(raw) {
    return raw?.data?.options || [];
  },
  printingOption(raw) {
    return {
      mode: raw.printing_option || 'Fixed',
      employeeId: raw.employee_id || null,
      employees: (raw.employees || []).map(e => ({
        id: e.id,
        name: [e.f_name, e.l_name].filter(Boolean).join(' '),
        fixedStation: e.fixed_station === 'Yes',
      })),
    };
  },
};

export const toAPI = {
  station(form, isNew, restaurantFor) {
    const payload = {
      area_name:         form.areaName,
      printer_name:      form.printerName,
      printer_type:      form.printerType,
      printer_ip:        form.printerIp || null,
      printer_paper_roll: form.printerPaperRoll,
      wifi_printer_ip:   form.wifiPrinterIp || null,
      wifi_printer_name: form.wifiPrinterName || null,
      vendor_id:         form.vendorId || null,
      product_id:        form.productId || null,
      default:           form.defaultStage,
      auto_serve:        form.autoServe ? 'Yes' : 'No',
      station_gst:       restaurantFor === 'food_court' ? (form.stationGst || null) : null,
    };
    if (!isNew) payload.id = form.id;
    return payload;
  },
  printingOption(mode, employeeId, restaurantId) {
    const payload = { restaurant_id: restaurantId, printing_option: mode };
    if (mode === 'Fixed' && employeeId) payload.employee_id = employeeId;
    return payload;
  },
};
```

### E3 — Create `stationConfigService.js`

**New file:** `src/api/services/stationConfigService.js`
```js
// CR-161: Station Config Service — local printer path
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/stationConfigTransform';

export const getStations = async () => {
  const res = await api.get(API_ENDPOINTS.STATION_CONFIG);
  return fromAPI.stations(res.data?.data?.printers || []);
};

export const getAreaOptions = async () => {
  const res = await api.get(API_ENDPOINTS.STATION_CONFIG_AREA_OPTIONS);
  return fromAPI.areaOptions(res.data);
};

export const addStation = async (form, restaurantFor) => {
  const res = await api.post(API_ENDPOINTS.STATION_CONFIG, toAPI.station(form, true, restaurantFor));
  return res.data;
};

export const updateStation = async (form, restaurantFor) => {
  const res = await api.put(API_ENDPOINTS.STATION_CONFIG, toAPI.station(form, false, restaurantFor));
  return res.data;
};

export const deleteStation = async (id) => {
  const res = await api.delete(`${API_ENDPOINTS.STATION_CONFIG}/${id}`);
  return res.data;
};

export const getPrintingOption = async () => {
  const res = await api.get(API_ENDPOINTS.PRINTING_OPTION);
  return fromAPI.printingOption(res.data);
};

export const updatePrintingOption = async (mode, employeeId, restaurantId) => {
  const res = await api.post(API_ENDPOINTS.PRINTING_OPTION, toAPI.printingOption(mode, employeeId, restaurantId));
  return res.data;
};
```

### E4 — Create `localPrinter/` directory + `StationsTab.jsx`

**New directory:** `src/components/panels/settings/localPrinter/`

**New file:** `src/components/panels/settings/localPrinter/StationsTab.jsx`
```jsx
// CR-161: Local Printer — Stations CRUD + Printing Mode
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, X, ChevronDown } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { useRestaurant } from "../../../../contexts/RestaurantContext";
import {
  getStations, getAreaOptions, addStation, updateStation, deleteStation,
  getPrintingOption, updatePrintingOption,
} from "../../../../api/services/stationConfigService";
import { SectionTitle, SelectInput, TextInput, ToggleSwitch } from "../shared";

const STAGE_OPTIONS = [
  { value: '', label: 'None' },
  { value: '1', label: 'Ready' },
  { value: '2', label: 'Serve' },
  { value: '5', label: 'Delivered' },
];

const PRINTER_TYPES = ['usb', 'bluetooth', 'wifi'];
const PRINTER_MODES = ['online', 'offline'];

const emptyForm = () => ({
  areaName: '', printerName: 'usb', printerType: 'online',
  printerIp: '', wifiPrinterIp: '', wifiPrinterName: '',
  vendorId: '', productId: '', printerPaperRoll: 58,
  defaultStage: null, autoServe: false, stationGst: '',
});

export const StationsTab = () => {
  const { toast } = useToast();
  const { restaurant } = useRestaurant();
  const restaurantFor = restaurant?.settings?.restaurantFor || '';
  const restaurantId = restaurant?.id;

  const [stations, setStations] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);  // null = closed, object = open
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Printing mode state
  const [printMode, setPrintMode] = useState('Fixed');
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [modeSaving, setModeSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stationsData, opts, printingData] = await Promise.all([
        getStations(),
        getAreaOptions(),
        getPrintingOption(),
      ]);
      setStations(stationsData);
      setAreaOptions(opts);
      setPrintMode(printingData.mode);
      setSelectedEmpId(printingData.employeeId);
      setEmployees(printingData.employees);
    } catch (e) {
      toast({ title: "Failed to load printer settings", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const openAdd = () => { setForm(emptyForm()); setIsNew(true); };
  const openEdit = (s) => { setForm({ ...s, defaultStage: s.defaultStage != null ? String(s.defaultStage) : '' }); setIsNew(false); };
  const closeForm = () => setForm(null);

  const handleSave = async () => {
    if (!form.areaName) { toast({ title: "Area Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (isNew) await addStation(form, restaurantFor);
      else await updateStation(form, restaurantFor);
      toast({ title: isNew ? "Station added" : "Station updated" });
      closeForm();
      await load();
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStation(id);
      toast({ title: "Station deleted" });
      setDeletingId(null);
      await load();
    } catch (e) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleModeChange = async (mode) => {
    setPrintMode(mode);
    setModeSaving(true);
    try {
      await updatePrintingOption(mode, mode === 'Fixed' ? selectedEmpId : null, restaurantId);
      toast({ title: "Printing mode updated" });
    } catch (e) {
      toast({ title: "Failed to save mode", variant: "destructive" });
    } finally { setModeSaving(false); }
  };

  const handleEmpSelect = async (empId) => {
    setSelectedEmpId(empId);
    setModeSaving(true);
    try {
      await updatePrintingOption('Fixed', empId, restaurantId);
      toast({ title: "Fixed station updated" });
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally { setModeSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} /></div>;

  return (
    <div data-testid="stations-tab">

      {/* Printing Mode */}
      <SectionTitle title="Printing Mode" />
      <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>How should the POS route print jobs when placing orders?</p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {['Fixed', 'Waiter', 'Station'].map(mode => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            disabled={modeSaving}
            className="p-2.5 rounded-lg border text-left"
            style={{
              borderColor: printMode === mode ? COLORS.primaryOrange : COLORS.borderGray,
              backgroundColor: printMode === mode ? "rgba(242,107,51,0.05)" : "transparent",
            }}
            data-testid={`printing-mode-${mode.toLowerCase()}`}
          >
            <div className="text-xs font-semibold" style={{ color: printMode === mode ? COLORS.primaryOrange : COLORS.darkText }}>{mode}</div>
            <div className="text-[10px] mt-0.5" style={{ color: COLORS.grayText }}>
              {mode === 'Fixed' ? 'One dedicated printer' : mode === 'Waiter' ? 'Route by serving waiter' : 'Route by kitchen station'}
            </div>
          </button>
        ))}
      </div>

      {/* CR-161: Employee picker — shown only when Fixed is selected */}
      {printMode === 'Fixed' && employees.length > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: "rgba(242,107,51,0.25)", backgroundColor: "rgba(242,107,51,0.02)" }} data-testid="fixed-station-employee-picker">
          <div className="text-xs font-semibold mb-1" style={{ color: COLORS.primaryOrange }}>Fixed Station Employee</div>
          <p className="text-[10px] mb-2" style={{ color: COLORS.grayText }}>Which employee handles all fixed station orders?</p>
          <div className="flex flex-wrap gap-2">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => handleEmpSelect(emp.id)}
                disabled={modeSaving}
                className="px-3 py-1 text-xs rounded-full border"
                style={{
                  borderColor: selectedEmpId === emp.id ? COLORS.primaryOrange : COLORS.borderGray,
                  backgroundColor: selectedEmpId === emp.id ? "rgba(242,107,51,0.08)" : "transparent",
                  color: selectedEmpId === emp.id ? COLORS.primaryOrange : COLORS.darkText,
                }}
                data-testid={`employee-chip-${emp.id}`}
              >{emp.name}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 1, background: COLORS.borderGray, margin: '14px 0' }} />

      {/* Stations table */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>Printers ({stations.length})</h3>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="btn-add-printer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Printer
        </button>
      </div>

      {stations.length > 0 && (
        <table className="w-full text-xs border-collapse" data-testid="stations-table">
          <thead>
            <tr style={{ backgroundColor: "#FAFAFA" }}>
              {['Area', 'Type', 'Printer Name', 'IP / MAC', 'WiFi IP', 'Paper', 'Default', 'Auto Serve', 'Actions'].map(h => (
                <th key={h} className="text-left px-2 py-1.5 border-b font-semibold text-[10px] uppercase tracking-wide" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stations.map(s => (
              <tr key={s.id} className="border-b" style={{ borderColor: "#F9FAFB" }} data-testid={`station-row-${s.id}`}>
                <td className="px-2 py-2" style={{ color: COLORS.darkText }}>{s.areaName}</td>
                <td className="px-2 py-2"><span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: "rgba(242,107,51,0.1)", color: COLORS.primaryOrange }}>{s.printerName}</span></td>
                <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.wifiPrinterName || '—'}</td>
                <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.printerIp || '—'}</td>
                <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.wifiPrinterIp || '—'}</td>
                <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.printerPaperRoll}mm</td>
                <td className="px-2 py-2"><span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "#F3F4F6", color: COLORS.grayText }}>{STAGE_OPTIONS.find(o => o.value === String(s.defaultStage ?? ''))?.label || 'None'}</span></td>
                <td className="px-2 py-2" style={{ color: s.autoServe ? COLORS.primaryGreen : COLORS.grayText }}>{s.autoServe ? 'Yes' : 'No'}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-gray-100" data-testid={`btn-edit-${s.id}`}><Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} /></button>
                    <button onClick={() => setDeletingId(s.id)} className="p-1 rounded hover:bg-red-50" data-testid={`btn-delete-${s.id}`}><Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /></button>
                  </div>
                  {deletingId === s.id && (
                    <div className="absolute z-10 bg-white rounded-lg border shadow p-3 mt-1" style={{ borderColor: "rgba(239,68,68,0.3)" }} data-testid={`delete-confirm-${s.id}`}>
                      <p className="text-xs mb-2" style={{ color: "#EF4444" }}>Delete this station?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: COLORS.borderGray }}>No</button>
                        <button onClick={() => handleDelete(s.id)} className="text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: "#EF4444" }} data-testid={`confirm-delete-${s.id}`}>Yes</button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Inline Add/Edit form */}
      {form && (
        <div className="rounded-lg border p-4 mt-4" style={{ borderColor: "rgba(242,107,51,0.25)", backgroundColor: "#FFFBF5" }} data-testid="station-inline-form">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.primaryOrange }}>{isNew ? 'Add Printer' : 'Edit Printer'}</span>
            <button onClick={closeForm} data-testid="btn-cancel-form"><X className="w-4 h-4" style={{ color: COLORS.grayText }} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Printer For *</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray }} value={form.areaName} onChange={e => set('areaName', e.target.value)} data-testid="input-printer-for">
                <option value="">— Select —</option>
                {areaOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Type *</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray }} value={form.printerName} onChange={e => set('printerName', e.target.value)} data-testid="input-printer-type">
                {PRINTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <TextInput label="Printer Name" value={form.wifiPrinterName} onChange={v => set('wifiPrinterName', v)} placeholder="Device display name" />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Mode</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray }} value={form.printerType} onChange={e => set('printerType', e.target.value)} data-testid="input-printer-mode">
                {PRINTER_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <TextInput label="IP / MAC Address" value={form.printerIp} onChange={v => set('printerIp', v)} placeholder="e.g. 60:6E:41:45:6F:EF" />
            <TextInput label="WiFi Printer IP" value={form.wifiPrinterIp} onChange={v => set('wifiPrinterIp', v)} placeholder="Optional" />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Paper Roll</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray }} value={form.printerPaperRoll} onChange={e => set('printerPaperRoll', Number(e.target.value))} data-testid="input-paper-roll">
                <option value={58}>58mm</option>
                <option value={80}>80mm</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Default</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray }} value={form.defaultStage ?? ''} onChange={e => set('defaultStage', e.target.value === '' ? null : Number(e.target.value))} data-testid="input-default">
                {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <TextInput label="Vendor ID" value={form.vendorId} onChange={v => set('vendorId', v)} placeholder="0" />
            <TextInput label="Product ID" value={form.productId} onChange={v => set('productId', v)} placeholder="0" />
          </div>

          {restaurantFor === 'food_court' && (
            <div className="mt-3">
              <TextInput label="Station GST" value={form.stationGst} onChange={v => set('stationGst', v)} placeholder="GST number" />
            </div>
          )}

          <div className="mt-3">
            <ToggleSwitch label="Auto Serve" checked={form.autoServe} onChange={v => set('autoServe', v)} />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeForm} className="px-4 py-2 text-xs rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }} data-testid="btn-cancel-form-bottom">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: COLORS.primaryGreen }} data-testid="btn-save-printer">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {isNew ? 'Add Printer' : 'Update Printer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

### E5 — Create `LocalPrinterSetupView.jsx`

**New file:** `src/components/panels/settings/localPrinter/LocalPrinterSetupView.jsx`
```jsx
// CR-161: Local Printer Setup — 3-tab container (printer_agent = "No")
import { useState } from "react";
import { COLORS } from "../../../../constants";
import { StationsTab } from "./StationsTab";
// CR-351 imports added when CR-351 is implemented:
// import { BillContentTab } from "./BillContentTab";
// import { BillStyleTab } from "./BillStyleTab";

const TABS = [
  { id: "printers",    label: "Printers" },       // CR-161
  { id: "billcontent", label: "Bill Content" },   // CR-351
  { id: "billstyle",   label: "Bill Style" },     // CR-351
];

export const LocalPrinterSetupView = () => {
  const [activeTab, setActiveTab] = useState("printers");

  return (
    <div className="flex flex-col" data-testid="local-printer-setup">
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: activeTab === t.id ? "#FFFFFF" : "transparent",
              color: activeTab === t.id ? COLORS.darkText : COLORS.grayText,
              boxShadow: activeTab === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
            data-testid={`local-printer-tab-${t.id}`}
          >{t.label}</button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === "printers" && <StationsTab />}
        {/* CR-351: */}
        {/* {activeTab === "billcontent" && <BillContentTab />} */}
        {/* {activeTab === "billstyle" && <BillStyleTab />} */}
        {(activeTab === "billcontent" || activeTab === "billstyle") && (
          <div className="py-8 text-center text-sm" style={{ color: COLORS.grayText }} data-testid="bill-tabs-coming-soon">
            Coming soon — CR-351
          </div>
        )}
      </div>
    </div>
  );
};
```

### E6 — `PrintersTab.jsx`: Add Printing Mode section (AFTER CR-167 lands)

**Note:** This edit touches PrintersTab.jsx which CR-167 already modified. Do this AFTER CR-167 implementation is verified.

At the TOP of `PrintersTab` export function, add the printing mode service import to the existing imports:
```js
// Add to line 7 imports area:
// (stationConfigService is imported in StationsTab.jsx — Printing Mode in PrintersTab for printer agent path)
```

**Inside `PrintersTab` JSX**, before the `{/* Global defaults */}` grid at line 228, add:
```jsx
      {/* CR-161: Printing Mode section — printer agent path */}
      {/* Implementation agent: wire getPrintingOption/updatePrintingOption from stationConfigService here */}
      {/* See StationsTab.jsx for full Printing Mode + employee picker implementation (local printer) */}
```

**Note for implementation agent:** The Printing Mode section in `PrintersTab.jsx` (printer agent path) follows the same pattern as `StationsTab.jsx` but uses the same `stationConfigService`. Wire accordingly, sharing the service.

### CR-161 Verification
| # | Check | Method |
|---|---|---|
| V10 | LocalPrinterSetupView renders 3 tabs | Browser |
| V11 | Stations list loads (GET /printer-config) | Browser |
| V12 | Add station form opens, area-options populate dropdown | Browser |
| V13 | Station GST hidden on regular, visible on food court | Both logins |
| V14 | Printing Mode 3 cards at top | Browser |
| V15 | Fixed → employee picker shows | Browser |
| V16 | Employee with fixed_station:Yes highlighted | Browser |
| V17 | Chip click → POST with employee_id | DevTools |
| V18 | DELETE station → real API call, row disappears | DevTools |

---

## ── CR-351: Local Printer — Bill Content + Bill Style ───────────────────────

### E1 — `api/constants.js`: Add BILL_PRINTER_CONFIG

**After PRINTING_OPTION** (after the CR-161 additions):
```js
  BILL_PRINTER_CONFIG: '/api/v2/vendoremployee/restaurant-settings/bill-printer-config',  // CR-351
```

### E2 — Create `billPrinterConfigTransform.js`

**New file:** `src/api/transforms/billPrinterConfigTransform.js`

See full transform in `/app/memory/impact/CR-351_IMPACT_ANALYSIS.md` §3 — SECTION_KEYS, SECTION_LABELS, fromAPI(), toAPI(), toAPIBasicSettings() — copy verbatim.

### E3 — Create `billPrinterConfigService.js`

**New file:** `src/api/services/billPrinterConfigService.js`
```js
// CR-351: Bill Printer Config Service — local printer bill content + style
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI, toAPIBasicSettings } from '../transforms/billPrinterConfigTransform';

export const getConfig = async () => {
  const res = await api.get(API_ENDPOINTS.BILL_PRINTER_CONFIG);
  return fromAPI(res.data);
};

export const saveConfig = async (state) => {
  const res = await api.post(API_ENDPOINTS.BILL_PRINTER_CONFIG, toAPI(state));
  return res.data;
};

export const saveBasicSettings = async (state) => {
  const formData = new FormData();
  formData.append('data', JSON.stringify(toAPIBasicSettings(state)));
  const res = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
  return res.data;
};
```

### E4 — Create `localPrinter/BillContentTab.jsx`

**New file:** `src/components/panels/settings/localPrinter/BillContentTab.jsx`

Full component spec in `/app/memory/impact/CR-351_IMPACT_ANALYSIS.md` §2 (Bill Content Tab data flow). Key structure:
```jsx
// CR-351: Bill Content Tab — local printer path
// State: printPhone, printEmail, showAddress, dottedLine, totalBold, totalCentered, totalInWords, padding, margin, paperWidth, footerText, configs
// Left panel: 7 toggles (Print Phone/Email/Address, Dotted Line, Total Bold/Centred/Words)
// Right panel: Footer Text input + Padding/Margin/Paper Width number inputs
// Save Bill Content button → saveConfig(state) + saveBasicSettings(state)
```

### E5 — Create `localPrinter/BillStyleTab.jsx`

**New file:** `src/components/panels/settings/localPrinter/BillStyleTab.jsx`

Key structure:
```jsx
// CR-351: Bill Style Tab — local printer path
// Sub-tabs: 2-inch (58mm) | 3-inch (80mm) | Windows
// Table: SECTION | HEIGHT | WIDTH (android only) | BOLD
// 27 rows from SECTION_KEYS + SECTION_LABELS
// Save Bill Style → saveConfig(state) with all 3 configs batch format
```

### E6 — `LocalPrinterSetupView.jsx`: Wire Bill Content + Bill Style tabs

**Replace the CR-351 placeholder comments** with real imports and renders:
```jsx
// Remove "Coming soon" placeholder, replace with:
import { BillContentTab } from "./BillContentTab";   // CR-351
import { BillStyleTab } from "./BillStyleTab";       // CR-351
// ...
{activeTab === "billcontent" && <BillContentTab />}  // CR-351
{activeTab === "billstyle"   && <BillStyleTab />}    // CR-351
```

### CR-351 Verification
| # | Check | Method |
|---|---|---|
| V19 | Bill Content tab loads toggles | Browser |
| V20 | Save → POST /bill-printer-config one call all 3 configs | DevTools |
| V21 | Save → POST /update-settings for show_address + footer | DevTools |
| V22 | Bill Style sub-tabs all load | Browser |
| V23 | Windows tab: no Width column | Browser |
| V24 | Save Bill Style → batch POST format | DevTools |

---

## ── CR-169: Live Bill/KOT Preview in Print Style Tab ───────────────────────

### Entry Verification
- [ ] `PrintStyleTab.jsx` lines 214–223 contain "Coming soon" placeholder — confirmed ✅

### E1 — Create `PrintPreviewPanel.jsx`

**New file:** `src/components/panels/settings/printerConfig/PrintPreviewPanel.jsx`

Full component code in `/app/memory/impact/CR-169_IMPACT_ANALYSIS.md` §4 — copy verbatim.

### E2 — `PrintStyleTab.jsx`: Replace Coming Soon (lines 214–223)

**Replace lines 214–223:**
```jsx
// BEFORE:
      {/* Phase 2/3 — visible-disabled per OD-8 */}
      <div className="p-3 rounded-lg opacity-60 mt-3" ... data-testid="style-alignment-coming-soon">
        ...
      </div>

// AFTER:
      <PrintPreviewPanel config={config} />  {/* CR-169 */}
```

**Add import at line 5** (after existing imports):
```js
import { PrintPreviewPanel } from "./PrintPreviewPanel";  // CR-169
```

### CR-169 Verification
| # | Check | Method |
|---|---|---|
| V25 | Print Style tab shows preview panel (no "Coming soon") | Browser |
| V26 | Bill/KOT toggle + 58mm/80mm toggle work | Browser |
| V27 | Font change in editor updates preview in real time | Browser |
| V28 | No API call when toggling preview options | DevTools |

---

## Post-Code Registry Checklist (ALL CRs)

```
□ registry.json: CR-167, CR-160, CR-161, CR-351, CR-169 → IMPLEMENTED, sprint_key: pos_5_x
□ CR_REGISTRY.md: all rows updated
□ FILE_OWNERSHIP.md: all new + modified files listed
□ Code markers: // CR-167, // CR-160, // CR-161, // CR-351, // CR-169 in every file touched
□ Webpack: 0 new warnings
□ data-testid: all interactive elements
```

---

**Gate 3: COMPLETE**
**Scope locked as above**
**Next: Gate 4 GO (owner approval) → Gate 4 (Implementation)**
