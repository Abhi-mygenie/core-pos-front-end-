// CR-079: Inventory Current Stock Page (renamed from InventoryDashboardPage)
// CR-072: Original — page shell with Sidebar
// BUG-196: Sidebar navigation
import { useState } from 'react';
import { Package } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import CurrentStockPanel from '@/components/inventory/CurrentStockPanel';

export default function InventoryCurrentStockPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="inventory-current-stock-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Current Stock
              </h1>
            </div>
          </div>
          <CurrentStockPanel />
        </div>
      </main>
    </div>
  );
}
