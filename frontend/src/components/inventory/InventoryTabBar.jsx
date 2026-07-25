// CR-081 Phase A: Inventory Tab Bar — horizontal pill navigation across all inventory screens
// Mockup: cr072-inventory-mockup-v5-full.html (OPERATIONS + SETUP groups)
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, Sparkles, Truck } from 'lucide-react';
import { useRestaurant } from '../../contexts/RestaurantContext';

const TABS = [
  // OPERATIONS
  { id: 'dashboard',       label: 'Dashboard',      path: '/inventory-dashboard',                group: 'OPERATIONS', icon: Brain },
  { id: 'current-stock',   label: 'Current Stock',  path: '/inventory-current-stock',            group: 'OPERATIONS' },
  { id: 'smart-purchase',  label: 'Smart Purchase', path: '/inventory-smart-purchase',           group: 'OPERATIONS', icon: Sparkles },
  { id: 'receive',         label: 'Receive',        path: '/inventory-receive',                  group: 'OPERATIONS', icon: Truck, franchiseOnly: true },
  { id: 'audit',           label: 'Stock Audit',    path: '/inventory-audit',                    group: 'OPERATIONS' },
  // SETUP
  { id: 'ingredients',     label: 'Ingredients',    path: '/inventory-setup?tab=ingredients',    group: 'SETUP' },
  { id: 'recipes',         label: 'Recipes',        path: '/recipes',                            group: 'SETUP' },
  { id: 'vendors',         label: 'Vendors',        path: '/inventory-setup?tab=vendors',        group: 'SETUP' },
  { id: 'wastage',         label: 'Wastage Reasons',path: '/inventory-setup?tab=wastage',        group: 'SETUP' },
];

// CR-081: Pill tab bar component
const InventoryTabBar = ({ active, pendingReceiveCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurant } = useRestaurant();
  const restaurantType = restaurant?.restaurantTypeFlag || 'normal';
  const isFranchiseOrMaster = restaurantType === 'franchise' || restaurantType === 'master';

  const handleClick = (tab) => {
    if (tab.path.includes('?')) {
      const [base, query] = tab.path.split('?');
      navigate(`${base}?${query}`);
    } else {
      navigate(tab.path);
    }
  };

  // Determine active tab from prop or current URL
  const getActiveId = () => {
    if (active) return active;
    const p = location.pathname;
    const q = new URLSearchParams(location.search).get('tab');
    if (p === '/inventory-setup' && q) return q === 'vendors' ? 'vendors' : q === 'wastage' ? 'wastage' : 'ingredients';
    if (p === '/inventory-setup') return 'ingredients';
    const match = TABS.find(t => !t.path.includes('?') && p === t.path);
    return match?.id || 'dashboard';
  };
  const activeId = getActiveId();

  const operations = TABS.filter(t => t.group === 'OPERATIONS');
  const setup = TABS.filter(t => t.group === 'SETUP');

  const renderPill = (tab) => {
    // CR-081: hide Receive for normal restaurants
    if (tab.franchiseOnly && !isFranchiseOrMaster) return null;
    const isActive = activeId === tab.id;
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        onClick={() => handleClick(tab)}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
        style={{
          background: isActive ? '#1A1A1A' : 'transparent',
          color: isActive ? '#FFFFFF' : '#666',
          border: isActive ? 'none' : '1px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = '#FF6B00'; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'transparent'; }}
        data-testid={`nav-${tab.id}`}
      >
        {Icon && <Icon className="w-3.5 h-3.5" style={{ opacity: 0.8 }} />}
        {tab.label}
        {tab.id === 'receive' && pendingReceiveCount > 0 && (
          <span className="ml-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none"
                data-testid="nav-receive-badge">
            {pendingReceiveCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-1 px-4 py-2 border-b bg-white overflow-x-auto"
      style={{ borderColor: '#E5E5E5' }}
      data-testid="inventory-tab-bar"
    >
      {/* OPERATIONS group */}
      <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: '#999' }}>Operations</span>
      {operations.map(renderPill)}

      {/* Divider */}
      <div className="w-px h-5 mx-2 flex-shrink-0" style={{ background: '#E0E0E0' }} />

      {/* SETUP group */}
      <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: '#999' }}>Setup</span>
      {setup.map(renderPill)}
    </div>
  );
};

export default InventoryTabBar;
