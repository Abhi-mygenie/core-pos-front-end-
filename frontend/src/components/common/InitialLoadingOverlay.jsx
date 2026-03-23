import { COLORS } from '../../constants';
import { Check, Loader2 } from 'lucide-react';

// Define loading steps with their labels
const LOADING_STEPS = [
  { id: 'tables', label: 'Tables & Rooms' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Menu Items' },
  { id: 'settings', label: 'Settings' },
  { id: 'orders', label: 'Orders' },
];

const InitialLoadingOverlay = ({ 
  isLoading, 
  progress, 
  currentStep, 
  completedSteps, 
  loadingStats,
  error,
  retryCount,
  maxRetries
}) => {
  // Don't render if not loading
  if (!isLoading) return null;

  // Get detailed label for current step
  const getStepLabel = (step) => {
    const stats = loadingStats || {};
    
    switch (step.id) {
      case 'tables':
        const tablesCount = stats.tables?.loaded || 0;
        const roomsCount = stats.rooms?.loaded || 0;
        if (tablesCount > 0 || roomsCount > 0) {
          return `${tablesCount} Tables, ${roomsCount} Rooms loaded`;
        }
        return 'Loading tables & rooms...';
      
      case 'categories':
        const catCount = stats.categories?.loaded || 0;
        const catTotal = stats.categories?.total || 0;
        if (catCount > 0) {
          return `${catCount} of ${catTotal} Categories loaded`;
        }
        return 'Loading categories...';
      
      case 'products':
        const prodCount = stats.products?.loaded || 0;
        const prodTotal = stats.products?.total || 0;
        if (prodCount > 0) {
          return `${prodCount} of ${prodTotal} Menu Items loaded`;
        }
        return 'Loading menu items...';
      
      case 'settings':
        const reasonsCount = stats.cancellationReasons?.loaded || 0;
        if (reasonsCount > 0) {
          return `${reasonsCount} Settings loaded`;
        }
        return 'Loading settings...';
      
      case 'orders':
        const ordersCount = stats.orders?.loaded || 0;
        if (ordersCount > 0) {
          return `${ordersCount} Orders loaded`;
        }
        return 'Loading orders...';
      
      default:
        return step.label;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: COLORS.lightBg }}
      data-testid="initial-loading-overlay"
    >
      <div className="w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
          >
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 
            className="text-2xl font-bold"
            style={{ color: COLORS.darkText }}
          >
            MyGenie POS
          </h1>
          <p 
            className="text-sm mt-2"
            style={{ color: COLORS.grayText }}
          >
            {retryCount > 0 
              ? `Retrying... (Attempt ${retryCount + 1} of ${maxRetries})`
              : 'Setting up your restaurant...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div 
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${progress}%`,
                backgroundColor: COLORS.primaryGreen 
              }}
            />
          </div>
          <div 
            className="text-center mt-2 text-sm font-medium"
            style={{ color: COLORS.primaryGreen }}
          >
            {progress}%
          </div>
        </div>

        {/* Loading Steps with Detailed Stats */}
        <div className="space-y-3">
          {LOADING_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;

            return (
              <div 
                key={step.id}
                className="flex items-center gap-3"
                data-testid={`loading-step-${step.id}`}
              >
                {/* Icon */}
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {isCompleted ? (
                    <Check 
                      className="w-5 h-5" 
                      style={{ color: COLORS.primaryGreen }} 
                    />
                  ) : isCurrent ? (
                    <Loader2 
                      className="w-5 h-5 animate-spin" 
                      style={{ color: COLORS.primaryOrange }} 
                    />
                  ) : (
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS.borderGray }}
                    />
                  )}
                </div>

                {/* Label with Stats */}
                <span 
                  className="text-sm"
                  style={{ 
                    color: isCompleted 
                      ? COLORS.primaryGreen 
                      : isCurrent 
                        ? COLORS.darkText 
                        : COLORS.grayText,
                    fontWeight: isCurrent ? 500 : 400
                  }}
                >
                  {isCompleted || isCurrent ? getStepLabel(step) : step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary after loading */}
        {completedSteps.length === LOADING_STEPS.length && loadingStats && (
          <div 
            className="mt-6 p-4 rounded-lg text-center"
            style={{ backgroundColor: `${COLORS.primaryGreen}10` }}
          >
            <p className="text-sm font-medium" style={{ color: COLORS.primaryGreen }}>
              ✓ All data loaded successfully!
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
              {loadingStats.tables?.loaded || 0} tables • {loadingStats.categories?.loaded || 0} categories • {loadingStats.products?.loaded || 0} items
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div 
            className="mt-6 p-4 rounded-lg text-center"
            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
          >
            <p className="text-sm font-medium">
              {retryCount < maxRetries ? 'Connection issue' : 'Failed to load data'}
            </p>
            <p className="text-xs mt-1">{error}</p>
            {retryCount >= maxRetries && (
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialLoadingOverlay;
