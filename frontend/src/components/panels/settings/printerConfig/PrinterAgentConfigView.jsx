// CR-133: Printer Agent Config — container view (4 tabs, single shared state, sticky save)
import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getConfig, saveConfig } from "../../../../api/services/printerAgentConfigService";
import { findReinjectedPrinters } from "../../../../api/transforms/printerAgentConfigTransform";
import { PrintersTab } from "./PrintersTab";
import { AutoPrintTab } from "./AutoPrintTab";
import { BillContentTab } from "./BillContentTab";
import { PrintStyleTab } from "./PrintStyleTab";

const TABS = [
  { id: "printers", label: "Printers" },
  { id: "autoprint", label: "Auto Print" },
  { id: "content", label: "Bill Content" },
  { id: "style", label: "Print Style" },
];

export const PrinterAgentConfigView = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("printers");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConfig();
      setConfig(data);
      setDirty(false);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load printer configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rawPrinters = config._raw?.settings_config?.printers || [];
      const sentPrinters = config.printers;
      await saveConfig(config);
      // refetch — backend may re-key new printers
      const fresh = await getConfig();
      setConfig(fresh);
      setDirty(false);
      // CR-133 QA finding: backend deep-merge silently re-injects deleted printers
      const reinjected = findReinjectedPrinters(rawPrinters, sentPrinters, fresh.printers);
      if (reinjected.length > 0) {
        toast({
          title: "Printer deletion not applied",
          description: `The server kept: ${reinjected.map((p) => p.label).join(", ")}. Printer removal requires backend support — other changes were saved.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Saved", description: "Printer configuration saved successfully." });
      }
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.response?.data?.message || e.message || "Could not save. Please retry.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="printer-config-loading">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
        <p className="text-sm" style={{ color: COLORS.grayText }}>Loading printer configuration…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="printer-config-error">
        <AlertCircle className="w-6 h-6" style={{ color: "#EF4444" }} />
        <p className="text-sm text-center" style={{ color: COLORS.grayText }}>{error}</p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="printer-config-retry-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" data-testid="printer-config-view">
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: activeTab === t.id ? "#FFFFFF" : "transparent",
              color: activeTab === t.id ? COLORS.darkText : COLORS.grayText,
              boxShadow: activeTab === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
            data-testid={`printer-config-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab */}
      <div className="flex-1">
        {activeTab === "printers" && <PrintersTab config={config} update={update} />}
        {activeTab === "autoprint" && <AutoPrintTab config={config} update={update} />}
        {activeTab === "content" && <BillContentTab config={config} update={update} />}
        {activeTab === "style" && <PrintStyleTab config={config} update={update} />}
      </div>

      {/* Sticky save bar */}
      <div
        className="sticky bottom-0 z-10 flex items-center justify-between gap-3 pt-4 pb-2 mt-6"
        style={{ backgroundColor: COLORS.lightBg, borderTop: `1px solid ${COLORS.borderGray}` }}
      >
        <span className="text-xs" style={{ color: dirty ? COLORS.primaryOrange : COLORS.grayText }} data-testid="printer-config-dirty-indicator">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="printer-config-save-btn"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};
