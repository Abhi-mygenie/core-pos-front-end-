// CR-351: Bill Content Tab — local printer path
// Endpoint: GET/POST /bill-printer-config + POST /update-settings (show_address + footer_text)
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { getConfig, saveConfig, saveBasicSettings } from "../../../../api/services/billPrinterConfigService";
import { SectionTitle, ToggleSwitch } from "../shared";

const Field = ({ label, children }) => (
  <div className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: "#F9FAFB" }}>
    <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>{label}</span>
    {children}
  </div>
);

const NumberInput = ({ value, onChange, testId }) => (
  <input
    type="number"
    value={value}
    onChange={e => onChange(Number(e.target.value))}
    className="w-16 px-2 py-1 text-xs text-center rounded border outline-none"
    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
    data-testid={testId}
  />
);

export const BillContentTab = ({ sharedState, onStateChange }) => {
  const { toast } = useToast();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConfig();
      setState(data);
      if (onStateChange) onStateChange(data);
    } catch (e) {
      toast({ title: "Failed to load bill config", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, onStateChange]);

  useEffect(() => { load(); }, [load]);

  // Use shared state if parent provides it (when BillStyleTab loaded first)
  const s = sharedState || state;
  const set = (key, val) => {
    const next = { ...s, [key]: val };
    setState(next);
    if (onStateChange) onStateChange(next);
  };

  const handleSave = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await Promise.all([
        saveConfig(s),
        saveBasicSettings(s),
      ]);
      toast({ title: "Bill content saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading || !s) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} /></div>;
  }

  return (
    <div data-testid="bill-content-tab">
      <div className="grid grid-cols-2 gap-4">

        {/* Left: Toggles */}
        <div className="rounded-lg border p-3" style={{ borderColor: COLORS.borderGray }}>
          <SectionTitle title="Print Options" />
          <Field label="Print Phone Number">
            <ToggleSwitch checked={s.printPhone} onChange={v => set('printPhone', v)} testId="toggle-print-phone" />
          </Field>
          <Field label="Print Email">
            <ToggleSwitch checked={s.printEmail} onChange={v => set('printEmail', v)} testId="toggle-print-email" />
          </Field>
          <Field label="Show Address on Bill">
            <ToggleSwitch checked={s.showAddress} onChange={v => set('showAddress', v)} testId="toggle-show-address" />
          </Field>
          <Field label="Dotted Line Between Items">
            <ToggleSwitch checked={s.dottedLine} onChange={v => set('dottedLine', v)} testId="toggle-dotted-line" />
          </Field>
          <Field label="Total Amount Bold">
            <ToggleSwitch checked={s.totalBold} onChange={v => set('totalBold', v)} testId="toggle-total-bold" />
          </Field>
          <Field label="Total Amount Centred">
            <ToggleSwitch checked={s.totalCentered} onChange={v => set('totalCentered', v)} testId="toggle-total-centered" />
          </Field>
          <Field label="Total Amount in Words">
            <ToggleSwitch checked={s.totalInWords} onChange={v => set('totalInWords', v)} testId="toggle-total-words" />
          </Field>
        </div>

        {/* Right: Text + Dimensions */}
        <div className="space-y-3">
          <div className="rounded-lg border p-3" style={{ borderColor: COLORS.borderGray }}>
            <SectionTitle title="Bill Text" />
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Footer Text</label>
            <input
              type="text"
              value={s.footerText}
              onChange={e => set('footerText', e.target.value)}
              placeholder="e.g. Thank you, visit again!"
              className="w-full px-3 py-2 text-xs rounded border outline-none"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="input-footer-text"
            />
          </div>

          <div className="rounded-lg border p-3" style={{ borderColor: COLORS.borderGray }}>
            <SectionTitle title="Physical Dimensions" />
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: COLORS.grayText }}>Padding</div>
                <NumberInput value={s.padding} onChange={v => set('padding', v)} testId="input-padding" />
              </div>
              <div className="text-center">
                <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: COLORS.grayText }}>Margin</div>
                <NumberInput value={s.margin} onChange={v => set('margin', v)} testId="input-margin" />
              </div>
              <div className="text-center">
                <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: COLORS.grayText }}>Paper Width</div>
                <NumberInput value={s.paperWidth} onChange={v => set('paperWidth', v)} testId="input-paper-width" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="btn-save-bill-content"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save Bill Content"}
        </button>
      </div>
    </div>
  );
};
