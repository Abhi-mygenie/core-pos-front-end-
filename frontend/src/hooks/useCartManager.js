import { useState, useCallback, useMemo, useRef } from "react";

/**
 * Custom hook for cart management in OrderEntry
 * Now accepts pre-built items from context (with prices already set)
 */
const useCartManager = (orderData) => {
  const [cartItems, setCartItems] = useState([]);
  const [flashItemId, setFlashItemId] = useState(null);
  const [editingQtyItemId, setEditingQtyItemId] = useState(null);
  const orderDataRef = useRef(orderData);
  orderDataRef.current = orderData;

  // Initialize cart with existing order items (from context, prices already set)
  // Uses ref to avoid re-creating when orderData object reference changes
  const initializeCart = useCallback(() => {
    const data = orderDataRef.current;
    if (data && data.items) {
      setCartItems(data.items.map(item => ({
        ...item,
        price: item.price || Math.floor(Math.random() * 400) + 100,
        placed: item.placed !== undefined ? item.placed : true,
        addedAt: item.addedAt || new Date(Date.now() - (item.time || 0) * 60000).toISOString(),
      })));
    }
  }, []);

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

  // Remove item entirely
  const removeItem = useCallback((itemId) => {
    setCartItems(prev => prev.filter(ci => ci.id !== itemId));
  }, []);

  // Reduce item qty (for partial cancel/transfer). Removes if qty reaches 0.
  const reduceItemQty = useCallback((itemId, reduceBy) => {
    setCartItems(prev => {
      const result = [];
      for (const item of prev) {
        if (item.id === itemId) {
          const remaining = item.qty - reduceBy;
          if (remaining > 0) result.push({ ...item, qty: remaining });
        } else {
          result.push(item);
        }
      }
      return result;
    });
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
    reduceItemQty,
    placeOrder,
    updateItemNotes,
  };
};

export default useCartManager;
