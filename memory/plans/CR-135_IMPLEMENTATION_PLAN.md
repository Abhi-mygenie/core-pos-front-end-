# CR-135 — Implementation Plan (Gate 3, FINAL)
**Date:** 2026-08-10
**Role:** PLANNING Gate 3
**Risk:** HIGH
**Sprint:** pos_5_1
**Status:** COMPLETE — AWAITING GATE 4 GO

---

## All 4 Blocking Doubts Resolved

| Doubt | Answer | Impact on plan |
|---|---|---|
| D1: update-settings full-replace or partial? | **PARTIAL MERGE** — only present keys updated | OperationalTab sends sparse `{ basic: {8 fields only} }` — NO getSettings() needed. `restaurantSettingsTransform.js` NOT touched. |
| D2: POST /restaurant-clients response shape | `suggested_store_id` TOP-LEVEL, `data.id` inside data | `createBrand()` reads `res.suggested_store_id` and `res.data.id` |
| D3: GET /aggregator-config for new brand | 200, `data.id = null` (findOrEmptyConfig), `suggested_store_id` top-level | `fromAPI.config` detects `isNewConfig = (d.id === null)`. Prefills `storeId` from top-level `suggested_store_id`. |
| D4: clients when no sub-brands | `clients: 0` (integer, NOT `[]`) | Guard: `Array.isArray(response.clients) ? response.clients : []` |

---

## File List (Final)

| # | File | Type | Reason for change |
|---|---|---|---|
| 1 | `api/constants.js` | EDIT | +4 endpoint constants |
| 2 | `api/services/aggregatorConfigService.js` | NEW | All API calls inc. sparse operational save |
| 3 | `api/transforms/aggregatorConfigTransform.js` | NEW | fromAPI config + brands; toAPI config |
| 4 | `components/settings/aggregatorSetup/AggregatorSetupView.jsx` | NEW | Container: brand state, tabs, dirty |
| 5 | `components/settings/aggregatorSetup/ConfigTab.jsx` | NEW | 3-state brand UI, view/edit cards, platform status |
| 6 | `components/settings/aggregatorSetup/OperationalTab.jsx` | NEW | 8 operational flags + bonus brackets editor |
| 7 | `pages/AggregatorSetupPage.jsx` | NEW | Route wrapper |
| 8 | `components/layout/Sidebar.jsx` | EDIT | +aggregator section + VISIBLE_SECTIONS |
| 9 | `App.js` | EDIT | +import + protected route |

**NOT touching:** `restaurantSettingsTransform.js` (D1 answer removes need), `profileTransform.js`, `aggregatorService.js`, all R5 hotspots.

---

## Execution Sequence (MANDATORY)
```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
```
Must compile after every file. Stop on any webpack error.

---

## EDIT 1 — `api/constants.js`

**Where:** After line 489 (`}`  closing `AGGREGATOR_ENDPOINTS`), before line 491 (`export const AGGREGATOR_CANCEL_REASONS`)

**Insert exactly:**
```js
// CR-135: Aggregator Config + Setup endpoints
export const AGGREGATOR_CONFIG_ENDPOINTS = {
  CONFIG:       '/api/v2/vendoremployee/aggregator-config',
  CLIENTS:      '/api/v2/vendoremployee/aggregator-config/restaurant-clients',
  PUSH_STORE:   '/api/v2/vendoremployee/aggregator-config/push-store',
  STORE_TOGGLE: '/api/v2/vendoremployee/aggregator-config/store-toggle',
};

```

**Note:** `getBrands()` reuses existing `RECIPE_MAPPING_ENDPOINTS.RESTAURANT_CLIENTS` (line 241) for GET. `AGGREGATOR_CONFIG_ENDPOINTS.CLIENTS` is POST create-brand only.

**Self-test:** `grep -n "AGGREGATOR_CONFIG_ENDPOINTS" src/api/constants.js` → 1 result.

---

## NEW FILE 2 — `api/services/aggregatorConfigService.js`

