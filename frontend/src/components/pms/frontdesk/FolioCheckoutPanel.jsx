// CR-385 M6 — Bill / Checkout expansion (Layout B, D57). Host for the EXISTING CollectPaymentPanel (room mode) — that file is NOT modified (R15).
// Pay handler + prop mapping copied from components/pms/PmsCheckoutDrawer.jsx L34–48, L113–172, L260–297 @7c2c0bf; the BUG-425 hand-override
// (drawer L271–285) is REPLACED by charge.* (M6-10, roomInfoFromCharge). Checkout body = unchanged POS collectBillExisting + room_gst_tax passthrough (D87).
// LEFT = server statement passed through (no FE subtotals, Q2 a). SGST / CGST two lines = BUG-418. Mirror rule until FU-385-C.
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
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

const RoomSection = ({ row, upgrade }) => { // CR-385 M6 · BUG-418 (two GST lines)
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
          {Number(c.upgrade_amount) > 0 && <Line label={upgrade?.reason ? `Room upgrade: ${upgrade.reason}` : 'Room upgrade'} value={fmtINR(c.upgrade_amount)} testId="bill-room-upgrade" />}
          <div className="flex justify-between py-0.5 text-[#767676]"><span>Room discount</span><button type="button" disabled data-testid="bill-room-discount-btn" title="needs BQ-385-07" className="fd-btn text-[11px] underline disabled:opacity-40 disabled:cursor-not-allowed">Apply…</button></div>
          <Line label="SGST" value={fmtINR(c.sgst)} testId="bill-room-sgst" /> {/* BUG-418: two lines, never merged */}
          <Line label="CGST" value={fmtINR(c.cgst)} testId="bill-room-cgst" />
          <Line label="Already paid" value={fmtINR(c.advance_payment)} testId="bill-room-paid" muted />
          <Line label="Room balance" value={fmtINR(c.balance_due)} testId="bill-room-balance" bold />
        </div>
      )}
    </section>
  );
};

const Statement = ({ row, folio }) => {
  const { upgrade, orders } = splitUpgradeLine(folio?.roomOrders);
  return (
    <div className="text-[12px]">
      <div data-testid="bill-guest">
        <div className="text-[14px] font-semibold">{row.guestName} <span className="text-[#767676] font-normal">· {row.bookingId}</span></div>
        <div className="text-[#767676] mt-0.5">{channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · Room {row.roomNo ?? '—'} · {row.adults ?? 0}A{row.children ? ` ${row.children}C` : ''}{row.phone ? ` · ${maskPhone(row.phone)}` : ''}</div>
      </div>
      <RoomSection row={row} upgrade={upgrade} />
      <Heading testId="bill-orders-heading">Room orders</Heading>
      {orders.length === 0 ? <div className="text-[#767676]" data-testid="bill-orders-empty">No room-service orders</div>
        : orders.map((o, i) => <Line key={i} label={`${o.name} × ${o.qty}${o.gstPercent ? ` · GST ${o.gstPercent}%` : ''}`} value={fmtINR(o.totalAmount)} testId={`bill-orders-${i}`} />)}
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
  const stop = (e) => e.stopPropagation();

  const load = useCallback(async () => {
    setState({ loading: true, error: null, data: null }); // AC-15: per-folio reset
    try { setState({ loading: false, error: null, data: await getFolio(row.orderId) }); }
    catch (err) { setState({ loading: false, error: err?.readableMessage || err?.message || 'Failed to load order', data: null }); }
  }, [row.orderId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { rootRef.current?.scrollIntoView?.({ block: 'nearest' }); }, []); // M6-11

  const order = state.data?.order;
  // copied from PmsCheckoutDrawer.jsx L113–125
  const printBill = useCallback(async () => {
    if (!order) return;
    try { await printOrder(row.orderId, 'bill', null, order.rawOrderDetails ?? order, restaurant?.serviceChargePercentage || 0, {}, restaurant?.printerAgents || []); toast.success('Bill request sent'); }
    catch (err) { toast.error(err?.readableMessage || err?.message || 'Print failed'); }
  }, [order, row.orderId, restaurant]);

  // copied from PmsCheckoutDrawer.jsx L128–172 (D87: host adds nothing but room_gst_tax passthrough, BUG-386) · M6-04 already_paid = success no-op
  const handlePaid = useCallback(async (paymentData) => {
    if (!order || !row.orderId || paying) return;
    setPaying(true); setPayError(null);
    try {
      const payload = orderToAPI.collectBillExisting(buildEffectiveTable(order), stampPlacedItems(order.items), buildCustomer(order), paymentData,
        { autoBill: settings?.autoBill || false, waiterId: user?.employeeId || '', restaurantName: restaurant?.name || '' });
      const roomGstTax = order.roomInfo?.gstTax ?? 0;
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-386 (server value passthrough)
      const data = await payBill(payload);
      if (data?.status === 'already_paid') { toast.info('Already checked out'); await onDone?.(null); return; }
      await onDone?.(`Checked out · Room ${row.roomNo ?? ''}`.trim());
    } catch (err) {
      setPayError(err?.readableMessage ?? err?.response?.data?.message ?? 'Checkout failed');
    } finally { setPaying(false); }
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone]);

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
          <div className="bill-left overflow-auto pr-2" data-testid="bill-left"><Statement row={row} folio={state.data.folio} /></div>
          <div className={`frontdesk-bill bill-right rounded-xl border border-[#E5E5E5]${tabPrefilled(billCustomer(order, row)) ? ' fd-bill-tab-prefilled' : ''}`} data-testid="bill-right"> {/* CR-385 BUG-448 / OD-385-21 */}
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
              roomInfo={roomInfoFromCharge(order.roomInfo, row.charge)}
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
