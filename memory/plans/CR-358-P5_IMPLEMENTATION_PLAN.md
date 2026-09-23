# CR-358-P5 — Gate 3 Implementation Plan
## PMS Phase 5: Rate Grid (S8-C) + Inventory Restrictions + Rate Restrictions + Mark No-Show (S8-D)

**ID:** CR-358-P5
**Written by:** PLANNING agent (ALPHA v0.7)
**Date:** 2026-09-08
**Gate:** 3 — Implementation Plan. Awaiting Gate 4 GO before any coding.
**Sprint:** pos_pms_1
**Impact Analysis:** `memory/impact/CR-358-P5_IMPACT_ANALYSIS.md` (Gate 2 v2, verified accurate)
**Risk:** HIGH

---

## 0. Entry Verification (Implementation agent MUST run before coding)

```bash
# Verify all line refs still match before writing a single line
sed -n '466,475p' /app/frontend/src/pages/pms/ChannelManagerPage.jsx
# Expected: Tab 3 placeholder (Phase 5 placeholder text at L472)

sed -n '118,121p' /app/frontend/src/api/services/aiosellService.js
# Expected: getLocalReservations closing brace + EOF (120 lines total)

sed -n '150,153p' /app/frontend/src/api/transforms/aiosellTransform.js
# Expected: closing }; of fromPendingArrival + blank line

sed -n '218,224p' /app/frontend/src/api/transforms/aiosellTransform.js
# Expected: dashboardKpis line then closing }, decodeMealPlan, export default

sed -n '310,313p' /app/frontend/src/api/services/pmsService.js
# Expected: getTapeChartData closing lines + EOF (312 lines)

sed -n '225,240p' /app/frontend/src/pages/pms/ArrivalsPage.jsx
# Expected: StatusPill td then action <td> with Check In button

sed -n '289,292p' /app/frontend/src/pages/pms/ReservationsPage.jsx
# Expected: function BlockPopover({ popover, popRef, setPopover, navigate })

sed -n '223,226p' /app/frontend/src/pages/pms/ReservationsPage.jsx
# Expected: {popover && <BlockPopover popover=... navigate={navigate} />}

# If ANY mismatch → STOP. Return to Planning agent.
```

---

## 1. Execution Sequence

Execute in this strict order. Verify webpack compiles after E7 (first new files). Verify full compile after each group.

```
Group A — Service layer (no UI, no compile risk)
  E1: aiosellService.js     — append 5 new functions
  E2: aiosellTransform.js   — add fromRates function + register in fromAPI
  E3: pmsService.js         — update imports + append Phase 5 section

Group B — New shared components
  E4: NoShowDialog.jsx      — NEW file (shared destructive dialog)
  E5: RatesTab.jsx          — NEW file (full S8-C tab)

Group C — Wire into pages
  E6: ChannelManagerPage.jsx — replace placeholder with <RatesTab />
  E7: ArrivalsPage.jsx       — add No-Show to action cell
  E8: ReservationsPage.jsx   — add No-Show to BlockPopover

Checkpoint after Group A: yarn tsc --noEmit or webpack compile (no new UI yet)
Checkpoint after Group B: webpack compiled with 0 errors
Final checkpoint: all 8 files saved, webpack 0 errors, V-B1 browser smoke
```

---

## 2. Edit Specifications

---

### E1 — `src/api/services/aiosellService.js`
**Action:** APPEND after L120 (current EOF)
**Current L120:**
```js
  return res.data;
};
```
**Append after L120:**
```js

// ─── Phase 5 (CR-358-P5) ─────────────────────────────────────────────────────

/** S8-C: Fetch current rates from Aiosell for a date range */
export const getRates = async ({ startDate, endDate }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.FETCH_RATES, {
    start_date: startDate,
    end_date:   endDate,
  });
  return res.data;
};

/** S8-C: Push rate changes to Aiosell OTA channels.
 * @param {{ startDate, endDate, rates: [{room_code, rateplan_code, rate}] }} params
 */
export const pushRates = async ({ startDate, endDate, rates }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_RATES, {
    start_date: startDate,
    end_date:   endDate,
    rates,
  });
  return res.data;
};

/** S8-C: Push inventory restrictions (stop-sell, min-stay, CTA, CTD) per room type.
 * @param {{ startDate, endDate, toChannels: string[], rooms: [{room_code, restrictions: {...}}] }} params
 * restrictions is an OBJECT not array. Only include keys to change.
 */
export const pushInventoryRestrictions = async ({ startDate, endDate, toChannels, rooms }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_INVENTORY_RESTRICT, {
    start_date:  startDate,
    end_date:    endDate,
    to_channels: toChannels,
    rooms,
  });
  return res.data;
};

/** S8-C: Push rate restrictions (min-stay, CTA, CTD) per rate plan.
 * @param {{ startDate, endDate, toChannels: string[], rates: [{room_code, rateplan_code, restrictions: {...}}] }} params
 */
export const pushRateRestrictions = async ({ startDate, endDate, toChannels, rates }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_RATE_RESTRICT, {
    start_date:  startDate,
    end_date:    endDate,
    to_channels: toChannels,
    rates,
  });
  return res.data;
};

/** S8-D: Mark a booking as no-show. Irreversible. booking.com / gommt only.
 * Sends channel field per backend Q2-c for correct Aiosell routing.
 * @param {{ bookingId: string, channel: string }} params
 */
export const markNoShow = async ({ bookingId, channel }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.MARK_NO_SHOW, {
    booking_id: bookingId,
    channel,
  });
  return res.data;
};
```

**Verify E1:** `grep -n "getRates\|pushRates\|pushInventoryRestrictions\|pushRateRestrictions\|markNoShow" src/api/services/aiosellService.js` → 5 function definitions found

---

### E2 — `src/api/transforms/aiosellTransform.js`
**Action:** TWO sub-edits.

**E2a — INSERT after L152** (blank line after `fromPendingArrival` closing `};`)
```js

// ─── RATES (CR-358-P5) ───────────────────────────────────────────────────────
// Source: POST /aiosell/fetch-rates → res.data.data.aiosell.body.updates[]
// Each update: { startDate, endDate, rates: [{roomCode, rateplanCode, rate}] }
// Note: fetch-rates returns camelCase; push-rates expects snake_case. FE normalises camelCase internally.
const fromRates = (data) => {
  const updates = data?.data?.aiosell?.body?.updates ?? data?.aiosell?.body?.updates ?? [];
  const dateRateMap = {};   // { date: { rateplanCode: rate } }
  const planSet     = [];   // ordered insertion of { roomCode, rateplanCode } — no duplicates
  const planKeys    = new Set();
  const dateSet     = new Set();

  updates.forEach(u => {
    if (!u) return;
    // Aiosell may send a range (startDate === endDate is one day; rarely spans multiple days)
    const dates = u.startDate === u.endDate
      ? [u.startDate]
      : Array.from({ length: Math.round((new Date(u.endDate) - new Date(u.startDate)) / 86400000) + 1 },
          (_, i) => { const d = new Date(u.startDate); d.setDate(d.getDate() + i); return d.toLocaleDateString('en-CA'); });

    dates.forEach(date => {
      dateSet.add(date);
      if (!dateRateMap[date]) dateRateMap[date] = {};
      (u.rates ?? []).forEach(r => {
        const planKey = `${r.roomCode}|${r.rateplanCode}`;
        if (!planKeys.has(planKey)) {
          planKeys.add(planKey);
          planSet.push({ roomCode: r.roomCode, rateplanCode: r.rateplanCode });
        }
        dateRateMap[date][r.rateplanCode] = r.rate ?? 0;
      });
    });
  });

  // Sort dates ascending
  const dates = [...dateSet].sort();

  return { dateRateMap, rateplans: planSet, dates };
};
```

