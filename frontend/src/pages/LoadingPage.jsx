import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../constants";
import { useToast } from "../hooks/use-toast";
import { API_LOADING_ORDER, LOADING_STATES } from "../api/constants";
import { useAuth, useRestaurant, useMenu, useTables, useSettings } from "../contexts";
import * as authService from "../api/services/authService";
import * as profileService from "../api/services/profileService";
import * as categoryService from "../api/services/categoryService";
import * as productService from "../api/services/productService";
import * as tableService from "../api/services/tableService";
import * as settingsService from "../api/services/settingsService";

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
  
  // Loading status for each API with counts
  const [loadingStatus, setLoadingStatus] = useState(
    API_LOADING_ORDER.reduce((acc, item) => {
      acc[item.key] = { status: LOADING_STATES.IDLE, error: null, loaded: 0, total: 0 };
      return acc;
    }, {})
  );
  
  // Ref to track loaded data across the async flow
  const loadedDataRef = useRef({});
  
  // Overall progress
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Check authentication and load data (with StrictMode abort guard)
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/");
      return;
    }
    
    let aborted = false;
    loadAllData(aborted);
    
    return () => { aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (completed === total) {
      const hasAnyError = statuses.some((s) => s.status === LOADING_STATES.ERROR);
      setHasError(hasAnyError);
      setIsComplete(true);
      
      if (!hasAnyError) {
        // Navigate to dashboard after short delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      }
    }
  }, [loadingStatus, navigate]);

  // Update status for a specific API
  const updateStatus = (key, status, error = null, loaded = 0, total = 0) => {
    setLoadingStatus((prev) => ({
      ...prev,
      [key]: { status, error, loaded, total },
    }));
  };

  // Load all APIs in sequence (aborted flag guards against StrictMode double-invoke)
  const loadAllData = async (aborted) => {
    const data = {};
    
    // 1. Profile & Permissions
    updateStatus('profile', LOADING_STATES.LOADING, null, 0, 1);
    try {
      data.profile = await profileService.getProfile();
      if (aborted) return;
      setUserData(data.profile.user, data.profile.permissions);
      setRestaurant(data.profile.restaurant);
      updateStatus('profile', LOADING_STATES.SUCCESS, null, 1, 1);
    } catch (error) {
      if (aborted) return;
      updateStatus('profile', LOADING_STATES.ERROR, error.readableMessage, 0, 1);
      toast({
        title: "Failed to load profile",
        description: error.readableMessage,
        variant: "destructive",
      });
    }

    if (aborted) return;

    // 2. Categories
    updateStatus('categories', LOADING_STATES.LOADING, null, 0, 0);
    try {
      data.categories = await categoryService.getCategories();
      if (aborted) return;
      const count = data.categories?.length || 0;
      updateStatus('categories', LOADING_STATES.SUCCESS, null, count, count);
    } catch (error) {
      if (aborted) return;
      updateStatus('categories', LOADING_STATES.ERROR, error.readableMessage, 0, 0);
      toast({
        title: "Failed to load categories",
        description: error.readableMessage,
        variant: "destructive",
      });
    }

    if (aborted) return;

    // 3. Products
    updateStatus('products', LOADING_STATES.LOADING, null, 0, 0);
    try {
      const productsResponse = await productService.getProducts({ limit: 500, offset: 1, type: 'all' });
      if (aborted) return;
      data.products = productsResponse.products;
      const loadedCount = data.products?.length || 0;
      const totalCount = productsResponse.total || loadedCount;
      
      if (data.categories) {
        data.categories = categoryService.calculateItemCounts(data.categories, data.products);
      }
      updateStatus('products', LOADING_STATES.SUCCESS, null, loadedCount, totalCount);
    } catch (error) {
      if (aborted) return;
      updateStatus('products', LOADING_STATES.ERROR, error.readableMessage, 0, 0);
      toast({
        title: "Failed to load products",
        description: error.readableMessage,
        variant: "destructive",
      });
    }

    if (aborted) return;

    // 4. Tables
    updateStatus('tables', LOADING_STATES.LOADING, null, 0, 0);
    try {
      data.tables = await tableService.getTables(true);
      if (aborted) return;
      const count = data.tables?.length || 0;
      setTables(data.tables);
      updateStatus('tables', LOADING_STATES.SUCCESS, null, count, count);
    } catch (error) {
      if (aborted) return;
      updateStatus('tables', LOADING_STATES.ERROR, error.readableMessage, 0, 0);
      toast({
        title: "Failed to load tables",
        description: error.readableMessage,
        variant: "destructive",
      });
    }

    if (aborted) return;

    // 5. Cancellation Reasons (Settings)
    updateStatus('cancellationReasons', LOADING_STATES.LOADING, null, 0, 0);
    try {
      const reasonsResponse = await settingsService.getCancellationReasons({ limit: 100, offset: 1 });
      if (aborted) return;
      data.cancellationReasons = reasonsResponse.reasons;
      const count = data.cancellationReasons?.length || 0;
      setCancellationReasons(data.cancellationReasons);
      updateStatus('cancellationReasons', LOADING_STATES.SUCCESS, null, count, count);
    } catch (error) {
      if (aborted) return;
      updateStatus('cancellationReasons', LOADING_STATES.ERROR, error.readableMessage, 0, 0);
      toast({
        title: "Failed to load settings",
        description: error.readableMessage,
        variant: "destructive",
      });
    }

    if (aborted) return;

    // 6. Popular Food
    updateStatus('popularFood', LOADING_STATES.LOADING, null, 0, 0);
    try {
      const popularResponse = await productService.getPopularFood({ limit: 50, offset: 1, type: 'all' });
      if (aborted) return;
      data.popularFood = popularResponse.products;
      const loadedCount = data.popularFood?.length || 0;
      const totalCount = popularResponse.total || loadedCount;
      updateStatus('popularFood', LOADING_STATES.SUCCESS, null, loadedCount, totalCount);
    } catch (error) {
      if (aborted) return;
      updateStatus('popularFood', LOADING_STATES.ERROR, error.readableMessage, 0, 0);
      toast({
        title: "Failed to load popular items",
        description: error.readableMessage,
        variant: "destructive",
      });
    }

    if (aborted) return;

    // Dispatch Menu context
    setCategories(data.categories);
    setProducts(data.products);
    setPopularFood(data.popularFood);

    loadedDataRef.current = data;
  };

  // Retry loading
  const handleRetry = () => {
    setLoadingStatus(
      API_LOADING_ORDER.reduce((acc, item) => {
        acc[item.key] = { status: LOADING_STATES.IDLE, error: null, loaded: 0, total: 0 };
        return acc;
      }, {})
    );
    loadedDataRef.current = {};
    setProgress(0);
    setIsComplete(false);
    setHasError(false);
    loadAllData(false);
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

  // Get count display text
  const getCountText = (statusObj) => {
    const { status, loaded, total } = statusObj;
    
    if (status === LOADING_STATES.SUCCESS) {
      if (total > 0 && loaded !== total) {
        return `${loaded} of ${total} loaded`;
      }
      return `${loaded} loaded`;
    }
    
    if (status === LOADING_STATES.LOADING) {
      if (total > 0) {
        return `${loaded} of ${total} loading...`;
      }
      return "Loading...";
    }
    
    if (status === LOADING_STATES.ERROR) {
      return "Failed";
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

        {/* Title */}
        <h1 
          className="text-center text-xl font-semibold mb-2"
          style={{ color: COLORS.darkText }}
        >
          Setting up your POS...
        </h1>
        
        <p 
          className="text-center text-sm mb-8"
          style={{ color: COLORS.grayText }}
        >
          Please wait while we load your data
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

        {/* Error State - Retry Button */}
        {isComplete && hasError && (
          <button
            onClick={handleRetry}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: COLORS.primaryOrange }}
            data-testid="retry-button"
          >
            Retry Loading
          </button>
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
