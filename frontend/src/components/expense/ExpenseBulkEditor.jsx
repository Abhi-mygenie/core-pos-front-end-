// CR-067: Expense Bulk Editor — Full Parity Redesign (menu management pattern)
// CR-074-A (2026-07-16): Removed item-master Excel export + Import buttons (owner ruling — Import/Export no longer needed in Expense Setup)
// CR-074-B Phase 5 (2026-07-17): BUG-202 delivered — OQ-1/OQ-2 restrictions removed. Rename + category-move both go through PUT /expenses/{id}. Added checkbox-based selection banner (Mockup 03) with parallel bulk delete + bulk move-to-category.
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  X, Search, Save, Plus, RotateCcw, Check, AlertCircle,
  Loader2, Trash2, Table2, ChevronDown
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
  _originalPrice: item.unitPriceAmount ?? null,  // BUG-203: track original for dirty detection
  title: item.title || "",
  categoryId: item.categoryId ? String(item.categoryId) : "",
  categoryName: item.categoryName || "",
  // Phase 5: preserve unit-price hint from parent list so we can show a ₹ chip in bulk editor.
  unitPriceAmount: item.unitPriceAmount ?? null,
});

// ─── Main Component ─────────────────────────────────────────────────────────
const ExpenseBulkEditor = ({ items, categories, pricedItems = [], onRefresh, onClose }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState(() => items.map(r => buildRow(r)));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  // CR-074-A: removed exporting/importing state + fileInputRef (Excel/Import UI removed)
  const scrollContainerRef = useRef(null);
  const [pendingFocusRowId, setPendingFocusRowId] = useState(null);
  const dirtyCountRef = useRef(0);

  // CR-074-B Phase 5: bulk-select state (Mockup 03)
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());
  const [bulkMoveDropdownOpen, setBulkMoveDropdownOpen] = useState(false);
  const [bulkMoveTargetCatId, setBulkMoveTargetCatId] = useState(null);
  const [bulkMoveConfirmOpen, setBulkMoveConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);

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

  // ─── CR-074-B Phase 5: bulk-select helpers (Mockup 03) ─────────────
  // Selectable rows = existing (non-new) rows only. New rows have no backend id.
  const selectableRowIds = useMemo(
    () => rows.filter(r => !r._isNew).map(r => r._id),
    [rows]
  );
  const isAllSelectableSelected =
    selectableRowIds.length > 0 && selectableRowIds.every(id => selectedRowIds.has(id));

  const toggleRowSelection = (rowId) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedRowIds(prev => {
      if (isAllSelectableSelected) return new Set();
      return new Set(selectableRowIds);
    });
  };
  const clearSelection = () => {
    setSelectedRowIds(new Set());
    setBulkMoveDropdownOpen(false);
    setBulkMoveTargetCatId(null);
    setBulkMoveConfirmOpen(false);
    setBulkDeleteConfirmOpen(false);
  };

  // ⚠️ BACKEND FLAG (CR-074-B Batch B, 2026-07-17): see /app/memory/briefs/BACKEND_BRIEF_BULK_EXPENSE_OPS.md
  // Bulk ops fan out one HTTP call per item at concurrency=3 (no /expenses/bulk endpoint yet).
  const runWithConcurrency = async (ids, limit, worker) => {
    const results = [];
    let idx = 0;
    const runners = new Array(Math.min(limit, ids.length)).fill(0).map(async () => {
      while (idx < ids.length) {
        const current = idx++;
        try {
          const res = await worker(ids[current]);
          results.push({ id: ids[current], ok: true, res });
        } catch (err) {
          results.push({ id: ids[current], ok: false, err });
        }
      }
    });
    await Promise.all(runners);
    return results;
  };

  const bulkDeleteConfirmed = async () => {
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    setBulkOperationInProgress(true);
    setRows(prev => prev.map(r => selectedRowIds.has(r._id) ? { ...r, _saveStatus: "saving" } : r));
    const results = await runWithConcurrency(ids, 3, (id) => expenseService.deleteExpenseItem(id));
    const failed = results.filter(r => !r.ok);
    const succeededCount = results.length - failed.length;
    // Remove successful rows from local state; mark failures with error
    const failedIdSet = new Set(failed.map(f => f.id));
    setRows(prev => prev
      .filter(r => !(selectedRowIds.has(r._id) && !failedIdSet.has(r._id)))
      .map(r => failedIdSet.has(r._id) ? { ...r, _saveStatus: "error", _saveError: "Delete failed" } : r)
    );
    setBulkOperationInProgress(false);
    setBulkDeleteConfirmOpen(false);
    clearSelection();
    if (failed.length === 0) {
      toast({ title: "Items deleted", description: `${succeededCount} item${succeededCount === 1 ? '' : 's'} removed.` });
    } else {
      toast({
        title: `${succeededCount} deleted, ${failed.length} failed`,
        description: "See row errors for details.",
        variant: "destructive",
      });
    }
    if (succeededCount > 0 && onRefresh) setTimeout(() => onRefresh(), 500);
  };

  const bulkMoveConfirmed = async () => {
    const targetCatId = bulkMoveTargetCatId;
    if (targetCatId == null) return;
    const targetCat = categories.find(c => String(c.id) === String(targetCatId));
    if (!targetCat) return;
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;

    // Pre-flight dup guard per target category (backend does NOT enforce)
    const targetCatNameKey = (targetCat.name || "").trim().toLowerCase();
    const dupIds = new Set();
    ids.forEach(id => {
      const src = rows.find(r => r._id === id);
      if (!src || src._isNew) return;
      if (String(src.categoryId) === String(targetCatId)) return; // already there
      const titleLower = (src.title || "").trim().toLowerCase();
      const collision = rows.some(other =>
        other._id !== id
        && !other._isNew
        && other.title.trim().toLowerCase() === titleLower
        && (
          String(other.categoryId) === String(targetCatId)
          || ((!other.categoryId || other.categoryId === "") && (other.categoryName || "").trim().toLowerCase() === targetCatNameKey)
        )
      );
      if (collision) dupIds.add(id);
    });
    const movableIds = ids.filter(id => !dupIds.has(id));

    setBulkOperationInProgress(true);
    setRows(prev => prev.map(r => movableIds.includes(r._id) ? { ...r, _saveStatus: "saving" } : r));
    // Mark dup-skipped rows with an error message inline
    if (dupIds.size > 0) {
      setRows(prev => prev.map(r => dupIds.has(r._id)
        ? { ...r, _saveStatus: "error", _saveError: `Skipped — name already exists in ${targetCat.name}.` }
        : r));
    }

    const results = await runWithConcurrency(movableIds, 3, (id) => {
      const src = rows.find(r => r._id === id);
      return expenseService.updateExpenseItem(id, {
        stock_title: (src?.title || "").trim(),
        category_id: parseInt(targetCatId, 10),
      }).then(res => {
        if (res?.data?.errors?.[0]?.code === 'not_found') {
          throw new Error('not_found');
        }
        return res;
      });
    });
    const failed = results.filter(r => !r.ok);
    const succeededCount = results.length - failed.length;
    const failedIdSet = new Set(failed.map(f => f.id));
    // Apply successful moves to local state; mark failures with error
    setRows(prev => prev.map(r => {
      if (movableIds.includes(r._id) && !failedIdSet.has(r._id)) {
        return {
          ...r,
          _saveStatus: "saved",
          categoryId: String(targetCatId),
          categoryName: targetCat.name,
          _original: { ...r._original, categoryId: targetCatId, categoryName: targetCat.name },
        };
      }
      if (failedIdSet.has(r._id)) {
        return { ...r, _saveStatus: "error", _saveError: "Move failed" };
      }
      return r;
    }));

    setBulkOperationInProgress(false);
    setBulkMoveConfirmOpen(false);
    setBulkMoveDropdownOpen(false);
    setBulkMoveTargetCatId(null);
    clearSelection();
    const skippedCount = dupIds.size;
    if (failed.length === 0 && skippedCount === 0) {
      toast({ title: "Items moved", description: `${succeededCount} moved to ${targetCat.name}.` });
    } else if (failed.length === 0 && skippedCount > 0) {
      toast({
        title: `${succeededCount} moved, ${skippedCount} skipped`,
        description: `${skippedCount} item${skippedCount === 1 ? '' : 's'} already exist in ${targetCat.name}.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: `${succeededCount} moved, ${failed.length} failed${skippedCount ? `, ${skippedCount} skipped` : ''}`,
        description: `Some items could not be moved to ${targetCat.name}.`,
        variant: "destructive",
      });
    }
    if (succeededCount > 0 && onRefresh) setTimeout(() => onRefresh(), 500);
  };

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
          // Pre-flight dup check for new rows in target category (backend does NOT enforce — BUG-165 flag)
          const trimmed = row.title.trim().toLowerCase();
          const catNameKey = (cat?.name || "").trim().toLowerCase();
          const dup = rows.some(r =>
            r._id !== row._id
            && !r._isNew
            && r.title.trim().toLowerCase() === trimmed
            && (
              String(r.categoryId) === String(row.categoryId)
              || ((!r.categoryId || r.categoryId === "") && (r.categoryName || "").trim().toLowerCase() === catNameKey)
            )
          );
          if (dup) {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: `"${row.title.trim()}" already exists in ${cat?.name || "target category"}.` }
              : r));
            return;
          }
          await expenseService.createCategoryWithItems(cat.name, [row.title.trim()]);
          // BUG-203 Sub-B: chain addUnitPrice if user entered a price for the new item
          if (row.unitPriceAmount != null && row.unitPriceAmount > 0) {
            try {
              // Re-fetch expenses-list to find the newly created item's ID
              const listRes = await expenseService.getExpenseItems();
              const allStockItems = (listRes?.data?.expenses || []);
              const newItem = allStockItems.find(
                si => si.stock_title?.trim().toLowerCase() === row.title.trim().toLowerCase()
                  && String(si.category_id) === String(row.categoryId)
              );
              if (newItem?.id) {
                await expenseService.addUnitPrice(newItem.id, 1, row.unitPriceAmount);
              }
            } catch (priceErr) {
              // Item created but price failed — partial success
            }
          }
          saved++;
          setRows(prev => prev.map(r => r._id === row._id
            ? { ...r, _saveStatus: "saved" } : r));
        } else {
          // Existing row
          // BUG-202 delivered 2026-07-17 — OQ-1 (rename-block) + OQ-2 (priced-item-move-block) restrictions REMOVED.
          // Both rename and category-move now go through a single atomic PUT /expenses/{id}.
          // unit_price row survives; row id preserved.
          const titleChanged = row.title !== (row._original.title || "");
          const catChanged = String(row.categoryId) !== String(row._original.categoryId || "");
          if (!titleChanged && !catChanged) {
            // Nothing to save
            setRows(prev => prev.map(r => r._id === row._id ? { ...r, _saveStatus: "saved" } : r));
            return;
          }
          const newTitleTrimmed = row.title.trim();
          if (!newTitleTrimmed) {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: "Item name cannot be empty" }
              : r));
            return;
          }
          const targetCat = categories.find(c => String(c.id) === String(row.categoryId));
          if (!targetCat) {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: "Please select a valid category" }
              : r));
            return;
          }
          // Pre-flight duplicate check per target category (backend does NOT enforce — same SF-1 pattern)
          const trimmedLower = newTitleTrimmed.toLowerCase();
          const targetCatNameKey = (targetCat.name || "").trim().toLowerCase();
          const dup = rows.some(r =>
            r._id !== row._id
            && !r._isNew
            && r.title.trim().toLowerCase() === trimmedLower
            && (
              String(r.categoryId) === String(row.categoryId)
              || ((!r.categoryId || r.categoryId === "") && (r.categoryName || "").trim().toLowerCase() === targetCatNameKey)
            )
          );
          if (dup) {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: `"${newTitleTrimmed}" already exists in ${targetCat.name}.` }
              : r));
            return;
          }
          // Single PUT with both fields (rename + move in one atomic call)
          const res = await expenseService.updateExpenseItem(row._id, {
            stock_title: newTitleTrimmed,
            category_id: parseInt(row.categoryId, 10),
          });
          // Malformed-404: backend returns HTTP 201 with body errors[0].code === 'not_found' when id missing
          if (res?.data?.errors?.[0]?.code === 'not_found') {
            failed++;
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _saveStatus: "error", _saveError: "Item not found — refresh and retry" }
              : r));
            return;
          }
          saved++;
          setRows(prev => prev.map(r => r._id === row._id
            ? {
                ...r,
                _saveStatus: "saved",
                _original: { ...r._original, title: newTitleTrimmed, categoryId: row.categoryId, categoryName: targetCat.name },
                title: newTitleTrimmed,
                categoryName: targetCat.name,
              }
            : r));
          // BUG-203 Sub-C: 2-call for price if changed — use pricedItems for edit-vs-add decision
          const priceChanged = row.unitPriceAmount !== row._originalPrice;
          if (priceChanged && row.unitPriceAmount != null && row.unitPriceAmount > 0) {
            try {
              const itemId = parseInt(row._id, 10);
              const priceRow = pricedItems.find(p => String(p.stockId) === String(itemId));
              if (priceRow) {
                // BUG-203 Sub-C: existing price → edit
                await expenseService.editUnitPrice(priceRow.id, row.unitPriceAmount);
              } else {
                // BUG-203 Sub-C: no existing price → add
                await expenseService.addUnitPrice(itemId, 1, row.unitPriceAmount);
              }
            } catch {
              // Price save failed — name/cat saved. Owner can use Unit Prices tab as fallback.
            }
            setRows(prev => prev.map(r => r._id === row._id
              ? { ...r, _originalPrice: row.unitPriceAmount } : r));
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

      {/* CR-074-B Phase 5: Selection banner (Mockup 03) — mirrors Phase 4 pattern */}
      {selectedRowIds.size > 0 && (
        <div
          className="border-l-4 px-8 py-3 flex justify-between items-center flex-shrink-0"
          style={{ background: 'rgba(239, 68, 68, 0.10)', borderLeftColor: COLORS.errorText }}
          data-testid="bulk-selection-banner"
        >
          <span className="font-bold text-sm" style={{ color: COLORS.errorText }} data-testid="bulk-selection-count">
            {selectedRowIds.size} item{selectedRowIds.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBulkDeleteConfirmOpen(true)}
              disabled={bulkOperationInProgress || saving}
              className="text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-colors disabled:opacity-50"
              style={{ background: COLORS.errorText }}
              data-testid="bulk-delete-selected-btn"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected
            </button>
            <div className="relative">
              <button
                onClick={() => setBulkMoveDropdownOpen(v => !v)}
                disabled={bulkOperationInProgress || saving}
                aria-label="Move selected items to another category"
                className="border bg-transparent px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
                data-testid="bulk-move-category-btn"
              >
                Move to Category <ChevronDown className="w-4 h-4" />
              </button>
              {bulkMoveDropdownOpen && (
                <div
                  className="absolute right-0 mt-1 rounded-md shadow-lg border bg-white z-30 min-w-[180px] max-h-64 overflow-y-auto"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="bulk-move-category-dropdown"
                >
                  {categories.length === 0 ? (
                    <div className="px-3 py-2 text-xs" style={{ color: COLORS.grayText }}>
                      No categories available
                    </div>
                  ) : (
                    categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setBulkMoveTargetCatId(c.id);
                          setBulkMoveDropdownOpen(false);
                          setBulkMoveConfirmOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b last:border-0"
                        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                        data-testid={`bulk-move-cat-option-${c.id}`}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              onClick={clearSelection}
              disabled={bulkOperationInProgress || saving}
              className="text-sm font-medium hover:opacity-80 transition-colors px-2 disabled:opacity-50"
              style={{ color: COLORS.grayText }}
              data-testid="bulk-clear-selection-btn"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Column headers */}
      <div className="flex items-center px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide flex-shrink-0"
           style={{ background: "#F9FAFB", borderColor: COLORS.borderGray }}>
        {/* CR-074-B Phase 5: bulk-select header checkbox (only when there are selectable rows) */}
        <span className="w-8 flex-shrink-0 flex items-center justify-center">
          {selectableRowIds.length > 0 && (
            <input
              type="checkbox"
              className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer align-middle"
              style={{ accentColor: COLORS.primaryOrange }}
              checked={isAllSelectableSelected}
              onChange={toggleSelectAll}
              aria-label="Select all rows"
              data-testid="bulk-select-all"
            />
          )}
        </span>
        <span className="w-8 flex-shrink-0" style={{ color: COLORS.grayText }}>#</span>
        <span className="flex-[3] px-2" style={{ color: COLORS.grayText }}>Item Name</span>
        <span className="flex-[1] px-2" style={{ color: COLORS.grayText }}>Unit Price</span>
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
          const isSelected = selectedRowIds.has(row._id);

          return (
            <div key={row._id}
              className={`flex items-center px-4 py-2 border-b transition-colors ${
                  row._saveStatus === "error"  ? "bg-red-50/60 border-l-4 border-l-red-400"
                : row._isNew                  ? "bg-green-50/40"
                : row._saveStatus === "saved" ? "bg-green-50/60"
                : isSelected                  ? "bg-blue-50/50 border-l-2 border-l-blue-500"
                : dirty                       ? "bg-amber-50/40"
                :                               "hover:bg-gray-50/50"
              }`}
              style={{ borderColor: COLORS.borderGray }}
              data-testid={`bulk-row-${row._id}`}>

              {/* CR-074-B Phase 5: bulk-select checkbox (existing rows only) */}
              <div className="w-8 flex-shrink-0 flex items-center justify-center">
                {!row._isNew && (
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer align-middle"
                    style={{ accentColor: COLORS.primaryOrange }}
                    checked={isSelected}
                    onChange={() => toggleRowSelection(row._id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${row.title || row._id}`}
                    data-testid={`bulk-select-row-${row._id}`}
                  />
                )}
              </div>

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
              <div className="flex-[3] px-2 flex items-center gap-2">
                <input
                  type="text" value={row.title}
                  onChange={e => updateRow(row._id, "title", e.target.value)}
                  placeholder="Item name"
                  className="flex-1 px-2 py-1.5 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-white"
                  style={{
                    borderColor: titleDirty ? COLORS.amber : COLORS.borderGray,
                    color: COLORS.darkText,
                  }}
                  data-testid={`bulk-title-${row._id}`}
                />
              </div>

              {/* BUG-203: Price column — editable for ALL rows (Sub-B: new rows included) */}
              <div className="flex-[1] px-2">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium"
                    style={{ color: COLORS.grayText }}>₹</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={row.unitPriceAmount ?? ""}
                    onChange={e => {
                      const val = e.target.value;
                      updateRow(row._id, "unitPriceAmount", val === "" ? null : parseFloat(val));
                    }}
                    placeholder="—"
                    className="w-full pl-5 pr-1 py-1.5 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-white"
                    style={{
                      borderColor: row.unitPriceAmount !== row._originalPrice ? COLORS.amber : COLORS.borderGray,
                      color: COLORS.darkText,
                    }}
                    data-testid={`bulk-price-input-${row._id}`}
                  />
                </div>
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

      {/* ── CR-074-B Phase 5: Bulk Delete Confirm ─────────────────── */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 border" style={{ borderColor: COLORS.borderGray }}
            data-testid="bulk-delete-confirm">
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>
              Delete {selectedRowIds.size} Item{selectedRowIds.size === 1 ? '' : 's'}?
            </h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
              This will permanently remove the selected item{selectedRowIds.size === 1 ? '' : 's'} and any linked expense transactions. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBulkDeleteConfirmOpen(false)}
                disabled={bulkOperationInProgress}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
                data-testid="bulk-delete-confirm-cancel">Cancel</button>
              <button onClick={bulkDeleteConfirmed}
                disabled={bulkOperationInProgress}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2 disabled:opacity-70"
                style={{ background: COLORS.errorText }}
                data-testid="bulk-delete-confirm-btn">
                {bulkOperationInProgress && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete {selectedRowIds.size} Item{selectedRowIds.size === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CR-074-B Phase 5: Bulk Move Confirm ───────────────────── */}
      {bulkMoveConfirmOpen && bulkMoveTargetCatId != null && (() => {
        const targetCat = categories.find(c => String(c.id) === String(bulkMoveTargetCatId));
        const targetName = targetCat?.name ?? "target category";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-96 border" style={{ borderColor: COLORS.borderGray }}
              data-testid="bulk-move-confirm">
              <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>
                Move {selectedRowIds.size} Item{selectedRowIds.size === 1 ? '' : 's'} to {targetName}?
              </h3>
              <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
                Selected items will be reassigned to <strong>{targetName}</strong>. Any items whose name already exists in {targetName} will be skipped. Unit prices are preserved.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setBulkMoveConfirmOpen(false); setBulkMoveTargetCatId(null); }}
                  disabled={bulkOperationInProgress}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
                  data-testid="bulk-move-confirm-cancel">Cancel</button>
                <button onClick={bulkMoveConfirmed}
                  disabled={bulkOperationInProgress}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2 disabled:opacity-70"
                  style={{ background: COLORS.primaryOrange }}
                  data-testid="bulk-move-confirm-btn">
                  {bulkOperationInProgress && <Loader2 className="w-4 h-4 animate-spin" />}
                  Move {selectedRowIds.size} Item{selectedRowIds.size === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ExpenseBulkEditor;
