// CR-135: Operational Settings Tab
// Reads from useRestaurant().settings (profileTransform camelCase keys)
// Saves via updateOperationalSettings — sparse partial merge (D1 confirmed)
// Context refresh: optimistic setRestaurant patch after save
import React, { useState } from 'react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { updateOperationalSettings } from '../../../api/services/aggregatorConfigService';
import { useToast } from '../../../hooks/use-toast';
import { COLORS } from '../../../constants';

// ── Local primitives ──────────────────────────────────────────────────────────
const Card = ({ title, desc, children }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${COLORS.borderGray}`, marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${COLORS.borderGray}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.darkText }}>{title}</div>
      {desc && <div style={{ fontSize: 10, color: COLORS.grayText, marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{ padding: '16px 18px' }}>{children}</div>
  </div>
);

const NewBadge = () => (
  <span style={{ background: COLORS.primaryOrange, color: '#fff', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4, marginLeft: 6, letterSpacing: 0.8, textTransform: 'uppercase', verticalAlign: 'middle' }}>NEW</span>
);

const ToggleRow = ({ label, hint, on, onChange, badge, testId, noBorder }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: noBorder ? 'none' : `1px solid ${COLORS.borderGray}` }}>
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.darkText }}>{label}</span>{badge}
      {hint && <div style={{ fontSize: 10, color: COLORS.grayText, marginTop: 1 }}>{hint}</div>}
    </div>
    <button data-testid={testId} onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ width: 40, height: 22, borderRadius: 11, background: on ? COLORS.primaryGreen : COLORS.borderGray, border: 'none', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', display: 'block' }} />
    </button>
  </div>
);

const SelectRow = ({ label, hint, value, onChange, options, testId, badge }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.darkText, display: 'block', marginBottom: 4 }}>
      {label}{badge}
    </label>
    {hint && <div style={{ fontSize: 10, color: COLORS.grayText, marginBottom: 4 }}>{hint}</div>}
    <select data-testid={testId} value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', fontSize: 11, padding: '7px 10px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 8, background: '#fff', color: COLORS.darkText }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const NumInput = ({ label, hint, value, onChange, min, max, testId }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.darkText, display: 'block', marginBottom: 4 }}>{label}</label>
    {hint && <div style={{ fontSize: 10, color: COLORS.grayText, marginBottom: 4 }}>{hint}</div>}
    <input data-testid={testId} type="number" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', fontSize: 11, padding: '7px 10px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 8, background: '#fff', color: COLORS.darkText, boxSizing: 'border-box' }} />
  </div>
);

// ── OperationalTab ────────────────────────────────────────────────────────────
export default function OperationalTab() {
  const { restaurant, setRestaurant } = useRestaurant();
  const { toast } = useToast();
  const s = restaurant?.settings || {};

  const [form, setForm] = useState({
    aggregatorAutoKot:       s.aggregatorAutoKot       ?? false,
    aggregatorAutoBill:      s.aggregatorAutoBill       ?? false,
    // profileTransform stores lowercase (L338) — capitalize fn in service handles toAPI conversion
    aggregatorAutoBillStage: s.aggregatorAutoBillStage  ?? 'ready',
    autoPrepTimeAck:         s.autoPrepTimeAck          ?? false,
    aggregatorOrderTone:     s.aggregatorOrderTone       ?? 'default',
    defaultPrepTime:         s.defaultPrepTime           ?? 15,
    prepTimeCountMethod:     s.prepTimeCountMethod       ?? 'quantity',
    prepTimeBonusConfig:     s.prepTimeBonusConfig        ?? [],
  });

  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Bonus bracket helpers
  const addBracket = () =>
    setForm(f => ({ ...f, prepTimeBonusConfig: [...f.prepTimeBonusConfig, { min_items: '', max_items: '', bonus_minutes: '' }] }));

  const deleteBracket = (i) =>
    setForm(f => ({ ...f, prepTimeBonusConfig: f.prepTimeBonusConfig.filter((_, idx) => idx !== i) }));

  const updateBracket = (i, field, val) =>
    setForm(f => {
      const b = [...f.prepTimeBonusConfig];
      b[i] = { ...b[i], [field]: val === '' ? '' : Number(val) };
      return { ...f, prepTimeBonusConfig: b };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOperationalSettings(form);
      // Optimistic context patch — keep lowercase in context (matches profileTransform)
      setRestaurant({
        ...restaurant,
        settings: {
          ...s,
          aggregatorAutoKot:       form.aggregatorAutoKot,
          aggregatorAutoBill:      form.aggregatorAutoBill,
          aggregatorAutoBillStage: form.aggregatorAutoBillStage,
          autoPrepTimeAck:         form.autoPrepTimeAck,
          aggregatorOrderTone:     form.aggregatorOrderTone,
          defaultPrepTime:         form.defaultPrepTime,
          prepTimeCountMethod:     form.prepTimeCountMethod,
          prepTimeBonusConfig:     form.prepTimeBonusConfig,
        },
      });
      toast({ title: 'Operational settings saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="operational-tab">
      {/* Restaurant-wide banner */}
      <div data-testid="operational-banner"
        style={{ background: '#EBF5FF', border: '1px solid #3B82F630', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>
        These settings apply to ALL aggregator orders for this restaurant (not brand-specific)
      </div>

      {/* Auto-Print */}
      <Card title="Auto-Print" desc="Automatic KOT and bill printing for Zomato / Swiggy orders">
        <ToggleRow label="Auto KOT" hint="Automatically print KOT when aggregator order is accepted"
          on={form.aggregatorAutoKot} onChange={v => update('aggregatorAutoKot', v)}
          badge={<NewBadge />} testId="auto-kot-toggle" />
        <ToggleRow label="Auto Bill" hint="Automatically print bill for aggregator orders"
          on={form.aggregatorAutoBill} onChange={v => update('aggregatorAutoBill', v)}
          badge={<NewBadge />} testId="auto-bill-toggle" noBorder={!form.aggregatorAutoBill} />
        {/* OD-22: stage select shown only when autoBill is on */}
        {form.aggregatorAutoBill && (
          <div style={{ paddingTop: 10, paddingLeft: 14, borderLeft: `3px solid ${COLORS.borderGray}`, marginTop: 4 }}
            data-testid="auto-bill-stage-wrapper">
            <SelectRow label="Print Bill When Order Is" badge={<NewBadge />}
              value={form.aggregatorAutoBillStage}
              onChange={v => update('aggregatorAutoBillStage', v)}
              testId="auto-bill-stage-select"
              options={[
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'ready',        label: 'Ready' },
              ]} />
          </div>
        )}
      </Card>

      {/* Order Tone — API values: silent | default | buzzer */}
      <Card title="Order Tone" desc="Audio notification for incoming Zomato / Swiggy orders">
        <SelectRow label="Aggregator Order Tone" hint="Sound played when a new aggregator order arrives"
          badge={<NewBadge />}
          value={form.aggregatorOrderTone}
          onChange={v => update('aggregatorOrderTone', v)}
          testId="order-tone-select"
          options={[
            { value: 'silent',  label: 'Silent'  },
            { value: 'default', label: 'Default' },
            { value: 'buzzer',  label: 'Buzzer'  },
          ]} />
      </Card>

      {/* Prep Time — API values: quantity | distinct */}
      <Card title="Prep Time" desc="Kitchen preparation time shown to aggregator platforms">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <NumInput label="Default Prep Time (min)" hint="1 – 120 minutes"
            value={form.defaultPrepTime} onChange={v => update('defaultPrepTime', v)}
            min={1} max={120} testId="prep-time-input" />
          <SelectRow label="Prep Time Count Method"
            value={form.prepTimeCountMethod}
            onChange={v => update('prepTimeCountMethod', v)}
            testId="prep-method-select"
            options={[
              { value: 'quantity', label: 'By Quantity' },
              { value: 'distinct', label: 'By Distinct Items' },
            ]} />
        </div>
        <ToggleRow label="Auto Acknowledge Prep Time" hint="Automatically confirm prep time when order is accepted"
          on={form.autoPrepTimeAck} onChange={v => update('autoPrepTimeAck', v)}
          testId="auto-prep-ack-toggle" noBorder />

        {/* OD-15: Bonus Time Brackets editor */}
        <div data-testid="bonus-brackets-section" style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.borderGray}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.darkText, marginBottom: 4 }}>Bonus Time Brackets</div>
          <div style={{ fontSize: 10, color: COLORS.grayText, marginBottom: 4 }}>
            Used when food items have no prep time configured (0 or NULL). Acts as a safety fallback.
          </div>
          <div style={{ fontSize: 10, color: COLORS.grayText, fontStyle: 'italic', marginBottom: 12 }}>
            Example: If item "Chai" has 0 min prep time, it will use the default value instead of being skipped.
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 36px', gap: 8, marginBottom: 6 }}>
            {['Min Items', 'Max Items', 'Bonus Minutes', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 600, color: COLORS.grayText, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>

          {form.prepTimeBonusConfig.map((b, i) => (
            <div key={i} data-testid={`bracket-row-${i}`}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input data-testid={`bracket-min-${i}`} type="number" value={b.min_items}
                onChange={e => updateBracket(i, 'min_items', e.target.value)} placeholder="Min"
                style={{ fontSize: 11, padding: '6px 8px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 7, width: '100%', boxSizing: 'border-box' }} />
              <input data-testid={`bracket-max-${i}`} type="number" value={b.max_items}
                onChange={e => updateBracket(i, 'max_items', e.target.value)} placeholder="Max"
                style={{ fontSize: 11, padding: '6px 8px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 7, width: '100%', boxSizing: 'border-box' }} />
              <input data-testid={`bracket-bonus-${i}`} type="number" value={b.bonus_minutes}
                onChange={e => updateBracket(i, 'bonus_minutes', e.target.value)} placeholder="Mins"
                style={{ fontSize: 11, padding: '6px 8px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 7, width: '100%', boxSizing: 'border-box' }} />
              <button data-testid={`bracket-delete-${i}`} onClick={() => deleteBracket(i)}
                style={{ width: 32, height: 32, border: `1px solid #EF444455`, background: '#FEF2F2', borderRadius: 7, cursor: 'pointer', color: '#EF4444', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
          ))}

          <button data-testid="add-bracket-btn" onClick={addBracket}
            style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryOrange, border: `1px dashed ${COLORS.primaryOrange}55`, background: '#FDF0EB', padding: '6px 16px', borderRadius: 7, cursor: 'pointer', marginTop: 4 }}>
            + Add Bracket
          </button>
        </div>
      </Card>

      {/* Save bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 24 }}>
        <button data-testid="save-operational-btn" onClick={handleSave} disabled={saving}
          style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: saving ? '#ccc' : COLORS.primaryGreen, border: 'none', padding: '9px 24px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