**E2b — MODIFY L218** (add `rates` entry to `fromAPI` object)
Current L218:
```js
    dashboardKpis:     fromDashboardKpis,      // CR-358-P3
```
Replace with:
```js
    dashboardKpis:     fromDashboardKpis,      // CR-358-P3
    rates:             fromRates,              // CR-358-P5
```

**Verify E2:** `grep -n "fromRates\|rates:" src/api/transforms/aiosellTransform.js` → `fromRates` function present + registered in fromAPI

---

### E3 — `src/api/services/pmsService.js`
**Action:** TWO sub-edits.

**E3a — MODIFY L6** (add 5 new imports to existing aiosellService import)
Current L6:
```js
import { getLocalReservations, getAiosellRooms, getAiosellStatus, fetchReservations, pushInventory } from './aiosellService'; // BUG-378, CR-358-P2, CR-358-P3
```
Replace with:
```js
import { getLocalReservations, getAiosellRooms, getAiosellStatus, fetchReservations, pushInventory,
         getRates, pushRates, pushInventoryRestrictions, pushRateRestrictions, markNoShow } from './aiosellService'; // BUG-378, CR-358-P2, CR-358-P3, CR-358-P5
```

**E3b — APPEND after L312** (current EOF)
Current L312:
```js
  return { today: ops.today, reservations: ops.all, rooms };
};
```
Append after L312:
```js

// ─── Phase 5 (CR-358-P5) ─────────────────────────────────────────────────────

/** S8-C: Fetch + normalise rates for the rate grid UI */
export const getRatesData = async ({ startDate, endDate }) => {
  const raw = await getRates({ startDate, endDate });
  return aiosellTransform.fromAPI.rates(raw);
};

/** S8-C: Push staged rate changes to live OTA channels.
 * @param {Map<string,number>} stagedChanges  key="rateplanCode|date", value=newRate
 * @param {Array<{roomCode,rateplanCode}>} rateplans  for room_code lookup
 */
export const pushRatesData = async (stagedChanges, rateplans) => {
  const entries = [...stagedChanges.entries()];
  if (!entries.length) throw new Error('[CR-358-P5] No staged changes to push');
  const dates       = entries.map(([k]) => k.split('|')[1]).sort();
  const planToRoom  = Object.fromEntries(rateplans.map(p => [p.rateplanCode, p.roomCode]));
  const rates       = entries.map(([key, rate]) => {
    const [rateplanCode] = key.split('|');
    return { room_code: planToRoom[rateplanCode], rateplan_code: rateplanCode, rate };
  });
  return pushRates({ startDate: dates[0], endDate: dates[dates.length - 1], rates });
};

/** S8-C: Push inventory restrictions per room type */
export const pushInvRestrictionsData = ({ startDate, endDate, toChannels, rooms }) =>
  pushInventoryRestrictions({ startDate, endDate, toChannels, rooms });

/** S8-C: Push rate restrictions per rate plan */
export const pushRateRestrictionsData = ({ startDate, endDate, toChannels, rates }) =>
  pushRateRestrictions({ startDate, endDate, toChannels, rates });

/** S8-D: Mark booking as no-show. Irreversible. booking.com / gommt only.
 * @param {string} bookingId  row.bookingId (r.booking_id from LR, e.g. "BDC...")
 * @param {string} channel    row.channel  (e.g. "booking.com")
 */
export const markNoShowBooking = (bookingId, channel) =>
  markNoShow({ bookingId, channel });
```

**Verify E3:** `grep -n "getRatesData\|pushRatesData\|pushInvRestrictions\|pushRateRestrictions\|markNoShowBooking" src/api/services/pmsService.js` → 5 exports found

---

### E4 — `src/components/pms/NoShowDialog.jsx` *(NEW file)*

Create at `src/components/pms/NoShowDialog.jsx`:

```jsx
// CR-358-P5: S8-D — Shared destructive Mark No-Show confirmation dialog.
// Used by: ArrivalsPage (Late/Today tab) + ReservationsPage (BlockPopover).
// Props:
//   target:    { bookingId, guestName, channel, checkin, roomCode } | null  (null = dialog closed)
//   onClose:   () => void
//   onSuccess: () => void  (called AFTER successful API call; caller reloads data + shows toast)
import { useState } from 'react';
import { UserX, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { markNoShowBooking } from '@/api/services/pmsService';

export default function NoShowDialog({ target, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [remark, setRemark] = useState('');

  if (!target) return null;

  const { bookingId, guestName, channel, checkin, roomCode } = target;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await markNoShowBooking(bookingId, channel);
      onClose();
      setRemark('');
      onSuccess();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to mark no-show';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => { if (!busy) { setRemark(''); onClose(); } };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      data-testid="noshow-overlay">
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto"
        data-testid="noshow-dialog">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E5E5E5] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#1A1A1A]">Confirm Mark No-Show</div>
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] mt-1">
              Permanent &amp; Irreversible
            </span>
          </div>
        </div>

        {/* Booking details */}
        <div className="px-5 py-4 space-y-3">
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-4 py-3 text-[12px] grid grid-cols-[88px_1fr] gap-y-1.5">
            <span className="text-[#888] font-medium">Guest</span>
            <span className="font-semibold text-[#1A1A1A]">{guestName || '—'}</span>
            <span className="text-[#888] font-medium">Booking ID</span>
            <span className="font-mono text-[11px] font-semibold text-[#1A1A1A]">{bookingId}</span>
            <span className="text-[#888] font-medium">Check-in</span>
            <span className="font-semibold text-[#1A1A1A]">{checkin || '—'}</span>
            <span className="text-[#888] font-medium">Room</span>
            <span className="font-semibold text-[#1A1A1A]">{roomCode || '—'}</span>
            <span className="text-[#888] font-medium">Channel</span>
            <span className="font-semibold text-[#1A1A1A] capitalize">{channel || '—'}</span>
          </div>

          {/* Warning */}
          <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-lg px-4 py-3 flex gap-2.5 items-start">
            <TriangleAlert className="w-3.5 h-3.5 text-[#B91C1C] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#991B1B] leading-relaxed">
              Marking as No-Show will notify <strong className="capitalize">{channel}</strong>, cancel the
              reservation, and immediately release the room back to available inventory.{' '}
              <strong>This action cannot be undone.</strong>
            </p>
          </div>

          {/* Optional remark */}
          <div>
            <label className="block text-[11px] font-medium text-[#666] mb-1.5">
              Front-desk remark <span className="text-[#888]">(optional)</span>
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Guest did not respond to calls"
              className="w-full h-9 border border-[#E5E5E5] rounded-lg px-3 text-[12px] outline-none focus:border-[#329937] focus:ring-1 focus:ring-[#329937]/20"
              data-testid="noshow-remark-input"
              disabled={busy}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={handleClose}
            disabled={busy}
            className="flex-1 h-9 border border-[#E5E5E5] rounded-lg text-[13px] font-medium text-[#555] hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
            data-testid="noshow-cancel-btn">
            Cancel / Keep Booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 h-9 bg-[#EF4444] hover:bg-[#D32F2F] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
            data-testid="noshow-confirm-btn">
            {busy ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              <UserX className="w-3.5 h-3.5" />
            )}
            Mark No-Show &amp; Release Room
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Verify E4:** File exists at path. Imports compile. `data-testid="noshow-dialog"` present.

---

### E5 — `src/pages/pms/RatesTab.jsx` *(NEW file)*

Create at `src/pages/pms/RatesTab.jsx`:

```jsx
// CR-358-P5: S8-C — Rates & Restrictions Tab (Channel Manager Tab 3)
// Sub-tabs: Rates (fetch+stage+push) | Inventory Restrictions (push) | Rate Restrictions (push)
// Design: hybrid matrix with cell popover (OD-P5-02) + staged bar + diff modal (OD-P5-03)
// V3 HTML mock: public/cr358-p5-v3-mockup.html
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, Layers, Eye, Send, ChevronDown,
  X, BedDouble, Loader2, AlertCircle,
} from 'lucide-react';
import {
  getRatesData, pushRatesData,
  pushInvRestrictionsData, pushRateRestrictionsData,
} from '@/api/services/pmsService';
import { localDate } from '@/api/services/pmsService';

