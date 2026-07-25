// CR-106: Aggregator Dispatch Modal — rider name + phone input for dispatching orders
import React, { useState } from 'react';
import { X, Truck } from 'lucide-react';

const AggregatorDispatchModal = ({ open, onClose, onConfirm }) => {
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const isValid = riderName.trim().length > 0 && riderPhone.trim().length >= 10;

  const handleConfirm = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      await onConfirm(riderName.trim(), riderPhone.trim());
    } finally {
      setIsSubmitting(false);
      setRiderName('');
      setRiderPhone('');
    }
  };

  const handleClose = () => {
    setRiderName('');
    setRiderPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="aggregator-dispatch-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-emerald-50">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-emerald-700">Dispatch Order</h3>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-emerald-100 transition-colors" data-testid="dispatch-modal-close">
            <X className="w-4 h-4 text-emerald-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rider Name</label>
            <input
              type="text"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="Enter rider name"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              data-testid="dispatch-rider-name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rider Phone</label>
            <input
              type="tel"
              value={riderPhone}
              onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="Enter phone number"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              data-testid="dispatch-rider-phone"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
            className="flex-1 h-10 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            data-testid="dispatch-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="flex-1 h-10 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="dispatch-confirm-btn"
          >
            {isSubmitting ? 'Dispatching...' : 'Dispatch'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AggregatorDispatchModal;
