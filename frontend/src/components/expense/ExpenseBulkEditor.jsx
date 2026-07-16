// CR-067: Expense Bulk Editor — Full Parity Redesign (menu management pattern)
// CR-074-A (2026-07-16): Removed item-master Excel export + Import buttons (owner ruling — Import/Export no longer needed in Expense Setup)
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  X, Search, Save, Plus, RotateCcw, Check, AlertCircle,
  Loader2, Trash2, Table2
} from "lucide-react";
import { COLORS } from "../../constants";
import { useToast } from "../../hooks/use-toast";
import * as expenseService from "../../api/services/expenseService";

// ─── Row builder ────────────────────────────────────────────────────────────
const buildRow = (item, isNew = false) => ({
  _id: isNew
    ? `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    : String(item.id),
  _original: isNew ? {} : { ...item },
  _isNew: isNew,
  _saveStatus: null,   // null | "saving" | "saved" | "error"
  _saveError: null,
  _orderIndex: 0,
  title: item.title || "",
  categoryId: item.categoryId ? String(item.categoryId) : "",
  categoryName: item.categoryName || "",
});

// ─── Main Component ─────────────────────────────────────────────────────────
const ExpenseBulkEditor = ({ items, categories, onRefresh, onClose }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState(() => items.map(r => buildRow(r)));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  // CR-074-A: removed exporting/importing state + fileInputRef (Excel/Import UI removed)
  const scrollContainerRef = useRef(null);
  const [pendingFocusRowId, setPendingFocusRowId] = useState(null);
  const dirtyCountRef = useRef(0);

  // Sync rows when items prop changes (after refresh)
  useEffect(() => {
    setRows(items.map(r => buildRow(r)));
  }, [items]);

  // Auto-focus new row name input after React commits it
  useEffect(() => {
    if (!pendingFocusRowId) return;
    const el = document.querySelector(`[data-testid="bulk-title-${pendingFocusRowId}"]`);
    if (el) { el.focus(); setPendingFocusRowId(null); }
  }, [pendingFocusRowId, rows]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (dirtyCountRef.current > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ─── Dirty detection ────────────────────────────────────────────────────
  const isDirty = useCallback((row) => {
    if (row._isNew) return row.title.trim().length > 0;
    return row.title !== (row._original.title || "") ||
           String(row.categoryId) !== String(row._original.categoryId || "");
  }, []);

  const dirtyCount = useMemo(() => {
    const c = rows.filter(isDirty).length;
    dirtyCountRef.current = c;
    return c;
  }, [rows, isDirty]);

  // ─── Grouping ────────────────────────────────────────────────────────────
  const groupedRows = useMemo(() => {
    let result = rows;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r._isNew ||
        r.title.toLowerCase().includes(s) ||
        r.categoryName?.toLowerCase().includes(s)
      );
    }
    const newRows = result
      .filter(r => r._isNew)
      .sort((a, b) => (b._orderIndex || 0) - (a._orderIndex || 0));
    const existingRows = result.filter(r => !r._isNew);

    const groups = new Map();
    existingRows.forEach(r => {
      const cat = r.categoryName || "Uncategorized";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(r);
    });
    const sorted = [...groups.keys()].sort((a, b) => a.localeCompare(b));

    const out = [];
    newRows.forEach(item => out.push({ _type: "row", ...item }));
    sorted.forEach(cat => {
      const catItems = groups.get(cat);
      catItems.sort((a, b) => a.title.localeCompare(b.title));
      out.push({ _type: "header", catName: cat, count: catItems.length });
      catItems.forEach(item => out.push({ _type: "row", ...item }));
    });
    return out;
  }, [rows, search]);

  // ─── Row handlers ────────────────────────────────────────────────────────
  const updateRow = useCallback((rowId, field, val) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId) return r;
      const u = { ...r, [field]: val, _saveError: null, _saveStatus: null };
      if (field === "categoryId") {
        const cat = categories.find(c => String(c.id) === String(val));
        u.categoryName = cat?.name ?? "";
      }
      return u;
    }));
  }, [categories]);

  const addNewRow = () => {
    const row = buildRow({}, true);
    row._orderIndex = Date.now();
    setRows(prev => [row, ...prev]);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    setPendingFocusRowId(row._id);
  };

  const resetRow = (rowId) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r._id === rowId);
      if (idx === -1) return prev;
      if (prev[idx]._isNew) return prev.filter((_, i) => i !== idx);
      return prev.map((r, i) => i === idx ? buildRow(r._original) : r);
    });
  };

  const resetAll = () => setRows(items.map(r => buildRow(r)));

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    document.activeElement?.blur();
    await new Promise(r => setTimeout(r, 0));
    const dirty = rows.filter(isDirty);
    if (dirty.length === 0) return;

    setSaving(true);
    setRows(prev => prev.map(r => isDirty(r) ? { ...r, _saveStatus: "saving" } : r));

    let saved = 0, failed = 0;
    const MAX_CONCURRENT = 5;
    const queue = [...dirty];

    const processOne = async (row) => {
      try {
        if (row._isNew) {
          // New row — validate then POST
          if (!row.title.trim() || !row.categoryId) {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: "Item name and category are required" }
              : r));
            return;
          }
          const cat = categories.find(c => String(c.id) === String(row.categoryId));
          await expenseService.createCategoryWithItems(cat.name, [row.title.trim()]);
          saved++;
          setRows(prev => prev.map(r => r._id === row._id
            ? { ...r, _saveStatus: "saved" } : r));
        } else {
          // Existing row
          const titleChanged = row.title !== (row._original.title || "");
          const catChanged = String(row.categoryId) !== String(row._original.categoryId || "");

          // OQ-1 = B: block rename — backend endpoint pending (CR-065)
          if (titleChanged) {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: "Rename not available — backend support pending" }
              : r));
            return;
          }

          // OQ-2 = B: block category move if item has a unit price
          if (catChanged && row._original.unitPriceAmount) {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: "Cannot move — unit price is set. Remove unit price first." }
              : r));
            return;
          }

          // Category change: DELETE old + POST in new category
          if (catChanged) {
            const newCat = categories.find(c => String(c.id) === String(row.categoryId));
            await expenseService.deleteExpenseItem(row._id);
            await expenseService.createCategoryWithItems(newCat.name, [row.title.trim()]);
            saved++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "saved" } : r));
          }
        }
      } catch (err) {
        failed++;
        setRows(prev => prev.map(r => r._id === row._id
          ? { ...r, _saveStatus: "error", _saveError: err.readableMessage || "Save failed" }
          : r));
      }
    };

    while (queue.length > 0) {
      const batch = queue.splice(0, MAX_CONCURRENT);
      await Promise.all(batch.map(processOne));
    }

    setSaving(false);
    if (failed > 0) {
      toast({
        title: "Partial save",
        description: `${saved} saved, ${failed} failed. See row errors.`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Saved", description: `${saved} item${saved > 1 ? "s" : ""} saved.` });
    }
    if (saved > 0 && onRefresh) setTimeout(() => onRefresh(), 500);
  };

  // CR-074-A (2026-07-16): removed handleExport + handleImport (Excel export + Import UI removed)

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white" data-testid="expense-bulk-editor">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
           style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center gap-3">
          <Table2 className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
          <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>
            Bulk Editor
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: COLORS.sectionBg, color: COLORS.grayText }}>
            {rows.length} items
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                    style={{ color: COLORS.grayText }} />
            <input
              type="text" placeholder="Search items..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none bg-white w-44 focus:ring-1 focus:ring-orange-200"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="bulk-editor-search"
            />
          </div>

          {/* CR-074-A (2026-07-16): removed Excel export + Import buttons + hidden file input */}

          {/* Add Item */}
          <button onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white hover:opacity-90"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="bulk-add-item-btn">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>

          {/* Save N Changes */}
          <button onClick={handleSave} disabled={dirtyCount === 0 || saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: dirtyCount > 0 ? COLORS.primaryOrange : COLORS.grayText }}
            data-testid="bulk-save-btn">
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            {saving
              ? "Saving…"
              : dirtyCount > 0
                ? `Save ${dirtyCount} Change${dirtyCount > 1 ? "s" : ""}`
                : "No Changes"}
          </button>

          {/* Close */}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"
                  data-testid="bulk-close-btn">
            <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide flex-shrink-0"
           style={{ background: "#F9FAFB", borderColor: COLORS.borderGray }}>
        <span className="w-8 flex-shrink-0" style={{ color: COLORS.grayText }}>#</span>
        <span className="flex-[3] px-2" style={{ color: COLORS.grayText }}>Item Name</span>
        <span className="flex-[2] px-2" style={{ color: COLORS.grayText }}>Category</span>
        <span className="w-8" />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}
           data-testid="bulk-editor-grid">
        {groupedRows.map((entry, gIdx) => {
          if (entry._type === "header") {
            return (
              <div key={`hdr-${entry.catName}`}
                   className="flex items-center gap-2 px-4 py-2 border-b text-xs font-semibold uppercase tracking-wider"
                   style={{ background: "#F0F0F0", borderColor: COLORS.borderGray }}
                   data-testid={`bulk-category-group-${entry.catName}`}>
                <div className="w-1 h-4 rounded-full flex-shrink-0"
                     style={{ backgroundColor: COLORS.primaryOrange }} />
                <span style={{ color: COLORS.darkText }}>{entry.catName}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
                      style={{ background: COLORS.borderGray, color: COLORS.grayText }}>
                  {entry.count}
                </span>
              </div>
            );
          }

          const row = entry;
          const dirty = isDirty(row);
          const titleDirty = !row._isNew && row.title !== (row._original.title || "");
          const catDirty   = !row._isNew && String(row.categoryId) !== String(row._original.categoryId || "");

          return (
            <div key={row._id}
              className={`flex items-center px-4 py-2 border-b transition-colors ${
                  row._saveStatus === "error"  ? "bg-red-50/60 border-l-4 border-l-red-400"
                : row._isNew                  ? "bg-green-50/40"
                : row._saveStatus === "saved" ? "bg-green-50/60"
                : dirty                       ? "bg-amber-50/40"
                :                               "hover:bg-gray-50/50"
              }`}
              style={{ borderColor: COLORS.borderGray }}
              data-testid={`bulk-row-${row._id}`}>

              {/* # / status icon */}
              <div className="w-8 flex-shrink-0 flex items-center justify-center text-xs font-mono"
                   style={{ color: COLORS.grayText }}>
                {row._saveStatus === "saving" && (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                )}
                {row._saveStatus === "saved" && (
                  <Check className="w-3 h-3 text-green-500" />
                )}
                {row._saveStatus === "error" && (
                  <span title={row._saveError || "Save failed"} className="cursor-help"
                        data-testid={`bulk-row-error-${row._id}`}>
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  </span>
                )}
                {!row._saveStatus && (row._isNew ? "+" : gIdx)}
              </div>

              {/* Item Name */}
              <div className="flex-[3] px-2">
                <input
                  type="text" value={row.title}
                  onChange={e => updateRow(row._id, "title", e.target.value)}
                  placeholder="Item name"
                  className="w-full px-2 py-1.5 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-white"
                  style={{
                    borderColor: titleDirty ? COLORS.amber : COLORS.borderGray,
                    color: COLORS.darkText,
                  }}
                  data-testid={`bulk-title-${row._id}`}
                />
              </div>

              {/* Category */}
              <div className="flex-[2] px-2">
                <select
                  value={row.categoryId}
                  onChange={e => updateRow(row._id, "categoryId", e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-white"
                  style={{
                    borderColor: catDirty ? COLORS.amber : COLORS.borderGray,
                    color: COLORS.darkText,
                  }}
                  data-testid={`bulk-category-${row._id}`}>
                  <option value="">Select category…</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Undo / Delete */}
              <div className="w-8 flex justify-center">
                {dirty && row._saveStatus !== "saving" && (
                  <button
                    onClick={() => resetRow(row._id)}
                    className={`p-1 rounded ${row._isNew ? "hover:bg-red-100" : "hover:bg-gray-100"}`}
                    title={row._isNew ? "Delete new row" : "Undo changes"}
                    data-testid={`${row._isNew ? "bulk-delete" : "bulk-undo"}-${row._id}`}>
                    {row._isNew
                      ? <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      : <RotateCcw className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {groupedRows.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm"
               style={{ color: COLORS.grayText }}>
            {search ? `No items matching "${search}"` : "No items found."}
          </div>
        )}
      </div>

      {/* Footer — visible when there are dirty rows */}
      {dirtyCount > 0 && (
        <div className="flex items-center justify-between px-5 py-2.5 border-t flex-shrink-0"
             style={{
               borderColor: COLORS.borderGray,
               background: "linear-gradient(to right, #FFF7ED, #FFFFFF)",
             }}>
          <span className="text-sm" style={{ color: COLORS.darkText }}>
            <strong style={{ color: COLORS.primaryOrange }}>{dirtyCount}</strong>
            {` item${dirtyCount > 1 ? "s" : ""} modified`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="bulk-reset-all-btn">
              Reset All
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-white hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: COLORS.primaryOrange }}
              data-testid="bulk-footer-save-btn">
              {saving
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : `Save ${dirtyCount} Change${dirtyCount > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseBulkEditor;
