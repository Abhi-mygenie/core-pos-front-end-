// CR-132 Design Review — Printable All Screens Summary
import React from 'react';

const C = {
  orange: '#F26B33', orangeLight: '#FDF0EB',
  green: '#329937', dark: '#1A1A2E',
  gray: '#6B7280', border: '#E5E7EB',
  bg: '#F7F7F7', white: '#FFFFFF',
  blue: '#3B82F6', blueLight: '#EBF5FF',
};

// ─── Print CSS injected into <head> ──────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    body { margin: 0; padding: 0; }
    .no-print { display: none !important; }
    .page-break { page-break-after: always; break-after: page; }
    .print-page { page-break-inside: avoid; break-inside: avoid; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  @page { size: A4 landscape; margin: 12mm 10mm; }
`;

// ─── Badges ───────────────────────────────────────────────────────────────────
const Badge = ({ text, bg, color }) => (
  <span style={{ background: bg, color, border: `1px solid ${color}30`, fontSize: 8, fontWeight: 800, letterSpacing: 0.8, padding: '1px 5px', borderRadius: 99, marginLeft: 5, verticalAlign: 'middle', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
    {text}
  </span>
);
const NewBadge = () => <Badge text="NEW" bg={C.orangeLight} color={C.orange} />;
const MovedBadge = ({ label = 'MOVED' }) => <Badge text={label} bg={C.blueLight} color={C.blue} />;
const ConsolidatedBadge = () => <Badge text="CONSOLIDATED" bg="#F0FFF4" color="#059669" />;
const PendingBadge = () => <Badge text="CR-133 PENDING" bg="#FFFBEB" color="#D97706" />;
const CondBadge = () => <Badge text="CONDITIONAL" bg="#F5F3FF" color="#7C3AED" />;

// ─── Field row ────────────────────────────────────────────────────────────────
const Field = ({ label, badge, hint, faded }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}`, opacity: faded ? 0.4 : 1 }}>
    <div style={{ flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: faded ? C.gray : C.dark }}>{label}</span>
      {badge}
      {hint && <div style={{ fontSize: 9, color: C.gray, marginTop: 1 }}>{hint}</div>}
    </div>
  </div>
);

// ─── Section block ────────────────────────────────────────────────────────────
const Section = ({ title, allNew, fields }) => (
  <div style={{ marginBottom: 10, border: `1px solid ${allNew ? C.orange + '55' : C.border}`, borderRadius: 8, overflow: 'hidden' }}>
    <div style={{ padding: '5px 10px', background: allNew ? C.orangeLight : '#F9FAFB', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.dark }}>{title}</span>
      {allNew && <NewBadge />}
    </div>
    <div style={{ padding: '4px 10px' }}>
      {fields.map((f, i) => <Field key={i} {...f} />)}
    </div>
  </div>
);

// ─── Two-column layout ────────────────────────────────────────────────────────
const ColGrid = ({ left, right }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
    <div>{left}</div>
    <div>{right}</div>
  </div>
);

