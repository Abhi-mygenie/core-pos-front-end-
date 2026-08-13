// CR-086 F4: Ingredient Bulk Editor — spreadsheet-style inline editor
// BUG-213: Added page title to toolbar (G8 gap)
// Pattern: follows ExpenseBulkEditor.jsx structure
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, Download, Upload, FileDown, Trash2, X, Check, Loader2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import * as inventoryService from '@/api/services/inventoryService';
// Build row from API ingredient — track original for dirty detection
function buildRow(ing) {
  return {
    _key: `ing-${ing.id}`,
    _id: ing.id,
    _isNew: false,
    _deleted: false,
    _saving: false,
    _saveOk: false,
    _saveError: null,
    _originalName: ing.name,
    _originalCategoryId: ing.categoryId,
    _originalUnit: ing.unit,
    _originalSmallUnit: ing.smallUnit || '',
    _originalConversion: ing.conversionFactor || '',
    _originalMinQty: ing.minQtyAlert || '',
    _originalMinUnit: ing.minUnitAlert || '',
    name: ing.name,
    categoryId: ing.categoryId,
    unit: ing.unit,
    smallUnit: ing.smallUnit || '',
    conversionFactor: ing.conversionFactor || '',
    minQtyAlert: ing.minQtyAlert || '',
    minUnitAlert: ing.minUnitAlert || '',
  };
}

function isDirty(row) {
  if (row._isNew) return true;
  return (
    row.name !== row._originalName ||
    row.categoryId !== row._originalCategoryId ||
    row.unit !== row._originalUnit ||
    row.smallUnit !== row._originalSmallUnit ||
    String(row.conversionFactor) !== String(row._originalConversion) ||
    String(row.minQtyAlert) !== String(row._originalMinQty) ||
    String(row.minUnitAlert) !== String(row._originalMinUnit)
  );
}

let _newKeyCounter = 0;

