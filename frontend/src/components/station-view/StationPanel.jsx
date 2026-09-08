// Station Panel Component - Displays aggregated kitchen station items

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchStationData } from '../../api/services/stationService';
import { useStations, useMenu } from '../../contexts';
import { useStationSocketRefresh } from '../../hooks/useStationSocketRefresh';

// DENSITY_PROTOTYPE (Apr-2026): runtime A/B between three vertical-density
// presets. Pure visual — no logic change. User picks one; we'll lock it
// as the default and remove the toggle once chosen.
const DENSITY_KEY = 'mygenie_station_density';
const DENSITY = {
  comfortable: {
    label: 'Comfortable',
    panelW: '280px', panelMinW: '280px', panelMaxW: '320px',
    headerPad: 'p-3', headerIcon: 'text-xl', headerName: 'text-lg',
    headerCount: 'text-sm', headerCountPad: 'px-2 py-0.5',
    catPad: 'py-2 px-3', catName: 'text-sm', catCount: 'text-xs',
    catCountPad: 'px-2 py-0.5', catTint: '10', catBorder: '3px',
    itemPad: 'py-1.5 px-3 pl-6', itemName: 'text-sm', itemCount: 'text-sm',
    itemCountW: 'min-w-[32px]', itemDivMx: 'mx-2',
    catGap: 'mb-1',
    showModifiers: true,
  },
  compact: {
    label: 'Compact',
    panelW: '240px', panelMinW: '220px', panelMaxW: '260px',
    headerPad: 'p-2', headerIcon: 'text-base', headerName: 'text-sm',
    headerCount: 'text-xs', headerCountPad: 'px-1.5 py-0',
    catPad: 'py-1 px-2', catName: 'text-xs', catCount: 'text-[10px]',
    catCountPad: 'px-1.5 py-0', catTint: '08', catBorder: '2px',
    itemPad: 'py-0.5 px-2 pl-3', itemName: 'text-xs', itemCount: 'text-xs',
    itemCountW: 'min-w-[24px]', itemDivMx: 'mx-1.5',
    catGap: 'mb-0.5',
    showModifiers: false,
  },
  ultra: {
    label: 'Ultra',
    panelW: '210px', panelMinW: '200px', panelMaxW: '230px',
    headerPad: 'px-2 py-1', headerIcon: 'text-sm', headerName: 'text-xs',
    headerCount: 'text-[10px]', headerCountPad: 'px-1 py-0',
    catPad: 'py-0.5 px-2', catName: 'text-[11px]', catCount: 'text-[9px]',
    catCountPad: 'px-1 py-0', catTint: '06', catBorder: '2px',
    itemPad: 'py-0 px-2 pl-2.5', itemName: 'text-[11px]', itemCount: 'text-[11px]',
    itemCountW: 'min-w-[20px]', itemDivMx: 'mx-1',
    catGap: 'mb-0',
    showModifiers: false,
  },
};

// Color scheme matching the app
const COLORS = {
  primaryOrange: '#F27329',
  primaryGreen: '#2E7D32',
  darkText: '#1a1a1a',
  grayText: '#666666',
  lightBg: '#f8f9fa',
  borderGray: '#e0e0e0',
  white: '#ffffff',
};

// Category colors (cycle through these)
const CATEGORY_COLORS = [
  '#F27329', // Orange
  '#8B4513', // Brown
  '#DC3545', // Red
  '#28A745', // Green
  '#6C63FF', // Purple
  '#17A2B8', // Teal
  '#E91E63', // Pink
  '#FF9800', // Amber
];

/**
 * Get color for category based on index
 */