```js
// CR-135: Aggregator Config service
import api from '../axios';
import { API_ENDPOINTS, AGGREGATOR_CONFIG_ENDPOINTS, RECIPE_MAPPING_ENDPOINTS } from '../constants';

// ── Helpers (local — not exported) ──────────────────────────────────────────
const toYesNo  = (bool) => (bool ? 'Yes' : 'No');
const capitalize = (str) => (str || 'ready').replace(/^\w/, c => c.toUpperCase());

// ── Brand list ───────────────────────────────────────────────────────────────
// GET /api/v2/vendoremployee/product/restaurant-clients
// Response: { status, clients_found, clients: [...] | 0 }
export const getBrands = async () => {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.RESTAURANT_CLIENTS);
  return res.data;
};

// ── Config fetch ─────────────────────────────────────────────────────────────
// GET /api/v2/vendoremployee/aggregator-config
// GET /api/v2/vendoremployee/aggregator-config?client_id=107
// Response: { status, suggested_store_id, data: { id, store_id, urban_key, … } }
// New brand: data.id = null, all fields null  (findOrEmptyConfig — never 404)
export const getConfig = async (clientId = null) => {
  const url = clientId
    ? `${AGGREGATOR_CONFIG_ENDPOINTS.CONFIG}?client_id=${clientId}`
    : AGGREGATOR_CONFIG_ENDPOINTS.CONFIG;
  const res = await api.get(url);
  return res.data;
};

// ── Config save ──────────────────────────────────────────────────────────────
// POST /api/v2/vendoremployee/aggregator-config  (flat JSON body — no FormData)
// Both create + update via POST (R25 exception, confirmed)
// payload = toAPI.config(state) from aggregatorConfigTransform
export const saveConfig = async (payload) => {
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.CONFIG, payload);
  return res.data;
};

// ── Create brand (Step 1 of Add New Brand) ───────────────────────────────────
// POST /api/v2/vendoremployee/aggregator-config/restaurant-clients
// Body: { name, phone, email?, address? }
// Response: { status, message, suggested_store_id (top-level), data: { id, restaurant_id, name, phone, … } }
export const createBrand = async ({ name, phone, email, address }) => {
  const body = { name, phone };
  if (email)   body.email   = email;
  if (address) body.address = address;
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.CLIENTS, body);
  return res.data; // caller reads res.data.id  and  res.suggested_store_id (top-level in res.data from axios = response.data)
};

// ── Push store ───────────────────────────────────────────────────────────────
// POST /api/v2/vendoremployee/aggregator-config/push-store
// Body: { client_id? } — omit for main brand
export const pushStore = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.PUSH_STORE, body);
  return res.data;
};

// ── Store toggle ─────────────────────────────────────────────────────────────
// POST /api/v2/vendoremployee/aggregator-config/store-toggle
// action: 'enable' | 'disable'
// platforms: ['zomato'] | ['swiggy'] | ['zomato','swiggy']
// client_id: omit for main brand
export const storeToggle = async (action, platforms, clientId = null) => {
  const body = { action, platforms };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.STORE_TOGGLE, body);
  return res.data;
};

// ── Operational settings save (sparse — PARTIAL MERGE confirmed D1) ──────────
// POST /api/v2/vendoremployee/restaurant-settings/update-settings
// Sends ONLY 8 aggregator fields inside data.basic  — backend leaves other fields alone
// DO NOT add undefined/null keys — send sparse object only
export const updateOperationalSettings = async (form) => {
  const formData = new FormData();
  formData.append('data', JSON.stringify({
    basic: {
      aggregator_auto_kot:        toYesNo(form.aggregatorAutoKot),
      aggregator_auto_bill:       toYesNo(form.aggregatorAutoBill),
      aggregator_auto_bill_stage: capitalize(form.aggregatorAutoBillStage),  // 'ready'→'Ready' (OD-23)
      auto_prep_time_ack:         toYesNo(form.autoPrepTimeAck),
      aggregator_order_tone:      form.aggregatorOrderTone  || 'default',    // 'silent'|'default'|'buzzer'
      default_prep_time:          parseInt(form.defaultPrepTime) || 15,      // integer 1-120
      prep_time_count_method:     form.prepTimeCountMethod  || 'quantity',   // 'quantity'|'distinct'
      prep_time_bonus_config:     Array.isArray(form.prepTimeBonusConfig)
                                    ? form.prepTimeBonusConfig : [],          // [{min_items,max_items,bonus_minutes}]
    },
  }));
  const res = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
  return res.data;
};
```

**Self-test:** Import from the file in a test component, verify no circular import. All 7 functions exported.

---

## NEW FILE 3 — `api/transforms/aggregatorConfigTransform.js`

