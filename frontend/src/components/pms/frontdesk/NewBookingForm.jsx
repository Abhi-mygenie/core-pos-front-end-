// CR-385 M1 — New Booking, top-of-tab expansion (D81, F1). Server-priced (BQ-385-10/16): the form sends the INTENT only
// (guest, dates, pax, room_code + rateplan_code, optional advance) — never rate_per_night. Pre-save RIGHT pane = "Stay summary"
// (D82 deviation vs mockup v2.18): server rate/night for display, nights, advance, readiness — NO client GST/total/balance.
// Post-201 the strip shows charge.* only (D50). skipped:true / missing data.reservation = hard booking-error (BQ-385-26).
// No Split tile at advance points (OD-385-18 a). Dates: min = meta.business_date (X-06).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { buildBookingBody, createBooking, getAvailability, getRatesData } from '@/api/services/frontDeskService';
import { plusDays } from '@/api/transforms/frontDeskTransform';
import { fmtINR, fmtDate, plural } from './money';

export const READS_DEBOUNCE_MS = 500;
const METHODS = [['cash', 'Cash'], ['card', 'Card'], ['upi', 'UPI']];
const nightsBetween = (a, b) => (a && b && b > a ? Math.round((new Date(b) - new Date(a)) / 86400000) : 0);
const errText = (e, fallback) => e?.response?.data?.message ?? e?.message ?? fallback;
const inputCls = 'w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px] bg-white disabled:bg-[#F7F7F7]';
const Label = ({ children }) => <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">{children}</span>;

export const freeByType = (avail) => (avail?.rooms ?? []).reduce((m, r) => { const k = r.aiosell_room_code; m[k] = (m[k] ?? 0) + (r.available ? 1 : 0); return m; }, {});

