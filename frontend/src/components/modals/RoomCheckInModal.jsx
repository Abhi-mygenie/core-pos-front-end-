// Room Module V2 — RoomCheckInModal
// Public prop signature LOCKED per V2 §13.2.
// Default export name LOCKED per V2 §13.4.
// All visibility/sections driven by Profile flags (guest_details, booking_details, show_user_gst).

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  X, User, Phone, Mail, Users, Calendar, CreditCard, FileText, Camera,
  Loader2, ArrowLeft, Plus, ChevronDown, CheckCircle, Clock,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { isValidPhoneNumber } from 'libphonenumber-js';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import { COLORS } from '../../constants';
import * as roomService from '../../api/services/roomService';
import { useToast } from '../../hooks/use-toast';
import { useRestaurant } from '../../contexts/RestaurantContext';

// ── Constants (V2 §5.7, §7.8, §6.1-6.2) ─────────────────────────────────────
const ID_TYPES = [
  { value: 'Aadhar card', label: 'Aadhaar' },
  { value: 'Passport',    label: 'Passport' },
  { value: 'PAN card',    label: 'PAN' },
  { value: 'License',     label: 'Driving License' },
  { value: 'Voter ID',    label: 'Voter ID' },
];
const BOOKING_TYPES = [
  { value: 'WalkIn', label: 'Walk-in' },
  { value: 'Online', label: 'Online' },
];
const BOOKING_FOR = [
  { value: 'Individual', label: 'Personal' },
  { value: 'Corporate',  label: 'Corporate' },
];
const ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const FILE_ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';
const MAX_BYTES = 5 * 1024 * 1024;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ── Date helpers ────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const yesterdayStr = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowTimeStr = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (yyyyMmDd, days) => {
  if (!yyyyMmDd) return '';
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const toPayloadDateTime = (dateStr, timeStr) => `${dateStr} ${timeStr || '00:00'}:00`;

// ── Small local UI primitives ───────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.grayText }}>{children}</span>
    <div className="flex-1 h-px" style={{ backgroundColor: COLORS.borderGray }} />
  </div>
);

const FieldLabel = ({ children, required }) => (
  <label className="text-[11px] font-medium mb-0.5 block" style={{ color: COLORS.grayText }}>
    {children}{required && <span className="ml-0.5 font-bold" style={{ color: COLORS.errorText }}>*</span>}
  </label>
);

const InputField = ({ icon: Icon, label, required, error, ...props }) => (
  <div>
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    <div
      className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5"
      style={{
        borderColor: error ? COLORS.errorText : COLORS.borderGray,
        backgroundColor: props.readOnly ? COLORS.sectionBg : '#fff',
      }}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />}
      <input
        className="flex-1 outline-none text-sm bg-transparent min-w-0"
        style={{ color: COLORS.darkText, cursor: props.readOnly ? 'not-allowed' : 'text' }}
        {...props}
      />
    </div>
    {error && <div className="text-[10px] mt-0.5 leading-tight" style={{ color: COLORS.errorText }}>{error}</div>}
  </div>
);

const SelectField = ({ label, required, options, value, onChange, error, testId, renderLabel }) => (
  <div>
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    <div
      className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5"
      style={{ borderColor: error ? COLORS.errorText : COLORS.borderGray, backgroundColor: '#fff' }}
    >
      <select
        data-testid={testId}
        className="flex-1 outline-none text-sm bg-transparent min-w-0"
        style={{ color: COLORS.darkText }}
        value={value}
        onChange={onChange}
      >
        {!value && <option value="">Select…</option>}
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {renderLabel ? renderLabel(opt) : (opt.label ?? opt)}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />
    </div>
    {error && <div className="text-[10px] mt-0.5 leading-tight" style={{ color: COLORS.errorText }}>{error}</div>}
  </div>
);

const RadioPillGroup = ({ label, required, options, value, onChange, testIdPrefix }) => (
  <div>
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    <div
      className="flex p-0.5 rounded-lg border"
      style={{ backgroundColor: COLORS.sectionBg, borderColor: COLORS.borderGray }}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`${testIdPrefix}-${opt.value.toLowerCase()}`}
            onClick={() => onChange(opt.value)}
            className="flex-1 py-1 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: selected ? COLORS.primaryOrange : 'transparent',
              color: selected ? '#fff' : COLORS.grayText,
              boxShadow: selected ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