const getCategoryColor = (index) => {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

/**
 * Station Item Row - Single item with dotted line and count.
 * BUG-026: Variant inline on main line + addon/notes sub-lines, but ONLY in
 * comfortable density. Compact/Ultra render name-only (rows still split by
 * signature so counts remain correct).
 */
const StationItemRow = ({ itemName, count, density, variantLabel, addonLabel, notes }) => {
  const showModifiers = density.showModifiers;
  const mainLabel = (showModifiers && variantLabel)
    ? `${itemName} — ${variantLabel}`
    : itemName;

  return (
    <div
      className={`flex flex-col ${density.itemPad}`}
      style={{ borderBottom: `1px solid ${COLORS.borderGray}20` }}
    >
      <div className="flex items-center">
        {/* Item Name (with optional variant inline in comfortable density) */}
        <span className={`${density.itemName} break-words`} style={{ color: COLORS.darkText }}>
          {mainLabel}
        </span>

        {/* Dotted line — fills remaining space; shrinks to 0 if name is long */}
        <div
          className={`flex-1 ${density.itemDivMx} border-b border-dotted`}
          style={{ borderColor: COLORS.grayText, minWidth: '8px' }}
        />

        {/* Quantity */}
        <span
          className={`${density.itemCount} font-semibold ${density.itemCountW} text-center flex-shrink-0`}
          style={{ color: COLORS.primaryGreen }}
        >
          {count}
        </span>
      </div>

      {/* Add-on sub-line (comfortable only) */}
      {showModifiers && addonLabel && (
        <div className="text-[11px] italic mt-0.5" style={{ color: COLORS.grayText }}>
          {addonLabel}
        </div>
      )}

      {/* Notes sub-line (comfortable only) */}
      {showModifiers && notes && (
        <div className="text-[11px] italic mt-0.5" style={{ color: COLORS.grayText }}>
          Note: {notes}
        </div>
      )}
    </div>
  );
};

/**
 * Category Section - Category header + items (Option C style)
 */
const CategorySection = ({ category, categoryIndex, displayMode, density }) => {
  const [expanded, setExpanded] = useState(true);
  const categoryColor = getCategoryColor(categoryIndex);

  // In stacked mode, always expanded. In accordion mode, toggle.
  const isExpanded = displayMode === 'stacked' ? true : expanded;

  const handleToggle = () => {
    if (displayMode === 'accordion') {
      setExpanded(!expanded);
    }
  };

  return (
    <div className={density.catGap}>
      {/* Category Header Row */}
      <div 
        className={`flex items-center justify-between ${density.catPad} ${displayMode === 'accordion' ? 'cursor-pointer' : ''}`}
        style={{ 
          backgroundColor: `${categoryColor}${density.catTint}`,
          borderLeft: `${density.catBorder} solid ${categoryColor}`,
        }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {displayMode === 'accordion' && (
            isExpanded 
              ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: categoryColor }} />
              : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: COLORS.grayText }} />
          )}
          <span className={`${density.catName} font-semibold break-words`} style={{ color: categoryColor }}>
            {category.name}
          </span>
        </div>
        <span 
          className={`${density.catCount} font-bold ${density.catCountPad} rounded-full flex-shrink-0`}
          style={{ 
            backgroundColor: categoryColor,
            color: COLORS.white,
          }}
        >
          {category.totalCount}
        </span>
      </div>
      
      {/* Items */}
      {isExpanded && (
        <div>
          {category.items.map((item, idx) => (
            <StationItemRow
              key={idx}
              itemName={item.name}
              count={item.count}
              variantLabel={item.variantLabel}
              addonLabel={item.addonLabel}
              notes={item.notes}
              density={density}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Single Station Panel
 */
const SingleStationPanel = ({ stationName, stationIcon, data, loading, error, displayMode, onRefresh, density }) => {
  return (
    <div 
      className="flex flex-col"
      style={{ 
        backgroundColor: COLORS.white,
        borderBottom: `1px solid ${COLORS.borderGray}`,
      }}
    >
      {/* Station Header */}
      <div 
        className={`flex items-center justify-between ${density.headerPad} sticky top-0 z-10`}
        style={{ 
          backgroundColor: COLORS.white,
          borderBottom: `2px solid ${COLORS.primaryOrange}`,
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={density.headerIcon}>{stationIcon}</span>
          <span className={`font-bold ${density.headerName} break-words`} style={{ color: COLORS.darkText }}>
            {stationName}
          </span>
          {data?.totalItems > 0 && (
            <span 
              className={`${density.headerCount} font-bold ${density.headerCountPad} rounded-full flex-shrink-0`}
              style={{ 
                backgroundColor: COLORS.primaryOrange,
                color: COLORS.white,
              }}
            >
              {data.totalItems}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
          disabled={loading}
        >
          <RefreshCw 
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} 
            style={{ color: COLORS.grayText }}
          />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto">
        {loading && !data?.categories?.length && (
          <div className="flex items-center justify-center h-16">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />
          </div>
        )}

        {error && (
          <div 
            className="flex items-center gap-2 p-2 rounded m-1"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs">Failed to load station data</span>
          </div>
        )}

        {!loading && !error && data?.categories?.length === 0 && (
          <div 
            className="flex flex-col items-center justify-center h-16 text-center"
            style={{ color: COLORS.grayText }}
          >
            <span className="text-lg mb-0.5">✓</span>
            <span className="text-xs">No pending items</span>
          </div>
        )}

        {data?.categories?.map((category, idx) => (
          <CategorySection
            key={idx}
            category={category}
            categoryIndex={idx}
            displayMode={displayMode}
            density={density}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Station Panel Container - Main component
 * Reads data from StationContext (loaded at app start)
 */
const StationPanel = ({ className = '' }) => {
  const { 
    enabledStations, 
    stationData, 
    stationViewEnabled, 
    displayMode,
    isLoading,
    setAllStationData 
  } = useStations();
  
  // Get categories from MenuContext for lookup
  const { categories } = useMenu();

  // Station icons mapping
  const stationIcons = {
    KDS: '🍳',
    BAR: '🍺',
    GRILL: '🔥',
    DEFAULT: '📋',
  };

  // Build categories map for lookup
  const categoriesMap = React.useMemo(() => {
    const map = {};
    if (categories && Array.isArray(categories)) {
      categories.forEach(cat => {
        if (cat.categoryId) {
          map[cat.categoryId] = cat.name;
          map[String(cat.categoryId)] = cat.name;
        }
      });
    }
    return map;
  }, [categories]);

  // Refresh handler - re-fetch station data
  const handleRefresh = useCallback(async () => {
    if (!enabledStations?.length) return;
    
    try {
      const stationDataPromises = enabledStations.map(station => 
        fetchStationData(station, categoriesMap)
      );
      const results = await Promise.all(stationDataPromises);
      
      const newData = {};
      enabledStations.forEach((station, idx) => {
        newData[station] = results[idx];
      });
      
      setAllStationData(newData);
    } catch (error) {
      console.error('[StationPanel] Error refreshing data:', error);
    }
  }, [enabledStations, setAllStationData, categoriesMap]);

  // Don't render if disabled or no stations
  if (!stationViewEnabled || !enabledStations?.length) {
    return null;
  }

  return (
    <StationPanelInner
      className={className}
      stationIcons={stationIcons}
      enabledStations={enabledStations}
      stationData={stationData}
      isLoading={isLoading}
      displayMode={displayMode}
      handleRefresh={handleRefresh}
    />
  );
};

// DENSITY_PROTOTYPE (Apr-2026): inner component owns the density toggle so
// hooks aren't called conditionally above the early-return guard.
const StationPanelInner = ({ className, stationIcons, enabledStations, stationData, isLoading, displayMode, handleRefresh }) => {
  // Subscribe to socket events for live station data refresh.
  // Hook self-guards (isConnected / stationViewEnabled / enabledStations) and
  // is colocated with the panel so listeners only exist while panel is rendered.
  useStationSocketRefresh();

  const [densityKey, setDensityKey] = useState(() => {
    try {
      const stored = localStorage.getItem(DENSITY_KEY);
      if (stored && DENSITY[stored]) return stored;
    } catch (e) { /* ignore */ }
    return 'compact';
  });
  const density = DENSITY[densityKey] || DENSITY.compact;

  const cycleDensity = () => {
    const order = ['comfortable', 'compact', 'ultra'];
    const next = order[(order.indexOf(densityKey) + 1) % order.length];
    setDensityKey(next);
    try { localStorage.setItem(DENSITY_KEY, next); } catch (e) { /* ignore */ }
  };

  return (
    <div 
      className={`flex flex-col overflow-y-auto ${className}`}
      style={{ 
        width: density.panelW,
        minWidth: density.panelMinW,
        maxWidth: density.panelMaxW,
        borderRight: `1px solid ${COLORS.borderGray}`,
      }}
      data-testid="station-panel"
    >
      {/* Density toggle (prototype A/B) — pick one and we'll lock it */}
      <button
        onClick={cycleDensity}
        data-testid="station-density-toggle"
        className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide hover:bg-gray-100 transition-colors sticky top-0 z-20"
        style={{
          backgroundColor: '#FFF8F0',
          color: COLORS.primaryOrange,
          borderBottom: `1px solid ${COLORS.borderGray}`,
        }}
        title="Tap to cycle density"
      >
        <span>Density</span>
        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.primaryOrange, color: COLORS.white }}>
          {density.label}
        </span>
      </button>
      {enabledStations.map((stationName) => (
        <SingleStationPanel
          key={stationName}
          stationName={stationName}
          stationIcon={stationIcons[stationName] || stationIcons.DEFAULT}
          data={stationData[stationName]}
          loading={isLoading}
          error={null}
          displayMode={displayMode}
          onRefresh={handleRefresh}
          density={density}
        />
      ))}
    </div>
  );
};

export default StationPanel;
