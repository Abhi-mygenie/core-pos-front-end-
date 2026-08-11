// CR-133 Gap Batch — Final Screen Design Preview
// Shows: Employee dropdown (G3b), Windows/Android style split (G5+G6), copies fix (G1/G4)
import React, { useState } from 'react';

const C = {
  orange: '#F26B33', orangeLight: '#FDF0EB',
  green: '#329937', greenLight: '#F0FFF4',
  dark: '#1A1A1A', gray: '#666666', lightGray: '#9CA3AF',
  border: '#E5E5E5', bg: '#F7F7F7', white: '#FFFFFF',
  blue: '#3B82F6', blueLight: '#EBF5FF',
  red: '#EF4444', sidebar: '#111827', sidebarActive: '#1F2937',
};

// ── Mock data (live GET restaurant 675 + employee list) ───────────────────────
const EMPLOYEES = [
  { id: '4534', label: 'PA (Owner)' },
  { id: '4462', label: 'check (Owner)' },
  { id: '3850', label: 'abhi (Manager)' },
  { id: '3631', label: 'p (All Modules)' },
  { id: '3630', label: 'parth (captains(c))' },
  { id: '3526', label: 'Saurav (m)' },
  { id: '2819', label: 'System Employee' },
];

const STYLE_SECTIONS_BILL = {
  restaurant_header: ['restaurant_name', 'restaurant_address', 'restaurant_phone', 'restaurant_email', 'gst_number', 'fssai_number'],
  bill_information: ['row_1', 'row_2', 'row_3', 'row_4'],
  item_table: ['table_header', 'table_content', 'table_qty', 'table_meta', 'notes'],
  amount_section: ['amount_breakdown', 'total', 'grand_total', 'paid_by'],
  footer: ['footer_text'],
};

const SAMPLE_WIN_VALUES = { restaurant_name: [11, 14], restaurant_address: [6, 7], row_1: [8, 7], table_header: [7, 8], total: [8, 8], footer_text: [10, 7] };
const SAMPLE_AND_VALUES = { restaurant_name: [2, 2], restaurant_address: [1, 1], row_1: [1, 1], table_header: [1, 1], total: [1, 1], footer_text: [1, 1] };

// ── Primitives ────────────────────────────────────────────────────────────────
const humanize = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const SectionTitle = ({ title }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: 0.8, padding: '12px 0 6px', borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>{title}</div>
);

