import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ReportLoadingShield — wraps the entire main panel of any Insights report.
 *
 * Implements CR_011_LOADING_AND_INTERACTION_SPEC.md §3.1:
 * - First-load: centered "Loading report…" splash
 * - Re-fetch: 60% opacity ghost + 2px animated progress bar
 * - Error: inline red banner with retry CTA above children
 * - Children always rendered (for ghosting); visibility controlled by state
 *
 * Props:
 *   isLoading     — true while fetch is in-flight
 *   hasLoadedOnce — true after first successful response
 *   error         — null | string error message
 *   onRetry       — callback for retry CTA
 *   children      — the report body (header, filters, tabs, table, drill sheet)
 */
const ReportLoadingShield = ({ isLoading, hasLoadedOnce, error, onRetry, children }) => {
  const isFirstLoad = isLoading && !hasLoadedOnce;
  const isRefetching = isLoading && hasLoadedOnce;

  return (
    <div
      className="flex-1 flex flex-col overflow-auto relative"
      aria-busy={isLoading}
      data-testid="reports-loading-shield"
    >
      {/* Progress bar — visible during re-fetch (not first load) */}
      {isRefetching && (
        <div className="h-0.5 w-full bg-zinc-100 shrink-0 overflow-hidden absolute top-0 left-0 right-0 z-20" data-testid="reports-progress-bar">
          <div className="h-full bg-[#F26B33] animate-progress-bar" />
        </div>
      )}

      {/* First-load splash — centered spinner, hides children */}
      {isFirstLoad && (
        <div className="flex-1 flex items-center justify-center" data-testid="reports-first-load-splash">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
            <div>
              <p className="text-base font-medium text-zinc-700">Loading report...</p>
              <p className="text-sm text-zinc-400 mt-1">Fetching data</p>
            </div>
          </div>
        </div>
      )}

      {/* Error banner — sits above children, always visible when error is set */}
      {error && !isLoading && (
        <div className="mx-8 mt-8 mb-0 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shrink-0 z-10" data-testid="reports-error-banner">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Failed to load report data</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors shrink-0"
              data-testid="reports-retry-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Children — always rendered, ghosted during re-fetch, hidden during first load */}
      {!isFirstLoad && (
        <div
          className={isRefetching ? 'opacity-60 pointer-events-none cursor-wait flex-1 flex flex-col' : 'flex-1 flex flex-col'}
          data-testid="reports-content-area"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default ReportLoadingShield;