```js
// CR-135: Aggregator Config transform
// ⚠️  swiggi_code / swiggi_url  = backend typo — preserve exactly
// ⚠️  swiggy_status             = correct spelling (unlike swiggi_code/url)
// ⚠️  GET wrapper: response.data (NOT response.config)
// ⚠️  POST body: flat top-level fields ($request->all())
// ⚠️  Pass-through via _raw: tone_timing, auto_aknowledge, auto_kot_id, notification_number, parent_store_id

const deepClone = (obj) => {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
};

export const aggregatorConfigTransform = {

  // ── GET /aggregator-config  →  FE state ────────────────────────────────────
  // response = { status, suggested_store_id, data: { id, store_id, urban_key, … } }
  // New brand: data.id = null, store_id = null, all fields null  (findOrEmptyConfig)
  fromAPI: {
    config: (response) => {
      const d = response?.data || {};
      // isNewConfig: no config record exists yet for this brand
      const isNewConfig = (d.id === null || d.id === undefined);
      return {
        _raw:         deepClone(d),   // full raw → pass-through on POST (tone_timing etc.)
        isNewConfig,
        configId:     d.id          || null,
        clientId:     d.client_id   || null,
        // Prefill storeId from top-level suggested_store_id if no config yet (D3)
        storeId:      d.store_id    || response?.suggested_store_id || '',
        suggestedStoreId: response?.suggested_store_id || '',
        urbanKey:     d.urban_key   || '',
        urbanToken:   d.urban_token || '',
        city:         d.city        || '',
        pincode:      d.pincode     || '',
        zomatoCode:   d.zomato_code || '',
        zomatoUrl:    d.zomato_url  || '',
        swiggiCode:   d.swiggi_code || '',   // ⚠️ typo preserved — do NOT rename
        swiggiUrl:    d.swiggi_url  || '',   // ⚠️ typo preserved
        zomatoStatus: d.zomato_status  === 'Yes',   // null → false for new brand ✅
        swiggyStatus: d.swiggy_status  === 'Yes',   // ⚠️ correct spelling; null → false ✅
        // Excluded (OD-16,17,18): auto_aknowledge, auto_kot_id, notification_number
      };
    },

    // GET /restaurant-clients  →  sub-brands array
    // response = { status, clients_found, clients: [...] | 0 }
    // D4: clients is integer 0 when empty — guard with Array.isArray
    brands: (response) => {
      if (!response?.clients_found || !Array.isArray(response.clients)) return [];
      return response.clients.map(c => ({
        id:      c.id,
        name:    c.name     || '',
        phone:   c.phone    || '',
        email:   c.email    || '',
        address: c.address  || '',
        status:  c.status,
      }));
    },

    // POST /restaurant-clients  →  new brand result
    // response = { status, message, suggested_store_id (TOP-LEVEL), data: { id, name, … } }
    // D2: suggested_store_id is top-level, NOT inside data
    newBrand: (response) => ({
      id:              response?.data?.id,
      suggestedStoreId: response?.suggested_store_id || '',  // top-level (D2)
      name:            response?.data?.name || '',
    }),
  },

  // ── FE state  →  POST /aggregator-config (flat body) ──────────────────────
  // Spreads _raw first (pass-through), then overlays user-edited fields
  toAPI: {
    config: (state) => ({
      // Pass-through: tone_timing, auto_aknowledge, auto_kot_id, notification_number, parent_store_id
      ...(state._raw || {}),
      // User-edited fields (overlay)
      store_id:      state.storeId,
      urban_key:     state.urbanKey,
      urban_token:   state.urbanToken,
      city:          state.city,
      pincode:       state.pincode,
      zomato_code:   state.zomatoCode,
      zomato_url:    state.zomatoUrl,
      swiggi_code:   state.swiggiCode,   // ⚠️ typo preserved
      swiggi_url:    state.swiggiUrl,    // ⚠️ typo preserved
      zomato_status: state.zomatoStatus ? 'Yes' : 'No',
      swiggy_status: state.swiggyStatus ? 'Yes' : 'No',  // ⚠️ correct spelling
      ...(state.clientId ? { client_id: state.clientId } : {}),
    }),
  },
};
```

**Self-test V2:** `fromAPI.config` uses `response.data` not `response.config`.
**Self-test V3:** `_raw` stored.
**Self-test V4:** `toAPI.config` spreads `_raw`.
**Self-test V5:** `swiggi_code` used.
**Self-test V6:** `swiggy_status` used.
**Self-test D2:** `newBrand` reads `response.suggested_store_id` (top-level).
**Self-test D4:** `Array.isArray(response.clients)` guard in `brands`.

---

## NEW FILE 4 — `components/settings/aggregatorSetup/AggregatorSetupView.jsx`

