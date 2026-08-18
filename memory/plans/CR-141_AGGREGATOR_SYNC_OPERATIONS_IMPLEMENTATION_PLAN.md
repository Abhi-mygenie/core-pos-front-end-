# CR-141 — Implementation Plan: Aggregator Sync Operations + Category Timings

**Gate:** 3 ✅  
**Date:** 2026-08-14  
**Risk:** MEDIUM  
**Starting state verified:** YES — AggregatorSetupView.jsx has 2 tabs (config/operational), aggregatorConfigService.js ends at `updateOperationalSettings`  

---

## OD Defaults Adopted

| OD | Decision | Default Used |
|---|---|---|
| OD-1 | Category Timings view | **A** — single view + push-to dropdown |
| OD-2 | Sync result display | **A** — toast only ("Sync queued") |
| OD-3 | Full Master Reset confirm | **A** — type "RESET" |

Owner can override at Gate 4.

---

## Scope Lock

**Files WILL change:**
1. `src/api/constants.js` (shared with CR-140 E1 — if CR-140 already added AGGREGATOR_SYNC_ENDPOINTS, skip this)
2. `src/api/services/aggregatorConfigService.js`
3. `src/components/settings/aggregatorSetup/AggregatorSetupView.jsx`

**New files:**
- `src/components/settings/aggregatorSetup/SyncCatalogTab.jsx`
- `src/components/settings/aggregatorSetup/CategoryTimingsTab.jsx`

**Files WILL NOT touch:**
`ConfigTab.jsx`, `OperationalTab.jsx`, `aggregatorConfigTransform.js`, `menuManagementService.js`,
`menuManagementTransform.js`, all R5 hotspots

---

## Execution Sequence

```
E1 → constants.js          (additive — skip if CR-140 already landed)
E2 → aggregatorConfigService.js (additive — 6 new functions)
E3 → SyncCatalogTab.jsx    (NEW — self-contained)
E4 → CategoryTimingsTab.jsx (NEW — self-contained)
E5 → AggregatorSetupView.jsx (wires E3+E4 as new tabs)
COMPILE CHECK after E5
```

---

## E1 — `src/api/constants.js` (skip if CR-140 already added AGGREGATOR_SYNC_ENDPOINTS)

Same block as CR-140 E1 — already contains all CR-141 paths:
```js
// CR-140 + CR-141: Aggregator Sync Operations endpoints
export const AGGREGATOR_SYNC_ENDPOINTS = {
  STOCK_TOGGLE:          '/api/v2/vendoremployee/aggregator-sync/stock-toggle',
  SYNC_CATALOG:          '/api/v2/vendoremployee/aggregator-sync/sync-catalog',        // CR-141
  CLEAR_CATALOG:         '/api/v2/vendoremployee/aggregator-sync/clear-catalog',       // CR-141
  CLEAR_MODIFIERS:       '/api/v2/vendoremployee/aggregator-sync/clear-modifiers',     // CR-141
  CATEGORY_TIMINGS:      '/api/v2/vendoremployee/aggregator-sync/category-timings',    // CR-141
  CATEGORY_TIMINGS_PUSH: '/api/v2/vendoremployee/aggregator-sync/category-timings/push', // CR-141
  RESTAURANT_CLIENTS:    '/api/v2/vendoremployee/product/restaurant-clients',
};
```

**Coordination:** If CR-140 and CR-141 are implemented in the same session, add the full block once. If sequenced, E1 is already done by CR-140 — skip.

---

## E2 — `src/api/services/aggregatorConfigService.js`

**Import addition** at top of file:
```js
import { AGGREGATOR_SYNC_ENDPOINTS } from '../constants'; // CR-141
```

**After last function `updateOperationalSettings` (end of file), add 6 functions:**

