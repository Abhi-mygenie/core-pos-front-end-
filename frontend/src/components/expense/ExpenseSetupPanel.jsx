// CR-059: Expense Setup Panel — Category CRUD + Items master management
import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Settings2, Plus, Pencil, Trash2, Check, X,
  Loader2, RefreshCw, List, TableProperties, Search
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
  const [deletingCatId, setDeletingCatId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);

  // CR-066: Tab + Unit Price management state
  const [activeTab, setActiveTab] = useState('stock-master');
  const [unpricedItems, setUnpricedItems] = useState([]);
  const [pricedItems, setPricedItems] = useState([]);
  const [upLoading, setUpLoading] = useState(false);
  const [upSearch, setUpSearch] = useState('');
  const [settingPriceId, setSettingPriceId] = useState(null);
  const [newPriceQty, setNewPriceQty] = useState('1');
  const [newPriceAmount, setNewPriceAmount] = useState('');
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceAmount, setEditPriceAmount] = useState('');
  const [deletingPriceId, setDeletingPriceId] = useState(null);

  // ── Fetch data ───────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        expenseService.getCategories(),
        expenseService.getExpenseItems(),
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

      if (!selectedCategoryId && cats.length > 0) setSelectedCategoryId(cats[0].id);
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedCategoryId]);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // CR-066: Load unit price tab data
  const fetchUnitPriceData = useCallback(async () => {
    setUpLoading(true);
    try {
      const [pricesRes, withoutRes] = await Promise.all([
        expenseService.getUnitPrices(),
        expenseService.getItemsWithoutPrices(),
      ]);
      setPricedItems(fromAPI.unitPrices(pricesRes));
      setUnpricedItems(fromAPI.itemsWithoutPrices(withoutRes));
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to load unit prices", variant: "destructive" });
    } finally {
      setUpLoading(false);
    }
  }, [toast]);

  // CR-066: Fetch when tab switches to unit-prices
  useEffect(() => {
    if (activeTab === 'unit-prices') fetchUnitPriceData();
  }, [activeTab, fetchUnitPriceData]);

  // ── Derived: items for selected category + search ────────────────
  const visibleItems = allItems.filter(i => {
    const catMatch = !selectedCategoryId || String(i.categoryId) === String(selectedCategoryId);
    const searchMatch = !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const itemCountFor = (catId) => allItems.filter(i => String(i.categoryId) === String(catId)).length;

  // CR-066: Filtered unit price items (search)
  const filteredUnpriced = unpricedItems.filter(
    (i) => !upSearch || i.title.toLowerCase().includes(upSearch.toLowerCase())
  );
  const filteredPriced = pricedItems.filter(
    (i) => !upSearch || i.stockTitle.toLowerCase().includes(upSearch.toLowerCase())
  );

  // ── Add category ─────────────────────────────────────────────────
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await expenseService.createEmptyCategory(newCatName.trim()); // BUG-159 fix
      // BUG-164: backend returns HTTP 201 even for duplicates, with errors[] in body.
      // Axios never throws for 2xx — must inspect res.data.errors manually.
      if (res?.data?.errors?.[0]) {
        const msg = res.data.errors[0].message || "This category already exists.";
        toast({ title: "Duplicate category", description: msg, variant: "destructive" });
        return;
      }
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
  const renameCategory = async (catId, name) => { // BUG-160 fix
    try {
      await expenseService.renameExpenseCategory(catId, name);
      toast({ title: "Renamed", description: name });
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Rename failed", variant: "destructive" });
    }
  };

  // ── Delete category ───────────────────────────────────────────────
  const deleteCategory = async () => { // BUG-160 fix
    if (!deletingCatId) return;
    try {
      await expenseService.deleteExpenseCategory(deletingCatId);
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
    // BUG-165 FE guard: backend has no uniqueness constraint on item names per category.
    // Check allItems state before calling API to block obvious duplicates client-side.
    // ⚠️ BACKEND FLAG: POST /store_expense should return 4xx for duplicate stock_title within same category.
    const isDuplicate = allItems.some(
      i => String(i.categoryId) === String(selectedCategoryId) &&
           i.title.trim().toLowerCase() === newItemName.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast({ title: "Duplicate item", description: `"${newItemName.trim()}" already exists in ${cat.name}.`, variant: "destructive" });
      setAddingItem(false);
      return;
    }
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

  // CR-066: Set price on unpriced item
  const handleSetPrice = async (stockId) => {
    const qty = parseFloat(newPriceQty) || 1;
    const price = parseFloat(newPriceAmount);
    if (!price || price <= 0) return;
    try {
      await expenseService.addUnitPrice(stockId, qty, price);
      const item = unpricedItems.find((i) => i.id === stockId);
      if (item) {
        setUnpricedItems((prev) => prev.filter((i) => i.id !== stockId));
        setPricedItems((prev) => [
          ...prev,
          { id: Date.now(), stockId, stockTitle: item.title, quantity: qty, price },
        ]);
      }
      setSettingPriceId(null);
      setNewPriceQty('1');
      setNewPriceAmount('');
      toast({ title: "Price set", description: `₹${(price / qty).toFixed(2)}/unit` });
      fetchUnitPriceData();
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to set price", variant: "destructive" });
    }
  };

  // CR-066: Edit existing price (qty read-only — API only accepts price)
  const handleEditPrice = async (priceId) => {
    const price = parseFloat(editPriceAmount);
    if (!price || price <= 0) return;
    try {
      await expenseService.editUnitPrice(priceId, price);
      setPricedItems((prev) =>
        prev.map((p) => (p.id === priceId ? { ...p, price } : p))
      );
      setEditingPriceId(null);
      setEditPriceAmount('');
      toast({ title: "Price updated" });
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to update price", variant: "destructive" });
    }
  };

  // CR-066: Delete price → item moves back to "Not Priced Yet"
  const handleDeletePrice = async () => {
    if (!deletingPriceId) return;
    try {
      const item = pricedItems.find((p) => p.id === deletingPriceId);
      await expenseService.deleteUnitPrice(deletingPriceId);
      setPricedItems((prev) => prev.filter((p) => p.id !== deletingPriceId));
      if (item) {
        setUnpricedItems((prev) => [...prev, { id: item.stockId, title: item.stockTitle }]);
      }
      setDeletingPriceId(null);
      toast({ title: "Price removed" });
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to delete price", variant: "destructive" });
      setDeletingPriceId(null);
    }
  };

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
        {/* CR-067: redesigned bulk editor — internal save, onRefresh + onClose props */}
        <ExpenseBulkEditor
          items={allItems}
          categories={categories}
          onRefresh={fetchAll}
          onClose={() => setBulkMode(false)}
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
          {/* CR-066: Bulk Edit only on Stock Master tab */}
          {activeTab === 'stock-master' && (
            <button onClick={() => setBulkMode(true)}
              className={btnBase}
              style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
              data-testid="setup-bulk-btn">
              <TableProperties className="w-3.5 h-3.5" /> Bulk Edit
            </button>
          )}
          <button onClick={activeTab === 'unit-prices' ? fetchUnitPriceData : fetchAll} className="p-1.5 rounded-lg border hover:bg-gray-50"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="setup-refresh-btn">
            <RefreshCw className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* CR-066: Tab strip — Stock Master | Unit Prices */}
      <div className="flex gap-0 mb-4 border-b" style={{ borderColor: COLORS.borderGray }}
        data-testid="setup-tab-strip">
        <button
          onClick={() => setActiveTab('stock-master')}
          className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'stock-master' ? COLORS.primaryOrange : 'transparent',
            color: activeTab === 'stock-master' ? COLORS.primaryOrange : COLORS.grayText,
          }}
          data-testid="tab-stock-master">
          Stock Master
        </button>
        <button
          onClick={() => setActiveTab('unit-prices')}
          className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'unit-prices' ? COLORS.primaryOrange : 'transparent',
            color: activeTab === 'unit-prices' ? COLORS.primaryOrange : COLORS.grayText,
          }}
          data-testid="tab-unit-prices">
          Unit Prices
        </button>
      </div>

      {/* ── Two-column layout with DnD context ─────────────────── */}
      {activeTab === 'stock-master' && (<>
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
                    <th style={{padding:0, width:0}} />
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Category</th>
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
      </>)}

      {/* CR-066: Unit Prices Tab */}
      {activeTab === 'unit-prices' && (
        <div className="h-[calc(100vh-210px)] flex flex-col" data-testid="unit-prices-tab">
          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.grayText }} />
              <input
                value={upSearch} onChange={(e) => setUpSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-orange-200"
                style={{ borderColor: COLORS.borderGray, maxWidth: 320 }}
                data-testid="up-search-input"
              />
            </div>
          </div>

          {upLoading ? (
            <div className="flex items-center justify-center flex-1" data-testid="up-loading">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* ── Section A: Not Priced Yet ─────────────────────── */}
              <div className="bg-white rounded-xl border" style={{ borderColor: COLORS.borderGray }}
                data-testid="up-section-unpriced">
                <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
                  <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
                    Not Priced Yet
                    <span className="text-xs font-normal ml-1.5" style={{ color: COLORS.grayText }}>
                      ({filteredUnpriced.length})
                    </span>
                  </span>
                </div>
                {filteredUnpriced.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: COLORS.grayText }}>
                    {upSearch ? "No items match your search" : "All items have prices set"}
                  </div>
                ) : (
                  <div className="max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 80 }}>Qty</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 100 }}>Price (₹)</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 90 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnpriced.map((item) => (
                          <tr key={item.id} className="border-b last:border-0" style={{ borderColor: COLORS.borderGray }}
                            data-testid={`up-unpriced-row-${item.id}`}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>{item.title}</td>
                            {settingPriceId === item.id ? (
                              <>
                                <td className="px-2 py-1.5 text-center">
                                  <input type="number" min="1" step="1"
                                    value={newPriceQty} onChange={(e) => setNewPriceQty(e.target.value)}
                                    className="w-16 px-2 py-1 text-sm text-center rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                    style={{ borderColor: COLORS.borderGray }}
                                    data-testid={`up-qty-input-${item.id}`} />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input type="number" min="0.01" step="0.01" autoFocus
                                    value={newPriceAmount} onChange={(e) => setNewPriceAmount(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSetPrice(item.id); if (e.key === 'Escape') { setSettingPriceId(null); setNewPriceQty('1'); setNewPriceAmount(''); } }}
                                    placeholder="0.00"
                                    className="w-20 px-2 py-1 text-sm text-center rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                    style={{ borderColor: COLORS.borderGray }}
                                    data-testid={`up-price-input-${item.id}`} />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => handleSetPrice(item.id)}
                                      disabled={!newPriceAmount || parseFloat(newPriceAmount) <= 0}
                                      className="p-1 rounded hover:bg-green-50 disabled:opacity-40"
                                      data-testid={`up-confirm-price-${item.id}`}>
                                      <Check className="w-3.5 h-3.5" style={{ color: COLORS.primaryGreen }} />
                                    </button>
                                    <button onClick={() => { setSettingPriceId(null); setNewPriceQty('1'); setNewPriceAmount(''); }}
                                      className="p-1 rounded hover:bg-gray-100">
                                      <X className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2.5 text-center" style={{ color: COLORS.grayText }}>—</td>
                                <td className="px-4 py-2.5 text-center" style={{ color: COLORS.grayText }}>—</td>
                                <td className="px-4 py-2.5 text-center">
                                  <button onClick={() => { setSettingPriceId(item.id); setNewPriceQty('1'); setNewPriceAmount(''); }}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg border hover:opacity-90"
                                    style={{ borderColor: COLORS.primaryGreen, color: COLORS.primaryGreen }}
                                    data-testid={`up-set-price-btn-${item.id}`}>
                                    Set Price
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Section B: Priced ─────────────────────────────── */}
              <div className="bg-white rounded-xl border" style={{ borderColor: COLORS.borderGray }}
                data-testid="up-section-priced">
                <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
                  <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
                    Priced
                    <span className="text-xs font-normal ml-1.5" style={{ color: COLORS.grayText }}>
                      ({filteredPriced.length})
                    </span>
                  </span>
                </div>
                {filteredPriced.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: COLORS.grayText }}>
                    {upSearch ? "No priced items match your search" : "No unit prices set yet"}
                  </div>
                ) : (
                  <div className="max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 70 }}>Qty</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 100 }}>Price (₹)</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 110 }}>Unit Price</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 90 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPriced.map((item) => (
                          <tr key={item.id} className="border-b last:border-0" style={{ borderColor: COLORS.borderGray }}
                            data-testid={`up-priced-row-${item.id}`}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>{item.stockTitle}</td>
                            <td className="px-4 py-2.5 text-center" style={{ color: COLORS.grayText }}>{item.quantity}</td>
                            {editingPriceId === item.id ? (
                              <td className="px-2 py-1.5 text-center">
                                <input type="number" min="0.01" step="0.01" autoFocus
                                  value={editPriceAmount}
                                  onChange={(e) => setEditPriceAmount(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditPrice(item.id); if (e.key === 'Escape') { setEditingPriceId(null); setEditPriceAmount(''); } }}
                                  className="w-20 px-2 py-1 text-sm text-center rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                  style={{ borderColor: COLORS.borderGray }}
                                  data-testid={`up-edit-price-input-${item.id}`} />
                              </td>
                            ) : (
                              <td className="px-4 py-2.5 text-center font-medium" style={{ color: COLORS.darkText }}>
                                ₹{item.price.toFixed(2)}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-center text-xs font-semibold" style={{ color: COLORS.primaryGreen }}>
                              ₹{(item.price / item.quantity).toFixed(2)}/unit
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-center gap-0.5">
                                {editingPriceId === item.id ? (
                                  <>
                                    <button onClick={() => handleEditPrice(item.id)}
                                      disabled={!editPriceAmount || parseFloat(editPriceAmount) <= 0}
                                      className="p-1 rounded hover:bg-green-50 disabled:opacity-40"
                                      data-testid={`up-edit-confirm-${item.id}`}>
                                      <Check className="w-3.5 h-3.5" style={{ color: COLORS.primaryGreen }} />
                                    </button>
                                    <button onClick={() => { setEditingPriceId(null); setEditPriceAmount(''); }}
                                      className="p-1 rounded hover:bg-gray-100">
                                      <X className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setEditingPriceId(item.id); setEditPriceAmount(String(item.price)); }}
                                      className="p-1 rounded hover:bg-orange-50"
                                      data-testid={`up-edit-btn-${item.id}`}>
                                      <Pencil className="w-3 h-3" style={{ color: COLORS.primaryOrange }} />
                                    </button>
                                    <button onClick={() => setDeletingPriceId(item.id)}
                                      className="p-1 rounded hover:bg-red-50"
                                      data-testid={`up-delete-btn-${item.id}`}>
                                      <Trash2 className="w-3 h-3" style={{ color: COLORS.errorText }} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
      {/* BUG-201 Phase 1 interim (2026-07-16): cascade-aware wording. Full 409-driven UX (with transaction count from backend) lands once BACKEND_BRIEF_BUG201 is delivered. */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 border" style={{ borderColor: COLORS.borderGray }}
            data-testid="delete-item-confirm">
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Delete Item?</h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
              This item may have linked expense transactions. Deleting will permanently remove the item and all related expense records. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingItemId(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button onClick={deleteItem}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: COLORS.errorText }}
                data-testid="delete-item-confirm-btn">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* CR-066: Delete Price Confirm */}
      {deletingPriceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 border" style={{ borderColor: COLORS.borderGray }}
            data-testid="delete-price-confirm">
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Remove Unit Price?</h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
              This item will move back to "Not Priced Yet." You can set a new price later.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingPriceId(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button onClick={handleDeletePrice}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: COLORS.errorText }}
                data-testid="delete-price-confirm-btn">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSetupPanel;
