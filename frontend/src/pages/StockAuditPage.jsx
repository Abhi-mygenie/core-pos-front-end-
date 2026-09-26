// CR-079: Stock Audit Page (renamed from PhysicalCountPage · absorbs CR-075-B rename)
// CR-072: Original — page shell with Sidebar
// BUG-196: Sidebar navigation
// CR-081: +InventoryTabBar
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import StockAuditPanel from '@/components/inventory/StockAuditPanel';
import InventoryTabBar from '@/components/inventory/InventoryTabBar'; // CR-081

export default function StockAuditPage() {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  return (
    <div className="flex h-screen" data-testid="stock-audit-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <InventoryTabBar active="audit" />
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Stock Audit
              </h1>
            </div>
          </div>
          <StockAuditPanel />
        </div>
      </main>
    </div>
  );
}
