// CR-072: Purchase Entry Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import PurchaseEntryPanel from '@/components/inventory/PurchaseEntryPanel';

export default function PurchaseEntryPage() {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  return (
    <div className="flex h-screen" data-testid="purchase-entry-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Add Purchase Entry
            </h1>
          </div>
          <PurchaseEntryPanel />
        </div>
      </main>
    </div>
  );
}
