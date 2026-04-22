import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Create Menu Context
const MenuContext = createContext(null);

// Menu Provider Component
export const MenuProvider = ({ children }) => {
  const [categories, setCategoriesData] = useState([]);
  const [products, setProductsData] = useState([]);
  const [popularFood, setPopularFoodData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Set categories (called from LoadingPage)
  const setCategories = useCallback((data) => {
    setCategoriesData(data || []);
  }, []);

  // Set products (called from LoadingPage)
  const setProducts = useCallback((data) => {
    setProductsData(data || []);
  }, []);

  // Set popular food (called from LoadingPage)
  const setPopularFood = useCallback((data) => {
    setPopularFoodData(data || []);
    setIsLoaded(true);
  }, []);

  // Clear all menu data (on logout)
  const clearMenu = useCallback(() => {
    setCategoriesData([]);
    setProductsData([]);
    setPopularFoodData([]);
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

  // Context value
  const value = useMemo(() => ({
    // State
    categories,
    products,
    popularFood,
    isLoaded,
    
    // Actions
    setCategories,
    setProducts,
    setPopularFood,
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
    popularFood,
    isLoaded,
    setCategories,
    setProducts,
    setPopularFood,
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
