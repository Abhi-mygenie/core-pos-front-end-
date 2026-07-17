import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { COLORS } from "../../../constants";
import { useRestaurant } from "../../../contexts";
import { useToast } from "../../../hooks/use-toast";
import ProductCard from "./ProductCard";
import ProductForm from "./ProductForm";
import * as menuService from "../../../api/services/menuManagementService";
import { toAPI } from "../../../api/transforms/menuManagementTransform";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const FOOD_FILTERS = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg", color: COLORS.primaryGreen },
  { id: "nonveg", label: "Non-Veg", color: "#EF4444" },
  { id: "egg", label: "Egg", color: "#F59E0B" },
  { id: "jain", label: "Jain", color: "#8B5CF6" },
];

const ProductList = ({ foods, categories, addons, selectedCategoryId, deleteReasons, menuType, onRefresh, onRefreshAddons }) => {
  const { currencySymbol } = useRestaurant();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [foodFilter, setFoodFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [quickEditId, setQuickEditId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [localProducts, setLocalProducts] = useState(null);

  const products = localProducts || foods || [];

  const filteredProducts = useMemo(() => {
    let items = products;
    if (selectedCategoryId) {
      items = items.filter((p) => p.categoryId === selectedCategoryId);
    }
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((p) => p.productName.toLowerCase().includes(s));
    }
    if (statusFilter !== "all") {
      items = items.filter((p) => {
        if (statusFilter === "active") return p.isActive;
        if (statusFilter === "inactive") return !p.isActive;
        return true;
      });
    }
    if (foodFilter !== "all") {
      items = items.filter((p) => {
        if (foodFilter === "veg") return p.itemType === 1;
        if (foodFilter === "nonveg") return p.itemType === 0;
        if (foodFilter === "egg") return p.itemType === 2;
        if (foodFilter === "jain") return p.itemType === 3;
        return true;
      });
    }
    return items;
  }, [products, selectedCategoryId, search, statusFilter, foodFilter]);

  // Drag-and-drop reorder — calls API #11
  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination) return;
    const items = Array.from(filteredProducts);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    // Update local state optimistically
    const allItems = Array.from(products);
    const sourceIdx = allItems.findIndex((p) => p.productId === moved.productId);
    allItems.splice(sourceIdx, 1);
    const destItem = items[result.destination.index + 1];
    const destIdx = destItem ? allItems.findIndex((p) => p.productId === destItem.productId) : allItems.length;
    allItems.splice(destIdx, 0, moved);
    setLocalProducts(allItems);
    try {
      const payload = toAPI.reorderPayload('food', items);
      await menuService.quickReorder(payload.type, payload.items);
      toast({ title: "Reordered", description: "Product order saved." });
    } catch (err) {
      console.error('[ProductList] Reorder failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
      setLocalProducts(null);
    }
  }, [filteredProducts, products, toast]);

  // Delete — calls API #4
  const handleDelete = useCallback(async (product, reason) => {
    try {
      await menuService.deleteFood(product.productId, reason);
      toast({ title: "Deleted", description: `"${product.productName}" removed.` });
      onRefresh();
    } catch (err) {
      console.error('[ProductList] Delete failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
    }
  }, [toast, onRefresh]);

  // Status toggle — calls API #6
  const handleStatusToggle = useCallback(async (product) => {
    const newStatus = product.isActive ? 0 : 1;
    try {
      await menuService.toggleFoodStatus(product.productId, newStatus);
      toast({ title: newStatus ? "Activated" : "Deactivated", description: `"${product.productName}" is now ${newStatus ? 'active' : 'inactive'}.` });
      onRefresh();
    } catch (err) {
      console.error('[ProductList] Status toggle failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
    }
  }, [toast, onRefresh]);

  // Quick edit save — calls API #2
  const handleQuickSave = useCallback(async (product, formData) => {
    try {
      const foodInfo = toAPI.foodInfo({ ...formData, foodFor: menuType });
      await menuService.editFood(product.productId, foodInfo);
      toast({ title: "Saved", description: "Quick edit saved." });
      setQuickEditId(null);
      onRefresh();
    } catch (err) {
      console.error('[ProductList] Quick save failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
    }
  }, [toast, onRefresh, menuType]);

  const getCategoryName = (categoryId) => {
    const cat = categories?.find((c) => c.categoryId === categoryId);
    return cat?.categoryName || "Uncategorized";
  };

  // Full edit / add form
  if (editingProduct) {
    return (
      <ProductForm
        product={editingProduct === "new" ? null : editingProduct}
        categories={categories}
        addons={addons}
        currencySymbol={currencySymbol}
        menuType={menuType}
        onBack={() => setEditingProduct(null)}
        onSave={() => {
          setEditingProduct(null);
          setTimeout(() => onRefresh(), 500);
        }}
        onRefreshAddons={onRefreshAddons}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="product-list">
      {/* Header: Search + Filters + Add */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="product-search"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors"
          style={{
            borderColor: showFilters ? COLORS.primaryOrange : COLORS.borderGray,
            color: showFilters ? COLORS.primaryOrange : COLORS.grayText,
          }}
          data-testid="toggle-filters"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        <button
          onClick={() => setEditingProduct("new")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="add-product-btn"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="mb-3 space-y-2" data-testid="filter-chips">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className="px-3 py-1 text-xs font-medium rounded-full border transition-colors"
                style={{
                  backgroundColor: statusFilter === f.id ? COLORS.primaryOrange : "transparent",
                  borderColor: statusFilter === f.id ? COLORS.primaryOrange : COLORS.borderGray,
                  color: statusFilter === f.id ? "#fff" : COLORS.grayText,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FOOD_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFoodFilter(f.id)}
                className="px-3 py-1 text-xs font-medium rounded-full border transition-colors"
                style={{
                  backgroundColor: foodFilter === f.id ? (f.color || COLORS.primaryOrange) : "transparent",
                  borderColor: foodFilter === f.id ? (f.color || COLORS.primaryOrange) : COLORS.borderGray,
                  color: foodFilter === f.id ? "#fff" : COLORS.grayText,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product count */}
      <div className="text-xs mb-2" style={{ color: COLORS.grayText }}>
        Showing {filteredProducts.length} of {products.length} products
      </div>

      {/* Product List with DnD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="products">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto space-y-1.5">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: COLORS.grayText }}>
                  No products found.
                </div>
              ) : (
                filteredProducts.map((product, index) => (
                  <Draggable key={product.productId} draggableId={String(product.productId)} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <ProductCard
                          product={product}
                          categoryName={getCategoryName(product.categoryId)}
                          currencySymbol={currencySymbol}
                          categories={categories}
                          deleteReasons={deleteReasons}
                          isDragging={snapshot.isDragging}
                          dragHandleProps={provided.dragHandleProps}
                          isQuickEditing={quickEditId === product.productId}
                          onQuickEdit={() => setQuickEditId(quickEditId === product.productId ? null : product.productId)}
                          onFullEdit={() => setEditingProduct(product)}
                          onDelete={(reason) => handleDelete(product, reason)}
                          onStatusToggle={() => handleStatusToggle(product)}
                          onQuickSave={(formData) => handleQuickSave(product, formData)}
                          onQuickCancel={() => setQuickEditId(null)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default ProductList;
