// ReportTabs - 7 tabs with underline style and color coding
// Phase 4A: Order Reports - Step 3

import { useState } from 'react';

/**
 * Tab configuration with colors from design_guidelines.json
 */
const TABS = [
  { id: 'all', label: 'All Orders', color: 'bg-zinc-800', textColor: 'text-zinc-800', borderColor: 'border-zinc-800' },
  { id: 'paid', label: 'Paid', color: 'bg-blue-600', textColor: 'text-blue-600', borderColor: 'border-blue-600' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-600', textColor: 'text-red-600', borderColor: 'border-red-600' },
  { id: 'credit', label: 'Credit', color: 'bg-purple-600', textColor: 'text-purple-600', borderColor: 'border-purple-600' },
  { id: 'hold', label: 'On Hold', color: 'bg-amber-500', textColor: 'text-amber-500', borderColor: 'border-amber-500' },
  { id: 'merged', label: 'Merged', color: 'bg-teal-600', textColor: 'text-teal-600', borderColor: 'border-teal-600' },
  { id: 'roomTransfer', label: 'Room Transfer', color: 'bg-indigo-600', textColor: 'text-indigo-600', borderColor: 'border-indigo-600' },
  { id: 'aggregator', label: 'Aggregator', color: 'bg-orange-500', textColor: 'text-orange-500', borderColor: 'border-orange-500' },
];

/**
 * ReportTabs Component
 * Architectural underline style tabs per design guidelines
 * 
 * @param {string} activeTab - Current active tab id
 * @param {function} onTabChange - Callback when tab changes
 * @param {object} tabCounts - Optional counts per tab { paid: 88, cancelled: 11, ... }
 */
const ReportTabs = ({ activeTab, onTabChange, tabCounts = {} }) => {
  return (
    <div 
      className="border-b border-zinc-200"
      data-testid="report-tabs"
    >
      <nav className="flex items-center gap-1" aria-label="Report tabs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`
                relative px-4 py-3 text-sm font-medium transition-colors
                border-b-2 -mb-[1px]
                ${isActive 
                  ? `${tab.textColor} ${tab.borderColor}` 
                  : 'text-zinc-500 border-transparent hover:text-zinc-700 hover:border-zinc-300'
                }
              `}
              aria-selected={isActive}
              role="tab"
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {count !== undefined && (
                  <span 
                    className={`
                      text-xs px-1.5 py-0.5 rounded-sm font-mono
                      ${isActive 
                        ? `${tab.color} text-white` 
                        : 'bg-zinc-100 text-zinc-600'
                      }
                    `}
                  >
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

/**
 * Get tab configuration by id
 */
export const getTabConfig = (tabId) => {
  return TABS.find(t => t.id === tabId) || TABS[0];
};

/**
 * Get all tab ids
 */
export const TAB_IDS = TABS.map(t => t.id);

export default ReportTabs;
