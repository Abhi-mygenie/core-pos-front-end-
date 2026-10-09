// CR-385 M6 — Bill / Checkout expansion (Layout B, D57). Host for the EXISTING CollectPaymentPanel (room mode) — that file is NOT modified (R15).
// Pay handler + prop mapping copied from components/pms/PmsCheckoutDrawer.jsx L34–48, L113–172, L260–297 @7c2c0bf; the BUG-425 hand-override
// (drawer L271–285) is REPLACED by charge.* (M6-10, roomInfoFromCharge). Checkout body = unchanged POS collectBillExisting + room_gst_tax passthrough (D87).
// LEFT = server statement passed through (no FE subtotals, Q2 a). SGST / CGST two lines = BUG-418. Mirror rule until FU-385-C.
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/axios';
import { API_ENDPOINTS } from '@/api/constants';
import { toAPI as orderToAPI } from '@/api/transforms/orderTransform';
import { printOrder } from '@/api/services/orderService';
import { useRestaurant } from '@/contexts/RestaurantContext'; // direct imports (the contexts barrel pulls NotificationContext → firebase into jest)
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { getFolio, payBill, roomInfoFromCharge, splitUpgradeLine } from '@/api/services/frontDeskService';
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-494: GST on discounted price
import NightsLines from './NightsLines';
import { fmtINR, fmtDate, maskPhone, channelLabel, plural } from './money';

// lazy: the panel pulls the contexts barrel (→ firebase) — loaded only when a Bill is opened (code-split, keeps the row panels' import graph light)
const CollectPaymentPanel = lazy(() => import('@/components/order-entry/CollectPaymentPanel'));

// copied from PmsCheckoutDrawer.jsx L29–48 (identical to the CR-003 helpers)
const stampPlacedItems = (items = []) => items.map((it) => ({ ...it, placed: true }));
const buildEffectiveTable = (t) => ({ orderId: t?.orderId, isRoom: t?.isRoom === true, tableId: t?.tableId || 0, tableNumber: t?.tableNumber || '', tableSection: t?.tableSectionName || '' });
const buildCustomer = (t) => ({ customerName: t?.customerName || t?.customer || '', phone: t?.phone || '', email: '' });
// CR-385 BUG-448 — D47-c: Credit/TAB bills the guest's TAB with the name + phone already on the booking. The panel prefills its TAB block from
// customer.name / customer.phone (10 digits) and disables Checkout while they are empty — the drawer shape {customerName, phone} left them blank.
export const billCustomer = (order, row) => {
  const phone = String(row?.phone || order?.phone || '').replace(/\D/g, '').slice(-10);
  return { ...buildCustomer(order), name: row?.guestName || order?.customerName || '', phone };
};
export const tabPrefilled = (c) => Boolean(c?.name?.trim()) && c.phone.length === 10; // OD-385-21: hide the TAB block only when the prefill satisfies the panel's rule

const Line = ({ label, value, testId, bold, muted }) => (
  <div className={`flex justify-between py-0.5 ${muted ? 'text-[#767676]' : ''}`}><span>{label}</span><span className={`tabular-nums ${bold ? 'font-semibold' : ''}`} data-testid={testId}>{value}</span></div>
);
const Heading = ({ children, testId }) => <div className="text-[10px] uppercase font-semibold text-[#767676] mt-3 mb-1" data-testid={testId}>{children}</div>;

