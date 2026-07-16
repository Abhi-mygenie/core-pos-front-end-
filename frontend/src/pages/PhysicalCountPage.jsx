// CR-072: Physical Count Page
import { ClipboardCheck } from 'lucide-react';
import PhysicalCountPanel from '@/components/inventory/PhysicalCountPanel';

export default function PhysicalCountPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="physical-count-page">
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
    </div>
  );
}