```js
// ─────────────────────────────────────────────────────────────────────────────
// CR-141: Aggregator Sync Operations
// ─────────────────────────────────────────────────────────────────────────────

/** CR-141 GAP-8: Push this brand's menu to UrbanPiper. Async — two-phase. */
export const syncCatalog = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.SYNC_CATALOG, body);
  return res.data;
};

/**
 * CR-141 GAP-9: Clear catalog.
 * fullMasterReset=false → store-only (safe). fullMasterReset=true → DANGER: wipes ALL brands.
 * Never pass clientId with full reset.
 */
export const clearCatalog = async (clientId = null, fullMasterReset = false) => {
  const body = { full_master_reset: fullMasterReset };
  if (clientId && !fullMasterReset) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CLEAR_CATALOG, body);
  return res.data;
};

/** CR-141 GAP-10: Remove option/modifier groups for this store. Store-scoped. */
export const clearModifiers = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CLEAR_MODIFIERS, body);
  return res.data;
};

/** CR-141 GAP-11a: Fetch all timing groups (restaurant-wide; client_id ignored). */
export const getCategoryTimings = async () => {
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS);
  return res.data;
};

/**
 * CR-141 GAP-11b: Upsert timing groups locally then push to UrbanPiper.
 * Local save is RESTAURANT-WIDE regardless of clientId.
 * clientId selects which store credentials to use for the UP push.
 */
export const saveCategoryTimings = async (timingGroups, clientId = null) => {
  const body = { timing_groups: timingGroups };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS, body);
  return res.data;
};

/** CR-141 GAP-11c: Push existing DB rows to UrbanPiper without upsert. */
export const pushCategoryTimings = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS_PUSH, body);
  return res.data;
};
```

---

## E3 — NEW `src/components/settings/aggregatorSetup/SyncCatalogTab.jsx`

~160 lines. Self-contained — no external state, uses `activeClientId` + `subBrands` from props.

```jsx
// CR-141: Sync & Catalog tab — UrbanPiper store operations
import React, { useState } from 'react';
import { syncCatalog, clearCatalog, clearModifiers } from '../../../api/services/aggregatorConfigService';
import { useToast } from '../../../hooks/use-toast';
import { COLORS } from '../../../constants';

const Card = ({ title, desc, danger, children }) => (
  <div style={{
    border: `1px solid ${danger ? '#fca5a5' : '#e2e8f0'}`,
    background: danger ? '#fff5f5' : '#fff',
    borderRadius: 10, padding: 16, marginBottom: 12,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: danger ? '#dc2626' : '#1e293b' }}>{title}</div>
      <div style={{ fontSize: 11, color: danger ? '#b91c1c' : '#64748b', marginTop: 3 }}>{desc}</div>
    </div>
    <div>{children}</div>
  </div>
);

export default function SyncCatalogTab({ activeClientId, subBrands }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState({}); // { sync|clearStore|clearMod|fullReset: bool }
  const [resetInput, setResetInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const brandLabel = activeClientId
    ? (subBrands.find(b => b.id === activeClientId)?.name || `Client ${activeClientId}`)
    : 'Main Brand';

  const run = async (key, fn, successMsg) => {
    setLoading(p => ({ ...p, [key]: true }));
    try {
      await fn();
      toast({ title: 'Done', description: successMsg });
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Operation failed', variant: 'destructive' });
    } finally {
      setLoading(p => ({ ...p, [key]: false }));
    }
  };

  const Btn = ({ id, label, danger, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading[id]}
      data-testid={`sync-btn-${id}`}
      style={{
        padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
        background: danger ? '#dc2626' : COLORS.primaryGreen, color: '#fff',
        opacity: loading[id] ? .6 : 1,
      }}
    >
      {loading[id] ? '…' : label}
    </button>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Brand indicator */}
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Operations for: <strong style={{ color: '#1e293b' }}>{brandLabel}</strong>
      </div>

      {/* Sync Catalog */}
      <Card
        title="Sync Menu to UrbanPiper"
        desc={`Pushes ${brandLabel}'s full menu to Swiggy & Zomato. Async — store pass fires after response.`}
      >
        <Btn id="sync" label="Sync Catalog →"
          onClick={() => run('sync', () => syncCatalog(activeClientId), 'Sync queued — store pass in progress')} />
      </Card>

      {/* Clear Store */}
      <Card
        title="Clear Store Catalog"
        desc={`Removes ${brandLabel}'s items from UrbanPiper. Other brands unaffected.`}
      >
        <Btn id="clearStore" label="Clear Store →"
          onClick={() => {
            if (!window.confirm(`Clear ${brandLabel}'s store catalog from UrbanPiper?`)) return;
            run('clearStore', () => clearCatalog(activeClientId, false), 'Store catalog cleared');
          }} />
      </Card>

      {/* Clear Modifiers */}
      <Card
        title="Clear Modifiers"
        desc={`Removes option/modifier groups for ${brandLabel}'s store only.`}
      >
        <Btn id="clearMod" label="Clear Modifiers →"
          onClick={() => {
            if (!window.confirm(`Clear modifier groups for ${brandLabel}?`)) return;
            run('clearMod', () => clearModifiers(activeClientId), 'Modifiers cleared');
          }} />
      </Card>

      {/* Full Master Reset — DANGER */}
      <Card
        title="⛔ Full Master Reset"
        desc="DANGER: Wipes ALL brands' shared catalog on UrbanPiper. Use only when instructed by support."
        danger
      >
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            data-testid="sync-btn-fullResetTrigger"
            style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#dc2626', color: '#fff', border: 'none' }}
          >Full Reset ⛔</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
            <div style={{ fontSize: 11, color: '#7f1d1d' }}>Type RESET to confirm:</div>
            <input
              value={resetInput}
              onChange={e => setResetInput(e.target.value)}
              placeholder="RESET"
              data-testid="reset-confirm-input"
              style={{ padding: '6px 8px', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { setShowResetConfirm(false); setResetInput(''); }}
                style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer', background: '#fff', color: '#64748b' }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (resetInput !== 'RESET') return;
                  run('fullReset', () => clearCatalog(null, true), 'Full master reset complete');
                  setShowResetConfirm(false);
                  setResetInput('');
                }}
                disabled={resetInput !== 'RESET' || loading.fullReset}
                data-testid="reset-confirm-btn"
                style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#dc2626', color: '#fff', opacity: resetInput !== 'RESET' ? .4 : 1 }}
              >Confirm</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
