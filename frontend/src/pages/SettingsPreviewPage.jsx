// CR-132 Design Preview — shows proposed new field layout across all 6 steps
import React, { useState } from 'react';

const C = {
  orange: '#F26B33',
  green: '#329937',
  dark: '#1A1A2E',
  gray: '#6B7280',
  border: '#E5E7EB',
  bg: '#F7F7F7',
  newField: 'rgba(242,107,51,0.08)',
  newBorder: 'rgba(242,107,51,0.35)',
};

const Badge = ({ label, color = C.orange }) => (
  <span style={{ background: `${color}18`, color, border: `1px solid ${color}40`, fontSize: 10, padding: '1px 7px', borderRadius: 99, fontWeight: 700, marginLeft: 6, verticalAlign: 'middle' }}>
    {label}
  </span>
);

const SectionCard = ({ title, desc, children, isNew }) => (
  <div style={{
    background: '#fff', border: `1.5px solid ${isNew ? C.newBorder : C.border}`,
    borderRadius: 12, padding: '20px 24px', marginBottom: 20,
    boxShadow: isNew ? `0 0 0 3px ${C.newField}` : '0 1px 3px rgba(0,0,0,0.06)',
  }}>
    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>
        {title} {isNew && <Badge label="NEW" />}
      </div>
      {desc && <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{desc}</div>}
    </div>
    {children}
  </div>
);

