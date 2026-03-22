import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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

    const startTime = Date.now();
    const MINIMUM_LOADING_TIME = 2000; // Minimum 2 seconds to show progress

    setIsInitialLoading(true);
    setLoadingProgress(0);
    setCompletedSteps([]);
    setLoadingError(null);
    setIsDataLoaded(false);

    try {
      // Step 1: Load Tables
      setCurrentStep('tables');
      const tablesData = await tableAPI.getAllTables();
      const tableList = tablesData.filter(item => item.rtype === 'TB');
      const roomList = tablesData.filter(item => item.rtype === 'RM');
      setTables(tableList);
      setRooms(roomList);
      completeStep('tables');
      await new Promise(resolve => setTimeout(resolve, 300)); // Visual delay

      // Step 2: Load Categories
      setCurrentStep('categories');
      const categoriesData = await menuAPI.getCategories();
      const categoryList = Array.isArray(categoriesData) 
        ? categoriesData 
        : (categoriesData.categories || categoriesData.data || []);
      setCategories(categoryList);
      completeStep('categories');
      await new Promise(resolve => setTimeout(resolve, 300)); // Visual delay

      // Step 3: Load Products (ALL products - no pagination, single fetch)
      setCurrentStep('products');
      const productsData = await menuAPI.getProducts(10000, 1, 'all', null);
      setProducts(productsData.products || []);
      completeStep('products');
      await new Promise(resolve => setTimeout(resolve, 300)); // Visual delay

      // Step 4: Load Settings (Cancellation Reasons - ALL)
      setCurrentStep('settings');
      const reasonsData = await cancellationAPI.getReasons(1000, 1);
      setCancellationReasons(reasonsData.reasons || []);
      completeStep('settings');

      // Ensure minimum loading time for better UX
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MINIMUM_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MINIMUM_LOADING_TIME - elapsedTime));
      }

      // All done
      setCurrentStep('');
      setIsDataLoaded(true);
      
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

  // Auto-load data if user has token but data isn't loaded (e.g., page refresh)
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !isDataLoaded && !isInitialLoading) {
      loadInitialData(token);
    }
  }, [isDataLoaded, isInitialLoading, loadInitialData]);

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
