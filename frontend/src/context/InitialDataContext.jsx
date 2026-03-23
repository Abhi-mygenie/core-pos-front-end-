import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { tableAPI, menuAPI, cancellationAPI, orderAPI } from '../services/api';
import { transformAllOrders, splitOrdersByType } from '../utils/orderTransformer';

const InitialDataContext = createContext(null);

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries

// Loading steps configuration
const LOADING_STEPS = [
  { id: 'tables', label: 'Loading tables...', progress: 20 },
  { id: 'categories', label: 'Loading categories...', progress: 40 },
  { id: 'products', label: 'Loading products...', progress: 60 },
  { id: 'settings', label: 'Loading settings...', progress: 80 },
  { id: 'orders', label: 'Loading orders...', progress: 100 },
];

// Debug logger
const debugLog = (action, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = '🔵 [InitialDataContext]';
  if (data) {
    console.log(`${prefix} ${timestamp} - ${action}`, data);
  } else {
    console.log(`${prefix} ${timestamp} - ${action}`);
  }
};

export const InitialDataProvider = ({ children }) => {
  // Loading state
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loadingError, setLoadingError] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Detailed loading stats
  const [loadingStats, setLoadingStats] = useState({
    tables: { loaded: 0, total: 0 },
    rooms: { loaded: 0, total: 0 },
    categories: { loaded: 0, total: 0 },
    products: { loaded: 0, total: 0 },
    cancellationReasons: { loaded: 0, total: 0 },
    orders: { loaded: 0, total: 0 }
  });
  
  // Retry state
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasAttemptedLoad = useRef(false);

  // Data state
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cancellationReasons, setCancellationReasons] = useState([]);
  
  // Orders state
  const [orders, setOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [takeAwayOrders, setTakeAwayOrders] = useState([]);
  const [dineInOrders, setDineInOrders] = useState([]);

  // Mark step as completed
  const completeStep = (stepId) => {
    setCompletedSteps(prev => [...prev, stepId]);
    const step = LOADING_STEPS.find(s => s.id === stepId);
    if (step) {
      setLoadingProgress(step.progress);
    }
  };

  // Load all initial data
  const loadInitialData = useCallback(async (token, isRetry = false) => {
    if (!token) {
      debugLog('No token provided, skipping load');
      return;
    }

    const attemptNumber = isRetry ? retryCount + 1 : 1;
    debugLog(`Starting data load (Attempt ${attemptNumber}/${MAX_RETRIES})`, { token: token.substring(0, 20) + '...' });

    const startTime = Date.now();
    const MINIMUM_LOADING_TIME = 2000; // Minimum 2 seconds to show progress

    setIsInitialLoading(true);
    setIsRetrying(isRetry);
    setLoadingProgress(0);
    setCompletedSteps([]);
    setLoadingError(null);
    setLoadingStats({
      tables: { loaded: 0, total: 0 },
      rooms: { loaded: 0, total: 0 },
      categories: { loaded: 0, total: 0 },
      products: { loaded: 0, total: 0 },
      cancellationReasons: { loaded: 0, total: 0 }
    });
    if (!isRetry) {
      setIsDataLoaded(false);
    }

    try {
      // Step 1: Load Tables & Rooms
      setCurrentStep('tables');
      setLoadingProgress(10);
      debugLog('API CALL: GET /api/v1/vendoremployee/all-table-list');
      const tablesData = await tableAPI.getAllTables();
      debugLog('API RESPONSE: all-table-list', { count: tablesData?.length || 0 });
      
      const tableList = tablesData.filter(item => item.rtype === 'TB');
      const roomList = tablesData.filter(item => item.rtype === 'RM');
      
      // Update stats progressively
      setLoadingStats(prev => ({
        ...prev,
        tables: { loaded: tableList.length, total: tableList.length },
        rooms: { loaded: roomList.length, total: roomList.length }
      }));
      
      setTables(tableList);
      setRooms(roomList);
      setLoadingProgress(25);
      completeStep('tables');
      debugLog(`Loaded ${tableList.length} tables, ${roomList.length} rooms`);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 2: Load Categories
      setCurrentStep('categories');
      setLoadingProgress(30);
      debugLog('API CALL: GET /api/v1/vendoremployee/get-categories');
      const categoriesData = await menuAPI.getCategories();
      debugLog('API RESPONSE: get-categories', { raw: categoriesData });
      
      const categoryList = Array.isArray(categoriesData) 
        ? categoriesData 
        : (categoriesData.categories || categoriesData.data || []);
      
      // Update stats
      setLoadingStats(prev => ({
        ...prev,
        categories: { loaded: categoryList.length, total: categoryList.length }
      }));
      
      setCategories(categoryList);
      setLoadingProgress(50);
      completeStep('categories');
      debugLog(`Loaded ${categoryList.length} categories`);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Load Products (ALL products)
      setCurrentStep('products');
      setLoadingProgress(55);
      debugLog('API CALL: GET /api/v1/vendoremployee/get-products-list?limit=10000');
      const productsData = await menuAPI.getProducts(10000, 1, 'all', null);
      debugLog('API RESPONSE: get-products-list', { count: productsData?.products?.length || 0 });
      
      const productList = productsData.products || [];
      
      // Update stats
      setLoadingStats(prev => ({
        ...prev,
        products: { loaded: productList.length, total: productList.length }
      }));
      
      setProducts(productList);
      setLoadingProgress(60);
      completeStep('products');
      debugLog(`Loaded ${productList.length} products`);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 4: Load Cancellation Reasons
      setCurrentStep('settings');
      setLoadingProgress(65);
      debugLog('API CALL: GET /api/v1/vendoremployee/cancellation-reasons?limit=1000');
      const reasonsData = await cancellationAPI.getReasons(1000, 1);
      debugLog('API RESPONSE: cancellation-reasons', { count: reasonsData?.reasons?.length || 0 });
      
      const reasonsList = reasonsData.reasons || [];
      
      // Update stats
      setLoadingStats(prev => ({
        ...prev,
        cancellationReasons: { loaded: reasonsList.length, total: reasonsList.length }
      }));
      
      setCancellationReasons(reasonsList);
      setLoadingProgress(80);
      completeStep('settings');
      debugLog(`Loaded ${reasonsList.length} cancellation reasons`);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 5: Load Orders
      setCurrentStep('orders');
      setLoadingProgress(85);
      debugLog('API CALL: POST /api/v1/vendoremployee/station-order-list');
      const ordersData = await orderAPI.getStationOrders('KDS');
      debugLog('API RESPONSE: station-order-list', { count: ordersData?.orders?.length || 0 });
      
      const rawOrders = ordersData.orders || [];
      const transformedOrders = transformAllOrders(rawOrders);
      const splitOrders = splitOrdersByType(transformedOrders);
      
      // Update stats
      setLoadingStats(prev => ({
        ...prev,
        orders: { loaded: transformedOrders.length, total: transformedOrders.length }
      }));
      
      setOrders(transformedOrders);
      setDeliveryOrders(splitOrders.delivery);
      setTakeAwayOrders(splitOrders.takeAway);
      setDineInOrders(splitOrders.dineIn);
      setLoadingProgress(100);
      completeStep('orders');
      debugLog(`Loaded ${transformedOrders.length} orders (${splitOrders.delivery.length} delivery, ${splitOrders.takeAway.length} takeaway, ${splitOrders.dineIn.length} dine-in)`);

      // Ensure minimum loading time for better UX
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MINIMUM_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MINIMUM_LOADING_TIME - elapsedTime));
      }

      // All done
      setCurrentStep('');
      setIsDataLoaded(true);
      setRetryCount(0); // Reset retry count on success
      hasAttemptedLoad.current = true;
      debugLog('✅ All data loaded successfully!');
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      debugLog('❌ Error loading data', { error: error.message, attempt: attemptNumber });
      
      // Check if it's a 401 Unauthorized error
      const isUnauthorized = error.response?.status === 401;
      
      if (isUnauthorized) {
        // Token is invalid/expired - clear it and redirect to login
        debugLog('🔒 401 Unauthorized - clearing token and redirecting to login');
        localStorage.removeItem('authToken');
        setLoadingError('Session expired. Please login again.');
        hasAttemptedLoad.current = true; // Prevent further retries
        
        // Redirect to login page
        window.location.href = '/';
        return;
      }
      
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (newRetryCount < MAX_RETRIES) {
        setLoadingError(`Failed to load data. Retrying... (Attempt ${newRetryCount + 1}/${MAX_RETRIES})`);
        debugLog(`Will retry in ${RETRY_DELAY}ms...`);
        // Will be retried by useEffect
      } else {
        setLoadingError(`Failed to load data after ${MAX_RETRIES} attempts. Please refresh the page.`);
        debugLog('Max retries reached, giving up');
        hasAttemptedLoad.current = true; // Prevent further auto-retries
      }
    } finally {
      setIsInitialLoading(false);
      setIsRetrying(false);
    }
  }, [retryCount]);

  // Reset data (on logout)
  const resetData = useCallback(() => {
    debugLog('Resetting all data (logout)');
    setIsInitialLoading(false);
    setLoadingProgress(0);
    setCurrentStep('');
    setCompletedSteps([]);
    setLoadingError(null);
    setIsDataLoaded(false);
    setRetryCount(0);
    setIsRetrying(false);
    hasAttemptedLoad.current = false;
    setTables([]);
    setRooms([]);
    setCategories([]);
    setProducts([]);
    setCancellationReasons([]);
    setOrders([]);
    setDeliveryOrders([]);
    setTakeAwayOrders([]);
    setDineInOrders([]);
  }, []);

  // Auto-load data if user has token but data isn't loaded (e.g., page refresh)
  // SKIP auto-load on login page - user should login first
  useEffect(() => {
    // Don't auto-load on login page
    const isLoginPage = window.location.pathname === '/' || window.location.pathname === '/login';
    if (isLoginPage) {
      debugLog('On login page - skipping auto-load');
      return;
    }
    
    const token = localStorage.getItem('authToken');
    
    // Don't auto-load if already loaded, currently loading, or max retries reached
    if (isDataLoaded || isInitialLoading || hasAttemptedLoad.current) {
      return;
    }
    
    if (token && retryCount < MAX_RETRIES) {
      debugLog('Auto-load triggered', { retryCount, hasAttemptedLoad: hasAttemptedLoad.current });
      
      if (retryCount > 0) {
        // Delay retry
        const timeoutId = setTimeout(() => {
          loadInitialData(token, true);
        }, RETRY_DELAY);
        return () => clearTimeout(timeoutId);
      } else {
        loadInitialData(token, false);
      }
    }
  }, [isDataLoaded, isInitialLoading, loadInitialData, retryCount]);

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
    loadingError,
    isDataLoaded,
    
    // Detailed loading stats
    loadingStats,
    
    // Retry state
    retryCount,
    isRetrying,
    maxRetries: MAX_RETRIES,
    
    // Data
    tables,
    rooms,
    categories,
    products,
    cancellationReasons,
    
    // Orders data
    orders,
    deliveryOrders,
    takeAwayOrders,
    dineInOrders,
    
    // Actions
    loadInitialData,
    resetData,
    refreshTables,
    refreshCategories,
    setTables,
    setRooms,
    setCategories,
    setProducts,
    setOrders,
    setDeliveryOrders,
    setTakeAwayOrders,
    setDineInOrders,
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
