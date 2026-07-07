// CR-059: Expense Setup Panel — Category CRUD + Items master management
import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Settings2, Plus, Pencil, Trash2, Check, X, Download, Upload,
  Loader2, RefreshCw, List, TableProperties
} from "lucide-react";
import { COLORS } from "../../constants";
import { useToast } from "../../hooks/use-toast";
import * as expenseService from "../../api/services/expenseService";
import { fromAPI } from "../../api/transforms/expenseTransform";
import ExpenseBulkEditor from "./ExpenseBulkEditor";

// ─── Category Row ─────────────────────────────────────────────────────────────
const CategoryRow = ({ cat, selected, itemCount, onSelect, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);

  const commit = () => { onRename(cat.id, name); setEditing(false); };
  const discard = () => { setName(cat.name); setEditing(false); };

  return (
    <div
      onClick={() => !editing && onSelect(cat.id)}
      className="flex items-center justify-between px-4 py-3.5 rounded-lg cursor-pointer border transition-colors"
      style={{
        borderColor: selected ? COLORS.primaryOrange : "transparent",
        background: selected ? `${COLORS.primaryOrange}0D` : "transparent",
        minHeight: 52,
      }}
      data-testid={`category-row-${cat.id}`}
    >
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
          <input
            autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") discard(); }}
            className="flex-1 px-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200"
            style={{ borderColor: COLORS.borderGray }}
          />
          <button onClick={commit} className="p-1 rounded hover:bg-green-50" data-testid={`category-save-${cat.id}`}>
            <Check className="w-3.5 h-3.5" style={{ color: COLORS.primaryGreen }} />
          </button>
          <button onClick={discard} className="p-1 rounded hover:bg-gray-100">
            <X className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: COLORS.darkText }}>{cat.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${COLORS.primaryOrange}18`, color: COLORS.primaryOrange }}>
              {itemCount}
            </span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-orange-50"
              data-testid={`category-edit-${cat.id}`}>
              <Pencil className="w-3 h-3" style={{ color: COLORS.primaryOrange }} />
            </button>
            <button onClick={() => onDelete(cat.id)} className="p-1 rounded hover:bg-red-50"
              data-testid={`category-delete-${cat.id}`}>
              <Trash2 className="w-3 h-3" style={{ color: COLORS.errorText }} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
const ExpenseSetupPanel = () => {
  const { toast } = useToast();

  const [categories, setCategories] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [showNewCatInput, setShowNewCatInput] = useState(false);

  // New item form
  const [newItemName, setNewItemName] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  // Bulk editor
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Delete confirm
  const [deletingCatId, setDeletingCatId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);

  // Export/Import
  const [exporting, setExporting] = useState(false);
  const importRef = useState(null);

  // ── Fetch data ───────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, itemRes, unitRes] = await Promise.all([
        expenseService.getCategories(),
        expenseService.getExpenseItems(),
        expenseService.getUnits(),
      ]);
      const cats = fromAPI.categories(catRes);
      setCategories(cats);

      // CR-059: API returns category_name but no category_id on items.
      // Cross-reference by name to populate categoryId.
      const catByName = {};
      cats.forEach(c => { catByName[c.name.toLowerCase().trim()] = c.id; });
      const rawItems = fromAPI.expenseItems(itemRes).map(item => ({
        ...item,
        categoryId: item.categoryId
          ?? catByName[item.categoryName?.toLowerCase().trim()]
          ?? null,
      }));
      setAllItems(rawItems);

      setUnits(fromAPI.units(unitRes));
      if (!selectedCategoryId && cats.length > 0) setSelectedCategoryId(cats[0].id);
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedCategoryId]);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: items for selected category + search ────────────────
  const visibleItems = allItems.filter(i => {
    const catMatch = !selectedCategoryId || String(i.categoryId) === String(selectedCategoryId);
    const searchMatch = !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const itemCountFor = (catId) => allItems.filter(i => String(i.categoryId) === String(catId)).length;

  // ── Add category ─────────────────────────────────────────────────
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      await expenseService.createCategoryWithItems(newCatName.trim(), []);
      toast({ title: "Category added", description: newCatName.trim() });
      setNewCatName("");
      setShowNewCatInput(false);
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to add category", variant: "destructive" });
    } finally {
      setAddingCat(false);
    }
  };

  // ── Rename category ───────────────────────────────────────────────
  const renameCategory = async (catId, name) => {
    const items = allItems.filter(i => String(i.categoryId) === String(catId));
    try {
      await expenseService.updateCategory(catId, name, items);
      toast({ title: "Renamed", description: name });
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Rename failed", variant: "destructive" });
    }
  };

  // ── Delete category ───────────────────────────────────────────────
  const deleteCategory = async () => {
    if (!deletingCatId) return;
    // Delete all items in category first
    const catItems = allItems.filter(i => String(i.categoryId) === String(deletingCatId));
    try {
      await Promise.all(catItems.map(i => expenseService.deleteExpenseItem(i.id)));
      toast({ title: "Category removed" });
      setDeletingCatId(null);
      if (selectedCategoryId === deletingCatId) setSelectedCategoryId(null);
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Delete failed", variant: "destructive" });
      setDeletingCatId(null);
    }
  };

  // ── Add item to selected category ────────────────────────────────
  const addItem = async () => {
    if (!newItemName.trim() || !selectedCategoryId) return;
    setAddingItem(true);
    const cat = categories.find(c => String(c.id) === String(selectedCategoryId));
    if (!cat) { setAddingItem(false); return; }
    try {
      // BUG-158: updateCategory (PUT /expenses/{id}) silently ignores stock_title.
      // Fix: POST store_expense adds a single item to an existing category (same pattern as DnD fix).
      await expenseService.createCategoryWithItems(cat.name, [newItemName.trim()]);
      toast({ title: "Item added", description: newItemName.trim() });
      setNewItemName("");
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to add item", variant: "destructive" });
    } finally {
      setAddingItem(false);
    }
  };

  // ── Delete item ───────────────────────────────────────────────────
  const deleteItem = async () => {
    if (!deletingItemId) return;
    try {
      await expenseService.deleteExpenseItem(deletingItemId);
      toast({ title: "Item removed" });
      setDeletingItemId(null);
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Delete failed", variant: "destructive" });
      setDeletingItemId(null);
    }
  };

  // ── Export ───────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await expenseService.exportStockMaster();
      const data = fromAPI.exportResponse(res);
      if (data.downloadUrl) window.open(data.downloadUrl, "_blank");
      else toast({ title: "Export", description: data.message });
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // ── Import ───────────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await expenseService.importStockMaster(file);
      toast({ title: "Import complete", description: file.name });
      fetchAll();
    } catch (err) {
      toast({ title: "Import error", description: err.readableMessage || "Import failed", variant: "destructive" });
    }
    e.target.value = "";
  };

  // ── Bulk save ─────────────────────────────────────────────────────
  const handleBulkSave = async (rows) => {
    setBulkSaving(true);
    const errors = [];
    for (const row of rows) {
      if (!row.title.trim() || !row.categoryId) continue;
      const cat = categories.find(c => String(c.id) === String(row.categoryId));
      if (!cat) continue;
      try {
        // BUG-161: updateCategory (PUT) silently ignores stock_title — same root cause as BUG-158.
        // Fix: POST store_expense per row.
        await expenseService.createCategoryWithItems(cat.name, [row.title.trim()]);
      } catch (err) {
        errors.push(row.title);
      }
    }
    if (errors.length > 0) toast({ title: "Some items failed", description: errors.join(", "), variant: "destructive" });
    else toast({ title: "Bulk save complete", description: `${rows.length} items saved` });
    setBulkSaving(false);
    setBulkMode(false);
    fetchAll();
  };

  // ── Drag-and-drop: reassign item to a different category ─────────
  // CR-059 / BUG-DND-CR059: PUT /expenses/{catId} ignores stock_title (backend no-op).
  // Correct workflow confirmed via investigation: DELETE item → POST re-create in new category.
  const handleDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    if (destination.droppableId === 'items-source') return;

    const itemId = parseInt(draggableId, 10);
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    const newCatId = parseInt(destination.droppableId, 10);
    if (String(item.categoryId) === String(newCatId)) return;

    const newCat = categories.find(c => String(c.id) === String(newCatId));
    if (!newCat) return;

    // Optimistic update so UI feels instant
    setAllItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, categoryId: newCatId, categoryName: newCat.name } : i
    ));

    try {
      // Step 1: remove from current category (DELETE stock item by ID)
      await expenseService.deleteExpenseItem(itemId);
      // Step 2: re-create in new category (POST store_expense)
      await expenseService.createCategoryWithItems(newCat.name, [item.title]);
      toast({ title: "Item moved", description: `"${item.title}" → ${newCat.name}` });
      fetchAll(); // refresh to get new item ID assigned by backend
    } catch (err) {
      toast({ title: "Move failed", description: err.readableMessage || "Could not move item", variant: "destructive" });
      fetchAll(); // revert optimistic on error
    }
  }, [allItems, categories, toast, fetchAll]);

  const btnBase = "px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 hover:opacity-90";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="expense-setup-loading">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
      </div>
    );
  }

  if (bulkMode) {
    return (
      <div className="h-full flex flex-col" data-testid="expense-setup-bulk">
        <ExpenseBulkEditor
          items={selectedCategoryId
            ? allItems.filter(i => String(i.categoryId) === String(selectedCategoryId))
            : allItems}
          categories={categories}
          units={units}
          onSave={handleBulkSave}
          onCancel={() => setBulkMode(false)}
          saving={bulkSaving}
        />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full" data-testid="expense-setup-panel">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
          <h1 className="text-xl font-bold" style={{ color: COLORS.darkText, fontFamily: "Poppins, sans-serif" }}>
            Expense Setup
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting}
            className={btnBase}
            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            data-testid="setup-export-btn">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export
          </button>
          <label className={btnBase + " cursor-pointer"}
            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            data-testid="setup-import-btn">
            <Upload className="w-3.5 h-3.5" /> Import
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={() => setBulkMode(true)}
            className={btnBase}
            style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
            data-testid="setup-bulk-btn">
            <TableProperties className="w-3.5 h-3.5" /> Bulk Edit
          </button>
          <button onClick={fetchAll} className="p-1.5 rounded-lg border hover:bg-gray-50"
            style={{ borderColor: COLORS.borderGray }}>
            <RefreshCw className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* ── Two-column layout with DnD context ─────────────────── */}
      {/* CR-059: DragDropContext wraps both columns — drag items (right) onto categories (left) */}
      <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-[calc(100vh-160px)]">

        {/* Left — Categories (each is a Droppable target) */}
        {/* BUG-157: w-72 (was w-64) for better 6-8 category usability */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border flex flex-col overflow-hidden"
          style={{ borderColor: COLORS.borderGray }}>
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: COLORS.borderGray }}>
            <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
              Categories <span className="text-xs font-normal ml-1" style={{ color: COLORS.grayText }}>({categories.length})</span>
            </span>
            <button onClick={() => setShowNewCatInput(v => !v)}
              className="p-1 rounded hover:bg-orange-50" data-testid="add-category-btn">
              <Plus className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
            </button>
          </div>

          {showNewCatInput && (
            <div className="px-3 py-2 border-b" style={{ borderColor: COLORS.borderGray }}>
              <div className="flex gap-1">
                <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setShowNewCatInput(false); setNewCatName(""); } }}
                  placeholder="Category name"
                  className="flex-1 px-2 py-1.5 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="new-category-input" />
                <button onClick={addCategory} disabled={addingCat || !newCatName.trim()}
                  className="px-2.5 py-1.5 text-xs font-medium rounded text-white disabled:opacity-50"
                  style={{ background: COLORS.primaryGreen }}
                  data-testid="new-category-save">
                  {addingCat ? "..." : "Add"}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div
              onClick={() => setSelectedCategoryId(null)}
              className="flex items-center justify-between px-4 py-3.5 rounded-lg cursor-pointer border transition-colors"
              style={{
                borderColor: !selectedCategoryId ? COLORS.primaryOrange : "transparent",
                background: !selectedCategoryId ? `${COLORS.primaryOrange}0D` : "transparent",
                minHeight: 52,
              }}
              data-testid="category-all">
              <div className="flex items-center gap-2">
                <List className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>All Items</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: `${COLORS.primaryOrange}18`, color: COLORS.primaryOrange }}>
                  {allItems.length}
                </span>
              </div>
            </div>
            {categories.map(cat => (
              <Droppable key={cat.id} droppableId={String(cat.id)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      borderRadius: 8,
                      background: snapshot.isDraggingOver ? `${COLORS.primaryOrange}18` : 'transparent',
                      outline: snapshot.isDraggingOver ? `2px solid ${COLORS.primaryOrange}` : 'none',
                      transform: snapshot.isDraggingOver ? 'scale(1.01)' : 'scale(1)',
                      transition: 'all 0.12s ease',
                      position: 'relative',
                    }}
                  >
                    <CategoryRow
                      cat={cat}
                      selected={String(selectedCategoryId) === String(cat.id)}
                      itemCount={itemCountFor(cat.id)}
                      onSelect={setSelectedCategoryId}
                      onRename={renameCategory}
                      onDelete={setDeletingCatId}
                    />
                    {snapshot.isDraggingOver && (
                      <div style={{
                        fontSize: 10, color: COLORS.primaryOrange,
                        textAlign: 'center', paddingBottom: 3, fontWeight: 700,
                        letterSpacing: 0.3, lineHeight: 1,
                      }}>
                        Drop here
                      </div>
                    )}
                    {/* BUG-150: height:0 hides visually but lets @hello-pangea/dnd measure the container.
                        display:none removes element from layout → Droppable hit-area = 0 → drops fail silently */}
                    <div style={{ height: 0, overflow: 'hidden' }}>{provided.placeholder}</div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>

        {/* Right — Items */}
        <div className="flex-1 bg-white rounded-xl border flex flex-col overflow-hidden"
          style={{ borderColor: COLORS.borderGray }}>
          {/* Items header */}
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: COLORS.borderGray }}>
            <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
              {selectedCategoryId
                ? categories.find(c => String(c.id) === String(selectedCategoryId))?.name ?? "Items"
                : "All Items"} ({visibleItems.length})
            </span>
            <div className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="px-3 py-1.5 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-orange-200"
                style={{ borderColor: COLORS.borderGray, width: 200 }}
                data-testid="items-search"
              />
            </div>
          </div>

          {/* Add item row */}
          {selectedCategoryId && (
            <div className="px-4 py-2.5 border-b flex items-center gap-2"
              style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
              <input
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addItem(); }}
                placeholder={`Add item to ${categories.find(c => String(c.id) === String(selectedCategoryId))?.name ?? "category"}...`}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-orange-200"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="new-item-input"
              />
              <button onClick={addItem} disabled={addingItem || !newItemName.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: COLORS.primaryGreen }}
                data-testid="new-item-save">
                {addingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add
              </button>
            </div>
          )}

          {/* Items table */}
          <div className="flex-1 overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Settings2 className="w-8 h-8 opacity-20" style={{ color: COLORS.grayText }} />
                <p className="text-sm" style={{ color: COLORS.grayText }}>
                  {searchQuery ? "No items match your search" : "No items in this category"}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Unit Price</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Unit</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Actions</th>
                  </tr>
                </thead>
                <Droppable droppableId="items-source">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {visibleItems.map((item, i) => (
                        <Draggable key={item.id} draggableId={String(item.id)} index={i}>
                          {(dragProvided, dragSnapshot) => (
                            <tr
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                              style={{
                                borderColor: COLORS.borderGray,
                                background: dragSnapshot.isDragging
                                  ? '#FFF7ED'
                                  : (i % 2 === 0 ? "#fff" : COLORS.sectionBg),
                                ...dragProvided.draggableProps.style,
                              }}
                              data-testid={`item-row-${item.id}`}
                            >
                              {/* BUG-P2: hidden drag handle — no visible grip to avoid reorder confusion */}
                              <td style={{padding:0,width:0}}><span {...dragProvided.dragHandleProps} /></td>
                              <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>{item.title}</td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 rounded-full text-xs"
                                  style={{ background: "#F0FFF0", color: COLORS.primaryGreen }}>
                                  {item.categoryName || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium" style={{ color: COLORS.darkText }}>
                                {item.unitPriceAmount != null ? `₹${item.unitPriceAmount}` : <span style={{ color: COLORS.grayText }}>—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-xs" style={{ color: COLORS.grayText }}>{item.unit || "—"}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-center">
                                  <button onClick={() => setDeletingItemId(item.id)}
                                    className="p-1.5 rounded hover:bg-red-50"
                                    data-testid={`item-delete-btn-${item.id}`}>
                                    <Trash2 className="w-3.5 h-3.5" style={{ color: COLORS.errorText }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </tbody>
                  )}
                </Droppable>
              </table>
            )}
          </div>
        </div>
      </div>
      </DragDropContext>

      {/* ── Delete Category Confirm ──────────────────────────────── */}
      {deletingCatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 border" style={{ borderColor: COLORS.borderGray }}
            data-testid="delete-category-confirm">
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Delete Category?</h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
              All items in this category will also be removed. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingCatId(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button onClick={deleteCategory}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: COLORS.errorText }}
                data-testid="delete-category-confirm-btn">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Item Confirm ──────────────────────────────────── */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 border" style={{ borderColor: COLORS.borderGray }}
            data-testid="delete-item-confirm">
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Remove Item?</h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingItemId(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button onClick={deleteItem}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: COLORS.errorText }}
                data-testid="delete-item-confirm-btn">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSetupPanel;