export const NewBookingForm = ({ meta, onDone, onCheckInNow, onClose }) => {
  const bd = meta?.business_date ?? '';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [checkin, setCheckin] = useState(bd);
  const [checkout, setCheckout] = useState(bd ? plusDays(bd, 1) : '');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [sel, setSel] = useState(null); // { roomCode, rateplanCode }
  const [advOpen, setAdvOpen] = useState(false);
  const [advance, setAdvance] = useState({ amount: '', method: 'cash', reference: '' });
  const [rates, setRates] = useState({ rateplans: [], dateRateMap: {}, loading: false });
  const [free, setFree] = useState(null);
  const [busy, setBusy] = useState(null); // 'save' | 'checkin'
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const inFlight = useRef(false);
  const pendingRef = useRef(null);

  const nights = nightsBetween(checkin, checkout);
  const datesValid = Boolean(checkin && checkout && nights > 0 && (!bd || checkin >= bd));

  useEffect(() => { // C7: ≥500 ms debounce, never two read batches in flight, reads are side-effect free
    if (!datesValid) return undefined;
    const run = async (win) => {
      inFlight.current = true;
      setRates((s) => ({ ...s, loading: true }));
      const [r, a] = await Promise.allSettled([getRatesData({ startDate: win.checkin, endDate: win.checkout }), getAvailability(win)]);
      setRates({ rateplans: r.status === 'fulfilled' ? (r.value?.rateplans ?? []) : [], dateRateMap: r.status === 'fulfilled' ? (r.value?.dateRateMap ?? {}) : {}, loading: false });
      setFree(a.status === 'fulfilled' ? freeByType(a.value) : null);
      inFlight.current = false;
      if (pendingRef.current) { const n = pendingRef.current; pendingRef.current = null; run(n); }
    };
    const win = { checkin, checkout };
    const t = setTimeout(() => { if (inFlight.current) pendingRef.current = win; else run(win); }, READS_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [checkin, checkout, datesValid]);

  const types = useMemo(() => [...new Set(rates.rateplans.map((p) => p.roomCode))], [rates.rateplans]);
  const rateOf = (code) => rates.dateRateMap?.[checkin]?.[code] ?? Object.values(rates.dateRateMap ?? {})[0]?.[code] ?? null;
  const soldOut = (type) => free != null && (free[type] ?? 0) === 0;
  const selRate = sel ? rateOf(sel.rateplanCode) : null;
  const softMax = selRate != null && nights ? Number(selRate) * nights : null; // soft hint only — server authoritative, never blocks Save
  const advAmt = Number(advance.amount || 0);
  const advNeedsRef = advAmt > 0 && advance.method !== 'cash' && !advance.reference.trim();
  const phoneOk = /^\d{10}$/.test(phone.trim());
  const missing = [!name.trim() && 'guest name', !phoneOk && '10-digit phone', !datesValid && 'valid dates', !sel && 'room type & plan', Number(adults) < 1 && 'at least 1 adult', advNeedsRef && 'payment reference'].filter(Boolean);
  const ready = missing.length === 0;

  const submit = async (mode) => {
    if (!ready || busy) return;
    setBusy(mode); setError(null);
    try {
      const body = buildBookingBody({ name, phone, checkin, checkout, adults, children, roomCode: sel.roomCode, rateplanCode: sel.rateplanCode, advance: advAmt > 0 ? advance : null });
      const reservation = await createBooking(body);
      if (mode === 'checkin') { onCheckInNow?.(reservation); return; }
      setCreated(reservation);
    } catch (e) { setError(errText(e, 'Booking failed')); }
    finally { setBusy(null); }
  };

  const stop = (e) => e.stopPropagation();
  const c = created?.charge ?? null;

  return (
    <section className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm p-5" data-testid="booking-form" onClick={stop} onKeyDown={stop}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold">New booking</div>
          <div className="text-[12px] text-[#767676] mt-0.5">Room type + rate plan from the rate table · price set by the server on save</div>
        </div>
        <button type="button" data-testid="booking-close-btn" onClick={onClose} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
      </div>

      {created ? (
        <div data-testid="booking-confirmation" className="grid grid-cols-2 gap-6">
          <div className="text-[13px]">
            <div className="font-semibold text-[#329937]">Booking saved · {created.booking_id}</div>
            <div className="text-[12px] text-[#767676] mt-1">{created.guest?.first_name} {created.guest?.last_name} · {fmtDate(created.checkin)} → {fmtDate(created.checkout)} · {plural(c?.nights ?? nights, 'night')} · {created.rooms?.[0]?.room_code}</div>
          </div>
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px] grid grid-cols-2 gap-y-1 tabular-nums">
            <span className="text-[#767676]">Booking charge</span><span className="text-right">{fmtINR(c?.booking_charge)}</span>
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="booking-bill-sgst">{fmtINR(c?.sgst)}</span>
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="booking-bill-cgst">{fmtINR(c?.cgst)}</span>
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="booking-bill-total">{fmtINR(c?.total_with_gst)}</span>
            <span className="text-[#767676]">Advance received</span><span className="text-right" data-testid="booking-bill-advance">{fmtINR(c?.advance_payment)}</span>
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="booking-bill-balance">{fmtINR(c?.balance_due)}</span>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" data-testid="booking-done-btn" onClick={() => onDone?.(`Booking saved — ${created.booking_id}`)} className="px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d]">Done</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1.4fr_1fr] gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><Label>Guest name</Label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} data-testid="booking-guest-name" disabled={!!busy} /></label>
              <label className="block"><Label>Phone</Label><input value={phone} inputMode="numeric" maxLength={10} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className={inputCls} data-testid="booking-guest-phone" disabled={!!busy} /></label>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <label className="block"><Label>Check-in</Label><input type="date" value={checkin} min={bd || undefined} onChange={(e) => { setCheckin(e.target.value); setSel(null); }} className={inputCls} data-testid="booking-checkin" disabled={!!busy} /></label>
              <label className="block"><Label>Check-out</Label><input type="date" value={checkout} min={checkin ? plusDays(checkin, 1) : undefined} onChange={(e) => { setCheckout(e.target.value); setSel(null); }} className={inputCls} data-testid="booking-checkout" disabled={!!busy} /></label>
              <label className="block"><Label>Adults</Label><input type="number" min={1} value={adults} onChange={(e) => setAdults(e.target.value)} className={inputCls} data-testid="booking-adults" disabled={!!busy} /></label>
              <label className="block"><Label>Children</Label><input type="number" min={0} value={children} onChange={(e) => setChildren(e.target.value)} className={inputCls} data-testid="booking-children" disabled={!!busy} /></label>
            </div>
            {checkin && checkout && !datesValid && <div className="text-[12px] text-[#B91C1C]" role="alert" data-testid="booking-dates-error">Check-out must be after check-in, and check-in cannot be before {fmtDate(bd)}.</div>}

            <div>
              <div className="flex items-center justify-between mb-1"><Label>Room type × rate plan · price / night from the rate table</Label>{rates.loading && <span className="inline-flex items-center gap-1 text-[11px] text-[#767676]" data-testid="booking-rates-loading"><Loader2 className="w-3 h-3 animate-spin" /> loading rates…</span>}</div>
              <div className="border border-[#E5E5E5] rounded-lg overflow-hidden" data-testid="booking-rate-grid" role="radiogroup">
                {types.length === 0 && !rates.loading && <div className="p-3 text-[12px] text-[#767676]" data-testid="booking-rate-grid-empty">{datesValid ? 'No rates for these dates.' : 'Pick valid dates to load rates.'}</div>}
                {types.map((type) => {
                  const out = soldOut(type);
                  return (
                    <div key={type} className={`flex items-center gap-2 px-3 py-2 border-b last:border-b-0 border-[#F0F0F0] ${out ? 'opacity-50' : ''}`} data-testid={`booking-type-${type}`}>
                      <div className="w-28 text-[12px] font-semibold capitalize">{type}<div className="text-[10px] font-normal text-[#767676]" data-testid={`booking-type-${type}-free`}>{free == null ? '—' : out ? 'sold out' : `${free[type]} free`}</div></div>
                      <div className="flex flex-wrap gap-2">
                        {rates.rateplans.filter((p) => p.roomCode === type).map((p) => {
                          const on = sel?.rateplanCode === p.rateplanCode; const rate = rateOf(p.rateplanCode);
                          return (
                            <button key={p.rateplanCode} type="button" role="radio" aria-checked={on} disabled={out || !!busy} data-testid={`booking-cell-${type}-${p.rateplanCode}`}
                              onClick={() => setSel({ roomCode: type, rateplanCode: p.rateplanCode })}
                              className={`fd-btn px-3 h-9 rounded-md text-[12px] border tabular-nums ${on ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white border-[#E5E5E5] hover:bg-[#F7F7F7]'} disabled:cursor-not-allowed`}>
                              <span className="font-semibold">{p.rateplanCode}</span> <span className="opacity-80">{rate != null ? fmtINR(rate) : '—'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-[#E5E5E5] rounded-lg p-3">
              <button type="button" data-testid="booking-advance-toggle" onClick={() => setAdvOpen((v) => !v)} className="fd-btn text-[12px] font-semibold flex items-center gap-2">
                <span className={`inline-block w-4 h-4 rounded border ${advOpen ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#CCC]'}`} aria-hidden /> Collect an advance now <span className="text-[#767676] font-normal">· optional</span>
              </button>
              {advOpen && (
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-3 items-end" data-testid="booking-advance">
                  <label className="block"><Label>Amount</Label><input type="number" min={0} value={advance.amount} onChange={(e) => setAdvance((a) => ({ ...a, amount: e.target.value }))} className={inputCls} data-testid="booking-advance-amount" disabled={!!busy} /></label>
                  <div className="flex gap-1.5">{METHODS.map(([k, l]) => (
                    <button key={k} type="button" data-testid={`booking-pay-${k}`} aria-pressed={advance.method === k} onClick={() => setAdvance((a) => ({ ...a, method: k }))} disabled={!!busy}
                      className={`fd-btn px-3 h-9 rounded-md text-[12px] font-semibold border ${advance.method === k ? 'bg-white ring-2 ring-[#1A1A1A] border-transparent' : 'bg-white border-[#E5E5E5]'}`}>{l}</button>))}</div>
                  <label className="block"><Label>{advance.method === 'upi' ? 'UTR' : advance.method === 'card' ? 'Txn ID' : 'Reference'}{advance.method !== 'cash' && ' · required'}</Label><input value={advance.reference} onChange={(e) => setAdvance((a) => ({ ...a, reference: e.target.value }))} className={inputCls} data-testid="booking-pay-ref" disabled={!!busy} /></label>
                  {softMax != null && advAmt > softMax && <div className="col-span-3 text-[11px] text-[#92400E]" data-testid="booking-advance-hint">Above the indicative stay amount ({fmtINR(softMax)} = rate × {nights} nights). The server decides — its message is shown if it rejects.</div>}
                </div>
              )}
            </div>
            <div className="text-[11px] text-[#767676]" data-testid="booking-b2b-note">B2B (GST) details are captured at check-in, not at booking.</div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px] flex flex-col" data-testid="booking-summary">
            <div className="font-semibold text-[#1A1A1A] mb-2">Stay summary</div>
            <div className="grid grid-cols-2 gap-y-1 tabular-nums">
              <span className="text-[#767676]">Room type · plan</span><span className="text-right capitalize" data-testid="booking-summary-plan">{sel ? `${sel.roomCode} · ${sel.rateplanCode}` : '—'}</span>
              <span className="text-[#767676]">Rate-table price · per night</span><span className="text-right" data-testid="booking-summary-rate">{selRate != null ? fmtINR(selRate) : '—'}</span>
              <span className="text-[#767676]">Nights</span><span className="text-right" data-testid="booking-summary-nights">{nights || '—'}</span>
              <span className="text-[#767676]">Advance to collect</span><span className="text-right" data-testid="booking-summary-advance">{advAmt > 0 ? `${fmtINR(advAmt)} · ${advance.method.toUpperCase()}` : 'none'}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-[#E5E5E5] text-[11px] text-[#767676]" data-testid="booking-bill-pending">Total, SGST, CGST and balance are priced by the server when you save.</div>
            <div className="mt-3">
              {ready ? <span className="inline-block px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-[11px] font-semibold" data-testid="booking-ready-pill">✓ Ready to book</span>
                : <span className="text-[11px] text-[#92400E]" data-testid="booking-missing">Missing: {missing.join(', ')}</span>}
            </div>
            {error && <div className="mt-3 text-[#B91C1C]" role="alert" data-testid="booking-error">{error}</div>}
            <div className="mt-auto pt-4 flex flex-col gap-2">
              <button type="button" data-testid="booking-save-btn" disabled={!ready || !!busy} onClick={() => submit('save')} className="inline-flex items-center justify-center gap-1.5 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40">{busy === 'save' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save booking</button>
              <button type="button" data-testid="booking-save-checkin-btn" disabled={!ready || !!busy || !onCheckInNow || checkin !== bd} title={checkin !== bd ? `Arrives ${fmtDate(checkin)} — check-in happens on the arrival date` : undefined} onClick={() => submit('checkin')} className="inline-flex items-center justify-center gap-1.5 h-9 text-[12px] font-semibold rounded-md border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#F7F7F7] disabled:opacity-40">{busy === 'checkin' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save & check in now</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default NewBookingForm;
