// CR-077 Phase 1: Receive Stock Panel — queue tabs + transfer table
// Design: pixel-match v5 mockup #screen-receive
import { useState, useEffect, useCallback } from 'react';
import { Truck, Store, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRestaurant } from '@/contexts/RestaurantContext';
import * as transferService from '@/api/services/inventoryTransferService';
import ReceiveDrawer from './ReceiveDrawer';

const STATUS_BADGE = {
  dispatched:  'bg-blue-100 text-blue-700',
  received:    'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
  partially_received: 'bg-amber-100 text-amber-700',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${months[d.getMonth()]} ${d.getDate()} · ${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function statusLabel(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ReceiveStockPanel() {
  const { restaurant, restaurantTypeFlag } = useRestaurant() || {};
  const [queues, setQueues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('receivePending');
  const [selectedTransferId, setSelectedTransferId] = useState(null);

  const parentName = restaurant?.name || 'Parent Kitchen';
  const parentId = restaurant?.parentRestaurantId || '—';
  const restaurantName = restaurant?.name || 'Restaurant';
  const flagLabel = restaurantTypeFlag === 'franchise' ? 'Franchise' : restaurantTypeFlag === 'master' ? 'Master' : '';

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transferService.getPendingQueues();
      setQueues(data);
    } catch (e) {
      toast.error(e?.readableMessage || 'Failed to load transfer queues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueues(); }, [fetchQueues]);

  const tabs = [
    { key: 'receivePending', label: 'Receive Pending', testId: 'tab-receive-pending' },
    { key: 'disputePending', label: 'Dispute Pending', testId: 'tab-dispute-pending', disabled: true },
    { key: 'myRequests', label: 'My Requests', testId: 'tab-my-requests' },
    { key: 'approvalPending', label: 'Approval Pending', testId: 'tab-approval-pending', disabled: true },
  ];

  const currentItems = queues?.[activeTab] || [];

  const handleAction = () => {
    setSelectedTransferId(null);
    fetchQueues();
  };

  return (
    <div data-testid="receive-stock-panel">
      {/* Header — mockup exact */}
      <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <Truck className="w-6 h-6 text-orange-500" />
            Receive Dispatched Stock
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Store className="w-3.5 h-3.5" />
            {restaurantName} <span className="text-amber-600 font-semibold">({flagLabel})</span> · dispatched from parent restaurant <span className="font-mono">#{parentId}</span>
          </p>
        </div>
        <div className="text-[11px] text-slate-500 italic flex items-center gap-1">
          <Info className="w-3 h-3" />
          This screen only appears when <code className="font-mono">restaurant_type_flag = franchise|master</code>
        </div>
      </div>

      {/* Tabs — mockup exact */}
      <div className="bg-white rounded-t-xl border border-slate-200 border-b-0 px-4 pt-3 flex gap-1 flex-wrap" data-testid="receive-tabs">
        {tabs.map(tab => {
          const count = (queues?.[tab.key] || []).length;
          const isActive = activeTab === tab.key;
          const isDisabled = tab.disabled;
          return (
            <button
              key={tab.key}
              data-testid={tab.testId}
              onClick={() => !isDisabled && setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive ? 'font-semibold border-orange-500 text-orange-500' :
                isDisabled ? 'text-slate-300 border-transparent cursor-not-allowed' :
                'text-slate-500 hover:text-slate-800 border-transparent'
              }`}
              disabled={isDisabled}
            >
              {tab.label}
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Queue Table — mockup exact */}
      <div className="bg-white rounded-b-xl border border-slate-200 overflow-hidden mb-4">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading transfers…
          </div>
        ) : currentItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 italic" data-testid="receive-empty">
            No {tabs.find(t => t.key === activeTab)?.label?.toLowerCase() || 'pending'} transfers
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] border-b border-slate-200 text-[11px] uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3 font-semibold">Reference</th>
                <th className="p-3 font-semibold">From</th>
                <th className="p-3 font-semibold text-center">Dispatched</th>
                <th className="p-3 font-semibold text-center">Lines / Items</th>
                <th className="p-3 font-semibold text-center">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentItems.map(t => (
                <tr
                  key={t.transferId}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedTransferId(t.transferId)}
                  data-testid={`transfer-row-${t.transferId}`}
                >
                  <td className="p-3">
                    <div className="font-semibold text-orange-500 font-mono">{t.referenceCode}</div>
                    <div className="text-[11px] text-slate-500">ID: {t.transferId}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{parentName}</div>
                    <div className="text-[11px] text-slate-500">Restaurant #{t.fromRestaurantId}</div>
                  </td>
                  <td className="p-3 text-center text-slate-500 text-xs">{formatDate(t.createdAt)}</td>
                  <td className="p-3 text-center">
                    <span className="font-semibold">{t.lineCount}</span> lines · <span className="font-semibold">{t.itemsCount}</span> items
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[t.status] || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="text-orange-500 text-sm font-semibold hover:underline"
                      data-testid={`open-drawer-${t.transferId}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedTransferId(t.transferId); }}
                    >
                      Open Drawer →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && currentItems.length > 0 && (
        <div className="text-[11px] text-slate-500 italic text-center py-2">
          Click any row to open the Receive Drawer
        </div>
      )}

      {/* Drawer */}
      {selectedTransferId && (
        <ReceiveDrawer
          transferId={selectedTransferId}
          parentName={parentName}
          parentId={parentId}
          onClose={() => setSelectedTransferId(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