```jsx
// CR-135: Aggregator Setup container
import React, { useState, useEffect, useCallback } from 'react';
import { getBrands, getConfig } from '../../../api/services/aggregatorConfigService';
import { aggregatorConfigTransform } from '../../../api/transforms/aggregatorConfigTransform';
import ConfigTab from './ConfigTab';
import OperationalTab from './OperationalTab';
import { COLORS } from '../../../constants';

export default function AggregatorSetupView() {
  const [activeTab,     setActiveTab]     = useState('config');
  const [subBrands,     setSubBrands]     = useState([]);          // array from fromAPI.brands
  const [activeClientId,setActiveClientId]= useState(null);        // null = main brand
  const [configState,   setConfigState]   = useState(null);        // from fromAPI.config
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [dirty,         setDirty]         = useState(false);

  // Load brands on mount
  useEffect(() => {
    getBrands()
      .then(res => setSubBrands(aggregatorConfigTransform.fromAPI.brands(res)))
      .catch(() => setSubBrands([]));
  }, []);

  // Load config when active brand changes
  const loadConfig = useCallback((clientId) => {
    setLoading(true);
    setError(null);
    getConfig(clientId)
      .then(res => {
        setConfigState(aggregatorConfigTransform.fromAPI.config(res));
        setDirty(false);
      })
      .catch(err => setError(err.message || 'Failed to load config'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConfig(activeClientId); }, [activeClientId, loadConfig]);

  const handleBrandChange = (clientId) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch brand?')) return;
    setActiveClientId(clientId);
  };

  const handleBrandCreated = (newBrand) => {
    // After Step 1: add to list, switch to new brand (triggers config load = empty config)
    setSubBrands(prev => [...prev, { id: newBrand.id, name: newBrand.name }]);
    setActiveClientId(newBrand.id);
  };

  return (
    <div data-testid="aggregator-setup-page" style={{ maxWidth: 860 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.borderGray}`, marginBottom: 20 }}>
        {[{ id: 'config', label: 'Configuration' }, { id: 'operational', label: 'Operational Settings' }]
          .map(t => (
            <button key={t.id} data-testid={`tab-${t.id}`} onClick={() => setActiveTab(t.id)}
              style={{ padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
                color: activeTab === t.id ? COLORS.primaryOrange : COLORS.grayText,
                borderBottom: activeTab === t.id ? `2px solid ${COLORS.primaryOrange}` : '2px solid transparent',
                marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
      </div>

      {activeTab === 'config' && (
        <>
          {loading  && <div data-testid="config-loading">Loading…</div>}
          {error    && <div data-testid="config-error" style={{ color: 'red' }}>{error}</div>}
          {!loading && !error && configState && (
            <ConfigTab
              configState={configState}
              setConfigState={setConfigState}
              subBrands={subBrands}
              activeClientId={activeClientId}
              onBrandChange={handleBrandChange}
              onBrandCreated={handleBrandCreated}
              onConfigSaved={() => { setDirty(false); loadConfig(activeClientId); }}
              onDirty={() => setDirty(true)}
              saving={saving}
              setSaving={setSaving}
            />
          )}
        </>
      )}

      {activeTab === 'operational' && <OperationalTab />}
    </div>
  );
}
```

---

## NEW FILE 5 — `components/settings/aggregatorSetup/ConfigTab.jsx`

**Key logic — all curl-verified:**

```jsx
// CR-135: Config Tab
import React, { useState } from 'react';
import { saveConfig, createBrand, pushStore, storeToggle } from '../../../api/services/aggregatorConfigService';
import { aggregatorConfigTransform } from '../../../api/transforms/aggregatorConfigTransform';
import { useToast } from '../../../hooks/use-toast';

export default function ConfigTab({
  configState, setConfigState,
  subBrands, activeClientId,
  onBrandChange, onBrandCreated,
  onConfigSaved, onDirty,
  saving, setSaving,
}) {
  const { toast } = useToast();
  const [editSection,   setEditSection]   = useState(null);  // 'credentials'|'location'|'links'|null
  const [showAddBrand,  setShowAddBrand]  = useState(false);
  const [addForm,       setAddForm]       = useState({ name: '', phone: '', email: '', address: '' });
  const [addSaving,     setAddSaving]     = useState(false);
  const [showDialog,    setShowDialog]    = useState(null);   // 'zomato'|'swiggy'|null
  const [pushSaving,    setPushSaving]    = useState(false);

  const hasSubBrands = subBrands.length > 0;

  // ── Field update helper ─────────────────────────────────────────────────
  const updateField = (key, val) => {
    setConfigState(prev => ({ ...prev, [key]: val }));
    onDirty();
  };

  // ── Save Configuration ──────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await saveConfig(aggregatorConfigTransform.toAPI.config(configState));
      toast({ title: 'Configuration saved' });
      onConfigSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Create Brand (Step 1) ────────────────────────────────────────────────
  const handleCreateBrand = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      toast({ title: 'Brand name and phone are required', variant: 'destructive' });
      return;
    }
    setAddSaving(true);
    try {
      const res = await createBrand(addForm);
      const newBrand = aggregatorConfigTransform.fromAPI.newBrand(res);
      // newBrand = { id, suggestedStoreId (top-level D2), name }
      onBrandCreated(newBrand);
      setShowAddBrand(false);
      setAddForm({ name: '', phone: '', email: '', address: '' });
      toast({ title: 'Brand created — fill in UrbanPiper credentials to complete setup' });
    } catch (e) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    } finally {
      setAddSaving(false);
    }
  };

  // ── Push Store ────────────────────────────────────────────────────────────
  const handlePushStore = async () => {
    setPushSaving(true);
    try {
      await pushStore(activeClientId);
      toast({ title: 'Store pushed to UrbanPiper' });
    } catch (e) {
      toast({ title: 'Push failed', description: e.message, variant: 'destructive' });
    } finally {
      setPushSaving(false);
    }
  };

  // ── Store Toggle ─────────────────────────────────────────────────────────
  // platforms: 'zomato' | 'swiggy'
  const handleToggleConfirm = async (platform) => {
    const isLive = platform === 'zomato' ? configState.zomatoStatus : configState.swiggyStatus;
    const action = isLive ? 'disable' : 'enable';
    setShowDialog(null);
    setSaving(true);
    try {
      await storeToggle(action, [platform], activeClientId);
      const key = platform === 'zomato' ? 'zomatoStatus' : 'swiggyStatus';
      setConfigState(prev => ({ ...prev, [key]: !isLive }));
      toast({ title: `${platform} ${action}d successfully` });
    } catch (e) {
      toast({ title: 'Toggle failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="config-tab">

      {/* isNewConfig banner */}
      {configState.isNewConfig && (
        <div data-testid="new-config-banner" style={{ background: '#EBF5FF', border: '1px solid #3B82F630', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>
          No UrbanPiper configuration yet for this brand — fill in your details and save.
        </div>
      )}

      {/* ── Brand Setup ─────────────────────────────────── */}
      <section data-testid="brand-setup-card">
        {/* State A: no sub-brands → static label */}
        {!hasSubBrands && !showAddBrand && (
          <div data-testid="brand-label-main">Main Brand</div>
        )}
        {/* State B: sub-brands → dropdown */}
        {hasSubBrands && !showAddBrand && (
          <select data-testid="brand-selector"
            value={activeClientId ?? ''}
            onChange={e => onBrandChange(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Main Brand</option>
            {subBrands.map(b => (
              <option key={b.id} value={b.id}>{b.name} (Client #{b.id})</option>
            ))}
          </select>
        )}

        {/* Store ID — always read-only */}
        {!showAddBrand && (
          <div data-testid="store-id-display">{configState.storeId || configState.suggestedStoreId || '—'}</div>
        )}

        {/* State C: Add New Brand inline form */}
        {showAddBrand ? (
          <div data-testid="add-brand-form">
            <input data-testid="new-brand-name"  placeholder="Brand Name *" value={addForm.name}    onChange={e => setAddForm(f => ({ ...f, name:    e.target.value }))} />
            <input data-testid="new-brand-phone" placeholder="Phone *"       value={addForm.phone}   onChange={e => setAddForm(f => ({ ...f, phone:   e.target.value }))} />
            <input data-testid="new-brand-email" placeholder="Email"         value={addForm.email}   onChange={e => setAddForm(f => ({ ...f, email:   e.target.value }))} />
            <input data-testid="new-brand-address" placeholder="Address"     value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} />
            <button data-testid="cancel-add-brand"  onClick={() => setShowAddBrand(false)}>Cancel</button>
            <button data-testid="submit-add-brand"  onClick={handleCreateBrand} disabled={addSaving}>
              {addSaving ? 'Creating…' : 'Create Brand →'}
            </button>
          </div>
        ) : (
          <button data-testid="add-brand-btn" onClick={() => setShowAddBrand(true)}>+ Add New Brand</button>
        )}
      </section>

      {/* ── UrbanPiper Credentials (view/edit) ─────────── */}
      <section data-testid="credentials-card">
        {editSection === 'credentials' ? (
          <>
            <input data-testid="urban-key-input"   type="password" value={configState.urbanKey}   onChange={e => updateField('urbanKey',   e.target.value)} />
            <input data-testid="urban-token-input" type="password" value={configState.urbanToken} onChange={e => updateField('urbanToken', e.target.value)} />
            <button data-testid="save-credentials"   onClick={() => setEditSection(null)}>Save Changes</button>
            <button data-testid="cancel-credentials" onClick={() => setEditSection(null)}>Cancel</button>
          </>
        ) : (
          <>
            <span data-testid="urban-key-masked">{'•'.repeat(12)}</span>
            <span data-testid="urban-token-masked">{'•'.repeat(12)}</span>
            <button data-testid="edit-credentials-btn" onClick={() => setEditSection('credentials')}>✎ Edit</button>
          </>
        )}
      </section>

      {/* ── Location (view/edit) ────────────────────────── */}
      <section data-testid="location-card">
        {editSection === 'location' ? (
          <>
            <input data-testid="city-input"    value={configState.city}    onChange={e => updateField('city',    e.target.value)} />
            <input data-testid="pincode-input" value={configState.pincode} onChange={e => updateField('pincode', e.target.value)} />
            <button data-testid="save-location"   onClick={() => setEditSection(null)}>Save Changes</button>
            <button data-testid="cancel-location" onClick={() => setEditSection(null)}>Cancel</button>
          </>
        ) : (
          <>
            <span data-testid="city-display">{configState.city || '—'}</span>
            <span data-testid="pincode-display">{configState.pincode || '—'}</span>
            <button data-testid="edit-location-btn" onClick={() => setEditSection('location')}>✎ Edit</button>
          </>
        )}
      </section>

      {/* ── Platform Links (view/edit) ──────────────────── */}
      <section data-testid="links-card">
        {editSection === 'links' ? (
          <>
            <input data-testid="zomato-code-input" value={configState.zomatoCode} onChange={e => updateField('zomatoCode', e.target.value)} />
            <input data-testid="zomato-url-input"  value={configState.zomatoUrl}  onChange={e => updateField('zomatoUrl',  e.target.value)} />
            {/* swiggi_ fields: API typo preserved (OD locked) */}
            <input data-testid="swiggi-code-input" value={configState.swiggiCode} onChange={e => updateField('swiggiCode', e.target.value)} placeholder="API field: swiggi_code" />
            <input data-testid="swiggi-url-input"  value={configState.swiggiUrl}  onChange={e => updateField('swiggiUrl',  e.target.value)} placeholder="API field: swiggi_url" />
            <button data-testid="save-links"   onClick={() => setEditSection(null)}>Save Changes</button>
            <button data-testid="cancel-links" onClick={() => setEditSection(null)}>Cancel</button>
          </>
        ) : (
          <>
            <span data-testid="zomato-code-display">{configState.zomatoCode || '—'}</span>
            <span data-testid="zomato-url-display">{configState.zomatoUrl || '—'}</span>
            <span data-testid="swiggy-code-display">{configState.swiggiCode || '—'}</span>
            <span data-testid="swiggy-url-display">{configState.swiggiUrl || '—'}</span>
            <button data-testid="edit-links-btn" onClick={() => setEditSection('links')}>✎ Edit</button>
          </>
        )}
      </section>

      {/* ── Platform Status (OD-20: toggle=display, button=action) ─────── */}
      <section data-testid="platform-status-card">
        {['zomato', 'swiggy'].map(platform => {
          const isLive = platform === 'zomato' ? configState.zomatoStatus : configState.swiggyStatus;
          return (
            <div key={platform} data-testid={`${platform}-status-card`}>
              {/* OD-20: visual indicator only — NOT clickable */}
              <span data-testid={`${platform}-status-indicator`}
                style={{ background: isLive ? 'green' : 'grey', borderRadius: '50%', display: 'inline-block', width: 10, height: 10 }} />
              <span>{isLive ? 'LIVE — accepting orders' : 'OFFLINE — not accepting orders'}</span>
              {/* Button IS the sole action */}
              <button data-testid={`${platform}-toggle-btn`} onClick={() => setShowDialog(platform)}>
                {isLive ? `Disable on ${platform}` : `Enable on ${platform}`}
              </button>
            </div>
          );
        })}
      </section>

      {/* ── Confirmation Dialog ────────────────────────── */}
      {showDialog && (
        <div data-testid="platform-toggle-dialog" role="dialog">
          <p>{configState[showDialog === 'zomato' ? 'zomatoStatus' : 'swiggyStatus'] ? `Disable on ${showDialog}?` : `Enable on ${showDialog}?`}</p>
          <button data-testid="dialog-cancel"  onClick={() => setShowDialog(null)}>Cancel</button>
          <button data-testid="dialog-confirm" onClick={() => handleToggleConfirm(showDialog)}>Confirm</button>
        </div>
      )}

      {/* ── Push Store ─────────────────────────────────── */}
      <button data-testid="push-store-btn" onClick={handlePushStore} disabled={pushSaving}>
        {pushSaving ? 'Pushing…' : 'Push Store to UrbanPiper'}
      </button>

      {/* ── Sticky Save Bar ────────────────────────────── */}
      <div data-testid="config-save-bar">
        <button data-testid="save-config-btn" onClick={handleSaveConfig} disabled={saving}>
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
```

---

## NEW FILE 6 — `components/settings/aggregatorSetup/OperationalTab.jsx`

**Reads from:** `useRestaurant().settings` (camelCase keys from profileTransform)
**Saves via:** `updateOperationalSettings(form)` — sparse partial merge (D1 confirmed)
**Context refresh:** optimistic `setRestaurant` patch after save — no extra API call needed

```jsx
// CR-135: Operational Settings Tab
import React, { useState } from 'react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { updateOperationalSettings } from '../../../api/services/aggregatorConfigService';
import { useToast } from '../../../hooks/use-toast';

export default function OperationalTab() {
  const { restaurant, setRestaurant } = useRestaurant();
  const { toast } = useToast();
  const s = restaurant?.settings || {};

  // Initialize form from context (profileTransform camelCase keys)
  const [form, setForm] = useState({
    aggregatorAutoKot:      s.aggregatorAutoKot      ?? false,
    aggregatorAutoBill:     s.aggregatorAutoBill      ?? false,
    // profileTransform stores lowercase: 'ready'|'acknowledged' (L338)
    // updateOperationalSettings capitalizes before sending (capitalize fn)
    aggregatorAutoBillStage: s.aggregatorAutoBillStage ?? 'ready',
    autoPrepTimeAck:        s.autoPrepTimeAck         ?? false,
    aggregatorOrderTone:    s.aggregatorOrderTone      ?? 'default',   // 'silent'|'default'|'buzzer'
    defaultPrepTime:        s.defaultPrepTime          ?? 15,
    prepTimeCountMethod:    s.prepTimeCountMethod      ?? 'quantity',  // 'quantity'|'distinct'
    prepTimeBonusConfig:    s.prepTimeBonusConfig       ?? [],
  });

  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Bonus brackets helpers
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
      // Optimistic context patch — setRestaurant replaces full object (L24 RestaurantContext)
      setRestaurant({
        ...restaurant,
        settings: {
          ...s,
          aggregatorAutoKot:       form.aggregatorAutoKot,
          aggregatorAutoBill:      form.aggregatorAutoBill,
          aggregatorAutoBillStage: form.aggregatorAutoBillStage,  // keep lowercase in context
          autoPrepTimeAck:         form.autoPrepTimeAck,
          aggregatorOrderTone:     form.aggregatorOrderTone,
          defaultPrepTime:         form.defaultPrepTime,
          prepTimeCountMethod:     form.prepTimeCountMethod,
          prepTimeBonusConfig:     form.prepTimeBonusConfig,
        },
      });
      toast({ title: 'Operational settings saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="operational-tab">
      {/* Restaurant-wide banner */}
      <div data-testid="operational-banner">
        These settings apply to ALL aggregator orders for this restaurant (not brand-specific)
      </div>

      {/* Auto-Print */}
      <section data-testid="auto-print-section">
        <label>
          <input data-testid="auto-kot-toggle" type="checkbox" checked={form.aggregatorAutoKot}
            onChange={e => update('aggregatorAutoKot', e.target.checked)} />
          Auto KOT
        </label>
        <label>
          <input data-testid="auto-bill-toggle" type="checkbox" checked={form.aggregatorAutoBill}
            onChange={e => update('aggregatorAutoBill', e.target.checked)} />
          Auto Bill
        </label>
        {/* OD-22: stage shown ONLY when autoBill is on */}
        {form.aggregatorAutoBill && (
          <select data-testid="auto-bill-stage-select"
            value={form.aggregatorAutoBillStage}
            onChange={e => update('aggregatorAutoBillStage', e.target.value)}>
            <option value="ready">Ready</option>          {/* API: 'Ready' — capitalize fn handles */}
            <option value="acknowledged">Acknowledged</option>
          </select>
        )}
      </section>

      {/* Order Tone — API values: silent | default | buzzer */}
      <section data-testid="order-tone-section">
        <select data-testid="order-tone-select"
          value={form.aggregatorOrderTone}
          onChange={e => update('aggregatorOrderTone', e.target.value)}>
          <option value="silent">Silent</option>
          <option value="default">Default</option>
          <option value="buzzer">Buzzer</option>
        </select>
      </section>

      {/* Prep Time — API values: quantity | distinct */}
      <section data-testid="prep-time-section">
        <input data-testid="prep-time-input" type="number" min={1} max={120}
          value={form.defaultPrepTime}
          onChange={e => update('defaultPrepTime', Number(e.target.value))} />
        <select data-testid="prep-method-select"
          value={form.prepTimeCountMethod}
          onChange={e => update('prepTimeCountMethod', e.target.value)}>
          <option value="quantity">By Quantity</option>
          <option value="distinct">By Distinct Items</option>
        </select>
        <label>
          <input data-testid="auto-prep-ack-toggle" type="checkbox" checked={form.autoPrepTimeAck}
            onChange={e => update('autoPrepTimeAck', e.target.checked)} />
          Auto Acknowledge Prep Time
        </label>

        {/* OD-15: Bonus Time Brackets editor */}
        <div data-testid="bonus-brackets-section">
          <p>Bonus Time Brackets</p>
          <p>Used when food items have no prep time configured (0 or NULL). Acts as a safety fallback.</p>
          {form.prepTimeBonusConfig.map((b, i) => (
            <div key={i} data-testid={`bracket-row-${i}`}>
              <input data-testid={`bracket-min-${i}`}   type="number" value={b.min_items}     onChange={e => updateBracket(i, 'min_items',     e.target.value)} placeholder="Min Items" />
              <input data-testid={`bracket-max-${i}`}   type="number" value={b.max_items}     onChange={e => updateBracket(i, 'max_items',     e.target.value)} placeholder="Max Items" />
              <input data-testid={`bracket-bonus-${i}`} type="number" value={b.bonus_minutes} onChange={e => updateBracket(i, 'bonus_minutes', e.target.value)} placeholder="Bonus Mins" />
              <button data-testid={`bracket-delete-${i}`} onClick={() => deleteBracket(i)}>Delete</button>
            </div>
          ))}
          <button data-testid="add-bracket-btn" onClick={addBracket}>+ Add Bracket</button>
        </div>
      </section>

      <button data-testid="save-operational-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
```

---

## NEW FILE 7 — `pages/AggregatorSetupPage.jsx`

```jsx
// CR-135: Aggregator Setup page
import React from 'react';
import AggregatorSetupView from '../components/settings/aggregatorSetup/AggregatorSetupView';

export default function AggregatorSetupPage() {
  return (
    <div style={{ padding: '24px 28px', maxWidth: 920, margin: '0 auto' }} data-testid="aggregator-setup-page-wrapper">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Aggregator Setup</h1>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
          UrbanPiper configuration and aggregator order settings
        </p>
      </div>
      <AggregatorSetupView />
    </div>
  );
}
```

---

## EDIT 8 — `components/layout/Sidebar.jsx`

**Change A — line 203:** Insert before `];` (closing of sidebarMenuItems array):
```js
  // CR-135: Aggregator Setup
  {
    id: 'aggregator',
    label: 'Aggregator',
    icon: Link2,                         // add Link2 to lucide import line 3–8 (Link is not imported; Link2 is the delivery/chain icon)
    children: [
      { id: 'aggregator-setup', label: 'Aggregator Setup', path: '/aggregator/setup' },
      { id: 'food-mapping',     label: 'Food Mapping',     comingSoon: true },
    ],
  },
```

**Change B — line 296:** Add `'aggregator'` to VISIBLE_SECTIONS:
```js
const VISIBLE_SECTIONS = new Set(['dashboard', 'day-closure', 'expenses', 'menu-management', 'credit', 'reports', 'settings', 'inventory', 'insights', 'aggregator']); // CR-041, CR-059, CR-072, CR-135
```

**⚠️ Icon — confirmed:** `Link` is NOT in the existing lucide import (lines 3–8). Add `Link2` to the import block:
```js
// Line 3–8 — add Link2 to end:
import {
  ChevronDown, User, Home as HomeIcon, ClipboardList, BarChart3,
  UtensilsCrossed, Users, Wallet, Package, Settings, LogOut,
  PanelLeftClose, PanelLeft, RefreshCw, Bell, BellOff, Eye,
  LayoutGrid, List, Columns, Rows, LineChart, Banknote, Store as StoreIcon, Receipt, Link2
} from "lucide-react";

---

## EDIT 9 — `App.js`

**Change A — line 65:** Add import after `AggregatorPreviewPage` import:
```js
import AggregatorSetupPage from './pages/AggregatorSetupPage'; // CR-135
```

**Change B — line 195:** Add after `/aggregator-preview` route:
```jsx
<Route path="/aggregator/setup" element={<ProtectedRoute><AggregatorSetupPage /></ProtectedRoute>} />
```

---

## Verification Matrix V1–V26 (updated for D1–D4)

| # | Check | How |
|---|---|---|
| V1 | `AGGREGATOR_CONFIG_ENDPOINTS` exported with 4 keys | grep |
| V2 | `fromAPI.config` reads `response.data` not `response.config` | inspect |
| V3 | `fromAPI.config` stores `_raw` | inspect |
| V4 | `toAPI.config` spreads `_raw` | inspect |
| V5 | `toAPI.config` uses `swiggi_code` (not swiggy) | inspect |
| V6 | `toAPI.config` uses `swiggy_status` (not swiggi) | inspect |
| V7 | `saveConfig` POSTs flat JSON (no FormData wrapper) | network tab |
| V8 | `storeToggle` sends `action + platforms + optional client_id` | inspect |
| **V9-D1** | `updateOperationalSettings` sends SPARSE basic{} — no step1-6 | inspect |
| **V10-D2** | `fromAPI.newBrand` reads `response.suggested_store_id` (top-level) | inspect |
| **V11-D3** | `fromAPI.config` sets `isNewConfig = (d.id === null)` | inspect |
| **V12-D3** | `storeId` prefilled from `suggested_store_id` when `d.store_id` null | inspect |
| **V13-D4** | `fromAPI.brands` guards `Array.isArray(response.clients)` | inspect |
| V14 | `aggregator_auto_bill_stage` toAPI capitalizes ('ready'→'Ready') | unit test |
| V15 | `prep_time_bonus_config` sent as raw array (not string) | network tab |
| V16 | State A (no sub-brands): static label rendered, no dropdown | browser |
| V17 | State B: dropdown with Main Brand + sub-brands | browser |
| V18 | State C: Add New Brand form shows name*+phone* required | browser |
| V19 | New brand: isNewConfig banner shown, Store ID prefilled | browser |
| V20 | Credentials masked in view mode | browser |
| V21 | Platform toggle NOT clickable (visual only) | browser |
| V22 | Disable button → dialog → POST store-toggle | network tab |
| V23 | Webhooks section NOT rendered anywhere | browser |
| V24 | Operational: auto-bill-stage hidden when autoBill=false | browser |
| V25 | Bonus brackets: add/delete rows | browser |
| V26 | Operational save → sparse FormData `{basic:{8 fields}}` — not full payload | network tab |
| V27 | Operational save → context patch (useRestaurant().settings updates) | React DevTools |
| V28 | `/aggregator/setup` route loads, requires auth | browser |
| V29 | Sidebar AGGREGATOR section + Food Mapping SOON badge | browser |

---

## Post-Code Registry Checklist

```
□ registry.json: CR-135 → status: IMPLEMENTED, gate: 5, sprint_key: pos_5_1
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: all 9 files listed with CR-135 + 2026-08-10
□ Code markers: // CR-135 comment in EVERY new/modified file (first line)
□ Webpack: 0 new errors, 0 new warnings vs current baseline
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| storeToggle takes restaurant offline instantly | Confirmation dialog (OD-8). Test on dev environment only first. |
| `_raw` pass-through sends stale data | Always load fresh config on brand switch before save. `_raw` updates on every `getConfig()` call. |
| `clients: 0` (integer) breaks map | `Array.isArray` guard in `fromAPI.brands` (D4) |
| New brand: `data.id === null` misread | `isNewConfig = (d.id === null || d.id === undefined)` — both cases covered |
| Sidebar icon `Link` may not be imported | Verify imports before coding EDIT 8 |
| `aggregatorAutoBillStage` case drift | `capitalize` fn in service + test V14 |
| Bonus brackets with empty string inputs | `val === '' ? '' : Number(val)` in `updateBracket` — render safe |

---

```
Planning complete: CR-135
Stage: Gate 3 — Implementation Plan FINAL (all doubts resolved)
Files: 9 (3 EDIT + 6 NEW) — restaurantSettingsTransform.js DROPPED (D1 answer)
Verification: 29 checks
Doubts resolved: D1 (partial merge), D2 (top-level suggested_store_id), D3 (findOrEmptyConfig 200), D4 (clients: 0 integer)
Next: Gate 4 GO from owner → Implementation
```