const RoomSection = ({ row, checkInDiscountAmt = 0, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance = null, displaySgst = null, displayCgst = null }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C · BUG-494 · BUG-498
  const c = row.charge ?? {};
  const [open, setOpen] = useState(true);
  // BUG-498: roomDiscountRs — base = folio baseBalance (OD-498-01); fixes stale LR base
  const roomDiscountRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
    }
    return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);
  // BUG-498: maxPct = floor(min(baseBalance, bc) / bc × 100) per OD-498-01/02
  const maxPct = useMemo(() => {
    if (baseBalance === null) return 0;
    const bc = Number(c.booking_charge || 0);
    if (!bc || baseBalance <= 0) return 0;
    return Math.floor(Math.min(baseBalance, bc) / bc * 100);
  }, [baseBalance, c.booking_charge]);
  const discountOverMax = roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct;
  return (
    <section data-testid="bill-room">
      <button type="button" data-testid="bill-room-toggle" onClick={() => setOpen((v) => !v)} className="fd-btn w-full flex justify-between items-center py-1 text-[12px] font-semibold">
        <span>{open ? '▾' : '▸'} Room</span><span className="tabular-nums" data-testid="bill-room-total">{fmtINR(c.total_with_gst)}</span>
      </button>
      {open && (
        <div className="pl-3 text-[12px]">
          <NightsLines charge={c} testId="bill-nights" />
          <Line label="Booking amount" value={fmtINR(c.booking_charge)} testId="bill-room-booking" />
          {checkInDiscountAmt > 0 && (
            <Line label="Check-in discount" value={`−${fmtINR(checkInDiscountAmt)}`} testId="bill-room-checkin-discount" muted />
          )}{/* BUG-498: check-in discount read-only display line */}
          {Number(c.upgrade_amount) > 0 && <Line label={upgrade?.reason ? `Room upgrade: ${upgrade.reason}` : 'Room upgrade'} value={fmtINR(c.upgrade_amount)} testId="bill-room-upgrade" />}
          {/* CR-405-A: room discount at checkout — enabled (BQ-385-07 answered by handover_5 §4.4) */}
          {/* CR-407 Sub-scope B: apply_to selector + Amount/Percent toggle */}
          <div className="py-0.5">
            <div className="flex justify-between text-[#767676] mb-0.5">
              <span>Room discount</span>
              {roomDiscountRs > 0 && <span className="tabular-nums font-medium text-[#329937]" data-testid="bill-room-discount-applied">−{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscountRs : 0)}</span>}
            </div>
            <div className="flex gap-1 mb-0.5">
              {['room', 'both', 'food'].map(v => (
                <button key={v} type="button" data-testid={`bill-apply-to-${v}`}
                  onClick={() => { setRoomApplyTo(v); if (v === 'food') setRoomDiscount(0); }}
                  className={`px-1.5 py-0.5 rounded text-[10px] border ${roomApplyTo === v ? 'bg-[#329937] text-white border-[#329937]' : 'border-[#E5E5E5] text-[#555]'}`}>
                  {v === 'room' ? 'Room' : v === 'both' ? 'Both' : 'F&B only'}
                </button>
              ))}
            </div>
            {roomApplyTo !== 'food' && (
              <>
              <div className="flex gap-1">
                <div className="flex rounded border border-[#E5E5E5] overflow-hidden text-[10px]">
                  {['Amount','Percent'].map(t => (
                    <button key={t} type="button" data-testid={`bill-discount-type-${t.toLowerCase()}`}
                      onClick={() => { setRoomDiscountType(t); setRoomDiscount(0); }}
                      className={`px-1.5 py-0.5 ${roomDiscountType === t ? 'bg-[#329937] text-white' : 'bg-white text-[#555]'}`}>
                      {t === 'Amount' ? '₹' : '%'}
                    </button>
                  ))}
                </div>
                {/* BUG-498: max + onChange clamp use baseBalance (folio bp) not stale LR balance_due */}
                <input
                  type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : (baseBalance ?? Number(c.balance_due || 0)) || undefined}
                  placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
                  value={roomDiscount || ''}
                  onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), roomDiscountType === 'Percent' ? maxPct : (baseBalance ?? Number(c.balance_due || 0))))}
                  className="w-20 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                  data-testid="bill-room-discount-input"
                />
                <input
                  type="text" placeholder="Reason (optional)"
                  value={roomDiscountReason}
                  onChange={e => setRoomDiscountReason(e.target.value)}
                  className="flex-1 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                  data-testid="bill-room-discount-reason"
                />
              </div>
              {/* BUG-492 Sub-B: red alert when % > maxPct */}
              {discountOverMax && (
                <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="bill-discount-over-max-alert">
                  Maximum discount: {maxPct}% (₹{Math.floor((baseBalance ?? 0) * maxPct / 100)}). Entering above {maxPct}% has no additional effect.{/* BUG-498 */}
                </div>
              )}
              </>
            )}
          </div>
          {/* CR-407 Sub-scope C: partial_payments_room — room-rent split */}
          <div className="py-0.5 mt-1">
            <div className="flex items-center justify-between text-[#767676]">
              <span>Split room payment</span>
              <button type="button" data-testid="bill-room-split-toggle"
                onClick={() => setRoomSplitEnabled(v => !v)}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${roomSplitEnabled ? 'bg-[#329937] text-white border-[#329937]' : 'border-[#E5E5E5] text-[#555]'}`}>
                {roomSplitEnabled ? 'On' : 'Off'}
              </button>
            </div>
            {roomSplitEnabled && (
              <div className="mt-1 space-y-1">
                {roomSplitLegs.map((leg, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <select value={leg.mode}
                      onChange={e => setRoomSplitLegs(prev => prev.map((l, j) => j===i ? {...l, mode: e.target.value} : l))}
                      data-testid={`bill-room-split-mode-${i}`}
                      className="h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]">
                      {['cash','upi','card'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="relative flex-1">
                      <span className="absolute left-1.5 top-1 text-[11px] text-[#888]">₹</span>
                      <input type="number" min="0" placeholder="0"
                        value={leg.amount}
                        onChange={e => setRoomSplitLegs(prev => prev.map((l,j) => j===i ? {...l, amount: e.target.value} : l))}
                        data-testid={`bill-room-split-amount-${i}`}
                        className="w-full pl-5 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                      />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setRoomSplitLegs(prev => [...prev, {mode:'cash', amount:''}])}
                  data-testid="bill-room-split-add-leg"
                  className="text-[10px] text-[#329937] mt-0.5">+ Add leg</button>
              </div>
            )}
          </div>
          <Line label="SGST" value={fmtINR(displaySgst ?? c.sgst)} testId="bill-room-sgst" /> {/* BUG-494 Sub-B: GST on discounted price */}
          <Line label="CGST" value={fmtINR(displayCgst ?? c.cgst)} testId="bill-room-cgst" /> {/* BUG-494 Sub-B */}
          <Line label="Already paid" value={fmtINR(c.advance_payment)} testId="bill-room-paid" muted />
          {/* BUG-491 Sub-B + BUG-494 Sub-A: balance uses folio baseBalance (fallback: c.balance_due) */}
          <Line label="Room balance" value={fmtINR(Math.max(0, (baseBalance ?? Number(c.balance_due || 0)) - roomDiscountRs))} testId="bill-room-balance" bold />
        </div>
      )}
    </section>
  );
};

const Statement = ({ row, folio, checkInDiscountAmt = 0, foodDiscountRs = 0, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance, displaySgst, displayCgst }) => { // BUG-498: +checkInDiscountAmt; BUG-499: +foodDiscountRs
  const { upgrade, orders } = splitUpgradeLine(folio?.roomOrders);
  return (
    <div className="text-[12px]">
      <div data-testid="bill-guest">
        <div className="text-[14px] font-semibold">{row.guestName} <span className="text-[#767676] font-normal">· {row.bookingId}</span></div>
        <div className="text-[#767676] mt-0.5">{channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · Room {row.roomNo ?? '—'} · {row.adults ?? 0}A{row.children ? ` ${row.children}C` : ''}{row.phone ? ` · ${maskPhone(row.phone)}` : ''}</div>
      </div>
      <RoomSection row={row} checkInDiscountAmt={checkInDiscountAmt} upgrade={upgrade}
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
        roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
        roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
        roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
        roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
        baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
      />{/* BUG-498: checkInDiscountAmt passed */}
      <Heading testId="bill-orders-heading">Room orders</Heading>
      {orders.length === 0 ? <div className="text-[#767676]" data-testid="bill-orders-empty">No room-service orders</div>
        : orders.map((o, i) => <Line key={i} label={`${o.name} × ${o.qty}${o.gstPercent ? ` · GST ${o.gstPercent}%` : ''}`} value={fmtINR(o.totalAmount)} testId={`bill-orders-${i}`} />)}
      <Heading testId="bill-transferred-heading">Transferred</Heading>
      {(folio?.associatedOrders ?? []).length === 0 ? <div className="text-[#767676]" data-testid="bill-transferred-empty">No dine-in bills posted to this room</div>
        : folio.associatedOrders.map((a, i) => <Line key={a.orderId ?? i} label={`#${a.orderNumber}${a.itemNames?.length ? ` · ${a.itemNames.slice(0, 3).join(', ')}` : ''}`} value={fmtINR(a.amount)} testId={`bill-transferred-${i}`} />)}
      {/* BUG-499: F&B discount preview when Both/food selected (OD-499-02) */}
      {foodDiscountRs > 0 && (
        <div className="text-[11px] text-[#329937] mt-1" data-testid="bill-fnb-discount-preview">
          {roomApplyTo === 'both' ? 'F&B (50% split)' : 'F&B'} discount: −{fmtINR(foodDiscountRs)}
        </div>
      )}
    </div>
  );
};

