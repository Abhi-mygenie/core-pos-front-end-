# CR-359 — Implementation Plan (Gate 3)

**ID:** CR-359
**Date:** 2026-09-02
**Agent:** PLANNING (Gate 3)
**Status:** GATE 3 COMPLETE — AWAITING GATE 4 GO
**Owner decisions locked:** OD-3 = Load button (B) · OD-4 = Yes (profile re-fetch after save)

---

## Owner Decisions Locked

| ID | Decision |
|----|---------|
| OD-3 | **Option B — Keep Load button.** Employee dropdown change clears rows + sets loaded=false. User clicks Load to fire `GET /station-printer-map?vendor_employee_id=<id>`. |
| OD-4 | **Yes.** After successful save, call `getProfile()` + `setRestaurant(fresh.restaurant)`. `RestaurantContext.printerAgents` updates mid-session. Same pattern as BUG-337. |

---

## Scope Lock (FINAL)

**Files WILL change (3):**
- `src/api/constants.js`
- `src/api/services/printerMappingService.js`
- `src/components/panels/settings/printerConfig/StationMappingTab.jsx`

**Files will NOT touch:**
`printerMappingTransform.js` · `PrinterMappingTab.jsx` · `PrinterAgentConfigView.jsx` · `printerAgentSelector.js` · `profileTransform.js` · `orderService.js` · `RestaurantContext.jsx` · `App.js` · `Sidebar.jsx`

---

## Edit 1 — `src/api/constants.js` (additive, 1 line)

**Location:** Line 118, after `PRINTER_MAPPING`

**Current (line 118):**
```js
PRINTER_MAPPING: '/api/v2/vendoremployee/restaurant-settings/printer-mapping',  // CR-160
```

**Insert after line 118:**
```js
STATION_PRINTER_MAP: '/api/v2/vendoremployee/restaurant-settings/station-printer-map', // CR-359
```

**Result (lines 118–119):**
```js
PRINTER_MAPPING:     '/api/v2/vendoremployee/restaurant-settings/printer-mapping',       // CR-160
STATION_PRINTER_MAP: '/api/v2/vendoremployee/restaurant-settings/station-printer-map',   // CR-359
```

**Risk:** LOW — additive, no existing line changed. `PRINTER_MAPPING` untouched.

---

## Edit 2 — `src/api/services/printerMappingService.js` (additive, ~10 lines)

**Location:** Append after line 20 (end of file)

**Current end-of-file (line 20):**
```js
  return res.data;
};
```

**Append:**
```js
// CR-359: Station Printer Map — per-employee area → default_user mapping
export const getStationMap = async (vendorEmployeeId) => {
  const url = vendorEmployeeId
    ? `${API_ENDPOINTS.STATION_PRINTER_MAP}?vendor_employee_id=${vendorEmployeeId}`
    : API_ENDPOINTS.STATION_PRINTER_MAP;
  const res = await api.get(url);
  return res.data.data; // { areas, default_users, all_users, selected_employee_id, mappings }
};

export const saveStationMap = async (payload) => {
  // payload: { vendor_employee_id: number, mappings: [{area_name, default_employee_id}] }
  const res = await api.post(API_ENDPOINTS.STATION_PRINTER_MAP, payload);
  return res.data;
};
```

**Risk:** LOW — additive only. Existing `getMapping`, `saveMapping`, `saveRawMapping` untouched.

---

## Edit 3 — `src/components/panels/settings/printerConfig/StationMappingTab.jsx` (full logic rewrite)

**Current:** 270 lines. Logic built on CR-160 model (`printers[]`, `assignedEmployeeIds`). Wrong endpoint.
**New:** Same visual structure (Load button pattern per OD-3). Logic rewired to new API contract.

### New imports (replace lines 1–7)

**Current:**
```js
// CR-353: Station Mapping Tab — Select Employee → Load → rows (Area + Default User) → Save
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getMapping, saveRawMapping } from "../../../../api/services/printerMappingService";
import { SectionTitle } from "../shared";
```

**New:**
```js
// CR-359: Station Mapping Tab — rewired to /station-printer-map endpoint
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getStationMap, saveStationMap } from "../../../../api/services/printerMappingService";
import { getProfile } from "../../../../api/services/profileService";     // OD-4: profile re-fetch
import { useRestaurant } from "../../../../contexts/RestaurantContext";    // OD-4: update context
import { SectionTitle } from "../shared";
```

