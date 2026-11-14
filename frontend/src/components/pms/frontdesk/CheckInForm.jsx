// CR-385 M3 — Check-In, expand-in-place on the Arrivals row / booked RoomDetail. Copied from pages/pms/CheckInPage.jsx
// (state L26–57 · GuestDocsSection usage L787–797 · submit L263–345 minus navigate) @ P2 entry 2026-09-22; mirror rule until FU-385-C.
// Money: RIGHT bill = row.charge.* only (D50); the server recomputes on confirm (paid upgrade) and returns data.charge.
// Room chooser: booked-type rooms `available` + `hk` (HK badge + amber note, N9/D52) · "Show higher categories (upgrade)" (D23) ·
// early check-in guard N7/D53 (rules.allowEarlyCheckin vs meta.business_date) · server 422 shown verbatim · no Split (OD-385-18 a).
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import GuestDocsSection from '@/components/pms/GuestDocsSection';
import { checkIn } from '@/api/services/frontDeskService';
import { fmtINR, fmtDate, fmtTime, plural, channelLabel } from './money';
import { useRestaurant } from '@/contexts'; // BUG-503: GST slab config (OD-503-01 Option A)
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-503 + BUG-504

const METHODS = [['Cash', 'Cash'], ['Card', 'Card'], ['UPI', 'UPI']];
const UPGRADE_REASONS = ['Overbooking', 'Loyalty', 'Service recovery', 'Manager discretion'];
const inputCls = 'w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px] bg-white disabled:bg-[#F7F7F7]';
const Label = ({ children }) => <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">{children}</span>;
const errText = (e, fallback) => e?.response?.data?.message ?? e?.message ?? fallback;

export const isEarly = (row, bd) => Boolean(row?.checkin && bd && row.checkin > bd);
export const isHk = (room) => room?.displayStatus === 'hk' || room?.manualStatus === 'hk';
export const eligibleRooms = (rooms, roomType, showUpgrade) =>
  (rooms ?? []).filter((r) => (r.displayStatus === 'available' || r.displayStatus === 'hk') && (showUpgrade ? r.roomType !== roomType : r.roomType === roomType));

