// CR-077: Receive Stock Page — franchise/master outlets only
import Sidebar from '@/components/layout/Sidebar';
import ReceiveStockPanel from '@/components/inventory/ReceiveStockPanel';

export default function InventoryReceivePage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <ReceiveStockPanel />
        </div>
      </main>
    </div>
  );
}
