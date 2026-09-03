// CR-358-P2: S4 — Check-In Page (arrivals list + Walk-in → pmsService.pmsCheckIn JSON; roomService.checkIn NOT used)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search, Plus, UserPlus, Loader2, AlertCircle, Check, Home, Calendar, User, Phone, Info, BedDouble } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { getPmsReservations, getBookableRooms, pmsCheckIn } from '@/api/services/pmsService';

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

  const today = todayStr();

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
  }, [defaultRoomForType, today]);

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
  }, [rooms, today]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const formNights = useMemo(() => {
    if (!form?.checkin || !form?.checkout) return null;
    return Math.max(1, Math.round((new Date(form.checkout + 'T00:00:00') - new Date(form.checkin + 'T00:00:00')) / 86400000));
  }, [form?.checkin, form?.checkout]);

  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= Number(form.orderAmount);

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
      const res = await pmsCheckIn({
        bookingType: form.bookingType,
        bookingId: form.bookingId,
        name: form.name.trim(),
        phone: form.phone,
        email: form.email,
        restaurantTableId: form.restaurantTableId,
        checkin: form.checkin,
        checkout: form.checkout,
        orderAmount: Number(form.orderAmount),
        advancePayment: Number(form.advancePayment || 0),
        adults: Number(form.adults),
        children: Number(form.children),
        note: form.note,
      });
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
                          <input data-testid="ci-phone" value={form.phone} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10 digits" className={`${inputCls} pl-12`} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[12px] text-[#888] mb-1 block">Room Assignment *</label>
                      <select data-testid="ci-room" value={form.restaurantTableId ?? ''} onChange={e => setField('restaurantTableId', Number(e.target.value))} className={inputCls}>
                        <option value="" disabled>Select room</option>
                        {rooms.map(r => <option key={r.id} value={r.id} disabled={r.isOccupied}>{r.tableNo} ({r.roomType ?? 'Room'}){r.isOccupied ? ' — Occupied' : ''}</option>)}
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

                    <div>
                      <label className="text-[12px] text-[#888] mb-1 block">Note</label>
                      <textarea data-testid="ci-note" value={form.note} onChange={e => setField('note', e.target.value)} rows={2} placeholder="Special requests…" className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#329937] resize-none bg-white" />
                    </div>

                    {/* Info strip */}
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
