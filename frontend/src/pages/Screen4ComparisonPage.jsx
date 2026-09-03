// CR-132 Design Review — Screen 4: Tax & Charges (Before vs After)
import React, { useState } from 'react';

const C = {
  orange: '#F26B33',
  orangeLight: '#FDF0EB',
  green: '#329937',
  dark: '#1A1A2E',
  gray: '#6B7280',
  border: '#E5E7EB',
  bg: '#F7F7F7',
  white: '#FFFFFF',
  blue: '#3B82F6',
  blueLight: '#EBF5FF',
};

// ─── Badges ───────────────────────────────────────────────────────────────────

const NewBadge = () => (
  <span style={{ background: C.orangeLight, color: C.orange, border: `1px solid ${C.orange}30`, fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '1px 6px', borderRadius: 99, marginLeft: 6, verticalAlign: 'middle', textTransform: 'uppercase' }}>NEW</span>
);
const ConsolidatedBadge = () => (
  <span style={{ background: C.blueLight, color: C.blue, border: `1px solid ${C.blue}30`, fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '1px 6px', borderRadius: 99, marginLeft: 6, verticalAlign: 'middle', textTransform: 'uppercase' }}>CONSOLIDATED</span>
);

// ─── Shared primitives ────────────────────────────────────────────────────────

