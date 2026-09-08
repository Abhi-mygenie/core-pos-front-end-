// CR-359: Station Mapping Tab — rewired to /station-printer-map endpoint
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getStationMap, saveStationMap } from "../../../../api/services/printerMappingService";
import { getProfile } from "../../../../api/services/profileService";        // OD-4: profile re-fetch
import { useRestaurant } from "../../../../contexts/RestaurantContext";       // OD-4: update context
import { SectionTitle } from "../shared";

export const StationMappingTab = () => {
  const { toast } = useToast();
  const { setRestaurant } = useRestaurant();                                  // OD-4

  // apiData: { areas[], default_users[], all_users[], selected_employee_id, mappings[] }
  const [apiData,       setApiData]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [rows,          setRows]          = useState([]);   // [{ areaName, userId }]
  const [loaded,        setLoaded]        = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [loadingRows,   setLoadingRows]   = useState(false);

  // Mount: GET without vendor_employee_id → backend returns first employee + their mappings
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStationMap();
      setApiData(data);
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

  // Load button: GET with selected vendor_employee_id
  const handleLoad = async () => {
    if (!selectedEmpId) {
      toast({ title: "Select an employee first", variant: "destructive" });
      return;
    }
    setLoadingRows(true);
    setLoaded(false);
    try {
      const data = await getStationMap(selectedEmpId);
      setApiData(data);
      setRows((data.mappings || []).map(m => ({
        areaName: m.area_name,
        userId:   String(m.default_employee_id),
      })));
      setLoaded(true);
    } catch (e) {
      toast({ title: "Failed to load mappings", variant: "destructive" });
    } finally { setLoadingRows(false); }
  };

  // Save: correct payload shape + OD-4 profile re-fetch
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveStationMap({
        vendor_employee_id: Number(selectedEmpId),
        mappings: rows
          .filter(r => r.areaName && r.userId)
          .map(r => ({ area_name: r.areaName, default_employee_id: Number(r.userId) })),
      });
      // OD-4: re-fetch profile → RestaurantContext.printerAgents reflects new mapping immediately
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
              <div className="text-[10px] mt-0.5" style={{ color: COLORS.grayText, opacity: 0.6 }}>
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
                {/* Area — from areas[] strings, not printer IDs */}
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

                {/* Default user — from default_users[] only (default_user_v2=Yes) */}
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
