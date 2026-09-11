// CR-135 — Aggregator Setup Design Preview · Gate 3 · FROZEN · Design owner approved 2026-08-10
// Changes vs Gate 2: webhooks removed, toggle=display-only, Add New Brand 3-state,
//   autoBillStage conditional, Bonus Time Brackets editor, corrected API option values
import React, { useState } from 'react';

const C = {
  orange: '#F26B33', orangeLight: '#FDF0EB', orangeBorder: '#F26B3330',
  green: '#329937', greenLight: '#F0FFF4',
  dark: '#1A1A2E', darkMid: '#374151',
  gray: '#6B7280', grayLight: '#9CA3AF',
  border: '#E5E7EB', bg: '#F7F7F7', white: '#FFFFFF',
  red: '#EF4444', redLight: '#FEF2F2',
  blue: '#3B82F6', blueLight: '#EBF5FF',
  sidebar: '#111827', sidebarActive: '#1F2937',
};

// ─── Mock data (restaurant 18march / RID 478) ─────────────────────────────────
const SUB_BRANDS = [
  { id: 107, name: 'sub brand', phone: '9990001234', email: '', address: '', status: 1 },
];

const BRAND_CONFIGS = {
  main: {
    clientId: null, storeId: 'STORE_POS_ID_478',
    urbanKey: 'biz_adm_*****', urbanToken: '8f3a0d91****',
    city: 'Bangalore', pincode: '560007',
    zomatoCode: '478', zomatoUrl: 'https://www.zomato.com/18march',
    swiggiCode: '478', swiggiUrl: 'https://www.swiggy.com/18march',
    zomatoStatus: true, swiggyStatus: true,
  },
  107: {
    clientId: 107, storeId: 'STORE_POS_ID_478_1003',
    urbanKey: 'biz_adm_*****', urbanToken: '8f3a0d91****',
    city: 'Bangalore', pincode: '560007',
    zomatoCode: '478', zomatoUrl: 'https://www.zomato.com/18march-sub',
    swiggiCode: '', swiggiUrl: '',
    zomatoStatus: true, swiggyStatus: false,
  },
};

const OP_DEFAULTS = {
  autoKot: true, autoBill: true, autoBillStage: 'Acknowledged',
  orderTone: 'buzzer', prepTime: 15, prepMethod: 'quantity', autoPrepAck: false,
  bonusBrackets: [
    { min_items: 1,  max_items: 3,   bonus_minutes: 0  },
    { min_items: 4,  max_items: 6,   bonus_minutes: 5  },
    { min_items: 7,  max_items: 10,  bonus_minutes: 10 },
    { min_items: 11, max_items: 15,  bonus_minutes: 15 },
    { min_items: 16, max_items: 999, bonus_minutes: 20 },
  ],
};

// ─── Primitives ───────────────────────────────────────────────────────────────
const NewBadge = () => (
  <span style={{ background: C.orange, color: '#fff', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4, marginLeft: 6, letterSpacing: 0.8, textTransform: 'uppercase', verticalAlign: 'middle' }}>NEW</span>
);

const Card = ({ title, desc, children, accent, action }) => (
  <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${accent ? C.orange + '55' : C.border}`, marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: accent ? C.orangeLight : C.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{title}</div>
        {desc && <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{desc}</div>}
      </div>
      {action}
    </div>
    <div style={{ padding: '16px 18px' }}>{children}</div>
  </div>
);

const ReadField = ({ label, value, masked }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 10, fontWeight: 600, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>}
    <div style={{ fontSize: 12, fontWeight: 500, color: masked ? C.gray : C.dark, fontFamily: masked ? 'monospace' : 'inherit', background: C.bg, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}` }}>
      {masked ? '••••••••••••' : (value || <span style={{ color: C.grayLight, fontStyle: 'italic' }}>Not set</span>)}
    </div>
  </div>
);