const Card = ({ title, desc, children, accent, allNew }) => (
  <div style={{ background: C.white, border: `1.5px solid ${accent || allNew ? C.orange + '55' : C.border}`, borderRadius: 12, marginBottom: 16, overflow: 'hidden', boxShadow: accent || allNew ? `0 0 0 3px ${C.orange}10` : '0 1px 3px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: allNew ? C.orangeLight : C.white }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{title}{allNew && <NewBadge />}</div>
      {desc && <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </div>
);

const TRow = ({ label, isNew, isMoved, hint, type = 'toggle', options, highlight, indent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px solid ${C.border}`,
    background: isNew && highlight ? C.orangeLight : 'transparent',
    margin: isNew ? '0 -20px' : '0',
    padding: isNew ? '8px 20px' : indent ? '8px 0 8px 20px' : '8px 0',
  }}>
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: indent ? C.gray : C.dark }}>{label}</span>
      {isNew && <NewBadge />}
      {hint && <div style={{ fontSize: 10, color: C.gray, marginTop: 1 }}>{hint}</div>}
    </div>
    {type === 'toggle' && (
      <div data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, '-')}`} style={{ width: 36, height: 20, borderRadius: 10, background: C.green, position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, right: 2 }} />
      </div>
    )}
    {type === 'select' && (
      <select data-testid={`select-${label.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px', flexShrink: 0, background: '#fff' }}>
        {(options || []).map(o => <option key={o}>{o}</option>)}
      </select>
    )}
  </div>
);

const FakeInput = ({ label, req, placeholder, suffix, isNew, hint, type = 'text' }) => (
  <div style={{ marginBottom: 10, padding: isNew ? '8px 12px' : '0', background: isNew ? C.orangeLight : 'transparent', borderRadius: isNew ? 8 : 0, border: isNew ? `1px solid ${C.orange}30` : 'none' }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>
      {label}{req && <span style={{ color: C.orange }}> *</span>}{isNew && <NewBadge />}
    </label>
    {hint && <div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>{hint}</div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`} type={type} placeholder={placeholder} style={{ flex: 1, fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', color: C.gray, boxSizing: 'border-box' }} readOnly />
      {suffix && <span style={{ fontSize: 11, color: C.gray, flexShrink: 0 }}>{suffix}</span>}
    </div>
  </div>
);

const Grid2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>{children}</div>
);

const IndentBlock = ({ children }) => (
  <div style={{ borderLeft: `3px solid ${C.border}`, marginLeft: 12, paddingLeft: 12, marginTop: 2, marginBottom: 4 }}>{children}</div>
);

const SectionDivider = ({ label }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.orangeLight}`, paddingBottom: 4, marginBottom: 8, marginTop: 12 }}>{label}</div>
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const OLD_STEPS = ['Restaurant Identity', 'Channels & Payments', 'Charges & Tips', 'Order & Kitchen', 'Inventory & Extras', 'Owner Info'];
const NEW_STEPS = ['Basic Settings', 'Printer Settings', 'Channels & Info', 'Tax & Charges', 'Order & Kitchen', 'Online Ordering', 'Inventory', 'Room & Hospitality'];

const Sidebar = ({ steps, active, label }) => (
  <div style={{ width: 176, background: C.white, borderRight: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.orange, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>Restaurant Setup</div>
    </div>
    <div style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
      {steps.map((s, i) => {
        const isActive = i === active;
        const isDeferred = s.startsWith('⏸');
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, marginBottom: 2,
            background: isActive ? C.orangeLight : 'transparent',
            borderLeft: isActive ? `3px solid ${C.orange}` : '3px solid transparent',
            opacity: isDeferred ? 0.45 : 1,
          }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: isActive ? C.orange : C.border, color: isActive ? '#fff' : C.gray }}>{i + 1}</div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? C.orange : C.gray, lineHeight: 1.3 }}>{s.replace('⏸ ', '')}{isDeferred ? ' (deferred)' : ''}</span>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── OLD Screen (step 1 Tax + step 3 Charges — both shown together) ───────────

const OldScreen = () => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>

    <div style={{ background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 11, color: C.blue, fontWeight: 600 }}>
      These fields currently live across <strong>Step 1</strong> (Tax) and <strong>Step 3</strong> (Charges & Tips) in the old wizard — shown here combined for comparison.
    </div>

    <Card title="Tax Configuration" desc="From Step 1 — GST/VAT affects every bill">
      <TRow label="GST Enabled" hint="Most Indian restaurants need this ON" />
      <IndentBlock>
        <FakeInput label="GST Number" req placeholder="30AFMPK4601C3G6" />
        <Grid2>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>GST Mode</label>
            <select style={{ width: '100%', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px' }}>
              <option>Item Level</option><option>Restaurant Level</option>
            </select>
          </div>
          <FakeInput label="Tax %" placeholder="4" suffix="%" />
        </Grid2>
      </IndentBlock>
      <TRow label="VAT Enabled" hint="For restaurants using VAT instead of GST" />
      <IndentBlock>
        <FakeInput label="VAT Code" req placeholder="VAT registration number" />
      </IndentBlock>
    </Card>

    <Card title="Service Charge & Tips" desc="From Step 3 — Automatic charges on orders">
      <TRow label="Service Charge" hint="Add service charge to customer bills" />
      <IndentBlock>
        <TRow label="Auto Service Charge" hint="Automatically apply to all orders" indent />
        <Grid2>
          <FakeInput label="Service Charge %" placeholder="10" suffix="%" />
          <FakeInput label="Service Charge Tax %" placeholder="18" suffix="%" />
        </Grid2>
      </IndentBlock>
      <TRow label="Enable Tips" hint="Allow tip collection on bills" />
      <TRow label="Discounts Available" hint="Allow applying discounts to orders" />
      <TRow label="Total Rounding" hint="Round grand total to nearest rupee" />
    </Card>

  </div>
);

// ─── NEW Screen (Screen 4 — Tax & Charges, consolidated) ─────────────────────

const NewScreen = ({ highlight }) => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>

    {/* GST */}
    <Card title="GST" desc="Goods & Services Tax configuration">
      <TRow label="GST Enabled" hint="Most Indian restaurants need this ON" highlight={highlight} />
      <IndentBlock>
        <FakeInput label="GST Number" req placeholder="30AFMPK4601C3G6" />
        <Grid2>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>GST Mode</label>
            <select style={{ width: '100%', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px' }}>
              <option>Item Level</option><option>Restaurant Level</option>
            </select>
          </div>
          <FakeInput label="Tax %" placeholder="4" suffix="%" />
        </Grid2>
        <TRow label="Show GST to Customers" isNew hint="Show GST breakdown on customer-facing screens" highlight={highlight} />
      </IndentBlock>
    </Card>

    {/* VAT */}
    <Card title="VAT" desc="Value Added Tax — for restaurants not using GST">
      <TRow label="VAT Enabled" hint="For restaurants using VAT instead of GST" highlight={highlight} />
      <IndentBlock>
        <FakeInput label="VAT Code" req placeholder="VAT registration number" />
      </IndentBlock>
    </Card>

    {/* Service Charge */}
    <Card title="Service Charge" desc="Automatic service charge applied to orders">
      <TRow label="Service Charge" highlight={highlight} />
      <IndentBlock>
        <TRow label="Auto Service Charge" hint="Automatically apply to all orders" indent highlight={highlight} />
        <Grid2>
          <FakeInput label="Service Charge %" placeholder="10" suffix="%" />
          <FakeInput label="Service Charge Tax %" placeholder="18" suffix="%" />
        </Grid2>
        <FakeInput
          label="Service Charge Label"
          isNew
          placeholder="Service Charge"
          hint='Custom label on bills e.g. "Staff Gratuity"'
        />
      </IndentBlock>
    </Card>

    {/* Other Charges — all new except tips/rounding */}
    <Card title="Other Charges & Rounding" desc="Additional charges, delivery taxes, and bill rounding" accent>
      <FakeInput
        label="Delivery Charge GST %"
        isNew
        placeholder="5"
        suffix="%"
        hint="GST applied on delivery charge (typically 5%)"
      />
      <FakeInput
        label="Takeaway Charges (₹)"
        isNew
        placeholder="0"
        hint="Fixed charge added to every takeaway order"
      />
      <div style={{ marginTop: 8 }}>
        <SectionDivider label="Existing" />
        <TRow label="Enable Tips" highlight={highlight} />
        <TRow label="Total Rounding" hint="Round grand total to nearest rupee" highlight={highlight} />
        <TRow label="Discounts Available" highlight={highlight} />
      </div>
    </Card>

  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Screen4ComparisonPage() {
  const [highlight, setHighlight] = useState(true);

  return (
    <div style={{ minHeight: '100vh', background: '#EAEAEA', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top banner */}
      <div style={{ background: C.dark, color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 11, color: '#aaa', marginRight: 8 }}>CR-132 Design Review</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Screen 4 — Tax & Charges: Before vs After</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ccc', cursor: 'pointer' }}>
            <input data-testid="highlight-toggle" type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} />
            Highlight NEW fields
          </label>
          <a href="/screen3-compare" style={{ fontSize: 11, color: '#aaa', textDecoration: 'none' }}>← Screen 3</a>
          <a href="/settings-preview" style={{ fontSize: 11, color: '#aaa', textDecoration: 'none' }}>All screens</a>
        </div>
      </div>

      {/* Legend */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.orangeLight, border: `1px solid ${C.orange}55` }} />
          <span style={{ fontSize: 11, color: C.gray }}>New field</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fff', border: `1px solid ${C.border}` }} />
          <span style={{ fontSize: 11, color: C.gray }}>Existing field</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: C.blueLight, border: `1px solid ${C.blue}30` }}>
          <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>Consolidation: Tax (Step 1) + Charges (Step 3) → single Screen 4</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.gray }}>
          OLD: 2 separate steps with 12 fields &nbsp;|&nbsp;
          <strong style={{ color: C.orange }}>NEW: 4 sections, +4 new fields, consolidated</strong>
        </div>
      </div>

      {/* Side-by-side */}
      <div style={{ display: 'flex', height: 'calc(100vh - 88px)', gap: 0 }}>

        {/* LEFT — OLD */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '3px solid #ddd' }}>
          <div style={{ background: '#4B5563', color: '#fff', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>CURRENT</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Step 1 (Tax) + Step 3 (Charges)</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9CA3AF' }}>2 separate steps · 6 steps total</span>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: C.bg }}>
            <Sidebar steps={OLD_STEPS} active={2} label="OLD WIZARD" />
            <OldScreen />
          </div>
          <div style={{ background: '#374151', padding: '8px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Save & Continue →
            </button>
          </div>
        </div>

        {/* RIGHT — NEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: C.orange, color: '#fff', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 99 }}>PROPOSED</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Screen 4: Tax & Charges</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>4 cards · 9 steps total</span>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: C.bg }}>
            <Sidebar steps={NEW_STEPS} active={3} label="NEW WIZARD" />
            <NewScreen highlight={highlight} />
          </div>
          <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '8px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button data-testid="screen4-save-continue" style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Save & Continue →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
