// CR-077: Receive Stock Page — franchise/master outlets only
// CR-081: +InventoryTabBar
import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import ReceiveStockPanel from '@/components/inventory/ReceiveStockPanel';
import InventoryTabBar from '@/components/inventory/InventoryTabBar'; // CR-081

export default function InventoryReceivePage() {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto">
        <InventoryTabBar active="receive" />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <ReceiveStockPanel />
        </div>
      </main>
    </div>
  );
}
