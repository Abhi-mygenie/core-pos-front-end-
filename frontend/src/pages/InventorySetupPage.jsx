// CR-072: Inventory Setup Page
// BUG-196: Added Sidebar navigation
// CR-081: +InventoryTabBar + query param tab routing
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import InventorySetupPanel from '@/components/inventory/InventorySetupPanel';
import InventoryTabBar from '@/components/inventory/InventoryTabBar'; // CR-081

export default function InventorySetupPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'ingredients'; // CR-081: default to ingredients
  // CR-081: map query param to tab bar active id
  const activeTab = tabParam === 'vendors' ? 'vendors' : tabParam === 'wastage' ? 'wastage' : 'ingredients';
  return (
    <div className="flex h-screen" data-testid="inventory-setup-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <InventoryTabBar active={activeTab} />
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Inventory Setup
            </h1>
          </div>
          <InventorySetupPanel defaultTab={activeTab} />
        </div>
      </main>
    </div>
  );
}