// ─── Constants ────────────────────────────────────────────────────────────────
const WEEKEND_DAYS  = [0, 6]; // Sunday=0, Saturday=6
const QUICK_RANGES  = [7, 14, 30];
const DEFAULT_DAYS  = 7;
const OTA_CHANNELS  = ['booking.com'];
const ROOM_TYPES    = ['executive', 'suite'];
const RESTRICTION_FIELDS = [
  { key: 'stop_sell',         label: 'Stop Sell',              type: 'toggle' },
  { key: 'minimum_stay',      label: 'Min Stay (nights)',       type: 'number', min: 1 },
  { key: 'close_on_arrival',  label: 'Closed to Arrival (CTA)', type: 'toggle' },
  { key: 'close_on_departure',label: 'Closed to Departure (CTD)',type: 'toggle'},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const addDays  = (ymd, n) => { const d = new Date(`${ymd}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const isWeekend = (ymd) => { const d = new Date(`${ymd}T00:00:00`); return WEEKEND_DAYS.includes(d.getDay()); };
const fmtDate   = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const dayName   = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const fmtRateplan = (code) => {
  // "executive-s-ep" → "EP Single"
  const parts = code?.split('-') ?? [];
  const planMap = { ep: 'EP', cp: 'CP', map: 'MAP', ap: 'AP' };
  const occMap  = { s: 'Single', d: 'Double' };
  const occ  = occMap[parts[parts.length - 2]] ?? '';
  const plan = planMap[parts[parts.length - 1]] ?? '';
  return `${plan} ${occ}`.trim() || code;
};
const buildDates = (start, days) =>
  Array.from({ length: days }, (_, i) => addDays(start, i));

// ─── Initial restriction form state ──────────────────────────────────────────
const initInvForm  = () => Object.fromEntries(ROOM_TYPES.map(rt => [rt, { stop_sell: false, minimum_stay: 1, close_on_arrival: false, close_on_departure: false }]));
const initRRForm   = () => ({});

// ─── Component ───────────────────────────────────────────────────────────────
export default function RatesTab() {
  const [subTab,       setSubTab]       = useState('rates');
  const [days,         setDays]         = useState(DEFAULT_DAYS);
  const [startDate,    setStartDate]    = useState(() => localDate(0));
  const [ratesData,    setRatesData]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [stagedChanges,setStagedChanges]= useState(new Map());
  const [popover,      setPopover]      = useState(null); // { key, liveRate, rateplanCode, date, anchorRect }
  const [showDiff,     setShowDiff]     = useState(false);
  const [pushing,      setPushing]      = useState(false);
  const [invForm,      setInvForm]      = useState(initInvForm);
  const [rrForm,       setRrForm]       = useState(initRRForm);
  const [invPushing,   setInvPushing]   = useState(false);
  const [rrPushing,    setRrPushing]    = useState(false);
  const popRef = useRef(null);

  const dates = buildDates(startDate, days);

  // ── Fetch rates ──────────────────────────────────────────────────────────
  const loadRates = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getRatesData({ startDate, endDate: addDays(startDate, days - 1) });
      setRatesData(data);
    } catch (e) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to fetch rates');
    } finally { setLoading(false); }
  }, [startDate, days]);

  useEffect(() => { if (subTab === 'rates') loadRates(); }, [subTab, loadRates]);

  // ── Rate matrix: close popover on outside click ─────────────────────────
  useEffect(() => {
    if (!popover) return;
    const onClick = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setPopover(null); };
    const onKey   = (e) => { if (e.key === 'Escape') setPopover(null); };
    document.addEventListener('mousedown', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick, true); document.removeEventListener('keydown', onKey); };
  }, [popover]);

  // ── Stage a rate change ─────────────────────────────────────────────────
  const stageRate = (key, liveRate, newRate) => {
    setStagedChanges(prev => {
      const next = new Map(prev);
      if (newRate === liveRate) { next.delete(key); } else { next.set(key, newRate); }
      return next;
    });
    setPopover(null);
  };

  // ── Push staged rates ───────────────────────────────────────────────────
  const handlePushRates = async () => {
    setPushing(true);
    try {
      await pushRatesData(stagedChanges, ratesData?.rateplans ?? []);
      setStagedChanges(new Map());
      setShowDiff(false);
      toast.success('Rates pushed successfully to live OTAs');
      loadRates();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Push failed');
    } finally { setPushing(false); }
  };

  // ── Push inventory restrictions ─────────────────────────────────────────
  const handlePushInvRestrictions = async () => {
    // Build rooms array: only include room types with at least one non-default field
    const rooms = ROOM_TYPES.map(rt => {
      const f = invForm[rt];
      const restrictions = {};
      if (f.stop_sell)          restrictions.stop_sell          = true;
      if (f.minimum_stay > 1)   restrictions.minimum_stay       = f.minimum_stay;
      if (f.close_on_arrival)   restrictions.close_on_arrival   = true;
      if (f.close_on_departure) restrictions.close_on_departure = true;
      return { room_code: rt, restrictions };
    });
    if (rooms.every(r => Object.keys(r.restrictions).length === 0)) {
      toast.error('Set at least one restriction before pushing');
      return;
    }
    setInvPushing(true);
    try {
      await pushInvRestrictionsData({
        startDate, endDate: addDays(startDate, days - 1),
        toChannels: OTA_CHANNELS, rooms,
      });
      toast.success('Inventory restrictions pushed to OTAs');
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Push failed');
    } finally { setInvPushing(false); }
  };

  // ── Push rate restrictions ──────────────────────────────────────────────
  const handlePushRateRestrictions = async () => {
    const ratesArr = Object.entries(rrForm)
      .filter(([, f]) => Object.values(f).some(Boolean))
      .map(([key, f]) => {
        const [roomCode, rateplanCode] = key.split('|');
        const restrictions = {};
        if (f.stop_sell)          restrictions.stop_sell          = true;
        if (f.minimum_stay > 1)   restrictions.minimum_stay       = f.minimum_stay;
        if (f.close_on_arrival)   restrictions.close_on_arrival   = true;
        if (f.close_on_departure) restrictions.close_on_departure = true;
        return { room_code: roomCode, rateplan_code: rateplanCode, restrictions };
      });
    if (!ratesArr.length) { toast.error('Set at least one restriction before pushing'); return; }
    setRrPushing(true);
    try {
      await pushRateRestrictionsData({
        startDate, endDate: addDays(startDate, days - 1),
        toChannels: OTA_CHANNELS, rates: ratesArr,
      });
      toast.success('Rate restrictions pushed to OTAs');
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Push failed');
    } finally { setRrPushing(false); }
  };

  // ── Initialise rrForm from ratesData rateplans ────────────────────────
  useEffect(() => {
    if (!ratesData?.rateplans) return;
    setRrForm(prev => {
      const next = { ...prev };
      ratesData.rateplans.forEach(({ roomCode, rateplanCode }) => {
        const k = `${roomCode}|${rateplanCode}`;
        if (!next[k]) next[k] = { stop_sell: false, minimum_stay: 1, close_on_arrival: false, close_on_departure: false };
      });
      return next;
    });
  }, [ratesData]);

  const stagedCount = stagedChanges.size;

  return (
    <div className="flex flex-col gap-4 pb-24">

      {/* ── Top controls ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-white border border-[#E5E5E5] rounded-xl p-1">
          {[{id:'rates',label:'Rates'},{id:'inv',label:'Inventory Restrictions'},{id:'raterestrict',label:'Rate Restrictions'}].map(t => (
            <button key={t.id} data-testid={`rt-subtab-${t.id}`}
              onClick={() => setSubTab(t.id)}
              className={`h-8 px-3.5 rounded-lg text-[12px] font-medium transition-colors ${subTab===t.id ? 'bg-[#329937] text-white font-semibold' : 'text-[#666] hover:bg-[#F7F7F7]'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Date range */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex gap-1">
            {QUICK_RANGES.map(n => (
              <button key={n} data-testid={`rt-range-${n}`}
                onClick={() => { setDays(n); setStartDate(localDate(0)); }}
                className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors ${days===n&&startDate===localDate(0) ? 'border-[#329937] text-[#329937] bg-[rgba(50,153,55,.06)]' : 'border-[#E5E5E5] text-[#555] hover:bg-[#FAFAFA]'}`}>
                {n}d
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-8 border border-[#E5E5E5] rounded-lg px-2.5 text-[12px] outline-none focus:border-[#329937]"
              data-testid="rt-date-start" />
            <span className="text-[#999] text-[12px]">→</span>
            <input type="date" value={addDays(startDate, days - 1)} readOnly
              className="h-8 border border-[#E5E5E5] rounded-lg px-2.5 text-[12px] bg-[#FAFAFA] text-[#888]" />
          </div>
          {subTab === 'rates' && (
            <>
              <button onClick={loadRates} disabled={loading}
                className="h-8 px-3 border border-[#E5E5E5] rounded-lg text-[12px] font-medium text-[#555] hover:bg-[#FAFAFA] flex items-center gap-1.5 disabled:opacity-50"
                data-testid="rt-fetch-btn">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Fetch from Aiosell
              </button>
              <button onClick={() => setShowDiff(true)} disabled={!stagedCount}
                className="h-8 px-3 border border-[#E5E5E5] rounded-lg text-[12px] font-medium text-[#555] hover:bg-[#FAFAFA] flex items-center gap-1.5 disabled:opacity-50"
                data-testid="rt-bulk-btn">
                <Layers className="w-3.5 h-3.5" /> Bulk Editor
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══ RATES SUB-TAB ══════════════════════════════════════════════════ */}
      {subTab === 'rates' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden" data-testid="rt-rates-grid">
          <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <span className="text-[14px] font-semibold text-[#1A1A1A]">Rate Grid</span>
              <span className="text-[12px] text-[#888] ml-2">{fmtDate(startDate)} – {fmtDate(addDays(startDate, days - 1))} · sandbox-pms</span>
            </div>
            {stagedCount > 0 && (
              <span className="text-[12px] text-[#888]">
                <span className="font-bold text-[#F26B33]">{stagedCount}</span> change{stagedCount > 1 ? 's' : ''} staged
              </span>
            )}
          </div>
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-[#888]">
              <Loader2 className="w-5 h-5 animate-spin text-[#329937]" />
              <span className="text-[13px]">Fetching rates from Aiosell…</span>
            </div>
          )}
          {error && !loading && (
            <div className="flex items-center gap-2 px-5 py-4 text-[12px] text-[#B91C1C] bg-[#FEE2E2]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {!loading && !error && ratesData && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 640 }}>
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] px-4 py-2.5 w-[196px] sticky left-0 bg-[#FAFAFA] border-r border-[#E5E5E5] z-10">
                      Room · Rate Plan
                    </th>
                    {dates.map(d => (
                      <th key={d} className={`text-center px-1.5 py-1.5 min-w-[88px] ${isWeekend(d) ? 'bg-[#FFFBEB]' : ''}`}>
                        <div className={`text-[10px] font-bold ${isWeekend(d) ? 'text-[#F59E0B]' : 'text-[#888]'}`}>{dayName(d)}</div>
                        <div className="text-[12px] font-bold text-[#1A1A1A]">{fmtDate(d)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ratesData.rateplans.map((plan, ri) => {
                    // Room type group header
                    const prevRoom = ri > 0 ? ratesData.rateplans[ri - 1].roomCode : null;
                    return (
                      <>
                        {plan.roomCode !== prevRoom && (
                          <tr key={`grp-${plan.roomCode}`}>
                            <td colSpan={dates.length + 1} className="px-4 py-1.5 bg-[#F7F7F7] border-b border-[#E5E5E5] border-t border-[#E5E5E5]">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#666] flex items-center gap-1.5">
                                <BedDouble className="w-3 h-3" />
                                {plan.roomCode === 'executive' ? 'Executive Room' : 'Suite'}
                              </span>
                            </td>
                          </tr>
                        )}
                        <tr key={`${plan.roomCode}-${plan.rateplanCode}`} className="border-b border-[#F5F5F5]">
                          <td className="px-4 py-2.5 sticky left-0 bg-white border-r border-[#E5E5E5] z-[4]">
                            <div className="text-[12px] font-semibold text-[#1A1A1A]">{plan.roomCode}</div>
                            <div className="text-[10px] text-[#888] mt-0.5">{plan.rateplanCode}</div>
                            <div className="text-[10px] bg-[#F7F7F7] border border-[#E5E5E5] rounded px-1.5 py-0.5 mt-1 inline-block font-medium text-[#555]">
                              {fmtRateplan(plan.rateplanCode)}
                            </div>
                          </td>
                          {dates.map(d => {
                            const cellKey  = `${plan.rateplanCode}|${d}`;
                            const liveRate = ratesData.dateRateMap[d]?.[plan.rateplanCode] ?? 0;
                            const isStaged = stagedChanges.has(cellKey);
                            const dispRate = isStaged ? stagedChanges.get(cellKey) : liveRate;
                            return (
                              <td key={d}
                                className={`relative px-1.5 py-1.5 cursor-pointer group ${isWeekend(d) ? 'bg-[#FFFBEB]' : ''}`}
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setPopover({ key: cellKey, liveRate, dispRate: stagedChanges.get(cellKey) ?? liveRate, rateplanCode: plan.rateplanCode, roomCode: plan.roomCode, date: d, anchorRect: rect });
                                }}
                                data-testid={`rt-cell-${plan.rateplanCode}-${d}`}>
                                {isStaged && <div className="absolute top-1.5 right-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-[#F26B33]" />}
                                <div className={`h-[34px] rounded-md flex items-center justify-center text-[12px] font-mono font-semibold transition-colors
                                  ${isStaged
                                    ? 'border-2 border-[#F26B33] bg-[#FFF7ED] text-[#C2410C]'
                                    : 'border border-[#E5E5E5] bg-white text-[#1A1A1A] group-hover:border-[#329937] group-hover:bg-[rgba(50,153,55,.04)]'}`}>
                                  ₹{dispRate.toLocaleString('en-IN')}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Legend */}
          <div className="px-5 py-2.5 border-t border-[#F0F0F0] flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-[#888]"><span className="w-3.5 h-3.5 border border-[#E5E5E5] rounded-sm bg-white inline-block" />Live OTA rate</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#888]"><span className="w-3.5 h-3.5 border-2 border-[#F26B33] rounded-sm bg-[#FFF7ED] inline-block" />Staged</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#888]"><span className="w-3.5 h-3.5 bg-[#FFFBEB] border border-[#E5E5E5] rounded-sm inline-block" />Weekend</span>
            <span className="text-[11px] text-[#888] ml-auto italic">Click any cell to edit</span>
          </div>
        </div>
      )}

      {/* ══ INVENTORY RESTRICTIONS SUB-TAB ════════════════════════════════ */}
      {subTab === 'inv' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden" data-testid="rt-inv-form">
          <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <span className="text-[14px] font-semibold">Inventory Restrictions</span>
              <span className="text-[12px] text-[#888] ml-2">Stop-sell, Min Stay, CTA / CTD per room type</span>
            </div>
            <button onClick={handlePushInvRestrictions} disabled={invPushing}
              className="h-8 px-4 bg-[#329937] hover:bg-[#2B8230] text-white rounded-lg text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
              data-testid="rt-inv-push-btn">
              {invPushing ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Push Restrictions
            </button>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {ROOM_TYPES.map(rt => (
              <div key={rt} className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-[#E5E5E5] flex items-center gap-2">
                  <BedDouble className="w-3.5 h-3.5 text-[#666]" />
                  <span className="text-[13px] font-semibold capitalize">{rt === 'executive' ? 'Executive Room' : 'Suite'}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {RESTRICTION_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="block text-[11px] font-medium text-[#666] mb-1.5">{f.label}</label>
                      {f.type === 'toggle' ? (
                        <div className="flex items-center gap-2 h-9">
                          <button onClick={() => setInvForm(p => ({ ...p, [rt]: { ...p[rt], [f.key]: !p[rt][f.key] } }))}
                            className={`w-11 h-5.5 rounded-full relative transition-colors flex-shrink-0 ${invForm[rt][f.key] ? (f.key==='stop_sell'?'bg-[#EF4444]':'bg-[#329937]') : 'bg-[#E5E5E5]'}`}
                            data-testid={`rt-inv-${rt}-${f.key}`}>
                            <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${invForm[rt][f.key] ? 'left-[22px]' : 'left-0.5'}`} />
                          </button>
                          <span className={`text-[12px] font-medium ${invForm[rt][f.key] ? (f.key==='stop_sell'?'text-[#EF4444]':'text-[#329937]') : 'text-[#666]'}`}>
                            {invForm[rt][f.key] ? 'On' : 'Off'}
                          </span>
                        </div>
                      ) : (
                        <input type="number" min={f.min} value={invForm[rt][f.key]}
                          onChange={e => setInvForm(p => ({ ...p, [rt]: { ...p[rt], [f.key]: parseInt(e.target.value)||1 } }))}
                          className="w-full h-9 border border-[#E5E5E5] rounded-lg px-3 text-[13px] outline-none focus:border-[#329937]"
                          data-testid={`rt-inv-${rt}-${f.key}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ RATE RESTRICTIONS SUB-TAB ══════════════════════════════════════ */}
      {subTab === 'raterestrict' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden" data-testid="rt-rr-form">
          <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <span className="text-[14px] font-semibold">Rate Restrictions</span>
              <span className="text-[12px] text-[#888] ml-2">CTA / CTD / Min Stay per rate plan</span>
            </div>
            <button onClick={handlePushRateRestrictions} disabled={rrPushing}
              className="h-8 px-4 bg-[#329937] hover:bg-[#2B8230] text-white rounded-lg text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
              data-testid="rt-rr-push-btn">
              {rrPushing ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Push Rate Restrictions
            </button>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {!ratesData && <p className="text-[13px] text-[#888] py-4 text-center">Load rates first to populate rate plans.</p>}
            {ratesData?.rateplans.map(({ roomCode, rateplanCode }) => {
              const fKey = `${roomCode}|${rateplanCode}`;
              const f = rrForm[fKey] ?? { stop_sell: false, minimum_stay: 1, close_on_arrival: false, close_on_departure: false };
              return (
                <div key={fKey} className="border border-[#E5E5E5] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold">
                    <span className="bg-[#F7F7F7] border border-[#E5E5E5] rounded px-2 py-0.5 text-[#555]">{roomCode}</span>
                    <span className="text-[#888]">·</span>
                    <span className="text-[#555]">{fmtRateplan(rateplanCode)}</span>
                    <span className="text-[10px] text-[#888]">({rateplanCode})</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {RESTRICTION_FIELDS.map(field => (
                      <div key={field.key}>
                        <label className="block text-[11px] font-medium text-[#666] mb-1.5">{field.label}</label>
                        {field.type === 'toggle' ? (
                          <div className="flex items-center gap-2 h-9">
                            <button onClick={() => setRrForm(p => ({ ...p, [fKey]: { ...p[fKey]??f, [field.key]: !f[field.key] } }))}
                              className={`w-11 h-5.5 rounded-full relative transition-colors flex-shrink-0 ${f[field.key] ? 'bg-[#329937]' : 'bg-[#E5E5E5]'}`}
                              data-testid={`rt-rr-${fKey}-${field.key}`}>
                              <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${f[field.key] ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                            <span className={`text-[12px] font-medium ${f[field.key] ? 'text-[#329937]' : 'text-[#666]'}`}>{f[field.key] ? 'On' : 'Off'}</span>
                          </div>
                        ) : (
                          <input type="number" min={field.min} value={f[field.key]}
                            onChange={e => setRrForm(p => ({ ...p, [fKey]: { ...p[fKey]??f, [field.key]: parseInt(e.target.value)||1 } }))}
                            className="w-full h-9 border border-[#E5E5E5] rounded-lg px-3 text-[13px] outline-none focus:border-[#329937]"
                            data-testid={`rt-rr-${fKey}-${field.key}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ CELL EDIT POPOVER ══════════════════════════════════════════════ */}
      {popover && (
        <div ref={popRef}
          className="fixed z-50 bg-white border border-[#E5E5E5] rounded-xl shadow-2xl p-4 w-[264px]"
          style={{ top: Math.min(popover.anchorRect.bottom + 8, window.innerHeight - 280), left: Math.min(popover.anchorRect.left, window.innerWidth - 276) }}
          data-testid="rt-cell-popover">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[13px] font-bold text-[#1A1A1A]">{popover.roomCode} · {fmtRateplan(popover.rateplanCode)}</div>
              <div className="text-[11px] text-[#888] mt-0.5">{fmtDate(popover.date)} · {popover.rateplanCode}</div>
            </div>
            <button onClick={() => setPopover(null)} className="text-[#888] hover:text-[#1A1A1A] p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-widest text-[#888] font-semibold mb-1">Current Live OTA Rate</div>
            <div className="text-[14px] font-bold text-[#555]">₹{popover.liveRate.toLocaleString('en-IN')}</div>
          </div>
          <CellPopoverInput
            initial={popover.dispRate}
            onStage={(newRate) => stageRate(popover.key, popover.liveRate, newRate)}
            onCancel={() => setPopover(null)} />
        </div>
      )}

      {/* ══ STAGED REVIEW BAR ══════════════════════════════════════════════ */}
      {stagedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] px-7 py-3 flex items-center justify-between gap-4 z-40 shadow-[0_-4px_16px_rgba(0,0,0,.07)]"
          data-testid="rt-review-bar">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#F26B33]" />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              <span className="text-[#F26B33]">{stagedCount}</span> rate change{stagedCount > 1 ? 's' : ''} pending push to live OTAs
            </span>
            <span className="text-[11px] text-[#888]">· Changes held locally until you confirm push</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setStagedChanges(new Map())}
              className="text-[12px] text-[#EF4444] font-medium hover:underline cursor-pointer bg-none border-none"
              data-testid="rt-discard-btn">
              Discard All
            </button>
            <button onClick={() => setShowDiff(true)}
              className="h-9 px-5 bg-[#329937] hover:bg-[#2B8230] text-white rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-colors"
              data-testid="rt-review-btn">
              <Eye className="w-4 h-4" /> Review &amp; Push to OTAs
            </button>
          </div>
        </div>
      )}

      {/* ══ DIFF MODAL ═════════════════════════════════════════════════════ */}
      {showDiff && ratesData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(0,0,0,.42)', backdropFilter:'blur(2px)' }}
          data-testid="rt-diff-overlay">
          <div className="bg-white rounded-2xl shadow-2xl w-[720px] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-start justify-between">
              <div>
                <div className="text-[16px] font-bold text-[#1A1A1A]">Push Rates to Live OTAs</div>
                <div className="text-[12px] text-[#888] mt-0.5">Review every change before it goes live on Booking.com and Goibibo/MMT</div>
              </div>
              <button onClick={() => setShowDiff(false)} className="text-[#888] hover:text-[#1A1A1A] p-1" data-testid="rt-diff-close"><X className="w-5 h-5" /></button>
            </div>
            {/* Critical warning */}
            <div className="mx-6 mt-4 bg-[#FFF7ED] border border-[#FDBA74] rounded-lg px-4 py-3 flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-[#F26B33] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#9A3412] leading-relaxed">
                <strong>Critical action:</strong> Pushing will immediately update live rates on Booking.com, Goibibo/MMT, and connected channels. New rates take effect instantly for guest bookings.
              </p>
            </div>
            {/* Diff table */}
            <div className="px-6 pt-4">
              <div className="grid text-[10px] font-bold uppercase tracking-widest text-[#888] bg-[#FAFAFA] border border-[#E5E5E5] rounded-t-lg px-3.5 py-2.5" style={{ gridTemplateColumns:'80px 100px 140px 90px 90px 80px' }}>
                <div>Date</div><div>Room</div><div>Rate Plan</div><div className="text-right">Live</div><div className="text-right">New</div><div className="text-right">Change</div>
              </div>
              <div className="border-l border-r border-b border-[#E5E5E5] rounded-b-lg overflow-hidden">
                {[...stagedChanges.entries()].map(([key, newRate]) => {
                  const [rateplanCode, date] = key.split('|');
                  const liveRate = ratesData.dateRateMap[date]?.[rateplanCode] ?? 0;
                  const delta    = newRate - liveRate;
                  const room     = ratesData.rateplans.find(p => p.rateplanCode === rateplanCode)?.roomCode ?? '';
                  return (
                    <div key={key} className="grid items-center px-3.5 py-2.5 border-b border-[#F5F5F5] text-[12px]" style={{ gridTemplateColumns:'80px 100px 140px 90px 90px 80px' }}>
                      <div className="text-[#555]">{fmtDate(date)}</div>
                      <div className="text-[#555] capitalize">{room}</div>
                      <div className="text-[#555]">{rateplanCode}<br/><span className="text-[10px] text-[#888]">{fmtRateplan(rateplanCode)}</span></div>
                      <div className="text-right font-mono text-[#888] line-through">₹{liveRate.toLocaleString('en-IN')}</div>
                      <div className="text-right font-mono font-bold text-[#1A1A1A]">₹{newRate.toLocaleString('en-IN')}</div>
                      <div className={`text-right font-mono font-bold ${delta > 0 ? 'text-[#217A28]' : 'text-[#B91C1C]'}`}>
                        {delta > 0 ? '+' : ''}₹{Math.abs(delta).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-2 flex-wrap border-t border-[#F0F0F0] mt-2">
              <span className="text-[11px] text-[#888]">Pushed to:</span>
              <span className="text-[11px] font-semibold text-[#555] bg-[#FAFAFA] border border-[#E5E5E5] px-2.5 py-1 rounded-full">Booking.com</span>
              <span className="text-[11px] font-semibold text-[#555] bg-[#FAFAFA] border border-[#E5E5E5] px-2.5 py-1 rounded-full">Goibibo / MMT</span>
              <span className="text-[11px] text-[#888] ml-1">via Aiosell</span>
            </div>
            <div className="px-6 pb-5 flex gap-2.5 justify-end border-t border-[#E5E5E5] pt-4">
              <button onClick={() => setShowDiff(false)} className="h-10 px-5 border border-[#E5E5E5] rounded-lg text-[13px] text-[#555] hover:bg-[#FAFAFA]" data-testid="rt-diff-back-btn">Back to Editing</button>
              <button onClick={handlePushRates} disabled={pushing}
                className="h-10 px-6 bg-[#329937] hover:bg-[#2B8230] text-white rounded-lg text-[13px] font-semibold flex items-center gap-2 disabled:opacity-60"
                data-testid="rt-diff-confirm-btn">
                {pushing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                Confirm &amp; Push Live Rates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CellPopoverInput ─────────────────────────────────────────────────────────
// Inline sub-component for the cell edit popover input + chips
function CellPopoverInput({ initial, onStage, onCancel }) {
  const [val, setVal] = useState(initial);
  const adjust = (d) => setVal(v => Math.max(0, (parseInt(v) || 0) + d));
  return (
    <>
      <div className="flex items-center border-2 border-[#329937] rounded-lg overflow-hidden mb-2.5">
        <span className="px-2.5 text-[13px] font-semibold text-[#888] bg-[#F9F9F9] border-r border-[#E5E5E5] self-stretch flex items-center">₹</span>
        <input type="number" value={val} onChange={e => setVal(parseInt(e.target.value)||0)}
          className="flex-1 h-10 border-none outline-none px-2.5 text-[14px] font-bold font-mono text-[#1A1A1A]"
          data-testid="rt-popover-input" autoFocus />
      </div>
      <div className="grid grid-cols-4 gap-1 mb-3">
        {[[-500,'-₹500'],[-100,'-₹100'],[100,'+₹100'],[500,'+₹500']].map(([d,l]) => (
          <button key={d} onClick={() => adjust(d)}
            className={`h-7 rounded text-[11px] font-semibold border border-[#E5E5E5] bg-white transition-colors ${d>0?'text-[#329937] hover:bg-[#F0FDF4]':'text-[#555] hover:bg-[#FAFAFA]'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 h-8 border border-[#E5E5E5] rounded-lg text-[12px] font-medium text-[#666] hover:bg-[#FAFAFA]" data-testid="rt-popover-cancel">Cancel</button>
        <button onClick={() => onStage(parseInt(val)||0)} className="flex-1 h-8 bg-[#329937] hover:bg-[#2B8230] text-white rounded-lg text-[12px] font-semibold" data-testid="rt-popover-stage">Stage Change</button>
      </div>
    </>
  );
}
```

**Verify E5:** File exists. No import errors. `data-testid="rt-rates-grid"`, `data-testid="rt-inv-form"`, `data-testid="rt-rr-form"`, `data-testid="rt-review-bar"`, `data-testid="rt-diff-overlay"` all present.

---

### E6 — `src/pages/pms/ChannelManagerPage.jsx`
**Action:** TWO sub-edits.

**E6a — MODIFY L1** (update file header comment)
Current L1:
```js
// CR-358-P1: S8 — Channel Manager Page
```
Replace with:
```js
// CR-358-P1 | CR-358-P5: S8 — Channel Manager Page (P5: Tab 3 = RatesTab)
```

**E6b — MODIFY L466-475** (replace Tab 3 placeholder with `<RatesTab />`)
Current L466-475:
```jsx
          {/* ── TAB 3: Rates & Restrictions (Phase 5 placeholder) ─────── */}
          {activeTab === 3 && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h2 className="text-[16px] font-semibold text-[#1A1A1A] mb-2">Rates & Restrictions</h2>
                <p className="text-[13px] text-gray-500">Available in Phase 5 of the PMS rollout.</p>
              </div>
            </div>
          )}
```
Replace with:
```jsx
          {/* ── TAB 3: Rates & Restrictions (CR-358-P5) ─────────────── */}
          {activeTab === 3 && <RatesTab />}
```

**E6c — ADD import** after existing imports (find the last import line and add after it)
Existing last import is around L20-22 — find `import aiosellTransform` line and ADD after the import block:
```js
import RatesTab from './RatesTab'; // CR-358-P5
```

**Verify E6:** `grep -n "RatesTab" src/pages/pms/ChannelManagerPage.jsx` → 2 hits (import + usage). Webpack compiles.

---

### E7 — `src/pages/pms/ArrivalsPage.jsx`
**Action:** FOUR sub-edits.

**E7a — MODIFY L4** (add `UserX` to lucide-react import)
Current L4:
```js
import { Plus, RefreshCw, Loader2, AlertCircle, MessageSquare, BedDouble } from 'lucide-react';
```
Replace with:
```js
import { Plus, RefreshCw, Loader2, AlertCircle, MessageSquare, BedDouble, UserX } from 'lucide-react'; // UserX: CR-358-P5
```

**E7b — MODIFY L6** (add `markNoShowBooking` to pmsService import)
Current L6:
```js
import { getReservationOps } from '@/api/services/pmsService';
```
Replace with:
```js
import { getReservationOps, markNoShowBooking } from '@/api/services/pmsService'; // markNoShowBooking: CR-358-P5
```

**E7c — ADD after L6** (add toast + NoShowDialog imports)
Insert after L6:
```js
import { toast } from 'sonner'; // CR-358-P5
import NoShowDialog from '@/components/pms/NoShowDialog'; // CR-358-P5
```

**E7d — ADD constant + state in component body**
After `const PAGE_SIZE = 20;` (L14), add:
```js
const OTA_NO_SHOW_CHANNELS = ['booking.com', 'gommt']; // CR-358-P5
```

After the first `useState` call in the component (find `const [activeTab, setActiveTab]` and add after the existing state declarations):
```js
const [noShowTarget, setNoShowTarget] = useState(null); // CR-358-P5
```

**E7e — MODIFY action cell L226-239**
Current L226-239:
```jsx
                          <td className="px-4 py-3">
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
                          </td>
```
Replace with:
```jsx
                          <td className="px-4 py-3">
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
                              {/* CR-358-P5: No-Show — booking.com/gommt pending rows on Late/Today tabs */}
                              {!isCheckedIn &&
                                (activeTab === 'late' || activeTab === 'today') &&
                                OTA_NO_SHOW_CHANNELS.includes((row.channel ?? '').toLowerCase()) &&
                                row.operationalStatus === 'pending' && (
                                  <button
                                    data-testid={`arr-noshow-btn-${row.bookingId}`}
                                    onClick={() => setNoShowTarget({ bookingId: row.bookingId, guestName: row.guestName, channel: row.channel, checkin: row.checkin, roomCode: row.roomCode })}
                                    className="px-2.5 py-1.5 rounded text-[12px] font-medium border border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2] transition-colors flex items-center gap-1">
                                    <UserX className="w-3 h-3" /> No-Show
                                  </button>
                              )}
                            </div>
                          </td>
```

**E7f — ADD NoShowDialog before closing `</div>` of the component JSX**
Find the final `</div>` of the return block and add before it:
```jsx
      {/* CR-358-P5: No-Show confirmation dialog */}
      <NoShowDialog
        target={noShowTarget}
        onClose={() => setNoShowTarget(null)}
        onSuccess={() => {
          load();
          toast.success('No-Show recorded. Room inventory released.');
        }}
      />
```

**Verify E7:** `grep -n "noShowTarget\|OTA_NO_SHOW_CHANNELS\|arr-noshow-btn\|NoShowDialog" src/pages/pms/ArrivalsPage.jsx` → all 4 present

---

### E8 — `src/pages/pms/ReservationsPage.jsx`
**Action:** FIVE sub-edits.

**E8a — MODIFY L1** (update file header)
Current:
```js
// CR-358-P4: S2 — Tape Chart ...
```
Replace with:
```js
// CR-358-P4 | CR-358-P5: S2 — Tape Chart ... (P5: No-Show in BlockPopover)
```

**E8b — MODIFY L8** (add `UserX` to lucide import)
Current L8:
```js
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Loader2, AlertCircle, LogIn, FileText, X } from 'lucide-react';
```
Replace with:
```js
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Loader2, AlertCircle, LogIn, FileText, X, UserX } from 'lucide-react'; // UserX: CR-358-P5
```

**E8c — ADD after L8** (add markNoShowBooking + NoShowDialog imports)
```js
import { markNoShowBooking } from '@/api/services/pmsService'; // CR-358-P5
import NoShowDialog from '@/components/pms/NoShowDialog'; // CR-358-P5
```

**E8d — ADD state in component body**
After `const [popover, setPopover] = useState(null);` (L43), add:
```js
const [noShowTarget, setNoShowTarget] = useState(null); // CR-358-P5
```

**E8e — MODIFY BlockPopover signature L290**
Current L290:
```js
function BlockPopover({ popover, popRef, setPopover, navigate }) {
```
Replace with:
```js
function BlockPopover({ popover, popRef, setPopover, navigate, onNoShow }) { // CR-358-P5: onNoShow
```

**E8f — MODIFY BlockPopover caller L224**
Current L224:
```jsx
            {popover && <BlockPopover popover={popover} popRef={popRef} setPopover={setPopover} navigate={navigate} />}
```
Replace with:
```jsx
            {popover && <BlockPopover popover={popover} popRef={popRef} setPopover={setPopover} navigate={navigate} onNoShow={(t) => setNoShowTarget(t)} />} {/* CR-358-P5 */}
```

**E8g — ADD No-Show button INSIDE BlockPopover action div**
Current action div (L324-338 — closing `</div>` at L338, after View Folio button):
```jsx
        {kind === 'in_house' && line.orderId && (
          <button data-testid="tc-popover-folio-btn"
            ...>
            <FileText className="w-3 h-3" />View Folio
          </button>
        )}
      </div>
```
Replace the closing `</div>` after the View Folio block with:
```jsx
        {kind === 'in_house' && line.orderId && (
          <button data-testid="tc-popover-folio-btn"
            onClick={() => { setPopover(null); navigate('/reports/rooms'); }}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium border border-[#F26B33] text-[#F26B33] hover:bg-[#FFF7ED] transition-colors flex items-center gap-1">
            <FileText className="w-3 h-3" />View Folio
          </button>
        )}
        {/* CR-358-P5: No-Show — pending booking.com/gommt blocks with past check-in */}
        {kind === 'pending' &&
          ['booking.com', 'gommt'].includes((res.channel ?? '').toLowerCase()) &&
          res.checkin <= localDate(0) && (
            <button
              data-testid="tc-popover-noshow-btn"
              onClick={() => { setPopover(null); onNoShow({ bookingId: res.bookingId, guestName: res.guestName, channel: res.channel, checkin: res.checkin, roomCode: res.roomCode }); }}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium border border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2] transition-colors flex items-center gap-1">
              <UserX className="w-3 h-3" />No-Show
            </button>
        )}
      </div>
```

**E8h — ADD NoShowDialog in parent component JSX**
Find the final `</div>` of ReservationsPage return block and insert before it:
```jsx
      {/* CR-358-P5: No-Show confirmation dialog */}
      <NoShowDialog
        target={noShowTarget}
        onClose={() => setNoShowTarget(null)}
        onSuccess={() => {
          load();
          toast.success('No-Show recorded. Room inventory released.');
        }}
      />
```

**Verify E8:** `grep -n "noShowTarget\|onNoShow\|tc-popover-noshow-btn\|NoShowDialog" src/pages/pms/ReservationsPage.jsx` → all 4 present

---

## 3. Webpack Compile Checkpoints

```bash
# After Group A (E1-E3): verify service layer compiles
grep -c "export const" src/api/services/aiosellService.js   # should be 14
grep -c "fromRates\|rates:" src/api/transforms/aiosellTransform.js  # should be 2
grep -c "pushRatesData\|markNoShowBooking" src/api/services/pmsService.js  # should be 2

# After Group B (E4-E5): check webpack
tail -5 /var/log/supervisor/frontend.out.log  # "webpack compiled" or "0 errors"

# Final check (all 8 files):
tail -5 /var/log/supervisor/frontend.out.log  # "webpack compiled successfully" or "with N warnings"
# Warnings for react-hooks/exhaustive-deps are acceptable (pre-existing); errors are not
```

---

## 4. Scope Lock

```
Files WILL change:
  src/api/services/aiosellService.js         append after L120
  src/api/transforms/aiosellTransform.js     insert after L152 + modify L218
  src/api/services/pmsService.js             modify L6 + append after L312
  src/pages/pms/ChannelManagerPage.jsx       modify L1, L466-475, add import
  src/pages/pms/ArrivalsPage.jsx             modify L4, L6, add imports, add state, L226-239 + dialog
  src/pages/pms/ReservationsPage.jsx         modify L1, L8, add imports, add state, L224, L290, L337 + dialog

NEW files:
  src/pages/pms/RatesTab.jsx
  src/components/pms/NoShowDialog.jsx

Files will NOT touch:
  src/api/constants.js          (constants already declared)
  src/App.js                    (no new routes)
  src/components/layout/Sidebar.jsx
  src/pages/pms/ChannelManagerPage.jsx L2-465, L476+
  All other P1-P4 source files
```

---

## 5. Verification Matrix

*(Full 28-check matrix from Gate 2 IA §13 — reproduced here for implementation agent)*

| V# | Feature | File | Verify | Auto? |
|---|---|---|---|---|
| V-G1 | getRates 200 | aiosellService.js | curl POST /fetch-rates → 200 | YES |
| V-G2 | pushRates snake_case | aiosellService.js | curl with room_code/rateplan_code → 200 | YES |
| V-G3 | pushInventoryRestrictions object | aiosellService.js | curl with restrictions:{stop_sell:true} → 200 | YES |
| V-G4 | pushRateRestrictions object | aiosellService.js | curl with restrictions:{minimum_stay:2} → 200 | YES |
| V-G5 | markNoShow + channel field | aiosellService.js | curl with {booking_id, channel} | YES |
| V-U1 | fromRates flatten | aiosellTransform.js | Unit: 2 dates × 2 plans → correct map | YES |
| V-U2 | fromRates duplicate date | aiosellTransform.js | Unit: same date twice → last entry wins | YES |
| V-U3 | pushRatesData snake_case | pmsService.js | Unit: staged map → rates has room_code | YES |
| V-B1 | Rate grid 8 rows × 7 columns | RatesTab.jsx | Browser: Tab 3 → count matrix | NO |
| V-B2 | Weekend amber background | RatesTab.jsx | Browser: SAT/SUN column tint | NO |
| V-B3 | Cell click → popover | RatesTab.jsx | Browser: click cell → popover with ₹ | NO |
| V-B4 | Stage → orange + bar | RatesTab.jsx | Browser: stage 1 → orange cell + bar | NO |
| V-B5 | Diff modal before/after | RatesTab.jsx | Browser: 2 staged → review → verify table | NO |
| V-B6 | Push → toast + cleared | RatesTab.jsx | Browser: confirm → success toast, cells clear | NO |
| V-B7 | Inv Restrictions sub-tab | RatesTab.jsx | Browser: click "Inventory Restrictions" → form | NO |
| V-B8 | stop_sell push | RatesTab.jsx | Browser: toggle ON → push → 200 | NO |
| V-B9 | Rate Restrictions sub-tab | RatesTab.jsx | Browser: click "Rate Restrictions" → form | NO |
| V-B10 | No-Show on Late tab (booking.com) | ArrivalsPage.jsx | Browser: Late tab b.com pending → button | NO |
| V-B11 | No-Show NOT on Direct row | ArrivalsPage.jsx | Browser: Direct booking → no button | NO |
| V-B12 | No-Show NOT on Upcoming | ArrivalsPage.jsx | Browser: Upcoming tab → no buttons | NO |
| V-B13 | NoShowDialog shows details | NoShowDialog.jsx | Browser: click → dialog shows bookingId/channel | NO |
| V-B14 | Tape Chart No-Show eligible block | ReservationsPage.jsx | Browser: pending b.com past-checkin → popover button | NO |
| V-B15 | No-Show NOT on in_house block | ReservationsPage.jsx | Browser: occupied block → no button | NO |
| V-R1 | ChannelManagerPage Tabs 0-2 | ChannelManagerPage.jsx | Browser: switch tabs → render normally | NO |
| V-R2 | ArrivalsPage other tabs | ArrivalsPage.jsx | Browser: Upcoming/CheckedIn → no No-Show | NO |
| V-R3 | ReservationsPage tape chart | ReservationsPage.jsx | Browser: loads + blocks clickable | NO |
| V-M1 | Rate push live | preprod | Re-fetch after push → new rates | NO |
| V-M2 | No-Show Arrivals | preprod | Fresh eligible booking → confirm → toast | NO |
| V-M3 | Inv Restrictions push | preprod | Push stop_sell:true → OTA reflects | NO |

---

## 6. Post-Code Registry Checklist

```
After coding + webpack clean + V-B1 smoke:

□ registry.json: CR-358-P5 → status "IMPLEMENTED", sprint_key "pos_pms_1", gate "5a"
□ CR_REGISTRY.md: CR-358-P5 row → IMPLEMENTED (Gate 5a)
□ FILE_OWNERSHIP.md: add entries for all 8 files with "CR-358-P5 | IMPL 2026-09-0X"
□ Code marker "// CR-358-P5" in header of every modified/new file
□ PRD.md: P5 status line → IMPLEMENTED
□ Handover: write SESSION_HANDOVER_<DATE>_CR358P5_IMPL.md
```

---

*Gate 3 complete. 8 edits (2 NEW files). 28 checks. Awaiting Gate 4 GO.*
*Handover: "Plan ready. 8 edits across 8 files. Code reality: PARTIAL. Scope: RatesTab.jsx + NoShowDialog.jsx NEW; 6 files modified. Verification matrix: 28 checks (5 curl, 3 unit, 17 browser, 3 manual). Owner decisions needed: none. Awaiting Gate 4 GO."*
