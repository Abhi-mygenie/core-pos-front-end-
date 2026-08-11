// CR-135: Config Tab — brand setup, credentials, location, platform links & status
import React, { useState } from 'react';
import { saveConfig, createBrand, pushStore, storeToggle } from '../../../api/services/aggregatorConfigService';
import { aggregatorConfigTransform } from '../../../api/transforms/aggregatorConfigTransform';
import { useToast } from '../../../hooks/use-toast';
import { COLORS } from '../../../constants';

// ── Local UI primitives ───────────────────────────────────────────────────────
const Card = ({ children, title, desc, action, accent }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${accent ? COLORS.primaryOrange + '55' : COLORS.borderGray}`, marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${COLORS.borderGray}`, background: accent ? '#FDF0EB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.darkText }}>{title}</div>
        {desc && <div style={{ fontSize: 10, color: COLORS.grayText, marginTop: 2 }}>{desc}</div>}
      </div>
      {action}
    </div>
    <div style={{ padding: '16px 18px' }}>{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.grayText, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>}
    {children}
  </div>
);

const ReadVal = ({ value, masked }) => (
  <div style={{ fontSize: 12, color: masked ? COLORS.grayText : COLORS.darkText, fontFamily: masked ? 'monospace' : 'inherit', background: '#F7F7F7', padding: '7px 12px', borderRadius: 8, border: `1px solid ${COLORS.borderGray}` }}>
    {masked ? '••••••••••••' : (value || <span style={{ color: '#ccc', fontStyle: 'italic' }}>Not set</span>)}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = 'text', readOnly, testId }) => (
  <input data-testid={testId} type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
    style={{ width: '100%', fontSize: 11, padding: '7px 10px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 8, background: readOnly ? '#F7F7F7' : '#fff', color: readOnly ? COLORS.grayText : COLORS.darkText, boxSizing: 'border-box' }} />
);

const Grid2 = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>;

const EditBtn = ({ onClick, testId }) => (
  <button data-testid={testId} onClick={onClick}
    style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}55`, background: '#FDF0EB', padding: '5px 14px', borderRadius: 7, cursor: 'pointer' }}>
    ✎ Edit
  </button>
);

const SaveCancel = ({ onSave, onCancel, saveTestId, cancelTestId }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.borderGray}` }}>
    <button data-testid={saveTestId} onClick={onSave}
      style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: COLORS.primaryGreen, border: 'none', padding: '7px 18px', borderRadius: 7, cursor: 'pointer' }}>
      Save Changes
    </button>
    <button data-testid={cancelTestId} onClick={onCancel}
      style={{ fontSize: 11, color: COLORS.grayText, border: `1px solid ${COLORS.borderGray}`, background: 'transparent', padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>
      Cancel
    </button>
  </div>
);

// ── StatusToggle: visual display only — NOT clickable (OD-20) ────────────────
const StatusToggle = ({ on, testId }) => (
  <div data-testid={testId}
    style={{ width: 40, height: 22, borderRadius: 11, background: on ? COLORS.primaryGreen : COLORS.borderGray, position: 'relative', cursor: 'default', flexShrink: 0 }}>
    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
  </div>
);

// ── ConfigTab ─────────────────────────────────────────────────────────────────
export default function ConfigTab({
  configState, setConfigState,
  subBrands, activeClientId,
  onBrandChange, onBrandCreated,
  onConfigSaved, onDirty,
  saving, setSaving,
}) {
  const { toast } = useToast();
  const [editSection,  setEditSection]  = useState(null);  // 'credentials'|'location'|'links'
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [addForm,      setAddForm]      = useState({ name: '', phone: '', email: '', address: '' });
  const [addSaving,    setAddSaving]    = useState(false);
  const [showDialog,   setShowDialog]   = useState(null);  // 'zomato'|'swiggy'|null
  const [pushSaving,   setPushSaving]   = useState(false);

  const hasSubBrands = subBrands.length > 0;

  const updateField = (key, val) => {
    setConfigState(prev => ({ ...prev, [key]: val }));
    onDirty();
  };

  // ── Save Configuration ──────────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await saveConfig(aggregatorConfigTransform.toAPI.config(configState));
      toast({ title: 'Configuration saved' });
      onConfigSaved();
      setEditSection(null);
    } catch (e) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // ── Create Brand (Step 1) ───────────────────────────────────────────────────
  const handleCreateBrand = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      toast({ title: 'Brand name and phone are required', variant: 'destructive' });
      return;
    }
    setAddSaving(true);
    try {
      const res = await createBrand(addForm);
      const newBrand = aggregatorConfigTransform.fromAPI.newBrand(res);
      onBrandCreated(newBrand);
      setShowAddBrand(false);
      setAddForm({ name: '', phone: '', email: '', address: '' });
      toast({ title: 'Brand created — fill in UrbanPiper credentials to complete setup' });
    } catch (e) {
      toast({ title: 'Create failed', description: e?.message, variant: 'destructive' });
    } finally { setAddSaving(false); }
  };

  // ── Push Store ──────────────────────────────────────────────────────────────
  const handlePushStore = async () => {
    setPushSaving(true);
    try {
      await pushStore(activeClientId);
      toast({ title: 'Store pushed to UrbanPiper successfully' });
    } catch (e) {
      toast({ title: 'Push failed', description: e?.message, variant: 'destructive' });
    } finally { setPushSaving(false); }
  };

  // ── Store Toggle ────────────────────────────────────────────────────────────
  const handleToggleConfirm = async (platform) => {
    const isLive = platform === 'zomato' ? configState.zomatoStatus : configState.swiggyStatus;
    const action = isLive ? 'disable' : 'enable';
    setShowDialog(null);
    setSaving(true);
    try {
      await storeToggle(action, [platform], activeClientId);
      const key = platform === 'zomato' ? 'zomatoStatus' : 'swiggyStatus';
      setConfigState(prev => ({ ...prev, [key]: !isLive }));
      toast({ title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} ${action}d` });
    } catch (e) {
      toast({ title: 'Toggle failed', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="config-tab">

      {/* isNewConfig banner (D3) */}
      {configState.isNewConfig && (
        <div data-testid="new-config-banner"
          style={{ background: '#EBF5FF', border: '1px solid #3B82F630', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>
          No UrbanPiper configuration yet for this brand — fill in your details below and save.
        </div>
      )}

      {/* ── Brand Setup ─────────────────────────────────────────────────────── */}
      <Card title="Brand Setup" desc="Select a brand to view and edit its UrbanPiper configuration">

        {/* State A: no sub-brands → static label */}
        {!hasSubBrands && !showAddBrand && (
          <Field label="Active Brand">
            <div data-testid="brand-label-main"
              style={{ fontSize: 12, fontWeight: 600, color: COLORS.darkText, padding: '7px 12px', background: '#F7F7F7', border: `1px solid ${COLORS.borderGray}`, borderRadius: 8 }}>
              Main Brand
            </div>
          </Field>
        )}

        {/* State B: sub-brands exist → dropdown */}
        {hasSubBrands && !showAddBrand && (
          <Field label="Active Brand" >
            <select data-testid="brand-selector"
              value={activeClientId ?? ''}
              onChange={e => onBrandChange(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', fontSize: 11, padding: '7px 10px', border: `1.5px solid ${COLORS.primaryOrange}55`, borderRadius: 8, background: '#FDF0EB', color: COLORS.darkText, fontWeight: 600 }}>
              <option value="">Main Brand</option>
              {subBrands.map(b => (
                <option key={b.id} value={b.id}>{b.name} (Client #{b.id})</option>
              ))}
            </select>
          </Field>
        )}

        {/* Store ID — always read-only */}
        {!showAddBrand && (
          <Field label="Store ID">
            <div style={{ position: 'relative' }}>
              <TextInput value={configState.storeId || configState.suggestedStoreId || ''} readOnly testId="store-id-display" />
              <span style={{ position: 'absolute', right: 10, top: 8, fontSize: 11, color: '#ccc' }}>🔒</span>
            </div>
            <div style={{ fontSize: 10, color: COLORS.grayText, marginTop: 3 }}>Auto-assigned by backend — not editable</div>
          </Field>
        )}

        {/* State C: Add New Brand inline form */}
        {showAddBrand ? (
          <div data-testid="add-brand-form"
            style={{ background: '#F7F7F7', borderRadius: 10, border: `1px solid ${COLORS.borderGray}`, padding: '14px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.darkText, marginBottom: 14 }}>+ Add New Brand</div>
            <Grid2>
              <Field label="Brand Name *">
                <TextInput value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cloud Kitchen" testId="new-brand-name" />
              </Field>
              <Field label="Phone *">
                <div style={{ fontSize: 10, color: COLORS.grayText, marginBottom: 3 }}>Must be unique across brands</div>
                <TextInput value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" testId="new-brand-phone" />
              </Field>
            </Grid2>
            <Grid2>
              <Field label="Email">
                <TextInput value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="brand@example.com" testId="new-brand-email" />
              </Field>
              <Field label="Address">
                <TextInput value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional" testId="new-brand-address" />
              </Field>
            </Grid2>
            <div style={{ background: '#EBF5FF', border: '1px solid #3B82F630', borderRadius: 7, padding: '7px 10px', marginBottom: 12, fontSize: 10, color: '#3B82F6' }}>
              After creating the brand, fill in UrbanPiper credentials to complete setup.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button data-testid="cancel-add-brand" onClick={() => setShowAddBrand(false)}
                style={{ fontSize: 11, color: COLORS.grayText, border: `1px solid ${COLORS.borderGray}`, background: 'transparent', padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>
                Cancel
              </button>
              <button data-testid="submit-add-brand" onClick={handleCreateBrand} disabled={addSaving}
                style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: addSaving ? '#ccc' : COLORS.primaryOrange, border: 'none', padding: '7px 22px', borderRadius: 7, cursor: addSaving ? 'not-allowed' : 'pointer' }}>
                {addSaving ? 'Creating…' : 'Create Brand →'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <button data-testid="add-brand-btn" onClick={() => setShowAddBrand(true)}
              style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}`, background: 'transparent', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
              + Add New Brand
            </button>
          </div>
        )}
      </Card>

      {/* ── UrbanPiper Credentials ────────────────────────────────────────────── */}
      <Card title="UrbanPiper Credentials" desc="API keys for UrbanPiper integration — shared across all brands"
        action={editSection !== 'credentials' && <EditBtn onClick={() => setEditSection('credentials')} testId="edit-credentials-btn" />}>
        {editSection === 'credentials' ? (
          <>
            <Grid2>
              <Field label="Urban Key">
                <TextInput value={configState.urbanKey} onChange={e => updateField('urbanKey', e.target.value)} type="password" testId="urban-key-input" />
              </Field>
              <Field label="Urban Token">
                <TextInput value={configState.urbanToken} onChange={e => updateField('urbanToken', e.target.value)} type="password" testId="urban-token-input" />
              </Field>
            </Grid2>
            <div style={{ background: '#EBF5FF', border: '1px solid #3B82F630', borderRadius: 8, padding: '8px 12px', fontSize: 10, color: '#3B82F6', fontWeight: 600 }}>
              These credentials are provided by UrbanPiper — do not share publicly
            </div>
            <SaveCancel onSave={() => setEditSection(null)} onCancel={() => setEditSection(null)} saveTestId="save-credentials" cancelTestId="cancel-credentials" />
          </>
        ) : (
          <Grid2>
            <Field label="Urban Key"><ReadVal value={configState.urbanKey} masked /></Field>
            <Field label="Urban Token"><ReadVal value={configState.urbanToken} masked /></Field>
          </Grid2>
        )}
      </Card>

      {/* ── Location ─────────────────────────────────────────────────────────── */}
      <Card title="Location" desc="City and pincode for this brand's store"
        action={editSection !== 'location' && <EditBtn onClick={() => setEditSection('location')} testId="edit-location-btn" />}>
        {editSection === 'location' ? (
          <>
            <Grid2>
              <Field label="City"><TextInput value={configState.city} onChange={e => updateField('city', e.target.value)} testId="city-input" /></Field>
              <Field label="Pincode"><TextInput value={configState.pincode} onChange={e => updateField('pincode', e.target.value)} testId="pincode-input" /></Field>
            </Grid2>
            <SaveCancel onSave={() => setEditSection(null)} onCancel={() => setEditSection(null)} saveTestId="save-location" cancelTestId="cancel-location" />
          </>
        ) : (
          <Grid2>
            <Field label="City"><ReadVal value={configState.city} /></Field>
            <Field label="Pincode"><ReadVal value={configState.pincode} /></Field>
          </Grid2>
        )}
      </Card>

      {/* ── Platform Links ────────────────────────────────────────────────────── */}
      <Card title="Platform Links" desc="Restaurant codes and URLs on Zomato and Swiggy"
        action={editSection !== 'links' && <EditBtn onClick={() => setEditSection('links')} testId="edit-links-btn" />}>
        {editSection === 'links' ? (
          <>
            <Grid2>
              <Field label="Zomato Code"><TextInput value={configState.zomatoCode} onChange={e => updateField('zomatoCode', e.target.value)} testId="zomato-code-input" /></Field>
              <Field label="Zomato URL"><TextInput value={configState.zomatoUrl} onChange={e => updateField('zomatoUrl', e.target.value)} testId="zomato-url-input" /></Field>
              <Field label="Swiggy Code">
                <div style={{ fontSize: 10, color: COLORS.grayText, marginBottom: 3 }}>API field: swiggi_code</div>
                <TextInput value={configState.swiggiCode} onChange={e => updateField('swiggiCode', e.target.value)} placeholder="Enter Swiggy code" testId="swiggi-code-input" />
              </Field>
              <Field label="Swiggy URL">
                <div style={{ fontSize: 10, color: COLORS.grayText, marginBottom: 3 }}>API field: swiggi_url</div>
                <TextInput value={configState.swiggiUrl} onChange={e => updateField('swiggiUrl', e.target.value)} placeholder="Enter Swiggy URL" testId="swiggi-url-input" />
              </Field>
            </Grid2>
            <SaveCancel onSave={() => setEditSection(null)} onCancel={() => setEditSection(null)} saveTestId="save-links" cancelTestId="cancel-links" />
          </>
        ) : (
          <Grid2>
            <Field label="Zomato Code"><ReadVal value={configState.zomatoCode} /></Field>
            <Field label="Zomato URL"><ReadVal value={configState.zomatoUrl} /></Field>
            <Field label="Swiggy Code"><ReadVal value={configState.swiggiCode || '—'} /></Field>
            <Field label="Swiggy URL"><ReadVal value={configState.swiggiUrl || '—'} /></Field>
          </Grid2>
        )}
      </Card>

      {/* ── Platform Status (OD-20: toggle=display only, button=action) ─────── */}
      <Card title="Platform Status" desc="Control whether this brand is accepting orders on each platform" accent>
        <div style={{ background: '#FFFBEB', border: '1px solid #D9770630', borderRadius: 8, padding: '8px 12px', fontSize: 10, color: '#D97706', fontWeight: 600, marginBottom: 12 }}>
          Toggling platforms immediately affects live order acceptance on Zomato / Swiggy
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {['zomato', 'swiggy'].map(platform => {
            const isLive = platform === 'zomato' ? configState.zomatoStatus : configState.swiggyStatus;
            const bg     = isLive ? '#F0FFF4' : '#FEF2F2';
            const border = isLive ? '#05966930' : '#EF444430';
            return (
              <div key={platform} data-testid={`${platform}-status-card`}
                style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.darkText }}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                  {/* OD-20: visual display only — NOT interactive */}
                  <StatusToggle on={isLive} testId={`${platform}-status-indicator`} />
                </div>
                <div style={{ fontSize: 10, color: isLive ? '#059669' : '#EF4444', fontWeight: 600, marginBottom: 8 }}>
                  {isLive ? '● LIVE — accepting orders' : '● OFFLINE — not accepting orders'}
                </div>
                <button data-testid={`${platform}-toggle-btn`} onClick={() => setShowDialog(platform)}
                  style={{ width: '100%', fontSize: 10, fontWeight: 600, color: isLive ? '#EF4444' : '#059669', border: `1px solid ${isLive ? '#EF4444' : '#059669'}`, background: 'transparent', padding: '5px 0', borderRadius: 6, cursor: 'pointer' }}>
                  {isLive ? `Disable on ${platform.charAt(0).toUpperCase() + platform.slice(1)}` : `Enable on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Confirmation Dialog ───────────────────────────────────────────────── */}
      {showDialog && (
        <div data-testid="platform-toggle-dialog"
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 380, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.darkText, marginBottom: 10 }}>
              {(showDialog === 'zomato' ? configState.zomatoStatus : configState.swiggyStatus)
                ? `Disable on ${showDialog.charAt(0).toUpperCase() + showDialog.slice(1)}?`
                : `Enable on ${showDialog.charAt(0).toUpperCase() + showDialog.slice(1)}?`}
            </div>
            <div style={{ fontSize: 12, color: COLORS.grayText, marginBottom: 20, lineHeight: 1.6 }}>
              This will immediately affect live order acceptance on{' '}
              <strong>{showDialog.charAt(0).toUpperCase() + showDialog.slice(1)}</strong>.
              You can reverse this at any time.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button data-testid="dialog-cancel" onClick={() => setShowDialog(null)}
                style={{ fontSize: 12, color: COLORS.grayText, border: `1px solid ${COLORS.borderGray}`, background: 'transparent', padding: '8px 18px', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button data-testid="dialog-confirm" onClick={() => handleToggleConfirm(showDialog)}
                style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#EF4444', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Push Store ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button data-testid="push-store-btn" onClick={handlePushStore} disabled={pushSaving}
          style={{ fontSize: 12, fontWeight: 600, color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}`, background: 'transparent', padding: '9px 20px', borderRadius: 8, cursor: pushSaving ? 'not-allowed' : 'pointer', opacity: pushSaving ? 0.7 : 1 }}>
          {pushSaving ? 'Pushing…' : 'Push Store to UrbanPiper'}
        </button>
        <span style={{ fontSize: 10, color: COLORS.grayText }}>
          Registers or updates your store with UrbanPiper after config changes
        </span>
      </div>

      {/* ── Sticky Save Bar ────────────────────────────────────────────────────── */}
      <div data-testid="config-save-bar"
        style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: `1px solid ${COLORS.borderGray}`, padding: '12px 0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button data-testid="save-config-btn" onClick={handleSaveConfig} disabled={saving}
          style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: saving ? '#ccc' : COLORS.primaryGreen, border: 'none', padding: '9px 24px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
