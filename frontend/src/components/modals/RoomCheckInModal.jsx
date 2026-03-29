import { useState, useMemo } from 'react';
import { X, User, Phone, Mail, Users, Calendar, CreditCard, FileText, Camera, ChevronDown, ChevronUp, Loader2, ArrowLeft } from 'lucide-react';
import { COLORS } from '../../constants';
import * as roomService from '../../api/services/roomService';
import { useToast } from '../../hooks/use-toast';

const PAYMENT_MODES = ['cash', 'card', 'upi'];
const BOOKING_TYPES = ['WalkIn', 'PreBooked'];
const BOOKING_FOR = ['personal', 'business'];
const ID_TYPES = ['Aadhaar', 'Passport', 'DrivingLicense', 'VoterID', 'PAN'];

const today = () => new Date().toISOString().split('T')[0];

const InputField = ({ icon: Icon, label, required, ...props }) => (
  <div>
    <label className="text-[11px] font-medium mb-0.5 block" style={{ color: COLORS.grayText }}>
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5" style={{ borderColor: COLORS.borderGray, backgroundColor: '#fff' }}>
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />}
      <input
        className="flex-1 outline-none text-sm bg-transparent min-w-0"
        style={{ color: COLORS.darkText }}
        {...props}
      />
    </div>
  </div>
);

const SelectField = ({ icon: Icon, label, options, ...props }) => (
  <div>
    <label className="text-[11px] font-medium mb-0.5 block" style={{ color: COLORS.grayText }}>{label}</label>
    <div className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5" style={{ borderColor: COLORS.borderGray, backgroundColor: '#fff' }}>
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />}
      <select
        className="flex-1 outline-none text-sm bg-transparent min-w-0"
        style={{ color: COLORS.darkText }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  </div>
);

const FileField = ({ label, accept, onChange, fileName }) => (
  <div>
    <label className="text-[11px] font-medium mb-0.5 block" style={{ color: COLORS.grayText }}>{label}</label>
    <label
      className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
      style={{ borderColor: COLORS.borderGray, backgroundColor: '#fff' }}
    >
      <Camera className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />
      <span className="flex-1 text-sm truncate" style={{ color: fileName ? COLORS.darkText : COLORS.grayText }}>
        {fileName || 'Choose file...'}
      </span>
      <input type="file" accept={accept} onChange={onChange} className="hidden" />
    </label>
  </div>
);

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.grayText }}>{children}</span>
    <div className="flex-1 h-px" style={{ backgroundColor: COLORS.borderGray }} />
  </div>
);

/**
 * RoomCheckInPanel — Phase 2A Step 8
 * Full-width overlay panel, 3-column form, zero scroll.
 */
