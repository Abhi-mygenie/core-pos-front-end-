import React, { useState, useCallback } from "react";
import { Trash2, Pencil, X, Search, Plus } from "lucide-react";
import { COLORS } from "../../../constants";
import * as menuService from "../../../api/services/menuManagementService";
import { useToast } from "../../../hooks/use-toast";

// CR-144: Addon Master panel — full CRUD for restaurant-wide addons

const VEG_COLORS = {
  1: COLORS.primaryGreen,  // Veg
  2: '#EF4444',            // Non-Veg
  3: '#F59E0B',            // Egg
};

const VegDot = ({ veg }) => (
  <div style={{
    width: 10, height: 10, borderRadius: 2, flexShrink: 0,
    background: VEG_COLORS[veg] || '#D1D5DB',
  }} title={veg === 1 ? 'Veg' : veg === 2 ? 'Non-Veg' : veg === 3 ? 'Egg' : 'Unset'} />
);

const EMPTY_ADD = { name: '', price: '', weight: 0, veg: 1 };

export default function AddonManagementPanel({ addons = [], currencySymbol = '₹', onRefresh, onClose }) {
  const { toast } = useToast();
  const [search, setSearch]               = useState('');
  const [addMode, setAddMode]             = useState(false);
  const [addForm, setAddForm]             = useState(EMPTY_ADD);
  const [editingId, setEditingId]         = useState(null);
  const [editForm, setEditForm]           = useState({});
  const [saving, setSaving]               = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filtered = (addons || []).filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      name: a.name, price: a.price, weight: a.weight || 0,
      veg: a.veg ?? 1, status: a.status ?? 1,
      has_inventory: a.hasInventory ? 'Yes' : 'No',
    });
  };

  const handleAdd = useCallback(async () => {
    if (!addForm.name.trim() || !addForm.price) return;
    setSaving(true);
    try {
      await menuService.addAddon({
        name: addForm.name.trim(), price: addForm.price,
        weight: addForm.weight || 0, veg: addForm.veg,
        status: 1, has_inventory: 'No',
      });
      toast({ title: 'Added', description: `"${addForm.name}" created.` });
      setAddForm(EMPTY_ADD);
      setAddMode(false);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Failed to add', variant: 'destructive' });
    } finally { setSaving(false); }
  }, [addForm, onRefresh, toast]);

  const handleUpdate = useCallback(async (addonId) => {
    setSaving(true);
    try {
      await menuService.updateAddon(addonId, {
        name: editForm.name, price: editForm.price,
        weight: editForm.weight, veg: editForm.veg,
        status: editForm.status, has_inventory: editForm.has_inventory,
      });
      toast({ title: 'Saved', description: `"${editForm.name}" updated.` });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Failed to save', variant: 'destructive' });
    } finally { setSaving(false); }
  }, [editForm, onRefresh, toast]);

  const handleToggleStatus = useCallback(async (a) => {
    const newStatus = a.status === 1 ? 0 : 1;
    try {
      await menuService.toggleAddonStatus(a.id, newStatus);
      toast({ title: newStatus === 1 ? 'Active' : 'Inactive', description: `"${a.name}" status updated.` });
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Failed', variant: 'destructive' });
    }
  }, [onRefresh, toast]);

  const handleDelete = useCallback(async (a) => {
    try {
      await menuService.deleteAddon(a.id);
      toast({ title: 'Deleted', description: `"${a.name}" removed.` });
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Failed', variant: 'destructive' });
    }
  }, [onRefresh, toast]);

  const inputStyle = {
    padding: '5px 9px', border: `1px solid ${COLORS.borderGray}`,
    borderRadius: 6, fontSize: 12, outline: 'none', background: '#fff',
  };
  const selectStyle = { ...inputStyle };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                    borderBottom: `1px solid ${COLORS.borderGray}`, flexShrink: 0 }}>
        <button
          data-testid="add-addon-panel-btn"
          onClick={() => { setAddMode(v => !v); setEditingId(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: COLORS.primaryGreen,
                   color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 7,
                   fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Plus className="w-3.5 h-3.5" /> Add Addon
        </button>
        <div style={{ position: 'relative', flex: 1, maxWidth: 220 }}>
          <Search className="w-3.5 h-3.5" style={{ position: 'absolute', left: 9, top: '50%',
                  transform: 'translateY(-50%)', color: COLORS.grayText, pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search add-ons..."
            style={{ ...inputStyle, paddingLeft: 28, width: '100%' }} />
        </div>
        <span style={{ fontSize: 11, color: COLORS.grayText, marginLeft: 'auto' }}>
          {filtered.length} add-on{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Type','Name','Price','Weight','Stock','Inventory','Actions'].map(h => (
                <th key={h} style={{ background: '#f8fafc', padding: '9px 12px', textAlign: 'left',
                                      fontWeight: 600, color: '#475569', borderBottom: `2px solid ${COLORS.borderGray}`,
                                      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em',
                                      whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Add form row */}
            {addMode && (
              <tr style={{ background: '#f0fdf4', borderBottom: `2px solid #86efac` }}>
                <td colSpan={7} style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Name" style={{ ...inputStyle, width: 150 }} autoFocus />
                    <input type="number" value={addForm.price} onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))}
                      placeholder="Price" style={{ ...inputStyle, width: 70 }} min={0} />
                    <input type="number" value={addForm.weight} onChange={e => setAddForm(p => ({ ...p, weight: Number(e.target.value) }))}
                      placeholder="Weight g" style={{ ...inputStyle, width: 80 }} min={0} />
                    <select value={addForm.veg} onChange={e => setAddForm(p => ({ ...p, veg: Number(e.target.value) }))}
                      style={selectStyle}>
                      <option value={1}>Veg</option>
                      <option value={2}>Non-Veg</option>
                      <option value={3}>Egg</option>
                    </select>
                    <button onClick={handleAdd} disabled={saving}
                      style={{ background: COLORS.primaryGreen, color: '#fff', border: 'none',
                               padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {saving ? '...' : 'Save'}
                    </button>
                    <button onClick={() => { setAddMode(false); setAddForm(EMPTY_ADD); }}
                      style={{ background: '#fff', color: COLORS.grayText, border: `1px solid ${COLORS.borderGray}`,
                               padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {filtered.map(a => (
              <React.Fragment key={a.id}>
                {/* Addon row */}
                <tr style={{
                  opacity: a.status === 0 ? 0.5 : 1,
                  background: editingId === a.id ? '#f0fdf4' : 'transparent',
                  borderBottom: editingId === a.id ? 'none' : `1px solid #f8fafc`,
                }}>
                  <td style={{ padding: '10px 12px' }}><VegDot veg={a.veg} /></td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: '#0f172a' }}>
                    {a.name}
                    {a.status === 0 && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>(inactive)</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{currencySymbol}{a.price}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11,
                                   padding: '2px 7px', borderRadius: 5 }}>
                      {a.weight > 0 ? `${a.weight}g` : '0g'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleToggleStatus(a)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                               color: a.status === 1 ? '#16a34a' : '#dc2626', padding: 0 }}>
                      {a.status === 1 ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {a.hasInventory
                      ? <span style={{ background: '#eff6ff', color: '#3b82f6', fontSize: 11,
                                        padding: '2px 7px', borderRadius: 5 }}>Yes</span>
                      : <span style={{ color: '#94a3b8', fontSize: 11 }}>No</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => editingId === a.id ? setEditingId(null) : startEdit(a)}
                      style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                               border: `1px solid ${COLORS.borderGray}`, background: '#fff', color: '#374151',
                               marginRight: 5 }}>
                      <Pencil className="w-3 h-3 inline mr-1" />{editingId === a.id ? 'Close' : 'Edit'}
                    </button>
                    <button onClick={() => setConfirmDeleteId(a.id)}
                      style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                               border: '1px solid #fee2e2', background: '#fff', color: '#dc2626' }}>
                      <Trash2 className="w-3 h-3 inline mr-1" />Del
                    </button>
                  </td>
                </tr>

                {/* Edit row */}
                {editingId === a.id && (
                  <tr style={{ background: '#f0fdf4', borderBottom: `1px solid #bbf7d0` }}>
                    <td colSpan={7} style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                          style={{ ...inputStyle, width: 150 }} />
                        <span style={{ fontSize: 12, color: COLORS.grayText }}>₹</span>
                        <input type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))}
                          style={{ ...inputStyle, width: 70 }} min={0} />
                        <input type="number" value={editForm.weight} onChange={e => setEditForm(p => ({ ...p, weight: Number(e.target.value) }))}
                          placeholder="g" style={{ ...inputStyle, width: 70 }} min={0} />
                        <select value={editForm.veg ?? 1} onChange={e => setEditForm(p => ({ ...p, veg: Number(e.target.value) }))}
                          style={selectStyle}>
                          <option value={1}>Veg</option>
                          <option value={2}>Non-Veg</option>
                          <option value={3}>Egg</option>
                        </select>
                        {/* Inventory toggle — gated by hasRecipe */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: '#374151' }}>Inventory</span>
                          <button
                            disabled={!a.hasRecipe}
                            title={!a.hasRecipe ? 'Attach a recipe first' : 'Toggle inventory tracking'}
                            onClick={() => setEditForm(p => ({
                              ...p, has_inventory: p.has_inventory === 'Yes' ? 'No' : 'Yes'
                            }))}
                            style={{
                              width: 34, height: 18, borderRadius: 9, border: 'none', cursor: a.hasRecipe ? 'pointer' : 'not-allowed',
                              background: !a.hasRecipe ? '#f3f4f6' : editForm.has_inventory === 'Yes' ? '#d1fae5' : '#e5e7eb',
                              position: 'relative', transition: 'background 0.15s',
                            }}>
                            <div style={{
                              position: 'absolute', top: 2,
                              left: editForm.has_inventory === 'Yes' && a.hasRecipe ? 16 : 2,
                              width: 14, height: 14, borderRadius: '50%', transition: 'left 0.15s',
                              background: !a.hasRecipe ? '#d1d5db' : editForm.has_inventory === 'Yes' ? '#22c55e' : '#9ca3af',
                            }} />
                          </button>
                          {!a.hasRecipe && <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Attach a recipe first</span>}
                        </div>
                        <button onClick={() => handleUpdate(a.id)} disabled={saving}
                          style={{ background: COLORS.primaryGreen, color: '#fff', border: 'none',
                                   padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {saving ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ background: '#fff', color: COLORS.grayText, border: `1px solid ${COLORS.borderGray}`,
                                   padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {filtered.length === 0 && !addMode && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: COLORS.grayText, fontSize: 13 }}>
                {search ? `No add-ons match "${search}"` : 'No add-ons yet. Click + Add Addon to create one.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirm dialog */}
      {confirmDeleteId && (() => {
        const a = addons.find(x => x.id === confirmDeleteId);
        if (!a) return null;
        return (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <h4 style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 8 }}>Delete add-on?</h4>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Delete <strong>"{a.name}"</strong>? This cannot be undone and will remove it from all foods.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleDelete(a)}
                  style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none',
                           padding: '8px 0', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Delete
                </button>
                <button onClick={() => setConfirmDeleteId(null)}
                  style={{ flex: 1, background: '#fff', color: '#374151', border: `1px solid ${COLORS.borderGray}`,
                           padding: '8px 0', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