const FileField = ({ label, required, file, error, busy, onChange, testId }) => {
  const inputRef = useRef(null);
  const handlePick = () => inputRef.current?.click();
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <button
        type="button"
        onClick={handlePick}
        className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors w-full"
        style={{
          borderColor: error ? COLORS.errorText : COLORS.borderGray,
          backgroundColor: error ? `${COLORS.errorBg}33` : '#fff',
        }}
      >
        {busy
          ? <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" style={{ color: COLORS.primaryOrange }} />
          : (file
              ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryGreen }} />
              : <Camera className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />)}
        <span
          className="flex-1 text-sm truncate text-left"
          style={{ color: file ? COLORS.darkText : COLORS.grayText }}
        >
          {file ? file.name : 'Choose file…'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT_ATTR}
        onChange={onChange}
        className="hidden"
        data-testid={testId}
      />
      {error && <div className="text-[10px] mt-0.5 leading-tight" style={{ color: COLORS.errorText }}>{error}</div>}
    </div>
  );
};

const Badge = ({ children }) => (
  <span
    className="inline-flex items-center justify-center text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0"
    style={{ backgroundColor: COLORS.borderGray, color: COLORS.darkText, minWidth: 26, height: 22 }}
  >
    {children}
  </span>
);

const RemoveXBtn = ({ onClick, testId, ariaLabel = 'Remove' }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    aria-label={ariaLabel}
    title="Remove"
    className="p-1 rounded-md transition-colors"
    style={{ color: COLORS.grayText }}
    onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.errorText; e.currentTarget.style.backgroundColor = COLORS.errorBg; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.grayText; e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    <X className="w-4 h-4" />
  </button>
);