const EditBtn = ({ onClick, testId }) => (
  <button data-testid={testId} onClick={onClick}
    style={{ fontSize: 11, fontWeight: 600, color: C.orange, border: `1px solid ${C.orange}55`, background: C.orangeLight, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
    ✎ Edit
  </button>
);

const Row = ({ label, hint, children, badge, required }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
      {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}{badge}
    </label>
    {hint && <div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>{hint}</div>}
    {children}
  </div>
);

const Input = ({ value, onChange, readOnly, type = 'text', placeholder, icon, testId }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    <input data-testid={testId} type={type}
      value={value !== undefined ? value : undefined}
      defaultValue={value === undefined ? undefined : undefined}
      onChange={onChange || (() => {})}
      readOnly={readOnly} placeholder={placeholder}
      style={{ width: '100%', fontSize: 11, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: readOnly ? C.bg : C.white, color: readOnly ? C.gray : C.dark, boxSizing: 'border-box', paddingRight: icon ? 36 : 10 }} />
    {icon && <span style={{ position: 'absolute', right: 10, fontSize: 13, cursor: 'pointer', color: C.gray }}>{icon}</span>}
    {readOnly && <span style={{ position: 'absolute', right: 10, fontSize: 11, color: C.grayLight }}>🔒</span>}
  </div>
);

const SelectInput = ({ value, options, testId }) => (
  <select data-testid={testId} defaultValue={value}
    style={{ width: '100%', fontSize: 11, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.dark }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// OD-20: Toggle = visual status display ONLY — NOT clickable, cursor: default
const StatusToggle = ({ on, testId }) => (
  <div data-testid={testId}
    style={{ width: 40, height: 22, borderRadius: 11, background: on ? C.green : C.border, position: 'relative', cursor: 'default', flexShrink: 0, transition: 'background 0.2s' }}>
    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
  </div>
);

// Clickable toggle for Operational tab
const Toggle = ({ on, onChange, testId }) => (
  <div data-testid={testId} onClick={() => onChange && onChange(!on)}
    style={{ width: 40, height: 22, borderRadius: 11, background: on ? C.green : C.border, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
  </div>
);

const ToggleRow = ({ label, hint, on, onChange, badge, testId }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{label}</span>{badge}
      {hint && <div style={{ fontSize: 10, color: C.gray, marginTop: 1 }}>{hint}</div>}
    </div>
    <Toggle on={on} onChange={onChange} testId={testId} />
  </div>
);

const Grid2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>
);

const SaveCancelRow = ({ section, onCancel }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
    <button data-testid={`save-${section}`}
      style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: C.green, border: 'none', padding: '7px 18px', borderRadius: 7, cursor: 'pointer' }}>
      Save Changes
    </button>
    <button data-testid={`cancel-${section}`} onClick={onCancel}
      style={{ fontSize: 11, fontWeight: 600, color: C.gray, border: `1px solid ${C.border}`, background: 'transparent', padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>
      Cancel
    </button>
  </div>
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = () => (
  <div style={{ width: 180, background: C.sidebar, display: 'flex', flexDirection: 'column', flexShrink: 0, paddingTop: 16 }}>
    <div style={{ padding: '0 14px 16px', borderBottom: '1px solid #ffffff15' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>myg<span style={{ color: C.orange }}>enie</span></div>
      <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>18march · #478</div>
    </div>
    <div style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
      {['Dashboard', 'Menu Management', 'Settings', 'Inventory'].map(s => (
        <div key={s} style={{ padding: '7px 10px', borderRadius: 7, marginBottom: 2, opacity: 0.45, cursor: 'pointer' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#E5E7EB' }}>{s}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <div style={{ padding: '4px 10px 6px', marginBottom: 2 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.orange, letterSpacing: 1, textTransform: 'uppercase' }}>Aggregator</span>
        </div>
        <div style={{ background: C.sidebarActive, borderLeft: `3px solid ${C.orange}`, borderRadius: 7, padding: '7px 10px', marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Aggregator Setup</span>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 7, marginBottom: 2, opacity: 0.4, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#E5E7EB' }}>Food Mapping</span>
          <span style={{ fontSize: 8, background: '#374151', color: '#9CA3AF', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>SOON</span>
        </div>
      </div>
    </div>
  </div>
);

// ─── Config Tab ───────────────────────────────────────────────────────────────
const ConfigTab = ({ brandConfig, subBrands, setShowDialog }) => {
  const [editSection, setEditSection] = useState(null);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', address: '' });
  // brandMode controls State A / B / C for preview
  const hasSubBrands = subBrands.length > 0;

  const cancel = () => setEditSection(null);

  return (
    <div style={{ maxWidth: 860 }}>

      {/* ── Brand Setup ─────────────────────────────────────────── */}
      <Card title="Brand Setup" desc="Select a brand to view and edit its UrbanPiper configuration">

        {/* State A: no sub-brands → static label */}
        {!hasSubBrands && !showAddBrand && (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Brand</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, padding: '7px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                Main Brand
              </div>
            </div>
          </>
        )}

        {/* State B: sub-brands exist → dropdown */}
        {hasSubBrands && !showAddBrand && (
          <Row label="Active Brand" hint="Switching brand loads its saved configuration below">
            <select data-testid="brand-selector"
              style={{ width: '100%', fontSize: 11, padding: '7px 10px', border: `1.5px solid ${C.orange}55`, borderRadius: 8, background: C.orangeLight, color: C.dark, fontWeight: 600 }}>
              <option value="">Main Brand (STORE_POS_ID_478)</option>
              {subBrands.map(b => (
                <option key={b.id} value={b.id}>{b.name} (Client #{b.id} · STORE_POS_ID_478_{b.id}03)</option>
              ))}
            </select>
          </Row>
        )}

        {/* Store ID — always shown (read-only) when not in add-brand mode */}
        {!showAddBrand && (
          <Row label="Store ID" hint="Auto-assigned by backend — not editable">
            <Input value={brandConfig.storeId} readOnly testId="store-id-field" />
          </Row>
        )}

        {/* State C: Add New Brand inline form */}
        {showAddBrand ? (
          <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              + Add New Brand
            </div>
            <Grid2>
              <Row label="Brand Name" required>
                <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cloud Kitchen" testId="new-brand-name" />
              </Row>
              <Row label="Phone" required hint="Must be unique across brands">
                <Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" testId="new-brand-phone" />
              </Row>
            </Grid2>
            <Grid2>
              <Row label="Email">
                <Input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="brand@example.com" testId="new-brand-email" />
              </Row>
              <Row label="Address">
                <Input value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional" testId="new-brand-address" />
              </Row>
            </Grid2>
            <div style={{ fontSize: 10, color: C.blue, background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: 7, padding: '7px 10px', marginBottom: 12 }}>
              After creating the brand, you'll fill in UrbanPiper credentials in the next step.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button data-testid="cancel-add-brand" onClick={() => setShowAddBrand(false)}
                style={{ fontSize: 11, fontWeight: 600, color: C.gray, border: `1px solid ${C.border}`, background: 'transparent', padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>
                Cancel
              </button>
              <button data-testid="submit-add-brand"
                onClick={() => {
                  if (!addForm.name.trim() || !addForm.phone.trim()) {
                    alert('Brand name and phone are required');
                    return;
                  }
                  setShowAddBrand(false);
                  setAddForm({ name: '', phone: '', email: '', address: '' });
                }}
                style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: C.orange, border: 'none', padding: '7px 22px', borderRadius: 7, cursor: 'pointer' }}>
                Create Brand →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 4 }}>
            <button data-testid="add-brand-btn" onClick={() => setShowAddBrand(true)}
              style={{ fontSize: 11, fontWeight: 600, color: C.orange, border: `1px solid ${C.orange}`, background: 'transparent', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
              + Add New Brand
            </button>
          </div>
        )}
      </Card>

      {/* ── UrbanPiper Credentials (view/edit) ──────────────────── */}
      <Card title="UrbanPiper Credentials" desc="API keys for UrbanPiper integration — shared across all brands"
        action={editSection !== 'credentials' && <EditBtn onClick={() => setEditSection('credentials')} testId="edit-credentials-btn" />}>
        {editSection === 'credentials' ? (
          <>
            <Grid2>
              <Row label="Urban Key"><Input value={brandConfig.urbanKey} type="password" icon="👁" testId="urban-key-input" /></Row>
              <Row label="Urban Token"><Input value={brandConfig.urbanToken} type="password" icon="👁" testId="urban-token-input" /></Row>
            </Grid2>
            <div style={{ background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: '8px 12px', fontSize: 10, color: C.blue, fontWeight: 600 }}>
              These credentials are provided by UrbanPiper — do not share publicly
            </div>
            <SaveCancelRow section="credentials" onCancel={cancel} />
          </>
        ) : (
          <Grid2>
            <ReadField label="Urban Key" value={brandConfig.urbanKey} masked />
            <ReadField label="Urban Token" value={brandConfig.urbanToken} masked />
          </Grid2>
        )}
      </Card>

      {/* ── Location (view/edit) ────────────────────────────────── */}
      <Card title="Location" desc="City and pincode for this brand's store"
        action={editSection !== 'location' && <EditBtn onClick={() => setEditSection('location')} testId="edit-location-btn" />}>
        {editSection === 'location' ? (
          <>
            <Grid2>
              <Row label="City"><Input value={brandConfig.city} testId="city-input" /></Row>
              <Row label="Pincode"><Input value={brandConfig.pincode} testId="pincode-input" /></Row>
            </Grid2>
            <SaveCancelRow section="location" onCancel={cancel} />
          </>
        ) : (
          <Grid2>
            <ReadField label="City" value={brandConfig.city} />
            <ReadField label="Pincode" value={brandConfig.pincode} />
          </Grid2>
        )}
      </Card>

      {/* ── Platform Links (view/edit) ──────────────────────────── */}
      <Card title="Platform Links" desc="Restaurant codes and URLs on Zomato and Swiggy"
        action={editSection !== 'links' && <EditBtn onClick={() => setEditSection('links')} testId="edit-links-btn" />}>
        {editSection === 'links' ? (
          <>
            <Grid2>
              <Row label="Zomato Code"><Input value={brandConfig.zomatoCode} testId="zomato-code-input" /></Row>
              <Row label="Zomato URL"><Input value={brandConfig.zomatoUrl} testId="zomato-url-input" /></Row>
              <Row label="Swiggy Code" hint="API field: swiggi_code"><Input value={brandConfig.swiggiCode} placeholder="Enter Swiggy code" testId="swiggi-code-input" /></Row>
              <Row label="Swiggy URL" hint="API field: swiggi_url"><Input value={brandConfig.swiggiUrl} placeholder="Enter Swiggy URL" testId="swiggi-url-input" /></Row>
            </Grid2>
            <SaveCancelRow section="links" onCancel={cancel} />
          </>
        ) : (
          <Grid2>
            <ReadField label="Zomato Code" value={brandConfig.zomatoCode} />
            <ReadField label="Zomato URL" value={brandConfig.zomatoUrl} />
            <ReadField label="Swiggy Code" value={brandConfig.swiggiCode || '—'} />
            <ReadField label="Swiggy URL" value={brandConfig.swiggiUrl || '—'} />
          </Grid2>
        )}
      </Card>

      {/* ── Platform Status (always interactive — OD-20: toggle=display, button=action) ── */}
      <Card title="Platform Status" desc="Control whether this brand is accepting orders on each platform" accent>
        <div style={{ background: '#FFFBEB', border: '1px solid #D9770630', borderRadius: 8, padding: '8px 12px', fontSize: 10, color: '#D97706', fontWeight: 600, marginBottom: 12 }}>
          Toggling platforms immediately affects live order acceptance on Zomato / Swiggy
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Zomato */}
          <div style={{ flex: 1, background: brandConfig.zomatoStatus ? C.greenLight : C.redLight, border: `1px solid ${brandConfig.zomatoStatus ? '#05966930' : '#EF444430'}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>Zomato</span>
              {/* OD-20: StatusToggle = visual only, NOT clickable */}
              <StatusToggle on={brandConfig.zomatoStatus} testId="zomato-status-indicator" />
            </div>
            <div style={{ fontSize: 10, color: brandConfig.zomatoStatus ? '#059669' : C.red, fontWeight: 600, marginBottom: 8 }}>
              {brandConfig.zomatoStatus ? '● LIVE — accepting orders' : '● OFFLINE — not accepting orders'}
            </div>
            {/* OD-20: Button IS the action */}
            <button data-testid="zomato-disable-btn" onClick={() => setShowDialog(true)}
              style={{ width: '100%', fontSize: 10, fontWeight: 600, color: brandConfig.zomatoStatus ? C.red : C.green, border: `1px solid ${brandConfig.zomatoStatus ? C.red : C.green}`, background: 'transparent', padding: '5px 0', borderRadius: 6, cursor: 'pointer' }}>
              {brandConfig.zomatoStatus ? 'Disable on Zomato' : 'Enable on Zomato'}
            </button>
          </div>
          {/* Swiggy */}
          <div style={{ flex: 1, background: brandConfig.swiggyStatus ? C.greenLight : C.redLight, border: `1px solid ${brandConfig.swiggyStatus ? '#05966930' : '#EF444430'}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>Swiggy</span>
              <StatusToggle on={brandConfig.swiggyStatus} testId="swiggy-status-indicator" />
            </div>
            <div style={{ fontSize: 10, color: brandConfig.swiggyStatus ? '#059669' : C.red, fontWeight: 600, marginBottom: 8 }}>
              {brandConfig.swiggyStatus ? '● LIVE — accepting orders' : '● OFFLINE — not accepting orders'}
            </div>
            <button data-testid="swiggy-disable-btn"
              style={{ width: '100%', fontSize: 10, fontWeight: 600, color: brandConfig.swiggyStatus ? C.red : C.green, border: `1px solid ${brandConfig.swiggyStatus ? C.red : C.green}`, background: 'transparent', padding: '5px 0', borderRadius: 6, cursor: 'pointer' }}>
              {brandConfig.swiggyStatus ? 'Disable on Swiggy' : 'Enable on Swiggy'}
            </button>
          </div>
        </div>
      </Card>

      {/* ── Push Store ──────────────────────────────────────────── */}
      {/* OD-SS2: UrbanPiper Atlas Setup webhooks section REMOVED */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
        <button data-testid="push-store-btn"
          style={{ fontSize: 12, fontWeight: 600, color: C.orange, border: `1px solid ${C.orange}`, background: 'transparent', padding: '9px 20px', borderRadius: 8, cursor: 'pointer' }}>
          Push Store to UrbanPiper
        </button>
        <span style={{ fontSize: 10, color: C.gray }}>Registers or updates your store with UrbanPiper after config changes</span>
      </div>
    </div>
  );
};

// ─── Operational Tab ──────────────────────────────────────────────────────────
const OperationalTab = () => {
  const [form, setForm] = useState(OP_DEFAULTS);
  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addBracket = () =>
    setForm(f => ({ ...f, bonusBrackets: [...f.bonusBrackets, { min_items: '', max_items: '', bonus_minutes: '' }] }));
  const deleteBracket = (i) =>
    setForm(f => ({ ...f, bonusBrackets: f.bonusBrackets.filter((_, idx) => idx !== i) }));
  const updateBracket = (i, field, val) =>
    setForm(f => {
      const b = [...f.bonusBrackets];
      b[i] = { ...b[i], [field]: val === '' ? '' : Number(val) };
      return { ...f, bonusBrackets: b };
    });

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Restaurant-wide banner */}
      <div style={{ background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: C.blue, fontWeight: 600 }}>
        These settings apply to ALL aggregator orders for this restaurant (not brand-specific)
      </div>

      {/* Auto-Print card */}
      <Card title="Auto-Print" desc="Automatic KOT and bill printing for Zomato / Swiggy orders">
        <ToggleRow label="Auto KOT" hint="Automatically print KOT when aggregator order is accepted"
          on={form.autoKot} onChange={v => update('autoKot', v)} badge={<NewBadge />} testId="auto-kot-toggle" />
        <ToggleRow label="Auto Bill" hint="Automatically print bill for aggregator orders"
          on={form.autoBill} onChange={v => update('autoBill', v)} badge={<NewBadge />} testId="auto-bill-toggle" />
        {/* OD-22: stage shown only when autoBill is on */}
        {form.autoBill && (
          <div style={{ paddingTop: 10, paddingLeft: 14, borderLeft: `3px solid ${C.border}`, marginTop: 6 }}>
            <Row label="Print Bill When Order Is" badge={<NewBadge />}>
              <SelectInput value={form.autoBillStage} testId="auto-bill-stage-select"
                options={[
                  { value: 'Acknowledged', label: 'Acknowledged' },
                  { value: 'Ready',        label: 'Ready' },
                ]} />
            </Row>
          </div>
        )}
      </Card>

      {/* Order Tone card — API values: silent / default / buzzer */}
      <Card title="Order Tone" desc="Audio notification for incoming Zomato / Swiggy orders">
        <Row label="Aggregator Order Tone" hint="Sound played when a new aggregator order arrives" badge={<NewBadge />}>
          <SelectInput value={form.orderTone} testId="order-tone-select"
            options={[
              { value: 'silent',  label: 'Silent'  },
              { value: 'default', label: 'Default' },
              { value: 'buzzer',  label: 'Buzzer'  },
            ]} />
        </Row>
      </Card>

      {/* Prep Time card */}
      <Card title="Prep Time" desc="Kitchen preparation time shown to aggregator platforms">
        <Grid2>
          <Row label="Default Prep Time (min)" hint="1 – 120 minutes">
            <Input value={form.prepTime} testId="prep-time-input" />
          </Row>
          {/* API values: quantity / distinct */}
          <Row label="Prep Time Count Method">
            <SelectInput value={form.prepMethod} testId="prep-method-select"
              options={[
                { value: 'quantity', label: 'By Quantity' },
                { value: 'distinct', label: 'By Distinct Items' },
              ]} />
          </Row>
        </Grid2>
        <ToggleRow label="Auto Acknowledge Prep Time" hint="Automatically confirm prep time when order is accepted"
          on={form.autoPrepAck} onChange={v => update('autoPrepAck', v)} testId="auto-prep-ack-toggle" />

        {/* OD-15: Bonus Time Brackets editor */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Bonus Time Brackets</div>
          <div style={{ fontSize: 10, color: C.gray, marginBottom: 8 }}>
            Used when food items have no prep time configured (0 or NULL). Acts as a safety fallback.
          </div>
          <div style={{ fontSize: 10, color: C.gray, fontStyle: 'italic', marginBottom: 10 }}>
            Example: If item "Chai" has 0 min prep time, it will use the default value instead of being skipped.
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 8, marginBottom: 6 }}>
            {['Min Items', 'Max Items', 'Bonus Minutes', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 600, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>

          {form.bonusBrackets.map((b, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <input type="number" value={b.min_items} onChange={e => updateBracket(i, 'min_items', e.target.value)} data-testid={`bracket-min-${i}`}
                style={{ fontSize: 11, padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.white }} />
              <input type="number" value={b.max_items} onChange={e => updateBracket(i, 'max_items', e.target.value)} data-testid={`bracket-max-${i}`}
                style={{ fontSize: 11, padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.white }} />
              <input type="number" value={b.bonus_minutes} onChange={e => updateBracket(i, 'bonus_minutes', e.target.value)} data-testid={`bracket-bonus-${i}`}
                style={{ fontSize: 11, padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.white }} />
              <button onClick={() => deleteBracket(i)} data-testid={`bracket-delete-${i}`}
                style={{ width: 28, height: 28, border: `1px solid ${C.red}55`, background: C.redLight, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: C.red }}>
                ✕
              </button>
            </div>
          ))}

          <button onClick={addBracket} data-testid="add-bracket-btn"
            style={{ fontSize: 11, fontWeight: 600, color: C.orange, border: `1px dashed ${C.orange}55`, background: C.orangeLight, padding: '6px 16px', borderRadius: 7, cursor: 'pointer', marginTop: 4 }}>
            + Add Bracket
          </button>
        </div>
      </Card>

      <div style={{ marginBottom: 80 }} />
    </div>
  );
};

// ─── Confirmation Dialog ───────────────────────────────────────────────────────
const ConfirmDialog = ({ onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
    <div style={{ background: C.white, borderRadius: 16, padding: '28px 32px', width: 380, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 10 }}>Disable on Zomato?</div>
      <div style={{ fontSize: 12, color: C.gray, marginBottom: 6, lineHeight: 1.6 }}>
        This will <strong style={{ color: C.red }}>immediately stop accepting orders</strong> on Zomato for <strong>Main Brand</strong>.
      </div>
      <div style={{ fontSize: 11, color: C.grayLight, marginBottom: 20 }}>You can re-enable at any time from this screen.</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button data-testid="dialog-cancel" onClick={onClose}
          style={{ fontSize: 12, fontWeight: 600, color: C.gray, border: `1px solid ${C.border}`, background: 'transparent', padding: '8px 18px', borderRadius: 8, cursor: 'pointer' }}>
          Cancel
        </button>
        <button data-testid="dialog-confirm-disable"
          style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: C.red, border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer' }}>
          Disable on Zomato
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AggregatorPreviewPage() {
  const [activeTab, setActiveTab]     = useState('config');
  const [activeBrandKey, setActiveBrandKey] = useState('main');
  const [showDialog, setShowDialog]   = useState(false);

  const brandConfig = BRAND_CONFIGS[activeBrandKey] || BRAND_CONFIGS.main;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Page header */}
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '16px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>Aggregator Setup</div>
              <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>UrbanPiper configuration and aggregator order settings for 18march</div>
            </div>
            <div style={{ fontSize: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px', color: C.gray }}>
              Restaurant <strong style={{ color: C.dark }}>#478</strong> · 18march
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {[{ id: 'config', label: 'Configuration' }, { id: 'operational', label: 'Operational Settings' }].map(tab => (
              <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
                style={{ fontSize: 12, fontWeight: 600, padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer', color: activeTab === tab.id ? C.orange : C.gray, borderBottom: activeTab === tab.id ? `2px solid ${C.orange}` : '2px solid transparent', marginBottom: -1 }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 100px' }}>
          {activeTab === 'config'
            ? <ConfigTab brandConfig={brandConfig} subBrands={SUB_BRANDS} setShowDialog={setShowDialog} />
            : <OperationalTab />
          }
        </div>

        {/* Sticky bottom save bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 180, right: 0, background: C.white, borderTop: `1px solid ${C.border}`, padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
          <button data-testid="discard-btn"
            style={{ fontSize: 12, fontWeight: 600, color: C.gray, border: `1px solid ${C.border}`, background: 'transparent', padding: '8px 18px', borderRadius: 8, cursor: 'pointer' }}>
            Discard
          </button>
          <button data-testid="save-btn"
            style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: C.green, border: 'none', padding: '8px 22px', borderRadius: 8, cursor: 'pointer' }}>
            {activeTab === 'config' ? 'Save Configuration' : 'Save Settings'}
          </button>
        </div>
      </div>

      {showDialog && <ConfirmDialog onClose={() => setShowDialog(false)} />}

      <div style={{ position: 'fixed', top: 10, right: 10, background: C.dark, color: '#fff', fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 99, zIndex: 200, letterSpacing: 0.5 }}>
        CR-135 Design Preview · Gate 3 · {new Date().toLocaleDateString('en-IN')}
      </div>
    </div>
  );
}
