import { useState, useCallback, useMemo } from "react";

/**
 * Custom hook for cart management in OrderEntry
 */
const useCartManager = (orderData) => {
  const [cartItems, setCartItems] = useState([]);
  const [flashItemId, setFlashItemId] = useState(null);
  const [editingQtyItemId, setEditingQtyItemId] = useState(null);

  // Initialize cart with existing order items
  const initializeCart = useCallback(() => {
    if (orderData && orderData.items) {
      const existingItems = orderData.items.map(item => ({
        ...item,
        price: Math.floor(Math.random() * 400) + 100,
        placed: true,
        addedAt: new Date(Date.now() - item.time * 60000).toISOString(),
      }));
      setCartItems(existingItems);
    }
  }, [orderData]);

  // Cart item counts by item id (for badge on pills)
  const cartCountMap = useMemo(() => {
    const map = {};
    cartItems.forEach(ci => { map[ci.id] = (map[ci.id] || 0) + ci.qty; });
    return map;
  }, [cartItems]);

  // Total calculation
  const total = useMemo(() => 
    cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0),
    [cartItems]
  );

  // Add item to cart with flash feedback
  const addToCart = useCallback((item) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(ci => ci.id === item.id && !ci.customizations && !ci.placed);
      if (existingIndex >= 0 && !item.customizations) {
        const updated = [...prev];
        updated[existingIndex].qty += 1;
        return updated;
      }
      return [...prev, {
        ...item,
        qty: item.quantity || 1,
        status: "preparing",
        placed: false,
        addedAt: new Date().toISOString()
      }];
    });
    setFlashItemId(item.id);
    setTimeout(() => setFlashItemId(null), 400);
  }, []);

  // Add customized item to cart
  const addCustomizedItemToCart = useCallback((item) => {
    setCartItems(prev => [...prev, {
      ...item,
      qty: item.quantity || 1,
      status: "preparing",
      placed: false,
      addedAt: new Date().toISOString()
    }]);
  }, []);

  // Update quantity - now supports cartIndex for specific item
  const updateQuantity = useCallback((itemId, newQty, cartIndex = null) => {
    setCartItems(prev => prev.map((item, idx) => {
      // If cartIndex provided, use it; otherwise match by id
      if (cartIndex !== null) {
        return idx === cartIndex ? { ...item, qty: newQty } : item;
      }
      return item.id === itemId ? { ...item, qty: newQty } : item;
    }));
  }, []);

  // Update cart item (for editing customizations)
  const updateCartItem = useCallback((cartIndex, updatedItem) => {
    setCartItems(prev => prev.map((item, idx) => 
      idx === cartIndex ? { 
        ...updatedItem, 
        qty: item.qty, 
        placed: item.placed, 
        addedAt: item.addedAt,
        status: item.status
      } : item
    ));
  }, []);

  // Remove item
  const removeItem = useCallback((itemId) => {
    setCartItems(prev => prev.filter(ci => ci.id !== itemId));
  }, []);

  // Place order - mark all items as placed
  const placeOrder = useCallback(() => {
    if (cartItems.length === 0) return false;
    setCartItems(prev => prev.map(item => ({ ...item, placed: true })));
    setEditingQtyItemId(null);
    return true;
  }, [cartItems.length]);

  // Update item notes
  const updateItemNotes = useCallback((cartIndex, notes) => {
    setCartItems(prev => prev.map((item, idx) => 
      idx === cartIndex ? { ...item, itemNotes: notes } : item
    ));
  }, []);

  return {
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
    placeOrder,
    updateItemNotes,
  };
};

export default useCartManager;
