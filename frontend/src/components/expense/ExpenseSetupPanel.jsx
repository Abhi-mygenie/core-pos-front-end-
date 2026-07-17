// CR-059: Expense Setup Panel — Category CRUD + Items master management
// CR-074-B (2026-07-17): design refresh, optimistic updates, inline edit, unit-price on quick-add, bulk-select
// CR-064:            unit-price input on quick-add row (two-call sequence)
// BUG-162:           kill the panel-wide flicker (optimistic local state, no post-mutation fetchAll)
// BUG-202-fwd-compat: inline edit + DnD move via PUT /expenses/{id}
// CR-074-B Phase 4: bulk-select (delete + move-to-category) with selection banner (Mockup 06)
import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Settings2, Plus, Pencil, Trash2, Check, X,
  Loader2, RefreshCw, List, TableProperties, Search, GripVertical, ChevronDown
} from "lucide-react";
import { COLORS } from "../../constants";
import { useToast } from "../../hooks/use-toast";
import * as expenseService from "../../api/services/expenseService";
import { fromAPI } from "../../api/transforms/expenseTransform";
import ExpenseBulkEditor from "./ExpenseBulkEditor";

// ─── Category Row ─────────────────────────────────────────────────────────────
const CategoryRow = ({ cat, selected, itemCount, isLoading, onSelect, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);

  const commit = () => { onRename(cat.id, name); setEditing(false); };
  const discard = () => { setName(cat.name); setEditing(false); };

  return (
    <div
      onClick={() => !editing && onSelect(cat.id)}
      className="flex items-center justify-between px-4 rounded-lg cursor-pointer border transition-colors"
      style={{
        // CR-074-B smoke-fix: transparent outer border in edit mode → only ONE visible border (the input's own)
        borderColor: editing ? "transparent" : (selected ? COLORS.primaryOrange : "transparent"),
        background: selected ? `${COLORS.primaryOrange}0D` : "transparent",
        height: 52, // fixed (not min-height) so edit-mode never grows and creates a gap
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
            {/* BUG-162: per-row loading indicator (no more panel-wide spinner on mutations) */}
            {isLoading && (
              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0"
                style={{ color: COLORS.primaryOrange }}
                data-testid={`category-row-loading-${cat.id}`} />
            )}
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
  const [newItemPrice, setNewItemPrice] = useState(""); // CR-064: unit-price on quick-add
  const [addingItem, setAddingItem] = useState(false);

  // Bulk editor
  const [bulkMode, setBulkMode] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);

  // BUG-162: per-row loading tracking (no more panel-wide loading on mutations)
  const [loadingItemIds, setLoadingItemIds] = useState(() => new Set());
  const [loadingCategoryIds, setLoadingCategoryIds] = useState(() => new Set());

  // BUG-202-fwd-compat: inline edit state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemCategoryId, setEditItemCategoryId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");  // BUG-203: unit price in inline edit

  // CR-074-B Phase 4: bulk-select state (Mockup 06)
  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
  const [bulkMoveDropdownOpen, setBulkMoveDropdownOpen] = useState(false);
  const [bulkMoveTargetCatId, setBulkMoveTargetCatId] = useState(null); // set when user picks target from dropdown
  const [bulkMoveConfirmOpen, setBulkMoveConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);

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
      const [catRes, itemRes, pricesRes] = await Promise.all([
        expenseService.getCategories(),
        expenseService.getExpenseItems(),
        expenseService.getUnitPrices(),  // BUG-203: eagerly load for stockId→unitPriceRowId lookup in inline edit
      ]);
      const cats = fromAPI.categories(catRes);
      setCategories(cats);
      setPricedItems(fromAPI.unitPrices(pricesRes));  // BUG-203: always available for inline edit

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
  // BUG-162: optimistic — no post-success fetchAll. Uses id echoed by backend.
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
      const created = res?.data?.category;
      const trimmed = newCatName.trim();
      if (created?.id != null) {
        const newCat = { id: created.id, name: created.category_name ?? created.name ?? trimmed };
        setCategories((prev) => [...prev, newCat]);
        setSelectedCategoryId((prev) => prev ?? newCat.id);
      } else {
        // Backend didn't echo the id — fall back to a targeted refetch (no loading flash)
        try {
          const catRes = await expenseService.getCategories();
          setCategories(fromAPI.categories(catRes));
        } catch {/* swallow — user can hit refresh */}
      }
      toast({ title: "Category added", description: trimmed });
      setNewCatName("");
      setShowNewCatInput(false);
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to add category", variant: "destructive" });
    } finally {
      setAddingCat(false);
    }
  };

  // ── Rename category ───────────────────────────────────────────────
  // BUG-162: optimistic — patch categories + items whose categoryName referenced this cat.
  const renameCategory = async (catId, name) => { // BUG-160 fix
    const trimmed = name.trim();
    if (!trimmed) return;
    const prevCats = categories;
    const prevItems = allItems;
    // Optimistic
    setCategories((prev) => prev.map((c) => (String(c.id) === String(catId) ? { ...c, name: trimmed } : c)));
    setAllItems((prev) => prev.map((i) => (String(i.categoryId) === String(catId) ? { ...i, categoryName: trimmed } : i)));
    setLoadingCategoryIds((prev) => new Set(prev).add(catId));
    try {
      await expenseService.renameExpenseCategory(catId, trimmed);
      toast({ title: "Renamed", description: trimmed });
    } catch (err) {
      // Revert
      setCategories(prevCats);
      setAllItems(prevItems);
      toast({ title: "Error", description: err.readableMessage || "Rename failed", variant: "destructive" });
    } finally {
      setLoadingCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(catId);
        return next;
      });
    }
  };

  // ── Delete category ───────────────────────────────────────────────
  // BUG-162: optimistic — remove category locally; move its items to uncategorized (null categoryId)
  // until natural refresh reconciles with backend's "moved to misc" default.
  const deleteCategory = async () => { // BUG-160 fix
    if (!deletingCatId) return;
    const catId = deletingCatId;
    const prevCats = categories;
    const prevItems = allItems;
    const prevSelected = selectedCategoryId;
    // Optimistic
    setCategories((prev) => prev.filter((c) => String(c.id) !== String(catId)));
    setAllItems((prev) => prev.map((i) => (String(i.categoryId) === String(catId) ? { ...i, categoryId: null, categoryName: "" } : i)));
    if (selectedCategoryId === catId) setSelectedCategoryId(null);
    setDeletingCatId(null);
    setLoadingCategoryIds((prev) => new Set(prev).add(catId));
    try {
      await expenseService.deleteExpenseCategory(catId);
      toast({ title: "Category removed" });
      // Background sync of items only (to pick up the real "misc" reassignment) — no loading flash.
      try {
        const itemRes = await expenseService.getExpenseItems();
        const catByName = {};
        prevCats
          .filter((c) => String(c.id) !== String(catId))
          .forEach((c) => { catByName[c.name.toLowerCase().trim()] = c.id; });
        const rawItems = fromAPI.expenseItems(itemRes).map((item) => ({
          ...item,
          categoryId:
            item.categoryId
            ?? catByName[item.categoryName?.toLowerCase().trim()]
            ?? null,
        }));
        setAllItems(rawItems);
      } catch {/* swallow */}
    } catch (err) {
      // Revert
      setCategories(prevCats);
      setAllItems(prevItems);
      setSelectedCategoryId(prevSelected);
      toast({ title: "Error", description: err.readableMessage || "Delete failed", variant: "destructive" });
    } finally {
      setLoadingCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(catId);
        return next;
      });
    }
  };

  // ── Add item to selected category ────────────────────────────────
  // BUG-162: optimistic — no post-success fetchAll (only a targeted item refresh to swap temp id for real id).
  // CR-064: optional unit-price on quick-add — two-call sequence (curl-verified 2026-07-17: backend does NOT accept inline unit_price on POST /store_expense).
  const addItem = async () => {
    // CR-074-B smoke-fix: guard against rapid Enter double-submit (Enter handler bypasses button-disabled state)
    if (addingItem) return;
    if (!newItemName.trim() || !selectedCategoryId) return;
    setAddingItem(true);
    const cat = categories.find((c) => String(c.id) === String(selectedCategoryId));
    if (!cat) { setAddingItem(false); return; }
    // BUG-165 FE guard: backend has no uniqueness constraint on item names per category.
    // ⚠️ BACKEND FLAG: POST /store_expense should return 4xx for duplicate stock_title within same category.
    // CR-074-B smoke-fix: also match by category NAME as fallback when categoryId is null
    // (Uncategorized bucket case — items come back with category_id: null and only category_name).
    const catNameKey = (cat.name || "").trim().toLowerCase();
    const isDuplicate = allItems.some(
      (i) => {
        const catMatch =
          String(i.categoryId) === String(selectedCategoryId)
          || (i.categoryId == null && (i.categoryName || "").trim().toLowerCase() === catNameKey);
        return catMatch && i.title.trim().toLowerCase() === newItemName.trim().toLowerCase();
      }
    );
    if (isDuplicate) {
      toast({ title: "Duplicate item", description: `"${newItemName.trim()}" already exists in ${cat.name}.`, variant: "destructive" });
      setAddingItem(false);
      return;
    }
    const trimmed = newItemName.trim();
    const priceRaw = String(newItemPrice).trim();
    const priceValue = priceRaw === "" ? null : parseFloat(priceRaw);
    const wantsPrice = priceValue !== null && !Number.isNaN(priceValue) && priceValue > 0;
    // Optimistic: insert with a temp id
    const tempId = `_tmp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      title: trimmed,
      categoryId: selectedCategoryId,
      categoryName: cat.name,
      unitPrice: null,
      unitPriceAmount: wantsPrice ? priceValue : null,
      unit: "",
      createdAt: "",
    };
    setAllItems((prev) => [...prev, optimistic]);
    try {
      // Step A: create item (BUG-158 pattern: POST /store_expense adds single item to existing category)
      await expenseService.createCategoryWithItems(cat.name, [trimmed]);
      // Targeted item refetch to swap the temp row for the real one (background — no loading flash)
      let createdItem = null;
      try {
        const itemRes = await expenseService.getExpenseItems();
        const catByName = {};
        categories.forEach((c) => { catByName[c.name.toLowerCase().trim()] = c.id; });
        const rawItems = fromAPI.expenseItems(itemRes).map((item) => ({
          ...item,
          categoryId:
            item.categoryId
            ?? catByName[item.categoryName?.toLowerCase().trim()]
            ?? null,
        }));
        setAllItems(rawItems);
        createdItem = rawItems
          .filter((it) => String(it.categoryId) === String(selectedCategoryId)
                        && it.title.trim().toLowerCase() === trimmed.toLowerCase())
          .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0] || null;
      } catch {
        // If refetch fails, remove the optimistic row so we don't leave orphaned temp state
        setAllItems((prev) => prev.filter((i) => i.id !== tempId));
      }
      // Step B (CR-064): set unit price if provided
      if (wantsPrice && createdItem?.id) {
        setLoadingItemIds((prev) => new Set(prev).add(createdItem.id));
        try {
          await expenseService.addUnitPrice(createdItem.id, 1, priceValue);
          // Reflect on the item locally
          setAllItems((prev) => prev.map((i) => (i.id === createdItem.id
            ? { ...i, unitPriceAmount: priceValue, unitPrice: true }
            : i)));
          toast({ title: "Item added", description: `${trimmed} · ₹${priceValue.toFixed(2)}` });
        } catch (priceErr) {
          toast({
            title: "Item added, price save failed",
            description: priceErr.readableMessage || "Set price in the Unit Prices tab.",
            variant: "destructive",
          });
        } finally {
          setLoadingItemIds((prev) => {
            const next = new Set(prev);
            next.delete(createdItem.id);
            return next;
          });
        }
      } else if (wantsPrice && !createdItem) {
        // We couldn't identify the new item id from refetch — surface a soft warning.
        toast({
          title: "Item added, price not saved",
          description: "Please set the price in the Unit Prices tab.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Item added", description: trimmed });
      }
      setNewItemName("");
      setNewItemPrice("");
    } catch (err) {
      // Revert optimistic
      setAllItems((prev) => prev.filter((i) => i.id !== tempId));
      toast({ title: "Error", description: err.readableMessage || "Failed to add item", variant: "destructive" });
    } finally {
      setAddingItem(false);
    }
  };

  // ── Delete item ───────────────────────────────────────────────────
  // BUG-162: optimistic
  const deleteItem = async () => {
    if (!deletingItemId) return;
    const itemId = deletingItemId;
    const prevItems = allItems;
    // Optimistic
    setAllItems((prev) => prev.filter((i) => i.id !== itemId));
    setDeletingItemId(null);
    setLoadingItemIds((prev) => new Set(prev).add(itemId));
    try {
      await expenseService.deleteExpenseItem(itemId);
      toast({ title: "Item removed" });
    } catch (err) {
      // Revert
      setAllItems(prevItems);
      toast({ title: "Error", description: err.readableMessage || "Delete failed", variant: "destructive" });
    } finally {
      setLoadingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // ── Drag-and-drop: reassign item to a different category ─────────
  // BUG-202-fwd-compat (backend delivered 2026-07-17): single PUT /expenses/{id} replaces the
  // former DELETE+POST workaround. Unit_price row FK survives — priced items keep their price.
  // Also handles the malformed 404-as-201 case: parse res.data.errors[0].code before treating as success.
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

    const prevItems = allItems;
    // Optimistic update so UI feels instant (BUG-162)
    setAllItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, categoryId: newCatId, categoryName: newCat.name } : i
    ));
    setLoadingItemIds((prev) => new Set(prev).add(itemId));

    try {
      const res = await expenseService.updateExpenseItem(itemId, {
        stock_title: item.title,
        category_id: newCatId,
      });
      // BUG-202 malformed-404: backend returns HTTP 201 with an errors body when item is not found.
      if (res?.data?.errors?.[0]?.code === 'not_found') {
        setAllItems(prevItems);
        toast({ title: "Item not found", description: "Refreshing…", variant: "destructive" });
        fetchAll();
        return;
      }
      toast({ title: "Item moved", description: `"${item.title}" → ${newCat.name}` });
    } catch (err) {
      setAllItems(prevItems);
      toast({ title: "Move failed", description: err.readableMessage || "Could not move item", variant: "destructive" });
    } finally {
      setLoadingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [allItems, categories, toast, fetchAll]);

  // ── Inline edit item (BUG-202-fwd-compat, ships enabled after backend delivery 2026-07-17) ──
  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemName(item.title || "");
    setEditItemCategoryId(String(item.categoryId ?? ""));
    // BUG-203: pre-fill unit price from item
    setEditItemPrice(item.unitPriceAmount ? String(item.unitPriceAmount) : "");
    setEditError("");
  };
  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditItemName("");
    setEditItemCategoryId("");
    setEditItemPrice("");  // BUG-203
    setEditError("");
    setEditSaving(false);
  };
  const saveEditItem = async () => {
    if (!editingItemId) return;
    const trimmedName = editItemName.trim();
    if (!trimmedName) {
      setEditError("Name cannot be empty");
      return;
    }
    const targetCatId = editItemCategoryId === "" ? null : parseInt(editItemCategoryId, 10);
    if (targetCatId == null || Number.isNaN(targetCatId)) {
      setEditError("Please select a category");
      return;
    }
    // Pre-flight duplicate-name check within target category (backend does NOT enforce this — verified 2026-07-17)
    const dup = allItems.some((i) =>
      i.id !== editingItemId
      && String(i.categoryId) === String(targetCatId)
      && i.title.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (dup) {
      const targetCat = categories.find((c) => String(c.id) === String(targetCatId));
      setEditError(`Item with this name already exists in ${targetCat?.name ?? "target category"}.`);
      return;
    }
    // BUG-203: validate price — required if item already has a unit price
    const originalItem = allItems.find(i => i.id === editingItemId);
    if (originalItem?.unitPrice && (!editItemPrice || parseFloat(editItemPrice) <= 0)) {
      setEditError("Unit price is required. To remove price, use the Unit Prices tab.");
      return;
    }
    const prevItems = allItems;
    const targetCat = categories.find((c) => String(c.id) === String(targetCatId));
    // Optimistic
    setAllItems((prev) => prev.map((i) => (i.id === editingItemId
      ? { ...i, title: trimmedName, categoryId: targetCatId, categoryName: targetCat?.name ?? i.categoryName }
      : i)));
    setEditSaving(true);
    setEditError("");
    setLoadingItemIds((prev) => new Set(prev).add(editingItemId));
    try {
      const res = await expenseService.updateExpenseItem(editingItemId, {
        stock_title: trimmedName,
        category_id: targetCatId,
      });
      // Malformed-404: backend returns HTTP 201 with errors body when id missing.
      if (res?.data?.errors?.[0]?.code === 'not_found') {
        setAllItems(prevItems);
        toast({ title: "Item not found", description: "Refreshing…", variant: "destructive" });
        cancelEditItem();
        fetchAll();
        return;
      }
      const updated = fromAPI.updatedItem(res);
      if (updated?.id) {
        setAllItems((prev) => prev.map((i) => (i.id === editingItemId
          ? { ...i, title: updated.title, categoryId: updated.categoryId, categoryName: updated.categoryName }
          : i)));
      }
      toast({ title: "Item updated", description: trimmedName });
      // BUG-203: 2-call workaround — update unit price if changed
      const newPrice = editItemPrice ? parseFloat(editItemPrice) : null;
      const origPrice = originalItem?.unitPriceAmount ?? null;
      const priceChanged = origPrice !== newPrice;
      if (priceChanged && newPrice != null && newPrice > 0) {
        try {
          const priceRow = pricedItems.find(p => String(p.stockId) === String(editingItemId));
          if (priceRow) {
            await expenseService.editUnitPrice(priceRow.id, newPrice);
          } else {
            await expenseService.addUnitPrice(editingItemId, 1, newPrice);
          }
          setAllItems(prev => prev.map(i => i.id === editingItemId
            ? { ...i, unitPrice: true, unitPriceAmount: newPrice }
            : i));
          const pricesRefresh = await expenseService.getUnitPrices();
          setPricedItems(fromAPI.unitPrices(pricesRefresh));
        } catch (priceErr) {
          toast({ title: "Warning", description: "Item saved but price update failed: " + (priceErr.readableMessage || ""), variant: "destructive" });
        }
      }
      cancelEditItem();
    } catch (err) {
      setAllItems(prevItems);
      setEditError(err.readableMessage || "Save failed");
      toast({ title: "Error", description: err.readableMessage || "Save failed", variant: "destructive" });
    } finally {
      setEditSaving(false);
      setLoadingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(editingItemId);
        return next;
      });
    }
  };

  // ── CR-074-B Phase 4: bulk-select helpers (Mockup 06) ─────────────
  const toggleItemSelection = (itemId) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };
  const isAllVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((it) => selectedItemIds.has(it.id));
  const toggleSelectAllVisible = () => {
    setSelectedItemIds((prev) => {
      if (isAllVisibleSelected) {
        // Deselect all visible items
        const next = new Set(prev);
        visibleItems.forEach((it) => next.delete(it.id));
        return next;
      }
      // Select all visible items (union)
      const next = new Set(prev);
      visibleItems.forEach((it) => next.add(it.id));
      return next;
    });
  };
  const clearSelection = () => {
    setSelectedItemIds(new Set());
    setBulkMoveDropdownOpen(false);
    setBulkMoveTargetCatId(null);
    setBulkMoveConfirmOpen(false);
    setBulkDeleteConfirmOpen(false);
  };

  // Concurrency-limited parallel runner for bulk API operations (limit=3 per plan)
  // ⚠️ BACKEND FLAG (CR-074-B Batch B, 2026-07-17):
  // Bulk operations issue one HTTP call per item because backend exposes only per-item endpoints.
  // On preprod (~500ms/call) this makes N=20 feel like ~4-5s. See:
  //   /app/memory/briefs/BACKEND_BRIEF_BULK_EXPENSE_OPS.md
  // Requested endpoints:  DELETE /expenses/bulk  and  PUT /expenses/bulk  with { ids, category_id }.
  // FE swap when delivered: replace this runner with a single bulk service call (~40 lines below).
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

  // Bulk DELETE — confirmed via modal
  const bulkDeleteConfirmed = async () => {
    const ids = Array.from(selectedItemIds);
    if (ids.length === 0) return;
    const prevItems = allItems;
    setBulkOperationInProgress(true);
    // Optimistic: remove all selected items
    setAllItems((prev) => prev.filter((i) => !selectedItemIds.has(i.id)));
    setLoadingItemIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    const results = await runWithConcurrency(ids, 3, (id) => expenseService.deleteExpenseItem(id));
    const failed = results.filter((r) => !r.ok);
    const succeededCount = results.length - failed.length;
    // Revert failed rows back into local state
    if (failed.length > 0) {
      const failedSet = new Set(failed.map((f) => f.id));
      const rowsToRestore = prevItems.filter((i) => failedSet.has(i.id));
      setAllItems((prev) => [...prev, ...rowsToRestore]);
    }
    setLoadingItemIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setBulkOperationInProgress(false);
    setBulkDeleteConfirmOpen(false);
    clearSelection();
    if (failed.length === 0) {
      toast({ title: "Items deleted", description: `${succeededCount} item${succeededCount === 1 ? '' : 's'} removed.` });
    } else {
      toast({
        title: `${succeededCount} deleted, ${failed.length} failed`,
        description: failed.length === ids.length ? "None could be removed. Please retry." : "Some items could not be removed.",
        variant: "destructive",
      });
    }
  };

  // Bulk MOVE-TO-CATEGORY — confirmed via modal
  const bulkMoveConfirmed = async () => {
    const targetCatId = bulkMoveTargetCatId;
    if (targetCatId == null) return;
    const targetCat = categories.find((c) => String(c.id) === String(targetCatId));
    if (!targetCat) return;
    const ids = Array.from(selectedItemIds);
    if (ids.length === 0) return;
    // Pre-flight dup guard per target category — skip items whose title already exists in target category
    // (matches Phase 3 pattern; backend does NOT enforce dup)
    const catNameKey = (targetCat.name || "").trim().toLowerCase();
    const dupIds = new Set();
    ids.forEach((id) => {
      const src = allItems.find((i) => i.id === id);
      if (!src) return;
      const title = (src.title || "").trim().toLowerCase();
      if (String(src.categoryId) === String(targetCatId)) return; // already in target — noop, will succeed
      const collision = allItems.some(
        (i) =>
          i.id !== id &&
          i.title.trim().toLowerCase() === title &&
          (
            String(i.categoryId) === String(targetCatId) ||
            (i.categoryId == null && (i.categoryName || "").trim().toLowerCase() === catNameKey)
          )
      );
      if (collision) dupIds.add(id);
    });
    const movableIds = ids.filter((id) => !dupIds.has(id));
    setBulkOperationInProgress(true);
    const prevItems = allItems;
    // Optimistic: re-bucket movable rows locally
    setAllItems((prev) => prev.map((i) =>
      movableIds.includes(i.id)
        ? { ...i, categoryId: targetCatId, categoryName: targetCat.name }
        : i
    ));
    setLoadingItemIds((prev) => {
      const next = new Set(prev);
      movableIds.forEach((id) => next.add(id));
      return next;
    });
    const results = await runWithConcurrency(movableIds, 3, (id) => {
      const src = prevItems.find((i) => i.id === id);
      return expenseService.updateExpenseItem(id, {
        stock_title: src?.title || "",
        category_id: targetCatId,
      }).then((res) => {
        // Malformed-404 (HTTP 201 with errors body)
        if (res?.data?.errors?.[0]?.code === 'not_found') {
          throw new Error('not_found');
        }
        return res;
      });
    });
    const failed = results.filter((r) => !r.ok);
    const succeededCount = results.length - failed.length;
    if (failed.length > 0) {
      const failedSet = new Set(failed.map((f) => f.id));
      // Revert failed rows to their previous state
      const failedRestore = prevItems.filter((i) => failedSet.has(i.id));
      setAllItems((prev) => prev.map((i) => {
        const restore = failedRestore.find((f) => f.id === i.id);
        return restore || i;
      }));
    }
    setLoadingItemIds((prev) => {
      const next = new Set(prev);
      movableIds.forEach((id) => next.delete(id));
      return next;
    });
    setBulkOperationInProgress(false);
    setBulkMoveConfirmOpen(false);
    setBulkMoveDropdownOpen(false);
    setBulkMoveTargetCatId(null);
    clearSelection();
    // Compose toast
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
  };

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
                      isLoading={loadingCategoryIds.has(cat.id)}
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
              {/* CR-064: optional unit-price on quick-add row (two-call sequence — Curl-verified 2026-07-17) */}
              <div className="relative" title="Sets a per-unit price (quantity = 1). Manage more in the Unit Prices tab.">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: COLORS.grayText }}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                  placeholder="Unit price"
                  aria-label="Unit price per unit (quantity = 1)"
                  title="Sets a per-unit price (quantity = 1). Manage more in the Unit Prices tab."
                  className="pl-5 pr-2 py-1.5 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-orange-200"
                  style={{ borderColor: COLORS.borderGray, width: 120 }}
                  data-testid="new-item-price-input"
                />
              </div>
              <button onClick={addItem} disabled={addingItem || !newItemName.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: COLORS.primaryGreen }}
                data-testid="new-item-save">
                {addingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add
              </button>
            </div>
          )}

          {/* CR-074-B Phase 4: Selection banner (Mockup 06) */}
          {selectedItemIds.size > 0 && (
            <div
              className="border-b border-l-4 p-3 flex justify-between items-center"
              style={{
                background: 'rgba(239, 68, 68, 0.10)',
                borderColor: COLORS.borderGray,
                borderLeftColor: COLORS.errorText,
              }}
              data-testid="bulk-selection-banner"
            >
              <span className="font-bold text-sm" style={{ color: COLORS.errorText }} data-testid="bulk-selection-count">
                {selectedItemIds.size} item{selectedItemIds.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  disabled={bulkOperationInProgress}
                  className="text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-colors disabled:opacity-50"
                  style={{ background: COLORS.errorText }}
                  data-testid="bulk-delete-selected-btn"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected
                </button>
                <div className="relative">
                  <button
                    onClick={() => setBulkMoveDropdownOpen((v) => !v)}
                    disabled={bulkOperationInProgress}
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
                        categories.map((c) => (
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
                  disabled={bulkOperationInProgress}
                  className="text-sm font-medium hover:opacity-80 transition-colors px-2 disabled:opacity-50"
                  style={{ color: COLORS.grayText }}
                  data-testid="bulk-clear-selection-btn"
                >
                  Clear
                </button>
              </div>
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
                    {/* CR-074-B Phase 4: bulk-select checkbox column */}
                    <th className="px-2 py-2.5 text-center" style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer align-middle"
                        style={{ accentColor: COLORS.primaryOrange }}
                        checked={isAllVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible items"
                        data-testid="bulk-select-all"
                      />
                    </th>
                    <th style={{padding:0, width:0}} />
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 110 }}>Unit Price</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Category</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Actions</th>
                  </tr>
                </thead>
                <Droppable droppableId="items-source">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {visibleItems.map((item, i) => {
                        const isEditing = String(editingItemId) === String(item.id);
                        const isRowLoading = loadingItemIds.has(item.id);
                        const isSelected = selectedItemIds.has(item.id);
                        const selectionActive = selectedItemIds.size > 0;
                        return (
                        <Draggable key={item.id} draggableId={String(item.id)} index={i} isDragDisabled={isEditing || isRowLoading || selectionActive}>
                          {(dragProvided, dragSnapshot) => (
                            <tr
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className="group border-b last:border-0 hover:bg-gray-50 transition-colors"
                              style={{
                                borderColor: COLORS.borderGray,
                                background: dragSnapshot.isDragging
                                  ? '#FFF7ED'
                                  : isSelected
                                    ? 'rgba(59, 130, 246, 0.05)'
                                    : isEditing
                                      ? `${COLORS.primaryOrange}0D`
                                      : (i % 2 === 0 ? "#fff" : COLORS.sectionBg),
                                borderLeft: isSelected ? `2px solid #3B82F6` : undefined,
                                ...dragProvided.draggableProps.style,
                              }}
                              data-testid={`item-row-${item.id}`}
                            >
                              {/* CR-074-B Phase 4: bulk-select checkbox */}
                              <td className="px-2 py-2 text-center align-middle" style={{ width: 40 }}>
                                {!isEditing && !String(item.id).startsWith('_tmp_') && (
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 cursor-pointer align-middle"
                                    style={{ accentColor: COLORS.primaryOrange }}
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(item.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Select ${item.title}`}
                                    data-testid={`bulk-select-row-${item.id}`}
                                  />
                                )}
                              </td>
                              {/* CR-074-B: visible-on-hover drag grip (Menu Mgmt parity) */}
                              <td style={{ padding: '0 4px', width: 22 }}>
                                <span
                                  {...dragProvided.dragHandleProps}
                                  className={`inline-flex items-center justify-center transition-opacity ${isEditing ? 'invisible' : 'opacity-0 group-hover:opacity-100'}`}
                                  style={{ cursor: isEditing ? 'default' : 'grab' }}
                                  data-testid={`item-drag-handle-${item.id}`}
                                >
                                  <GripVertical className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                                </span>
                              </td>
                              {isEditing ? (
                                <>
                                  {/* BUG-202-fwd-compat: inline edit — name */}
                                  <td className="px-4 py-2" colSpan={1}>
                                    <input
                                      autoFocus
                                      value={editItemName}
                                      onChange={(e) => setEditItemName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveEditItem();
                                        if (e.key === "Escape") cancelEditItem();
                                      }}
                                      className="w-full px-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                      style={{ borderColor: COLORS.borderGray }}
                                      data-testid={`item-edit-name-input-${item.id}`}
                                    />
                                    {editError && (
                                      <div className="mt-1 text-xs" style={{ color: COLORS.errorText }} data-testid={`item-edit-error-${item.id}`}>
                                        {editError}
                                      </div>
                                    )}
                                  </td>
                                  {/* BUG-203: inline edit — unit price input */}
                                  <td className="px-2 py-2" style={{ width: 110 }}>
                                    {(item.unitPrice || editItemPrice) ? (
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium"
                                          style={{ color: COLORS.grayText }}>₹</span>
                                        <input
                                          type="number" min="0" step="0.01"
                                          value={editItemPrice}
                                          onChange={e => setEditItemPrice(e.target.value)}
                                          onKeyDown={e => { if (e.key === "Enter") saveEditItem(); if (e.key === "Escape") cancelEditItem(); }}
                                          placeholder="Price"
                                          className="w-full pl-5 pr-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                          style={{ borderColor: COLORS.borderGray }}
                                          data-testid={`item-edit-price-input-${item.id}`}
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-xs" style={{ color: COLORS.grayText }}>No price</span>
                                    )}
                                  </td>
                                  {/* BUG-202-fwd-compat: inline edit — category dropdown */}
                                  <td className="px-4 py-2">
                                    <select
                                      value={editItemCategoryId}
                                      onChange={(e) => setEditItemCategoryId(e.target.value)}
                                      className="w-full px-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-white"
                                      style={{ borderColor: COLORS.borderGray }}
                                      data-testid={`item-edit-category-select-${item.id}`}
                                    >
                                      <option value="" disabled>Select category</option>
                                      {categories.map((c) => (
                                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={saveEditItem}
                                        disabled={editSaving || !editItemName.trim() || !editItemCategoryId}
                                        className="p-1.5 rounded hover:bg-green-50 disabled:opacity-40"
                                        data-testid={`item-edit-save-${item.id}`}
                                      >
                                        {editSaving
                                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: COLORS.primaryGreen }} />
                                          : <Check className="w-3.5 h-3.5" style={{ color: COLORS.primaryGreen }} />}
                                      </button>
                                      <button
                                        onClick={cancelEditItem}
                                        className="p-1.5 rounded hover:bg-gray-100"
                                        data-testid={`item-edit-cancel-${item.id}`}
                                      >
                                        <X className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>
                                    {item.title}
                                  </td>
                                  <td className="px-2 py-2.5" style={{ width: 110 }}>
                                    {item.unitPriceAmount != null && item.unitPriceAmount > 0 ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                        style={{ background: `${COLORS.primaryGreen}18`, color: COLORS.primaryGreen }}
                                        data-testid={`item-price-chip-${item.id}`}>
                                        ₹{Number(item.unitPriceAmount).toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-xs" style={{ color: COLORS.grayText }}>—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded-full text-xs"
                                      style={{ background: "#F0FFF0", color: COLORS.primaryGreen }}>
                                      {item.categoryName || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center justify-center gap-0.5">
                                      {isRowLoading && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1"
                                          style={{ color: COLORS.primaryOrange }}
                                          data-testid={`item-row-loading-${item.id}`} />
                                      )}
                                      {/* BUG-202-fwd-compat: inline edit trigger */}
                                      <button onClick={() => startEditItem(item)}
                                        className="p-1.5 rounded hover:bg-orange-50"
                                        data-testid={`item-edit-btn-${item.id}`}>
                                        <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
                                      </button>
                                      <button onClick={() => setDeletingItemId(item.id)}
                                        className="p-1.5 rounded hover:bg-red-50"
                                        data-testid={`item-delete-btn-${item.id}`}>
                                        <Trash2 className="w-3.5 h-3.5" style={{ color: COLORS.errorText }} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          )}
                        </Draggable>
                        );
                      })}
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

      {/* ── CR-074-B Phase 4: Bulk Delete Confirm ─────────────────── */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 border" style={{ borderColor: COLORS.borderGray }}
            data-testid="bulk-delete-confirm">
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>
              Delete {selectedItemIds.size} Item{selectedItemIds.size === 1 ? '' : 's'}?
            </h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
              This will permanently remove the selected item{selectedItemIds.size === 1 ? '' : 's'} and any linked expense transactions. This cannot be undone.
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
                Delete {selectedItemIds.size} Item{selectedItemIds.size === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CR-074-B Phase 4: Bulk Move-to-Category Confirm ───────── */}
      {bulkMoveConfirmOpen && bulkMoveTargetCatId != null && (() => {
        const targetCat = categories.find((c) => String(c.id) === String(bulkMoveTargetCatId));
        const targetName = targetCat?.name ?? "target category";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-96 border" style={{ borderColor: COLORS.borderGray }}
              data-testid="bulk-move-confirm">
              <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>
                Move {selectedItemIds.size} Item{selectedItemIds.size === 1 ? '' : 's'} to {targetName}?
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
                  Move {selectedItemIds.size} Item{selectedItemIds.size === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
