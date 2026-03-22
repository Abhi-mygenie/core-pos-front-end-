import { useState, useEffect } from "react";
import { COLORS } from "../../constants";
import { useCartManager, useMenuFilter, useOrderModals } from "../../hooks";
import CategoryPanel from "./CategoryPanel";
import CartPanel from "./CartPanel";
import CollectPaymentPanel from "./CollectPaymentPanel";
import MenuFiltersBar from "./MenuFiltersBar";
import MenuItemsGrid from "./MenuItemsGrid";
import CartHeader from "./CartHeader";
import OrderModals from "./OrderModals";

/**
 * OrderEntry - 3-Panel Layout for order management
 * Decomposed into smaller components and custom hooks
 */
const OrderEntry = ({ 
  table, 
  onClose, 
  orderData, 
  orderType = "delivery", 
  onOrderTypeChange, 
  allTables = [], 
  onSelectTable 
}) => {
  // Cart management
  const {
    cartItems,
    cartCountMap,
    total,
    flashItemId,
    editingQtyItemId,
    setEditingQtyItemId,
    initializeCart,
    addToCart,
    addCustomizedItemToCart,
    updateQuantity,
    removeItem,
    placeOrder,
    updateItemNotes,
  } = useCartManager(orderData);

  // Menu filtering
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
  } = useMenuFilter();

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

  // Initialize cart with existing order items
  useEffect(() => {
    initializeCart();
  }, [initializeCart]);

  // Event handlers
  const handlePlaceOrder = () => {
    if (placeOrder()) {
      setShowOrderPlaced(true);
    }
  };

  const handleTransfer = (item, targetTable) => {
    removeItem(item.id);
    setTransferItem(null);
  };

  const handleMerge = (targetTable) => {
    setShowMergeModal(false);
  };

  const handleShift = (targetTable) => {
    setShowShiftModal(false);
  };

  const handleCancelFood = (item, reason) => {
    removeItem(item.id);
    setCancelItem(null);
  };

  const handleSaveItemNotes = (notes) => {
    if (itemNotesModal) {
      updateItemNotes(itemNotesModal.cartIndex, notes);
      setItemNotesModal(null);
    }
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

          <MenuItemsGrid
            items={filteredItems}
            cartCountMap={cartCountMap}
            flashItemId={flashItemId}
            onAddToCart={addToCart}
            onCustomize={openCustomization}
          />
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
        onCloseCustomization={() => setCustomizationItem(null)}
        onAddCustomizedItem={(item) => { addCustomizedItemToCart(item); setCustomizationItem(null); }}
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
        onCloseOrderPlaced={() => setShowOrderPlaced(false)}
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
    </div>
  );
};

export default OrderEntry;
