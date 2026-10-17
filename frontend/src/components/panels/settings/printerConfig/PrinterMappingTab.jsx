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
      toast({ title: "Failed to load mappings", description: e?.response?.data?.message || e.message, variant: "destructive" });
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

  const toggleAssigned = (printerId, empId) => {
    setState(prev => ({
      ...prev,
      printers: prev.printers.map(p => p.id !== printerId ? p : {
        ...p,
        assignedEmployeeIds: p.assignedEmployeeIds.includes(empId)
          ? p.assignedEmployeeIds.filter(id => id !== empId)
          : [...p.assignedEmployeeIds, empId],
      }),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMapping(state);
      toast({ title: "Mapping saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8" data-testid="printer-mapping-loading">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />
      </div>
    );
  }
  if (!state) return null;

  return (
    <div data-testid="printer-mapping-tab">

      {/* Default Users */}
      <SectionTitle title="Default Users — Print to All Stations" />
      <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>
        Default users print to all printers automatically.
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
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
          >
            {emp.name}
          </button>
        ))}
      </div>

      {/* Printer Assignments */}
      <SectionTitle title="Printer Assignments" />
      <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>
        Select which employees are assigned to each printer.
      </p>
      {state.printers.map(printer => (
        <div
          key={printer.id}
          className="rounded-lg border p-3 mb-3"
          style={{ borderColor: COLORS.borderGray }}
          data-testid={`printer-mapping-card-${printer.id}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
              {printer.areaName}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(242,107,51,0.1)", color: COLORS.primaryOrange }}>
              {printer.printerName}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.employees.map(emp => {
              const assigned = printer.assignedEmployeeIds.includes(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => toggleAssigned(printer.id, emp.id)}
                  className="px-2.5 py-1 text-xs rounded-full border transition-colors"
                  style={{
                    borderColor: assigned ? COLORS.primaryOrange : COLORS.borderGray,
                    backgroundColor: assigned ? "rgba(242,107,51,0.08)" : "transparent",
                    color: assigned ? COLORS.primaryOrange : COLORS.grayText,
                  }}
                  data-testid={`assign-emp-${emp.id}-printer-${printer.id}`}
                >
                  {emp.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 mt-2"
        style={{ backgroundColor: COLORS.primaryGreen }}
        data-testid="printer-mapping-save-btn"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saving ? "Saving…" : "Save Mapping"}
      </button>
    </div>
  );
};