const Row = ({ label, type = 'toggle', hint, isNew, options }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px dashed ${C.border}`,
    background: isNew ? C.newField : 'transparent',
    margin: isNew ? '0 -24px' : '0',
    padding: isNew ? '10px 24px' : '10px 0',
  }}>
    <div>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{label}</span>
      {isNew && <Badge label="NEW" />}
      {hint && <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{hint}</div>}
    </div>
    {type === 'toggle' && (
      <div style={{ width: 40, height: 22, borderRadius: 11, background: C.green, position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, right: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    )}
    {type === 'select' && (
      <select style={{ fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', color: C.dark, background: '#fff', flexShrink: 0 }}>
        {(options || []).map(o => <option key={o}>{o}</option>)}
      </select>
    )}
    {type === 'number' && (
      <input type="number" defaultValue={0} style={{ width: 80, fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', flexShrink: 0 }} />
    )}
    {type === 'text' && (
      <input type="text" defaultValue="Service Charge" style={{ width: 140, fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', flexShrink: 0 }} />
    )}
  </div>
);

const STEPS = [
  { id: 1, title: 'Restaurant Identity', new: 6 },
  { id: 2, title: 'Channels & Payments', new: 15 },
  { id: 3, title: 'Charges & Tips', new: 1 },
  { id: 4, title: 'Order & Kitchen', new: 14 },
  { id: 5, title: 'Inventory & Extras', new: 1 },
  { id: 6, title: 'Owner Info', new: 0 },
];

const Step1 = () => (
  <div>
    <SectionCard title="Basic Information" desc="Existing — name, phone, address, FSSAI, logo">
      <Row label="Restaurant Name" type="text" hint="Already wired" />
      <Row label="Phone Number" type="text" />
      <Row label="Short Code" />
      <Row label="Logo / PDF Menu" type="text" hint="File upload" />
    </SectionCard>
    <SectionCard title="Tax Configuration" desc="Existing — GST, VAT">
      <Row label="GST Enabled" />
      <Row label="VAT Enabled" />
    </SectionCard>
    <SectionCard title="App & Display" desc="New settings for restaurant type and display behaviour" isNew>
      <Row label="Restaurant Type" type="select" options={['Normal', 'Hotel']} hint="OD-6: Normal confirmed value; Hotel and others TBD" isNew />
      <Row label="Show App Banner" hint="Show promotional banner in customer-facing app" isNew />
      <Row label="Category Box UI" hint="Show category tiles on order screen" isNew />
      <Row label="Show GST to Customers" hint="Display GST breakdown on customer bills" isNew />
      <Row label="Delivery Charge GST %" type="number" hint="GST applied on delivery charges" isNew />
      <Row label="Service Charge Label" type="text" hint='OD-11: Free text e.g. "Service Charge" / "Cover Charge"' isNew />
    </SectionCard>
  </div>
);

const Step2 = ({ roomOn, setRoomOn }) => (
  <div>
    <SectionCard title="Service Channels" desc="Existing — Dine-in, Takeaway, Delivery, Room">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        {['Dine-in', 'Takeaway', 'Delivery'].map(ch => (
          <div key={ch} style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${C.green}`, background: 'rgba(50,153,55,0.06)', fontSize: 13, fontWeight: 600, color: C.green }}>{ch}</div>
        ))}
        <div onClick={() => setRoomOn(!roomOn)} style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${roomOn ? C.green : C.border}`, background: roomOn ? 'rgba(50,153,55,0.06)' : '#fff', fontSize: 13, fontWeight: 600, color: roomOn ? C.green : C.gray, cursor: 'pointer' }}>
          Room {roomOn ? '✓' : '(click to toggle)'}
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>⚠ REGRESSION FIX: <code>room</code> field moved from <code>advanced{}</code> → <code>basic{}</code>. Must fix in transform before Gate 3.</div>
    </SectionCard>
    <SectionCard title="Payment Methods" desc="Existing — Cash, UPI, Card, Tab">
      <Row label="UPI ID" type="text" hint="Existing" />
      <Row label="Dynamic UPI Value" hint="Existing" />
    </SectionCard>
    <SectionCard title="Online Payment per Channel" desc="Existing">
      <Row label="Walk-in / Dine-in / Takeaway / Delivery" type="toggle" hint="Existing toggles" />
    </SectionCard>

    <SectionCard title="Online & Menu" desc="Control online ordering and menu presentation" isNew>
      <Row label="Online Orders Enabled" hint="Master switch for online ordering platform" isNew />
      <Row label="Multiple Menus" hint="Allow different menus per channel or time slot" isNew />
    </SectionCard>

    {roomOn && (
      <SectionCard title="Room Settings" desc="Shown only when Room channel is ON — conditional render" isNew>
        <div style={{ fontSize: 11, background: 'rgba(50,153,55,0.08)', border: '1px solid rgba(50,153,55,0.3)', borderRadius: 6, padding: '6px 10px', marginBottom: 12, color: C.green }}>
          ✓ Conditional — visible only when Room channel toggle is ON
        </div>
        <Row label="Billing Included in Room" hint="Room charge auto-adds to bill" isNew />
        <Row label="Require OTP for Room" hint="Guest must enter OTP to view/confirm room order" isNew />
        <Row label="Room Custom Pricing" hint="Room channel uses different food prices" isNew />
        <Row label="Room GST Applicable" hint="Apply GST on room orders (was OD-4 deferred, now in basic{})" isNew />
        <Row label="Pay Via Room" hint="Allow settling bill to room account" isNew />
      </SectionCard>
    )}
    {!roomOn && (
      <div style={{ border: `1.5px dashed ${C.border}`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, color: C.gray, fontSize: 13, textAlign: 'center' }}>
        Room Settings card hidden — turn Room channel ON above to see it
      </div>
    )}

    <SectionCard title="Guest & Access" desc="OTP gates, guest data, staff access controls" isNew>
      <Row label="Require OTP for Dine-in" isNew />
      <Row label="Collect Guest Details" hint="Name/phone for walkin guests" isNew />
      <Row label="Show Booking Details" isNew />
      <Row label="Enable Billing by Employee" hint="OD-12: use billing_employee, ignore billing_emp alias" isNew />
      <Row label="Role-Based Discount" hint="Different discount limits per staff role" isNew />
      <Row label="Coupon Programme" hint="Enable coupon redemption at POS" isNew />
      <Row label="Dine-in Table Number" hint="Show dine-in number on KOT" isNew />
      <Row label="Different Price by Channel" hint="Food price varies by dine-in/takeaway/delivery" isNew />
    </SectionCard>

    <SectionCard title="Auto-Payment & Loyalty" desc="Payment automation and customer programme flags" isNew>
      <Row label="Auto-Settle Prepaid Orders" hint="HIGH risk — OD-3 confirmed" isNew />
      <Row label="Orders Auto-Paid" hint="HIGH risk — mark orders paid automatically. 0/1 integer" isNew />
      <Row label="Auto Dispatch Delivery" hint="Automatically assign delivery agent" isNew />
      <Row label="Loyalty Programme" hint="OD-5: adds write path — runtime read stays in profileTransform" isNew />
      <Row label="Customer Wallet" hint="OD-5: adds write path" isNew />
    </SectionCard>
  </div>
);

const Step3 = () => (
  <div>
    <SectionCard title="Service Charge" desc="Existing">
      <Row label="Service Charge" />
      <Row label="Auto Service Charge" />
      <Row label="Service Charge %" type="number" />
    </SectionCard>
    <SectionCard title="Tips & Discounts" desc="Existing">
      <Row label="Enable Tips" />
      <Row label="Discounts Available" />
      <Row label="Total Rounding" />
    </SectionCard>
    <SectionCard title="Other Charges" desc="Additional per-order charges" isNew>
      <Row label="Takeaway Charges (₹)" type="number" hint="Extra flat charge on every takeaway order" isNew />
    </SectionCard>
  </div>
);

const Step4 = () => (
  <div>
    <SectionCard title="Order Workflow" desc="Existing">
      <Row label="Default Order Status" type="select" options={['Ready', 'Serve', 'Accept', 'Bill']} />
      <Row label="Print KOT" />
      <Row label="Auto Print Bill" />
      <Row label="Voice in KDS" />
    </SectionCard>
    <SectionCard title="Display Preferences" desc="Existing">
      <Row label="Real-Time Order Status" />
      <Row label="Show Scan Pop Up" />
      <Row label="Search By" type="text" hint="Existing chip selector" />
    </SectionCard>

    <SectionCard title="Printing" desc="Copies, KDS printing, token numbers" isNew>
      <Row label="Print Customer Bill Copy" isNew />
      <Row label="KOT Copies" type="select" options={['1', '2', '3']} hint="OD-10: string dropdown 1/2/3" isNew />
      <Row label="Bill Copies" type="select" options={['1', '2', '3']} hint="OD-10: string dropdown 1/2/3" isNew />
      <Row label="Print in KDS" isNew />
      <Row label="Token Number on KOT/Bill" isNew />
    </SectionCard>

    <SectionCard title="Order Tones & Aggregator" desc="Sound settings and aggregator automation" isNew>
      <Row label="Confirm Order Tone" type="select" options={['default', 'buzzer']} hint="OD-7: only 2 values known" isNew />
      <Row label="Aggregator Order Tone" type="select" options={['default', 'buzzer']} hint="OD-7" isNew />
      <Row label="Aggregator Auto KOT" isNew />
      <Row label="Aggregator Auto Bill" isNew />
      <Row label="Auto Bill Stage" type="select" options={['Ready', 'Served']} hint="OD-8: only 'Ready' seen" isNew />
    </SectionCard>

    <SectionCard title="Scheduling & Flow" desc="Order scheduling, language, location detection" isNew>
      <Row label="Schedule Orders" hint="Allow customers to pre-schedule orders" isNew />
      <Row label="Show Confirm Order Tab" isNew />
      <Row label="KOT Language" type="select" options={['English', 'Hindi']} hint="OD-7: English confirmed; Hindi TBD" isNew />
      <Row label="Location Mode" type="select" options={['scanner', 'gps']} hint="OD-9: scanner confirmed" isNew />
      <Row label="Auto Serve Orders" hint="HIGH risk — auto-marks orders as served" isNew />
    </SectionCard>

    <SectionCard title="Prep Time" desc="Kitchen preparation time configuration" isNew>
      <Row label="Default Prep Time (min)" type="number" hint="Default: 15 mins" isNew />
      <Row label="Prep Time Method" type="select" options={['quantity', 'time']} hint="OD-9: quantity confirmed" isNew />
      <Row label="Auto Acknowledge Prep Time" isNew />
    </SectionCard>
  </div>
);

const Step5 = () => (
  <div>
    <SectionCard title="Inventory Management" desc="Existing + 1 new field">
      <Row label="Inventory Tracking" />
      <Row label="Allow Negative Inventory" />
      <Row label="Inventory Alert Number" type="text" />
      <Row label="Auto Accept Inventory" hint="OD-13 suggested: show toggle here. Auto-accept incoming stock transfers" isNew />
    </SectionCard>
    <SectionCard title="Billing & Contact" desc="Existing">
      <Row label="Phone on Bill" type="text" />
      <Row label="Settlement Report" />
    </SectionCard>
    <SectionCard title="Feedback & Links" desc="Existing">
      <Row label="Feedback Collection" />
      <Row label="Online Ordering Link" type="text" />
    </SectionCard>
  </div>
);

const Step6 = () => (
  <div>
    <SectionCard title="Owner / Vendor Details" desc="Existing — no new fields">
      <Row label="First Name" type="text" />
      <Row label="Last Name" type="text" />
      <Row label="Phone" type="text" />
    </SectionCard>
    <div style={{ background: 'rgba(50,153,55,0.05)', border: '1px solid rgba(50,153,55,0.2)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>✓ No new fields in Step 6</div>
    </div>
  </div>
);

export default function SettingsPreviewPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [roomOn, setRoomOn] = useState(true);

  const stepContent = [null, <Step1 />, <Step2 roomOn={roomOn} setRoomOn={setRoomOn} />, <Step3 />, <Step4 />, <Step5 />, <Step6 />];
  const newCounts = [0, 6, 15, 1, 14, 1, 0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: '#fff', borderRight: `1px solid ${C.border}`, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: 1, marginBottom: 4 }}>CR-132 DESIGN PREVIEW</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Settings Wizard</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>New fields highlighted in orange. Click any step to jump to it.</div>
        </div>

        <div style={{ padding: '0 12px' }}>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => setActiveStep(s.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, marginBottom: 4, border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeStep === s.id ? 'rgba(242,107,51,0.08)' : 'transparent',
              borderLeft: activeStep === s.id ? `3px solid ${C.orange}` : '3px solid transparent',
            }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, background: activeStep === s.id ? C.orange : C.border, color: activeStep === s.id ? '#fff' : C.gray }}>
                {s.id}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: activeStep === s.id ? C.orange : C.dark }}>{s.title}</div>
                {s.new > 0 && <div style={{ fontSize: 10, color: C.orange, fontWeight: 700 }}>+{s.new} new fields</div>}
                {s.new === 0 && <div style={{ fontSize: 10, color: C.gray }}>No changes</div>}
              </div>
            </button>
          ))}
        </div>

        <div style={{ margin: '16px 16px 0', padding: 12, background: C.bg, borderRadius: 8, fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: C.dark, marginBottom: 6 }}>Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: C.newField, border: `1px solid ${C.newBorder}` }} />
            <span style={{ color: C.gray }}>NEW field (orange highlight)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(50,153,55,0.1)', border: '1px solid rgba(50,153,55,0.3)' }} />
            <span style={{ color: C.gray }}>Existing field</span>
          </div>
        </div>

        <div style={{ margin: '12px 16px', padding: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: 3 }}>⚠ Critical Regression</div>
          <div style={{ color: '#6B7280' }}><code>room</code> field: must move read/write from <code>advanced</code> → <code>basic</code> in transform. Live bug today.</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>Step {activeStep}: {STEPS[activeStep - 1].title}</div>
            <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
              {newCounts[activeStep] > 0
                ? <span style={{ color: C.orange, fontWeight: 600 }}>{newCounts[activeStep]} new fields proposed</span>
                : <span>No new fields in this step</span>}
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.gray }}>
            Total new fields: <strong style={{ color: C.orange }}>37 UI + 3 pass-through = 40</strong>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 80px' }}>
          {stepContent[activeStep]}
        </div>

        {/* Bottom bar */}
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: `1px solid ${C.border}`, padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setActiveStep(Math.max(1, activeStep - 1))} style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.gray, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
          <span style={{ fontSize: 12, color: C.gray }}>
            This is a <strong>design preview only</strong> — no data is saved
          </span>
          <button onClick={() => setActiveStep(Math.min(6, activeStep + 1))} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
        </div>
      </div>
    </div>
  );
}
