// CR-385 M7 (OD-385-17) — Channel Manager › Front Desk Rules: allow_early_checkin (N7/D53) + extend_rate_mode (N8/D54).
// Partial write via updateFrontDeskRules (multipart data={"basic":{…}}); re-read after save so the UI shows the server truth.
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getFrontDeskRules, updateFrontDeskRules } from '@/api/services/restaurantSettingsService';

const MODES = [
  { value: 'calendar', label: 'Rate table (calendar)', hint: 'Extra nights are priced from the rate calendar for each date; GST applied per night.' },
  { value: 'held', label: 'Held rate', hint: 'Extra nights keep the rate held at check-in.' },
];

export default function FrontDeskRulesTab() {
  const [saved, setSaved] = useState({ allowEarlyCheckin: false, extendRateMode: 'calendar' });
  const [form, setForm] = useState(saved);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getFrontDeskRules(); setSaved(r); setForm(r); setError(null); }
    catch (e) { setError(e?.response?.data?.message ?? e?.message ?? 'Could not load Front Desk rules'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = form.allowEarlyCheckin !== saved.allowEarlyCheckin || form.extendRateMode !== saved.extendRateMode;

  const save = async () => {
    setSaving(true);
    try {
      await updateFrontDeskRules(form);
      await load();
      toast.success('Front Desk rules saved');
    } catch (e) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-[#767676] text-[13px]" data-testid="frontdesk-rules-loading"><Loader2 className="w-4 h-4 animate-spin" /> Loading Front Desk rules…</div>;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 max-w-2xl" data-testid="frontdesk-rules-card">
      <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Front Desk Rules</h2>
      <p className="text-[12px] text-[#767676] mt-1 mb-5">Property-level rules used by the Front Desk at check-in and when a stay is extended.</p>

      <label className="flex items-start justify-between gap-4 py-3 border-t border-[#F3F4F6] cursor-pointer">
        <span>
          <span className="block text-[13px] font-medium text-[#1A1A1A]">Allow early check-in</span>
          <span className="block text-[12px] text-[#767676] mt-0.5">Let staff check a guest in before the booked arrival date. Off = check-in is blocked until the business date reaches the booking.</span>
        </span>
        <input type="checkbox" role="switch" aria-checked={form.allowEarlyCheckin} checked={form.allowEarlyCheckin} disabled={saving}
          onChange={(e) => setForm((f) => ({ ...f, allowEarlyCheckin: e.target.checked }))}
          className="mt-1 w-4 h-4 accent-[#329937]" data-testid="toggle-allow-early-checkin" />
      </label>

      <fieldset className="py-3 border-t border-[#F3F4F6]" data-testid="extend-rate-mode-group">
        <legend className="text-[13px] font-medium text-[#1A1A1A]">Extension pricing</legend>
        {MODES.map((m) => (
          <label key={m.value} className="flex items-start gap-3 mt-2 cursor-pointer">
            <input type="radio" name="extend_rate_mode" value={m.value} checked={form.extendRateMode === m.value} disabled={saving}
              onChange={() => setForm((f) => ({ ...f, extendRateMode: m.value }))}
              className="mt-1 accent-[#329937]" data-testid={`radio-extend-rate-mode-${m.value}`} />
            <span><span className="block text-[13px] text-[#1A1A1A]">{m.label}</span><span className="block text-[12px] text-[#767676]">{m.hint}</span></span>
          </label>
        ))}
      </fieldset>

      {error && <div className="mt-3 text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2" role="alert" data-testid="frontdesk-rules-error">{error}</div>}

      <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-[#F3F4F6]">
        <span className="text-[11px] text-[#767676]" data-testid="frontdesk-rules-status">{dirty ? 'Unsaved changes' : 'Saved'}</span>
        <button type="button" onClick={save} disabled={!dirty || saving} aria-busy={saving} data-testid="frontdesk-rules-save-btn"
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-semibold text-white bg-[#329937] hover:bg-[#287a2d] disabled:opacity-40 disabled:cursor-not-allowed">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
