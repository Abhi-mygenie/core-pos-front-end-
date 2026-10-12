import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getActiveMenuType, ACTIVE_MENU_TYPE_DEFAULT } from '../utils/activeMenuPrefs'; // CR-376

// Create Menu Context
const MenuContext = createContext(null);

// Menu Provider Component
export const MenuProvider = ({ children }) => {
  const [categories, setCategoriesData] = useState([]);
  const [products, setProductsData] = useState([]);
  const [popularProducts, setPopularProductsData] = useState([]); // BUG-340
  const [isLoaded, setIsLoaded] = useState(false);

  // Set categories (called from LoadingPage)
  const setCategories = useCallback((data) => {
    setCategoriesData(data || []);
  }, []);

  // Set products (called from LoadingPage)
  const setProducts = useCallback((data) => {
    setProductsData(data || []);
    setIsLoaded(true);
  }, []);

  // BUG-340: Set popular products (called from LoadingPage boot, gated by showPopularCategory)
  const setPopularProducts = useCallback((data) => {
    setPopularProductsData(data || []);
  }, []);

  // BUG-116 (2026-06-08): Delta update from socket `food_update_${rid}`.
  // Dedup by productId; merge if exists, insert if new.
  const addOrUpdateProduct = useCallback((product) => {
    if (!product?.productId) return;
    setProductsData((prev) => {
      const idx = prev.findIndex((p) => p.productId === product.productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...product };
        return next;
      }
      return [product, ...prev];
    });
  }, []);

  // BUG-096: Remove product from state (delete-food socket event)
  const removeProduct = useCallback((productId) => {
    if (!productId) return;
    setProductsData((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  // Clear all menu data (on logout)
  const clearMenu = useCallback(() => {
    setCategoriesData([]);
    setProductsData([]);
    setPopularProductsData([]); // BUG-340
    setIsLoaded(false);
  }, []);

  // Get category by ID
  const getCategoryById = useCallback((categoryId) => {
    return categories.find((cat) => cat.categoryId === categoryId) || null;
  }, [categories]);

  // Get product by ID
  const getProductById = useCallback((productId) => {
    return products.find((prod) => prod.productId === productId) || null;
  }, [products]);

  // Get products by category ID
  const getProductsByCategory = useCallback((categoryId) => {
    if (!categoryId) return products;
    return products.filter((prod) => prod.categoryId === categoryId);
  }, [products]);

  // Search products by name or description
  const searchProducts = useCallback((searchTerm) => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter((prod) =>
      prod.productName.toLowerCase().includes(term) ||
      prod.description?.toLowerCase().includes(term)
    );
  }, [products]);

  // Filter products by food type
  const filterByFoodType = useCallback((type) => {
    if (type === 'all') return products;
    if (type === 'veg') return products.filter((p) => p.isVeg);
    if (type === 'non-veg') return products.filter((p) => !p.isVeg && !p.hasEgg);
    if (type === 'egg') return products.filter((p) => p.hasEgg);
    return products;
  }, [products]);

  // Get active (in-stock) products only
  const getActiveProducts = useCallback(() => {
    return products.filter((p) => p.isActive && !p.isOutOfStock);
  }, [products]);

  // CR-376: Active menu type — read once from localStorage on context init.
  // Changes to localStorage (from StatusConfigPage save) take effect on next mount.
  const activeMenuType = useMemo(() => getActiveMenuType(), []);

  // CR-376: Products filtered to the active menu type — used by OrderEntry item grid.
  const activeMenuProducts = useMemo(
    () => products.filter(p => p.foodFor === activeMenuType),
    [products, activeMenuType]
  );

  // CR-376: Distinct non-Aggregator menu types that have ≥1 active, non-disabled item.
  // Used by StatusConfigPage to render the Active Menu selector.
  const availableMenuTypes = useMemo(
    () => [...new Set(
      products
        .filter(p => p.isActive && !p.isDisabled && p.foodFor !== 'Aggregator')
        .map(p => p.foodFor)
    )].sort((a, b) => a === 'Normal' ? -1 : b === 'Normal' ? 1 : a.localeCompare(b)),
    [products]
  );

  // Context value
  const value = useMemo(() => ({
    // State
    categories,
    products,
    popularProducts, // BUG-340
    isLoaded,
    activeMenuProducts, // CR-376
    availableMenuTypes, // CR-376
    activeMenuType,     // CR-376
    
    // Actions
    setCategories,
    setProducts,
    setPopularProducts, // BUG-340
    addOrUpdateProduct,
    removeProduct,
    clearMenu,
    
    // Helpers
    getCategoryById,
    getProductById,
    getProductsByCategory,
    searchProducts,
    filterByFoodType,
    getActiveProducts,
  }), [
    categories,
    products,
    popularProducts, // BUG-340
    isLoaded,
    activeMenuProducts, // CR-376
    availableMenuTypes, // CR-376
    activeMenuType,     // CR-376
    setCategories,
    setProducts,
    setPopularProducts, // BUG-340
    addOrUpdateProduct,
    removeProduct,
    clearMenu,
    getCategoryById,
    getProductById,
    getProductsByCategory,
    searchProducts,
    filterByFoodType,
    getActiveProducts,
  ]);

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};

// Custom hook to use Menu Context
export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

export default MenuContext;
