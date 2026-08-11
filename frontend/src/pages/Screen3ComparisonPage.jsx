// CR-132 Design Review — Screen 3: Channels, Payments & Info (Before vs After)
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
const MovedBadge = () => (
  <span style={{ background: C.blueLight, color: C.blue, border: `1px solid ${C.blue}30`, fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '1px 6px', borderRadius: 99, marginLeft: 6, verticalAlign: 'middle', textTransform: 'uppercase' }}>MOVED</span>
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

const TRow = ({ label, isNew, isMoved, hint, type = 'toggle', options, highlight }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px solid ${C.border}`,
    background: isNew && highlight ? C.orangeLight : isMoved && highlight ? C.blueLight : 'transparent',
    margin: (isNew || isMoved) ? '0 -20px' : '0',
    padding: (isNew || isMoved) ? '8px 20px' : '8px 0',
  }}>
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{label}</span>
      {isNew && <NewBadge />}
      {isMoved && <MovedBadge />}
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

const FakeInput = ({ label, req, placeholder, isNew, isMoved, hint }) => (
  <div style={{ marginBottom: 10, padding: (isNew || isMoved) ? '8px 12px' : '0', background: isNew ? C.orangeLight : isMoved ? C.blueLight : 'transparent', borderRadius: isNew || isMoved ? 8 : 0, border: isNew ? `1px solid ${C.orange}30` : isMoved ? `1px solid ${C.blue}30` : 'none' }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>
      {label}{req && <span style={{ color: C.orange }}> *</span>}{isNew && <NewBadge />}{isMoved && <MovedBadge />}
    </label>
    {hint && <div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>{hint}</div>}
    <input data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`} type="text" placeholder={placeholder} style={{ width: '100%', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', color: C.gray, boxSizing: 'border-box' }} readOnly />
  </div>
);

const Grid2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>{children}</div>
);

// ─── Channel / Payment Chip (old style) ───────────────────────────────────────

const Chip = ({ label, selected, icon }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 10, border: `2px solid ${selected ? C.orange : C.border}`, background: selected ? C.orangeLight : C.white, cursor: 'pointer', minWidth: 64 }}>
    <span style={{ fontSize: 18 }}>{icon}</span>
    <span style={{ fontSize: 10, fontWeight: 600, color: selected ? C.orange : C.gray }}>{label}</span>
  </div>
);

