// CR-161: Local Printer — Stations CRUD + Printing Mode + Fixed employee picker
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { useRestaurant } from "../../../../contexts/RestaurantContext";
import {
  getStations, getAreaOptions, addStation, updateStation, deleteStation,
  getPrintingOption, updatePrintingOption,
} from "../../../../api/services/stationConfigService";
import { SectionTitle, TextInput, ToggleSwitch } from "../shared";

const STAGE_OPTIONS = [
  { value: '',  label: 'None' },
  { value: '1', label: 'Ready' },
  { value: '2', label: 'Serve' },
  { value: '5', label: 'Delivered' },
];

const PRINTER_NAMES  = ['usb', 'bluetooth', 'wifi'];
const PRINTER_TYPES  = ['online', 'offline'];

const emptyForm = () => ({
  areaName: '', printerName: 'usb', printerType: 'online',
  printerIp: '', wifiPrinterIp: '', wifiPrinterName: '',
  vendorId: '', productId: '', printerPaperRoll: 58,
  defaultStage: '', autoServe: false, stationGst: '',
});

export const StationsTab = () => {
  const { toast } = useToast();
  const { restaurant } = useRestaurant();
  const restaurantFor = restaurant?.settings?.restaurantFor || '';
  const restaurantId  = restaurant?.id;

  const [stations,     setStations]     = useState([]);
  const [areaOptions,  setAreaOptions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [form,         setForm]         = useState(null);
  const [isNew,        setIsNew]        = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [deletingId,   setDeletingId]   = useState(null);

  // Printing mode
  const [printMode,     setPrintMode]     = useState('Fixed');
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [employees,     setEmployees]     = useState([]);
  const [modeSaving,    setModeSaving]    = useState(false);

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
  const openAdd  = () => { setForm(emptyForm()); setIsNew(true); };
  const openEdit = (s) => { setForm({ ...s, defaultStage: s.defaultStage != null ? String(s.defaultStage) : '' }); setIsNew(false); };
  const closeForm = () => setForm(null);

  const handleSave = async () => {
    if (!form.areaName) { toast({ title: "Printer For is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (isNew) await addStation(form, restaurantFor);
      else       await updateStation(form, restaurantFor);
      toast({ title: isNew ? "Printer added" : "Printer updated" });
      closeForm();
      await load();
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStation(id);
      toast({ title: "Printer deleted" });
      setDeletingId(null);
      await load();
    } catch (e) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleModeChange = async (mode) => {
    const prev = printMode;
    setPrintMode(mode);
    setModeSaving(true);
    try {
      await updatePrintingOption(mode, mode === 'Fixed' ? selectedEmpId : null, restaurantId);
      toast({ title: "Printing mode updated" });
    } catch (e) {
      setPrintMode(prev);
      toast({ title: "Failed to save mode", variant: "destructive" });
    } finally { setModeSaving(false); }
  };

  const handleEmpSelect = async (empId) => {
    const prev = selectedEmpId;
    setSelectedEmpId(empId);
    setModeSaving(true);
    try {
      await updatePrintingOption('Fixed', empId, restaurantId);
      toast({ title: "Fixed station updated" });
    } catch (e) {
      setSelectedEmpId(prev);
      toast({ title: "Failed to save", variant: "destructive" });
    } finally { setModeSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8" data-testid="stations-loading">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />
      </div>
    );
  }

  return (
    <div data-testid="stations-tab">

      {/* ── Printing Mode ─────────────────────────── */}
      <SectionTitle title="Printing Mode" />
      <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>
        How should the POS route print jobs when placing orders?
      </p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {['Fixed', 'Waiter', 'Station'].map(mode => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            disabled={modeSaving}
            className="p-2.5 rounded-lg border text-left transition-colors"
            style={{
              borderColor: printMode === mode ? COLORS.primaryOrange : COLORS.borderGray,
              backgroundColor: printMode === mode ? "rgba(242,107,51,0.05)" : "transparent",
            }}
            data-testid={`printing-mode-${mode.toLowerCase()}`}
          >
            <div className="text-xs font-semibold" style={{ color: printMode === mode ? COLORS.primaryOrange : COLORS.darkText }}>
              {mode}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: COLORS.grayText }}>
              {mode === 'Fixed' ? 'One dedicated printer' : mode === 'Waiter' ? 'Route by serving waiter' : 'Route by kitchen station'}
            </div>
          </button>
        ))}
      </div>

      {/* CR-161: Fixed station employee picker */}
      {printMode === 'Fixed' && employees.length > 0 && (
        <div
          className="rounded-lg border p-3 mb-4"
          style={{ borderColor: "rgba(242,107,51,0.3)", backgroundColor: "rgba(242,107,51,0.02)" }}
          data-testid="fixed-station-employee-picker"
        >
          <div className="text-xs font-semibold mb-1" style={{ color: COLORS.primaryOrange }}>
            Fixed Station Employee
          </div>
          <p className="text-[10px] mb-2" style={{ color: COLORS.grayText }}>
            Which employee handles all fixed station orders?
          </p>
          <div className="flex flex-wrap gap-2">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => handleEmpSelect(emp.id)}
                disabled={modeSaving}
                className="px-3 py-1 text-xs rounded-full border transition-colors"
                style={{
                  borderColor: selectedEmpId === emp.id ? COLORS.primaryOrange : COLORS.borderGray,
                  backgroundColor: selectedEmpId === emp.id ? "rgba(242,107,51,0.08)" : "transparent",
                  color: selectedEmpId === emp.id ? COLORS.primaryOrange : COLORS.darkText,
                }}
                data-testid={`employee-chip-${emp.id}`}
              >
                {emp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 1, background: COLORS.borderGray, margin: '14px 0' }} />

      {/* ── Stations table ────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
          Printers ({stations.length})
        </h3>
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
        <div className="rounded-lg border overflow-hidden mb-4" style={{ borderColor: COLORS.borderGray }}>
          <table className="w-full text-xs border-collapse" data-testid="stations-table">
            <thead>
              <tr style={{ backgroundColor: "#FAFAFA" }}>
                {['Area', 'Type', 'Printer Name', 'IP / MAC', 'WiFi IP', 'Paper', 'Default', 'Auto Serve', 'Actions'].map(h => (
                  <th key={h} className="text-left px-2 py-2 border-b font-semibold text-[10px] uppercase tracking-wide"
                    style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map(s => (
                <tr key={s.id} className="border-b last:border-b-0"
                  style={{ borderColor: "#F9FAFB" }}
                  data-testid={`station-row-${s.id}`}>
                  <td className="px-2 py-2 font-medium" style={{ color: COLORS.darkText }}>{s.areaName}</td>
                  <td className="px-2 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ backgroundColor: "rgba(242,107,51,0.1)", color: COLORS.primaryOrange }}>
                      {s.printerName}
                    </span>
                  </td>
                  <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.wifiPrinterName || '—'}</td>
                  <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.printerIp || '—'}</td>
                  <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.wifiPrinterIp || '—'}</td>
                  <td className="px-2 py-2" style={{ color: COLORS.grayText }}>{s.printerPaperRoll}mm</td>
                  <td className="px-2 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: "#F3F4F6", color: COLORS.grayText }}>
                      {STAGE_OPTIONS.find(o => o.value === String(s.defaultStage ?? ''))?.label || 'None'}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-medium"
                    style={{ color: s.autoServe ? COLORS.primaryGreen : COLORS.grayText }}>
                    {s.autoServe ? 'Yes' : 'No'}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-gray-100"
                        data-testid={`btn-edit-${s.id}`}>
                        <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                      </button>
                      <button onClick={() => setDeletingId(s.id)} className="p-1 rounded hover:bg-red-50"
                        data-testid={`btn-delete-${s.id}`}>
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                      </button>
                    </div>
                    {deletingId === s.id && (
                      <div className="mt-1 p-2 rounded-lg border bg-white shadow-md"
                        style={{ borderColor: "rgba(239,68,68,0.3)", minWidth: 160 }}
                        data-testid={`delete-confirm-${s.id}`}>
                        <p className="text-xs mb-2" style={{ color: "#EF4444" }}>Delete this printer?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 rounded border"
                            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
                            No
                          </button>
                          <button onClick={() => handleDelete(s.id)}
                            className="text-xs px-2 py-1 rounded text-white"
                            style={{ backgroundColor: "#EF4444" }}
                            data-testid={`confirm-delete-${s.id}`}>
                            Yes
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stations.length === 0 && !form && (
        <p className="text-sm py-6 text-center" style={{ color: COLORS.grayText }}>
          No printers configured. Add one to start printing.
        </p>
      )}

      {/* ── Inline Add/Edit form ─────────────────── */}
      {form && (
        <div className="rounded-lg border p-4 mt-2"
          style={{ borderColor: "rgba(242,107,51,0.3)", backgroundColor: "#FFFBF5" }}
          data-testid="station-inline-form">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.primaryOrange }}>
              {isNew ? 'Add Printer' : 'Edit Printer'}
            </span>
            <button onClick={closeForm} data-testid="btn-cancel-form">
              <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
                Printer For <span style={{ color: COLORS.primaryOrange }}>*</span>
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                value={form.areaName}
                onChange={e => set('areaName', e.target.value)}
                data-testid="input-printer-for"
              >
                <option value="">— Select —</option>
                {areaOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Type</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                value={form.printerName}
                onChange={e => set('printerName', e.target.value)}
                data-testid="input-printer-type"
              >
                {PRINTER_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <TextInput label="Printer Name" value={form.wifiPrinterName} onChange={v => set('wifiPrinterName', v)} placeholder="Device display name" />

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Mode</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                value={form.printerType}
                onChange={e => set('printerType', e.target.value)}
                data-testid="input-printer-mode"
              >
                {PRINTER_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <TextInput label="IP / MAC Address" value={form.printerIp} onChange={v => set('printerIp', v)} placeholder="e.g. 60:6E:41:45:6F:EF" />
            <TextInput label="WiFi Printer IP" value={form.wifiPrinterIp} onChange={v => set('wifiPrinterIp', v)} placeholder="Optional" />

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Paper Roll</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                value={form.printerPaperRoll}
                onChange={e => set('printerPaperRoll', Number(e.target.value))}
                data-testid="input-paper-roll"
              >
                <option value={58}>58mm</option>
                <option value={80}>80mm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Default KOT Stage</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                value={form.defaultStage ?? ''}
                onChange={e => set('defaultStage', e.target.value)}
                data-testid="input-default"
              >
                {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <TextInput label="Vendor ID" value={form.vendorId} onChange={v => set('vendorId', v)} placeholder="0" />
            <TextInput label="Product ID" value={form.productId} onChange={v => set('productId', v)} placeholder="0" />
          </div>

          {restaurantFor === 'food_court' && (
            <div className="mt-3">
              <TextInput
                label="Station GST"
                value={form.stationGst}
                onChange={v => set('stationGst', v)}
                placeholder="e.g. 07AAACE0531H1ZV"
              />
            </div>
          )}

          <div className="mt-3">
            <ToggleSwitch label="Auto Serve" checked={form.autoServe} onChange={v => set('autoServe', v)} />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-xs rounded-lg border"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="btn-cancel-form-bottom"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: COLORS.primaryGreen }}
              data-testid="btn-save-printer"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {isNew ? 'Add Printer' : 'Update Printer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
