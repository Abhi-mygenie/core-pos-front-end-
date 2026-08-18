// CR-017: WhatsApp Payment Link Modal
// Small dialog for confirming/entering customer phone + name before sending
// a Razorpay payment link via WhatsApp.

import { useState, useEffect } from "react";
import { X, Loader2, Send } from "lucide-react";
import { COLORS } from "../../constants";
import { sendPaymentLink } from "../../api/services/paymentLinkService";
import { useToast } from "../../hooks/use-toast";

const WhatsAppPaymentModal = ({ isOpen, onClose, order, restaurantName }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  // Auto-populate from order context when modal opens
  useEffect(() => {
    if (isOpen && order) {
      setName(order.customerName || order.customer || '');
      setPhone(order.phone || '');
      setError('');
      setIsSending(false);
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const validatePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10;
  };

  const handleSend = async () => {
    // Validate phone
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setIsSending(true);

    try {
      const result = await sendPaymentLink({
        orderId: order.orderId || order.id,
        amount: order.amount || 0,
        phone: cleanPhone,
        customerName: name || 'Customer',
        restaurantName: restaurantName || '',
      });

      if (result.source === 'db') {
        toast({ title: "Payment Link Resent", description: `Payment link resent to ${cleanPhone}` });
      } else {
        toast({ title: "Payment Link Sent", description: `Payment link sent to ${cleanPhone} via WhatsApp` });
      }
      onClose();
    } catch (err) {
      const msg = err.readableMessage;
      toast({ title: "Error", description: msg, variant: "destructive" });
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="whatsapp-payment-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F8ED' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: COLORS.darkText }}>Send Payment Link</h3>
              <p className="text-xs" style={{ color: COLORS.grayText }}>Order #{order?.orderId || order?.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Amount (read-only) */}
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${COLORS.primaryGreen}08`, border: `1px solid ${COLORS.primaryGreen}25` }}>
            <span className="text-xs" style={{ color: COLORS.grayText }}>Amount</span>
            <div className="text-2xl font-bold" style={{ color: COLORS.primaryGreen }} data-testid="whatsapp-payment-amount">
              ₹{(order?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.grayText }}>Customer Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-green-100"
              style={{ borderColor: COLORS.borderGray }}
              disabled={isSending}
              data-testid="whatsapp-payment-name"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.grayText }}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              placeholder="10-digit mobile number"
              maxLength={10}
              className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-green-100"
              style={{ borderColor: error ? '#EF4444' : COLORS.borderGray }}
              disabled={isSending}
              data-testid="whatsapp-payment-phone"
            />
            {error && (
              <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#25D366' }}
            data-testid="whatsapp-payment-send-btn"
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {isSending ? 'Sending...' : 'Send via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPaymentModal;