const Toggle = ({ label, hint, on, testId }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
    <div>
      <span style={{ fontSize: 13, color: C.dark }}>{label}</span>
      {hint && <div style={{ fontSize: 10, color: C.gray }}>{hint}</div>}
    </div>
    <div data-testid={testId} style={{ width: 44, height: 24, borderRadius: 12, background: on ? C.green : C.border, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 22 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  </div>
);

const NumberInputFixed = ({ label, value, min, max }) => (
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: C.gray, marginBottom: 4 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <button style={{ padding: '6px 10px', background: C.bg, border: 'none', cursor: 'pointer', fontSize: 14, color: C.orange, fontWeight: 700 }}>−</button>
      <input type="number" defaultValue={value} min={min} max={max}
        style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, border: 'none', outline: 'none', padding: '6px 0' }} />
      <button style={{ padding: '6px 10px', background: C.bg, border: 'none', cursor: 'pointer', fontSize: 14, color: C.orange, fontWeight: 700 }}>+</button>
    </div>
    <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>Min {min} — Max {max}</div>
  </div>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'printers', label: 'Printers' },
    { id: 'autoprint', label: 'Auto-Print' },
    { id: 'billcontent', label: 'Bill Content' },
    { id: 'printstyle', label: 'Print Style' },
  ];
  return (
    <div style={{ width: 180, background: C.sidebar, flexShrink: 0, paddingTop: 16, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 14px 16px', borderBottom: '1px solid #ffffff15' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>myg<span style={{ color: C.orange }}>enie</span></div>
        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>Printer Config</div>
      </div>
      <div style={{ padding: '10px 8px', flex: 1 }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 2, cursor: 'pointer',
              background: activeTab === t.id ? C.sidebarActive : 'transparent',
              borderLeft: activeTab === t.id ? `3px solid ${C.orange}` : '3px solid transparent' }}>
            <span style={{ fontSize: 11, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? '#fff' : '#9CA3AF' }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Auto-Print Tab ────────────────────────────────────────────────────────────
const AutoPrintTab = () => (
  <div data-testid="autoprint-tab">
    <SectionTitle title="Print Copies" />
    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
      <NumberInputFixed label="Bill Copies" value={1} min={1} max={5} />
      <NumberInputFixed label="KOT Copies" value={1} min={1} max={5} />
    </div>
    <div style={{ fontSize: 10, color: C.green, background: C.greenLight, border: `1px solid ${C.green}30`, borderRadius: 7, padding: '6px 10px', marginBottom: 12 }}>
      ✓ Fix G1: values can now be cleared and retyped freely — min/max enforced on blur only
    </div>

    <SectionTitle title="In-House Orders" />
    <Toggle label="Auto-print Bill" hint="Print bill automatically when generated" on={true} testId="auto-print-bill-toggle" />
    <Toggle label="Auto-print KOT" hint="Print KOT automatically on order placement" on={true} testId="auto-print-kot-toggle" />
    <Toggle label="Auto Settle" hint="Settle the order automatically after bill print" on={true} testId="auto-settle-toggle" />
    <Toggle label="Scan Order Auto-print" hint="Auto-print orders placed via QR scan" on={true} testId="scan-auto-print-toggle" />

    <div style={{ marginTop: 12, padding: '10px 12px', background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: 8, fontSize: 11, color: C.blue }}>
      Aggregator auto-print settings (auto-KOT, auto-bill, stage) are managed in <strong>Aggregator Setup → Operational Settings</strong>
    </div>
  </div>
);

// ── Bill Content Tab (with Employee Dropdown G3b) ─────────────────────────────
const BillContentTab = () => {
  const [empId, setEmpId] = useState('2819');
  const [upiOn, setUpiOn] = useState(true);
  const [feedbackOn, setFeedbackOn] = useState(true);
  const [pdfOn, setPdfOn] = useState(true);

  return (
    <div data-testid="bill-content-tab">

      {/* G3b: Employee Dropdown — NEW */}
      <SectionTitle title="Printer Agent Employee" />
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.gray, marginBottom: 4 }}>Employee</div>
        <div style={{ fontSize: 10, color: C.gray, marginBottom: 6 }}>
          The employee identity used by the printer agent for authentication
        </div>
        <select data-testid="employee-dropdown"
          value={empId} onChange={e => setEmpId(e.target.value)}
          style={{ width: '100%', fontSize: 12, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.dark }}>
          {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>G3b: employee list loaded from /employee/employees-list · pre-selected from saved config</div>
      </div>

      {/* Restaurant info (read-only) */}
      <SectionTitle title="Restaurant Info (read-only)" />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 12, fontSize: 12, color: C.gray }}>
        🏪 MyGenie · Managed in Restaurant Info settings
      </div>

      <SectionTitle title="Bill Footer" />
      <div style={{ marginBottom: 12 }}>
        <input defaultValue="Powered by MyGenie" style={{ width: '100%', fontSize: 12, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, boxSizing: 'border-box' }} />
      </div>

      <SectionTitle title="QR Codes on Bill" />
      <Toggle label="UPI Payment QR" hint="Show a UPI QR on printed bills" on={upiOn} testId="upi-qr-toggle" />
      {upiOn && <div style={{ marginBottom: 8 }}><input defaultValue="304@upi" style={{ width: '100%', fontSize: 12, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, boxSizing: 'border-box' }} /></div>}
      <Toggle label="Dynamic UPI QR" hint="QR pre-filled with exact bill amount" on={true} testId="upi-dynamic-toggle" />
      <Toggle label="Feedback QR" hint="Show feedback QR on bills" on={feedbackOn} testId="feedback-qr-toggle" />
      {feedbackOn && <div style={{ marginBottom: 8 }}><input defaultValue="ggsdgdgdfgdf.com" style={{ width: '100%', fontSize: 12, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, boxSizing: 'border-box' }} /></div>}

      <SectionTitle title="Windows Printing" />
      <Toggle label="Use PDF Printing on Windows" on={pdfOn} testId="use-pdf-windows-toggle" />
      {pdfOn && <Toggle label="PDF for Bills Only" on={false} testId="use-pdf-bills-only-toggle" />}
    </div>
  );
};

