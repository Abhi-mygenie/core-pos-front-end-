import { useState, useEffect, useCallback } from "react";
import { COLORS } from "../../constants";
import { useCartManager, useMenuFilter, useOrderModals } from "../../hooks";
import { useTableOrders } from "../../context/TableOrderContext";
import { useInitialData } from "../../context/InitialDataContext";
import { toast } from "sonner";
import CategoryPanel from "./CategoryPanel";
import CartPanel from "./CartPanel";
import CollectPaymentPanel from "./CollectPaymentPanel";
import MenuFiltersBar from "./MenuFiltersBar";
import MenuItemsGrid from "./MenuItemsGrid";
import CartHeader from "./CartHeader";
import OrderModals from "./OrderModals";
import AddQuantityModal from "./AddQuantityModal";

/**
 * OrderEntry - 3-Panel Layout for order management
 * Decomposed into smaller components and custom hooks
 */
const OrderEntry = ({ 
  table, 
  onClose, 
  orderType = "delivery", 
  onOrderTypeChange, 
  allTables = [], 
  onSelectTable,
  onResetForNewOrder,
}) => {
  // Context for cross-table operations
  const {
    getTableOrder,
    syncTableItems,
    cancelItems,
    transferItems,
    shiftTable,
    mergeTables,
    updateTableStatus,
  } = useTableOrders();

  // Get order data from context
  const orderData = table ? getTableOrder(table.id) : null;
  
  // Preloaded data from context
  const { 
    categories: preloadedCategories, 
    products: preloadedProducts,
    isDataLoaded 
  } = useInitialData();

  // Cart management
  const {
    cartItems,
    setCartItems,
    cartCountMap,
    total,
    flashItemId,
    editingQtyItemId,
    setEditingQtyItemId,
    initializeCart,
    addToCart,
    addCustomizedItemToCart,
    updateQuantity,
    updateCartItem,
    removeItem,
    reduceItemQty,
    placeOrder,
    updateItemNotes,
  } = useCartManager(orderData);

  // Menu data
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuItems, setMenuItems] = useState({});
  const [isLoadingMenu, setIsLoadingMenu] = useState(!isDataLoaded);

  // Transform products to menu items format
  const transformProductsToMenuItems = useCallback((products) => {
    const itemsByCategory = {};
    
    products.forEach(product => {
      const menuItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        type: product.veg === 1 ? 'veg' : (product.egg === 1 ? 'egg' : 'nonveg'),
        category: product.category_id,
        categoryName: product.category_name,
        image: product.image,
        description: product.description || '',
        glutenFree: product.gluten_free === 1,
        jain: product.jain === 1,
        vegan: product.vegan === 1,
        hasCustomization: product.variations && product.variations.length > 0,
        variations: product.variations || [],
        tax: product.tax,
        taxType: product.tax_type,
        station: product.station_name,
      };
      
      const catId = product.category_id || 'uncategorized';
      if (!itemsByCategory[catId]) {
        itemsByCategory[catId] = [];
      }
      itemsByCategory[catId].push(menuItem);
    });
    
    return itemsByCategory;
  }, []);

  // Initialize from preloaded data ONLY (no API calls)
  useEffect(() => {
    if (isDataLoaded) {
      setMenuCategories(preloadedCategories);
      const transformed = transformProductsToMenuItems(preloadedProducts);
      setMenuItems(transformed);
      setIsLoadingMenu(false);
    }
  }, [isDataLoaded, preloadedCategories, preloadedProducts, transformProductsToMenuItems]);

  // Menu filtering - pass menuItems from API
  const {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    primaryFilter,
    togglePrimaryFilter,
    secondaryFilters,
    toggleSecondaryFilter,
    filteredItems,
  } = useMenuFilter(menuItems);

  // Modal management
  const {
    customizationItem,
    setCustomizationItem,
    openCustomization,
    showNotesModal,
    setShowNotesModal,
    itemNotesModal,
    setItemNotesModal,
    openItemNotes,
    showOrderPlaced,
    setShowOrderPlaced,
    transferItem,
    setTransferItem,
    showMergeModal,
    setShowMergeModal,
    showShiftModal,
    setShowShiftModal,
    cancelItem,
    setCancelItem,
    showPaymentPanel,
    setShowPaymentPanel,
    showTypeDropdown,
    setShowTypeDropdown,
    showCustomerModal,
    setShowCustomerModal,
  } = useOrderModals();

  // Additional state
  const [printAllKOT, setPrintAllKOT] = useState(true);
  const [orderNotes, setOrderNotes] = useState([]);
  const [customer, setCustomer] = useState(null);
  
  // Edit customization state
  const [editingCartIndex, setEditingCartIndex] = useState(null);
  
  // Quantity increase prompt state
  const [quantityPromptItem, setQuantityPromptItem] = useState(null);
  const [quantityPromptCartIndex, setQuantityPromptCartIndex] = useState(null);

  // Initialize cart with existing order items
  useEffect(() => {
    initializeCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);

  // Event handlers
  const handlePlaceOrder = () => {
    if (placeOrder()) {
      // Sync placed items to context and mark table as occupied
      if (table?.id) {
        syncTableItems(table.id, cartItems.map(item => ({ ...item, placed: true })));
        updateTableStatus(table.id, "occupied");
      }
      setShowOrderPlaced(true);
      toast.success("Order placed successfully!");
    }
  };

  // After "Order Placed" is dismissed, reset for new order
  const handleOrderPlacedClose = () => {
    setShowOrderPlaced(false);
    // Clear cart — placed items already saved in context
    setCartItems([]);
    // Reset to Walk-In with no table selected
    onResetForNewOrder?.();
  };

  // --- CANCEL ITEM (partial qty support) ---
  const handleCancelFood = ({ item, cancelQty, reason, notes }) => {
    const qty = cancelQty || item.qty || 1;
    if (qty >= item.qty) {
      // Cancel all - remove item
      removeItem(item.id);
    } else {
      // Partial cancel - reduce qty
      reduceItemQty(item.id, qty);
    }
    // Also update context
    if (table?.id) {
      cancelItems(table.id, item.id, qty);
    }
    setCancelItem(null);
    toast.success(`Cancelled ${qty}x ${item.name}`, {
      description: reason?.label ? `Reason: ${reason.label}` : undefined,
    });
  };

  // --- TRANSFER FOOD (partial qty support) ---
  const handleTransfer = ({ item, toTable, transferQty, switchNotes }) => {
    const qty = transferQty || item.qty || 1;
    if (qty >= item.qty) {
      removeItem(item.id);
    } else {
      reduceItemQty(item.id, qty);
    }
    // Add to destination table via context
    if (table?.id) {
      transferItems(table.id, toTable.id, item, qty);
    }
    setTransferItem(null);
    toast.success(`Transferred ${qty}x ${item.name} to ${toTable.id}`);
  };

  // --- SHIFT TABLE (move everything) ---
  const handleShift = ({ fromTable, toTable }) => {
    if (table?.id) {
      shiftTable(table.id, toTable.id);
    }
    setShowShiftModal(false);
    toast.success(`Shifted ${table?.id} → ${toTable.id}`, {
      description: "All items moved to new table",
    });
    // Close order entry - user will see updated dashboard
    onClose();
  };

  // --- MERGE TABLES ---
  const handleMerge = ({ primaryTable, mergeTables: selectedTables, combinedBill }) => {
    if (table?.id) {
      const sourceIds = selectedTables.map((t) => t.id);
      mergeTables(table.id, sourceIds);
    }
    setShowMergeModal(false);
    const tableNames = selectedTables.map((t) => t.id).join(", ");
    toast.success(`Merged ${tableNames} into ${table?.id}`, {
      description: `Combined bill: ₹${combinedBill?.toLocaleString() || ""}`,
    });
    // Re-initialize cart to show merged items
    setTimeout(() => initializeCart(), 100);
  };

  const handleSaveItemNotes = (notes) => {
    if (itemNotesModal) {
      updateItemNotes(itemNotesModal.cartIndex, notes);
      setItemNotesModal(null);
    }
  };

  // Handle customize from cart (edit mode)
  const handleCartCustomize = (item, cartIndex) => {
    setEditingCartIndex(cartIndex);
    // Open customization with existing item data
    setCustomizationItem(item);
  };

  // Handle customization save (either add new or update existing)
  const handleCustomizationSave = (customizedItem) => {
    if (editingCartIndex !== null) {
      // Edit mode - update existing cart item
      updateCartItem(editingCartIndex, customizedItem);
      setEditingCartIndex(null);
    } else {
      // Add mode - add new item
      addCustomizedItemToCart(customizedItem);
    }
    setCustomizationItem(null);
  };

  // Handle quantity increase for customized items
  const handleQuantityIncrease = (item, cartIndex) => {
    setQuantityPromptItem(item);
    setQuantityPromptCartIndex(cartIndex);
  };

  // Handle same customization choice
  const handleSameCustomization = () => {
    if (quantityPromptItem && quantityPromptCartIndex !== null) {
      updateQuantity(quantityPromptItem.id, quantityPromptItem.qty + 1, quantityPromptCartIndex);
    }
    setQuantityPromptItem(null);
    setQuantityPromptCartIndex(null);
  };

  // Handle new customization choice
  const handleNewCustomization = () => {
    if (quantityPromptItem) {
      // Open customization modal for new item (not edit mode)
      setEditingCartIndex(null);
      setCustomizationItem(quantityPromptItem);
    }
    setQuantityPromptItem(null);
    setQuantityPromptCartIndex(null);
  };

  return (
    <div
      data-testid="order-entry-screen"
      className="fixed inset-0 z-50 flex"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="flex w-full h-full bg-white">
        {/* LEFT PANEL - Categories */}
        <CategoryPanel
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onShiftTable={() => setShowShiftModal(true)}
          onMergeTable={() => setShowMergeModal(true)}
          onClose={onClose}
          categories={menuCategories}
        />

        {/* MIDDLE PANEL - Menu Items */}
        <div 
          className="flex-1 flex flex-col overflow-hidden" 
          style={{ borderRight: `1px solid ${COLORS.borderGray}` }}
        >
          <MenuFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            primaryFilter={primaryFilter}
            onTogglePrimaryFilter={togglePrimaryFilter}
            secondaryFilters={secondaryFilters}
            onToggleSecondaryFilter={toggleSecondaryFilter}
          />

          {isLoadingMenu ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center" style={{ color: COLORS.grayText }}>
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full mx-auto mb-3"></div>
                <p>Loading menu...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center" style={{ color: COLORS.grayText }}>
                <p className="text-lg font-medium mb-2">No items found</p>
                <p className="text-sm">Try selecting a different category or adjusting filters</p>
              </div>
            </div>
          ) : (
            <MenuItemsGrid
              items={filteredItems}
              cartCountMap={cartCountMap}
              flashItemId={flashItemId}
              onAddToCart={addToCart}
              onCustomize={openCustomization}
            />
          )}
        </div>

        {/* RIGHT PANEL - Cart */}
        <div 
          className="w-96 flex-shrink-0 flex flex-col" 
          style={{ backgroundColor: COLORS.lightBg }}
        >
          {showPaymentPanel ? (
            <CollectPaymentPanel
              cartItems={cartItems}
              total={total}
              onBack={() => setShowPaymentPanel(false)}
              onPaymentComplete={() => { setShowPaymentPanel(false); onClose(); }}
            />
          ) : (
            <>
              <CartHeader
                table={table}
                orderType={orderType}
                allTables={allTables}
                showTypeDropdown={showTypeDropdown}
                setShowTypeDropdown={setShowTypeDropdown}
                onOrderTypeChange={onOrderTypeChange}
                onSelectTable={onSelectTable}
                customer={customer}
                orderNotes={orderNotes}
                printAllKOT={printAllKOT}
                onClose={onClose}
                onCustomerClick={() => setShowCustomerModal(true)}
                onNotesClick={() => setShowNotesModal(true)}
                onKOTToggle={() => setPrintAllKOT(!printAllKOT)}
              />

              <CartPanel
                cartItems={cartItems}
                total={total}
                editingQtyItemId={editingQtyItemId}
                setEditingQtyItemId={setEditingQtyItemId}
                updateQuantity={updateQuantity}
                setCancelItem={setCancelItem}
                setTransferItem={setTransferItem}
                handlePlaceOrder={handlePlaceOrder}
                setShowPaymentPanel={setShowPaymentPanel}
                onAddNote={openItemNotes}
                onCustomize={handleCartCustomize}
                onQuantityIncrease={handleQuantityIncrease}
                customer={customer}
                onCustomerChange={setCustomer}
              />
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <OrderModals
        table={table}
        customer={customer}
        orderNotes={orderNotes}
        // Customization
        customizationItem={customizationItem}
        onCloseCustomization={() => { setCustomizationItem(null); setEditingCartIndex(null); }}
        onAddCustomizedItem={handleCustomizationSave}
        editMode={editingCartIndex !== null}
        // Order Notes
        showNotesModal={showNotesModal}
        onCloseNotesModal={() => setShowNotesModal(false)}
        onSaveNotes={setOrderNotes}
        // Item Notes
        itemNotesModal={itemNotesModal}
        onCloseItemNotes={() => setItemNotesModal(null)}
        onSaveItemNotes={handleSaveItemNotes}
        // Order Placed
        showOrderPlaced={showOrderPlaced}
        onCloseOrderPlaced={handleOrderPlacedClose}
        // Transfer
        transferItem={transferItem}
        onCloseTransfer={() => setTransferItem(null)}
        onTransfer={handleTransfer}
        // Merge
        showMergeModal={showMergeModal}
        onCloseMerge={() => setShowMergeModal(false)}
        onMerge={handleMerge}
        // Shift
        showShiftModal={showShiftModal}
        onCloseShift={() => setShowShiftModal(false)}
        onShift={handleShift}
        // Cancel
        cancelItem={cancelItem}
        onCloseCancel={() => setCancelItem(null)}
        onCancel={handleCancelFood}
        // Customer
        showCustomerModal={showCustomerModal}
        onCloseCustomer={() => setShowCustomerModal(false)}
        onSaveCustomer={setCustomer}
      />

      {/* Quantity Increase Prompt Modal */}
      {quantityPromptItem && (
        <AddQuantityModal
          item={quantityPromptItem}
          onClose={() => { setQuantityPromptItem(null); setQuantityPromptCartIndex(null); }}
          onSameCustomization={handleSameCustomization}
          onNewCustomization={handleNewCustomization}
        />
      )}
    </div>
  );
};

export default OrderEntry;