export const FolioCheckoutPanel = ({ row, meta, onDone, onClose }) => {
  const { restaurant } = useRestaurant();
  const { settings } = useSettings();
  const { user } = useAuth();
  const rootRef = useRef(null);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  // CR-405-A: room discount at checkout (handover_5 §4.4)
  const [roomDiscount, setRoomDiscount] = useState(0);
  const [roomDiscountReason, setRoomDiscountReason] = useState('');
  // CR-407 Sub-scope B: apply_to selector + Percent type
  const [roomDiscountType, setRoomDiscountType] = useState('Amount'); // 'Amount' | 'Percent'
  const [roomApplyTo, setRoomApplyTo]           = useState('room');   // 'room' | 'both' | 'food'
  // CR-407 Sub-scope C: room payment split
  const [roomSplitEnabled, setRoomSplitEnabled] = useState(false);
  const [roomSplitLegs, setRoomSplitLegs]       = useState([{ mode: 'cash', amount: '' }, { mode: 'upi', amount: '' }]);
  const stop = (e) => e.stopPropagation();

  const load = useCallback(async () => {
    setState({ loading: true, error: null, data: null }); // AC-15: per-folio reset
    try { setState({ loading: false, error: null, data: await getFolio(row.orderId) }); }
    catch (err) { setState({ loading: false, error: err?.readableMessage || err?.message || 'Failed to load order', data: null }); }
  }, [row.orderId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { rootRef.current?.scrollIntoView?.({ block: 'nearest' }); }, []); // M6-11

  const order = state.data?.order;
  // BUG-494: folio-based balance + GST on discounted price
  // OD-INV492B-01 Option B: balancePayment=0 → ₹0 (advance covers GST)
  // OD-494-01 Option B: displaySgst/Cgst=0 when baseBalance=0 (mathematical consistency)
  const { baseBalance, displaySgst, displayCgst } = useMemo(() => {
    const bp          = order?.roomInfo?.balancePayment ?? null;
    const discountAmt = Number(order?.roomInfo?.discountAmount || 0);
    const bc          = Number(row.charge?.booking_charge || 0);
    const nights      = Number(row.charge?.nights || 1);
    const { roomGstApplicable = false, roomGstSlabs = null } = restaurant?.checkInFlags || {};
    if (bp === null) return { baseBalance: null, displaySgst: null, displayCgst: null };
    const discountedPrice = Math.max(0, bc - discountAmt);
    const gst = (roomGstApplicable && discountedPrice > 0)
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)
      : { gstTotal: 0, sgst: 0, cgst: 0 };
    const base = bp === 0 ? 0 : Math.max(0, bp + gst.gstTotal);
    return {
      baseBalance: base,
      displaySgst: base === 0 ? 0 : gst.sgst,
      displayCgst: base === 0 ? 0 : gst.cgst,
    };
  }, [order?.roomInfo?.balancePayment, order?.roomInfo?.discountAmount,
      row.charge?.booking_charge, row.charge?.nights, restaurant?.checkInFlags]);
  // BUG-498: roomDiscountInfoRs — placed AFTER baseBalance to avoid temporal dead zone (crash fix)
  const roomDiscountInfoRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
    }
    return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);
  // BUG-498: discountOverMax — placed AFTER baseBalance; replaces BUG-495/492 formula
  const discountOverMax = useMemo(() => {
    if (roomDiscountType !== 'Percent') return false;
    if (baseBalance === null) return false;
    const bc = Number(row.charge?.booking_charge || 0);
    if (!bc || baseBalance <= 0) return false;
    const maxPctParent = Math.floor(Math.min(baseBalance, bc) / bc * 100);
    return Number(roomDiscount) > maxPctParent;
  }, [roomDiscount, roomDiscountType, baseBalance, row.charge?.booking_charge]);
  // BUG-499: foodDiscountRs — F&B half for Both/food (OD-499-01, handover_5 §4.4)
  const foodDiscountRs = useMemo(() => {
    const fnbTotal = order?.amount || 0;
    if (!fnbTotal || !roomDiscount || roomApplyTo === 'room') return 0;
    if (roomApplyTo === 'food') {
      return roomDiscountType === 'Percent'
        ? Math.floor(fnbTotal * roomDiscount / 100)
        : Math.min(Math.floor(Number(roomDiscount)), fnbTotal);
    }
    // 'both': 50/50 split per OD-499-01
    return roomDiscountType === 'Percent'
      ? Math.floor(fnbTotal * (roomDiscount / 2) / 100)
      : Math.floor(Number(roomDiscount) / 2);
  }, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);
  const printBill = useCallback(async () => {
    if (!order) return;
    try { await printOrder(row.orderId, 'bill', null, order.rawOrderDetails ?? order, restaurant?.serviceChargePercentage || 0, {}, restaurant?.printerAgents || []); toast.success('Bill request sent'); }
    catch (err) { toast.error(err?.readableMessage || err?.message || 'Print failed'); }
  }, [order, row.orderId, restaurant]);

  // copied from PmsCheckoutDrawer.jsx L128–172 (D87: host adds nothing but room_gst_tax passthrough, BUG-386) · M6-04 already_paid = success no-op
  const handlePaid = useCallback(async (paymentData) => {
    if (!order || !row.orderId || paying) return;
    // BUG-492 Sub-B: block checkout when % discount exceeds meaningful maximum
    if (discountOverMax) { setPayError('Discount % exceeds the maximum for this booking. Reduce % or switch to Amount mode.'); return; }
    setPaying(true); setPayError(null);
    try {
      const payload = orderToAPI.collectBillExisting(buildEffectiveTable(order), stampPlacedItems(order.items), buildCustomer(order), paymentData,
        { autoBill: settings?.autoBill || false, waiterId: user?.employeeId || '', restaurantName: restaurant?.name || '' });
      // BUG-498: room_gst_tax = displaySgst+displayCgst (GST on discounted price, from BUG-494 useMemo)
      const roomGstTax = (displaySgst !== null && displayCgst !== null)
        ? Number(displaySgst) + Number(displayCgst)
        : (order.roomInfo?.gstTax ?? 0);
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-498
      // BUG-498 + BUG-499: room + food discount — correct base (OD-498-01) + Both split (OD-499-01)
      if (roomDiscount > 0 && roomApplyTo !== 'food' && baseBalance !== null) {
        // BUG-498: room half = baseBalance-based; for Both = floor(baseBalance × pct/2%)
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.floor(baseBalance * (roomDiscount / 2) / 100)
              : Math.floor(Number(roomDiscount) / 2))
          : roomDiscountInfoRs; // 'room' only — full roomDiscountInfoRs (correct base)
        payload.room_discount          = roomHalfRs;
        payload.room_discount_apply_to = roomApplyTo;
        payload.room_discount_type     = roomDiscountType;
        payload.room_discount_value    = roomDiscount;
        payload.room_discount_reason   = roomDiscountReason || null;
      }
      // BUG-499: food half — deduct from F&B payment_amount for Both + F&B-only (OD-499-01)
      if (foodDiscountRs > 0) {
        payload.payment_amount = Math.max(0, (payload.payment_amount || 0) - foodDiscountRs);
        payload.grant_amount   = payload.payment_amount;
        payload.order_amount   = payload.payment_amount;
        payload.order_discount      = foodDiscountRs;
        payload.order_discount_type = roomDiscountType;
      }
      // CR-407 Sub-scope C: partial_payments_room — room-rent split legs
      if (roomSplitEnabled) {
        const positiveLegs = roomSplitLegs.filter(l => parseFloat(l.amount) > 0);
        if (positiveLegs.length > 0) {
          payload.partial_payments_room = positiveLegs.map(l => ({
            payment_mode:   l.mode,
            payment_amount: parseFloat(l.amount),
          }));
        }
      }
      const data = await payBill(payload);
      if (data?.status === 'already_paid') { toast.info('Already checked out'); await onDone?.(null); return; }
      await onDone?.(`Checked out · Room ${row.roomNo ?? ''}`.trim());
    } catch (err) {
      setPayError(err?.readableMessage ?? err?.response?.data?.message ?? 'Checkout failed');
    } finally { setPaying(false); }
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo, roomSplitEnabled, roomSplitLegs, baseBalance, displaySgst, displayCgst, foodDiscountRs, roomDiscountInfoRs, discountOverMax]); // BUG-498 + BUG-499

  return (
    <div ref={rootRef} className="px-5 py-4" data-testid={`bill-panel-${row.id}`} onClick={stop} onKeyDown={stop}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[14px] font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>Bill · Room {row.roomNo ?? '—'}</div>
        <div className="flex gap-2">
          <button type="button" disabled data-testid="bill-print-folio-btn" title="Print Folio arrives with CR-364-PRINT" className="fd-btn px-2.5 h-7 rounded-md text-[12px] border border-[#E5E5E5] disabled:opacity-40 disabled:cursor-not-allowed">Print Folio</button>
          <button type="button" data-testid="bill-close-btn" onClick={onClose} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
        </div>
      </div>
      {state.loading && <div className="flex items-center gap-2 py-10 text-[#767676] text-[12px]" data-testid="bill-loading"><Loader2 className="w-4 h-4 animate-spin" /> Loading folio…</div>}
      {!state.loading && state.error && (
        <div className="py-6 text-center text-[12px]" data-testid="bill-error"><AlertTriangle className="w-5 h-5 text-amber-500 inline mr-1" />{state.error}
          <div><button type="button" data-testid="bill-retry-btn" onClick={load} className="fd-btn mt-2 px-3 h-7 rounded-md border border-[#E5E5E5] text-[12px]">Retry</button></div></div>
      )}
      {!state.loading && !state.error && order && order.isRoom !== true && <div className="py-6 text-center text-[12px] text-[#B91C1C]" data-testid="bill-error">This order is not a room order</div>}
      {!state.loading && !state.error && order && order.isRoom === true && (
        <div className="fd-bill-grid gap-4">
          <div className="bill-left overflow-auto pr-2" data-testid="bill-left">
            <Statement row={row} folio={state.data.folio}
              checkInDiscountAmt={Number(order?.roomInfo?.discountAmount || 0)}
              foodDiscountRs={foodDiscountRs}
              roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
              roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
              roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
              roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
              roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
              roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
              baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
            />{/* BUG-498: checkInDiscountAmt; BUG-499: foodDiscountRs */}
          </div>
          <div className={`frontdesk-bill bill-right rounded-xl border border-[#E5E5E5]${tabPrefilled(billCustomer(order, row)) ? ' fd-bill-tab-prefilled' : ''}`} data-testid="bill-right"> {/* CR-385 BUG-448 / OD-385-21 */}
            {/* BUG-491 Sub-D: room discount info note (OD-491-D-01 Option B — total prop unchanged) */}
            {roomDiscountInfoRs > 0 && (
              <div className="text-[11px] text-[#329937] px-3 pt-2 pb-1 border-b border-[#E5E5E5]" data-testid="bill-room-discount-info">
                Room discount applied: −{fmtINR(roomDiscountInfoRs)}
              </div>
            )}
            <Suspense fallback={<div className="flex items-center gap-2 p-4 text-[12px] text-[#767676]" data-testid="bill-panel-loading"><Loader2 className="w-4 h-4 animate-spin" /> Loading payment panel…</div>}>
            <CollectPaymentPanel
              cartItems={stampPlacedItems(order.items)}
              total={Math.max(0, (order.amount || 0) - (roomApplyTo !== 'room' ? foodDiscountRs : 0))}
              onBack={() => !paying && onClose?.()}
              onPaymentComplete={handlePaid}
              onPrintBill={printBill}
              onOpenSplitBill={null}
              onToggleComplimentary={null}
              customer={billCustomer(order, row)} // CR-385 BUG-448
              isRoom={true}
              associatedOrders={order.associatedOrders || []}
              roomInfo={roomInfoFromCharge(order.roomInfo, { // BUG-494 Sub-C: folio-based balance
                ...row.charge,
                balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs) // BUG-498: roomDiscountInfoRs now baseBalance-based
              })}
              orderFinancials={{ subtotalBeforeTax: order.subtotalBeforeTax || 0, subtotalAmount: order.subtotalAmount || 0, serviceTax: order.serviceTax || 0, tipAmount: order.tipAmount || 0 }}
              hasPlacedItems={true}
              isProcessingPayment={paying}
              orderType={order.orderType || 'dineIn'}
              orderNumber={order.orderNumber || ''}
            />
            </Suspense>
          </div>
        </div>
      )}
      {payError && <div className="mt-2 text-[12px] text-[#B91C1C]" data-testid="bill-pay-error">{payError}</div>}
    </div>
  );
};

export default FolioCheckoutPanel;