### New component body (replace lines 9–269)

```jsx
export const StationMappingTab = () => {
  const { toast } = useToast();
  const { setRestaurant } = useRestaurant();                               // OD-4

  // apiData shape: { areas[], default_users[], all_users[], selected_employee_id, mappings[] }
  const [apiData,       setApiData]       = useState(null);
  const [loading,       setLoading]       = useState(true);  // initial mount load
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [rows,          setRows]          = useState([]);    // [{ areaName, userId }]
  const [loaded,        setLoaded]        = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [loadingRows,   setLoadingRows]   = useState(false);

  // Mount: load employee lists + pre-load default employee's mappings
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStationMap();        // no vendor_employee_id → backend picks first employee
      setApiData(data);
      // Pre-select the employee the backend defaulted to
      if (data.selected_employee_id) {
        setSelectedEmpId(String(data.selected_employee_id));
        setRows((data.mappings || []).map(m => ({
          areaName: m.area_name,
          userId:   String(m.default_employee_id),
        })));
        setLoaded(true);
      }
    } catch (e) {
      toast({ title: "Failed to load station mappings", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Load button: fetch mappings for the selected employee
  const handleLoad = async () => {
    if (!selectedEmpId) {
      toast({ title: "Select an employee first", variant: "destructive" });
      return;
    }
    setLoadingRows(true);
    setLoaded(false);
    try {
      const data = await getStationMap(selectedEmpId);
      setApiData(data);   // refresh areas/default_users in case they drifted
      setRows((data.mappings || []).map(m => ({
        areaName: m.area_name,
        userId:   String(m.default_employee_id),
      })));
      setLoaded(true);
    } catch (e) {
      toast({ title: "Failed to load mappings", variant: "destructive" });
    } finally { setLoadingRows(false); }
  };

  // Save: POST correct payload → re-fetch profile (OD-4)
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveStationMap({
        vendor_employee_id: Number(selectedEmpId),
        mappings: rows
          .filter(r => r.areaName && r.userId)
          .map(r => ({ area_name: r.areaName, default_employee_id: Number(r.userId) })),
      });
      // OD-4: re-fetch profile so RestaurantContext.printerAgents reflects saved mapping immediately
      const fresh = await getProfile();
      setRestaurant(fresh.restaurant);
      toast({ title: "Station mapping saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.response?.data?.message || e.message,
        variant: "destructive",
      });
    } finally { setSaving(false); }
  };

  const addRow    = () => setRows(prev => [...prev, { areaName: '', userId: '' }]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, key, val) =>
    setRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, [key]: val }));

  if (loading) return (
    <div className="flex justify-center py-8" data-testid="sm-loading">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />
    </div>
  );

  return (
    <div data-testid="station-mapping-tab">
      <SectionTitle title="Station → Default User Mapping" />

      {/* ── Select Employee + Load ── */}
      <div className="flex items-end gap-3 mb-5">
        <div className="flex-1">
          <label
            className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: COLORS.grayText }}
          >
            Select Employee
          </label>
          <select
            value={selectedEmpId}
            onChange={e => {
              setSelectedEmpId(e.target.value);
              setLoaded(false);
              setRows([]);
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            data-testid="sm-employee-select"
          >
            <option value="">— Choose employee —</option>
            {(apiData?.all_users || []).map(e => (
              <option key={e.id} value={e.id}>
                {[e.f_name, e.l_name].filter(Boolean).join(' ')}
              </option>
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

      {/* ── Empty state ── */}
      {!loaded && (
        <div
          className="text-center py-9 rounded-lg"
          style={{ background: '#FAFAFA', border: `1px dashed ${COLORS.borderGray}` }}
          data-testid="sm-empty-state"
        >
          <p className="text-sm" style={{ color: COLORS.grayText }}>
            Select an employee and click Load to view their station mappings
          </p>
        </div>
      )}

      {/* ── Loaded rows ── */}
      {loaded && (
        <>
          {/* Column headers */}
          <div
            className="grid gap-3 pb-2 mb-1"
            style={{ gridTemplateColumns: '5fr 4fr 1fr', borderBottom: `1px solid ${COLORS.borderGray}` }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
              Area Name
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                Default User
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: COLORS.lightText }}>
                Fixed Station = Yes only
              </div>
            </div>
            <div />
          </div>

          {/* Row list */}
          <div className="mb-4" data-testid="sm-rows">
            {rows.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: COLORS.grayText }}>
                No mappings. Click Add Mapping to add one.
              </p>
            )}
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid gap-3 items-center py-2"
                style={{ gridTemplateColumns: '5fr 4fr 1fr', borderBottom: `1px solid ${COLORS.borderGray}` }}
                data-testid={`sm-row-${idx}`}
              >
                {/* Area dropdown — from areas[] strings */}
                <select
                  value={row.areaName}
                  onChange={e => updateRow(idx, 'areaName', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border outline-none bg-white"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid={`sm-area-select-${idx}`}
                >
                  <option value="">— Select area —</option>
                  {(apiData?.areas || []).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                {/* Default user dropdown — from default_users[] only (default_user_v2=Yes) */}
                <select
                  value={row.userId}
                  onChange={e => updateRow(idx, 'userId', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border outline-none bg-white"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid={`sm-user-select-${idx}`}
                >
                  <option value="">— Select user —</option>
                  {(apiData?.default_users || []).map(u => (
                    <option key={u.id} value={u.id}>
                      {[u.f_name, u.l_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => removeRow(idx)}
                  className="flex items-center justify-center w-7 h-7 rounded-md mx-auto transition-colors hover:bg-red-50"
                  data-testid={`sm-remove-${idx}`}
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
          >
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:border-orange-400 hover:text-orange-500"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="sm-add-row-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add Mapping
            </button>
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
        </>
      )}
    </div>
  );
};
```

