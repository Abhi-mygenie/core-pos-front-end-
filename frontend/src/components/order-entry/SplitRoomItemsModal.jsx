// CR-163: Modal for splitting selected food items from a room order to a new table.
// Multi-item selection + remark. Entire row is touch target (POS-optimised).
// Mirrors CancelOrderModal + TransferFoodModal structure — COLORS, Tailwind, lucide-react.
import { useState, useMemo } from 'react';
import { X, CheckCircle2, Circle, ArrowRightLeft } from 'lucide-react';
import { COLORS } from '../../constants';

const SplitRoomItemsModal = ({ cartItems = [], roomNo, onClose, onSplit }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Only placed, non-marker, non-cancelled items are selectable
  const splitableItems = useMemo(
    () => cartItems.filter(i => i.placed && !i.isCheckInMarker && i.status !== 'cancelled'),
    [cartItems]
  );

  const hasMarker = useMemo(() => cartItems.some(i => i.isCheckInMarker), [cartItems]);

  const runningTotal = useMemo(
    () =>
      [...selectedIds].reduce((sum, id) => {
        const item = splitableItems.find(i => i.id === id);
        return sum + (item ? (item.totalPrice || (item.itemUnitPrice || item.price || 0) * item.qty) : 0);
      }, 0),
    [selectedIds, splitableItems]
  );

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSplit([...selectedIds], remark);
      onClose();
    } catch (err) {
      setError(err?.readableMessage || err?.message || 'Failed to move items. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const count = selectedIds.size;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-testid="split-items-modal"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between" style={{ borderColor: COLORS.borderGray }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                Move Items to Table
              </h2>
            </div>
            <p className="text-sm" style={{ color: COLORS.grayText }}>
              Moving from{' '}
              <span
                className="font-semibold px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
              >
                {roomNo ? `Room ${roomNo}` : 'Room'}
              </span>
              {' '}· Select items to split out
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            data-testid="split-items-close-btn"
          >
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: COLORS.sectionBg }}>
          <p
            className="text-xs font-bold uppercase tracking-wider px-1 pb-2"
            style={{ color: COLORS.grayText }}
          >
            Select items to move
          </p>

          {/* Check-in marker row — always disabled */}
          {hasMarker && (
            <div
              className="flex items-center gap-4 p-4 rounded-xl border cursor-not-allowed select-none opacity-50"
              style={{ backgroundColor: '#f9fafb', borderColor: 'transparent' }}
              data-testid="split-item-checkin"
            >
              <Circle className="w-6 h-6 flex-shrink-0" style={{ color: '#d1d5db' }} />
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: COLORS.grayText }}>Room Stay Marker</div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>Check-in item — cannot be moved</div>
              </div>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText, border: `1px solid ${COLORS.borderGray}` }}
              >
                excluded
              </span>
            </div>
          )}

          {/* Selectable items — full row is tap target */}
          {splitableItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const unitPrice = item.itemUnitPrice || item.price || 0;
            const linePrice = item.totalPrice || unitPrice * item.qty;
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                  borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                  boxShadow: isSelected ? `0 0 0 3px rgba(34,197,94,0.12)` : 'none',
                  minHeight: '64px',
                }}
                data-testid={`split-item-row-${item.id}`}
                aria-selected={isSelected}
              >
                {isSelected
                  ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: COLORS.primaryGreen }} />
                  : <Circle className="w-6 h-6 flex-shrink-0" style={{ color: '#d1d5db' }} />
                }
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: COLORS.darkText }}>{item.name}</div>
                  <div className="text-xs" style={{ color: COLORS.grayText }}>
                    {item.qty} × ₹{unitPrice.toLocaleString()}
                  </div>
                </div>
                <div
                  className="text-base font-bold tabular-nums flex-shrink-0"
                  style={{ color: isSelected ? '#16a34a' : COLORS.darkText }}
                >
                  ₹{linePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </button>
            );
          })}

          {/* Remark (optional) */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#ffffff', borderColor: COLORS.borderGray }}>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: COLORS.grayText }}
            >
              Note (optional)
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. friends paying separately..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 border"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText, backgroundColor: COLORS.sectionBg }}
              data-testid="split-items-remark"
            />
          </div>
        </div>

        {/* Footer — sticky */}
        <div
          className="p-5 border-t flex items-center justify-between gap-4"
          style={{ borderColor: COLORS.borderGray, backgroundColor: '#ffffff' }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: COLORS.grayText }}>Moving</div>
            <div
              className="text-xl font-bold tabular-nums"
              style={{ color: count > 0 ? '#16a34a' : COLORS.darkText }}
            >
              ₹{runningTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border font-semibold text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="split-items-cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={count === 0 || submitting}
              className="px-5 py-3 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: count > 0 ? COLORS.primaryGreen : '#9ca3af' }}
              data-testid="split-confirm-btn"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {submitting ? 'Moving…' : count === 0 ? 'Select Items' : `Move ${count} Item${count > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <div
            className="px-5 pb-4 text-xs font-medium"
            style={{ color: '#ef4444', backgroundColor: '#ffffff' }}
            data-testid="split-items-error"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitRoomItemsModal;
