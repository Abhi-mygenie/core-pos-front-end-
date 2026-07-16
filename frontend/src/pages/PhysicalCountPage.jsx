// CR-072: Physical Count Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import PhysicalCountPanel from '@/components/inventory/PhysicalCountPanel';

export default function PhysicalCountPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="physical-count-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Physical Stock Count
              </h1>
            </div>
          </div>
          <PhysicalCountPanel />
        </div>
      </main>
    </div>
  );
}
