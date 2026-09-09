// CR-351: Bill Style Tab — local printer path
// Sub-tabs: 2-inch (58mm) | 3-inch (80mm) | Windows
// 27 section rows: HEIGHT + WIDTH (android) + BOLD per row
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getConfig, saveConfig } from "../../../../api/services/billPrinterConfigService";

const SUB_TABS = [
  { id: '58mm',    label: '2-inch (58mm)',  platform: 'android' },
  { id: '80mm',    label: '3-inch (80mm)',  platform: 'android' },
  { id: 'windows', label: 'Windows',        platform: 'windows' },
];

const StyleInput = ({ value, onChange, testId }) => (
  <input
    type="number"
    value={value}
    onChange={e => onChange(e.target.value)}
    min="0"
    className="w-12 px-1 py-1 text-xs text-center rounded border outline-none"
    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
    data-testid={testId}
  />
);

const BoldBtn = ({ checked, onChange, testId }) => (
  <button
    onClick={() => onChange(!checked)}
    className="w-8 h-7 text-xs font-bold rounded border"
    style={{
      borderColor: checked ? COLORS.primaryOrange : COLORS.borderGray,
      backgroundColor: checked ? "rgba(242,107,51,0.1)" : "transparent",
      color: checked ? COLORS.primaryOrange : COLORS.grayText,
    }}
    data-testid={testId}
  >B</button>
);

export const BillStyleTab = ({ sharedState, onStateChange }) => {
  const { toast } = useToast();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePaper, setActivePaper] = useState('58mm');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConfig();
      setState(data);
      if (onStateChange) onStateChange(data);
    } catch (e) {
      toast({ title: "Failed to load bill style", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, onStateChange]);

  useEffect(() => { load(); }, [load]);

  const s = sharedState || state;

  const updateSection = (paperKey, idx, field, val) => {
    const next = {
      ...s,
      configs: {
        ...s.configs,
        [paperKey]: {
          ...s.configs[paperKey],
          sections: s.configs[paperKey].sections.map((sec, i) =>
            i !== idx ? sec : { ...sec, [field]: val }
          ),
        },
      },
    };
    setState(next);
    if (onStateChange) onStateChange(next);
  };

  const handleSave = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await saveConfig(s);
      toast({ title: "Bill style saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading || !s) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} /></div>;
  }

  const activeSub = SUB_TABS.find(t => t.id === activePaper);
  const isAndroid = activeSub?.platform === 'android';
  const sections  = s.configs[activePaper]?.sections || [];

  return (
    <div data-testid="bill-style-tab">
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6", width: 'fit-content' }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActivePaper(t.id)}
            className="px-4 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: activePaper === t.id ? "#FFFFFF" : "transparent",
              color: activePaper === t.id ? COLORS.darkText : COLORS.grayText,
              boxShadow: activePaper === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
            data-testid={`subtab-${t.id}`}
          >{t.label}</button>
        ))}
      </div>

      <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>
        Configure font sizes and visibility for each section on a {activeSub?.label} roll.
      </p>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
        <table className="w-full text-xs border-collapse" data-testid={`bill-style-table-${activePaper}`}>
          <thead>
            <tr style={{ backgroundColor: "#FAFAFA" }}>
              <th className="text-left px-3 py-2 border-b font-semibold text-[10px] uppercase tracking-wide"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Section</th>
              <th className="px-3 py-2 border-b font-semibold text-[10px] uppercase tracking-wide text-center"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Height</th>
              {isAndroid && (
                <th className="px-3 py-2 border-b font-semibold text-[10px] uppercase tracking-wide text-center"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Width</th>
              )}
              <th className="px-3 py-2 border-b font-semibold text-[10px] uppercase tracking-wide text-center"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Bold</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec, idx) => (
              <tr key={sec.key} className="border-b last:border-b-0" style={{ borderColor: "#F9FAFB" }}
                data-testid={`style-row-${sec.key}`}>
                <td className="px-3 py-1.5" style={{ color: COLORS.darkText }}>{sec.label}</td>
                <td className="px-3 py-1.5 text-center">
                  <StyleInput
                    value={sec.height}
                    onChange={v => updateSection(activePaper, idx, 'height', v)}
                    testId={`style-height-${sec.key}`}
                  />
                </td>
                {isAndroid && (
                  <td className="px-3 py-1.5 text-center">
                    <StyleInput
                      value={sec.width}
                      onChange={v => updateSection(activePaper, idx, 'width', v)}
                      testId={`style-width-${sec.key}`}
                    />
                  </td>
                )}
                <td className="px-3 py-1.5 text-center">
                  <BoldBtn
                    checked={sec.bold}
                    onChange={v => updateSection(activePaper, idx, 'bold', v)}
                    testId={`style-bold-${sec.key}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="btn-save-bill-style"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save Bill Style"}
        </button>
      </div>
    </div>
  );
};
