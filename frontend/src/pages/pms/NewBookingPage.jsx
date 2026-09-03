// CR-358-P2: S3 — New Booking Page (Save as Booking → direct-reservation | Walk-in → /pms/check-in prefill)
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Users, Home, Calendar, Bookmark, Check, Loader2, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { getBookableRooms, createDirectReservation } from '@/api/services/pmsService';

const MEAL_PLANS = [
  { value: '', label: 'No preference' },
  { value: 'EP', label: 'Room Only (EP)' },
  { value: 'CP', label: 'Breakfast Included (CP)' },
  { value: 'MAP', label: 'Half Board (MAP)' },
  { value: 'AP', label: 'Full Board (AP)' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (v) => Number(v || 0).toLocaleString('en-IN');

export default function NewBookingPage() {
  // CR-358-P2: BUG-361 sidebar persistence
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') === 'true');
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [checkin, setCheckin] = useState(todayStr());
  const [checkout, setCheckout] = useState(addDays(todayStr(), 1));
  const [amount, setAmount] = useState('');
  const [mealPlan, setMealPlan] = useState('');
  const [notes, setNotes] = useState('');

  // Rooms
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);

  // Submit
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setRoomsLoading(true);
        setRoomsError(null);
        const data = await getBookableRooms();
        setRooms(data);
      } catch (err) {
        setRoomsError(err?.response?.data?.message ?? 'Failed to load rooms');
      } finally {
        setRoomsLoading(false);
      }
    })();
  }, []);

  // CR-358-P2: derived nights
  const nights = useMemo(() => {
    if (!checkin || !checkout) return null;
    return Math.max(1, Math.round((new Date(checkout + 'T00:00:00') - new Date(checkin + 'T00:00:00')) / 86400000));
  }, [checkin, checkout]);

  const isValid = name.trim() && /^\d{10}$/.test(phone) && roomId && checkin && checkout > checkin && Number(amount) > 0 && adults >= 1;

  const notesWithMealPlan = useMemo(() => {
    const mp = MEAL_PLANS.find(m => m.value === mealPlan);
    if (!mealPlan || !mp) return notes;
    return `${notes}${notes ? ' · ' : ''}Meal plan: ${mp.label}`;
  }, [notes, mealPlan]);

  const handleCheckinChange = (val) => {
    setCheckin(val);
    if (nights && val) setCheckout(addDays(val, nights));
  };

  const handleSaveBooking = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const result = await createDirectReservation({
        name: name.trim(), phone, email: email.trim(), checkin, checkout,
        restaurantTableId: roomId, orderAmount: Number(amount), adults, children, notes: notesWithMealPlan,
      });
      toast.success('Booking saved');
      setSuccess(result);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  const handleWalkIn = () => {
    navigate('/pms/check-in', {
      state: { walkin: { name: name.trim(), phone, email: email.trim(), restaurantTableId: roomId, checkin, checkout, orderAmount: Number(amount) || 0, adults, children, note: notesWithMealPlan } },
    });
  };

  const handleNewBooking = () => {
    setSuccess(null);
    setName(''); setPhone(''); setEmail(''); setAdults(1); setChildren(0);
    setRoomId(null); setAmount(''); setMealPlan(''); setNotes('');
    setCheckin(todayStr()); setCheckout(addDays(todayStr(), 1));
  };

  const selectedRoom = rooms.find(r => r.id === roomId);
  const inputCls = 'w-full border border-[#E5E5E5] rounded-lg px-3 h-10 text-[13px] focus:outline-none focus:border-[#329937] bg-white';

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="new-booking-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center gap-3">
          <button data-testid="nb-back-btn" onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-[#666]" /></button>
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A]">New Booking</h1>
            <p className="text-[12px] text-[#888]">Reserve a room · Walk-in or Save as Booking</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-[1fr_320px] gap-5">
            {/* Left column — form */}
            <div className={`space-y-5 ${success ? 'pointer-events-none opacity-50' : ''}`}>

              {/* Guest Details */}
              <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Guest Details</h2>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Name *</label>
                    <div className="relative"><User className="w-4 h-4 absolute left-3 top-3 text-gray-400" /><input data-testid="nb-name" value={name} onChange={e => setName(e.target.value)} placeholder="Guest name" className={`${inputCls} pl-9`} /></div>
                  </div>
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Phone *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[13px] text-[#888]">+91</span>
                      <input data-testid="nb-phone" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10 digits" className={`${inputCls} pl-12`} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Email</label>
                    <div className="relative"><Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" /><input data-testid="nb-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" className={`${inputCls} pl-9`} type="email" /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Adults *</label>
                    <input data-testid="nb-adults" value={adults} onChange={e => setAdults(Math.max(1, Number(e.target.value) || 1))} type="number" min="1" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Children</label>
                    <input data-testid="nb-children" value={children} onChange={e => setChildren(Math.max(0, Number(e.target.value) || 0))} type="number" min="0" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Room Selection */}
              <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Room Selection</h2>
                <div data-testid="nb-room-grid" className="grid grid-cols-3 gap-2.5">
                  {roomsLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[88px] rounded-xl bg-gray-100 animate-pulse" />
                  )) : roomsError ? (
                    <div className="col-span-3 text-center py-6">
                      <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
                      <p className="text-[13px] text-[#888]">{roomsError}</p>
                      <button onClick={() => window.location.reload()} className="text-[13px] text-[#329937] mt-1 underline">Retry</button>
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="col-span-3 text-center py-6">
                      <p className="text-[13px] text-[#888]">No rooms mapped — <button onClick={() => navigate('/pms/channel-manager')} className="text-[#329937] underline">configure in Channel Manager</button></p>
                    </div>
                  ) : rooms.map(r => (
                    <button key={r.id} data-testid={`nb-room-pill-${r.id}`} onClick={() => setRoomId(r.id)} className={`relative p-3 rounded-xl border-2 text-left transition-all ${roomId === r.id ? 'border-[#329937] bg-[#329937]/5' : 'border-[#E5E5E5] bg-white hover:border-[#329937]/40'}`}>
                      <Home className="w-5 h-5 text-[#329937] mb-1.5" />
                      <div className="font-bold text-[15px] text-[#1A1A1A]">{r.tableNo}</div>
                      <div className="text-[11px] text-[#888] capitalize">{r.roomType ?? 'Room'} · ID {r.id}</div>
                      {roomId === r.id && <div className="absolute top-2 right-2 w-5 h-5 bg-[#329937] rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stay & Amount */}
              <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Stay & Amount</h2>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Check-in *</label>
                    <input data-testid="nb-checkin" value={checkin} onChange={e => handleCheckinChange(e.target.value)} type="date" className={inputCls} />
                  </div>
                  <div className="flex flex-col items-center justify-end">
                    <label className="text-[12px] text-[#888] mb-1 block">Nights</label>
                    <div data-testid="nb-nights" className="font-bold text-[18px] text-[#1A1A1A]">{nights ?? '—'}</div>
                  </div>
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Check-out *</label>
                    <input data-testid="nb-checkout" value={checkout} onChange={e => setCheckout(e.target.value)} type="date" min={checkin ? addDays(checkin, 1) : ''} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Room Amount *</label>
                    <div className="relative"><span className="absolute left-3 top-2.5 text-[13px] text-[#888]">₹</span><input data-testid="nb-amount" value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="0" className={`${inputCls} pl-7`} /></div>
                  </div>
                  <div>
                    <label className="text-[12px] text-[#888] mb-1 block">Meal Plan</label>
                    <select data-testid="nb-meal-plan" value={mealPlan} onChange={e => setMealPlan(e.target.value)} className={inputCls}>
                      {MEAL_PLANS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-[#888] mb-1 block">Notes</label>
                  <textarea data-testid="nb-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Special requests, meal preferences…" className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#329937] resize-none bg-white" />
                </div>
              </div>

              {/* CTAs */}
              <div className="grid grid-cols-2 gap-3">
                <button data-testid="nb-save-booking-btn" disabled={!isValid || saving} onClick={handleSaveBooking} className="flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-[#329937] text-[#329937] font-semibold text-[14px] hover:bg-[#329937]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />} Save as Booking
                </button>
                <button data-testid="nb-walkin-btn" disabled={!isValid} onClick={handleWalkIn} className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#329937] text-white font-semibold text-[14px] hover:bg-[#2b8230] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Check className="w-4 h-4" /> Walk-in · Check In Now
                </button>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {success ? (
                /* Success card — OD-P2-05 */
                <div data-testid="nb-success-card" className="bg-white rounded-xl border border-[#E5E5E5] p-5 text-center">
                  <div className="w-14 h-14 bg-[#329937]/10 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="w-7 h-7 text-[#329937]" /></div>
                  <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-1">Booking Saved!</h3>
                  <p className="text-[12px] text-[#888] mb-4">Direct reservation created successfully</p>
                  <div data-testid="nb-success-booking-id" className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-[12px] text-[#1A1A1A] mb-4 break-all">{success.bookingId}</div>
                  <div className="text-left space-y-2 text-[13px] mb-4">
                    <div className="flex justify-between"><span className="text-[#888]">Guest</span><span className="font-medium">{name}</span></div>
                    <div className="flex justify-between"><span className="text-[#888]">Room</span><span className="font-medium text-[#329937]">{selectedRoom ? `${selectedRoom.tableNo} (${selectedRoom.roomType ?? 'Room'})` : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[#888]">Check-in</span><span>{fmtDate(checkin)}</span></div>
                    <div className="flex justify-between"><span className="text-[#888]">Check-out</span><span>{fmtDate(checkout)}</span></div>
                    <div className="flex justify-between"><span className="text-[#888]">Status</span><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pending</span></div>
                  </div>
                  <button data-testid="nb-checkin-now-btn" onClick={() => navigate(`/pms/check-in?booking_id=${encodeURIComponent(success.bookingId)}`)} className="w-full h-10 rounded-xl bg-[#329937] text-white font-semibold text-[13px] hover:bg-[#2b8230] mb-2">Check In Now</button>
                  <button data-testid="nb-new-booking-btn" onClick={handleNewBooking} className="w-full h-10 rounded-xl border border-[#E5E5E5] text-[#666] font-medium text-[13px] hover:bg-gray-50">New Booking</button>
                </div>
              ) : (
                <>
                  {/* Booking Summary */}
                  <div data-testid="nb-summary" className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                    <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Booking Summary</h3>
                    <div className="space-y-2.5 text-[13px]">
                      <div className="flex justify-between"><span className="text-[#888]">Guest</span><span className="font-medium">{name || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-[#888]">Phone</span><span className="font-medium">{phone ? `+91 ${phone}` : '—'}</span></div>
                      <div className="flex justify-between"><span className="text-[#888]">Room</span><span className="font-medium text-[#329937]">{selectedRoom ? `${selectedRoom.tableNo} (${selectedRoom.roomType ?? 'Room'})` : '—'}</span></div>
                      <div className="flex justify-between"><span className="text-[#888]">Check-in</span><span>{fmtDate(checkin)}</span></div>
                      <div className="flex justify-between"><span className="text-[#888]">Check-out</span><span>{fmtDate(checkout)}</span></div>
                      <div className="flex justify-between"><span className="text-[#888]">Duration</span><span>{nights ? `${nights} night${nights > 1 ? 's' : ''}` : '—'}</span></div>
                      <div className="flex justify-between"><span className="text-[#888]">Adults</span><span>{adults}</span></div>
                      <div className="flex justify-between"><span className="text-[#888]">Children</span><span>{children}</span></div>
                    </div>
                    <div className="border-t border-[#E5E5E5] mt-4 pt-3 flex justify-between items-center">
                      <span className="text-[14px] font-semibold text-[#1A1A1A]">Room Amount</span>
                      <span className="text-[16px] font-bold text-[#329937]">{amount ? `₹${fmtMoney(amount)}` : '—'}</span>
                    </div>
                  </div>

                  {/* Booking Type */}
                  <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                    <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">Booking Type</h3>
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-[#329937]/5 border border-[#329937]/20">
                        <div className="text-[13px] font-semibold text-[#1A1A1A]">Direct Reservation</div>
                        <div className="text-[11px] text-[#888]">Save now · Check in later</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 border border-[#E5E5E5]">
                        <div className="text-[13px] font-medium text-[#888]">Walk-in</div>
                        <div className="text-[11px] text-[#AAA]">Check in immediately</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
