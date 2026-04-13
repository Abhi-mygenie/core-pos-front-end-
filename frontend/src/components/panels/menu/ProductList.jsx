import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { COLORS } from "../../../constants";
import { useMenu, useRestaurant } from "../../../contexts";
import { useToast } from "../../../hooks/use-toast";
import ProductCard from "./ProductCard";
import ProductForm from "./ProductForm";

// Filter options
const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "outOfStock", label: "Out of Stock" },
  { id: "disabled", label: "Disabled" },
];

const FOOD_FILTERS = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg", color: COLORS.primaryGreen },
  { id: "nonveg", label: "Non-Veg", color: "#EF4444" },
  { id: "egg", label: "Egg", color: "#F59E0B" },
  { id: "jain", label: "Jain", color: "#8B5CF6" },
];

const ProductList = ({ selectedCategoryId }) => {
  const { products, categories } = useMenu();
  const { currencySymbol } = useRestaurant();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [foodFilter, setFoodFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [quickEditId, setQuickEditId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null); // null = list, product = full edit, 'new' = add
  const [localProducts, setLocalProducts] = useState(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    let items = localProducts || products || [];

    // Category filter
    if (selectedCategoryId) {
      items = items.filter((p) => p.categoryId === selectedCategoryId || p.categoryIds?.some((c) => String(c.id) === String(selectedCategoryId)));
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((p) => p.productName.toLowerCase().includes(s));
    }

    // Status filter
    if (statusFilter !== "all") {
      items = items.filter((p) => {
        if (statusFilter === "active") return p.isActive && !p.isOutOfStock && !p.isDisabled;
        if (statusFilter === "inactive") return !p.isActive;
        if (statusFilter === "outOfStock") return p.isOutOfStock;
        if (statusFilter === "disabled") return p.isDisabled;
        return true;
      });
    }

    // Food type filter
    if (foodFilter !== "all") {
      items = items.filter((p) => {
        if (foodFilter === "veg") return p.isVeg && !p.hasEgg;
        if (foodFilter === "nonveg") return !p.isVeg && !p.hasEgg;
        if (foodFilter === "egg") return p.hasEgg;
        if (foodFilter === "jain") return p.isJain;
        return true;
      });
    }

    return items;
  }, [products, localProducts, selectedCategoryId, search, statusFilter, foodFilter]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(filteredProducts);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    // Update local state (mocked)
    const allItems = Array.from(localProducts || products || []);
    const sourceIdx = allItems.findIndex((p) => p.productId === moved.productId);
    allItems.splice(sourceIdx, 1);
    const destItem = items[result.destination.index + 1];
    const destIdx = destItem ? allItems.findIndex((p) => p.productId === destItem.productId) : allItems.length;
    allItems.splice(destIdx, 0, moved);
    setLocalProducts(allItems);
    toast({ title: "Reordered", description: "Product order updated." });
  };

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
        currencySymbol={currencySymbol}
        onBack={() => setEditingProduct(null)}
        onSave={() => {
          toast({ title: "Saved", description: editingProduct === "new" ? "Product added." : "Product updated." });
          setEditingProduct(null);
        }}
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
        Showing {filteredProducts.length} of {(products || []).length} products
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
                          isDragging={snapshot.isDragging}
                          dragHandleProps={provided.dragHandleProps}
                          isQuickEditing={quickEditId === product.productId}
                          onQuickEdit={() => setQuickEditId(quickEditId === product.productId ? null : product.productId)}
                          onFullEdit={() => setEditingProduct(product)}
                          onDelete={() => toast({ title: "Deleted", description: `"${product.productName}" removed.` })}
                          onQuickSave={() => { toast({ title: "Saved", description: "Quick edit saved." }); setQuickEditId(null); }}
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
