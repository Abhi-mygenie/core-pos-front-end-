// CR-141: Category Timings tab — manage when categories are available on Swiggy/Zomato
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCategoryTimings, saveCategoryTimings, pushCategoryTimings } from '../../../api/services/aggregatorConfigService';
import { getCategories } from '../../../api/services/menuManagementService';
import { fromAPI } from '../../../api/transforms/menuManagementTransform';
import { useToast } from '../../../hooks/use-toast';
import { COLORS } from '../../../constants';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const emptyGroup = () => ({
  _id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  category_ids: [],
  day_slots: [{ day: 'all', slots: [{ start_time: '07:00', end_time: '23:00' }] }],
});

// ── TimingCard: read-only summary row ────────────────────────────────────────
function TimingCard({ group, categories, onEdit, onDelete }) {
  const catNames = (group.category_ids || [])
    .map(id => categories.find(c => c.categoryId === id)?.categoryName || `#${id}`)
    .join(', ') || '(no categories)';

  const slotSummary = (group.day_slots || []).map(ds => {
    const day = ds.day === 'all' ? 'All days' : (DAY_LABELS[ds.day] || ds.day);
    const times = (ds.slots || []).map(s => `${s.start_time}–${s.end_time}`).join(', ');
    return `${day}: ${times}`;
  }).join(' · ');

  return (
    <div style={{ border: `1px solid ${COLORS.borderGray}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.darkText }}>{group.title || '(untitled)'}</div>
          <div style={{ fontSize: 11, color: COLORS.grayText, marginTop: 3 }}>Categories: {catNames}</div>
          <div style={{ fontSize: 11, color: '#334155', marginTop: 5, lineHeight: 1.6 }}>{slotSummary}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} data-testid={`timings-edit-${group._id}`}
            style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${COLORS.borderGray}`, fontSize: 11, cursor: 'pointer', background: '#fff', color: '#475569' }}>
            Edit
          </button>
          <button onClick={onDelete} data-testid={`timings-delete-${group._id}`}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', fontSize: 11, cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TimingForm: inline add/edit form ─────────────────────────────────────────
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
      update('day_slots', DAYS.map(d => ({
        day: d, slots: [{ start_time: '07:00', end_time: '23:00' }],
      })));
    }
  };

  const updateSlotTime = (dayIdx, slotIdx, key, val) => {
    const ds = form.day_slots.map((d, i) => i !== dayIdx ? d : {
      ...d, slots: d.slots.map((s, j) => j !== slotIdx ? s : { ...s, [key]: val }),
    });
    update('day_slots', ds);
  };

  const addSlot = (dayIdx) => {
    const ds = form.day_slots.map((d, i) => i !== dayIdx ? d : {
      ...d, slots: [...d.slots, { start_time: '12:00', end_time: '15:00' }],
    });
    update('day_slots', ds);
  };

  const removeSlot = (dayIdx, slotIdx) => {
    const ds = form.day_slots.map((d, i) => {
      if (i !== dayIdx) return d;
      const slots = d.slots.filter((_, j) => j !== slotIdx);
      return slots.length > 0 ? { ...d, slots } : d; // keep at least 1 slot
    });
    update('day_slots', ds);
  };

  const inp = { padding: '6px 8px', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11, background: '#fff', outline: 'none' };
  const lbl = { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };

  return (
    <div style={{ border: '2px solid #bbf7d0', borderRadius: 10, padding: 16, background: '#f0fdf4', marginBottom: 12 }}>

      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Title</label>
        <input value={form.title} onChange={e => update('title', e.target.value)}
          placeholder="e.g. Breakfast" style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
          data-testid="timings-form-title" />
      </div>

      {/* Category selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Categories</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categories.length === 0 && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>No categories loaded</span>
          )}
          {categories.map(c => {
            const sel = (form.category_ids || []).includes(c.categoryId);
            return (
              <button key={c.categoryId} onClick={() => toggleCat(c.categoryId)}
                data-testid={`timings-cat-${c.categoryId}`}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                  border: '1px solid', borderColor: sel ? '#16a34a' : COLORS.borderGray,
                  background: sel ? '#dcfce7' : '#fff',
                  color: sel ? '#15803d' : COLORS.grayText, fontWeight: sel ? 600 : 400,
                }}>
                {c.categoryName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day picker */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Days</label>
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

      {/* Time slots */}
      {(form.day_slots || []).map((ds, dayIdx) => (
        <div key={ds.day} style={{ marginBottom: 10 }}>
          {!isAllDays && (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              {DAY_LABELS[ds.day] || ds.day}
            </div>
          )}
          {(ds.slots || []).map((slot, slotIdx) => (
            <div key={slotIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <input type="time" value={slot.start_time}
                onChange={e => updateSlotTime(dayIdx, slotIdx, 'start_time', e.target.value)}
                style={{ ...inp, width: 110 }}
                data-testid={`timings-start-${dayIdx}-${slotIdx}`} />
              <span style={{ fontSize: 11, color: COLORS.grayText }}>to</span>
              <input type="time" value={slot.end_time}
                onChange={e => updateSlotTime(dayIdx, slotIdx, 'end_time', e.target.value)}
                style={{ ...inp, width: 110 }}
                data-testid={`timings-end-${dayIdx}-${slotIdx}`} />
              {ds.slots.length > 1 && (
                <button onClick={() => removeSlot(dayIdx, slotIdx)}
                  style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button onClick={() => addSlot(dayIdx)}
            style={{ fontSize: 11, color: COLORS.primaryOrange, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            + Add slot
          </button>
        </div>
      ))}

      {/* Form actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button onClick={onCancel}
          style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${COLORS.borderGray}`, fontSize: 12, cursor: 'pointer', background: '#fff', color: COLORS.grayText }}>
          Cancel
        </button>
        <button onClick={() => onSave(form)} data-testid="timings-form-save"
          style={{ padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: COLORS.primaryGreen, color: '#fff' }}>
          Save Group
        </button>
      </div>
    </div>
  );
}

// ── Main CategoryTimingsTab ───────────────────────────────────────────────────
export default function CategoryTimingsTab({ activeClientId, subBrands }) {
  const { toast } = useToast();
  const [groups, setGroups]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [editingGroup, setEditing]  = useState(null);
  const [pushTarget, setPushTarget] = useState(null); // null = main brand

  // Fetch timings on mount
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategoryTimings();
      // Groups from API won't have _id — assign locally
      const raw = data?.timing_groups || data?.data || [];
      setGroups(raw.map((g, i) => ({
        _id: g._id || `g-${i}-${Date.now()}`,
        ...g,
      })));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load category timings', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  // Fetch categories on mount (self-contained — E5c amendment)
  useEffect(() => {
    getCategories()
      .then(res => {
        const raw = res.data?.categories ? res.data : res.data?.data || res.data;
        setCategories(fromAPI.categoryList(raw));
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveEdit = (updated) => {
    setGroups(prev =>
      prev.some(g => g._id === updated._id)
        ? prev.map(g => g._id === updated._id ? updated : g)
        : [...prev, updated]
    );
    setEditing(null);
  };

  const deleteGroup = (id) => setGroups(prev => prev.filter(g => g._id !== id));

  const stripLocalIds = (gs) => gs.map(({ _id, ...g }) => g);

  const handleSaveAndPush = async () => {
    setSaving(true);
    try {
      await saveCategoryTimings(stripLocalIds(groups), pushTarget);
      toast({ title: 'Saved & Pushed', description: 'Timings saved and pushed to UrbanPiper' });
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Save failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handlePushOnly = async () => {
    setSaving(true);
    try {
      await pushCategoryTimings(pushTarget);
      toast({ title: 'Pushed', description: 'Existing timings pushed to UrbanPiper' });
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Push failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const brandOptions = useMemo(() =>
    [{ id: null, name: 'Main Brand' }, ...(subBrands || [])],
    [subBrands]
  );

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: COLORS.grayText, fontSize: 13 }}
        data-testid="timings-loading">
        Loading category timings…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }} data-testid="category-timings-tab">

      {/* Shared-data warning */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
        padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 20,
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <span style={{ flexShrink: 0 }}>⚠</span>
        <span>
          Category timings are <strong>shared across all brands</strong>.
          Saving here updates schedules for all stores.
          The "Save &amp; Push to" selector picks which store credentials to use for the UrbanPiper push.
        </span>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button
          onClick={() => setEditing(emptyGroup())}
          data-testid="timings-add-btn"
          style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: COLORS.primaryGreen, color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          + New Timing Group
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Push target */}
          <select
            value={pushTarget === null ? '' : pushTarget}
            onChange={e => setPushTarget(e.target.value === '' ? null : Number(e.target.value))}
            data-testid="timings-push-target"
            style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${COLORS.borderGray}`, fontSize: 12, color: '#334155' }}
          >
            {brandOptions.map(b => (
              <option key={b.id ?? 'main'} value={b.id === null ? '' : b.id}>{b.name}</option>
            ))}
          </select>
          <button
            onClick={handleSaveAndPush}
            disabled={saving}
            data-testid="timings-save-push-btn"
            style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: COLORS.primaryOrange, color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? .6 : 1 }}
          >
            {saving ? '…' : 'Save & Push'}
          </button>
          <button
            onClick={handlePushOnly}
            disabled={saving}
            data-testid="timings-push-only-btn"
            style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: '#fff', color: '#475569', border: `1px solid ${COLORS.borderGray}`, cursor: 'pointer', opacity: saving ? .6 : 1 }}
          >
            Push Only
          </button>
        </div>
      </div>

      {/* Empty state */}
      {groups.length === 0 && !editingGroup && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: COLORS.grayText, fontSize: 13, border: `1px dashed ${COLORS.borderGray}`, borderRadius: 8 }}>
          No timing groups yet. Click "+ New Timing Group" to add one.
        </div>
      )}

      {/* Groups list */}
      {groups.map(g =>
        editingGroup?._id === g._id ? null : (
          <TimingCard
            key={g._id}
            group={g}
            categories={categories}
            onEdit={() => setEditing({ ...g })}
            onDelete={() => deleteGroup(g._id)}
          />
        )
      )}

      {/* Inline add/edit form */}
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