// ── File validation & compression ───────────────────────────────────────────
async function processFile(file) {
  if (!file) return { file: null };
  const isAccepted = ACCEPTED_MIME.includes(file.type) ||
    /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
  if (!isAccepted) {
    return { error: 'Only JPG, PNG, WEBP, or PDF files are allowed.' };
  }
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (file.size > MAX_BYTES) return { error: 'File too large. Maximum 5 MB allowed.' };
    return { file };
  }
  // Image → compress to <= 5MB
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 5,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
    });
    if (compressed.size > MAX_BYTES) {
      return { error: 'File too large. Maximum 5 MB allowed.' };
    }
    // Preserve a readable filename
    const outFile = new File([compressed], file.name, { type: compressed.type || file.type });
    return { file: outFile };
  } catch {
    return { error: 'Could not process image. Try a different file.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
const RoomCheckInModal = ({ room, availableRooms = [], onClose, onSuccess, sidebarWidth = 70 }) => {
  const { toast } = useToast();
  const { restaurant } = useRestaurant();
  const flags = restaurant?.checkInFlags || {
    guestDetails: false, bookingDetails: false, showUserGst: false,
  };

  // ── State: baseline ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');           // E.164 via PhoneInput (with IN default)
  const [email, setEmail] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState([room.tableId]);

  // ── State: guest_details ──
  const [idType, setIdType] = useState(ID_TYPES[0].value);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontBusy, setFrontBusy] = useState(false);
  const [backBusy, setBackBusy] = useState(false);
  const [frontError, setFrontError] = useState('');
  const [backError, setBackError] = useState('');
  const [extraAdults, setExtraAdults] = useState([]); // [{name, idType, frontImage, backImage, frontErr, backErr, frontBusy, backBusy}]
  const [childNames, setChildNames] = useState([]);   // ['piyush', ...]

  // ── State: booking_details ──
  const [bookingType, setBookingType] = useState('WalkIn');
  const [bookingFor, setBookingFor] = useState('Individual');
  const [checkinDate, setCheckinDate] = useState(todayStr());
  const [checkinTime, setCheckinTime] = useState(nowTimeStr());
  const [nights, setNights] = useState(1);
  const [manualCheckout, setManualCheckout] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState(addDays(todayStr(), 1));
  const [checkoutTime, setCheckoutTime] = useState(nowTimeStr());
  const [checkoutPulse, setCheckoutPulse] = useState(false);
  const [roomPrice, setRoomPrice] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [advancePayment, setAdvancePayment] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // ── State: GST block ──
  const [firmName, setFirmName] = useState('');
  const [firmGst, setFirmGst] = useState('');

  // ── UI state ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirtyDialog, setDirtyDialog] = useState(null); // null | 'close'
  const [errors, setErrors] = useState({}); // field-level errors {phone, email, advance, firmGst, checkin}

  // ── Derived ──
  const otherRooms = useMemo(
    () => availableRooms.filter((r) => r.tableId !== room.tableId),
    [availableRooms, room.tableId]
  );
  const roomsCount = selectedRoomIds.length;
  const maxAdults = 4 * roomsCount;
  const maxChildren = 4 * roomsCount;
  const balancePayment = useMemo(() => {
    const o = Number(orderAmount) || 0;
    const a = Number(advancePayment) || 0;
    return (o - a).toFixed(2);
  }, [orderAmount, advancePayment]);
  const totalAdult = 1 + extraAdults.length;
  const totalChildren = childNames.length;
  const gstBlockVisible = !!(flags.showUserGst && bookingFor === 'Corporate');

  const isDirty = useMemo(() => {
    return !!(
      name || phone || email ||
      frontImage || backImage ||
      extraAdults.length || childNames.length ||
      roomPrice || orderAmount || advancePayment || orderNote ||
      firmName || firmGst
    );
  }, [name, phone, email, frontImage, backImage, extraAdults, childNames,
      roomPrice, orderAmount, advancePayment, orderNote, firmName, firmGst]);

  // ── Effects ──

  // Auto-sync checkout date from nights (unless operator manually edited it)
  useEffect(() => {
    if (!flags.bookingDetails) return;
    if (manualCheckout) return;
    const n = Math.max(1, Number(nights) || 1);
    const newCheckout = addDays(checkinDate, n);
    if (newCheckout !== checkoutDate) {
      setCheckoutDate(newCheckout);
      setCheckoutPulse(true);
      const t = setTimeout(() => setCheckoutPulse(false), 300);
      return () => clearTimeout(t);
    }
  }, [nights, checkinDate, flags.bookingDetails, manualCheckout, checkoutDate]);

  // Clear GST values when block hidden (V2 §10.12)
  useEffect(() => {
    if (!gstBlockVisible) {
      if (firmName) setFirmName('');
      if (firmGst) setFirmGst('');
      if (errors.firmGst) setErrors((e) => ({ ...e, firmGst: undefined }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstBlockVisible]);

  // beforeunload guard for tab-close / reload (V2 §10.4)
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Handlers ──

  const requestClose = useCallback(() => {
    if (isDirty) setDirtyDialog('close');
    else onClose?.();
  }, [isDirty, onClose]);

  const confirmDiscard = () => {
    setDirtyDialog(null);
    onClose?.();
  };

  const toggleRoom = (tableId) => {
    setSelectedRoomIds((prev) => {
      if (prev.includes(tableId)) {
        // Removing → check cap constraint (V2 §10.7)
        const newCount = prev.length - 1;
        const newCap = 4 * newCount;
        if (totalAdult > newCap || totalChildren > newCap) {
          toast({
            title: 'Cannot remove room',
            description: `Reduce adults/children to ${newCap} before removing this room.`,
          });
          return prev;
        }
        return prev.filter((id) => id !== tableId);
      }
      return [...prev, tableId];
    });
  };

  const handleImagePicked = async (setFile, setBusy, setErr, e) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!picked) return;
    setBusy(true); setErr('');
    const { file, error } = await processFile(picked);
    setBusy(false);
    if (error) { setFile(null); setErr(error); return; }
    setFile(file);
  };

  const handleAdultFile = async (rowIdx, slot, e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setExtraAdults((rows) => rows.map((r, i) =>
      i === rowIdx ? { ...r, [`${slot}Busy`]: true, [`${slot}Err`]: '' } : r));
    const { file, error } = await processFile(picked);
    setExtraAdults((rows) => rows.map((r, i) => {
      if (i !== rowIdx) return r;
      const next = { ...r, [`${slot}Busy`]: false };
      if (error) { next[slot] = null; next[`${slot}Err`] = error; }
      else { next[slot] = file; next[`${slot}Err`] = ''; }
      return next;
    }));
  };

  const addAdultRow = () => {
    if (totalAdult >= maxAdults) return;
    setExtraAdults((rows) => [...rows, {
      name: '', idType: ID_TYPES[0].value,
      frontImage: null, backImage: null,
      frontErr: '', backErr: '', frontBusy: false, backBusy: false,
    }]);
  };
  const removeAdultRow = (idx) => setExtraAdults((rows) => rows.filter((_, i) => i !== idx));

  const addChildRow = () => {
    if (totalChildren >= maxChildren) return;
    setChildNames((rows) => [...rows, '']);
  };
  const removeChildRow = (idx) => setChildNames((rows) => rows.filter((_, i) => i !== idx));

  // ── Validation ──
  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Required';
    if (!phone || !isValidPhoneNumber(phone)) next.phone = 'Enter a valid phone number';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Invalid email';
    if (selectedRoomIds.length === 0) next.rooms = 'Select at least one room';

    if (flags.guestDetails) {
      if (!frontImage) next.front = 'Front image required';
      extraAdults.forEach((r, i) => {
        if (!r.name.trim()) next[`adult${i}_name`] = 'Name required';
        if (!r.frontImage) next[`adult${i}_front`] = 'Front image required';
      });
      childNames.forEach((c, i) => {
        const t = (c || '').trim();
        if (!t) next[`child${i}`] = 'Name required';
        else if (t.includes(',')) next[`child${i}`] = 'Name cannot contain a comma.';
      });
    }

    if (flags.bookingDetails) {
      // back-dating check (24h → max 1 day earlier than today)
      if (checkinDate < yesterdayStr()) next.checkin = 'Check-in date cannot be more than 24 hours in the past.';
      if (checkoutDate < checkinDate) next.checkout = 'Check-out must be on or after check-in';
      if (roomPrice === '' || Number(roomPrice) < 0) next.roomPrice = 'Required';
      if (orderAmount === '' || Number(orderAmount) < 0) next.orderAmount = 'Required';
      const adv = Number(advancePayment) || 0;
      const ord = Number(orderAmount) || 0;
      if (adv < 0) next.advance = 'Cannot be negative';
      else if (advancePayment !== '' && adv > ord) next.advance = 'Advance cannot be greater than booking amount';

      if (gstBlockVisible) {
        if (!firmName.trim()) next.firmName = 'Required';
        if (!firmGst.trim()) next.firmGst = 'Required';
        else if (!GSTIN_REGEX.test(firmGst.trim())) next.firmGst = 'Invalid GSTIN';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const extractErrorMessage = (err, fallback) => {
    const d = err?.response?.data;
    return (
      d?.errors?.[0]?.message ||
      d?.message ||
      d?.error ||
      err?.readableMessage ||
      err?.message ||
      fallback
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) {
      toast({ title: 'Please fix the highlighted fields' });
      return;
    }
    setIsSubmitting(true);
    try {
      await roomService.checkIn({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        roomIds: selectedRoomIds,

        guestDetailsEnabled: !!flags.guestDetails,
        bookingDetailsEnabled: !!flags.bookingDetails,

        idType: flags.guestDetails ? idType : undefined,
        frontImage: flags.guestDetails ? frontImage : undefined,
        backImage: flags.guestDetails ? (backImage || undefined) : undefined,
        extraAdults: flags.guestDetails ? extraAdults.map((r) => ({
          name: r.name.trim(),
          idType: r.idType,
          frontImage: r.frontImage,
          backImage: r.backImage || undefined,
        })) : undefined,
        childNames: flags.guestDetails ? childNames : undefined,

        bookingType: flags.bookingDetails ? bookingType : undefined,
        bookingFor: flags.bookingDetails ? bookingFor : undefined,
        checkinDate: flags.bookingDetails ? toPayloadDateTime(checkinDate, checkinTime) : undefined,
        checkoutDate: flags.bookingDetails ? toPayloadDateTime(checkoutDate, checkoutTime) : undefined,
        roomPrice: flags.bookingDetails ? roomPrice : undefined,
        orderAmount: flags.bookingDetails ? orderAmount : undefined,
        advancePayment: flags.bookingDetails ? (advancePayment || 0) : undefined,
        balancePayment: flags.bookingDetails ? balancePayment : undefined,
        orderNote: flags.bookingDetails ? (orderNote.trim() || undefined) : undefined,

        firmName: gstBlockVisible ? firmName.trim() : undefined,
        firmGst: gstBlockVisible ? firmGst.trim() : undefined,
      });

      const successMsg = 'Group check-in completed successfully';
      toast({ title: successMsg, description: `${selectedRoomIds.length} room(s) checked in` });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        toast({
          title: 'Room unavailable',
          description: 'This room was just taken by another operator. Please pick another room.',
          variant: 'destructive',
        });
        setTimeout(() => onClose?.(), 500);
      } else {
        const msg = extractErrorMessage(err, 'Check-in failed');
        toast({ title: 'Check-In Failed', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render helpers ──
  // Inline popover implementation (avoids pulling in shadcn ui to keep jest module graph clean).
  const EditTimePopover = ({ timeVal, setTimeVal, testId }) => {
    const [open, setOpen] = useState(false);
    const popRef = useRef(null);
    useEffect(() => {
      if (!open) return undefined;
      const onDocClick = (ev) => { if (popRef.current && !popRef.current.contains(ev.target)) setOpen(false); };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);
    return (
      <span ref={popRef} className="relative inline-block">
        <button
          type="button"
          data-testid={testId}
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] font-medium hover:underline"
          style={{ color: COLORS.primaryOrange, cursor: 'pointer' }}
        >
          <Clock className="w-3 h-3 inline mr-0.5" />
          {timeVal || 'Edit time'}
        </button>
        {open && (
          <div
            className="absolute right-0 mt-1 p-2 rounded-md shadow-lg z-50"
            style={{ backgroundColor: '#fff', border: `1px solid ${COLORS.borderGray}`, minWidth: 140 }}
          >
            <label className="text-[11px] font-medium block mb-1" style={{ color: COLORS.grayText }}>Time (HH:mm)</label>
            <input
              type="time"
              value={timeVal}
              onChange={(e) => setTimeVal(e.target.value)}
              className="border rounded px-2 py-1 text-sm outline-none w-full"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            />
          </div>
        )}
      </span>
    );
  };

  // ── JSX ──
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
        <button data-testid="checkin-close-btn" onClick={requestClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: COLORS.darkText }} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight" style={{ color: COLORS.darkText }}>Room Check-In</h1>
          <p className="text-[11px]" style={{ color: COLORS.grayText }}>
            Room {room.label}{selectedRoomIds.length > 1 && ` + ${selectedRoomIds.length - 1} more`}
          </p>
        </div>
        <button onClick={requestClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
          <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* ─── Body ─── */}
      <div className="flex-1 flex flex-col overflow-auto px-5 py-3">

        {/* Room Selection (V2 §10.11 — hidden when no other rooms) */}
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
              {otherRooms.map((r) => {
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

        {/* 3-Column grid */}
        <div className="grid grid-cols-3 gap-4">

          {/* ─── COL 1 — Guest ─── */}
          <div className="flex flex-col space-y-2">
            <SectionLabel>Guest</SectionLabel>
            <InputField
              icon={User}
              label="Guest Name"
              required
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="checkin-name"
              error={errors.name}
            />

            {/* Phone with country-code selector */}
            <div>
              <FieldLabel required>Phone</FieldLabel>
              <div
                className="rcm-phone-wrap border rounded-lg px-2.5 py-1.5 flex items-center"
                style={{
                  borderColor: errors.phone ? COLORS.errorText : COLORS.borderGray,
                  backgroundColor: '#fff',
                }}
              >
                <Phone className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" style={{ color: COLORS.grayText }} />
                <PhoneInput
                  data-testid="checkin-phone"
                  international
                  defaultCountry="IN"
                  value={phone}
                  onChange={(val) => setPhone(val || '')}
                  className="flex-1 rcm-phone-input"
                  countrySelectProps={{ 'data-testid': 'checkin-country-code' }}
                  numberInputProps={{
                    'data-testid': 'checkin-phone-input',
                    className: 'outline-none text-sm bg-transparent min-w-0 w-full',
                    style: { color: COLORS.darkText },
                    placeholder: '98765 43210',
                  }}
                />
              </div>
              {errors.phone && <div className="text-[10px] mt-0.5" style={{ color: COLORS.errorText }}>{errors.phone}</div>}
            </div>

            <InputField
              icon={Mail}
              label="Email"
              placeholder="guest@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="checkin-email"
              error={errors.email}
            />

            {flags.guestDetails && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    icon={Users}
                    label="Adults"
                    type="number"
                    readOnly
                    value={totalAdult}
                    data-testid="checkin-adults"
                  />
                  <InputField
                    icon={Users}
                    label="Children"
                    type="number"
                    readOnly
                    value={totalChildren}
                    data-testid="checkin-children"
                  />
                </div>

                {/* Children rows */}
                {childNames.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Children</div>
                    {childNames.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-end gap-1.5 group"
                        data-testid={`checkin-child-row-${i}`}
                      >
                        <Badge>#{i + 1}</Badge>
                        <div className="flex-1">
                          <InputField
                            placeholder="Child name"
                            value={c}
                            onChange={(e) =>
                              setChildNames((rows) => rows.map((x, j) => (j === i ? e.target.value : x)))
                            }
                            data-testid={`checkin-child-${i}-name`}
                            error={errors[`child${i}`]}
                          />
                        </div>
                        <RemoveXBtn
                          onClick={() => removeChildRow(i)}
                          testId={`checkin-remove-child-${i}`}
                          ariaLabel="Remove child"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addChildRow}
                  disabled={totalChildren >= maxChildren}
                  data-testid="checkin-add-child-btn"
                  title={totalChildren >= maxChildren ? `Maximum ${maxChildren} children` : ''}
                  className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium w-fit transition-colors"
                  style={{
                    border: `1px dashed ${COLORS.borderGray}`,
                    color: totalChildren >= maxChildren ? COLORS.grayText : COLORS.primaryOrange,
                    opacity: totalChildren >= maxChildren ? 0.5 : 1,
                    cursor: totalChildren >= maxChildren ? 'not-allowed' : 'pointer',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Child
                </button>
              </>
            )}
          </div>

          {/* ─── COL 2 — Verification ─── */}
          <div className="flex flex-col space-y-2">
            <SectionLabel>Verification</SectionLabel>
            {flags.guestDetails ? (
              <>
                <SelectField
                  label="ID Type"
                  options={ID_TYPES}
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  testId="checkin-id-type"
                />
                <div className="grid grid-cols-2 gap-2">
                  <FileField
                    label="ID Front"
                    required
                    file={frontImage}
                    busy={frontBusy}
                    error={frontError || errors.front}
                    onChange={(e) => handleImagePicked(setFrontImage, setFrontBusy, setFrontError, e)}
                    testId="checkin-front-image"
                  />
                  <FileField
                    label="ID Back"
                    file={backImage}
                    busy={backBusy}
                    error={backError}
                    onChange={(e) => handleImagePicked(setBackImage, setBackBusy, setBackError, e)}
                    testId="checkin-back-image"
                  />
                </div>
              </>
            ) : (
              <div className="text-[11px]" style={{ color: COLORS.grayText }}>
                Verification not required for this restaurant configuration.
              </div>
            )}
          </div>

          {/* ─── COL 3 — Booking & Payment ─── */}
          <div className="flex flex-col space-y-2">
            {flags.bookingDetails ? (
              <>
                <SectionLabel>Booking &amp; Payment</SectionLabel>

                <div className="grid grid-cols-2 gap-2">
                  <RadioPillGroup
                    label="Booking Type"
                    required
                    options={BOOKING_TYPES}
                    value={bookingType}
                    onChange={setBookingType}
                    testIdPrefix="checkin-booking-type"
                  />
                  <RadioPillGroup
                    label="Booking For"
                    required
                    options={BOOKING_FOR}
                    value={bookingFor}
                    onChange={setBookingFor}
                    testIdPrefix="checkin-booking-for"
                  />
                </div>

                <div className="grid grid-cols-[1fr_60px_1fr] gap-2 items-end">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-medium" style={{ color: COLORS.grayText }}>
                        Check-in Date<span className="ml-0.5 font-bold" style={{ color: COLORS.errorText }}>*</span>
                      </span>
                      <EditTimePopover timeVal={checkinTime} setTimeVal={setCheckinTime} testId="checkin-edit-time-btn" />
                    </div>
                    <InputField
                      icon={Calendar}
                      type="date"
                      min={yesterdayStr()}
                      value={checkinDate}
                      onChange={(e) => setCheckinDate(e.target.value)}
                      data-testid="checkin-date"
                      error={errors.checkin}
                    />
                  </div>
                  <InputField
                    label="Nights"
                    type="number"
                    min="1"
                    max="365"
                    value={nights}
                    onChange={(e) => { setManualCheckout(false); setNights(e.target.value); }}
                    data-testid="checkin-nights"
                  />
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-medium" style={{ color: COLORS.grayText }}>
                        Check-out Date<span className="ml-0.5 font-bold" style={{ color: COLORS.errorText }}>*</span>
                      </span>
                      <EditTimePopover timeVal={checkoutTime} setTimeVal={setCheckoutTime} testId="checkout-edit-time-btn" />
                    </div>
                    <div style={{
                      transition: 'background-color 300ms ease-out',
                      backgroundColor: checkoutPulse ? `${COLORS.amber}33` : 'transparent',
                      borderRadius: 8,
                    }}>
                      <InputField
                        icon={Calendar}
                        type="date"
                        min={checkinDate}
                        value={checkoutDate}
                        onChange={(e) => { setManualCheckout(true); setCheckoutDate(e.target.value); }}
                        data-testid="checkout-date"
                        error={errors.checkout}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    icon={CreditCard}
                    label="Room Price"
                    required
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={roomPrice}
                    onChange={(e) => setRoomPrice(e.target.value)}
                    data-testid="checkin-room-price"
                    error={errors.roomPrice}
                  />
                  <InputField
                    icon={CreditCard}
                    label="Order Amount"
                    required
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    data-testid="checkin-amount"
                    error={errors.orderAmount}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    label="Advance"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(e.target.value)}
                    data-testid="checkin-advance"
                    error={errors.advance}
                  />
                  <InputField
                    label="Balance"
                    readOnly
                    value={balancePayment}
                    data-testid="checkin-balance"
                  />
                </div>

                <InputField
                  icon={FileText}
                  label="Special Request"
                  placeholder="Optional note"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  data-testid="checkin-special-request"
                />

                {/* GST / Firm block — gated (V2 §3.6) with expand animation */}
                <div
                  data-testid="checkin-gst-block"
                  style={{
                    transition: 'max-height 200ms ease-out, opacity 200ms ease-out, margin 200ms ease-out',
                    maxHeight: gstBlockVisible ? 220 : 0,
                    opacity: gstBlockVisible ? 1 : 0,
                    overflow: 'hidden',
                    marginTop: gstBlockVisible ? 4 : 0,
                  }}
                  aria-hidden={!gstBlockVisible}
                >
                  <SectionLabel>GST / Firm Details</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <InputField
                      label="Firm Name"
                      required
                      placeholder="Acme Pvt Ltd"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      data-testid="checkin-firm-name"
                      error={errors.firmName}
                    />
                    <InputField
                      label="Firm GSTIN"
                      required
                      placeholder="15-char GSTIN"
                      value={firmGst}
                      onChange={(e) => setFirmGst(e.target.value.toUpperCase())}
                      data-testid="checkin-firm-gst"
                      error={errors.firmGst}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <SectionLabel>Booking &amp; Payment</SectionLabel>
                <div className="text-[11px]" style={{ color: COLORS.grayText }}>
                  Booking details not required for this restaurant configuration.
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Additional Adults section (spans full width) ─── */}
        {flags.guestDetails && (
          <div className="mt-4">
            <SectionLabel>Additional Adults</SectionLabel>
            {extraAdults.length === 0 && (
              <div className="text-[11px] mb-2" style={{ color: COLORS.grayText }}>
                Primary guest counts as Adult #1. Add rows for additional adults staying in the room(s).
              </div>
            )}
            <div className="space-y-2">
              {extraAdults.map((row, i) => (
                <div
                  key={i}
                  className="group grid grid-cols-[auto_1.2fr_1fr_1fr_1fr_auto] gap-2 items-end p-2 rounded-lg"
                  style={{ backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.borderGray}` }}
                  data-testid={`checkin-adult-row-${i + 2}`}
                >
                  <Badge>#{i + 2}</Badge>
                  <InputField
                    label="Name"
                    required
                    placeholder="Full name"
                    value={row.name}
                    onChange={(e) =>
                      setExtraAdults((rows) => rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
                    }
                    data-testid={`checkin-adult-${i + 2}-name`}
                    error={errors[`adult${i}_name`]}
                  />
                  <SelectField
                    label="ID Type"
                    options={ID_TYPES}
                    value={row.idType}
                    onChange={(e) =>
                      setExtraAdults((rows) => rows.map((r, j) => (j === i ? { ...r, idType: e.target.value } : r)))
                    }
                    testId={`checkin-adult-${i + 2}-id-type`}
                  />
                  <FileField
                    label="Front"
                    required
                    file={row.frontImage}
                    busy={row.frontBusy}
                    error={row.frontErr || errors[`adult${i}_front`]}
                    onChange={(e) => handleAdultFile(i, 'frontImage', e)}
                    testId={`checkin-adult-${i + 2}-front`}
                  />
                  <FileField
                    label="Back"
                    file={row.backImage}
                    busy={row.backBusy}
                    error={row.backErr}
                    onChange={(e) => handleAdultFile(i, 'backImage', e)}
                    testId={`checkin-adult-${i + 2}-back`}
                  />
                  <RemoveXBtn
                    onClick={() => removeAdultRow(i)}
                    testId={`checkin-remove-adult-${i + 2}`}
                    ariaLabel={`Remove adult ${i + 2}`}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAdultRow}
              disabled={totalAdult >= maxAdults}
              data-testid="checkin-add-adult-btn"
              title={totalAdult >= maxAdults ? `Maximum ${maxAdults} adults` : ''}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                border: `1px dashed ${COLORS.borderGray}`,
                color: totalAdult >= maxAdults ? COLORS.grayText : COLORS.primaryOrange,
                opacity: totalAdult >= maxAdults ? 0.5 : 1,
                cursor: totalAdult >= maxAdults ? 'not-allowed' : 'pointer',
                backgroundColor: 'transparent',
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Adult
            </button>
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div
        className="flex items-center justify-end gap-3 px-5 py-2.5 flex-shrink-0"
        style={{ backgroundColor: COLORS.lightBg, borderTop: `1px solid ${COLORS.borderGray}` }}
      >
        <button
          type="button"
          onClick={requestClose}
          className="px-6 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
          style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
          data-testid="checkin-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="checkin-submit-btn"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Check In{selectedRoomIds.length > 1 ? ` (${selectedRoomIds.length})` : ''}
        </button>
      </div>

      {/* ─── Dirty-form confirmation dialog (inline implementation to avoid ui/ imports) ─── */}
      {dirtyDialog === 'close' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(26,26,26,0.5)' }}
          onClick={() => setDirtyDialog(null)}
        >
          <div
            data-testid="checkin-dirty-confirm-modal"
            role="dialog"
            aria-labelledby="dirty-dialog-title"
            className="rounded-xl p-5 w-full max-w-md shadow-xl"
            style={{ backgroundColor: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dirty-dialog-title" className="text-base font-bold mb-1" style={{ color: COLORS.darkText }}>
              Unsaved changes
            </h2>
            <p className="text-sm mb-4" style={{ color: COLORS.grayText }}>
              You have entered information that will be lost. Are you sure you want to discard?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDirtyDialog(null)}
                data-testid="dirty-dialog-cancel"
                className="px-4 py-2 rounded-md border text-sm font-medium"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText, backgroundColor: '#fff' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                data-testid="dirty-dialog-discard"
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: COLORS.errorText }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline PhoneInput cosmetic fixes so it blends with our InputField style */}
      <style>{`
        .rcm-phone-wrap .PhoneInput { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
        .rcm-phone-wrap .PhoneInputCountry { display: flex; align-items: center; gap: 4px; }
        .rcm-phone-wrap .PhoneInputInput { flex: 1; outline: none; border: none; background: transparent; font-size: 14px; color: ${COLORS.darkText}; min-width: 0; }
        .rcm-phone-wrap .PhoneInputCountrySelect { font-size: 14px; color: ${COLORS.darkText}; background: transparent; border: none; outline: none; }
      `}</style>
    </div>
  );
};

export default RoomCheckInModal;
