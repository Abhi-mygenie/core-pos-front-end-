// Screen 1 Side-by-Side Comparison — Old vs New
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
};

// ─── Shared primitives ────────────────────────────────────────────────────────

const NewBadge = () => (
  <span style={{ background: C.orangeLight, color: C.orange, border: `1px solid ${C.orange}30`, fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '1px 6px', borderRadius: 99, marginLeft: 6, verticalAlign: 'middle', textTransform: 'uppercase' }}>
    NEW
  </span>
);

const Card = ({ title, desc, children, accent }) => (
  <div style={{ background: C.white, border: `1.5px solid ${accent ? C.orange + '55' : C.border}`, borderRadius: 12, marginBottom: 16, overflow: 'hidden', boxShadow: accent ? `0 0 0 3px ${C.orange}10` : '0 1px 3px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: accent ? C.orangeLight : C.white }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{title}{accent && <NewBadge />}</div>
      {desc && <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </div>
);

const TRow = ({ label, isNew, hint, type = 'toggle', options }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px solid ${C.border}`,
    background: isNew ? C.orangeLight : 'transparent',
    margin: isNew ? '0 -20px' : '0',
    padding: isNew ? '8px 20px' : '8px 0',
  }}>
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{label}</span>
      {isNew && <NewBadge />}
      {hint && <div style={{ fontSize: 10, color: C.gray, marginTop: 1 }}>{hint}</div>}
    </div>
    {type === 'toggle' && (
      <div style={{ width: 36, height: 20, borderRadius: 10, background: C.green, position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, right: 2 }} />
      </div>
    )}
    {type === 'select' && (
      <select style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px', flexShrink: 0, background: '#fff' }}>
        {(options || []).map(o => <option key={o}>{o}</option>)}
      </select>
    )}
  </div>
);

const Grid2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>{children}</div>
);

const FakeInput = ({ label, req, placeholder, area }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>
      {label}{req && <span style={{ color: C.orange }}> *</span>}
    </label>
    {area
      ? <textarea rows={2} placeholder={placeholder} style={{ width: '100%', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', color: C.gray, resize: 'none', boxSizing: 'border-box' }} readOnly />
      : <input type="text" placeholder={placeholder} style={{ width: '100%', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', color: C.gray, boxSizing: 'border-box' }} readOnly />
    }
  </div>
);

const FileBtn = ({ label }) => (
  <div style={{ border: `1.5px dashed ${C.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, background: C.bg, fontSize: 11, color: C.gray, cursor: 'pointer' }}>
    <span style={{ fontSize: 14 }}>📎</span> {label}
  </div>
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const OLD_STEPS = ['Restaurant Identity', 'Channels & Payments', 'Charges & Tips', 'Order & Kitchen', 'Inventory & Extras', 'Owner Info'];
const NEW_STEPS = ['Basic Settings', 'Channels & Payments', 'Tax & Charges', 'Order & Kitchen', 'Online Ordering', 'Aggregator', 'Inventory', 'Room & Hospitality'];

const Sidebar = ({ steps, active, label }) => (
  <div style={{ width: 180, background: C.white, borderRight: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.orange, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>Restaurant Setup</div>
    </div>
    <div style={{ padding: '8px 10px', flex: 1 }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, marginBottom: 2,
          background: i === 0 ? C.orangeLight : 'transparent',
          borderLeft: i === 0 ? `3px solid ${C.orange}` : '3px solid transparent',
        }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: i === 0 ? C.orange : C.border, color: i === 0 ? '#fff' : C.gray }}>{i + 1}</div>
          <span style={{ fontSize: 10, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? C.orange : C.gray, lineHeight: 1.3 }}>{s}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── OLD Screen 1 ─────────────────────────────────────────────────────────────

const OldScreen = () => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>
    <Card title="Basic Information" desc="Your restaurant's core identity">
      <Grid2>
        <FakeInput label="Restaurant Name" req placeholder="18march" />
        <FakeInput label="Phone Number" req placeholder="9823905119" />
      </Grid2>
      <FakeInput label="Address" req placeholder="Near ICL College, NH-72..." area />
      <FakeInput label="FSSAI License No." placeholder="14-digit FSSAI" />
      <TRow label="Short Code" hint="Enable short code on bills" />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <FileBtn label="Restaurant Logo" />
        <FileBtn label="PDF Menu" />
      </div>
    </Card>

    <Card title="Tax Configuration" desc="GST/VAT affects every bill">
      <TRow label="GST Enabled" hint="Most Indian restaurants need this ON" />
      <Grid2>
        <FakeInput label="GST Number" req placeholder="30AFMPK4601C3G6" />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>GST Mode</label>
          <select style={{ width: '100%', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px' }}>
            <option>Item Level</option><option>Restaurant Level</option>
          </select>
        </div>
      </Grid2>
      <FakeInput label="Tax %" placeholder="4" />
      <TRow label="VAT Enabled" hint="For restaurants using VAT instead of GST" />
    </Card>
  </div>
);

// ─── NEW Screen 1 ─────────────────────────────────────────────────────────────

const NewScreen = () => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>
    {/* Section 1: Restaurant Identity */}
    <Card title="Restaurant Identity" desc="Basic details and branding">
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>
          Restaurant Type <NewBadge />
        </label>
        <select style={{ width: '100%', fontSize: 11, border: `1.5px solid ${C.orange}55`, borderRadius: 6, padding: '6px 10px', background: C.orangeLight }}>
          <option>Normal</option><option>Hotel</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 4 }}>Default Order Status</label>
        <select style={{ width: '100%', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', background: '#fff' }}>
          <option>Serve — Send to waiter</option>
          <option>Ready — Send to kitchen</option>
          <option>Accept — Send to KOT manager</option>
          <option>Bill — Send to cashier</option>
        </select>
      </div>
      <FakeInput label="Restaurant Name" req placeholder="18march" />
      <FakeInput label="Address" req placeholder="Near ICL College, NH-72..." area />
      <Grid2>
        <FakeInput label="FSSAI License No." placeholder="14-digit FSSAI" />
        <FakeInput label="Phone on Bill" placeholder="9999999999" />
      </Grid2>
      <TRow label="Short Code" hint="Enable short code on bills" />

      {/* Logo upload */}
      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Restaurant Logo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid rgba(50,153,55,0.3)`, borderRadius: 8, background: 'rgba(50,153,55,0.04)' }}>
          <span style={{ fontSize: 13 }}>🖼</span>
          <span style={{ fontSize: 11, color: C.dark, flex: 1 }}>Current file</span>
          <span style={{ fontSize: 10, color: C.gray, cursor: 'pointer', textDecoration: 'underline' }}>×</span>
        </div>
      </div>

      {/* PDF Menu — with Copy Link — S3 URL */}
      <div style={{ marginBottom: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>
          PDF Menu <span style={{ fontSize: 10, color: C.gray, fontWeight: 400 }}>(Digital Menu Link)</span>
        </label>
        <div style={{ border: `1px solid rgba(50,153,55,0.3)`, borderRadius: 8, background: 'rgba(50,153,55,0.04)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
            <span style={{ fontSize: 13 }}>📄</span>
            <span style={{ fontSize: 11, color: C.gray, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              s3.amazonaws.com/mygenie-assets/restaurant/menu.pdf
            </span>
            <span style={{ fontSize: 10, color: C.gray, cursor: 'pointer', textDecoration: 'underline' }}>×</span>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, display: 'flex' }}>
            <button style={{ flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 600, color: C.orange, background: 'transparent', border: 'none', borderRight: `1px solid ${C.border}`, cursor: 'pointer' }}>
              📋 Copy Link
            </button>
            <button style={{ flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 600, color: C.dark, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              👁 View Menu
            </button>
          </div>
        </div>
      </div>
    </Card>

    {/* Section 2: Operational Flags — ALL NEW */}
    <Card title="Operational Flags" desc="Automated workflows for orders and delivery" accent>
      <Grid2>
        <TRow label="Auto-Settle Prepaid" hint="Auto-settle prepaid on confirm" isNew />
        <TRow label="Auto Dispatch Delivery" hint="Auto-assign delivery on accept" isNew />
        <TRow label="Orders Auto-Paid" hint="Mark orders as paid automatically" isNew />
      </Grid2>
    </Card>

    {/* Section 3: Display & UI */}
    <Card title="Display & UI" desc="Control what staff and customers see">
      <Grid2>
        <TRow label="Show Popular Category" />
        <TRow label="Show Food Variance" />
        <TRow label="Show AC/Non-AC Menu" />
        <TRow label="Food Date Tracking" />
        <TRow label="Food Level Notes" />
        <TRow label="Show App Banner" hint="Banner in customer app" isNew />
        <TRow label="Category Box UI" hint="Category tiles on order screen" isNew />
      </Grid2>
    </Card>

    {/* Section 4: CRM & Loyalty — ALL NEW */}
    <Card title="CRM & Loyalty" desc="Customer retention and reward programs" accent>
      <Grid2>
        <TRow label="Loyalty Programme" hint="Points-based loyalty rewards" isNew />
        <TRow label="Customer Wallet" hint="Customer wallet balance" isNew />
        <TRow label="Coupon Programme" hint="Coupon redemption at POS" isNew />
      </Grid2>
    </Card>
  </div>
);

// ─── Main Comparison Page ─────────────────────────────────────────────────────

export default function Screen1Comparison() {
  const [highlight, setHighlight] = useState(true);

  return (
    <div style={{ minHeight: '100vh', background: '#EAEAEA', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top banner */}
      <div style={{ background: C.dark, color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 11, color: '#aaa', marginRight: 8 }}>CR-132 Design Review</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Screen 1 — Basic Settings: Before vs After</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ccc', cursor: 'pointer' }}>
            <input type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} />
            Highlight NEW fields
          </label>
          <a href="/settings-preview" style={{ fontSize: 11, color: C.orange, textDecoration: 'none' }}>← All screens preview</a>
        </div>
      </div>

      {/* Legend */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', display: 'flex', gap: 24, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.orangeLight, border: `1px solid ${C.orange}55` }} />
          <span style={{ fontSize: 11, color: C.gray }}>New field / section</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fff', border: `1px solid ${C.border}` }} />
          <span style={{ fontSize: 11, color: C.gray }}>Existing field</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.gray }}>
          OLD: 2 sections, 0 new fields &nbsp;|&nbsp; <strong style={{ color: C.orange }}>NEW: 4 sections, +13 new fields, +2 moved here</strong>
        </div>
      </div>

      {/* Side-by-side panels */}
      <div style={{ display: 'flex', height: 'calc(100vh - 88px)', gap: 0 }}>

        {/* ── LEFT: OLD ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '3px solid #ddd' }}>
          <div style={{ background: '#4B5563', color: '#fff', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>CURRENT</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Step 1: Restaurant Identity</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9CA3AF' }}>2 cards · 6 steps total</span>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: C.bg }}>
            <Sidebar steps={OLD_STEPS} label="OLD WIZARD" />
            <OldScreen />
          </div>
          <div style={{ background: '#374151', padding: '8px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Save & Continue →
            </button>
          </div>
        </div>

        {/* ── RIGHT: NEW ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: C.orange, color: '#fff', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 99 }}>PROPOSED</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Screen 1: Basic Settings</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>4 cards · 8 steps total</span>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: C.bg }}>
            <Sidebar steps={NEW_STEPS} label="NEW WIZARD" />
            <NewScreen />
          </div>
          <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '8px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Save & Continue →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
