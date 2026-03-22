import ItemCustomizationModal from "./ItemCustomizationModal";
import OrderNotesModal from "./OrderNotesModal";
import ItemNotesModal from "./ItemNotesModal";
import CustomerModal from "./CustomerModal";
import OrderPlacedModal from "./OrderPlacedModal";
import TransferFoodModal from "./TransferFoodModal";
import MergeTableModal from "./MergeTableModal";
import ShiftTableModal from "./ShiftTableModal";
import CancelFoodModal from "./CancelFoodModal";

/**
 * OrderModals - Container for all modals used in OrderEntry
 */
const OrderModals = ({
  table,
  customer,
  orderNotes,
  // Customization
  customizationItem,
  onCloseCustomization,
  onAddCustomizedItem,
  editMode = false,
  // Order Notes
  showNotesModal,
  onCloseNotesModal,
  onSaveNotes,
  // Item Notes
  itemNotesModal,
  onCloseItemNotes,
  onSaveItemNotes,
  // Order Placed
  showOrderPlaced,
  onCloseOrderPlaced,
  // Transfer
  transferItem,
  onCloseTransfer,
  onTransfer,
  // Merge
  showMergeModal,
  onCloseMerge,
  onMerge,
  // Shift
  showShiftModal,
  onCloseShift,
  onShift,
  // Cancel
  cancelItem,
  onCloseCancel,
  onCancel,
  // Customer
  showCustomerModal,
  onCloseCustomer,
  onSaveCustomer,
}) => {
  return (
    <>
      {customizationItem && (
        <ItemCustomizationModal 
          item={customizationItem} 
          onClose={onCloseCustomization} 
          onAddToOrder={onAddCustomizedItem}
          editMode={editMode} 
        />
      )}
      
      {showNotesModal && (
        <OrderNotesModal 
          tableId={table?.id} 
          onClose={onCloseNotesModal} 
          onSave={onSaveNotes} 
          initialNotes={orderNotes}
          customerId={customer?.id || null}
        />
      )}
      
      {itemNotesModal && (
        <ItemNotesModal
          item={itemNotesModal.item}
          onClose={onCloseItemNotes}
          onSave={onSaveItemNotes}
          initialNotes={itemNotesModal.item?.itemNotes || []}
          customerId={customer?.id || null}
        />
      )}
      
      {showOrderPlaced && (
        <OrderPlacedModal onClose={onCloseOrderPlaced} autoCloseDelay={2000} />
      )}
      
      {transferItem && table && (
        <TransferFoodModal 
          item={transferItem} 
          currentTable={table} 
          onClose={onCloseTransfer} 
          onTransfer={onTransfer} 
        />
      )}
      
      {showMergeModal && table && (
        <MergeTableModal 
          currentTable={table} 
          onClose={onCloseMerge} 
          onMerge={onMerge} 
        />
      )}
      
      {showShiftModal && table && (
        <ShiftTableModal 
          currentTable={table} 
          onClose={onCloseShift} 
          onShift={onShift} 
        />
      )}
      
      {cancelItem && (
        <CancelFoodModal 
          item={cancelItem} 
          onClose={onCloseCancel} 
          onCancel={onCancel} 
        />
      )}
      
      {showCustomerModal && (
        <CustomerModal
          onClose={onCloseCustomer}
          onSave={onSaveCustomer}
          initialData={customer}
        />
      )}
    </>
  );
};

export default OrderModals;