---

## Execution Sequence

```
1. Edit constants.js        → insert STATION_PRINTER_MAP constant
2. Edit printerMappingService.js → append getStationMap + saveStationMap
3. Edit StationMappingTab.jsx    → rewrite imports + component body
4. Compile check            → webpack 0 new warnings
5. Live test on hogwarts    → V1–V11 verification matrix
```

---

## Verification Matrix (inherited from Gate 2, finalised)

| # | Edit | File | Verify | Method |
|---|------|------|--------|--------|
| V1 | STATION_PRINTER_MAP constant added | `constants.js` | `grep STATION_PRINTER_MAP src/api/constants.js` → correct URL | grep |
| V2 | `getStationMap()` calls correct endpoint | `printerMappingService.js` | Network tab → GET `/station-printer-map` on Load click | browser |
| V3 | `saveStationMap()` correct payload shape | `printerMappingService.js` | Network tab → POST body = `{vendor_employee_id, mappings:[{area_name, default_employee_id}]}` | browser |
| V4 | Employee dropdown uses `all_users[]` | `StationMappingTab.jsx` | Open tab → all 7 hogwarts employees shown in dropdown | browser |
| V5 | Default-user dropdown uses `default_users[]` only | `StationMappingTab.jsx` | Add row → second dropdown shows only 6 (not 7) — Pizza La absent | browser |
| V6 | Area dropdown uses `areas[]` strings (not printer IDs) | `StationMappingTab.jsx` | Add row → area select shows BAR / Bill / KDS / Pizza | browser |
| V7 | Load fetches per-employee mappings correctly | `StationMappingTab.jsx` | Select emp 2819 → Load → 3 rows pre-populated (BAR/Bill/KDS) | browser |
| V8 | Old PRINTER_MAPPING endpoint NOT called by StationMappingTab | `StationMappingTab.jsx` | Network tab → no request to `/printer-mapping` when on Station Mapping tab | browser |
| V9 | OD-4: profile re-fetched after save | `StationMappingTab.jsx` | Save → Network tab shows `GET /profile` call after POST | browser |
| V10 | PrinterMappingTab still uses `/printer-mapping` (regression) | `PrinterMappingTab.jsx` | Printer Mapping tab → Network → still calls `/printer-mapping` | browser |
| V11 | Compile: 0 new webpack warnings | ALL | `tail -3 /var/log/supervisor/frontend.out.log` | log |

---

## Post-Code Registry Checklist

```
□ registry.json: CR-359 → status: IMPLEMENTED, gate: 5, sprint_key: pos_5_x
□ CR_REGISTRY.md: CR-359 row → IMPLEMENTED + files list
□ FILE_OWNERSHIP.md: 3 files listed with CR-359 + 2026-09-02
□ Code markers: // CR-359 comment in constants.js, printerMappingService.js, StationMappingTab.jsx
□ Compile check: webpack 0 new warnings
```

---

*Gate 3 complete: 2026-09-02 | Planning agent | 3 files, ~100 lines changed | Awaiting Gate 4 GO*
