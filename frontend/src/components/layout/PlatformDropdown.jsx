// PlatformDropdown — POS2-002 Phase 3 (May-2026)
//
// Header-level "Platform" filter on the running dashboard. Narrows the visible
// orders to a single origin axis (POS vs Web/Scan), composing AND with the
// existing status chips, channel column filter, and search.
//
// Owner-locked scope (2026-05-10):
//   - 3 options: "Platform: All" (default, no narrowing) / "POS" / "Web / Scan"
//   - Default value === null (All) on every dashboard mount
//   - Selection persists across tab navigation (state lives on DashboardPage)
//   - Resets to All on full page reload (no localStorage in v1)
//   - Cards are NOT touched in Phase 3 — this dropdown is the only affordance
//
// Predicate (applied by the parent):
//   if (platform === null)  return true;
//   if (platform === 'pos') return order.orderFrom !== 'web';   // future-proof
//   if (platform === 'web') return order.orderFrom === 'web';
//
// Visual: mirrors the POS2-006 PG dropdown (zinc-900 dark pill when active,
// white outlined pill in default state). Sprint-consistent appearance.

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Owner-locked option set (Phase 3 v1). Future BE values (kiosk / aggregator /
// whatsapp / qr_campaign) extend this list — no other code change needed.
export const PLATFORM_OPTIONS = [
  { value: null,  label: 'Platform: All' },
  { value: 'pos', label: 'POS' },
  { value: 'web', label: 'Web / Scan' },
];

const PlatformDropdown = ({ value = null, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = PLATFORM_OPTIONS.find(o => o.value === value) ?? PLATFORM_OPTIONS[0];
  const isActive = value !== null;

  // Trigger label always reads "Platform: <value>" so the active filter is
  // visible at a glance even when the dropdown is collapsed.
  const triggerLabel = isActive ? `Platform: ${selected.label}` : 'Platform: All';

  return (
    <div className="relative" ref={containerRef} data-testid="dashboard-platform-filter-wrapper">
      <button
        type="button"
        data-testid="dashboard-platform-filter"
        data-active={isActive ? 'true' : 'false'}
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-xs font-medium transition-colors whitespace-nowrap
          ${isOpen
            ? 'bg-white border-zinc-950 ring-1 ring-zinc-950 text-zinc-900'
            : isActive
              ? 'bg-zinc-900 border-zinc-900 text-white'
              : 'bg-white border-zinc-300 hover:border-zinc-400 text-zinc-600'
          }`}
      >
        <span>{triggerLabel}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          data-testid="dashboard-platform-filter-panel"
          className="absolute z-50 left-0 mt-1 min-w-[170px] bg-white border border-zinc-200 rounded shadow-lg"
        >
          {PLATFORM_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            const testIdSuffix = option.value === null ? 'all' : option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                data-testid={`dashboard-platform-filter-option-${testIdSuffix}`}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-50 transition-colors
                  ${isSelected ? 'bg-zinc-100 font-medium' : ''}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlatformDropdown;
