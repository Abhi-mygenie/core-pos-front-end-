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

// BUG-519: RoomDiscountControls — moved from RoomSection/Statement to bill-right panel (OD-519-02=a, OD-519-03=a)
const RoomDiscountControls = ({ // BUG-522: removed roomApplyTo, setRoomApplyTo
  c, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason,
  roomDiscountType, setRoomDiscountType,
  roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs,
  maxCheckoutDiscount, baseBalance, roomSplitOverBalance, roomSplitTotal, effectiveRoomBalance, // BUG-525 / BUG-525-FIX
}) => {
  const maxPct = useMemo(() => { // BUG-519: computed internally from maxCheckoutDiscount
    const maxCap = maxCheckoutDiscount ?? baseBalance;
    if (maxCap === null || maxCap <= 0) return 0;
    const bc = Number(c.booking_charge || 0);
    if (!bc) return 0;
    return Math.floor(maxCap / bc * 100);
  }, [maxCheckoutDiscount, baseBalance, c.booking_charge]);
  // BUG-524: extend to Amount mode (mirror CheckInForm BUG-507 pattern)
  const discountOverMax =
    (roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct) ||
    (roomDiscountType === 'Amount'  && Number(roomDiscount) > (maxCheckoutDiscount ?? baseBalance ?? 0));
  return (
    <div>
      {/* CR-405-A + BUG-522: removed apply_to selector; input always visible (independent room discount) */}
      <div className="py-0.5">
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
            {/* BUG-517: max/clamp use maxCheckoutDiscount cap */}
            <input
              type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : ((maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0)) || undefined)}
              placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
              value={roomDiscount || ''}
              onChange={e => setRoomDiscount(Math.max(0, parseFloat(e.target.value) || 0))} // BUG-524: no clamp — alert + handlePaid guard instead (mirror CheckInForm)
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
              {/* BUG-524: mode-aware message */}
              {roomDiscountType === 'Percent'
                ? <>Maximum discount: {maxPct}% (≈ ₹{Math.min(Math.floor(Number(c.booking_charge || 0) * maxPct / 100), maxCheckoutDiscount ?? 0)}) or ₹{maxCheckoutDiscount ?? 0} flat. Reduce to {maxPct}% or switch to Amount mode.</>
                : <>Maximum discount: ₹{maxCheckoutDiscount ?? 0}. Reduce the amount.</>
              }
            </div>
          )}
      </div>
      {/* CR-407 Sub-scope C: split room payment — BUG-519: moved to right (OD-519-03=a) */}
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
        {/* BUG-525: over-balance alert — mirrors discountOverMax alert pattern */}
        {roomSplitOverBalance && (
          <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="bill-room-split-over-balance-alert">
            {/* BUG-525-FIX: directional message — over vs under */}
            {roomSplitTotal > (effectiveRoomBalance ?? 0)
              ? `Split total ₹${roomSplitTotal?.toLocaleString()} exceeds room balance. Reduce leg amounts.`
              : `Split total ₹${roomSplitTotal?.toLocaleString()} is less than room balance ₹${(effectiveRoomBalance ?? 0).toLocaleString()}. Adjust leg amounts to match.`}
          </div>
        )}
      </div>
    </div>
  );
};

