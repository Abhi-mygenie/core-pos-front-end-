import { createContext, useContext, useState, useCallback } from 'react';
import { tableAPI, menuAPI, cancellationAPI } from '../services/api';

const InitialDataContext = createContext(null);

const LOADING_STEPS = [
  { id: 'tables', label: 'Loading tables...', progress: 25 },
  { id: 'categories', label: 'Loading categories...', progress: 50 },
  { id: 'products', label: 'Loading products...', progress: 75 },
  { id: 'settings', label: 'Loading settings...', progress: 100 },
];

export const InitialDataProvider = ({ children }) => {
  // Loading state
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loadingError, setLoadingError] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Data state
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cancellationReasons, setCancellationReasons] = useState([]);

  // Mark step as completed
  const completeStep = (stepId) => {
    setCompletedSteps(prev => [...prev, stepId]);
    const step = LOADING_STEPS.find(s => s.id === stepId);
    if (step) {
      setLoadingProgress(step.progress);
    }
  };

  // Load all initial data
  const loadInitialData = useCallback(async (token) => {
    if (!token) return;

    setIsInitialLoading(true);
    setLoadingProgress(0);
    setCompletedSteps([]);
    setLoadingError(null);

    try {
      // Step 1: Load Tables
      setCurrentStep('tables');
      const tablesData = await tableAPI.getAllTables();
      const tableList = tablesData.filter(item => item.rtype === 'TB');
      const roomList = tablesData.filter(item => item.rtype === 'RM');
      setTables(tableList);
      setRooms(roomList);
      completeStep('tables');

      // Step 2: Load Categories
      setCurrentStep('categories');
      const categoriesData = await menuAPI.getCategories();
      const categoryList = Array.isArray(categoriesData) 
        ? categoriesData 
        : (categoriesData.categories || categoriesData.data || []);
      setCategories(categoryList);
      completeStep('categories');

      // Step 3: Load Products (sample for menu)
      setCurrentStep('products');
      const productsData = await menuAPI.getProducts(100, 1, 'all', null);
      setProducts(productsData.products || []);
      completeStep('products');

      // Step 4: Load Settings (Cancellation Reasons)
      setCurrentStep('settings');
      const reasonsData = await cancellationAPI.getReasons(50, 1);
      setCancellationReasons(reasonsData.reasons || []);
      completeStep('settings');

      // All done
      setCurrentStep('');
      setIsDataLoaded(true);
      
      // Small delay to show 100% before hiding
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setLoadingError(error.message || 'Failed to load data');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  // Reset data (on logout)
  const resetData = useCallback(() => {
    setIsInitialLoading(false);
    setLoadingProgress(0);
    setCurrentStep('');
    setCompletedSteps([]);
    setLoadingError(null);
    setIsDataLoaded(false);
    setTables([]);
    setRooms([]);
    setCategories([]);
    setProducts([]);
    setCancellationReasons([]);
  }, []);

  // Refresh specific data
  const refreshTables = useCallback(async () => {
    try {
      const tablesData = await tableAPI.getAllTables();
      const tableList = tablesData.filter(item => item.rtype === 'TB');
      const roomList = tablesData.filter(item => item.rtype === 'RM');
      setTables(tableList);
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to refresh tables:', error);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const categoriesData = await menuAPI.getCategories();
      const categoryList = Array.isArray(categoriesData) 
        ? categoriesData 
        : (categoriesData.categories || categoriesData.data || []);
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  }, []);

  const value = {
    // Loading state
    isInitialLoading,
    loadingProgress,
    currentStep,
    completedSteps,
    loadingSteps: LOADING_STEPS,
    loadingError,
    isDataLoaded,
    
    // Data
    tables,
    rooms,
    categories,
    products,
    cancellationReasons,
    
    // Actions
    loadInitialData,
    resetData,
    refreshTables,
    refreshCategories,
    setTables,
    setRooms,
    setCategories,
    setProducts,
  };

  return (
    <InitialDataContext.Provider value={value}>
      {children}
    </InitialDataContext.Provider>
  );
};

export const useInitialData = () => {
  const context = useContext(InitialDataContext);
  if (!context) {
    throw new Error('useInitialData must be used within InitialDataProvider');
  }
  return context;
};

export default InitialDataContext;
