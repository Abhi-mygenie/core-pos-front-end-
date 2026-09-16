# CR-362 Implementation Plan — Gate 3
## PMS — Booking Modification & Cancellation

**Date:** 2026-09-13
**Role:** PLANNING AGENT (ALPHA v0.7) — Gate 3 only
**Source:** Impact Analysis at `impact/CR-362_IMPACT_ANALYSIS.md` + Design decisions (Gate 2.5)
**Risk:** CRITICAL | **Sprint:** pos_pms_1

---

## IA Accuracy Check (entry verification)

| File | IA Claim | Live Code | Verdict |
|---|---|---|---|
| `constants.js` | AIOSELL_ENDPOINTS last entry = `MARK_NO_SHOW` | ✅ Confirmed L593 | MATCH |
| `pmsService.js` | 390 lines, last export `markNoShowBooking` L389 | ✅ Confirmed | MATCH |
| `pmsService.js` | `bucketReservationOps` at L212, returns object with buckets | ✅ Confirmed L212-234 | MATCH |
| `aiosellTransform.js` | `fromReservationOps` at L196, roomLines ends L225 | ✅ Confirmed | MATCH |
| `ArrivalsPage.jsx` | Imports L2-8, state L47, action col L231-257 | ✅ Confirmed | MATCH |
| `DeparturesPage.jsx` | Imports L2-8, action col L236-251 | ✅ Confirmed | MATCH |
| `InHouseGuestsPage.jsx` | View Bill button at L165-171 | ✅ Confirmed | MATCH |
| `ReservationsPage.jsx` | BlockPopover button section L341-378 | ✅ Confirmed | MATCH |

**IA drift: NONE. Plan proceeds.**

---

## Design Decisions Applied (Gate 2.5 — all locked)

| D | Decision |
|---|---|
| D1 | Arrivals row: **Kebab `⋮` menu** — Check In stays primary, secondary actions (Modify/Cancel/No-Show) in dropdown |
| D2 | **Modal dialogs** for all 3 new dialogs (Cancel / Modify / ExtendStay) |
| D3 | Cancelled tab columns: Channel · Guest · Room · Was Booked · Reason · Cancelled By · Date |

---

## Execution Sequence

Execute in this order. Compile-check after E6 (all new files done) and again after E10 (all pages done).

```
E1 → E2 → E3 → E4 (NEW) → E5 (NEW) → E6 (NEW) → [compile check] 
→ E7 → E8 → E9 → E10 → [compile check] → EXIT GATE
```

---

## E1 — `api/constants.js` : Add EXTEND_STAY endpoint

**Line:** After L593 (`MARK_NO_SHOW` — last line in AIOSELL_ENDPOINTS), before closing `};`

**Before:**
```js
  MARK_NO_SHOW:            '/api/v2/vendoremployee/aiosell/mark-no-show',
};
```

**After:**
```js
  MARK_NO_SHOW:            '/api/v2/vendoremployee/aiosell/mark-no-show',
  // CR-362 — Booking Modification & Cancellation
  EXTEND_STAY:             '/api/v2/vendoremployee/pos/room-extend-stay',         // CR-362: POST {order_id, new_checkout_date, new_room_price, reason}
};
```

*Cancel/Modify reuse `LOCAL_RESERVATIONS` with dynamic `/{id}` suffix in service — no new constant needed.*

---

## E2 — `api/transforms/aiosellTransform.js` : Add cancelReason/cancelledAt to fromReservationOps

**Line:** L207-208 — after `checkedOutAt` line, before `roomLines` map

**Before:**
```js
    checkedOutAt:   first.checked_out_at ?? null,
    roomLines: rooms.map((rm, i) => ({
```

**After:**
```js
    checkedOutAt:   first.checked_out_at ?? null,
    cancelReason:   r.cancel_reason   ?? null,                      // CR-362
    cancelledAt:    r.cancelled_at    ?? null,                      // CR-362
    cancelledBy:    r.cancelled_by    ?? null,                      // CR-362
    roomLines: rooms.map((rm, i) => ({
```

---

## E3 — `api/services/pmsService.js` : Two changes

### E3a — Add `cancelled` bucket to `bucketReservationOps` (L230)

**Before:**
```js
    withSpecialRequests: pending.filter(r => (r.specialRequests ?? '').trim() !== '').length,
  };
};
```

**After:**
```js
    withSpecialRequests: pending.filter(r => (r.specialRequests ?? '').trim() !== '').length,
    cancelled:           list.filter(r => r.operationalStatus === 'cancelled')       // CR-362
                             .sort((a, b) => String(b.cancelledAt ?? b.checkin ?? '').localeCompare(String(a.cancelledAt ?? a.checkin ?? ''))), // CR-362: newest first
  };
};
```