// ─── Screen page wrapper ──────────────────────────────────────────────────────
const ScreenPage = ({ num, title, desc, oldLabel, newLabel, isConditional, children, last }) => (
  <div className={last ? 'print-page' : 'print-page page-break'} style={{ background: C.white, padding: '16px 20px 12px', fontFamily: 'system-ui, sans-serif' }}>
    {/* Page header */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${C.orange}`, paddingBottom: 8, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{num}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>{title} {isConditional && <CondBadge />}</div>
          <div style={{ fontSize: 10, color: C.gray }}>{desc}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 9, color: C.gray, fontWeight: 600, letterSpacing: 1 }}>CR-132 Design Review</div>
        <div style={{ fontSize: 9, color: C.gray }}>MyGenie POS — Restaurant Settings Wizard</div>
      </div>
    </div>
    {/* Column headers */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 8 }}>
      <div style={{ padding: '4px 10px', background: '#4B5563', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, background: '#6B7280', padding: '1px 6px', borderRadius: 99, color: '#fff' }}>CURRENT</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>{oldLabel}</span>
      </div>
      <div style={{ padding: '4px 10px', background: C.orange, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.3)', padding: '1px 6px', borderRadius: 99, color: '#fff' }}>PROPOSED</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>{newLabel}</span>
      </div>
    </div>
    {children}
  </div>
);

// ─── TITLE PAGE ───────────────────────────────────────────────────────────────
const TitlePage = () => (
  <div className="print-page page-break" style={{ background: C.white, padding: '40px 40px', fontFamily: 'system-ui, sans-serif', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.orange, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>CR-132 · MyGenie POS · Design Review</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: C.dark, lineHeight: 1.2, marginBottom: 12 }}>Restaurant Settings Wizard<br />Redesign — All Screens</div>
      <div style={{ fontSize: 13, color: C.gray, maxWidth: 500 }}>Side-by-side field-level comparison of the existing 6-step wizard versus the proposed 9-screen wizard. Every new, moved, or consolidated field is highlighted.</div>
    </div>

    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Screen Architecture</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { n: 1, title: 'Basic Settings', status: '✅ Reviewed' },
          { n: 2, title: 'Printer Setup', status: '⏸ Deferred (CR-133)', col: '#D97706', bg: '#FFFBEB' },
          { n: 3, title: 'Channels & Info', status: 'In review' },
          { n: 4, title: 'Tax & Charges', status: 'In review' },
          { n: 5, title: 'Order & Kitchen', status: 'In review' },
          { n: 6, title: 'Online Ordering', status: 'In review' },
          { n: 7, title: 'Aggregator', status: 'In review' },
          { n: 8, title: 'Inventory', status: 'In review' },
          { n: 9, title: 'Room & Hospitality', status: 'Conditional (room=ON)', col: '#7C3AED', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.n} style={{ background: s.bg || C.bg, border: `1px solid ${s.col ? s.col + '55' : C.border}`, borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: s.col || C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.col || C.dark }}>{s.title}</div>
                <div style={{ fontSize: 9, color: C.gray }}>{s.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
        {[
          { bg: C.orangeLight, col: C.orange, label: 'New field — added in this redesign' },
          { bg: C.blueLight, col: C.blue, label: 'Moved — relocated from another screen' },
          { bg: '#F0FFF4', col: '#059669', label: 'Consolidated — merged from multiple steps' },
          { bg: '#FFFBEB', col: '#D97706', label: 'Pending — awaiting CR-133 backend decision' },
          { bg: '#F5F3FF', col: '#7C3AED', label: 'Conditional — shown only when enabled' },
        ].map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: b.bg, border: `1px solid ${b.col}55`, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: C.gray }}>{b.label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: C.gray }}>Generated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} · Branch: printer · Repo: core-pos-front-end</div>
    </div>
  </div>
);

// ─── SCREEN CONTENT DEFINITIONS ───────────────────────────────────────────────

export default function CR132PrintPage() {
  return (
    <div style={{ background: '#EAEAEA', fontFamily: 'system-ui, sans-serif' }}>
      <style>{PRINT_CSS}</style>

      {/* Print button */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 999, display: 'flex', gap: 10, alignItems: 'center' }}>
        <a href="/screen1-compare" style={{ fontSize: 11, color: C.orange, textDecoration: 'none', padding: '7px 14px', border: `1px solid ${C.orange}`, borderRadius: 8 }}>← Back to Screens</a>
        <button
          onClick={() => window.print()}
          style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(242,107,51,0.4)' }}
        >
          Print / Save as PDF
        </button>
      </div>

      <TitlePage />

      {/* ── S1: Basic Settings ── */}
      <ScreenPage num="1" title="Basic Settings" desc="Restaurant identity, operational flags, display settings, CRM & loyalty" oldLabel="Step 1: Restaurant Identity" newLabel="Screen 1: Basic Settings">
        <ColGrid
          left={<>
            <Section title="Basic Information" fields={[
              { label: 'Restaurant Name', hint: 'required' },
              { label: 'Phone Number' },
              { label: 'Address', hint: 'required' },
              { label: 'FSSAI License No.' },
              { label: 'Short Code' },
              { label: 'Restaurant Logo', hint: 'file upload' },
              { label: 'PDF Menu', hint: 'file upload' },
            ]} />
            <Section title="Tax Configuration" fields={[
              { label: 'GST Enabled' },
              { label: 'GST Number + Mode + Tax %', hint: 'conditional' },
              { label: 'VAT Enabled' },
            ]} />
          </>}
          right={<>
            <Section title="Restaurant Identity" fields={[
              { label: 'Restaurant Type', badge: <NewBadge />, hint: 'Normal / Hotel' },
              { label: 'Default Order Status', badge: <MovedBadge label="FROM STEP 4" />, hint: 'Serve / Ready / Accept / Bill' },
              { label: 'Restaurant Name', hint: 'required' },
              { label: 'Address', hint: 'required' },
              { label: 'FSSAI License No.' },
              { label: 'Phone on Bill', badge: <MovedBadge label="FROM STEP 5" /> },
              { label: 'Short Code' },
              { label: 'Restaurant Logo', hint: 'file upload → S3' },
              { label: 'PDF Menu (Digital Menu Link)', hint: 'with Copy Link + View Menu' },
            ]} />
            <Section title="Operational Flags" allNew fields={[
              { label: 'Auto-Settle Prepaid', badge: <NewBadge /> },
              { label: 'Auto Dispatch Delivery', badge: <NewBadge /> },
              { label: 'Orders Auto-Paid', badge: <NewBadge /> },
            ]} />
            <Section title="Display & UI" fields={[
              { label: 'Show Popular Category' }, { label: 'Show Food Variance' }, { label: 'Show AC/Non-AC Menu' },
              { label: 'Food Date Tracking' }, { label: 'Food Level Notes' },
              { label: 'Show App Banner', badge: <NewBadge /> }, { label: 'Category Box UI', badge: <NewBadge /> },
            ]} />
            <Section title="CRM & Loyalty" allNew fields={[
              { label: 'Loyalty Programme', badge: <NewBadge /> },
              { label: 'Customer Wallet', badge: <NewBadge /> },
              { label: 'Coupon Programme', badge: <NewBadge /> },
            ]} />
          </>}
        />
      </ScreenPage>

      {/* ── S3: Channels, Payments & Info ── */}
      <ScreenPage num="3" title="Channels, Payments & Info" desc="Service channels, payment methods, contact details, settlement, owner info" oldLabel="Step 2: Channels & Payments" newLabel="Screen 3: Channels, Payments & Info">
        <ColGrid
          left={<>
            <Section title="Service Channels (chip selectors)" fields={[
              { label: 'Dine-in' }, { label: 'Takeaway' }, { label: 'Delivery' }, { label: 'Room' },
            ]} />
            <Section title="Payment Methods (chip selectors)" fields={[
              { label: 'Cash / UPI / Card / Tab / Online' },
              { label: 'UPI ID input' }, { label: 'Dynamic UPI Value' },
              { label: 'Show Cash on Delivery' }, { label: 'Order Payment Type' },
            ]} />
            <Section title="Online Payment per Channel" fields={[
              { label: 'Walk-in / Dine-in / Takeaway / Delivery Online Payment' },
            ]} />
          </>}
          right={<>
            <Section title="Service Channels" fields={[
              { label: 'Dine-in / Takeaway / Delivery / Room' },
              { label: 'Online Orders', badge: <NewBadge /> }, { label: 'Multiple Menus', badge: <NewBadge /> },
              { label: 'Different Prices per Channel', badge: <NewBadge /> }, { label: 'Dine-in Number', badge: <NewBadge /> },
              { label: 'Dine-in OTP Required', badge: <NewBadge /> },
            ]} />
            <Section title="Payment Methods" fields={[
              { label: 'Cash / UPI / Card / Tab / Online' },
              { label: 'Role-Based Discount', badge: <NewBadge /> },
              { label: 'UPI ID / Dynamic UPI / Cash on Delivery / Payment Type' },
            ]} />
            <Section title="Contact & Delivery" allNew fields={[
              { label: 'Phone Number', badge: <MovedBadge label="FROM SCREEN 1" /> },
              { label: 'Report Phone Number', badge: <NewBadge /> },
              { label: 'Delivery Contact / Delivery Person Name', badge: <NewBadge /> },
            ]} />
            <Section title="Settlement & Feedback" allNew fields={[
              { label: 'Settlement Report', badge: <NewBadge /> }, { label: 'Feedback toggle', badge: <NewBadge /> },
              { label: 'Send Feedback Link', badge: <NewBadge /> }, { label: 'Feedback URL', badge: <NewBadge /> },
            ]} />
            <Section title="Owner Info" allNew fields={[
              { label: 'First Name / Last Name / Owner Phone', badge: <MovedBadge label="FROM STEP 6" /> },
            ]} />
          </>}
        />
      </ScreenPage>

      {/* ── S4: Tax & Charges ── */}
      <ScreenPage num="4" title="Tax & Charges" desc="GST, VAT, service charge, delivery charges, tips, rounding" oldLabel="Step 1 (Tax) + Step 3 (Charges) — two separate steps" newLabel="Screen 4: Tax & Charges — consolidated">
        <ColGrid
          left={<>
            <Section title="Tax Configuration (Step 1)" fields={[
              { label: 'GST Enabled → GST Number, GST Mode, Tax %' },
              { label: 'VAT Enabled → VAT Code' },
            ]} />
            <Section title="Service Charge & Tips (Step 3)" fields={[
              { label: 'Service Charge → Auto Service Charge, SC%, SC Tax%' },
              { label: 'Enable Tips' }, { label: 'Discounts Available' }, { label: 'Total Rounding' },
            ]} />
          </>}
          right={<>
            <Section title="GST" fields={[
              { label: 'GST Enabled → GST Number, GST Mode, Tax %' },
              { label: 'Show GST to Customers', badge: <NewBadge /> },
            ]} />
            <Section title="VAT" fields={[
              { label: 'VAT Enabled → VAT Code' },
            ]} />
            <Section title="Service Charge" fields={[
              { label: 'Service Charge → Auto SC, SC%, SC Tax%' },
              { label: 'Service Charge Label', badge: <NewBadge />, hint: 'Custom label e.g. "Staff Gratuity"' },
            ]} />
            <Section title="Other Charges & Rounding" fields={[
              { label: 'Delivery Charge GST %', badge: <NewBadge />, hint: 'Typically 5%' },
              { label: 'Takeaway Charges (₹)', badge: <NewBadge /> },
              { label: 'Enable Tips / Total Rounding / Discounts Available', badge: <ConsolidatedBadge /> },
            ]} />
          </>}
        />
      </ScreenPage>

      {/* ── S5: Order & Kitchen ── */}
      <ScreenPage num="5" title="Order & Kitchen" desc="Order workflow, KDS, KOT, scheduling and prep time" oldLabel="Step 4: Order & Kitchen" newLabel="Screen 5: Order & Kitchen">
        <ColGrid
          left={<>
            <Section title="Order & Kitchen (Step 4)" fields={[
              { label: 'Default Order Status', hint: 'moved to Screen 1' }, { label: 'Serve Item Display' },
              { label: 'Print KOT' }, { label: 'Auto Print Bill' }, { label: 'Cancel After Serve' },
              { label: 'Voice in KDS' }, { label: 'Real-Time Order Status' }, { label: 'Confirm Web Orders' },
              { label: 'Show Scan Pop Up' },
            ]} />
            <Section title="Display fields (moving to Screen 1)" fields={[
              { label: 'Show Popular Category', faded: true }, { label: 'Food Level Notes', faded: true },
              { label: 'Show Food Variance', faded: true }, { label: 'Show AC/Non-AC Menu', faded: true },
              { label: 'Food Date Tracking', faded: true },
            ]} />
          </>}
          right={<>
            <Section title="Order Workflow" fields={[
              { label: 'Print KOT / Auto Print Bill / Cancel After Serve' },
              { label: 'Serve Item Display' },
              { label: 'Order Auto Serve', badge: <NewBadge /> },
              { label: 'Schedule Orders', badge: <NewBadge /> },
            ]} />
            <Section title="Kitchen Display (KDS)" fields={[
              { label: 'Voice in KDS / Real-Time Order Status' },
              { label: 'KOT Language', badge: <NewBadge /> },
              { label: 'Token Number on KOT/Bill', badge: <NewBadge /> },
            ]} />
            <Section title="Scanner & Location" fields={[
              { label: 'Show Scan Pop Up', badge: <MovedBadge label="FROM STEP 4" /> },
              { label: 'Scanner Location', badge: <NewBadge /> },
            ]} />
            <Section title="Scheduling & Prep Time" allNew fields={[
              { label: 'Default Prep Time (min)', badge: <NewBadge /> },
              { label: 'Prep Time Count Method', badge: <NewBadge /> },
              { label: 'Auto Acknowledge Prep Time', badge: <NewBadge /> },
            ]} />
          </>}
        />
      </ScreenPage>

      {/* ── S6: Online Ordering ── */}
      <ScreenPage num="6" title="Online Ordering" desc="Web/app order confirmation, tones, scan popup, online link" oldLabel="Scattered in Steps 4 + 5 — no dedicated screen" newLabel="Screen 6: Online Ordering — new dedicated screen">
        <ColGrid
          left={<>
            <Section title="From Step 4" fields={[
              { label: 'Confirm Web Orders' }, { label: 'Show Scan Pop Up' },
            ]} />
            <Section title="From Step 5" fields={[
              { label: 'Online Ordering Link', hint: 'URL for customer ordering' },
            ]} />
            <div style={{ padding: '12px', background: C.bg, borderRadius: 8, border: `1px dashed ${C.border}`, marginTop: 8 }}>
              <span style={{ fontSize: 10, color: C.gray }}>No dedicated screen existed for online ordering configuration in the old wizard.</span>
            </div>
          </>}
          right={<>
            <Section title="Confirm & Scan Orders" fields={[
              { label: 'Confirm Web Orders', badge: <MovedBadge label="FROM STEP 4" /> },
              { label: 'Show Scan Pop Up', badge: <MovedBadge label="FROM STEP 4" /> },
            ]} />
            <Section title="Confirm Order Tone" allNew fields={[
              { label: 'Confirm Order Tone', badge: <NewBadge />, hint: 'Default / Buzzer / Chime / Silent' },
              { label: 'Show Confirm Order Tab', badge: <NewBadge /> },
            ]} />
            <Section title="Online Ordering Link" fields={[
              { label: 'Online Ordering Link', badge: <MovedBadge label="FROM STEP 5" /> },
            ]} />
          </>}
        />
      </ScreenPage>

      {/* ── S7: Aggregator ── */}
      <ScreenPage num="7" title="Aggregator" desc="Zomato/Swiggy auto-KOT/bill, tones, prep time" oldLabel="No dedicated screen in old wizard" newLabel="Screen 7: Aggregator — entirely new">
        <ColGrid
          left={<>
            <div style={{ padding: '20px', background: C.bg, borderRadius: 8, border: `1px dashed ${C.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8, color: C.gray }}>—</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.gray }}>No aggregator settings in old wizard</div>
              <div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>Zomato / Swiggy config handled separately in the Aggregator module, not in Restaurant Settings</div>
            </div>
          </>}
          right={<>
            <Section title="Aggregator Tones & Alerts" allNew fields={[
              { label: 'Aggregator Order Tone', badge: <NewBadge />, hint: 'Buzzer / Chime / Default / Silent' },
            ]} />
            <Section title="Auto Print — KOT & Bill" fields={[
              { label: 'Aggregator Auto KOT', badge: <NewBadge />, hint: <PendingBadge /> },
              { label: 'Aggregator Auto Bill', badge: <NewBadge />, hint: <PendingBadge /> },
              { label: 'Aggregator Auto Bill Stage', badge: <NewBadge />, hint: 'Acknowledged / Food Ready' },
            ]} />
            <Section title="Prep Time" allNew fields={[
              { label: 'Default Prep Time (min)', badge: <NewBadge /> },
              { label: 'Prep Time Count Method', badge: <NewBadge />, hint: 'By Quantity / By Time' },
              { label: 'Auto Acknowledge Prep Time', badge: <NewBadge /> },
            ]} />
            <div style={{ fontSize: 9, color: '#D97706', background: '#FFFBEB', padding: '6px 10px', borderRadius: 6, border: '1px solid #D9770630', marginTop: 8 }}>
              Auto Print fields are pending CR-133 amendment confirmation (OD-CR133-D5..D7) — may move to Screen 2 (Printer Setup)
            </div>
          </>}
        />
      </ScreenPage>

      {/* ── S8: Inventory ── */}
      <ScreenPage num="8" title="Inventory" desc="Stock tracking, alerts, negative inventory, auto-accept" oldLabel="Step 5: Inventory & Extras (mixed with contacts/feedback)" newLabel="Screen 8: Inventory — focused, cleaned up">
        <ColGrid
          left={<>
            <Section title="Inventory Management (Step 5)" fields={[
              { label: 'Inventory Tracking → Negative Inventory, Alert Number, Manager' },
            ]} />
            <Section title="Fields moving away from Step 5" fields={[
              { label: 'Phone on Bill → Screen 1', faded: true },
              { label: 'Report Number / Delivery Contact / Delivery Person → Screen 3', faded: true },
              { label: 'Settlement Report / Feedback / Feedback URL → Screen 3', faded: true },
              { label: 'Online Ordering Link → Screen 6', faded: true },
            ]} />
          </>}
          right={<>
            <Section title="Inventory Tracking" fields={[
              { label: 'Inventory Tracking → Allow Negative, Alert Number, Manager Name' },
            ]} />
            <Section title="Auto Accept & Purchase" allNew fields={[
              { label: 'Auto Accept Inventory', badge: <NewBadge />, hint: 'Auto-accept stock transfers and purchases' },
            ]} />
            <div style={{ fontSize: 9, color: '#059669', background: '#F0FFF4', padding: '6px 10px', borderRadius: 6, border: '1px solid #05966930', marginTop: 8 }}>
              Old Step 5 had 12 fields — 9 moved to dedicated screens. Screen 8 keeps only pure inventory fields.
            </div>
          </>}
        />
      </ScreenPage>

      {/* ── S9: Room & Hospitality ── */}
      <ScreenPage num="9" title="Room & Hospitality" desc="Room billing, OTP, guest details — only shown when Room channel is ON" oldLabel="Step 2: Room channel toggle only" newLabel="Screen 9: Room & Hospitality (conditional)" isConditional last>
        <ColGrid
          left={<>
            <Section title="From Step 2 — Only field that existed" fields={[
              { label: 'Room channel toggle', hint: 'Single toggle — no configuration options' },
            ]} />
            <div style={{ padding: '16px', background: C.bg, borderRadius: 8, border: `1px dashed ${C.border}`, marginTop: 8 }}>
              <span style={{ fontSize: 10, color: C.gray }}>No room configuration existed in the old wizard. Hotels / resorts had to configure room billing elsewhere.</span>
            </div>
          </>}
          right={<>
            <Section title="Room Billing" allNew fields={[
              { label: 'Room Billing Included', badge: <NewBadge /> },
              { label: 'Pay Via Room', badge: <NewBadge /> },
              { label: 'Room Price Override', badge: <NewBadge /> },
              { label: 'Room GST Applicable' },
            ]} />
            <Section title="Room Access & Security" allNew fields={[
              { label: 'Room OTP Required', badge: <NewBadge />, hint: 'OTP to confirm room-charged orders' },
            ]} />
            <Section title="Guest Details" allNew fields={[
              { label: 'Collect Guest Details', badge: <NewBadge /> },
              { label: 'Show Booking Details', badge: <NewBadge /> },
              { label: 'Billing by Employee', badge: <NewBadge /> },
            ]} />
            <div style={{ fontSize: 9, color: '#7C3AED', background: '#F5F3FF', padding: '6px 10px', borderRadius: 6, border: '1px solid #7C3AED30', marginTop: 8 }}>
              This screen appears automatically when "Room" is toggled ON in Screen 3 (Channels & Info)
            </div>
          </>}
        />
      </ScreenPage>

    </div>
  );
}
