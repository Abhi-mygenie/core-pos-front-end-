// CR-139: Sub-Recipe Stock Page — thin wrapper (pattern: StockAuditPage.jsx)
import { useState } from 'react';
import { Layers } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import SubRecipeStockPanel from '@/components/inventory/SubRecipeStockPanel';
import InventoryTabBar from '@/components/inventory/InventoryTabBar';

export default function SubRecipeStockPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="sub-recipe-stock-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <InventoryTabBar active="sub-recipe-stock" />
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
                <Layers className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900"
                  style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Sub-Recipe Stock
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Add or adjust stock quantities for sub-recipes</p>
              </div>
            </div>
          </div>
          <SubRecipeStockPanel />
        </div>
      </main>
    </div>
  );
}