### E3b — Add 4 new service exports at end of file (after L390)

**After `markNoShowBooking` (last line):**
```js

// CR-362 — Booking Modification & Cancellation ──────────────────────────────

/** Cancel a pending reservation.
 *  notify_cm: true → backend pushes +1 inventory to channel manager.
 *  409 if any room line is already checked in. */
export const cancelReservation = async (reservationId, { reason, cancelledBy }) => {
  const res = await api.post(
    `${AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS}/${reservationId}/cancel`,
    { reason, cancelled_by: cancelledBy, notify_cm: true },
  );
  return res.data;
};

/** Modify dates / amount on a PENDING reservation. 409 if already checked in.
 *  amountAfterTax = new FULL stay total (rate × new nights). */
export const modifyReservation = async (reservationId, { checkin, checkout, amountAfterTax, reason }) => {
  const body = { reason };
  if (checkin)             body.checkin          = checkin;
  if (checkout)            body.checkout         = checkout;
  if (amountAfterTax != null) body.amount_after_tax = amountAfterTax;
  const res = await api.patch(
    `${AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS}/${reservationId}`,
    body,
  );
  return res.data;
};

/** Extend an in-house guest's stay.
 *  newRoomPrice = FULL new total (original nights + extension nights combined).
 *  Backend atomically updates checkout_date, room_info (room_price+balance_payment), inventory. */
export const extendStay = async ({ orderId, newCheckoutDate, newRoomPrice, reason }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.EXTEND_STAY, {
    order_id:          orderId,
    new_checkout_date: newCheckoutDate,
    new_room_price:    newRoomPrice,
    reason,
  });
  return res.data;
};

/** Fetch recently cancelled reservations for the Cancelled tab (±60d window). */
export const getCancelledReservations = async () => {
  const res = await api.get(AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS, {
    params: { start_date: dateOffset(-60), end_date: dateOffset(60), status: 'cancelled' },
  });
  const raw  = Array.isArray(res.data?.data?.reservations) ? res.data.data.reservations
             : Array.isArray(res.data?.reservations) ? res.data.reservations : [];
  return raw.map(aiosellTransform.fromAPI.reservationOps);
};
```

---

## E4 — `components/pms/CancelBookingDialog.jsx` — NEW FILE (~90 lines)

```jsx
// CR-362: Cancel a pending reservation — reason picker + OTA extranet warning + advance refund note
import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, DollarSign, X } from 'lucide-react';
import { cancelReservation } from '@/api/services/pmsService';
import { getCancellationReasons } from '@/api/services/settingsService';
import { toast } from 'sonner';

const OTA_CHANNELS = ['booking.com', 'goibibo', 'gommt', 'makemytrip', 'expedia', 'agoda'];

export default function CancelBookingDialog({ target, onClose, onSuccess }) {
  // target: { reservationId, guestName, channel, checkin, checkout, roomCode, advance, cancelledBy }
  const [reasons,  setReasons]  = useState([]);
  const [reasonId, setReasonId] = useState('');
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (!target) return;
    getCancellationReasons({ limit: 50, offset: 1 })
      .then(r => setReasons(Array.isArray(r) ? r : []))
      .catch(() => setReasons([]));
  }, [target]);

  if (!target) return null;

  const isOta      = OTA_CHANNELS.includes((target.channel ?? '').toLowerCase());
  const hasAdvance = Number(target.advance ?? 0) > 0;
  const reasonText = reasons.find(r => String(r.id) === String(reasonId))?.name ?? '';

  const handleConfirm = async () => {
    if (!reasonId) { toast.error('Please select a cancellation reason'); return; }
    setBusy(true);
    try {
      await cancelReservation(target.reservationId, {
        reason: reasonText,
        cancelledBy: target.cancelledBy,
      });
      toast.success('Booking cancelled. Room inventory updated.');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Cancellation failed';
      toast.error(msg.includes('checked') ? 'Cannot cancel — room already checked in.' : msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="cancel-booking-dialog">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Cancel Booking</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F7F7F7] rounded"><X className="w-4 h-4 text-[#888]"/></button>
        </div>
        <p className="text-[12px] text-[#888] mb-4">
          {target.guestName} · {target.channel} · {target.roomCode} · {target.checkin} – {target.checkout}
        </p>

        {/* OTA warning */}
        {isOta && (
          <div className="flex gap-2 bg-[#FFF7ED] border border-[#FCD34D] rounded-lg p-3 mb-3 text-[11px] text-[#92400E]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#D97706]"/>
            <span>Also cancel this booking on the <strong>{target.channel}</strong> extranet to notify the guest. This only frees up your room inventory.</span>
          </div>
        )}

        {/* Advance refund note */}
        {hasAdvance && (
          <div className="flex gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 mb-3 text-[11px] text-[#991B1B]">
            <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5"/>
            <span>Advance ₹{Number(target.advance).toLocaleString('en-IN')} received — refund to guest manually.</span>
          </div>
        )}

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">
            Cancellation Reason <span className="text-[#EF4444]">*</span>
          </label>
          <select value={reasonId} onChange={e => setReasonId(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] font-['Poppins']"
            data-testid="cancel-reason-select">
            <option value="">Select reason…</option>
            {reasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end border-t border-[#F3F4F6] pt-4">
          <button onClick={onClose} disabled={busy}
            className="px-4 py-2 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA] disabled:opacity-40">
            Keep Booking
          </button>
          <button onClick={handleConfirm} disabled={busy || !reasonId}
            className="px-4 py-2 text-[12px] font-semibold rounded-md bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-40 flex items-center gap-1.5"
            data-testid="cancel-booking-confirm-btn">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## E5 — `components/pms/ModifyBookingDialog.jsx` — NEW FILE (~110 lines)

```jsx
// CR-362: Modify dates + amount on a pending reservation. Fetches live rates on date change.
import { useState, useEffect } from 'react';
import { Loader2, X, CheckCircle } from 'lucide-react';
import { modifyReservation, getRatesData } from '@/api/services/pmsService';
import { toast } from 'sonner';

