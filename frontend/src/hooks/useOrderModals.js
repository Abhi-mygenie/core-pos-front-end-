import { useState, useCallback } from "react";

/**
 * Custom hook for modal management in OrderEntry
 */
const useOrderModals = () => {
  const [customizationItem, setCustomizationItem] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showOrderPlaced, setShowOrderPlaced] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [itemNotesModal, setItemNotesModal] = useState(null); // { item, cartIndex }
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Close all modals
  const closeAllModals = useCallback(() => {
    setCustomizationItem(null);
    setShowNotesModal(false);
    setShowOrderPlaced(false);
    setTransferItem(null);
    setShowMergeModal(false);
    setShowShiftModal(false);
    setCancelItem(null);
    setShowPaymentPanel(false);
    setShowTypeDropdown(false);
    setItemNotesModal(null);
    setShowCustomerModal(false);
  }, []);

  // Open item customization
  const openCustomization = useCallback((item) => {
    setCustomizationItem(item);
  }, []);

  // Open item notes
  const openItemNotes = useCallback((item, cartIndex) => {
    setItemNotesModal({ item, cartIndex });
  }, []);

  return {
    // Customization
    customizationItem,
    setCustomizationItem,
    openCustomization,
    
    // Notes
    showNotesModal,
    setShowNotesModal,
    itemNotesModal,
    setItemNotesModal,
    openItemNotes,
    
    // Order placed
    showOrderPlaced,
    setShowOrderPlaced,
    
    // Transfer/Merge/Shift
    transferItem,
    setTransferItem,
    showMergeModal,
    setShowMergeModal,
    showShiftModal,
    setShowShiftModal,
    
    // Cancel
    cancelItem,
    setCancelItem,
    
    // Payment
    showPaymentPanel,
    setShowPaymentPanel,
    
    // Type dropdown
    showTypeDropdown,
    setShowTypeDropdown,
    
    // Customer
    showCustomerModal,
    setShowCustomerModal,
    
    // Utility
    closeAllModals,
  };
};

export default useOrderModals;