// BUG-519: RoomSection simplified to read-only display
const RoomSection = ({ row, checkInDiscountAmt = 0, upgrade, roomDiscountInfoRs = 0,
  baseBalance = null, displaySgst = null, displayCgst = null }) => { // BUG-519: read-only
  const c = row.charge ?? {};
  const [open, setOpen] = useState(true);
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
          {/* BUG-519 OD-519-01: read-only discount line on left when discount applied */}
          {roomDiscountInfoRs > 0 && (
            <Line label="Room discount" value={`−${fmtINR(roomDiscountInfoRs)}`}
              testId="bill-room-discount-applied-left" muted />
          )}
          <Line label="SGST" value={fmtINR(displaySgst ?? c.sgst)} testId="bill-room-sgst" /> {/* BUG-494 Sub-B: GST on discounted price */}
          <Line label="CGST" value={fmtINR(displayCgst ?? c.cgst)} testId="bill-room-cgst" /> {/* BUG-494 Sub-B */}
          <Line label="Already paid" value={fmtINR(c.advance_payment)} testId="bill-room-paid" muted />
          {/* BUG-491 Sub-B + BUG-494 Sub-A: balance uses folio baseBalance (fallback: c.balance_due) */}
          <Line label="Room balance" value={fmtINR(Math.max(0, (baseBalance ?? Number(c.balance_due || 0)) - roomDiscountInfoRs))} testId="bill-room-balance" bold />
        </div>
      )}
    </section>
  );
};

