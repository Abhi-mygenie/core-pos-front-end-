// CR-358-P5: S8-C — Rates & Restrictions Tab (Channel Manager Tab 3)
// Sub-tabs: Rates (fetch+stage+push) | Inventory Restrictions (push) | Rate Restrictions (push)
// Design: hybrid matrix with cell popover (OD-P5-02) + staged bar + diff modal (OD-P5-03)
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, Layers, Eye, Send, X,
  BedDouble, Loader2, AlertCircle,
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
  { key: 'stop_sell',          label: 'Stop Sell',               type: 'toggle' },
  { key: 'minimum_stay',       label: 'Min Stay (nights)',        type: 'number', min: 1 },
  { key: 'close_on_arrival',   label: 'Closed to Arrival (CTA)', type: 'toggle' },
  { key: 'close_on_departure', label: 'Closed to Departure (CTD)', type: 'toggle' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const addDays   = (ymd, n) => { const d = new Date(`${ymd}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const isWeekend = (ymd) => { const d = new Date(`${ymd}T00:00:00`); return WEEKEND_DAYS.includes(d.getDay()); };
const fmtDate   = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const dayName   = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const fmtRateplan = (code) => {
  const parts  = code?.split('-') ?? [];
  const planMap = { ep: 'EP', cp: 'CP', map: 'MAP', ap: 'AP' };
  const occMap  = { s: 'Single', d: 'Double' };
  const occ  = occMap[parts[parts.length - 2]] ?? '';
  const plan = planMap[parts[parts.length - 1]] ?? '';
  return `${plan} ${occ}`.trim() || code;
};
const buildDates = (start, days) =>
  Array.from({ length: days }, (_, i) => addDays(start, i));

// ─── Initial restriction form state ──────────────────────────────────────────
const initInvForm = () => Object.fromEntries(ROOM_TYPES.map(rt => [rt, { stop_sell: false, minimum_stay: 1, close_on_arrival: false, close_on_departure: false }]));

// ─── Component ───────────────────────────────────────────────────────────────
export default function RatesTab() {
  const [subTab,        setSubTab]        = useState('rates');
  const [days,          setDays]          = useState(DEFAULT_DAYS);
  const [startDate,     setStartDate]     = useState(() => localDate(0));
  const [ratesData,     setRatesData]     = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [stagedChanges, setStagedChanges] = useState(new Map());
  const [popover,       setPopover]       = useState(null);
  const [showDiff,      setShowDiff]      = useState(false);
  const [pushing,       setPushing]       = useState(false);
  const [invForm,       setInvForm]       = useState(initInvForm);
  const [rrForm,        setRrForm]        = useState({});
  const [invPushing,    setInvPushing]    = useState(false);
  const [rrPushing,     setRrPushing]     = useState(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                            className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${invForm[rt][f.key] ? (f.key==='stop_sell'?'bg-[#EF4444]':'bg-[#329937]') : 'bg-[#E5E5E5]'}`}
                            data-testid={`rt-inv-${rt}-${f.key}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${invForm[rt][f.key] ? 'left-[22px]' : 'left-0.5'}`} />
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
                            <button onClick={() => setRrForm(p => ({ ...p, [fKey]: { ...(p[fKey] ?? f), [field.key]: !f[field.key] } }))}
                              className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${f[field.key] ? 'bg-[#329937]' : 'bg-[#E5E5E5]'}`}
                              data-testid={`rt-rr-${fKey}-${field.key}`}>
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${f[field.key] ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                            <span className={`text-[12px] font-medium ${f[field.key] ? 'text-[#329937]' : 'text-[#666]'}`}>{f[field.key] ? 'On' : 'Off'}</span>
                          </div>
                        ) : (
                          <input type="number" min={field.min} value={f[field.key]}
                            onChange={e => setRrForm(p => ({ ...p, [fKey]: { ...(p[fKey] ?? f), [field.key]: parseInt(e.target.value)||1 } }))}
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
              className="text-[12px] text-[#EF4444] font-medium hover:underline cursor-pointer bg-transparent border-none"
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