```

---

## E4 — NEW `src/components/settings/aggregatorSetup/CategoryTimingsTab.jsx`

~260 lines.

```jsx
// CR-141: Category Timings tab
import React, { useState, useEffect, useCallback } from 'react';
import { getCategoryTimings, saveCategoryTimings, pushCategoryTimings } from '../../../api/services/aggregatorConfigService';
import { useToast } from '../../../hooks/use-toast';
import { COLORS } from '../../../constants';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' };

const emptyGroup = () => ({
  _id: `g-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
  title: '',
  category_ids: [],
  day_slots: [{ day: 'all', slots: [{ start_time: '07:00', end_time: '23:00' }] }],
});

export default function CategoryTimingsTab({ activeClientId, subBrands, categories = [] }) {
  const { toast } = useToast();
  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editingGroup, setEditing]= useState(null); // null | group object
  const [pushTarget, setPushTarget] = useState(null); // clientId for push

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategoryTimings();
      setGroups(data.timing_groups || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load timings', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSaveAndPush = async () => {
    setSaving(true);
    try {
      // Strip _id before sending
      const payload = groups.map(({ _id, ...g }) => g);
      await saveCategoryTimings(payload, pushTarget);
      toast({ title: 'Saved & Pushed', description: 'Timings saved and pushed to UrbanPiper' });
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Save failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handlePushOnly = async () => {
    setSaving(true);
    try {
      await pushCategoryTimings(pushTarget);
      toast({ title: 'Pushed', description: 'Existing timings pushed to UrbanPiper' });
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Push failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const saveEdit = (updated) => {
    setGroups(prev =>
      prev.some(g => g._id === updated._id)
        ? prev.map(g => g._id === updated._id ? updated : g)
        : [...prev, updated]
    );
    setEditing(null);
  };

  const deleteGroup = (id) => setGroups(prev => prev.filter(g => g._id !== id));

  const brandOptions = [{ id: null, name: 'Main Brand' }, ...subBrands];

  if (loading) return <div style={{ padding: 24, color: COLORS.grayText, fontSize: 13 }}>Loading timings…</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Warning banner */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 16, display: 'flex', gap: 8 }}>
        ⚠ Category timings are <strong>shared across all brands</strong>. Saving here updates all stores.
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button
          onClick={() => setEditing(emptyGroup())}
          data-testid="timings-add-btn"
          style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: COLORS.primaryGreen, color: '#fff', border: 'none', cursor: 'pointer' }}
        >+ New Timing Group</button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Push target selector */}
          <select
            value={pushTarget ?? ''}
            onChange={e => setPushTarget(e.target.value === '' ? null : Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, color: '#334155' }}
            data-testid="timings-push-target"
          >
            {brandOptions.map(b => <option key={b.id ?? 'main'} value={b.id ?? ''}>{b.name}</option>)}
          </select>
          <button
            onClick={handleSaveAndPush}
            disabled={saving}
            data-testid="timings-save-push-btn"
            style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: COLORS.primaryOrange, color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? .6 : 1 }}
          >{saving ? '…' : 'Save & Push'}</button>
          <button
            onClick={handlePushOnly}
            disabled={saving}
            data-testid="timings-push-only-btn"
            style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: '#fff', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer', opacity: saving ? .6 : 1 }}
          >Push Only</button>
        </div>
      </div>

      {/* Timing group list */}
      {groups.length === 0 && !editingGroup && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: COLORS.grayText, fontSize: 13 }}>No timing groups yet. Add one above.</div>
      )}

      {groups.map(g => (
        editingGroup?._id === g._id ? null : (
          <TimingCard key={g._id} group={g}
            onEdit={() => setEditing({ ...g })}
            onDelete={() => deleteGroup(g._id)}
            categories={categories}
          />
        )
      ))}

      {/* Inline edit/add form */}
      {editingGroup && (
        <TimingForm
          group={editingGroup}
          categories={categories}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── TimingCard ──────────────────────────────────────────────────────────────
function TimingCard({ group, onEdit, onDelete, categories }) {
  const catNames = (group.category_ids || []).map(id => {
    const cat = categories.find(c => c.categoryId === id);
    return cat?.categoryName || `#${id}`;
  }).join(', ') || '(no categories)';

  const slotSummary = (group.day_slots || []).map(ds => {
    const day = ds.day === 'all' ? 'All days' : ds.day.charAt(0).toUpperCase() + ds.day.slice(1);
    const times = (ds.slots || []).map(s => `${s.start_time}–${s.end_time}`).join(', ');
    return `${day}: ${times}`;
  }).join(' · ');

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{group.title || '(untitled)'}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Categories: {catNames}</div>
          <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>{slotSummary}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} data-testid={`timings-edit-${group._id}`}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer', background: '#fff', color: '#475569' }}>Edit</button>
          <button onClick={onDelete} data-testid={`timings-delete-${group._id}`}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', fontSize: 11, cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── TimingForm ──────────────────────────────────────────────────────────────
