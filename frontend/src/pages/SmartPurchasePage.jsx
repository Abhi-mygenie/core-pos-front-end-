// CR-078 · Smart Purchase Page (thin wrapper)
// CR-081: +InventoryTabBar
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import SmartPurchasePanel from '@/components/inventory/SmartPurchasePanel';
import InventoryTabBar from '@/components/inventory/InventoryTabBar'; // CR-081

export default function SmartPurchasePage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="smart-purchase-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <InventoryTabBar active="smart-purchase" />
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Smart Purchase
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Pick a horizon, review suggestions, submit purchases by vendor.</p>
              </div>
            </div>
          </div>
          <SmartPurchasePanel />
        </div>
      </main>
    </div>
  );
}
