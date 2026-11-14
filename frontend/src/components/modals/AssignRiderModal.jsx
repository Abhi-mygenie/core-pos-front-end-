import { useEffect, useState } from "react";
import { X, Bike, Loader2, RotateCw } from "lucide-react";
import { COLORS } from "../../constants";
import { getDeliveryEmployees, assignDeliveryRider } from "../../api/services/deliveryService";
import { useToast } from "../../hooks/use-toast";

/**
 * BUG-097 Bucket 4 (2026-05-20) — Assign Rider Modal
 *
 * Single-select rider picker. Lists ALL employees returned by
 * `delivery-employee-list` (no role/availability filter — backend does not
 * expose such a field today, per owner directive 2026-05-20).
 *
 * Mirrors StationPickerModal conventions (z-index 300, backdrop click,
 * COLORS palette, data-testid coverage).
 *
 * Props:
 *   - isOpen (bool)
 *   - onClose (fn)
 *   - orderId (int|string)            — order to assign
 *   - orderNumber (string)            — display only (header subtitle)
 *   - orderAmount (number)            — display only (header subtitle)
 *   - currentRiderId (int|string|null)— preselect this row (re-assign path)
 *   - onAssigned (fn)                 — invoked after successful assign;
 *                                       parent should refresh order (socket
 *                                       refresh already covers this).
 */
const AssignRiderModal = ({ isOpen, onClose, orderId, orderNumber, orderAmount, currentRiderId = null, onAssigned }) => {
  const { toast } = useToast();
  const [riders, setRiders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const loadRiders = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getDeliveryEmployees();
      setRiders(list);
    } catch (err) {
      setError(err.readableMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentRiderId || null);
      loadRiders();
    }
  }, [isOpen, currentRiderId]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedId || assigning) return;
    setAssigning(true);
    try {
      await assignDeliveryRider(orderId, selectedId);
      const picked = riders.find(r => r.id === selectedId);
      toast({
        title: currentRiderId ? 'Rider changed' : 'Rider assigned',
        description: `${picked?.fullName || ''} assigned to order #${orderNumber || orderId}`,
      });
      onAssigned?.(picked);
      onClose?.();
    } catch (err) {
      toast({
        title: 'Assign failed',
        description: err.readableMessage,
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      data-testid="assign-rider-modal-backdrop"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        data-testid="assign-rider-modal"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: COLORS.borderGray }}
        >
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
            <div>
              <h3 className="font-semibold text-base" style={{ color: COLORS.darkText }}>
                {currentRiderId ? 'Change Rider' : 'Assign Rider'}
              </h3>
              {(orderNumber || orderAmount) && (
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  {orderNumber ? `Order #${orderNumber}` : ''}
                  {orderNumber && orderAmount ? '  •  ' : ''}
                  {orderAmount ? `₹${orderAmount}` : ''}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            data-testid="assign-rider-close"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="assign-rider-list">
          {loading && (
            <div
              className="flex items-center justify-center py-8 gap-2"
              style={{ color: COLORS.grayText }}
              data-testid="assign-rider-loading"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading riders…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center py-6 gap-2" data-testid="assign-rider-error">
              <div className="text-sm text-red-600">{error}</div>
              <button
                onClick={loadRiders}
                className="flex items-center gap-1 text-sm px-3 py-2 rounded border"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                data-testid="assign-rider-retry"
              >
                <RotateCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && riders.length === 0 && (
            <div
              className="text-center py-8 text-sm"
              style={{ color: COLORS.grayText }}
              data-testid="assign-rider-empty"
            >
              No riders available.
            </div>
          )}

          {!loading && !error && riders.map((r) => {
            const checked = selectedId === r.id;
            const isCurrent = currentRiderId && currentRiderId === r.id;
            return (
              <label
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 border"
                style={{
                  borderColor: checked ? COLORS.primaryOrange : COLORS.borderGray,
                  backgroundColor: checked ? '#FFF3E8' : 'white',
                }}
                data-testid={`assign-rider-option-${r.id}`}
              >
                <input
                  type="radio"
                  name="assign-rider"
                  checked={checked}
                  onChange={() => setSelectedId(r.id)}
                  className="w-4 h-4"
                  style={{ accentColor: COLORS.primaryOrange }}
                  data-testid={`assign-rider-radio-${r.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>
                    {r.fullName}
                  </div>
                  {r.phone && (
                    <div className="text-xs" style={{ color: COLORS.grayText }}>{r.phone}</div>
                  )}
                </div>
                {isCurrent && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: COLORS.borderGray, color: COLORS.grayText }}
                  >
                    Current
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-4 py-3 border-t"
          style={{ borderColor: COLORS.borderGray }}
        >
          <button
            onClick={onClose}
            disabled={assigning}
            className="flex-1 py-3 rounded-lg font-medium border disabled:opacity-50"
            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            data-testid="assign-rider-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || assigning || loading || (currentRiderId && selectedId === currentRiderId)}
            className="flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: COLORS.primaryOrange }}
            data-testid="assign-rider-confirm"
          >
            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : (currentRiderId ? 'Change Rider' : 'Assign Rider')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignRiderModal;