export default function ModifyBookingDialog({ target, onClose, onSuccess }) {
  // target: { reservationId, guestName, channel, roomCode, checkin, checkout, cancelledBy }
  const [checkin,   setCheckin]   = useState('');
  const [checkout,  setCheckout]  = useState('');
  const [rates,     setRates]     = useState([]);
  const [selectedRate, setSelectedRate] = useState(null); // { name, total, nights }
  const [reason,    setReason]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [busy,      setBusy]      = useState(false);

  useEffect(() => {
    if (!target) return;
    setCheckin(target.checkin ?? '');
    setCheckout(target.checkout ?? '');
  }, [target]);

  // Fetch live rates when dates change
  useEffect(() => {
    if (!checkin || !checkout || checkout <= checkin) { setRates([]); setSelectedRate(null); return; }
    setLoading(true);
    getRatesData({ startDate: checkin, endDate: checkout })
      .then(data => {
        const rateplans = data?.rateplans ?? data ?? [];
        const nights = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
        const mapped = rateplans.slice(0, 5).map(rp => ({
          id: rp.id ?? rp.rateplanId,
          name: rp.name ?? rp.rateplanName ?? 'Standard Rate',
          perNight: Number(rp.rates?.[checkin] ?? rp.rate ?? 0),
          total: Number(rp.rates?.[checkin] ?? rp.rate ?? 0) * nights,
          nights,
        }));
        setRates(mapped);
        setSelectedRate(mapped[0] ?? null);
      })
      .catch(() => setRates([]))
      .finally(() => setLoading(false));
  }, [checkin, checkout]);

  if (!target) return null;

  const handleConfirm = async () => {
    if (!checkin || !checkout || checkout <= checkin) { toast.error('Invalid date range'); return; }
    setBusy(true);
    try {
      await modifyReservation(target.reservationId, {
        checkin,
        checkout,
        amountAfterTax: selectedRate?.total ?? undefined,
        reason,
      });
      toast.success('Booking modified.');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Modification failed';
      toast.error(msg.includes('checked') ? 'Cannot modify — room already checked in.' : msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="modify-booking-dialog">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-[15px] font-semibold">Modify Booking</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[#888]"/></button>
        </div>
        <p className="text-[12px] text-[#888] mb-4">
          {target.guestName} · {target.channel} · {target.roomCode} · Current: {target.checkin} – {target.checkout}
        </p>

        {/* Date pickers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Check-in</label>
            <input type="date" value={checkin} onChange={e => setCheckin(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="modify-checkin"/>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Check-out</label>
            <input type="date" value={checkout} min={checkin ? checkin : ''} onChange={e => setCheckout(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="modify-checkout"/>
          </div>
        </div>

        {/* Live rates */}
        {(checkin && checkout && checkout > checkin) && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-2">
              Rate for new dates {loading && <span className="text-[#329937] font-normal normal-case">(fetching…)</span>}
              {!loading && rates.length > 0 && <span className="text-[#329937] font-normal normal-case"> · Live rates</span>}
            </div>
            {loading && <div className="h-8 bg-[#F3F4F6] rounded animate-pulse"/>}
            {!loading && rates.map(r => (
              <div key={r.id} onClick={() => setSelectedRate(r)} data-testid={`modify-rate-${r.id}`}
                className={`border rounded-lg p-2.5 mb-1.5 cursor-pointer transition-colors ${selectedRate?.id === r.id ? 'border-[#329937] bg-[#F0FDF4]' : 'border-[#E5E5E5]'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[12px] font-medium">{r.name}</div>
                    <div className="text-[10px] text-[#888]">{r.nights} nights × ₹{r.perNight.toLocaleString('en-IN')}/night</div>
                  </div>
                  <div className="text-[13px] font-bold text-[#329937]">₹{r.total.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))}
            {!loading && rates.length === 0 && <p className="text-[12px] text-[#888]">No rates available for these dates.</p>}
          </div>
        )}

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Reason (optional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Guest extended trip"
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="modify-reason"/>
        </div>

        <div className="flex gap-2 justify-end border-t border-[#F3F4F6] pt-4">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA]">Cancel</button>
          <button onClick={handleConfirm} disabled={busy || !checkin || !checkout || checkout <= checkin}
            className="px-4 py-2 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40 flex items-center gap-1.5"
            data-testid="modify-booking-confirm-btn">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## E6 — `components/pms/ExtendStayDialog.jsx` — NEW FILE (~100 lines)

```jsx
// CR-362: Extend an in-house guest's stay. Fetches live rates + shows price breakdown.
import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { extendStay, getRatesData } from '@/api/services/pmsService';
import { toast } from 'sonner';

export default function ExtendStayDialog({ target, onClose, onSuccess }) {
  // target: { orderId, guestName, channel, roomNo, checkout, currentPrice, nights }
  const [newCheckout, setNewCheckout] = useState('');
  const [extRate,     setExtRate]     = useState(null);   // { perNight, extraNights, total }
  const [loading,     setLoading]     = useState(false);
  const [reason,      setReason]      = useState('');
  const [busy,        setBusy]        = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { if (!target) return; setNewCheckout(''); setExtRate(null); setReason(''); }, [target]);

  useEffect(() => {
    if (!newCheckout || !target?.checkout || newCheckout <= target.checkout) { setExtRate(null); return; }
    const extraNights = Math.round((new Date(newCheckout) - new Date(target.checkout)) / 86400000);
    if (extraNights <= 0) { setExtRate(null); return; }
    setLoading(true);
    getRatesData({ startDate: target.checkout, endDate: newCheckout })
      .then(data => {
        const rateplans = data?.rateplans ?? data ?? [];
        const rp = rateplans[0];
        const perNight = rp ? Number(rp.rates?.[target.checkout] ?? rp.rate ?? 0) : 0;
        setExtRate({ perNight, extraNights, extensionTotal: perNight * extraNights,
                     newTotal: Number(target.currentPrice ?? 0) + perNight * extraNights });
      })
      .catch(() => setExtRate(null))
      .finally(() => setLoading(false));
  }, [newCheckout, target]);

  if (!target) return null;

  const handleConfirm = async () => {
    if (!newCheckout || newCheckout <= (target.checkout ?? today)) { toast.error('New checkout must be after current checkout'); return; }
    setBusy(true);
    try {
      await extendStay({
        orderId: target.orderId,
        newCheckoutDate: newCheckout,
        newRoomPrice: extRate?.newTotal ?? target.currentPrice,
        reason,
      });
      toast.success(`Stay extended to ${newCheckout}.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Extension failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="extend-stay-dialog">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-[15px] font-semibold">Extend Stay</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[#888]"/></button>
        </div>
        <p className="text-[12px] text-[#888] mb-4">{target.guestName} · {target.channel} · {target.roomNo}</p>

        {/* Current checkout */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Current Checkout</label>
          <div className="border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] bg-[#FAFAFA] text-[#888]">{target.checkout ?? '—'}</div>
        </div>

        {/* New checkout */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">New Checkout Date</label>
          <input type="date" value={newCheckout} min={target.checkout ?? today}
            onChange={e => setNewCheckout(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="extend-new-checkout"/>
        </div>

        {/* Price breakdown */}
        {newCheckout && newCheckout > (target.checkout ?? '') && (
          <div className="mb-4">
            {loading && <div className="h-16 bg-[#F3F4F6] rounded animate-pulse"/>}
            {!loading && extRate && (
              <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-lg p-3 text-[12px]">
                <div className="flex justify-between mb-1"><span className="text-[#888]">Original {target.nights ?? '—'} nights</span><span>₹{Number(target.currentPrice ?? 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between mb-1"><span className="text-[#888]">+{extRate.extraNights} extra night{extRate.extraNights > 1 ? 's' : ''} × ₹{extRate.perNight.toLocaleString('en-IN')}</span><span>₹{extRate.extensionTotal.toLocaleString('en-IN')}</span></div>
                <div className="border-t border-[#A7F3D0] my-2"/>
                <div className="flex justify-between font-bold"><span>New Total</span><span className="text-[#329937] text-[13px]">₹{extRate.newTotal.toLocaleString('en-IN')}</span></div>
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Reason (optional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Guest staying longer"
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="extend-reason"/>
        </div>

        <div className="flex gap-2 justify-end border-t border-[#F3F4F6] pt-4">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA]">Cancel</button>
          <button onClick={handleConfirm} disabled={busy || !newCheckout || newCheckout <= (target.checkout ?? today)}
            className="px-4 py-2 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40 flex items-center gap-1.5"
            data-testid="extend-stay-confirm-btn">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}Confirm Extension
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## E7 — `pages/pms/ArrivalsPage.jsx` — 5 edit sites

### E7a — Imports (L4-8)

**Before:**
```js
import { Plus, RefreshCw, Loader2, AlertCircle, MessageSquare, BedDouble, UserX } from 'lucide-react'; // UserX: CR-358-P5
import Sidebar from '@/components/layout/Sidebar';
import { getReservationOps, markNoShowBooking } from '@/api/services/pmsService'; // markNoShowBooking: CR-358-P5
import { toast } from 'sonner'; // CR-358-P5
import NoShowDialog from '@/components/pms/NoShowDialog'; // CR-358-P5
```

**After:**
```js
import { Plus, RefreshCw, Loader2, AlertCircle, MessageSquare, BedDouble, UserX, MoreHorizontal } from 'lucide-react'; // CR-362: MoreHorizontal
import Sidebar from '@/components/layout/Sidebar';
import { getReservationOps, markNoShowBooking, getCancelledReservations } from '@/api/services/pmsService'; // CR-362: getCancelledReservations
import { toast } from 'sonner';
import NoShowDialog from '@/components/pms/NoShowDialog';
import CancelBookingDialog from '@/components/pms/CancelBookingDialog'; // CR-362
import ModifyBookingDialog from '@/components/pms/ModifyBookingDialog'; // CR-362
import { useRestaurant } from '@/contexts/RestaurantContext'; // CR-362: for cancelledBy name
```

### E7b — State vars (after L47 `const [noShowTarget...`)

**Add after `const [noShowTarget, setNoShowTarget] = useState(null);`:**
```js
  const [cancelTarget, setCancelTarget]  = useState(null); // CR-362: { reservationId, guestName, channel, checkin, checkout, roomCode, advance, cancelledBy }
  const [modifyTarget, setModifyTarget]  = useState(null); // CR-362
  const [cancelledRows, setCancelledRows] = useState([]);  // CR-362: Cancelled tab data
  const { restaurant } = useRestaurant();                  // CR-362: staff name for cancelled_by
```

### E7c — Load cancelled rows on mount (inside `load` useCallback or separate useEffect)

**Add a separate useEffect after the main data load useEffect:**
```js
  useEffect(() => { // CR-362: fetch cancelled reservations for Cancelled tab
    getCancelledReservations().then(setCancelledRows).catch(() => setCancelledRows([]));
  }, []);
```

**Add to tabData object (E7c-ii):**
**Before:**
```js
  const tabData = {
    today:     data?.arrivalsToday    ?? [],
    upcoming:  data?.arrivalsUpcoming ?? [],
    late:      data?.arrivalsLate     ?? [],
    checkedIn: data?.checkedInToday   ?? [],
  };
```
**After:**
```js
  const tabData = {
    today:     data?.arrivalsToday    ?? [],
    upcoming:  data?.arrivalsUpcoming ?? [],
    late:      data?.arrivalsLate     ?? [],
    checkedIn: data?.checkedInToday   ?? [],
    cancelled: cancelledRows,                                         // CR-362
  };
```

### E7d — Add Cancelled 5th tab (in the tab-bar JSX)

**After the existing 4 `{FILTER_CHIPS.map...}` or after the existing tabs — add:**
```jsx
<button key="cancelled" data-testid="arr-tab-cancelled"
  onClick={() => { setActiveTab('cancelled'); setPage(1); }}
  className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'cancelled' ? 'border-[#EF4444] text-[#EF4444] font-semibold' : 'border-transparent text-[#888] hover:text-[#1A1A1A]'}`}>
  Cancelled {cancelledRows.length > 0 && <span className="ml-1 bg-[#FEE2E2] text-[#991B1B] text-[9px] font-bold px-1.5 py-0.5 rounded-full">{cancelledRows.length}</span>}
</button> {/* CR-362 */}
```

**Add count variable (near todayCount etc):**
```js
const cancelledCount = cancelledRows.length; // CR-362
```

### E7e — Replace action column with Kebab menu (L231-257)

**Before:**
```jsx
<div className="flex gap-2 flex-wrap items-center">
  {isCheckedIn ? (
    <button data-testid={`arr-view-btn-${row.bookingId}`}
      onClick={() => navigate('/pms/in-house')}
      className="px-3 py-1.5 rounded text-[12px] font-medium border border-[#E5E5E5] text-[#666] hover:bg-gray-50">
      View
    </button>
  ) : (
    <button data-testid={`arr-checkin-btn-${row.bookingId}`}
      onClick={() => navigate(`/pms/check-in?booking_id=${encodeURIComponent(row.bookingId)}`)}
      className="px-3 py-1.5 rounded text-[12px] font-semibold text-white" style={{ background: '#329937' }}>
      Check In
    </button>
  )}
  {/* CR-358-P5: No-Show ... */}
  {!isCheckedIn && (activeTab === 'late' || activeTab === 'today') &&
    OTA_NO_SHOW_CHANNELS.includes(...) && ... (
      <button ... No-Show </button>
  )}
</div>
```

**After:**
```jsx
{/* CR-362: D1 — Kebab menu for secondary actions */}
<div className="flex gap-2 items-center">
  {isCheckedIn ? (
    <button data-testid={`arr-view-btn-${row.bookingId}`} onClick={() => navigate('/pms/in-house')}
      className="px-3 py-1.5 rounded text-[12px] font-medium border border-[#E5E5E5] text-[#666] hover:bg-gray-50">View</button>
  ) : (
    <button data-testid={`arr-checkin-btn-${row.bookingId}`}
      onClick={() => navigate(`/pms/check-in?booking_id=${encodeURIComponent(row.bookingId)}`)}
      className="px-3 py-1.5 rounded text-[12px] font-semibold text-white" style={{ background: '#329937' }}>Check In</button>
  )}
  {!isCheckedIn && activeTab !== 'cancelled' && (
    <KebabMenu row={row} activeTab={activeTab} navigate={navigate}
      onCancel={() => setCancelTarget({ reservationId: row.bookingId, guestName: row.guestName, channel: row.channel,
                        checkin: row.checkin, checkout: row.checkout, roomCode: row.roomCode,
                        advance: row.advance ?? 0, cancelledBy: restaurant?.profile?.fullName ?? 'staff' })}
      onModify={() => setModifyTarget({ reservationId: row.bookingId, guestName: row.guestName, channel: row.channel,
                        roomCode: row.roomCode, checkin: row.checkin, checkout: row.checkout,
                        cancelledBy: restaurant?.profile?.fullName ?? 'staff' })}
      onNoShow={() => setNoShowTarget({ bookingId: row.bookingId, guestName: row.guestName, channel: row.channel,
                        checkin: row.checkin, roomCode: row.roomCode })}
      otaNoShowChannels={OTA_NO_SHOW_CHANNELS}
    />
  )}
</div>
```

**Add `KebabMenu` sub-component at bottom of file (before closing):**
```jsx
function KebabMenu({ row, activeTab, navigate, onCancel, onModify, onNoShow, otaNoShowChannels }) { // CR-362
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const isOtaLate = (activeTab === 'late' || activeTab === 'today') &&
    otaNoShowChannels.includes((row.channel ?? '').toLowerCase()) &&
    row.operationalStatus === 'pending';
  return (
    <div ref={ref} className="relative">
      <button data-testid={`arr-kebab-${row.bookingId}`} onClick={() => setOpen(o => !o)}
        className="p-1.5 border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA]">
        <MoreHorizontal className="w-4 h-4"/>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg z-20 min-w-[148px] py-1">
          <button onClick={() => { setOpen(false); onModify(); }} data-testid={`arr-modify-btn-${row.bookingId}`}
            className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#1A1A1A] hover:bg-[#FAFAFA]">
            Modify Booking
          </button>
          {isOtaLate && (
            <button onClick={() => { setOpen(false); onNoShow(); }} data-testid={`arr-noshow-kebab-${row.bookingId}`}
              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#D97706] hover:bg-[#FAFAFA]">
              Mark No-Show
            </button>
          )}
          <div className="border-t border-[#F3F4F6] my-1"/>
          <button onClick={() => { setOpen(false); onCancel(); }} data-testid={`arr-cancel-btn-${row.bookingId}`}
            className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#EF4444] hover:bg-[#FEF2F2]">
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  );
}
```

**Note:** Add `useRef` to imports on line 2.

### E7f — Cancelled tab row rendering + dialog mounts

**Add Cancelled tab JSX** (in the table body, conditional on `activeTab === 'cancelled'`):
Shows columns: Channel · Guest · Room Type · Was Booked · Reason · Cancelled By · Date. Read-only, no action column.

**Add dialog mounts** (after `<NoShowDialog .../>` ):
```jsx
<CancelBookingDialog target={cancelTarget} onClose={() => setCancelTarget(null)} onSuccess={() => { setCancelTarget(null); getCancelledReservations().then(setCancelledRows); load(); }} />
<ModifyBookingDialog target={modifyTarget} onClose={() => setModifyTarget(null)} onSuccess={() => { setModifyTarget(null); load(); }} />
```

---

## E8 — `pages/pms/DeparturesPage.jsx` — 3 edit sites

### E8a — Imports + state
Add: `Calendar` from lucide-react, `extendStay` from pmsService, `ExtendStayDialog`, `useRestaurant`

Add state: `const [extendTarget, setExtendTarget] = useState(null);`

### E8b — Extend Stay button (next to Check Out, in non-checkedOut tabs)

**Before:**
```jsx
) : (
  <button data-testid={`dep-checkout-btn-${row.orderId || lineId}`} ...>
    <LogOut className="w-3.5 h-3.5" /> Check Out
  </button>
)}
```

**After:**
```jsx
) : (
  <div className="flex gap-2">
    <button data-testid={`dep-checkout-btn-${row.orderId || lineId}`} ...>
      <LogOut className="w-3.5 h-3.5" /> Check Out
    </button>
    <button data-testid={`dep-extend-btn-${row.orderId || lineId}`}  // CR-362
      onClick={() => row.orderId && setExtendTarget({ orderId: row.orderId, guestName: row.guestName,
                       channel: row.channel, roomNo: tNo, checkout: row.checkout,
                       currentPrice: Number(row.amount ?? 0), nights: row.nights })}
      disabled={!row.orderId}
      className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] font-medium border border-[#E5E5E5] text-[#666] hover:bg-[#FAFAFA] disabled:opacity-40">
      <Calendar className="w-3.5 h-3.5"/> Extend Stay
    </button>
  </div>
)}
```

### E8c — Dialog mount (after `<PmsCheckoutDrawer .../>`)
```jsx
<ExtendStayDialog target={extendTarget} onClose={() => setExtendTarget(null)} onSuccess={() => { setExtendTarget(null); load(); }} /> {/* CR-362 */}
```

---

## E9 — `pages/pms/InHouseGuestsPage.jsx` — 3 edit sites

Same pattern as E8 — add `extendTarget` state, "Extend Stay" button next to "View Bill", mount `ExtendStayDialog`.

**View Bill cell (L165-171) becomes:**
```jsx
<td className="px-4 py-3">
  <div className="flex gap-2 items-center">
    <button data-testid="view-bill-btn" onClick={() => navigate('/reports/rooms')}
      className="text-[12px] text-[#329937] hover:underline font-medium">View Bill</button>
    <button data-testid={`inhse-extend-btn-${row.roomNumber}`}  // CR-362
      onClick={() => setExtendTarget({ orderId: row.parentOrderId, guestName: row.guestName,
                       channel: '—', roomNo: row.roomNumber, checkout: row.checkoutDate,
                       currentPrice: Number(row.balance ?? 0), nights: null })}
      disabled={!row.parentOrderId}
      className="text-[12px] font-medium border border-[#E5E5E5] text-[#666] px-2 py-0.5 rounded hover:bg-[#FAFAFA] disabled:opacity-40">
      Extend Stay
    </button>
  </div>
</td>
```

---

## E10 — `pages/pms/ReservationsPage.jsx` — 3 edit sites

### E10a — Imports + state
Add: `cancelReservation`, `modifyReservation` from pmsService, `CancelBookingDialog`, `ModifyBookingDialog`, `useRestaurant`

Add state: `cancelTarget`, `modifyTarget`

### E10b — BlockPopover button additions (L341+, inside `kind === 'pending'` section)

**After the existing Check In button block, before the No-Show block:**
```jsx
{kind === 'pending' && (  // CR-362: Modify + Cancel in tape chart popover
  <>
    <button onClick={() => { setPopover(null); onModify({ reservationId: res.bookingId, guestName: res.guestName,
                     channel: res.channel, roomCode: res.roomCode, checkin: res.checkin, checkout: res.checkout }); }}
      className="px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-[#E5E5E5] text-[#666] hover:bg-[#FAFAFA] flex items-center gap-1"
      data-testid="tc-popover-modify-btn">
      Modify
    </button>
    <button onClick={() => { setPopover(null); onCancel({ reservationId: res.bookingId, guestName: res.guestName,
                     channel: res.channel, checkin: res.checkin, checkout: res.checkout,
                     roomCode: res.roomCode ?? line.tableNo, advance: res.advance ?? 0, cancelledBy: staffName }); }}
      className="px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-1"
      data-testid="tc-popover-cancel-btn">
      Cancel
    </button>
  </>
)}
```

**Update `BlockPopover` signature:**
```jsx
function BlockPopover({ popover, popRef, setPopover, navigate, onNoShow, onCancel, onModify }) { // CR-362
```

### E10c — Dialog mounts (after `<NoShowDialog .../>`)
```jsx
<CancelBookingDialog target={cancelTarget} onClose={() => setCancelTarget(null)} onSuccess={() => { setCancelTarget(null); load(); }} />
<ModifyBookingDialog target={modifyTarget} onClose={() => setModifyTarget(null)} onSuccess={() => { setModifyTarget(null); load(); }} />
```

---

## Verification Matrix

| Edit | File | How to Verify | Automated? |
|---|---|---|---|
| E1 | `constants.js` | `grep EXTEND_STAY src/api/constants.js` | YES (grep) |
| E2 | `aiosellTransform.js` | `grep cancelReason src/api/transforms/aiosellTransform.js` | YES (grep) |
| E3a | `pmsService.js` | `grep cancelled.*operationalStatus src/api/services/pmsService.js` | YES (grep) |
| E3b | `pmsService.js` | `grep "export const cancelReservation\|modifyReservation\|extendStay\|getCancelled" src/api/services/pmsService.js` | YES (grep) |
| E4 | `CancelBookingDialog.jsx` | File exists; dialog renders; reason dropdown populated | Browser + grep |
| E5 | `ModifyBookingDialog.jsx` | File exists; date change → rates fetch fires; confirm calls modifyReservation | Browser |
| E6 | `ExtendStayDialog.jsx` | File exists; extension price breakdown shows; confirm calls extendStay | Browser |
| E7 | `ArrivalsPage.jsx` | ⋮ kebab opens dropdown with Modify/Cancel options; Cancelled 5th tab visible | Browser (preprod) |
| E8 | `DeparturesPage.jsx` | "Extend Stay" button visible on Overdue/Due/Upcoming rows | Browser (preprod) |
| E9 | `InHouseGuestsPage.jsx` | "Extend Stay" button visible next to "View Bill" | Browser (preprod) |
| E10 | `ReservationsPage.jsx` | Tape chart block popover shows Modify + Cancel buttons for pending blocks | Browser (preprod) |

**Regression tests:**
| R | Test |
|---|---|
| R-1 | No-Show button still works on booking.com/gommt Late/Today rows after E7 changes |
| R-2 | Check In navigation still works from ArrivalsPage after kebab refactor |
| R-3 | Existing PmsCheckoutDrawer (DeparturesPage) still opens correctly after E8 |
| R-4 | Tape chart Check In + View Folio + No-Show still work after E10 |

---

## Risk Register

| Risk | Item | Mitigation |
|---|---|---|
| **CRITICAL** | `new_room_price` in extendStay — wrong value would corrupt billing | E6 explicitly computes `currentPrice + extensionTotal` with inline comment. Manual check at QA. |
| **HIGH** | 409 from backend (checked-in booking) — must show friendly error | E4 + E5 catch block translates 409 to user-friendly message |
| **HIGH** | OTA warning missing — staff cancels without notifying guest | E4 OTA channel check covers: booking.com, goibibo, gommt, makemytrip, expedia, agoda |
| **MEDIUM** | KebabMenu `useRef` click-outside — must import `useRef` in ArrivalsPage | Note in E7: add `useRef` to react import on L2 |
| **LOW** | Cancelled tab empty on preprod (no cancelled bookings) | Expected — note in QA handover |

---

## Scope Lock

**Files WILL change:** constants.js, aiosellTransform.js, pmsService.js, ArrivalsPage.jsx, DeparturesPage.jsx, InHouseGuestsPage.jsx, ReservationsPage.jsx, CancelBookingDialog.jsx (NEW), ModifyBookingDialog.jsx (NEW), ExtendStayDialog.jsx (NEW)

**Files WILL NOT touch:** CollectPaymentPanel.jsx, OrderEntry.jsx, orderTransform.js, CheckInPage.jsx, App.js (no new routes), Sidebar.jsx, PmsCheckoutDrawer.jsx, RoomCheckInModal.jsx, aiosellService.js

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-362 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
- [ ] CR_REGISTRY.md: row updated to Gate 5
- [ ] FILE_OWNERSHIP.md: all 10 files listed with CR-362 + date
- [ ] Code markers: // CR-362 in every modified/new file
- [ ] Compile: webpack 0 new warnings
```

---

*Gate 3 Implementation Plan complete. STOP.*
*Awaiting Gate 4 GO from owner before implementation begins.*