// ── Print Style Tab (with Windows + Android split G5+G6) ─────────────────────
const PrintStyleTab = () => {
  const [platform, setPlatform] = useState('windows');   // 'windows' | 'android'
  const [openSections, setOpenSections] = useState({});

  const toggle = (k) => setOpenSections(p => ({ ...p, [k]: !p[k] }));

  const RowEditor = ({ rowKey, winVals, andVals }) => {
    const isAndroid = platform === 'android';
    const [f58, f80] = isAndroid ? andVals : winVals;
    const minV = isAndroid ? 1 : 0;
    const maxV = isAndroid ? 8 : 100;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ flex: 1, fontSize: 11, color: C.dark }}>{humanize(rowKey)}</span>
        <input type="number" defaultValue={f58} min={minV} max={maxV} step={isAndroid ? 1 : 0.5}
          style={{ width: 52, fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }}
          data-testid={`style-row-${rowKey}-58mm`}
          onChange={e => { if (e.target.value === '') e.target.value = ''; }}
        />
        <input type="number" defaultValue={f80} min={minV} max={maxV} step={isAndroid ? 1 : 0.5}
          style={{ width: 52, fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }}
          data-testid={`style-row-${rowKey}-80mm`}
          onChange={e => { if (e.target.value === '') e.target.value = ''; }}
        />
        <button style={{ width: 28, height: 26, fontSize: 11, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, cursor: 'pointer', color: C.gray }}>B</button>
      </div>
    );
  };

  return (
    <div data-testid="print-style-tab">
      {/* Global settings */}
      <SectionTitle title="Global Typography" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: C.gray, marginBottom: 3 }}>Font Family</div>
          <select style={{ width: '100%', fontSize: 11, padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 7 }}>
            <option>Poppins</option><option>Roboto</option><option>Open Sans</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.gray, marginBottom: 3 }}>Divider Line</div>
          <select style={{ width: '100%', fontSize: 11, padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 7 }}>
            <option>Solid</option><option>Dashed</option>
          </select>
        </div>
      </div>

      {/* Windows / Android global sizes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Windows */}
        <div style={{ background: C.bg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 8 }}>🖥 Windows</div>
          {['Top', 'Bottom', 'Left', 'Right'].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: C.gray }}>Margin {s}</span>
              <input type="number" defaultValue={5} style={{ width: 48, fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <div style={{ flex: 1, fontSize: 10, color: C.gray }}>Logo W×H</div>
            <input type="number" defaultValue={35} style={{ width: 40, fontSize: 11, padding: '3px 4px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }} />
            <input type="number" defaultValue={35} style={{ width: 40, fontSize: 11, padding: '3px 4px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }} />
          </div>
        </div>
        {/* Android */}
        <div style={{ background: '#F0FFF4', borderRadius: 10, padding: '10px 12px', border: `1px solid ${C.green}30` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8 }}>📱 Android</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.gray }}>Logo Size</span>
            <input type="number" defaultValue={30} min={1} max={8} style={{ width: 48, fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.gray }}>UPI QR Size</span>
            <input type="number" defaultValue={25} min={1} max={8} style={{ width: 48, fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.gray }}>Feedback QR</span>
            <input type="number" defaultValue={25} min={1} max={8} style={{ width: 48, fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }} />
          </div>
          <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>Scale range: 1–8</div>
        </div>
      </div>

      {/* Platform switcher for per-row style */}
      <SectionTitle title="Bill Print Style" />
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
        {['windows', 'android'].map(p => (
          <button key={p} onClick={() => setPlatform(p)}
            style={{ padding: '6px 18px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: platform === p ? C.orange : C.white,
              color: platform === p ? '#fff' : C.gray }}>
            {p === 'windows' ? '🖥 Windows' : '📱 Android'}
          </button>
        ))}
      </div>
      {platform === 'android' && (
        <div style={{ fontSize: 10, color: C.green, background: C.greenLight, border: `1px solid ${C.green}30`, borderRadius: 7, padding: '5px 10px', marginBottom: 8 }}>
          Android scale: 1–8 · Each value is a scale multiplier, not pt size
        </div>
      )}

      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 4 }}>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: C.gray }}>Field</span>
        <span style={{ width: 52, fontSize: 10, fontWeight: 600, color: C.gray, textAlign: 'center' }}>58mm</span>
        <span style={{ width: 52, fontSize: 10, fontWeight: 600, color: C.gray, textAlign: 'center' }}>80mm</span>
        <span style={{ width: 28, fontSize: 10, fontWeight: 600, color: C.gray, textAlign: 'center' }}>Bold</span>
      </div>

      {Object.entries(STYLE_SECTIONS_BILL).map(([section, rows]) => (
        <div key={section} style={{ borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 8, overflow: 'hidden' }}>
          <button onClick={() => toggle(section)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: C.bg, border: 'none', cursor: 'pointer' }}
            data-testid={`style-section-bill-${section}`}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{humanize(section)}</span>
            <span style={{ fontSize: 12, color: C.gray }}>{openSections[section] ? '▲' : '▼'}</span>
          </button>
          {openSections[section] && (
            <div style={{ padding: '4px 12px 8px' }}>
              {rows.map(r => (
                <RowEditor key={r} rowKey={r}
                  winVals={SAMPLE_WIN_VALUES[r] || [7, 8]}
                  andVals={SAMPLE_AND_VALUES[r] || [1, 1]}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: 8, fontSize: 10, color: C.green, background: C.greenLight, border: `1px solid ${C.green}30`, borderRadius: 7, padding: '6px 10px' }}>
        G5+G6 Fix: style values now read/write from <code>windows.*</code> and <code>android.*</code> sub-objects.
        Clearing a value (to type new) is now allowed — snaps to min only on blur.
      </div>
    </div>
  );
};

// ── Printers Tab (unchanged, summary only) ────────────────────────────────────
const PrintersTab = () => (
  <div data-testid="printers-tab">
    <div style={{ padding: '14px 16px', background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: 10, marginBottom: 16, fontSize: 12, color: C.blue }}>
      Printers tab is unchanged — no fixes needed here.
      <br />G2 (KDS): validated ✅ — backend confirmed printers[] is clean (no KDS in handled_stations for this restaurant).
    </div>
    <div style={{ padding: '14px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.gray, textAlign: 'center' }}>
      No printers configured yet — click "+ Add Printer" to begin
    </div>
    <button style={{ marginTop: 12, width: '100%', padding: '10px', border: `1.5px dashed ${C.orange}`, borderRadius: 10, background: C.orangeLight, color: C.orange, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      + Add Printer
    </button>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PrinterConfigPreviewPage() {
  const [activeTab, setActiveTab] = useState('billcontent');

  const tabContent = {
    printers: <PrintersTab />,
    autoprint: <AutoPrintTab />,
    billcontent: <BillContentTab />,
    printstyle: <PrintStyleTab />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>Printer Settings</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>Printer agent configuration — CR-133 Gap Batch fix preview</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 100px' }}>
          {tabContent[activeTab]}
        </div>

        {/* Save bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 180, right: 0, background: C.white, borderTop: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={{ fontSize: 12, color: C.gray, border: `1px solid ${C.border}`, background: 'transparent', padding: '8px 18px', borderRadius: 8, cursor: 'pointer' }}>
            Discard
          </button>
          <button data-testid="save-printer-config-btn"
            style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: C.green, border: 'none', padding: '8px 22px', borderRadius: 8, cursor: 'pointer' }}>
            Save Changes
          </button>
        </div>
      </div>

      {/* Preview badge */}
      <div style={{ position: 'fixed', top: 10, right: 10, background: C.dark, color: '#fff', fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 99, zIndex: 200 }}>
        CR-133 Gap Batch · Design Preview · {new Date().toLocaleDateString('en-IN')}
      </div>
    </div>
  );
}
