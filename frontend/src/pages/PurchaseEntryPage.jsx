// CR-072: Purchase Entry Page
import { ShoppingCart } from 'lucide-react';
import PurchaseEntryPanel from '@/components/inventory/PurchaseEntryPanel';

export default function PurchaseEntryPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="purchase-entry-page">
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
    </div>
  );
}
