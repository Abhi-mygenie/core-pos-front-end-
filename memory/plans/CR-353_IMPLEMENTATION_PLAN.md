# CR-353 IMPLEMENTATION PLAN — Printer Agent: Remove Stations Tab + Build Station Mapping Tab
**Date:** 2026-08-31
**Stage:** Gate 3 — Implementation Plan
**Risk:** MEDIUM | **Files:** 2 modified + 1 created | **Execution Order:** #2 (Part A) + #3 (Part B)

---

## Step 0 — Entry Verification (MANDATORY)

| File | Plan Claim | Verified |
|---|---|---|
| `PrinterAgentConfigView.jsx:13` | `import { StationsTab } from "../localPrinter/StationsTab"` | ✅ |
| `PrinterAgentConfigView.jsx:21` | `{ id: "stations", label: "Stations" },` | ✅ |
| `PrinterAgentConfigView.jsx:141` | `{activeTab === "stations" && <StationsTab />}` | ✅ |
| `printerMappingService.js` | 15 lines, no `saveRawMapping` export | ✅ |
| `StationMappingTab.jsx` | Does not exist | ✅ |

---

## PART A — Remove Stations Tab (Execute first, low risk)

### Edit A1 — Remove StationsTab import
| Field | Value |
|---|---|
| File | `src/components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` |
| Remove | Line 13: `import { StationsTab } from "../localPrinter/StationsTab";  // CR-161` |

### Edit A2 — Update header comment + TABS array
| Field | Value |
|---|---|
| File | `src/components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` |
| Current line 1 | `// CR-133: Printer Agent Config — container view (4 tabs, single shared state, sticky save)` |
| New line 1 | `// CR-133: Printer Agent Config — container view (5 tabs + Station Mapping, single shared state, sticky save)` |
| Current line 21 | `  { id: "stations", label: "Stations" },         // CR-161` |
| New line 21 | `  { id: "stationmapping", label: "Station Mapping" },  // CR-353` |

### Edit A3 — Replace Stations render with StationMappingTab render
| Field | Value |
|---|---|
| File | `src/components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` |
| Current line 141 | `{activeTab === "stations"  && <StationsTab />}         {/* CR-161: own load/save — NOT wired to shared config/update */}` |
| New line 141 | `{activeTab === "stationmapping" && <StationMappingTab />}  {/* CR-353: own load/save — NOT wired to shared config/update */}` |

### Edit A4 — Add StationMappingTab import (after PrinterMappingTab import)
| Field | Value |
|---|---|
| File | `src/components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` |
| After line 12 | Add: `import { StationMappingTab } from "./StationMappingTab";  // CR-353` |

---

## PART B — Build StationMappingTab (Execute after Part A)

### Edit B1 — Add saveRawMapping to printerMappingService.js
| Field | Value |
|---|---|
| File | `src/api/services/printerMappingService.js` |
| Append after line 14 (after saveMapping) | See code below |

```js
// CR-353: raw payload save for StationMappingTab (bypasses existing toAPI transform)
export const saveRawMapping = async (payload) => {
  const res = await api.post(API_ENDPOINTS.PRINTER_MAPPING, payload);
  return res.data;
};
```

### Edit B2 — CREATE StationMappingTab.jsx (new file)
| Field | Value |
|---|---|
| File | `src/components/panels/settings/printerConfig/StationMappingTab.jsx` |
| Action | CREATE — full component below |

