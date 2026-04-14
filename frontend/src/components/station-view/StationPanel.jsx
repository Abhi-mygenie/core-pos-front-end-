// Station Panel Component - Displays aggregated kitchen station items

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchStationData } from '../../api/services/stationService';
import { useStations, useMenu } from '../../contexts';

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
 * Station Item Row - Single item with dotted line and count
 */
const StationItemRow = ({ itemName, count }) => (
  <div 
    className="flex items-center py-1.5 px-3 pl-6"
    style={{ borderBottom: `1px solid ${COLORS.borderGray}20` }}
  >
    {/* Item Name */}
    <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>
      {itemName}
    </span>
    
    {/* Dotted line */}
    <div 
      className="flex-1 mx-2 border-b border-dotted" 
      style={{ borderColor: COLORS.grayText, minWidth: '20px' }}
    />
    
    {/* Quantity */}
    <span 
      className="text-sm font-semibold min-w-[32px] text-center"
      style={{ color: COLORS.primaryGreen }}
    >
      {count}
    </span>
  </div>
);

/**
 * Category Section - Category header + items (Option C style)
 */
const CategorySection = ({ category, categoryIndex, displayMode }) => {
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
    <div className="mb-1">
      {/* Category Header Row */}
      <div 
        className={`flex items-center justify-between py-2 px-3 ${displayMode === 'accordion' ? 'cursor-pointer' : ''}`}
        style={{ 
          backgroundColor: `${categoryColor}10`,
          borderLeft: `3px solid ${categoryColor}`,
        }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {displayMode === 'accordion' && (
            isExpanded 
              ? <ChevronDown className="w-4 h-4" style={{ color: categoryColor }} />
              : <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />
          )}
          <span className="text-sm font-semibold" style={{ color: categoryColor }}>
            {category.name}
          </span>
        </div>
        <span 
          className="text-xs font-bold px-2 py-0.5 rounded-full"
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
const SingleStationPanel = ({ stationName, stationIcon, data, loading, error, displayMode, onRefresh }) => {
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
        className="flex items-center justify-between p-3 sticky top-0 z-10"
        style={{ 
          backgroundColor: COLORS.white,
          borderBottom: `2px solid ${COLORS.primaryOrange}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{stationIcon}</span>
          <span className="font-bold text-lg" style={{ color: COLORS.darkText }}>
            {stationName}
          </span>
          {data?.totalItems > 0 && (
            <span 
              className="text-sm font-bold px-2 py-0.5 rounded-full"
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
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={loading}
        >
          <RefreshCw 
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
            style={{ color: COLORS.grayText }}
          />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto">
        {loading && !data?.categories?.length && (
          <div className="flex items-center justify-center h-20">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
          </div>
        )}

        {error && (
          <div 
            className="flex items-center gap-2 p-3 rounded-lg m-2"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to load station data</span>
          </div>
        )}

        {!loading && !error && data?.categories?.length === 0 && (
          <div 
            className="flex flex-col items-center justify-center h-20 text-center"
            style={{ color: COLORS.grayText }}
          >
            <span className="text-2xl mb-1">✓</span>
            <span className="text-sm">No pending items</span>
          </div>
        )}

        {data?.categories?.map((category, idx) => (
          <CategorySection
            key={idx}
            category={category}
            categoryIndex={idx}
            displayMode={displayMode}
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
    <div 
      className={`flex flex-col overflow-y-auto ${className}`}
      style={{ 
        width: '280px',
        minWidth: '280px',
        maxWidth: '320px',
        borderRight: `1px solid ${COLORS.borderGray}`,
      }}
      data-testid="station-panel"
    >
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
        />
      ))}
    </div>
  );
};

export default StationPanel;
