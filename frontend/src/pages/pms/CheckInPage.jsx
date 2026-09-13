// CR-358-P2 | BUG-386 | CR-379 | CR-380: S4 — Check-In Page. CR-379: CRM customer link. CR-380: ID document capture, FormData parity.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search, Plus, UserPlus, Loader2, AlertCircle, Check, Home, Calendar, User, Phone, Info, BedDouble, BadgeCheck, FileText } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { getPmsReservations, getBookableRooms, pmsCheckIn } from '@/api/services/pmsService';
import { lookupCustomer, createCustomer, updateCustomer } from '@/api/services/customerService'; // CR-379
import { getDocuments, uploadDocument } from '@/api/services/documentService'; // CR-379, CR-380
import GuestDocsSection, { CRM_DOC_TYPE } from '@/components/pms/GuestDocsSection'; // CR-380
import { useRestaurant } from '@/contexts'; // BUG-386
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-386

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const fmtDateShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
const fmtMoney = (v) => Number(v || 0).toLocaleString('en-IN');

export default function CheckInPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') === 'true');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Data
  const [arrivals, setArrivals] = useState([]);
  const [inHouse, setInHouse] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Selection + form
  const [selected, setSelected] = useState(null); // { bookingId, bookingType, ... } or walkin marker
  const [isWalkin, setIsWalkin] = useState(false);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // CR-379: CRM customer link state
  const [crmCustomer, setCrmCustomer]   = useState(null);  // null = no match / not searched; object = returning guest
  const [crmLoading,  setCrmLoading]    = useState(false);
  const [crmError,    setCrmError]      = useState(null);   // string = timeout/offline message
  const [crmDocs,     setCrmDocs]       = useState([]);     // docs-on-file for returning guest (DD-4)
  // CR-380: Guest ID document capture (OD-3-B, OD-4-A, OD-5-A)
  const [idType,     setIdType]     = useState('Aadhar card');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage,  setBackImage]  = useState(null);
  const idUploadRequired = useMemo(() => localStorage.getItem('mygenie_room_id_upload_required') === 'true', []);
  // CR-379: Extra guests (OD-5A, DD-5, DD-6)
  const [extraAdults,   setExtraAdults]   = useState([]);   // [{name:''}] length = adults - 1
  const [childrenNames, setChildrenNames] = useState([]);   // [''] length = children
  // CR-379: Corporate B2B (DD-7)
  const [isCorpBooking, setIsCorpBooking] = useState(false);
  const [firmName,      setFirmName]      = useState('');
  const [firmGst,       setFirmGst]       = useState('');
  // CR-379: stale-lookup guard — prevents race condition when phone changes mid-request
  const crmLookupPhoneRef = useRef(null);

  const today = todayStr();

  // BUG-386: room accommodation GST from profile slab config
  const { restaurant } = useRestaurant();
  const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};

  // CR-358-P2 A-01: arrivals window today-1..today+60
  const startDate = useMemo(() => addDays(today, -1), [today]);
  const endDate = useMemo(() => addDays(today, 60), [today]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resData, roomsData] = await Promise.all([
        getPmsReservations({ startDate, endDate }),
        getBookableRooms(),
      ]);
      setArrivals(resData.arrivals);
      setInHouse(resData.inHouse);
      setRooms(roomsData);
      return { arrivals: resData.arrivals, rooms: roomsData };
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Initial load + auto-select logic
  useEffect(() => {
    (async () => {
      const data = await load();
      if (!data) return;

      const walkinState = location.state?.walkin;
      const bookingIdParam = searchParams.get('booking_id');

      if (walkinState) {
        selectWalkin(walkinState, data.rooms);
      } else if (bookingIdParam) {
        const match = data.arrivals.find(a => a.bookingId === bookingIdParam);
        if (match) { selectArrival(match, data.rooms); }
        else { toast.error('Booking not found in pending arrivals'); }
      } else {
        const todayArrival = data.arrivals.find(a => a.checkin === today);
        if (todayArrival) selectArrival(todayArrival, data.rooms);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CR-358-P2: A-03 KPI strip derived from same fetch
  const todayArrivingCount = arrivals.filter(a => a.checkin === today).length;
  const inHouseCount = inHouse.length;
  const checkoutTodayCount = inHouse.filter(r => r.checkout === today).length;
  const outstanding = inHouse.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const defaultRoomForType = useCallback((roomCode, roomsList) => {
    const rs = roomsList || rooms;
    const match = rs.find(r => r.roomType === roomCode);
    return match?.id ?? rs[0]?.id ?? null;
  }, [rooms]);

  // CR-379: CRM lookup + docs-on-file fetch. Non-blocking (OD-1A). Stale-guard: crmLookupPhoneRef.
  const handleCrmLookup = useCallback(async (phone) => {
    crmLookupPhoneRef.current = phone;
    setCrmLoading(true);
    setCrmError(null);
    setCrmCustomer(null);
    setCrmDocs([]);
    try {
      const result = await lookupCustomer(phone);
      if (crmLookupPhoneRef.current !== phone) return; // stale — phone changed while request was in-flight
      setCrmCustomer(result); // null = not found; object = returning guest
      if (result?.id) {
        // DD-4: fetch docs immediately after successful lookup (read-only display in CR-379)
        try {
          const docs = await getDocuments(result.id);
          if (crmLookupPhoneRef.current !== phone) return;
          setCrmDocs(docs);
        } catch {
          // Silent — docs-on-file display is informational only
        }
      }
    } catch (err) {
      if (crmLookupPhoneRef.current !== phone) return;
      // lookupCustomer throws only for CRM_TIMEOUT; 4xx = null returned (no throw)
      if (err?.type === 'CRM_TIMEOUT') {
        setCrmError(err.message || 'CRM lookup failed (Timeout / Offline)');
      }
    } finally {
      if (crmLookupPhoneRef.current === phone) setCrmLoading(false);
    }
  }, []); // deps: [] — only uses stable state setters and module-level service functions

  const selectArrival = useCallback((a, roomsList) => {
    setIsWalkin(false);
    setSelected(a);
    setForm({
      bookingType: a.bookingType,
      bookingId: a.bookingId,
      name: a.guestName,
      phone: a.phone,
      email: a.email,
      restaurantTableId: a.restaurantTableId ?? defaultRoomForType(a.roomCode, roomsList),
      checkin: a.checkin ?? today,
      checkout: a.checkout ?? addDays(today, 1),
      orderAmount: a.amount ?? '',
      advancePayment: '',
      adults: a.adults,
      children: a.children,
      note: a.specialRequests,
      _arrivalRoomCode: a.roomCode,
    });
    // CR-379: reset CRM + extra guest state
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    setIdType('Aadhar card'); setFrontImage(null); setBackImage(null); // CR-380
    const adultCount = a.adults ?? 1;
    setExtraAdults(Array.from({ length: Math.max(0, adultCount - 1) }, () => ({ name: '', idType: 'Aadhar card', frontImage: null, backImage: null }))); // CR-380: include doc slots
    setChildrenNames(Array.from({ length: a.children ?? 0 }, () => ''));
    // OD-6A: OTA arrival phone auto-lookup (DD-1)
    if ((a.phone ?? '').length === 10) handleCrmLookup(a.phone);
  }, [defaultRoomForType, today, handleCrmLookup]);

  const selectWalkin = useCallback((prefill, roomsList) => {
    const rs = roomsList || rooms;
    setIsWalkin(true);
    setSelected({ bookingType: 'WalkIn' });
    setForm({
      bookingType: 'WalkIn',
      bookingId: null,
      name: prefill?.name ?? '',
      phone: prefill?.phone ?? '',
      email: prefill?.email ?? '',
      restaurantTableId: prefill?.restaurantTableId ?? rs[0]?.id ?? null,
      checkin: prefill?.checkin ?? today,
      checkout: prefill?.checkout ?? addDays(today, 1),
      orderAmount: prefill?.orderAmount ?? '',
      advancePayment: '',
      adults: prefill?.adults ?? 1,
      children: prefill?.children ?? 0,
      note: prefill?.note ?? '',
      _arrivalRoomCode: null,
    });
    // CR-379: reset CRM + extra guest state
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    setExtraAdults([]);
    setChildrenNames([]);
    setIdType('Aadhar card'); setFrontImage(null); setBackImage(null); // CR-380
    // Auto-lookup if prefill has a 10-digit phone (walk-in from FrontDesk)
    if ((prefill?.phone ?? '').length === 10) handleCrmLookup(prefill.phone);
  }, [rooms, today, handleCrmLookup]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // CR-379: phone change handler — triggers CRM lookup on 10 digits (DD-1)
  const handlePhoneChange = (digits) => {
    setField('phone', digits);
    if (digits.length === 10) {
      handleCrmLookup(digits);
    } else {
      // Cancel any in-flight lookup immediately when user edits phone
      crmLookupPhoneRef.current = null;
      setCrmLoading(false);
      setCrmCustomer(null);
      setCrmError(null);
      setCrmDocs([]);
    }
  };

  const formNights = useMemo(() => {
    if (!form?.checkin || !form?.checkout) return null;
    return Math.max(1, Math.round((new Date(form.checkout + 'T00:00:00') - new Date(form.checkin + 'T00:00:00')) / 86400000));
  }, [form?.checkin, form?.checkout]);

  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= Number(form.orderAmount) && (!idUploadRequired || crmDocs.length > 0 || !!frontImage); // CR-380: mandatory-doc gate (OD-4-A)

  const roomTypeMismatch = useMemo(() => {
    if (!form?._arrivalRoomCode || !form?.restaurantTableId) return false;
    const picked = rooms.find(r => r.id === Number(form.restaurantTableId));
    return picked && picked.roomType !== form._arrivalRoomCode;
  }, [form, rooms]);

  const handleCheckinChange = (val) => {
    setField('checkin', val);
    if (formNights && val) setField('checkout', addDays(val, formNights));
  };

  const handleConfirm = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    try {
      // BUG-386: compute GST before submit — BUG-388: gstBase includes advance (advance is additional charge)
      const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0); // BUG-388
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase, // BUG-388: was Number(form.orderAmount) only
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );

      // CR-379: Step 1 — resolve CRM customer ID (OD-1A: non-blocking)
      let crmCustomerId = crmCustomer?.id ?? null;
      if (!crmCustomerId) {
        try {
          const created = await createCustomer(
            { name: form.name.trim(), phone: form.phone, email: form.email ?? '' },
            restaurant?.id
          );
          crmCustomerId = created?.customer_id ?? null;
        } catch {
          toast.warning('Could not link to CRM — proceeding without loyalty link.');
          // Non-blocking: check-in continues with crmCustomerId = null
        }
      }

      // CR-379: Step 2 — corporate GST sync (DD-7, non-blocking)
      if (isCorpBooking && crmCustomerId && firmGst) {
        try {
          await updateCustomer(
            crmCustomerId,
            { gstName: firmName, gstNumber: firmGst },
            restaurant?.id
          );
        } catch {
          // Non-blocking: corporate GST sync failure does not block check-in
        }
      }

      // CR-379: Step 3 — pmsCheckIn with CRM + extra guest params
      const res = await pmsCheckIn({
        bookingType:       form.bookingType,
        bookingId:         form.bookingId,
        name:              form.name.trim(),
        phone:             form.phone,
        email:             form.email,
        restaurantTableId: form.restaurantTableId,
        checkin:           form.checkin,
        checkout:          form.checkout,
        orderAmount:       Number(form.orderAmount),
        advancePayment:    Number(form.advancePayment || 0),
        adults:            Number(form.adults),
        children:          Number(form.children),
        note:              form.note,
        gstTax, // BUG-386
        // CR-379: CRM + extra guest fields
        customerId:    crmCustomerId,
        extraAdults,
        childrenNames,
        bookingFor:    isCorpBooking ? 'Corporate' : 'Individual',
        firmName:      isCorpBooking ? firmName : '',
        firmGst:       isCorpBooking ? firmGst  : '',
        // CR-380: ID documents
        idType,
        frontImage,
        backImage,
      });
      // CR-380: Step 4 — upload docs to CRM non-blocking (OD-3-B, OD-4-A)
      if (crmCustomerId && frontImage) {
        const docType = CRM_DOC_TYPE[idType] || 'other';
        uploadDocument(crmCustomerId, docType, frontImage).catch(() => {});
        if (backImage) uploadDocument(crmCustomerId, docType, backImage).catch(() => {});
      }
      toast.success(res?.message ?? 'Guest checked in');
      navigate('/pms/in-house'); // CR-358-P2 A-06
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered arrivals
  const filteredArrivals = arrivals.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.guestName?.toLowerCase().includes(q) || a.bookingId?.toLowerCase().includes(q) || a.phone?.includes(q));
  });

  const channelPill = (ch) => {
    if (!ch) return null;
    const isD = ch === 'Direct';
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isD ? 'bg-[#329937]/10 text-[#329937]' : 'bg-blue-50 text-blue-600'}`}>{isD ? 'Direct' : ch}</span>;
  };

  const inputCls = 'w-full border border-[#E5E5E5] rounded-lg px-3 h-10 text-[13px] focus:outline-none focus:border-[#329937] bg-white';

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="check-in-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-[18px] font-bold text-[#1A1A1A]">Check-In</h1>
            <p className="text-[12px] text-[#888]">Today's arrivals · {todayArrivingCount} pending</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input data-testid="ci-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guest or booking ID…" className="border border-[#E5E5E5] rounded-lg pl-9 pr-3 h-9 text-[13px] w-52 focus:outline-none focus:border-[#329937]" />
          </div>
          <button data-testid="ci-new-booking-btn" onClick={() => navigate('/pms/new-booking')} className="flex items-center gap-1.5 border border-[#E5E5E5] text-[13px] px-3 h-9 rounded-lg text-[#666] hover:bg-gray-50"><Plus className="w-4 h-4" /> New Booking</button>
          <button data-testid="ci-walkin-btn" onClick={() => selectWalkin()} className="flex items-center gap-1.5 bg-[#329937] text-white text-[13px] px-3 h-9 rounded-lg hover:bg-[#2b8230]"><UserPlus className="w-4 h-4" /> Walk-in</button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-[1fr_400px] gap-5">
            {/* Left column */}
            <div className="space-y-5">
              {/* KPI strip — A-03 */}
              <div data-testid="ci-kpi-strip" className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Arriving Today', value: loading ? '…' : todayArrivingCount, color: '' },
                  { label: 'In-House', value: loading ? '…' : inHouseCount, color: 'text-[#329937]' },
                  { label: 'Checkout Today', value: loading ? '…' : checkoutTodayCount, color: 'text-amber-500' },
                  { label: 'Outstanding', value: loading ? '…' : `₹${fmtMoney(outstanding)}`, color: 'text-red-500' },
                ].map((k, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-3 text-center">
                    <div className={`text-[20px] font-bold ${k.color || 'text-[#1A1A1A]'}`}>{k.value}</div>
                    <div className="text-[11px] text-[#888] mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Walk-in banner */}
              <button data-testid="ci-walkin-banner" onClick={() => selectWalkin()} className="w-full bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-3 text-left hover:bg-amber-100/60 transition-colors">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center"><UserPlus className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <div className="text-[13px] font-semibold text-[#1A1A1A]">Guest arriving without a booking?</div>
                  <div className="text-[12px] text-amber-700">Tap here for instant walk-in check-in →</div>
                </div>
              </button>

              {/* Arrivals list */}
              <div>
                <h3 className="text-[13px] font-semibold text-[#888] mb-3">Arrivals · Today & Upcoming</h3>
                <div data-testid="ci-arrivals-list" className="space-y-2">
                  {/* Walk-in pseudo-card when active */}
                  {isWalkin && (
                    <div data-testid="ci-walkin-card" className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center"><UserPlus className="w-5 h-5 text-amber-700" /></div>
                      <div><div className="text-[14px] font-semibold text-[#1A1A1A]">Walk-in Guest</div><div className="text-[11px] text-amber-600">No booking ID — Walk-in</div></div>
                    </div>
                  )}

                  {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#329937]" /></div>
                  : error ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-[13px] text-[#888]">{error}</p>
                      <button onClick={load} className="text-[13px] text-[#329937] mt-1 underline">Retry</button>
                    </div>
                  ) : filteredArrivals.length === 0 ? (
                    <div className="text-center py-8 text-[13px] text-[#888]">No pending arrivals</div>
                  ) : filteredArrivals.map(a => (
                    <button key={a.bookingId ?? a.id} data-testid={`ci-arrival-card-${a.bookingId}`} onClick={() => selectArrival(a)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        !isWalkin && selected?.bookingId === a.bookingId ? 'border-[#329937] bg-[#329937]/5' : 'border-[#E5E5E5] bg-white hover:border-[#329937]/40'
                      }`}>
                      <div className="w-10 h-10 bg-[#329937]/10 rounded-lg flex items-center justify-center shrink-0">
                        <span className="font-bold text-[13px] text-[#329937]">{a.tableNo ?? a.roomCode?.charAt(0)?.toUpperCase() ?? '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[14px] font-semibold text-[#1A1A1A] truncate">{a.guestName || 'Guest'}</span>
                          {channelPill(a.channel)}
                          {a.mealPlan && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{a.mealPlan}</span>}
                        </div>
                        <div className="text-[11px] text-[#888]">{fmtDateShort(a.checkin)} → {fmtDateShort(a.checkout)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] font-semibold text-[#1A1A1A]">{a.nights ? `${a.nights} night${a.nights > 1 ? 's' : ''}` : ''}</div>
                        {!isWalkin && selected?.bookingId === a.bookingId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#329937]/10 text-[#329937] font-medium">Selected</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div>
              {!form ? (
                <div data-testid="ci-panel-empty" className="bg-white rounded-xl border border-[#E5E5E5] p-10 text-center">
                  <BedDouble className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-[14px] text-[#888]">Select an arrival or start a Walk-in</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
                  {/* Panel header */}
                  <div data-testid="ci-panel-header" className="px-5 py-4 border-b border-[#E5E5E5] bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${isWalkin ? 'bg-amber-400' : 'bg-[#329937]'}`} />
                      <span className="text-[15px] font-bold text-[#1A1A1A]">{form.name || (isWalkin ? 'Walk-in Guest' : 'Guest')}</span>
                      {isWalkin ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Walk-in</span> : channelPill(selected?.channel)}
                    </div>
                    <div className="text-[11px] text-[#888]">{form.bookingId ? `Booking: ${form.bookingId}` : 'No booking ID — Walk-in'}</div>
                  </div>

                  {/* CR-379: CRM badge — 4 states: loading / returning / new / failed (DD-2, DD-8) */}
                  {form.phone?.length === 10 && (
                    <div className="px-5 pt-3 pb-0">
                      {/* State 1: loading */}
                      {crmLoading && (
                        <div data-testid="ci-crm-loading"
                          className="flex items-center gap-2 text-[12px] text-[#888] bg-gray-50 rounded-lg px-3 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Looking up CRM…</span>
                        </div>
                      )}
                      {/* State 4: failed / CRM offline (DD-8 — amber non-blocking) */}
                      {!crmLoading && crmError && (
                        <div data-testid="ci-crm-error"
                          className="flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <div>
                            <div className="font-medium">CRM lookup failed (Timeout / Offline)</div>
                            <div className="text-[11px] text-amber-600">Check-in will proceed without loyalty link.</div>
                          </div>
                        </div>
                      )}
                      {/* State 2: returning guest (DD-3 — 4-column stats + docs) */}
                      {!crmLoading && !crmError && crmCustomer && (
                        <div data-testid="ci-crm-badge"
                          className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3">
                          <div className="flex items-center gap-2 mb-2.5">
                            <BadgeCheck className="w-4 h-4 text-[#329937]" />
                            <span className="text-[12px] font-semibold text-[#329937]">Returning Guest</span>
                            {crmCustomer.tier && (
                              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#329937]/10 text-[#329937] font-medium">
                                {crmCustomer.tier}
                              </span>
                            )}
                          </div>
                          {/* DD-3: 4-column stats row */}
                          <div className="grid grid-cols-4 gap-2 mb-1">
                            {[
                              {
                                label: 'Stays',
                                value: crmCustomer.totalVisits ?? '—',
                                sub: null,
                              },
                              {
                                label: 'Last Stay',
                                value: crmCustomer.lastVisit
                                  ? new Date(crmCustomer.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                  : '—',
                                sub: null,
                              },
                              {
                                label: 'Loyalty Pts',
                                value: crmCustomer.totalPoints != null ? String(crmCustomer.totalPoints) : '0',
                                sub: crmCustomer.pointsValue
                                  ? `≈ ₹${Number(crmCustomer.pointsValue).toLocaleString('en-IN')}`
                                  : null,
                              },
                              {
                                label: 'Store Credit',
                                value: crmCustomer.walletBalance != null
                                  ? `₹${Number(crmCustomer.walletBalance).toLocaleString('en-IN')}`
                                  : '₹0',
                                sub: 'Prepaid balance',
                              },
                            ].map((stat, i) => (
                              <div key={i} className="text-center">
                                <div className="text-[13px] font-bold text-[#1A1A1A]">{stat.value}</div>
                                <div className="text-[10px] text-[#888] mt-0.5">{stat.label}</div>
                                {stat.sub && <div className="text-[9px] text-[#329937] font-medium">{stat.sub}</div>}
                              </div>
                            ))}
                          </div>
                          {/* DD-4: Documents on file — read-only cards (CR-380 owns upload) */}
                          {crmDocs.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#BBF7D0]">
                              <div className="text-[10px] text-[#888] font-medium uppercase tracking-wide mb-1.5">
                                Documents on file
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {crmDocs.map((doc, i) => (
                                  <div key={i} data-testid={`ci-doc-card-${doc.doc_type}`}
                                    className="flex items-center gap-1.5 text-[10px] bg-white border border-[#BBF7D0] rounded-lg px-2 py-1">
                                    <FileText className="w-3 h-3 text-[#329937] shrink-0" />
                                    <span className="font-medium capitalize">{(doc.doc_type ?? '').replace(/_/g, ' ')}</span>
                                    {doc.uploaded_at && (
                                      <span className="text-[#888]">
                                        · {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* State 3: new guest (no badge needed, subtle indicator) */}
                      {!crmLoading && !crmError && !crmCustomer && (
                        <div data-testid="ci-crm-new-guest"
                          className="flex items-center gap-2 text-[12px] text-[#888] bg-gray-50 rounded-lg px-3 py-2">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>New guest — will be registered in CRM on check-in</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Form */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[12px] text-[#888] mb-1 block">Guest Name *</label>
                        <input data-testid="ci-name" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Full name" className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[12px] text-[#888] mb-1 block">Phone *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-[13px] text-[#888]">+91</span>
                          <input data-testid="ci-phone" value={form.phone} onChange={e => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10 digits" className={`${inputCls} pl-12`} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[12px] text-[#888] mb-1 block">Room Assignment *</label>
                      <select data-testid="ci-room" value={form.restaurantTableId ?? ''} onChange={e => setField('restaurantTableId', Number(e.target.value))} className={inputCls}>
                        <option value="" disabled>Select room</option>
                        {rooms.map(r => { // BUG-387: disable OOO + HK rooms
                          const unavail = r.isOccupied || r.isOoo || r.isHk;
                          const lbl = r.isOccupied ? ' — Occupied' : r.isOoo ? ' — Out of Order' : r.isHk ? ' — Needs Cleaning' : '';
                          return <option key={r.id} value={r.id} disabled={unavail}>{r.tableNo} ({r.roomType ?? 'Room'}){lbl}</option>;
                        })}
                      </select>
                      {roomTypeMismatch && (
                        <div data-testid="ci-room-type-warning" className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          <Info className="w-3.5 h-3.5" /> Room type differs from booking ({form._arrivalRoomCode})
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[12px] text-[#888] mb-1 block">Check-in *</label>
                        <input data-testid="ci-checkin" value={form.checkin} onChange={e => handleCheckinChange(e.target.value)} type="date" className={inputCls} />
                      </div>
                      <div className="flex flex-col items-center justify-end">
                        <label className="text-[12px] text-[#888] mb-1 block">Nights</label>
                        <div data-testid="ci-nights" className="font-bold text-[16px] text-[#1A1A1A]">{formNights ?? '—'}</div>
                      </div>
                      <div>
                        <label className="text-[12px] text-[#888] mb-1 block">Check-out *</label>
                        <input data-testid="ci-checkout" value={form.checkout} onChange={e => setField('checkout', e.target.value)} type="date" min={form.checkin ? addDays(form.checkin, 1) : ''} className={inputCls} />
                      </div>
                    </div>

                    {/* CR-379: Occupancy & Guest Name Register (DD-5, DD-6) */}
                    <div>
                      <label className="text-[12px] text-[#888] mb-1.5 block font-medium">
                        Occupancy & Guest Register
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-[#888] mb-1 block">Adults</label>
                          <input
                            data-testid="ci-adults"
                            type="number" min="1" max="10"
                            value={form.adults}
                            onChange={e => {
                              const v = Math.max(1, Number(e.target.value) || 1);
                              setField('adults', v);
                              setExtraAdults(prev =>
                                Array.from({ length: v - 1 }, (_, i) => prev[i] ?? { name: '', idType: 'Aadhar card', frontImage: null, backImage: null }) // CR-380: include doc slots
                              );
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#888] mb-1 block">Children</label>
                          <input
                            data-testid="ci-children"
                            type="number" min="0" max="10"
                            value={form.children}
                            onChange={e => {
                              const v = Math.max(0, Number(e.target.value) || 0);
                              setField('children', v);
                              setChildrenNames(prev =>
                                Array.from({ length: v }, (_, i) => prev[i] ?? '')
                              );
                            }}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      {/* DD-5 + CR-380: Extra adult name + ID doc slots (Adult 2 → 4) */}
                      {extraAdults.map((adult, i) => (
                        <div key={i} className="mt-3 space-y-2">
                          <input
                            data-testid={`ci-adult-name-${i + 2}`}
                            value={adult.name}
                            onChange={e =>
                              setExtraAdults(prev =>
                                prev.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item) // CR-380: spread preserves idType/images
                              )
                            }
                            placeholder={`Adult ${i + 2} Name`}
                            className={inputCls}
                          />
                          <GuestDocsSection
                            label={`Adult ${i + 2}`}
                            idType={adult.idType ?? 'Aadhar card'}
                            onIdTypeChange={v => setExtraAdults(prev => prev.map((item, idx) => idx === i ? { ...item, idType: v } : item))}
                            frontImage={adult.frontImage ?? null}
                            onFrontChange={f => setExtraAdults(prev => prev.map((item, idx) => idx === i ? { ...item, frontImage: f } : item))}
                            backImage={adult.backImage ?? null}
                            onBackChange={b => setExtraAdults(prev => prev.map((item, idx) => idx === i ? { ...item, backImage: b } : item))}
                            required={false}
                            hasCrmDocs={false}
                            inputCls={inputCls}
                          />
                        </div>
                      ))}
                      {/* DD-6: Children name inputs — one per child */}
                      {childrenNames.map((name, i) => (
                        <div key={i} className="mt-2">
                          <input
                            data-testid={`ci-child-name-${i + 1}`}
                            value={name}
                            onChange={e =>
                              setChildrenNames(prev =>
                                prev.map((item, idx) => idx === i ? e.target.value : item)
                              )
                            }
                            placeholder={`Child ${i + 1} Name & Age`}
                            className={`${inputCls} border-purple-200 focus:border-purple-400`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* CR-379: Corporate / B2B toggle (DD-7) */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          data-testid="ci-corp-toggle"
                          checked={isCorpBooking}
                          onChange={e => setIsCorpBooking(e.target.checked)}
                          className="rounded border-[#E5E5E5] text-[#329937] focus:ring-[#329937]"
                        />
                        <span className="text-[13px] text-[#1A1A1A] font-medium">Corporate / B2B Billing</span>
                      </label>
                      <p className="text-[11px] text-[#888] mt-0.5 ml-5">
                        Check if invoice is raised to company GSTIN
                      </p>
                      {isCorpBooking && (
                        <div className="mt-2 space-y-2 ml-5">
                          <input
                            data-testid="ci-firm-name"
                            value={firmName}
                            onChange={e => setFirmName(e.target.value)}
                            placeholder="Company / Firm Name"
                            className={inputCls}
                          />
                          <input
                            data-testid="ci-firm-gst"
                            value={firmGst}
                            onChange={e => setFirmGst(e.target.value)}
                            placeholder="GST Number (e.g. 29XXXXX1234N1Z5)"
                            className={inputCls}
                          />
                        </div>
                      )}
                    </div>

                    {/* CR-380: Primary guest ID document capture (OD-3-B, OD-4-A) */}
                    <GuestDocsSection
                      label="Primary Guest"
                      idType={idType}
                      onIdTypeChange={setIdType}
                      frontImage={frontImage}
                      onFrontChange={setFrontImage}
                      backImage={backImage}
                      onBackChange={setBackImage}
                      required={idUploadRequired}
                      hasCrmDocs={crmDocs.length > 0}
                      inputCls={inputCls}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[12px] text-[#888] mb-1 block">Room Amount *</label>
                        <div className="relative"><span className="absolute left-3 top-2.5 text-[13px] text-[#888]">₹</span><input data-testid="ci-amount" value={form.orderAmount} onChange={e => setField('orderAmount', e.target.value)} type="number" min="1" placeholder="0" className={`${inputCls} pl-7`} /></div>
                      </div>
                      <div>
                        <label className="text-[12px] text-[#888] mb-1 block">Advance Payment</label>
                        <div className="relative"><span className="absolute left-3 top-2.5 text-[13px] text-[#888]">₹</span><input data-testid="ci-advance" value={form.advancePayment} onChange={e => setField('advancePayment', e.target.value)} type="number" min="0" max={form.orderAmount || 0} placeholder="0" className={`${inputCls} pl-7`} /></div>
                      </div>
                    </div>

                    {/* BUG-386: GST Accommodation strip */}
                    {(() => {
                      const amt = Number(form.orderAmount) || 0;
                      const advAmt = Number(form.advancePayment) || 0;
                      const gstBase = amt + advAmt; // BUG-388: advance is additional charge — include in GST base
                      const nights = formNights ?? 1;
                      const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, nights, 1);
                      const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const rate = roomGstSlabs?.slabs?.find(s => (gstBase / nights) >= (s.min ?? 0) && (s.max == null || (gstBase / nights) <= s.max))?.gst_percent ?? 0;
                      const hasGst = roomGstApplicable && roomGstSlabs && gstTotal > 0;
                      const notApplicable = !roomGstApplicable || !roomGstSlabs;
                      if (!amt || (!hasGst && !notApplicable)) return null;
                      return (
                        <div data-testid="ci-gst-strip"
                          className={`rounded-xl border px-4 py-3 flex flex-col gap-1.5 text-[12px] ${hasGst ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FAFAFA] border-[#E5E5E5]'}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-semibold text-[11px] uppercase tracking-wide ${hasGst ? 'text-[#166534]' : 'text-[#888]'}`}>GST (Accommodation)</span>
                            {hasGst
                              ? <span className="text-[10px] font-bold bg-[#22C55E] text-white px-2 py-0.5 rounded-full">{rate}% Slab</span>
                              : <span className="text-[10px] font-semibold bg-[#E5E5E5] text-[#888] px-2 py-0.5 rounded-full">Not Applicable</span>
                            }
                          </div>
                          {hasGst ? (
                            <>
                              <div className="flex justify-between text-[#374151]">
                                <span>CGST ({rate / 2}%)</span>
                                <span>₹{fmt(cgst)}</span>
                              </div>
                              <div className="flex justify-between text-[#374151]">
                                <span>SGST ({rate / 2}%)</span>
                                <span>₹{fmt(sgst)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-[#888] italic border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                                <span>Total GST (CGST + SGST)</span>
                                <span className="font-semibold text-[#166534]">₹{fmt(gstTotal)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-[#1A1A1A] border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                                <span>Total incl. GST</span>
                                <span className="text-[#15803D] text-[13px]">₹{fmt(gstBase + gstTotal)}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-[#888] text-[12px]">GST not configured for this property. Sending gst_tax: 0.00</span>
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-[12px] text-[#888] mb-1 block">Note</label>
                      <textarea data-testid="ci-note" value={form.note} onChange={e => setField('note', e.target.value)} rows={2} placeholder="Special requests…" className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#329937] resize-none bg-white" />
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-[#888] bg-gray-50 rounded-lg px-3 py-2">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span data-testid="ci-type-label">Booking type: <strong className="text-[#1A1A1A]">{form.bookingType}</strong></span>
                      {form.bookingId && <span data-testid="ci-booking-id-label" className="ml-auto font-mono text-[11px]">{form.bookingId}</span>}
                    </div>

                    <button data-testid="ci-confirm-btn" disabled={!formValid || submitting} onClick={handleConfirm}
                      className="w-full h-11 rounded-xl bg-[#329937] text-white font-semibold text-[14px] hover:bg-[#2b8230] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm Check-In
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