const PayChip = ({ label, selected }) => (
  <div style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${selected ? C.green : C.border}`, background: selected ? 'rgba(50,153,55,0.08)' : C.white, fontSize: 11, fontWeight: 600, color: selected ? C.green : C.gray, cursor: 'pointer' }}>
    {label}
  </div>
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const OLD_STEPS = ['Restaurant Identity', 'Channels & Payments', 'Charges & Tips', 'Order & Kitchen', 'Inventory & Extras', 'Owner Info'];
const NEW_STEPS = ['Basic Settings', '⏸ Printer Setup', 'Channels & Info', 'Tax & Charges', 'Order & Kitchen', 'Online Ordering', 'Aggregator', 'Inventory', 'Room & Hospitality'];

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

// ─── OLD Screen (step 2 — Channels & Payments) ────────────────────────────────

const OldScreen = () => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>
    <Card title="Service Channels" desc="How do your customers order? Select all that apply.">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <Chip label="Dine-in" selected icon="🍽" />
        <Chip label="Takeaway" selected icon="🛍" />
        <Chip label="Delivery" icon="🛵" />
        <Chip label="Room" icon="🏨" />
      </div>
    </Card>

    <Card title="Payment Methods" desc="How can customers pay?">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <PayChip label="Cash" selected />
        <PayChip label="UPI" selected />
        <PayChip label="Card" selected />
        <PayChip label="Tab" />
        <PayChip label="Online" />
      </div>
      <FakeInput label="UPI ID" placeholder="yourstore@upi" hint="Required if UPI is enabled" />
      <TRow label="Dynamic UPI Value" hint="Auto-generate UPI amount per order" />
      <TRow label="Show Cash on Delivery" hint="Visible on delivery orders" />
      <TRow label="Order Payment Type" type="select" options={['Both', 'Prepaid', 'Postpaid']} />
    </Card>

    <Card title="Online Payment per Channel" desc="Enable online payment for specific channels">
      <TRow label="Walk-in Online Payment" />
      <TRow label="Dine-in Online Payment" />
      <TRow label="Takeaway Online Payment" />
      <TRow label="Delivery Online Payment" />
    </Card>
  </div>
);

// ─── NEW Screen (Screen 3 — Channels, Payments & Info) ───────────────────────

const NewScreen = ({ highlight }) => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>

    <Card title="Service Channels" desc="Active ordering channels for this restaurant">
      <Grid2>
        <TRow label="Dine-in" highlight={highlight} />
        <TRow label="Takeaway" highlight={highlight} />
        <TRow label="Delivery" highlight={highlight} />
        <TRow label="Room" hint="Turning ON adds Screen 9 (Room & Hospitality)" highlight={highlight} />
        <TRow label="Online Orders" isNew hint="Enable web/app online ordering" highlight={highlight} />
        <TRow label="Multiple Menus" isNew hint="Support multiple menu versions" highlight={highlight} />
        <TRow label="Different Prices per Channel" isNew hint="Enable per-channel menu pricing" highlight={highlight} />
        <TRow label="Dine-in Number" isNew hint="Show dine-in table number on orders" highlight={highlight} />
        <TRow label="Dine-in OTP Required" isNew hint="Require OTP for dine-in confirm" highlight={highlight} />
      </Grid2>
    </Card>

    <Card title="Payment Methods" desc="Accepted payment modes and UPI configuration">
      <Grid2>
        <TRow label="Cash" highlight={highlight} />
        <TRow label="UPI" highlight={highlight} />
        <TRow label="Card" highlight={highlight} />
        <TRow label="Tab / Credit" highlight={highlight} />
        <TRow label="Online" highlight={highlight} />
        <TRow label="Role-Based Discount" isNew hint="Restrict discounts by staff role" highlight={highlight} />
      </Grid2>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 4 }}>
        <FakeInput label="UPI ID" placeholder="yourstore@upi" hint="Required if UPI is enabled" />
        <Grid2>
          <TRow label="Dynamic UPI Value" highlight={highlight} />
          <TRow label="Show Cash on Delivery" highlight={highlight} />
        </Grid2>
        <TRow label="Order Payment Type" type="select" options={['Both', 'Prepaid', 'Postpaid']} highlight={highlight} />
      </div>
    </Card>

    <Card title="Online Payment per Channel" desc="Enable online payment for specific service channels">
      <Grid2>
        <TRow label="Walk-in Online Payment" highlight={highlight} />
        <TRow label="Dine-in Online Payment" highlight={highlight} />
        <TRow label="Takeaway Online Payment" highlight={highlight} />
        <TRow label="Delivery Online Payment" highlight={highlight} />
      </Grid2>
    </Card>

    <Card title="Contact & Delivery" desc="Phone numbers used on bills and delivery orders" allNew>
      <Grid2>
        <FakeInput label="Phone Number" isMoved placeholder="9823905119" hint="Restaurant main phone (moved from Screen 1)" />
        <FakeInput label="Report Phone Number" isNew placeholder="9999999999" hint="Used on printed reports" />
        <FakeInput label="Delivery Contact" isNew placeholder="9800000000" hint="Contact shown on delivery orders" />
        <FakeInput label="Delivery Person Name" isNew placeholder="Raju" />
      </Grid2>
    </Card>

    <Card title="Settlement & Feedback" desc="Settlement reports and customer feedback settings" allNew>
      <Grid2>
        <TRow label="Settlement Report" isNew hint="Enable settlement reporting module" highlight={highlight} />
        <TRow label="Feedback" isNew hint="Enable customer feedback collection" highlight={highlight} />
        <TRow label="Send Feedback Link" isNew hint="Send feedback link after order" highlight={highlight} />
      </Grid2>
      <FakeInput label="Feedback URL" isNew placeholder="https://yourfeedback.link" hint="Shown on bill / sent via WhatsApp" />
    </Card>

    <Card title="Owner Info" desc="Owner profile details for reports and notifications" allNew>
      <Grid2>
        <FakeInput label="First Name" isNew placeholder="Abhishek" />
        <FakeInput label="Last Name" isNew placeholder="Sharma" />
        <FakeInput label="Owner Phone" isNew placeholder="9823905119" />
      </Grid2>
    </Card>

  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Screen3ComparisonPage() {
  const [highlight, setHighlight] = useState(true);

  return (
    <div style={{ minHeight: '100vh', background: '#EAEAEA', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top banner */}
      <div style={{ background: C.dark, color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 11, color: '#aaa', marginRight: 8 }}>CR-132 Design Review</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Screen 3 — Channels, Payments & Info: Before vs After</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ccc', cursor: 'pointer' }}>
            <input data-testid="highlight-toggle" type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} />
            Highlight NEW / MOVED fields
          </label>
          <a href="/screen4-compare" style={{ fontSize: 11, color: C.orange, textDecoration: 'none' }}>Screen 4 →</a>
          <a href="/screen1-compare" style={{ fontSize: 11, color: '#aaa', textDecoration: 'none' }}>← Screen 1</a>
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
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.blueLight, border: `1px solid ${C.blue}55` }} />
          <span style={{ fontSize: 11, color: C.gray }}>Moved from another screen</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fff', border: `1px solid ${C.border}` }} />
          <span style={{ fontSize: 11, color: C.gray }}>Existing field</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.gray }}>
          OLD: 3 sections, 0 new fields &nbsp;|&nbsp;
          <strong style={{ color: C.orange }}>NEW: 6 sections, +14 new fields, +1 moved here</strong>
        </div>
      </div>

      {/* Side-by-side */}
      <div style={{ display: 'flex', height: 'calc(100vh - 88px)', gap: 0 }}>

        {/* LEFT — OLD */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '3px solid #ddd' }}>
          <div style={{ background: '#4B5563', color: '#fff', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>CURRENT</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Step 2: Channels & Payments</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9CA3AF' }}>3 cards · 6 steps total</span>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: C.bg }}>
            <Sidebar steps={OLD_STEPS} active={1} label="OLD WIZARD" />
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
            <span style={{ fontSize: 13, fontWeight: 600 }}>Screen 3: Channels, Payments & Info</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>6 cards · 9 steps total</span>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: C.bg }}>
            <Sidebar steps={NEW_STEPS} active={2} label="NEW WIZARD" />
            <NewScreen highlight={highlight} />
          </div>
          <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '8px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button data-testid="screen3-save-continue" style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Save & Continue →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