const Statement = ({ row, folio, checkInDiscountAmt = 0,
  roomDiscountInfoRs = 0, baseBalance, displaySgst, displayCgst }) => { // BUG-519: read-only; controls moved to bill-right
  const { upgrade, orders } = splitUpgradeLine(folio?.roomOrders);
  return (
    <div className="text-[12px]">
      <div data-testid="bill-guest">
        <div className="text-[14px] font-semibold">{row.guestName} <span className="text-[#767676] font-normal">· {row.bookingId}</span></div>
        <div className="text-[#767676] mt-0.5">{channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · Room {row.roomNo ?? '—'} · {row.adults ?? 0}A{row.children ? ` ${row.children}C` : ''}{row.phone ? ` · ${maskPhone(row.phone)}` : ''}</div>
      </div>
      <RoomSection row={row} checkInDiscountAmt={checkInDiscountAmt} upgrade={upgrade}
        roomDiscountInfoRs={roomDiscountInfoRs}
        baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
      />{/* BUG-519: read-only RoomSection */}
      <Heading testId="bill-orders-heading">Room orders</Heading>
      {orders.length === 0 ? <div className="text-[#767676]" data-testid="bill-orders-empty">No room-service orders</div>
        : orders.map((o, i) => <Line key={i} label={`${o.name} × ${o.qty}${o.gstPercent ? ` · ${o.taxType === 'VAT' ? 'VAT' : 'GST'} ${o.gstPercent}%` : ''}`} value={fmtINR(o.totalAmount)} testId={`bill-orders-${i}`} />)}{/* BUG-516 */}
      <Heading testId="bill-transferred-heading">Transferred</Heading>
      {(folio?.associatedOrders ?? []).length === 0 ? <div className="text-[#767676]" data-testid="bill-transferred-empty">No dine-in bills posted to this room</div>
        : folio.associatedOrders.map((a, i) => <Line key={a.orderId ?? i} label={`#${a.orderNumber}${a.itemNames?.length ? ` · ${a.itemNames.slice(0, 3).join(', ')}` : ''}`} value={fmtINR(a.amount)} testId={`bill-transferred-${i}`} />)}
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
  // BUG-522: roomApplyTo removed — room discount is always room-only; apply_to set dynamically in handlePaid
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
  const { baseBalance, displaySgst, displayCgst, maxCheckoutDiscount } = useMemo(() => { // BUG-517
    const bp          = order?.roomInfo?.balancePayment ?? null;
    const discountAmt = Number(order?.roomInfo?.discountAmount || 0);
    const bc          = Number(row.charge?.booking_charge || 0);
    const nights      = Number(row.charge?.nights || 1);
    const advance     = Number(row.charge?.advance_payment || 0);                // BUG-517: advance paid so far
    const { roomGstApplicable = false, roomGstSlabs = null } = restaurant?.checkInFlags || {};
    if (bp === null) return { baseBalance: null, displaySgst: null, displayCgst: null, maxCheckoutDiscount: null }; // BUG-517
    const discountedPrice = Math.max(0, bc - discountAmt);
    const gst = (roomGstApplicable && discountedPrice > 0)
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)
      : { gstTotal: 0, sgst: 0, cgst: 0 };
    const base = bp === 0 ? 0 : Math.max(0, bp + gst.gstTotal);
    // BUG-517 OD-517-01: gstRate = GST / (discountedPrice × nights); advance × gstRate = GST on paid advances
    const gstRate = (roomGstApplicable && discountedPrice > 0 && nights > 0)
      ? gst.gstTotal / (discountedPrice * nights) : 0;                          // BUG-517
    const maxCheckout = Math.max(0, base - Math.floor(advance * gstRate));       // BUG-517: bonk: 600 - floor(1500×0.05) = 525
    return {
      baseBalance: base,
      displaySgst: base === 0 ? 0 : gst.sgst,
      displayCgst: base === 0 ? 0 : gst.cgst,
      maxCheckoutDiscount: maxCheckout,                                          // BUG-517
    };
  }, [order?.roomInfo?.balancePayment, order?.roomInfo?.discountAmount,
      row.charge?.booking_charge, row.charge?.nights, row.charge?.advance_payment, // BUG-517 +advance_payment
      restaurant?.checkInFlags]);
  // BUG-498: roomDiscountInfoRs — placed AFTER baseBalance to avoid temporal dead zone (crash fix)
  const roomDiscountInfoRs = useMemo(() => { // BUG-522: room-only; full entered discount (no halving)
    if (!roomDiscount || maxCheckoutDiscount === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
    const bc = Number(row.charge?.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      return bc > 0 ? Math.min(Math.floor(bc * roomDiscount / 100), maxCap) : 0;
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);
  }, [roomDiscount, roomDiscountType, maxCheckoutDiscount, baseBalance, row.charge?.booking_charge]);
  // BUG-498: discountOverMax — placed AFTER baseBalance; replaces BUG-495/492 formula
  const discountOverMax = useMemo(() => { // BUG-517: use maxCheckoutDiscount
    if (roomDiscountType !== 'Percent') return false;
    if (maxCheckoutDiscount === null) return false;
    const bc = Number(row.charge?.booking_charge || 0);
    if (!bc || maxCheckoutDiscount <= 0) return false;
    const maxPctParent = Math.floor(maxCheckoutDiscount / bc * 100);              // BUG-517
    return Number(roomDiscount) > maxPctParent;
  }, [roomDiscount, roomDiscountType, maxCheckoutDiscount, row.charge?.booking_charge]);
  // BUG-525: room split legs over-balance guard
  const roomSplitTotal = useMemo(() =>
    roomSplitEnabled ? roomSplitLegs.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0) : 0,
    [roomSplitEnabled, roomSplitLegs]
  );
  // BUG-525-FIX: also exposed so alert + handlePaid can show directional message
  const effectiveRoomBalance = useMemo(() =>
    Math.max(0, (baseBalance ?? 0) - roomDiscountInfoRs),
    [baseBalance, roomDiscountInfoRs]
  );
  const roomSplitOverBalance = useMemo(() => {
    if (!roomSplitEnabled) return false;
    if (effectiveRoomBalance === 0) return false;
    // BUG-525-FIX: block BOTH over-balance AND under-balance (legs must equal room balance)
    return roomSplitTotal !== effectiveRoomBalance;
  }, [roomSplitEnabled, roomSplitTotal, effectiveRoomBalance]); // BUG-525-FIX
  // BUG-522: foodDiscountRs removed — CPP's collectBillExisting handles F&B discount natively
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
    if (roomSplitOverBalance) { setPayError(roomSplitTotal > effectiveRoomBalance ? 'Split room payment total exceeds the room balance. Reduce the leg amounts.' : 'Split room payment total is less than the room balance. Adjust the leg amounts to match.'); return; } // BUG-525-FIX
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
      if (roomDiscount > 0 && baseBalance !== null) { // BUG-522: removed roomApplyTo guard
        payload.room_discount          = roomDiscountInfoRs; // BUG-522: full room amount (no halving)
        // BUG-522: dynamic apply_to per fe_discount_curls.md:
        //   payload.order_discount set by collectBillExisting from CPP's Discount dropdown
        //   'both' (Curl E) when CPP food discount present; 'room' (Curl C) when room only
        payload.room_discount_apply_to = payload.order_discount > 0 ? 'both' : 'room';
        payload.room_discount_type     = roomDiscountType;
        payload.room_discount_value    = roomDiscount;
        payload.room_discount_reason   = roomDiscountReason || null;
      }
      // BUG-522: food block removed — CPP's collectBillExisting handles F&B discount fully:
      //   payment_amount, order_discount, order_discount_type, discount_value, discount_type
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
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomSplitEnabled, roomSplitLegs, baseBalance, displaySgst, displayCgst, roomDiscountInfoRs, discountOverMax, roomSplitOverBalance, effectiveRoomBalance]); // BUG-498 + BUG-517 + BUG-522 + BUG-525-FIX

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
          {/* BUG-519 E-519-5: bill-left is now read-only summary */}
          <div className="bill-left overflow-auto pr-2" data-testid="bill-left">
            <Statement row={row} folio={state.data.folio}
              checkInDiscountAmt={Number(order?.roomInfo?.discountAmount || 0)}
              roomDiscountInfoRs={roomDiscountInfoRs}
              baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
            />{/* BUG-519: Statement read-only; controls moved to bill-right */}
          </div>
          <div className={`frontdesk-bill bill-right rounded-xl border border-[#E5E5E5]${tabPrefilled(billCustomer(order, row)) ? ' fd-bill-tab-prefilled' : ''}`} data-testid="bill-right"> {/* CR-385 BUG-448 / OD-385-21 */}
            {/* BUG-519 OD-519-02=a: Room discount controls above CollectPaymentPanel */}
            <div className="px-3 pt-3 pb-2 border-b border-[#E5E5E5] text-[12px]" data-testid="bill-room-controls">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#767676] mb-1.5">Room discount</div>
              <RoomDiscountControls
                c={row.charge ?? {}}
                roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
                roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
                roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
                roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
                roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
                maxCheckoutDiscount={maxCheckoutDiscount} baseBalance={baseBalance}
                roomSplitOverBalance={roomSplitOverBalance} roomSplitTotal={roomSplitTotal} effectiveRoomBalance={effectiveRoomBalance} />
            </div>
            {/* BUG-491 Sub-D: room discount info note (OD-491-D-01 Option B — total prop unchanged) */}
            {roomDiscountInfoRs > 0 && (
              <div className="text-[11px] text-[#329937] px-3 pt-2 pb-1 border-b border-[#E5E5E5]" data-testid="bill-room-discount-info">
                Room discount applied: −{fmtINR(roomDiscountInfoRs)}
              </div>
            )}
            {/* BUG-519-FIX: flex-1 min-h-0 ensures CPP fills remaining height after room controls; overflow-hidden lets CPP's internal scroll work */}
            <div className="flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<div className="flex items-center gap-2 p-4 text-[12px] text-[#767676]" data-testid="bill-panel-loading"><Loader2 className="w-4 h-4 animate-spin" /> Loading payment panel…</div>}>
            <CollectPaymentPanel
              cartItems={stampPlacedItems(order.items)}
              total={order.amount || 0}
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
                // BUG-526: when room split legs exactly cover the room balance, pass balance_due=0
                // so CPP's effectiveTotal = food-only and CPP split/cash disabled checks
                // compare against food total (not food+room). CPP display = food-only per OD-INV2-01.
                // !roomSplitOverBalance = legs total equals effectiveRoomBalance (BUG-525-FIX contract).
                balance_due: (roomSplitEnabled && !roomSplitOverBalance && effectiveRoomBalance > 0)
                  ? 0
                  : Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs) // BUG-498
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
        </div>
      )}
      {payError && <div className="mt-2 text-[12px] text-[#B91C1C]" data-testid="bill-pay-error">{payError}</div>}
    </div>
  );
};

export default FolioCheckoutPanel;