const RoomCheckInModal = ({ room, availableRooms = [], onClose, onSuccess, sidebarWidth = 70 }) => {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bookingType, setBookingType] = useState('WalkIn');
  const [bookingFor, setBookingFor] = useState('personal');
  const [orderAmount, setOrderAmount] = useState('');
  const [advancePayment, setAdvancePayment] = useState('');
  const [balancePayment, setBalancePayment] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [orderNote, setOrderNote] = useState('');
  const [totalAdult, setTotalAdult] = useState('');
  const [totalChildren, setTotalChildren] = useState('');
  const [idType, setIdType] = useState('Aadhaar');
  const [checkinDate, setCheckinDate] = useState(today());
  const [checkoutDate, setCheckoutDate] = useState('');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [showIdSection, setShowIdSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedRoomIds, setSelectedRoomIds] = useState([room.tableId]);

  const otherRooms = useMemo(() =>
    availableRooms.filter(r => r.tableId !== room.tableId),
    [availableRooms, room.tableId]
  );

  const toggleRoom = (tableId) => {
    setSelectedRoomIds(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim() || !phone.trim()) {
      toast({ title: 'Missing Fields', description: 'Name and Phone are required' });
      return;
    }
    if (selectedRoomIds.length === 0) {
      toast({ title: 'No Room', description: 'Select at least one room' });
      return;
    }

    setIsSubmitting(true);
    try {
      await roomService.checkIn({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        roomIds: selectedRoomIds,
        bookingType,
        bookingFor,
        orderAmount: parseFloat(orderAmount) || 0,
        advancePayment: parseFloat(advancePayment) || 0,
        balancePayment: parseFloat(balancePayment) || 0,
        paymentMode,
        orderNote: orderNote.trim() || undefined,
        totalAdult: totalAdult ? parseInt(totalAdult, 10) : undefined,
        totalChildren: totalChildren ? parseInt(totalChildren, 10) : undefined,
        idType: showIdSection ? idType : undefined,
        checkinDate: checkinDate || undefined,
        checkoutDate: checkoutDate || undefined,
        frontImage: frontImage || undefined,
        backImage: backImage || undefined,
      });
      toast({ title: 'Check-In Successful', description: `${name} checked into ${selectedRoomIds.length} room(s)` });
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.readableMessage || 'Check-in failed';
      toast({ title: 'Check-In Failed', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="room-checkin-overlay"
      className="fixed top-0 right-0 bottom-0 z-30 flex flex-col"
      style={{ left: sidebarWidth, backgroundColor: COLORS.sectionBg }}
    >
      {/* ─── Header ─── */}
      <div
        className="flex items-center gap-3 px-5 py-2.5 flex-shrink-0"
        style={{ backgroundColor: COLORS.lightBg, borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <button data-testid="checkin-close-btn" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: COLORS.darkText }} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight" style={{ color: COLORS.darkText }}>Room Check-In</h1>
          <p className="text-[11px]" style={{ color: COLORS.grayText }}>
            Room {room.label}{selectedRoomIds.length > 1 && ` + ${selectedRoomIds.length - 1} more`}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* ─── Body (flex-1, no scroll) ─── */}
      <div className="flex-1 flex flex-col overflow-hidden px-5 py-3">

        {/* Room Selection Row */}
        {otherRooms.length > 0 && (
          <div className="flex-shrink-0 mb-3" data-testid="room-checkin-modal">
            <SectionLabel>Select Rooms</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <span
                className="w-14 h-8 rounded-md text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: COLORS.primaryOrange, color: '#fff' }}
              >
                {room.label}
              </span>
              {otherRooms.map(r => {
                const sel = selectedRoomIds.includes(r.tableId);
                return (
                  <button
                    type="button"
                    key={r.tableId}
                    data-testid={`room-chip-${r.tableId}`}
                    onClick={() => toggleRoom(r.tableId)}
                    className="w-14 h-8 rounded-md text-xs font-bold flex items-center justify-center border-2 transition-all"
                    style={{
                      borderColor: sel ? COLORS.primaryOrange : COLORS.borderGray,
                      backgroundColor: sel ? COLORS.primaryOrange : '#fff',
                      color: sel ? '#fff' : COLORS.darkText,
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3-Column Form Grid */}
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">

          {/* COL 1 — Guest Details */}
          <div className="flex flex-col space-y-2">
            <SectionLabel>Guest</SectionLabel>
            <InputField icon={User} label="Guest Name" required placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} data-testid="checkin-name" />
            <InputField icon={Phone} label="Phone" required placeholder="9876543210" type="tel" value={phone} onChange={e => setPhone(e.target.value)} data-testid="checkin-phone" />
            <InputField icon={Mail} label="Email" placeholder="guest@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="checkin-email" />
            <div className="grid grid-cols-2 gap-2">
              <InputField icon={Users} label="Adults" placeholder="0" type="number" min="0" value={totalAdult} onChange={e => setTotalAdult(e.target.value)} data-testid="checkin-adults" />
              <InputField icon={Users} label="Children" placeholder="0" type="number" min="0" value={totalChildren} onChange={e => setTotalChildren(e.target.value)} data-testid="checkin-children" />
            </div>
            <button
              type="button"
              onClick={() => setShowIdSection(v => !v)}
              className="flex items-center gap-1 text-[11px] font-medium pt-1"
              style={{ color: COLORS.primaryOrange }}
              data-testid="checkin-advanced-toggle"
            >
              {showIdSection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showIdSection ? 'Hide' : 'Show'} ID Verification
            </button>
            {showIdSection && (
              <div className="space-y-2">
                <SelectField label="ID Type" options={ID_TYPES} value={idType} onChange={e => setIdType(e.target.value)} data-testid="checkin-id-type" />
                <div className="grid grid-cols-2 gap-2">
                  <FileField label="ID Front" accept="image/*" onChange={e => setFrontImage(e.target.files?.[0] || null)} fileName={frontImage?.name} />
                  <FileField label="ID Back" accept="image/*" onChange={e => setBackImage(e.target.files?.[0] || null)} fileName={backImage?.name} />
                </div>
              </div>
            )}
          </div>

          {/* COL 2 — Booking */}
          <div className="flex flex-col space-y-2">
            <SectionLabel>Booking</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Booking Type" options={BOOKING_TYPES} value={bookingType} onChange={e => setBookingType(e.target.value)} data-testid="checkin-booking-type" />
              <SelectField label="Booking For" options={BOOKING_FOR} value={bookingFor} onChange={e => setBookingFor(e.target.value)} data-testid="checkin-booking-for" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField icon={Calendar} label="Check-in Date" type="date" value={checkinDate} onChange={e => setCheckinDate(e.target.value)} data-testid="checkin-date" />
              <InputField icon={Calendar} label="Checkout Date" type="date" value={checkoutDate} onChange={e => setCheckoutDate(e.target.value)} data-testid="checkout-date" />
            </div>
          </div>

          {/* COL 3 — Payment & Note */}
          <div className="flex flex-col space-y-2">
            <SectionLabel>Payment</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <InputField icon={CreditCard} label="Amount" placeholder="0" type="number" min="0" value={orderAmount} onChange={e => setOrderAmount(e.target.value)} data-testid="checkin-amount" />
              <InputField label="Advance" placeholder="0" type="number" min="0" value={advancePayment} onChange={e => setAdvancePayment(e.target.value)} data-testid="checkin-advance" />
              <InputField label="Balance" placeholder="0" type="number" min="0" value={balancePayment} onChange={e => setBalancePayment(e.target.value)} data-testid="checkin-balance" />
            </div>
            <SelectField icon={CreditCard} label="Payment Mode" options={PAYMENT_MODES} value={paymentMode} onChange={e => setPaymentMode(e.target.value)} data-testid="checkin-payment-mode" />
            <div className="pt-1">
              <SectionLabel>Note</SectionLabel>
              <InputField icon={FileText} label="Order Note" placeholder="Optional note" value={orderNote} onChange={e => setOrderNote(e.target.value)} data-testid="checkin-note" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div
        className="flex items-center justify-end gap-3 px-5 py-2.5 flex-shrink-0"
        style={{ backgroundColor: COLORS.lightBg, borderTop: `1px solid ${COLORS.borderGray}` }}
      >
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
          style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
          data-testid="checkin-cancel-btn"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim() || !phone.trim()}
          className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="checkin-submit-btn"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Check In{selectedRoomIds.length > 1 ? ` (${selectedRoomIds.length})` : ''}
        </button>
      </div>
    </div>
  );
};

export default RoomCheckInModal;