export const CheckInForm = ({ row, meta, rooms, rules, onDone, onClose }) => {
  const bd = meta?.business_date;
  const early = isEarly(row, bd);
  const blockedEarly = early && !rules?.allowEarlyCheckin;
  // BUG-503: GST slab config (OD-503-01 Option A — hook, no prop change)
  const { restaurant } = useRestaurant();
  const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};
  // BUG-503: nights from LR booking row (already computed by backend; no date arithmetic needed)
  const formNights = row?.nights ?? 1;
  const [tableId, setTableId] = useState(row.tableId ? String(row.tableId) : '');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgrade, setUpgrade] = useState({ type: 'paid', amount: '', reason: '' });
  const [idType, setIdType] = useState('Aadhar card');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [extraAdults, setExtraAdults] = useState(() => Array.from({ length: Math.max(0, (row.adults ?? 1) - 1) }, () => ({ name: '' })));
  const [b2b, setB2b] = useState(false);
  const [firm, setFirm] = useState({ name: '', gst: '' });
  const [collect, setCollect] = useState({ amount: '', method: 'Cash', reference: '' });
  const [autoPrint, setAutoPrint] = useState(Boolean(rules?.autoPrintCheckinReceipt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // BUG-489: mirror CR-407 Sub-scope A — check-in room discount
  const [ciRoomDiscountAmt,  setCiRoomDiscountAmt]  = useState('');      // raw input (₹ or %)
  const [ciRoomDiscountType, setCiRoomDiscountType] = useState('Amount'); // 'Amount' | 'Percent'

  const sameType = useMemo(() => eligibleRooms(rooms, row.roomType, false), [rooms, row.roomType]);
  const otherType = useMemo(() => (showUpgrade ? eligibleRooms(rooms, row.roomType, true) : []), [rooms, row.roomType, showUpgrade]);
  const room = (rooms ?? []).find((r) => String(r.id) === tableId) ?? null;
  const isUpgrade = Boolean(room && room.roomType !== row.roomType);
  const c = row.charge ?? {};
  const collectAmt = Number(collect.amount || 0);
  const collectNeedsRef = collectAmt > 0 && collect.method !== 'Cash' && !collect.reference.trim();
  const missing = [
    !room && 'room', isUpgrade && upgrade.type === 'paid' && !(Number(upgrade.amount) > 0) && 'upgrade amount', isUpgrade && !upgrade.reason && 'upgrade reason',
    b2b && (!firm.name.trim() || !firm.gst.trim()) && 'GST name / number', collectNeedsRef && 'payment reference', blockedEarly && `arrival date (${fmtDate(row.checkin)})`,
  ].filter(Boolean);
  const ready = missing.length === 0;

  // BUG-489: resolve discount to ₹ — OD-489-01: base = c.booking_charge
  // BUG-496+504: maxPct/maxFlat — GST-on-advance preservation rule (OD-496-01 + OD-504-01 + OD-504-02 Option A)
  // MUST precede roomDiscountRs (roomDiscountRs uses maxFlat as its cap)
  const { maxPct, maxFlat } = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    if (!bc) return { maxPct: 100, maxFlat: bc };
    const gstOnAdv = computeRoomGst(roomGstApplicable, roomGstSlabs, advance, formNights, 1).gstTotal; // BUG-504
    const flat     = Math.max(0, bc - advance - gstOnAdv); // BUG-504
    const pct      = Math.ceil(flat / bc * 100 * 100) / 100; // BUG-510: ceil to 2dp — toFixed(2) rounds DOWN (88.3333%→88.33) causing Math.floor(bc×88.33%/100)=7949≠maxFlat; ceil (88.34) ensures entering maxPct achieves maxFlat
    return { maxPct: pct, maxFlat: flat };
  }, [c.booking_charge, c.advance_payment, roomGstApplicable, roomGstSlabs, formNights]);
  // BUG-496+504: cap = maxFlat (was bc − advance = 8000; now 7950 with GST-on-advance preserved)
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    const bc  = Number(c.booking_charge  || 0);
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(bc * raw / 100), maxFlat); // BUG-504
    }
    return Math.min(Math.floor(raw), maxFlat); // BUG-504
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, maxFlat]); // BUG-504
  const discountOverMax = // BUG-507: extend to Amount mode — flat input > maxFlat also triggers alert
    (ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct) ||
    (ciRoomDiscountType === 'Amount'  && parseFloat(ciRoomDiscountAmt) > maxFlat);
  // BUG-497: collect-now cap and guard
  const collectMax     = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0));
  const collectOverMax = collectAmt > collectMax && collectAmt > 0; // BUG-497
  // BUG-506: gstOnAdvFloor = bc − advance − maxFlat (= gstOnAdv secured by cap; used as guard below)
  // collectMax (L88) deliberately unchanged — backend-compatible (BUG-500/OD-500-04: bp=room−disc−adv)
  const gstOnAdvFloor  = Number(c.booking_charge || 0) - Number(c.advance_payment || 0) - maxFlat;
  // BUG-512: detect when collectMax = gstOnAdv (max discount → zero room balance, pure GST)
  const collectAtMaxGst     = collectMax > 0 && collectMax <= gstOnAdvFloor; // BUG-512
  const collectBlockedAtMax = collectAtMaxGst && collectAmt > 0;             // BUG-512: blocks submit
  // BUG-503+508+511: displayGstTotal useMemo — computeBase conditional on near-max zone
  // Near-max zone (extraRoom < gstOnAdvFloor): subtract gstOnAdvFloor to avoid compound GST on advance.
  // Standard zone (extraRoom >= gstOnAdvFloor): apply GST to full discounted amount.
  // Owner confirmed: ₹7,900 → extraRoom=50, NOT near-max → GST = 5%×1100 = ₹55.
  // At max (₹7,950): extraRoom=0 < 50 → computeBase=1000 ✓. At ₹7,949: extraRoom=1 < 50 → computeBase=1001 ✓.
  const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst, displayGstBase } = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    const gstBase = Math.max(0, bc - roomDiscountRs);
    // BUG-511: near-max zone only — subtract gstOnAdvFloor only when (maxFlat − roomDiscountRs) < gstOnAdvFloor
    const extraRoom   = maxFlat - roomDiscountRs; // BUG-511
    const computeBase = extraRoom < gstOnAdvFloor ? gstBase - gstOnAdvFloor : gstBase; // BUG-511
    return { ...computeRoomGst(roomGstApplicable, roomGstSlabs, computeBase, formNights, 1), displayGstBase: computeBase };
  }, [c.booking_charge, c.advance_payment, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights, gstOnAdvFloor, maxFlat]);
  // BUG-506+508: unified balance = computeBase + recalcGST − advance (correct at all discount levels)
  const displayBalance = displayGstBase + displayGstTotal - Number(c.advance_payment || 0); // BUG-506+508
  // BUG-503: slab rate for live badge display
  const displayGstRate = useMemo(() => {
    const gstBase    = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs);
    const nightlyUnit = gstBase / formNights;
    return roomGstSlabs?.slabs?.find(
      s => nightlyUnit >= (s.min ?? 0) && (s.max == null || nightlyUnit <= s.max)
    )?.gst_percent ?? 0;
  }, [c.booking_charge, roomDiscountRs, roomGstSlabs, formNights]);

  const confirm = async () => {
    if (!ready || busy || collectBlockedAtMax) return;  // BUG-513: block GST collect at max discount
    setBusy(true); setError(null);
    try {
      const res = await checkIn({
        bookingType: row.isOta ? 'Online' : 'Direct', bookingId: row.bookingId, reservationId: row.id, name: row.guestName, phone: row.phone ?? '', email: row.email ?? '',
        restaurantTableId: room.id, idType, frontImage, backImage, adults: row.adults ?? 1, children: row.children ?? 0, extraAdults, checkin: row.checkin, checkout: row.checkout,
        collectNow: collectAmt, paymentMethod: collect.method, note: collect.reference.trim() ? `${collect.method} ref ${collect.reference.trim()}` : '',
        firmName: b2b ? firm.name.trim() : '', firmGst: b2b ? firm.gst.trim() : '',
        upgradeType: isUpgrade ? upgrade.type : 'none', upgradeAmount: upgrade.amount, upgradeReason: upgrade.reason,
        gstTax: displayGstTotal,  // BUG-514: post-discount GST (was missing — frontDeskService hardcoded '0')
        // BUG-489: pass room discount to backend (mirrors CR-407 A-E3)
        ...(roomDiscountRs > 0 ? {
          roomDiscount:       roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor : roomDiscountRs,  // BUG-514: bc−adv at max, unchanged at partial
          roomDiscountType:   ciRoomDiscountType,
          roomDiscountValue:  roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor : roomDiscountRs,  // BUG-514
          roomDiscountReason: '',
        } : {}),
      });
      const roomNo = room.tableNo ?? res?.data?.orders?.[0]?.room_no ?? '';
      onDone(`Checked in — Room ${roomNo}${autoPrint ? ' · receipt print requested' : ''}`, res?.data);
    } catch (e) { setError(errText(e, 'Check-in failed')); }
    finally { setBusy(false); }
  };

  const stop = (e) => e.stopPropagation();
  const RoomOption = ({ r }) => <option value={String(r.id)}>{r.tableNo}{r.title ? ` · ${r.title}` : ''} · {r.roomType}{isHk(r) ? ' · HK' : ''}{r.roomType !== row.roomType ? ' · upgrade' : ''}</option>;

  return (
    <div className="px-5 py-4" data-testid="checkin-form" onClick={stop} onKeyDown={stop}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold">Check in <span className="text-[#767676] font-normal">· {row.guestName} · {row.bookingId}</span></div>
          <div className="text-[12px] text-[#767676] mt-0.5" data-testid="checkin-facts-stay">{channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · {row.adults ?? 0}A{row.children ? ` ${row.children}C` : ''} · {row.roomType ?? '—'}{row.phone ? ` · ${row.phone}` : ''}</div>
        </div>
        <button type="button" data-testid={`fd-row-${row.id}-checkin-close`} onClick={onClose} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
      </div>
      {blockedEarly && <div className="mb-3 text-[12px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-md px-3 py-2" role="alert" data-testid="checkin-early-tooltip">Arrives {fmtDate(row.checkin)} — modify the booking dates to check in today. (Early check-in is off for this property.)</div>}

      <div className="grid grid-cols-[1.3fr_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <Label>Room · {row.roomType} rooms {showUpgrade ? '+ other categories' : ''}</Label>
            <select value={tableId} onChange={(e) => setTableId(e.target.value)} className={inputCls} data-testid="checkin-room-select" disabled={busy}>
              <option value="">Select a room…</option>
              {sameType.map((r) => <RoomOption key={r.id} r={r} />)}
              {otherType.map((r) => <RoomOption key={r.id} r={r} />)}
            </select>
            <label className="mt-2 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={showUpgrade} onChange={(e) => { setShowUpgrade(e.target.checked); if (!e.target.checked && isUpgrade) setTableId(''); }} data-testid="checkin-upgrade-toggle" disabled={busy} /> Show higher categories (upgrade)</label>
            {room && isHk(room) && <div className="mt-2 text-[12px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-md px-3 py-2" data-testid="checkin-room-hk-warning"><span className="font-semibold" data-testid="checkin-room-hk-badge">HK</span>{room.statusSince ? ` · since ${fmtTime(room.statusSince)}` : ''}{room.hkAssignee ? ` · ${room.hkAssignee}` : ''} — Room is still being cleaned. Check-in is allowed.</div>}
            {isUpgrade && (
              <div className="mt-2 border border-[#E5E5E5] rounded-md p-3 space-y-2" data-testid="checkin-upgrade">
                <div className="flex gap-2 text-[12px]">
                  <button type="button" data-testid="checkin-upgrade-paid" aria-pressed={upgrade.type === 'paid'} onClick={() => setUpgrade((u) => ({ ...u, type: 'paid' }))} className={`fd-btn px-3 h-8 rounded-md border font-semibold ${upgrade.type === 'paid' ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>Paid upgrade</button>
                  <button type="button" data-testid="checkin-upgrade-comp" aria-pressed={upgrade.type === 'complimentary'} onClick={() => setUpgrade((u) => ({ ...u, type: 'complimentary' }))} className={`fd-btn px-3 h-8 rounded-md border font-semibold ${upgrade.type === 'complimentary' ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>Complimentary</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {upgrade.type === 'paid' && <label className="block"><Label>Upgrade amount (per stay, pre-GST)</Label><input type="number" min={1} value={upgrade.amount} onChange={(e) => setUpgrade((u) => ({ ...u, amount: e.target.value }))} className={inputCls} data-testid="checkin-upgrade-amount" disabled={busy} /></label>}
                  <label className="block"><Label>Reason</Label>
                    {upgrade.type === 'paid'
                      ? <input value={upgrade.reason} onChange={(e) => setUpgrade((u) => ({ ...u, reason: e.target.value }))} className={inputCls} data-testid="checkin-upgrade-reason" disabled={busy} />
                      : <select value={upgrade.reason} onChange={(e) => setUpgrade((u) => ({ ...u, reason: e.target.value }))} className={inputCls} data-testid="checkin-upgrade-reason" disabled={busy}><option value="">Select…</option>{UPGRADE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>}
                  </label>
                </div>
                <div className="text-[11px] text-[#767676]">The server prices the upgrade and recomputes GST on confirm; a lower category is rejected by the server.</div>
              </div>
            )}
          </div>

          <div data-testid="checkin-id-card-0">
            <GuestDocsSection label="Primary Guest" idType={idType} onIdTypeChange={setIdType} frontImage={frontImage} onFrontChange={setFrontImage} backImage={backImage} onBackChange={setBackImage} inputCls={inputCls} />
          </div>
          {extraAdults.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {extraAdults.map((a, i) => <label key={i} className="block"><Label>Adult {i + 2} name</Label><input value={a.name} onChange={(e) => setExtraAdults((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} data-testid={`checkin-adult-${i + 2}-name`} disabled={busy} /></label>)}
            </div>
          )}
          <div className="border border-[#E5E5E5] rounded-md p-3">
            <label className="flex items-center gap-2 text-[12px] font-semibold"><input type="checkbox" checked={b2b} onChange={(e) => setB2b(e.target.checked)} data-testid="checkin-b2b-toggle" disabled={busy} /> B2B (GST) billing</label>
            {b2b && <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block"><Label>GST customer name</Label><input value={firm.name} onChange={(e) => setFirm((f) => ({ ...f, name: e.target.value }))} className={inputCls} data-testid="checkin-gst-name" disabled={busy} /></label>
              <label className="block"><Label>GSTIN</Label><input value={firm.gst} onChange={(e) => setFirm((f) => ({ ...f, gst: e.target.value }))} className={inputCls} data-testid="checkin-gst-number" disabled={busy} /></label>
            </div>}
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px] flex flex-col" data-testid="checkin-bill">
          <div className="font-semibold text-[#1A1A1A] mb-2">Room bill · from the booking</div>
          <div className="grid grid-cols-2 gap-y-1 tabular-nums">
            <span className="text-[#767676]">{plural(c.nights ?? row.nights ?? 0, 'night')} · rate / night</span><span className="text-right" data-testid="checkin-bill-rate">{fmtINR(c.rate_per_night)}</span>
            <span className="text-[#767676]">Booking charge</span><span className="text-right">{fmtINR(c.booking_charge)}</span>
            {Number(c.upgrade_amount) > 0 && <><span className="text-[#767676]">Room upgrade</span><span className="text-right" data-testid="checkin-bill-upgrade">{fmtINR(c.upgrade_amount)}</span></>}
            {isUpgrade && upgrade.type === 'paid' && <><span className="text-[#767676]">Room upgrade (on confirm)</span><span className="text-right text-[#767676]" data-testid="checkin-bill-upgrade-pending">{Number(upgrade.amount) > 0 ? `${fmtINR(Number(upgrade.amount))} + GST` : '—'}</span></>}
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="checkin-bill-sgst">{fmtINR(c.sgst)}{/* BUG-505: static booking-time value */}</span>
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="checkin-bill-cgst">{fmtINR(c.cgst)}{/* BUG-505: static booking-time value */}</span>
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="checkin-bill-total">{fmtINR(c.total_with_gst)}{/* BUG-505: static booking-time value */}</span>
            <span className="text-[#767676]">Already paid</span><span className="text-right" data-testid="checkin-bill-paid">{fmtINR(c.advance_payment)}</span>
            {/* BUG-506: displayBalance — total_with_gst−adv (no disc) | max(gstOnAdvFloor, bc−disc−adv) (disc) */}
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(displayBalance)}{/* BUG-506 */}</span>
          </div>
          {/* BUG-489: mirror CR-407 A-E4 — check-in room discount */}
          <div className="mt-3">
            <Label>Room Discount (optional)</Label>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden text-[11px]">
                {['Amount', 'Percent'].map(t => (
                  <button
                    key={t} type="button"
                    data-testid={`ci-discount-type-${t.toLowerCase()}`}
                    onClick={() => { setCiRoomDiscountType(t); setCiRoomDiscountAmt(''); setCollect(k => ({ ...k, amount: '' })); }} // BUG-497
                    disabled={busy}
                    className={`px-2 py-1 ${ciRoomDiscountType === t ? 'bg-[#329937] text-white' : 'bg-white text-[#555]'}`}
                  >{t === 'Amount' ? '₹' : '%'}</button>
                ))}
              </div>
              <div className="relative flex-1">
                <span className="absolute left-2 top-2 text-[12px] text-[#888]">
                  {ciRoomDiscountType === 'Amount' ? '₹' : '%'}
                </span>
                <input
                  type="number" min="0"
                  max={ciRoomDiscountType === 'Percent' ? maxPct : maxFlat || undefined}// BUG-504
                  placeholder="0"
                  value={ciRoomDiscountAmt}
                  onChange={e => { setCiRoomDiscountAmt(e.target.value); setCollect(k => ({ ...k, amount: '' })); }} // BUG-497
                  onWheel={e => e.target.blur()}
                  disabled={busy}
                  data-testid="ci-room-discount-input"
                  className="w-full pl-6 pr-2 py-1.5 border border-[#E5E5E5] rounded-md text-[12px]"
                />
              </div>
              {roomDiscountRs > 0 && (
                <span className="text-[11px] text-[#329937] font-medium" data-testid="ci-room-discount-rs">
                  −₹{roomDiscountRs}
                </span>
              )}
            </div>
            {/* BUG-492 Sub-B / BUG-502: alert moved OUTSIDE flex row — prevents input collapse */}
            {discountOverMax && (
              <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="checkin-form-discount-over-max-alert">
                Maximum discount: {maxPct}% (₹{maxFlat.toLocaleString('en-IN')}). Entering above {maxPct}% has no additional effect.{/* BUG-504 */}
              </div>
            )}
          </div>
          {/* BUG-505 Part B: live GST strip — informational only, visible when discount > 0 */}
          {roomGstApplicable && roomGstSlabs && roomDiscountRs > 0 && (
            <div
              data-testid="ci-gst-strip"
              className={`mt-3 rounded-xl border px-4 py-3 flex flex-col gap-1.5 text-[12px] ${displayGstTotal > 0 ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FAFAFA] border-[#E5E5E5]'}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`font-semibold text-[11px] uppercase tracking-wide ${displayGstTotal > 0 ? 'text-[#166534]' : 'text-[#888]'}`}>
                  GST after discount
                </span>
                {displayGstTotal > 0
                  ? <span className="text-[10px] font-bold bg-[#22C55E] text-white px-2 py-0.5 rounded-full">{displayGstRate}% Slab</span>
                  : <span className="text-[10px] font-semibold bg-[#E5E5E5] text-[#888] px-2 py-0.5 rounded-full">Not Applicable</span>
                }
              </div>
              {displayGstTotal > 0 ? (
                <>
                  <div className="flex justify-between text-[#374151]">
                    <span>CGST ({displayGstRate / 2}%)</span>
                    <span>₹{displayCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[#374151]">
                    <span>SGST ({displayGstRate / 2}%)</span>
                    <span>₹{displaySgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#888] italic border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                    <span>Total GST (CGST + SGST)</span>
                    <span className="font-semibold text-[#166534]">₹{displayGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1A1A1A] border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                    <span>Total incl. GST</span>
                    <span className="text-[#15803D] text-[13px]">₹{(displayGstBase + displayGstTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{/* BUG-508 */}</span>
                  </div>
                </>
              ) : (
                <span className="text-[#888] text-[12px]">GST not applicable at this discount level.</span>
              )}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
            <Label>Collect now · optional</Label>
            {/* BUG-512: hint — normal discounts (displayBalance > collectMax); max discount (collectAtMaxGst) */}
            {collectMax > 0 && (displayBalance > collectMax || collectAtMaxGst) && (
              <div className="mb-1 text-[11px] text-[#767676]" data-testid="checkin-collect-room-hint">
                {collectAtMaxGst
                  ? <>Maximum discount applied — GST ({fmtINR(gstOnAdvFloor)}) settled at checkout. Nothing to collect at check-in.</>
                  : <>Room balance: {fmtINR(collectMax)} · GST settled at checkout</>}
              </div>
            )}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <input type="number" min={0} max={collectMax} value={collect.amount} onChange={(e) => setCollect((k) => ({ ...k, amount: e.target.value }))} className={inputCls} data-testid="checkin-collect-amount" disabled={busy} /> {/* BUG-497: max=collectMax */}
              <div className="flex gap-1.5">{METHODS.map(([k, l]) => <button key={k} type="button" data-testid={`checkin-pay-${k.toLowerCase()}`} aria-pressed={collect.method === k} onClick={() => setCollect((x) => ({ ...x, method: k }))} disabled={busy} className={`fd-btn px-2.5 h-9 rounded-md text-[12px] font-semibold border ${collect.method === k ? 'bg-white ring-2 ring-[#1A1A1A] border-transparent' : 'bg-white border-[#E5E5E5]'}`}>{l}</button>)}</div>
            </div>
            {collect.method !== 'Cash' && <input placeholder={collect.method === 'UPI' ? 'UTR · required' : 'Txn ID · required'} value={collect.reference} onChange={(e) => setCollect((k) => ({ ...k, reference: e.target.value }))} className={`${inputCls} mt-2`} data-testid="checkin-pay-ref" disabled={busy} />}
            {collectAmt > 0 && <div className="mt-2 text-[11px] text-[#767676]">Collecting <span className="font-semibold tabular-nums" data-testid="checkin-collect-summary">{fmtINR(collectAmt)} · {collect.method}</span> — the server updates “Paid so far” and the balance after confirm.</div>}
            {(collectOverMax || collectBlockedAtMax) && <div className="mt-1 text-[11px] text-[#B91C1C]" data-testid="checkin-collect-over-max">{collectAtMaxGst ? <>Maximum discount applied. GST ({fmtINR(gstOnAdvFloor)}) is settled at checkout — nothing to collect.</> : <>Collect exceeds room balance ({fmtINR(collectMax)}). GST is settled at checkout.</>}</div>} {/* BUG-497 + BUG-512 */}
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} data-testid="checkin-autoprint" disabled={busy} /> Auto-print check-in receipt <span className="text-[#767676]">· default from Settings: {rules?.autoPrintCheckinReceipt ? 'On' : 'Off'}</span></label>
          <div className="mt-3" data-testid="checkin-progress">
            {ready ? <span className="inline-block px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-[11px] font-semibold" data-testid="checkin-progress-ready">✓ Ready to check in</span>
              : <span className="text-[11px] text-[#92400E]" data-testid="checkin-progress-missing">Missing: {missing.join(', ')}</span>}
          </div>
          {error && <div className="mt-3 text-[#B91C1C]" role="alert" data-testid="checkin-server-error">{error}</div>}
          <div className="mt-auto pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} data-testid="checkin-cancel-btn" className="px-4 h-9 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA] disabled:opacity-40">Cancel</button>
            <button type="button" onClick={confirm} disabled={!ready || busy || discountOverMax || collectOverMax || collectBlockedAtMax} data-testid="checkin-confirm-btn" className="inline-flex items-center gap-1.5 px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Confirm check-in</button> {/* BUG-497 + BUG-512 */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
