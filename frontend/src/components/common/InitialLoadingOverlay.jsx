import { useEffect } from 'react';
import { COLORS } from '../../constants';
import { Check, Loader2 } from 'lucide-react';

const InitialLoadingOverlay = ({ 
  isLoading, 
  progress, 
  currentStep, 
  completedSteps, 
  loadingSteps,
  error 
}) => {
  // Don't render if not loading
  if (!isLoading) return null;

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
            Setting up your restaurant...
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

        {/* Loading Steps */}
        <div className="space-y-3">
          {loadingSteps.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isPending = !isCompleted && !isCurrent;

            return (
              <div 
                key={step.id}
                className="flex items-center gap-3"
                data-testid={`loading-step-${step.id}`}
              >
                {/* Icon */}
                <div className="w-5 h-5 flex items-center justify-center">
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

                {/* Label */}
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
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="mt-6 p-4 rounded-lg text-center"
            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
          >
            <p className="text-sm font-medium">Failed to load data</p>
            <p className="text-xs mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialLoadingOverlay;