function TimingForm({ group, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ ...group });

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const toggleCat = (id) => {
    const ids = form.category_ids || [];
    update('category_ids', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  };

  const isAllDays = (form.day_slots || []).length === 1 && form.day_slots[0]?.day === 'all';

  const setAllDays = (yes) => {
    if (yes) {
      update('day_slots', [{ day: 'all', slots: [{ start_time: '07:00', end_time: '23:00' }] }]);
    } else {
      update('day_slots', DAYS.map(d => ({ day: d, slots: [{ start_time: '07:00', end_time: '23:00' }] })));
    }
  };

  const updateSlotTime = (dayIdx, slotIdx, key, val) => {
    const ds = [...form.day_slots];
    ds[dayIdx] = { ...ds[dayIdx], slots: ds[dayIdx].slots.map((s, i) => i === slotIdx ? { ...s, [key]: val } : s) };
    update('day_slots', ds);
  };

  const addSlot = (dayIdx) => {
    const ds = [...form.day_slots];
    ds[dayIdx] = { ...ds[dayIdx], slots: [...ds[dayIdx].slots, { start_time: '12:00', end_time: '15:00' }] };
    update('day_slots', ds);
  };

  const removeSlot = (dayIdx, slotIdx) => {
    const ds = [...form.day_slots];
    ds[dayIdx] = { ...ds[dayIdx], slots: ds[dayIdx].slots.filter((_, i) => i !== slotIdx) };
    if (ds[dayIdx].slots.length === 0) return; // keep at least 1 slot
    update('day_slots', ds);
  };

  const inputStyle = { padding: '6px 8px', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11, background: '#fff' };

  return (
    <div style={{ border: '2px solid #bbf7d0', borderRadius: 10, padding: 16, background: '#f0fdf4', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Title</label>
          <input value={form.title} onChange={e => update('title', e.target.value)}
            placeholder="e.g. Breakfast" style={{ ...inputStyle, width: '100%' }}
            data-testid="timings-form-title" />
        </div>
      </div>

      {/* Category selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Categories</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categories.map(c => {
            const sel = (form.category_ids || []).includes(c.categoryId);
            return (
              <button key={c.categoryId} onClick={() => toggleCat(c.categoryId)}
                data-testid={`timings-cat-${c.categoryId}`}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '1px solid',
                  borderColor: sel ? '#16a34a' : '#e2e8f0',
                  background: sel ? '#dcfce7' : '#fff', color: sel ? '#15803d' : '#64748b', fontWeight: sel ? 600 : 400 }}>
                {c.categoryName}
              </button>
            );
          })}
          {categories.length === 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>No categories available</span>}
        </div>
      </div>

      {/* Day selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Days</label>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="radio" checked={isAllDays} onChange={() => setAllDays(true)}
              style={{ accentColor: COLORS.primaryOrange }} /> All days
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="radio" checked={!isAllDays} onChange={() => setAllDays(false)}
              style={{ accentColor: COLORS.primaryOrange }} /> Custom
          </label>
        </div>
      </div>

      {/* Time slots per day */}
      {(form.day_slots || []).map((ds, dayIdx) => (
        <div key={ds.day} style={{ marginBottom: 10 }}>
          {!isAllDays && <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>{DAY_LABELS[ds.day] || ds.day}</div>}
          {(ds.slots || []).map((slot, slotIdx) => (
            <div key={slotIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <input type="time" value={slot.start_time} onChange={e => updateSlotTime(dayIdx, slotIdx, 'start_time', e.target.value)}
                style={inputStyle} data-testid={`timings-start-${dayIdx}-${slotIdx}`} />
              <span style={{ fontSize: 11, color: '#64748b' }}>to</span>
              <input type="time" value={slot.end_time} onChange={e => updateSlotTime(dayIdx, slotIdx, 'end_time', e.target.value)}
                style={inputStyle} data-testid={`timings-end-${dayIdx}-${slotIdx}`} />
              {ds.slots.length > 1 && (
                <button onClick={() => removeSlot(dayIdx, slotIdx)}
                  style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={() => addSlot(dayIdx)}
            style={{ fontSize: 11, color: COLORS.primaryOrange, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add slot</button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel}
          style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, cursor: 'pointer', background: '#fff', color: '#475569' }}>Cancel</button>
        <button onClick={() => onSave(form)} data-testid="timings-form-save"
          style={{ padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: COLORS.primaryGreen, color: '#fff' }}>Save Group</button>
      </div>
    </div>
  );
}
```

---

## E5 — `src/components/settings/aggregatorSetup/AggregatorSetupView.jsx`

### E5a — Imports (after line 6 `import OperationalTab from './OperationalTab';`)

```js
import SyncCatalogTab    from './SyncCatalogTab';    // CR-141
import CategoryTimingsTab from './CategoryTimingsTab'; // CR-141
```

### E5b — Tab bar (lines 72-75): add 2 buttons after existing

**Current:**
```jsx
        <button data-testid="tab-config"      style={tabStyle('config')}      onClick={() => setActiveTab('config')}>Configuration</button>
        <button data-testid="tab-operational" style={tabStyle('operational')} onClick={() => setActiveTab('operational')}>Operational Settings</button>
```

**Replace with:**
```jsx
        <button data-testid="tab-config"      style={tabStyle('config')}      onClick={() => setActiveTab('config')}>Configuration</button>
        <button data-testid="tab-operational" style={tabStyle('operational')} onClick={() => setActiveTab('operational')}>Operational Settings</button>
        <button data-testid="tab-sync"        style={tabStyle('sync')}        onClick={() => setActiveTab('sync')}>Sync &amp; Catalog</button>    {/* CR-141 */}
        <button data-testid="tab-timings"     style={tabStyle('timings')}     onClick={() => setActiveTab('timings')}>Category Timings</button> {/* CR-141 */}
```

### E5c — Tab render (line 107 `{activeTab === 'operational' && <OperationalTab />}`): add after it

```jsx
      {activeTab === 'operational' && <OperationalTab />}
      {activeTab === 'sync' && (    // CR-141
        <SyncCatalogTab
          activeClientId={activeClientId}
          subBrands={subBrands}
        />
      )}
      {activeTab === 'timings' && ( // CR-141
        <CategoryTimingsTab
          activeClientId={activeClientId}
          subBrands={subBrands}
        />
      )}
```

**Note:** `categories` prop is not available in AggregatorSetupView. CategoryTimingsTab will receive an empty array and show "No categories available". 
**Owner Decision OD-4 (new):** Should categories be fetched inside CategoryTimingsTab from `/product/categories`, or passed from parent? 
**Default:** Fetch inside CategoryTimingsTab on mount (self-contained, no parent change needed).

### E5c amendment — CategoryTimingsTab: add internal categories fetch

Add to CategoryTimingsTab (inside the component, alongside the timings fetch):
```js
import { getCategories } from '../../../api/services/menuManagementService';
import { fromAPI } from '../../../api/transforms/menuManagementTransform';

// Inside CategoryTimingsTab component:
const [categories, setCategories] = useState([]);

useEffect(() => {
  getCategories()
    .then(res => setCategories(fromAPI.categoryList(res.data?.categories ? res.data : res.data?.data || res.data)))
    .catch(() => setCategories([]));
}, []);
```

And remove `categories` from TimingForm/CategoryTimingsTab props signature (now internal). Remove `categories={categories}` from E5c render call.

---

## Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E2 | aggregatorConfigService.js | syncCatalog fn exists | grep |
| V2 | E2 | aggregatorConfigService.js | clearCatalog fn exists | grep |
| V3 | E2 | aggregatorConfigService.js | clearModifiers fn exists | grep |
| V4 | E2 | aggregatorConfigService.js | getCategoryTimings fn exists | grep |
| V5 | E2 | aggregatorConfigService.js | saveCategoryTimings fn exists | grep |
| V6 | E2 | aggregatorConfigService.js | pushCategoryTimings fn exists | grep |
| V7 | E3 | SyncCatalogTab.jsx | file exists | ls |
| V8 | E4 | CategoryTimingsTab.jsx | file exists | ls |
| V9 | E5b | AggregatorSetupView.jsx | "Sync & Catalog" tab visible | browser |
| V10 | E5b | AggregatorSetupView.jsx | "Category Timings" tab visible | browser |
| V11 | E5c | AggregatorSetupView.jsx | SyncCatalogTab renders | browser |
| V12 | E5c | AggregatorSetupView.jsx | CategoryTimingsTab renders | browser |
| V13 | E3 | SyncCatalogTab.jsx | Network: POST sync-catalog on click | devtools |
| V14 | E3 | SyncCatalogTab.jsx | Network: clear-catalog full_master_reset:false | devtools |
| V15 | E3 | SyncCatalogTab.jsx | Full reset: enabled only after typing RESET | browser |
| V16 | E3 | SyncCatalogTab.jsx | Network: clear-catalog full_master_reset:true (no client_id) | devtools |
| V17 | E4 | CategoryTimingsTab.jsx | GET category-timings on mount | devtools |
| V18 | E4 | CategoryTimingsTab.jsx | Network: POST category-timings with timing_groups | devtools |
| V19 | E4 | CategoryTimingsTab.jsx | Shared-data warning banner visible | browser |
| V20 | E4 | CategoryTimingsTab.jsx | Push Only fires POST category-timings/push | devtools |
| V21 | E5 | AggregatorSetupView.jsx | Config + Operational tabs still work | browser |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-141 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: +5 files listed (3 edit + 2 new)
- [ ] Code markers: // CR-141 in every modified file
- [ ] Compile: webpack 0 new warnings
```
