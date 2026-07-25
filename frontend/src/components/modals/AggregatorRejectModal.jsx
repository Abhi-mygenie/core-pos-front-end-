// CR-106: Aggregator Reject Modal — cancel reason picker for rejecting Swiggy/Zomato orders
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AGGREGATOR_CANCEL_REASONS } from '../../api/constants';

const AggregatorRejectModal = ({ open, onClose, onConfirm }) => {
  const [reasonCode, setReasonCode] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!reasonCode) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reasonCode, message);
    } finally {
      setIsSubmitting(false);
      setReasonCode('');
      setMessage('');
    }
  };

  const handleClose = () => {
    setReasonCode('');
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="aggregator-reject-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-red-50">
          <h3 className="text-base font-semibold text-red-700">Reject Order</h3>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-red-100 transition-colors" data-testid="reject-modal-close">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for rejection</label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              data-testid="reject-reason-select"
            >
              <option value="">Select a reason...</option>
              {AGGREGATOR_CANCEL_REASONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Additional details..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              data-testid="reject-message-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
            className="flex-1 h-10 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            data-testid="reject-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reasonCode || isSubmitting}
            className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="reject-confirm-btn"
          >
            {isSubmitting ? 'Rejecting...' : 'Reject Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AggregatorRejectModal;