```jsx
// CR-353: Station Mapping Tab — Select Employee → Load → rows (Area + Default User) → Save
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getMapping, saveRawMapping } from "../../../../api/services/printerMappingService";
import { SectionTitle } from "../shared";

export const StationMappingTab = () => {
  const { toast } = useToast();
  const [allData,      setAllData]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [selectedEmpId,setSelectedEmpId]= useState('');
  const [rows,         setRows]         = useState([]);
  const [loaded,       setLoaded]       = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [loadingRows,  setLoadingRows]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAllData(await getMapping());
    } catch (e) {
      toast({ title: "Failed to load station mappings", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleLoad = () => {
    if (!selectedEmpId) { toast({ title: "Select an employee first", variant: "destructive" }); return; }
    setLoadingRows(true);
    setTimeout(() => {
      const empPrinters = (allData?.printers || []).filter(p =>
        p.assignedEmployeeIds.includes(Number(selectedEmpId)) ||
        p.assignedEmployeeIds.includes(String(selectedEmpId))
      );
      setRows(empPrinters.map(p => ({ printerId: String(p.id), areaName: p.areaName, userId: String(selectedEmpId) })));
      setLoaded(true);
      setLoadingRows(false);
    }, 300);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const empId    = String(selectedEmpId);
      const pIds     = rows.map(r => Number(r.printerId)).filter(Boolean);
      // Rebuild full mappings: start from existing allData, override selected employee
      const allMappings = {};
      (allData?.employees || []).forEach(e => {
        const eid      = String(e.id);
        const assigned = (allData.printers || [])
          .filter(p => p.assignedEmployeeIds.includes(e.id) || p.assignedEmployeeIds.includes(String(e.id)))
          .map(p => Number(p.id));
        allMappings[eid] = assigned;
      });
      allMappings[empId] = pIds;
      // fixed_station_v2: any printer appearing in any mapping → "Yes"
      const usedPrinterIds = new Set(Object.values(allMappings).flat());
      const fixed_station_v2 = {};
      (allData?.printers || []).forEach(p => {
        fixed_station_v2[String(p.id)] = usedPrinterIds.has(Number(p.id)) ? 'Yes' : 'No';
      });
      await saveRawMapping({ fixed_station_v2, mappings: allMappings });
      toast({ title: "Station mapping saved" });
      await load();
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const addRow    = () => setRows(p => [...p, { printerId: '', areaName: '', userId: String(selectedEmpId) }]);
  const removeRow = (idx) => setRows(p => p.filter((_, i) => i !== idx));
  const updateRow = (idx, key, val) => setRows(p => p.map((r, i) => {
    if (i !== idx) return r;
    if (key === 'printerId') {
      const printer = (allData?.printers || []).find(p => String(p.id) === String(val));
      return { ...r, printerId: val, areaName: printer?.areaName || '' };
    }
    return { ...r, [key]: val };
  }));

  if (loading) return (
    <div className="flex justify-center py-8" data-testid="sm-loading">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />
    </div>
  );

  return (
    <div data-testid="station-mapping-tab">
      <SectionTitle title="Station → Default User Mapping" />

      {/* Select Employee + Load */}
      <div className="flex items-end gap-3 mb-5">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: COLORS.grayText }}>
            Select Employee
          </label>
          <select
            value={selectedEmpId}
            onChange={e => { setSelectedEmpId(e.target.value); setLoaded(false); setRows([]); }}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            data-testid="sm-employee-select"
          >
            <option value="">— Choose employee —</option>
            {(allData?.employees || []).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleLoad}
          disabled={loadingRows || !selectedEmpId}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="sm-load-btn"
        >
          {loadingRows && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Load
        </button>
      </div>

      {/* Empty state */}
      {!loaded && (
        <div className="text-center py-9 rounded-lg" style={{ background: '#FAFAFA', border: `1px dashed ${COLORS.borderGray}` }} data-testid="sm-empty-state">
          <p className="text-sm" style={{ color: COLORS.grayText }}>
            Select an employee and click Load to view their station mappings
          </p>
        </div>
      )}

      {/* Loaded rows */}
      {loaded && (
        <>
          <div className="grid gap-3 pb-2 mb-1" style={{ gridTemplateColumns: '5fr 4fr 1fr', borderBottom: `1px solid ${COLORS.borderGray}` }}>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Area Name</div>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Default User (Fixed Station = Yes)</div>
            <div />
          </div>

          <div className="mb-4" data-testid="sm-rows">
            {rows.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: COLORS.grayText }}>
                No mappings for this employee. Click Add Mapping to add one.
              </p>
            )}
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid gap-3 items-center py-2"
                style={{ gridTemplateColumns: '5fr 4fr 1fr', borderBottom: `1px solid ${COLORS.borderGray}` }}
                data-testid={`sm-row-${idx}`}
              >
                <select
                  value={row.printerId}
                  onChange={e => updateRow(idx, 'printerId', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border outline-none bg-white"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid={`sm-area-select-${idx}`}
                >
                  <option value="">— Select area —</option>
                  {(allData?.printers || []).map(p => (
                    <option key={p.id} value={p.id}>{p.areaName}</option>
                  ))}
                </select>

                <select
                  value={row.userId}
                  onChange={e => updateRow(idx, 'userId', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border outline-none bg-white"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid={`sm-user-select-${idx}`}
                >
                  <option value="">— Select user —</option>
                  {(allData?.employees || []).map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => removeRow(idx)}
                  className="flex items-center justify-center w-7 h-7 rounded-md mx-auto transition-colors hover:bg-red-50"
                  style={{ color: COLORS.grayText }}
                  data-testid={`sm-remove-${idx}`}
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ transition: 'color .15s' }}
                    onMouseOver={e => e.target.style.color='#EF4444'}
                    onMouseOut={e => e.target.style.color=COLORS.grayText}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="sm-add-row-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add Mapping
            </button>
            <div className="flex items-center gap-4">
              <span className="text-xs" style={{ color: COLORS.grayText }} data-testid="sm-status">
                All changes saved
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 transition-colors"
                style={{ backgroundColor: COLORS.primaryGreen }}
                data-testid="sm-save-btn"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Saving…' : 'Save Mapping'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

---

## Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| A1-A4 | Stations removed, Station Mapping added | Printer Agent → no "Stations" tab; "Station Mapping" tab present |
| B1 | saveRawMapping exported | File exists in printerMappingService.js with correct export |
| B2 | Component renders | Navigate to Station Mapping tab → no crash, dropdown shows employees |
| V1 | Stations tab gone from Printer Agent | Click through all tabs — no "Stations" tab |
| V2 | Station Mapping tab in slot 6 | Tab 6 = "Station Mapping" |
| V3 | Employee dropdown loads | allData.employees populates the select |
| V4 | Load shows rows | Select employee, click Load → rows appear (Area + Default User) |
| V5 | Add Mapping | Click Add Mapping → empty row added |
| V6 | Remove row | Click trash → row removed |
| V7 | Save POSTs correct format | Network tab: POST /printer-mapping with `{ fixed_station_v2: {printer_id: "Yes/No"}, mappings: {employee_id: [printer_ids]} }` |
| V8 | Local Printer Stations unaffected | Switch to Local Printer type → Stations tab still present and functional |
| V9 | Other 5 tabs unaffected | Printers / AutoPrint / BillContent / PrintStyle / PrinterMapping all load normally |

---

## Scope Lock
**Files WILL change:** `PrinterAgentConfigView.jsx`, `printerMappingService.js`
**Files WILL be created:** `StationMappingTab.jsx`
**Files will NOT touch:** `PrinterMappingTab.jsx`, `printerMappingTransform.js`, `StationsTab.jsx`, all other tabs

---

## Post-Code Registry Checklist
- [ ] registry.json: CR-353 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: all 3 files listed under CR-353
- [ ] Code markers: `// CR-353` in every modified file
- [ ] Compile check: webpack 0 new warnings
