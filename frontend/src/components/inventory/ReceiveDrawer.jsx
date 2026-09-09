// CR-077 Phase 1: Receive Drawer — transfer detail view with Accept/Reject
// Design: pixel-match v5 mockup receive-drawer section
import { useState, useEffect } from 'react';
import { PackageOpen, X, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import * as transferService from '@/api/services/inventoryTransferService';

const STATUS_BADGE = {
  dispatched: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-slate-100 text-slate-600',
};

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2,'0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function formatExpiry(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function ReceiveDrawer({ transferId, parentName, parentId, onClose, onAction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    if (!transferId) return;
    setLoading(true);
    transferService.getTransferDetails(transferId)
      .then(d => setData(d))
      .catch(e => toast.error(e?.readableMessage || 'Failed to load transfer details'))
      .finally(() => setLoading(false));
  }, [transferId]);

  const handleReceive = async () => {
    setActing(true);
    try {
      await transferService.receiveTransfer(transferId);
      toast.success('Transfer received successfully');
      onAction?.();
    } catch (e) {
      toast.error(e?.readableMessage || 'Failed to receive transfer');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    setActing(true);
    try {
      await transferService.rejectTransfer(transferId, rejectReason.trim());
      toast.success('Transfer rejected');
      onAction?.();
    } catch (e) {
      toast.error(e?.readableMessage || 'Failed to reject transfer');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-orange-500 p-5 mb-4 flex items-center justify-center py-12 gap-2 text-sm text-slate-400" data-testid="receive-drawer-loading">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading transfer details…
      </div>
    );
  }

  if (!data) return null;

  const { transfer: t, lines } = data;
  const statusCls = STATUS_BADGE[t.status] || STATUS_BADGE.pending;
  const canAct = t.status === 'dispatched';

  return (
    <div className="bg-white rounded-xl border-2 border-orange-500 p-5 mb-4" data-testid="receive-drawer">
      {/* Header — mockup exact */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-lg">{t.referenceCode}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusCls}`}>
              {(t.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Dispatched by parent {parentName} · #{parentId || t.fromRestaurantId} on {formatDisplayDate(t.dispatchedAt)} · {lines.length} line{lines.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="text-slate-500 hover:text-slate-800 p-1" onClick={onClose} data-testid="close-drawer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Line Items Table — mockup exact */}
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <th className="text-left py-2 font-semibold">Item</th>
            <th className="text-right py-2 font-semibold">Requested</th>
            <th className="text-left py-2 font-semibold pl-4">Batch · Expiry</th>
            <th className="text-right py-2 font-semibold">Received Qty</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => {
            const seg = line.segments?.[0];
            const displayQty = Number(line.displayQty) || Number(line.requestedQty) || 0;
            const displayUnit = line.displayUnit || line.requestedUnit || '';
            const rawQty = Number(line.requestedQty) || 0;
            const rawUnit = line.requestedUnit || '';
            const showRaw = displayUnit !== rawUnit && rawQty !== displayQty;

            return (
              <tr key={line.id} className="border-b border-slate-100" data-testid={`drawer-line-${line.id}`}>
                <td className="py-2.5">
                  <div className="font-medium">{line.stockTitle}</div>
                  <div className="text-[11px] text-slate-500">Line {line.lineNo} · Category: {line.categoryId || '—'}</div>
                </td>
                <td className="py-2.5 text-right font-medium">
                  {Number(displayQty).toFixed(2)} {displayUnit}
                  {showRaw && <span className="text-[11px] text-slate-500 ml-1">({rawQty} {rawUnit})</span>}
                </td>
                <td className="py-2.5 pl-4">
                  {seg ? (
                    <>
                      <div className="text-xs font-mono">{seg.batch || '—'}</div>
                      <div className="text-[11px] text-slate-500">exp: {formatExpiry(seg.expiry_date)}</div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  <div className="font-medium">{Number(displayQty).toFixed(2)} {displayUnit}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">unit: {displayUnit} · fully received</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Reject reason input (shown when user clicks Reject) */}
      {showRejectInput && (
        <div className="mb-4 p-3 border border-red-200 rounded-lg bg-red-50/50">
          <label className="text-xs font-semibold text-red-700 block mb-1">Rejection Reason *</label>
          <input
            type="text"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejecting this transfer..."
            className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-200 outline-none"
            data-testid="reject-reason-input"
          />
        </div>
      )}

      {/* Bulk Actions Footer — mockup exact */}
      {canAct && (
        <div className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            One <code className="font-mono">POST /inventory-transfer/receive/{transferId}</code> submits atomically
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-white"
              onClick={onClose}
              data-testid="drawer-cancel"
            >
              Cancel
            </button>
            {!showRejectInput ? (
              <>
                <button
                  className="px-3 py-1.5 border border-red-400 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50"
                  onClick={() => setShowRejectInput(true)}
                  disabled={acting}
                  data-testid="drawer-reject"
                >
                  ✗ Reject All
                </button>
                <button
                  className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  onClick={handleReceive}
                  disabled={acting}
                  data-testid="drawer-submit"
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                  Confirm Receive
                </button>
              </>
            ) : (
              <>
                <button
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-white"
                  onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                >
                  Back
                </button>
                <button
                  className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  onClick={handleReject}
                  disabled={acting || !rejectReason.trim()}
                  data-testid="drawer-confirm-reject"
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                  Confirm Reject
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
