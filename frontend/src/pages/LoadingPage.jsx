import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../constants";
import { useToast } from "../hooks/use-toast";
import { API_LOADING_ORDER, LOADING_STATES } from "../api/constants";
import { useAuth, useRestaurant, useMenu, useTables, useSettings, useOrders, useStations } from "../contexts";
import * as profileService from "../api/services/profileService";
import { setCrmRestaurantId } from "../api/crmAxios";
import * as categoryService from "../api/services/categoryService";
import * as productService from "../api/services/productService";
import * as tableService from "../api/services/tableService";
import * as settingsService from "../api/services/settingsService";
import * as orderService from "../api/services/orderService";
import * as stationService from "../api/services/stationService";

// Initial status shape per API key
const mkIdle = () => ({ status: LOADING_STATES.IDLE, error: null, loaded: 0, total: 0, elapsed: null, startedAt: null });

// Loading Screen Component - Loads all data after login
const LoadingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Context setters
  const { setUserData } = useAuth();
  const { setRestaurant } = useRestaurant();
  const { setCategories, setProducts, setPopularFood } = useMenu();
  const { setTables } = useTables();
  const { setCancellationReasons } = useSettings();
  const { setOrders } = useOrders();
  const { 
    setAvailableStations, 
    initializeConfig, 
    setAllStationData,
    enabledStations,
    stationViewEnabled 
  } = useStations();

  // Loading status for each API with counts + timing
  const [loadingStatus, setLoadingStatus] = useState(
    API_LOADING_ORDER.reduce((acc, item) => { acc[item.key] = mkIdle(); return acc; }, {})
  );

  // Ref to track loaded data across the async flow
  const loadedDataRef = useRef({});

  // Overall progress
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Live timer tick — updates every 100ms to show running elapsed on loading items
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [isComplete]);

  // Load data on mount (auth check handled by ProtectedRoute — T-07)
  useEffect(() => {
    const ctrl = { aborted: false };
    loadAllData(ctrl);

    return () => { ctrl.aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref to track station loading status
  const stationLoadingRef = useRef(false);

  // Update progress when status changes
  useEffect(() => {
    const statuses = Object.values(loadingStatus);
    const completed = statuses.filter(
      (s) => s.status === LOADING_STATES.SUCCESS || s.status === LOADING_STATES.ERROR
    ).length;
    const total = statuses.length;
    const newProgress = Math.round((completed / total) * 100);
    setProgress(newProgress);

    // Check if all complete
    if (completed === total && !stationLoadingRef.current) {
      const hasAnyError = statuses.some((s) => s.status === LOADING_STATES.ERROR);
      setHasError(hasAnyError);

      if (!hasAnyError) {
        // Load station data before navigating
        stationLoadingRef.current = true;
        loadStationData().then(() => {
          setIsComplete(true);
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 500);
        });
      } else {
        setIsComplete(true);
      }
    }
  }, [loadingStatus, navigate]);

  // Load station data (called after all APIs complete)
  const loadStationData = async () => {
    try {
      const data = loadedDataRef.current;
      const products = data.products || [];
      
      // Extract unique stations from products
      const uniqueStations = stationService.extractUniqueStations(products);
      console.log('[LoadingPage] Available stations:', uniqueStations);
      
      if (uniqueStations.length > 0) {
        // Set available stations in context
        setAvailableStations(uniqueStations);
        
        // Initialize config (loads from localStorage or defaults to all stations)
        initializeConfig(uniqueStations);
        
        // Get enabled stations (wait for state update)
        const savedConfig = stationService.getStationViewConfig();
        const stationsToLoad = savedConfig.stations?.length > 0 
          ? savedConfig.stations.filter(s => uniqueStations.includes(s))
          : uniqueStations;
        
        console.log('[LoadingPage] Loading station data for:', stationsToLoad);
        
        // Build categories map for lookup (category_id -> category_name)
        const categories = data.categories || [];
        const categoriesMap = {};
        categories.forEach(cat => {
          if (cat.categoryId) {
            categoriesMap[cat.categoryId] = cat.categoryName;  // Use categoryName, not name
            categoriesMap[String(cat.categoryId)] = cat.categoryName;
          }
        });
        console.log('[LoadingPage] Categories map:', categoriesMap);
        console.log('[LoadingPage] Sample categories:', categories.slice(0, 3));
        
        // Fetch data for each enabled station in parallel
        if (savedConfig.enabled !== false && stationsToLoad.length > 0) {
          const stationDataPromises = stationsToLoad.map(station => 
            stationService.fetchStationData(station, categoriesMap)
          );
          const stationResults = await Promise.all(stationDataPromises);
          
          // Build station data object
          const stationDataObj = {};
          stationsToLoad.forEach((station, idx) => {
            stationDataObj[station] = stationResults[idx];
          });
          
          console.log('[LoadingPage] Station data loaded:', stationDataObj);
          setAllStationData(stationDataObj);
        }
      }
    } catch (error) {
      console.error('[LoadingPage] Error loading station data:', error);
      // Don't block navigation on station error
    }
  };

  // Update status for a specific API
  const updateStatus = useCallback((key, status, error = null, loaded = 0, total = 0, extra = {}) => {
    setLoadingStatus((prev) => ({
      ...prev,
      [key]: { ...prev[key], status, error, loaded, total, ...extra },
    }));
  }, []);

  // ---------- Individual API loaders ----------
  // Each returns the fetched data so callers can chain

  const loadProfile = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('profile', LOADING_STATES.LOADING, null, 0, 1, { startedAt: t0 });
    try {
      data.profile = await profileService.getProfile();
      if (ctrl.aborted) return;
      
      // Debug: Log permissions for analysis
      console.log('[LoadingPage] User Profile:', {
        user: data.profile.user,
        roleName: data.profile.user?.roleName,
        permissions: data.profile.permissions,
      });
      console.table(data.profile.permissions?.map((p, i) => ({ index: i, permission: p })) || []);
      
      setUserData(data.profile.user, data.profile.permissions);
      setRestaurant(data.profile.restaurant);
      // Set CRM API key based on restaurant ID
      if (data.profile.restaurant?.id) {
        setCrmRestaurantId(data.profile.restaurant.id);
      }
      updateStatus('profile', LOADING_STATES.SUCCESS, null, 1, 1, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('profile', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 1, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load profile", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadCategories = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('categories', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      data.categories = await categoryService.getCategories();
      if (ctrl.aborted) return;
      const count = data.categories?.length || 0;
      updateStatus('categories', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('categories', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load categories", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadProducts = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('products', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const productsResponse = await productService.getProducts({ limit: 500, offset: 1, type: 'all' });
      if (ctrl.aborted) return;
      data.products = productsResponse.products;
      const loadedCount = data.products?.length || 0;
      const totalCount = productsResponse.total || loadedCount;
      if (data.categories) {
        data.categories = categoryService.calculateItemCounts(data.categories, data.products);
      }
      updateStatus('products', LOADING_STATES.SUCCESS, null, loadedCount, totalCount, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('products', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load products", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadTables = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('tables', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      data.tables = await tableService.getTables();
      if (ctrl.aborted) return;
      const count = data.tables?.length || 0;
      setTables(data.tables);
      updateStatus('tables', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('tables', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load tables", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadCancellationReasons = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('cancellationReasons', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const reasonsResponse = await settingsService.getCancellationReasons({ limit: 100, offset: 1 });
      if (ctrl.aborted) return;
      data.cancellationReasons = reasonsResponse.reasons;
      const count = data.cancellationReasons?.length || 0;
      setCancellationReasons(data.cancellationReasons);
      updateStatus('cancellationReasons', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('cancellationReasons', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load settings", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadPopularFood = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('popularFood', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const popularResponse = await productService.getPopularFood({ limit: 50, offset: 1, type: 'all' });
      if (ctrl.aborted) return;
      data.popularFood = popularResponse.products;
      const loadedCount = data.popularFood?.length || 0;
      const totalCount = popularResponse.total || loadedCount;
      updateStatus('popularFood', LOADING_STATES.SUCCESS, null, loadedCount, totalCount, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('popularFood', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load popular items", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadRunningOrders = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('runningOrders', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const userRole = data.profile?.user?.roleName || 'Owner';
      const roleParam = orderService.getOrderRoleParam(userRole);
      data.runningOrders = await orderService.getRunningOrders(roleParam);
      if (ctrl.aborted) return;
      const count = data.runningOrders?.length || 0;
      setOrders(data.runningOrders);
      updateStatus('runningOrders', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('runningOrders', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load orders", description: error.readableMessage || error.message, variant: "destructive" });
    }
  };

  // Map keys → loader functions
  const loaderMap = {
    profile: loadProfile,
    categories: loadCategories,
    products: loadProducts,
    tables: loadTables,
    cancellationReasons: loadCancellationReasons,
    popularFood: loadPopularFood,
    runningOrders: loadRunningOrders,
  };

  // Load all APIs in sequence
  const loadAllData = async (ctrl, onlyKeys = null) => {
    const data = loadedDataRef.current;

    const keysToLoad = onlyKeys || API_LOADING_ORDER.map(i => i.key);

    for (const key of keysToLoad) {
      if (ctrl.aborted) return;
      const loader = loaderMap[key];
      if (loader) await loader(ctrl, data);
    }

    if (ctrl.aborted) return;

    // Dispatch Menu context (safe to re-call even on retry)
    if (data.categories) setCategories(data.categories);
    if (data.products) setProducts(data.products);
    if (data.popularFood) setPopularFood(data.popularFood);

    loadedDataRef.current = data;
  };

  // Smart retry — only re-run failed APIs
  const handleRetry = () => {
    const failedKeys = API_LOADING_ORDER
      .map(i => i.key)
      .filter(key => loadingStatus[key].status === LOADING_STATES.ERROR);

    // Reset only failed items back to IDLE
    setLoadingStatus(prev => {
      const next = { ...prev };
      for (const key of failedKeys) {
        next[key] = mkIdle();
      }
      return next;
    });

    setIsComplete(false);
    setHasError(false);
    loadAllData({ aborted: false }, failedKeys);
  };

  // Get icon for status
  const getStatusIcon = (status) => {
    switch (status) {
      case LOADING_STATES.SUCCESS:
        return <Check className="w-5 h-5 text-green-500" />;
      case LOADING_STATES.LOADING:
        return <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />;
      case LOADING_STATES.ERROR:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  // Get count display text with timing
  const getCountText = (statusObj) => {
    const { status, loaded, total, elapsed, startedAt } = statusObj;

    // Live timer while loading
    if (status === LOADING_STATES.LOADING && startedAt) {
      const live = ((Date.now() - startedAt) / 1000).toFixed(1);
      const countPart = total > 0 ? `${loaded} of ${total} ` : '';
      return `${countPart}Loading... ${live}s`;
    }

    if (status === LOADING_STATES.SUCCESS) {
      const timePart = elapsed ? ` · ${elapsed}s` : '';
      if (total > 0 && loaded !== total) {
        return `${loaded} of ${total} loaded${timePart}`;
      }
      return `${loaded} loaded${timePart}`;
    }

    if (status === LOADING_STATES.ERROR) {
      const timePart = elapsed ? ` · ${elapsed}s` : '';
      return `Failed${timePart}`;
    }

    return "";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: COLORS.sectionBg }}
      data-testid="loading-screen"
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl shadow-lg"
        style={{ backgroundColor: COLORS.lightBg }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={GENIE_LOGO_URL}
            alt="Genie Logo"
            className="h-20 w-auto"
            data-testid="loading-logo"
          />
        </div>

        <p
          className="text-center text-sm mb-8"
          style={{ color: COLORS.grayText }}
        >
          Please wait while we set up your system
        </p>

        {/* Loading Checklist */}
        <div className="space-y-3 mb-8">
          {API_LOADING_ORDER.map((item) => {
            const statusObj = loadingStatus[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{
                  backgroundColor: statusObj.status === LOADING_STATES.SUCCESS
                    ? 'rgba(34, 197, 94, 0.1)'
                    : statusObj.status === LOADING_STATES.ERROR
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'transparent'
                }}
                data-testid={`loading-item-${item.key}`}
              >
                {getStatusIcon(statusObj.status)}
                <span
                  className="flex-1 text-sm"
                  style={{
                    color: statusObj.status === LOADING_STATES.SUCCESS
                      ? COLORS.primaryGreen
                      : statusObj.status === LOADING_STATES.ERROR
                      ? '#ef4444'
                      : COLORS.darkText
                  }}
                >
                  {item.label}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: statusObj.status === LOADING_STATES.SUCCESS
                      ? COLORS.primaryGreen
                      : statusObj.status === LOADING_STATES.ERROR
                      ? '#ef4444'
                      : COLORS.grayText
                  }}
                >
                  {getCountText(statusObj)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: COLORS.grayText }}>Progress</span>
            <span style={{ color: COLORS.darkText }}>{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: hasError ? '#ef4444' : COLORS.primaryGreen
              }}
            />
          </div>
        </div>

        {/* Error State — show error detail + Retry button */}
        {isComplete && hasError && (
          <div className="space-y-3">
            {/* Show error messages for failed items */}
            {API_LOADING_ORDER.filter(i => loadingStatus[i.key].status === LOADING_STATES.ERROR).map(item => (
              <div key={item.key} className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                <span className="font-semibold">{item.label}:</span>{' '}
                {loadingStatus[item.key].error || 'Unknown error'}
              </div>
            ))}
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: COLORS.primaryOrange }}
              data-testid="retry-button"
            >
              Retry Failed ({API_LOADING_ORDER.filter(i => loadingStatus[i.key].status === LOADING_STATES.ERROR).length})
            </button>
          </div>
        )}

        {/* Success State */}
        {isComplete && !hasError && (
          <p
            className="text-center text-sm"
            style={{ color: COLORS.primaryGreen }}
          >
            All data loaded! Redirecting...
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingPage;
