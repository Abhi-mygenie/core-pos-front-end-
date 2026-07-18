// CR-072: Inventory Setup Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { Settings } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import InventorySetupPanel from '@/components/inventory/InventorySetupPanel';

export default function InventorySetupPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="inventory-setup-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Inventory Setup
            </h1>
          </div>
          <InventorySetupPanel />
        </div>
      </main>
    </div>
  );
}