export default function IngredientBulkEditor({ allItems, categories, units, onRefresh, onClose }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // BUG-276
  const newNameRef = useRef(null);
  const prevItemIds = useRef(''); // BUG-277: stable ID guard
  const saveInProgress = useRef(false); // BUG-278: re-entry guard

  // Initialise rows from props — BUG-277: only reset when actual data changes
  useEffect(() => {
    const ids = allItems.map(i => i.id).join(',');
    if (ids !== prevItemIds.current) {
      prevItemIds.current = ids;
      setRows(allItems.map(buildRow));
      setSelected(new Set());
    }
  }, [allItems]);

  // ── Derived ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return rows.filter(r => !r._deleted);
    const q = search.toLowerCase();
    return rows.filter(r => !r._deleted && r.name.toLowerCase().includes(q));
  }, [rows, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      const cid = row.categoryId;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(row);
    }
    // Sort categories alphabetically
    const catMap = new Map(categories.map(c => [c.id, c.name]));
    return [...map.entries()]
      .sort((a, b) => (catMap.get(a[0]) || '').localeCompare(catMap.get(b[0]) || ''))
      .map(([cid, items]) => ({ id: cid, name: catMap.get(cid) || 'Uncategorized', items }));
  }, [filtered, categories]);

  const dirtyCount = useMemo(() => rows.filter(r => (!r._deleted && isDirty(r)) || (r._deleted && r._id)).length, [rows]); // BUG-274: include pending deletes
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

  // ── Row mutations ──────────────────────────────────────────
  const updateRow = useCallback((key, field, value) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));
  }, []);

  const addNewRow = useCallback((categoryId) => {
    _newKeyCounter++;
    const newRow = {
      _key: `new-${_newKeyCounter}`,
      _id: null,
      _isNew: true,
      _deleted: false,
      _saving: false,
      _saveOk: false,
      _saveError: null,
      _originalName: '', _originalCategoryId: categoryId || categories[0]?.id,
      _originalUnit: '', _originalSmallUnit: '', _originalConversion: '',
      _originalMinQty: '', _originalMinUnit: '',
      name: '',
      categoryId: categoryId || categories[0]?.id,
      unit: '',
      smallUnit: '',
      conversionFactor: '',
      minQtyAlert: '',
      minUnitAlert: '',
    };
    setRows(prev => [newRow, ...prev]);
    setTimeout(() => newNameRef.current?.focus(), 50);
  }, [categories]);

  const deleteRow = useCallback((key) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, _deleted: true } : r));
    setSelected(prev => { const s = new Set(prev); s.delete(key); return s; });
  }, []);

  // ── Selection ──────────────────────────────────────────────
  const toggleSelect = (key) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r._key)));
  };
  const deleteSelected = () => {
    setShowDeleteConfirm(true); // BUG-276: proper dialog instead of window.confirm
  };
  const confirmDeleteSelected = () => {
    setRows(prev => prev.map(r => selected.has(r._key) ? { ...r, _deleted: true } : r));
    setSelected(new Set());
    setShowDeleteConfirm(false);
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (saveInProgress.current) return; // BUG-278: prevent double fire
    saveInProgress.current = true;
    try {
    const dirty = rows.filter(r => !r._deleted && isDirty(r));
    const toDelete = rows.filter(r => r._deleted && r._id); // BUG-274: moved before early return
    if (!dirty.length && !toDelete.length) { toast.info('No changes to save'); saveInProgress.current = false; return; } // BUG-274: check deletes too

    // Validate
    for (const r of dirty) {
      if (!r.name.trim()) { toast.error(`Row missing name`); return; }
      if (!r.categoryId) { toast.error(`"${r.name}" needs a category`); return; }
      if (!r.unit) { toast.error(`"${r.name}" needs a base unit`); return; }
    }

    setSaving(true);
    let ok = 0, fail = 0;

    // Process deletes first (rows marked _deleted that have _id) — BUG-274: toDelete already computed above
    for (const r of toDelete) {
      try {
        await inventoryService.deleteIngredient(r._id);
        setRows(prev => prev.filter(x => x._key !== r._key)); // remove from state immediately
        ok++;
      } catch (err) {
        fail++;
        toast.error(`Delete "${r._originalName}" failed: ${err?.readableMessage || 'error'}`);
      }
    }

    // Process new + edited
    for (const r of dirty) {
      setRows(prev => prev.map(x => x._key === r._key ? { ...x, _saving: true, _saveOk: false, _saveError: null } : x));
      try {
        if (r._isNew) {
          await inventoryService.addIngredient(r);
        } else {
          await inventoryService.updateIngredient(r._id, r);
        }
        setRows(prev => prev.map(x => x._key === r._key ? { ...x, _saving: false, _saveOk: true } : x));
        ok++;
      } catch (err) {
        const msg = err?.readableMessage || 'Save failed';
        setRows(prev => prev.map(x => x._key === r._key ? { ...x, _saving: false, _saveError: msg } : x));
        fail++;
      }
    }

    setSaving(false);
    if (fail === 0) {
      toast.success(`${ok} change${ok > 1 ? 's' : ''} saved`);
      onRefresh();
    } else {
      toast.error(`${ok} saved, ${fail} failed — check status badges`);
    }
    } finally { saveInProgress.current = false; } // BUG-278: release guard
  };

  // ── BUG-221: Server export (replaces client-side handleExcel) ───
  const handleExcel = async () => {
    try {
      const res = await inventoryService.exportIngredients();
      const downloadUrl = res?.data?.download_url || res?.download_url;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      } else if (res?.data instanceof Blob || res instanceof Blob) {
        const blob = res?.data instanceof Blob ? res.data : res;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'ingredients.xlsx'; a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Unexpected export response');
      }
      toast.success('Ingredients exported');
    } catch (err) {
      toast.error(err?.readableMessage || 'Export failed');
    }
  };

  // BUG-221: Template download (uses dedicated sample endpoint)
  const handleTemplate = async () => {
    try {
      const res = await inventoryService.exportSampleIngredients();
      const downloadUrl = res?.data?.download_url || res?.download_url;
      if (downloadUrl) window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      else toast.error('Template not available');
    } catch (err) {
      toast.error(err?.readableMessage || 'Template download failed');
    }
  };

  // BUG-221: Import handler
  const importInputRef = useRef(null);
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await inventoryService.importIngredients(fd);
      // BUG-221: 2xx with status:false trap
      if (res?.data?.status === false) {
        toast.error(res.data.errors || res.data.message || 'Import failed — check file matches template');
        return;
      }
      toast.success('Import complete');
      onRefresh?.();
    } catch (err) {
      toast.error(err?.readableMessage || 'Import failed');
    } finally {
      e.target.value = '';
    }
  };

  // ── Reset ──────────────────────────────────────────────────
  const handleReset = () => {
    setRows(allItems.map(buildRow));
    setSelected(new Set());
    toast.info('All changes reset');
  };

  // ── Render helpers ─────────────────────────────────────────
  const cellCls = "py-1.5 px-2 border-b border-slate-100";
  const inputCls = (dirty) => `h-8 w-full text-sm border rounded-md px-2 outline-none transition-colors ${
    dirty ? 'border-amber-300 bg-white focus:border-amber-500' : 'border-transparent bg-transparent hover:border-slate-200 focus:border-orange-400'
  }`;
  const selectCls = (dirty) => `h-8 w-full text-xs border rounded-md px-1.5 outline-none transition-colors ${
    dirty ? 'border-amber-300 bg-white focus:border-amber-500' : 'border-transparent bg-transparent hover:border-slate-200 focus:border-orange-400'
  }`;
  const numCls = (dirty) => `h-8 w-full text-xs border rounded-md px-2 outline-none text-center transition-colors ${
    dirty ? 'border-amber-300 bg-white focus:border-amber-500' : 'border-transparent bg-transparent hover:border-slate-200 focus:border-orange-400'
  }`;

  const newInputCls = "h-8 w-full text-sm border border-green-300 rounded-md px-2 outline-none focus:border-green-500 bg-white";
  const newSelectCls = "h-8 w-full text-xs border border-green-300 rounded-md px-1.5 outline-none focus:border-green-500 bg-white";
  const newNumCls = "h-8 w-full text-xs border border-slate-200 rounded-md px-2 outline-none text-center bg-white focus:border-green-400";

  return (
    <>
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="ingredient-bulk-editor">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-wrap bg-slate-50/50">
        {/* BUG-213: page title */}
        <span className="font-semibold text-sm text-slate-700 shrink-0" data-testid="bulk-editor-title">Bulk Edit Ingredients</span>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm" data-testid="bulk-search" />
        </div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
          onClick={() => addNewRow(categories[0]?.id)} data-testid="bulk-add-item">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </Button>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave} disabled={saving || dirtyCount === 0} data-testid="bulk-save">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {dirtyCount > 0 ? `Save ${dirtyCount} Change${dirtyCount > 1 ? 's' : ''}` : 'Save Changes'}
          </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExcel} data-testid="bulk-excel">
          <Download className="w-3.5 h-3.5" /> Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleTemplate} data-testid="bulk-template">
          <FileDown className="w-3.5 h-3.5" /> Template
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => importInputRef.current?.click()} data-testid="bulk-import">
          <Upload className="w-3.5 h-3.5" /> Import
        </Button>
        <input ref={importInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
        <div className="flex-1" />
        <span className="text-xs text-slate-400">{filtered.length} items · {categories.length} categories</span>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onClose} data-testid="bulk-close">
          <X className="w-3.5 h-3.5" /> Close
        </Button>
      </div>

      {/* Selection banner */}
      {selected.size > 0 && (
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center gap-3" data-testid="bulk-selection-banner">
          <input type="checkbox" checked readOnly className="rounded border-blue-300 text-blue-600 w-4 h-4" />
          <span className="text-xs font-semibold text-blue-700">{selected.size} selected</span>
          <button className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            onClick={deleteSelected} data-testid="bulk-delete-selected">Delete Selected</button>
          <div className="flex-1" />
          <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
        <table className="w-full text-left border-collapse" style={{ minWidth: 1050 }} data-testid="bulk-table">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="bg-slate-50">
              <th className="w-10 py-2.5 px-2 border-b-2 border-slate-200">
                <input type="checkbox" className="rounded border-slate-300 w-4 h-4"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll} data-testid="bulk-select-all" />
              </th>
              {['Ingredient Name', 'Category', 'Base Unit', 'Small Unit', 'Conversion', 'Min Qty', 'Min Unit', 'Status'].map((h, i) => (
                <th key={i} className={`py-2.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b-2 border-slate-200 ${i >= 2 ? 'text-center' : ''}`}
                  style={i === 0 ? { minWidth: 200 } : i === 1 ? { minWidth: 130 } : { width: i === 7 ? 60 : 90 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(group => (
              <React.Fragment key={group.id}>
                {/* Category header */}
                <tr className="bg-slate-100/70" data-testid={`bulk-cat-header-${group.id}`}>
                  <td colSpan={9} className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">{group.items.length}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  </td>
                </tr>
                {/* Rows */}
                {group.items.map(row => {
                  const dirty = isDirty(row);
                  const isNew = row._isNew;
                  const rowCls = isNew
                    ? 'bg-green-50/40 border-l-[3px] border-l-green-500'
                    : dirty
                      ? 'bg-amber-50/40 border-l-[3px] border-l-amber-500'
                      : 'hover:bg-slate-50/50';
                  return (
                    <tr key={row._key} className={`transition-colors ${rowCls}`} data-testid={`bulk-row-${row._key}`}>
                      <td className={cellCls}>
                        <input type="checkbox" className="rounded border-slate-300 w-4 h-4"
                          checked={selected.has(row._key)} onChange={() => toggleSelect(row._key)} />
                      </td>
                      <td className={cellCls}>
                        <input ref={isNew && !row.name ? newNameRef : undefined}
                          className={isNew ? newInputCls : inputCls(row.name !== row._originalName)}
                          value={row.name} onChange={e => updateRow(row._key, 'name', e.target.value)}
                          placeholder={isNew ? 'New ingredient name...' : ''} data-testid={`bulk-name-${row._key}`} />
                      </td>
                      <td className={cellCls}>
                        <select className={isNew ? newSelectCls : selectCls(row.categoryId !== row._originalCategoryId)}
                          value={row.categoryId} onChange={e => updateRow(row._key, 'categoryId', Number(e.target.value))}
                          data-testid={`bulk-cat-${row._key}`}>
                          <option value="">—</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className={`${cellCls} text-center`}>
                        <select className={isNew ? newSelectCls : selectCls(row.unit !== row._originalUnit)}
                          value={row.unit} onChange={e => updateRow(row._key, 'unit', e.target.value)}
                          data-testid={`bulk-unit-${row._key}`}>
                          <option value="">—</option>
                          {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                        </select>
                      </td>
                      <td className={`${cellCls} text-center`}>
                        <select className={isNew ? newSelectCls : selectCls(row.smallUnit !== row._originalSmallUnit)}
                          value={row.smallUnit} onChange={e => updateRow(row._key, 'smallUnit', e.target.value)}
                          data-testid={`bulk-small-unit-${row._key}`}>
                          <option value="">—</option>
                          {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                        </select>
                      </td>
                      <td className={`${cellCls} text-center`}>
                        <input type="number" className={isNew ? newNumCls : numCls(String(row.conversionFactor) !== String(row._originalConversion))}
                          value={row.conversionFactor} onChange={e => updateRow(row._key, 'conversionFactor', e.target.value)}
                          placeholder="—" data-testid={`bulk-conv-${row._key}`} />
                      </td>
                      <td className={`${cellCls} text-center`}>
                        <input type="number" className={isNew ? newNumCls : numCls(String(row.minQtyAlert) !== String(row._originalMinQty))}
                          value={row.minQtyAlert} onChange={e => updateRow(row._key, 'minQtyAlert', e.target.value)}
                          placeholder="—" data-testid={`bulk-minqty-${row._key}`} />
                      </td>
                      <td className={`${cellCls} text-center`}>
                        <input type="number" className={isNew ? newNumCls : numCls(String(row.minUnitAlert) !== String(row._originalMinUnit))}
                          value={row.minUnitAlert} onChange={e => updateRow(row._key, 'minUnitAlert', e.target.value)}
                          placeholder="—" data-testid={`bulk-minunit-${row._key}`} />
                      </td>
                      <td className={`${cellCls} text-center`}>
                        {row._saving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 mx-auto" />
                        ) : row._saveOk ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓</span>
                        ) : row._saveError ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 cursor-help" title={row._saveError}>✗</span>
                        ) : isNew ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">NEW</span>
                        ) : dirty ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">edited</span>
                        ) : (
                          <button className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            onClick={() => deleteRow(row._key)} data-testid={`bulk-delete-${row._key}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                {search ? 'No ingredients match search' : 'No ingredients'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-xs text-slate-400">
          {filtered.length} ingredients · {categories.length} categories
          {dirtyCount > 0 && <> · <strong className="text-amber-600">{dirtyCount} unsaved change{dirtyCount > 1 ? 's' : ''}</strong></>}
        </span>
        <div className="flex items-center gap-2">
          <button className={`text-xs px-3 py-1.5 rounded transition-colors ${dirtyCount > 0 ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
              onClick={handleReset} disabled={dirtyCount === 0} data-testid="bulk-reset">Reset All</button>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave} disabled={saving || dirtyCount === 0} data-testid="bulk-save-footer">
              {dirtyCount > 0 ? `Save ${dirtyCount} Change${dirtyCount > 1 ? 's' : ''}` : 'Save Changes'}
            </Button>
        </div>
      </div>
    </div>

    {/* BUG-276: Delete confirmation dialog */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selected.size} item{selected.size === 1 ? '' : 's'}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark {selected.size} ingredient{selected.size === 1 ? '' : 's'} for deletion. Changes are applied when you save.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="delete-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeleteSelected} className="bg-red-600 hover:bg-red-700" data-testid="delete-confirm">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
