// CR-364 — Guest Folio Detail Page
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User, FileText, Utensils, CreditCard, Clock, AlertTriangle, BellRing } from 'lucide-react';
import { getGuestFolio } from '../../api/services/pmsService';
import { fromAPI } from '../../api/transforms/folioTransform';
import PmsCheckoutDrawer from '../../components/pms/PmsCheckoutDrawer';

// ── Formatters ──────────────────────────────────────────────────────────────
const fmtINR  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(s).slice(0, 10); }
};
const fmtTime = (s) => (s ? String(s).slice(11, 16) : null);

// ── Badge ────────────────────────────────────────────────────────────────────
const Badge = ({ label, style = 'orange' }) => {
  const styles = {
    orange: 'bg-[#FFF4F0] text-[#F26B33] border-[#F26B33]/25',
    green:  'bg-[#F0F9F0] text-[#329937] border-[#329937]/25',
    amber:  'bg-[#FFFBEB] text-[#D97706] border-[#F4A11A]/30',
    gray:   'bg-[#F5F5F5] text-[#888]    border-[#E5E5E5]',
    blue:   'bg-[#EFF6FF] text-[#2563EB] border-[#93C5FD]/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[style] || styles.gray}`}>
      {label}
    </span>
  );
};

// ── Card shell ───────────────────────────────────────────────────────────────
const Card = ({ icon: Icon, accent = '#F26B33', title, badge, children, testId }) => (
  <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-sm overflow-hidden" data-testid={testId}>
    <div className="px-4 py-3 border-b border-[#F5F5F5] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-[3px] h-4 rounded-sm flex-shrink-0" style={{ background: accent }} />
        {Icon && <Icon className="w-3.5 h-3.5 text-[#888]" />}
        <span className="text-sm font-semibold text-[#1A1A1A]">{title}</span>
      </div>
      {badge}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ── Meta grid item ───────────────────────────────────────────────────────────
const Meta = ({ label, value }) => (
  <div>
    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-0.5">{label}</div>
    <div className={`text-[12px] font-medium ${value ? 'text-[#1A1A1A]' : 'text-[#ccc] italic'}`}>{value || '—'}</div>
  </div>
);

// ── Fin row ──────────────────────────────────────────────────────────────────
const FinRow = ({ label, value, bold }) => (
  <div className="flex justify-between items-center py-2 border-b border-[#F5F5F5] last:border-0">
    <span className="text-[11px] text-[#555]">{label}</span>
    <span className={`text-[12px] ${bold ? 'font-bold' : 'font-semibold'}`}>{value}</span>
  </div>
);

// ── Payment mode badge ────────────────────────────────────────────────────────
const ModeBadge = ({ mode }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F0F9F0] text-[#329937] border border-[#329937]/20">
    {mode || '—'}
  </span>
);

// BUG-424: expandable row for room-native order items (OD-424-01: expand inline)
const RoomOrderRow = ({ item, idx }) => {
  const [expanded, setExpanded] = React.useState(false);
  const date = item.orderedAt
    ? new Date(item.orderedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : '—';
  return (
    <>
      <tr
        data-testid={`room-order-row-${idx}`}
        onClick={() => setExpanded(e => !e)}
        className={`border-b border-[#F5F5F5] last:border-0 cursor-pointer
          ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-[#FFF8F5]`}
      >
        <td className="px-3 py-2 text-[#888]">{date}</td>
        <td className="px-3 py-2 font-medium capitalize">{item.name}</td>
        <td className="px-3 py-2">{item.qty}</td>
        <td className="px-3 py-2">{fmtINR(item.unitPrice)}</td>
        <td className="px-3 py-2 text-right font-semibold">{fmtINR(item.amount)}</td>
      </tr>
      {expanded && item.gstPercent > 0 && (
        <tr className="bg-[#FFFBEB]">
          <td colSpan={5} className="px-4 py-1.5 text-[10px] text-[#888] space-y-0.5">
            <div className="flex justify-between">
              <span>SGST ({item.gstPercent / 2}%)</span><span>{fmtINR(item.sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST ({item.gstPercent / 2}%)</span><span>{fmtINR(item.cgst)}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function GuestFolioPage() { // CR-364
  const { orderId } = useParams();
  const navigate    = useNavigate();

  const [folio,           setFolio]           = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [isCheckoutOpen,  setIsCheckoutOpen]  = useState(false);

  const load = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getGuestFolio(id);
      setFolio(fromAPI(raw));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load folio. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (orderId) load(orderId); }, [orderId, load]);

  // F&B display aggregation — labeled clearly, NOT used in any financial formula (R6)
  const fnbTotal = folio?.associatedOrders?.reduce((s, a) => s + a.amount, 0) ?? 0;

  // BUG-423: compute room balance fresh from constituent fields (OD-423-01).
  // Formula: room_price + gst_tax - advance_paid - amount_received
  // Ignores stored balance_payment — may be stale or exclude GST for old-modal check-ins.
  // R6 note: display formula only; no financial value sent to backend here.
  const roomBalance = folio
    ? Math.max(0,
        (folio.roomPrice      ?? 0) +
        (folio.gstTax         ?? 0) -
        (folio.advancePayment ?? 0) -
        (folio.receiveBalance ?? 0)
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-5" style={{ fontFamily: "'Poppins','Inter',sans-serif" }}
      data-testid="guest-folio-container">

      {/* Back + page title */}
      <button onClick={() => navigate(-1)} data-testid="folio-back-btn"
        className="flex items-center gap-1.5 text-[11px] font-medium text-[#888] hover:text-[#F26B33] mb-4 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* ── Header card ── */}
      {!loading && folio && (
        <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]" data-testid="guest-name">
                {folio.guestName ?? 'Guest'}
              </h1>
              <p className="text-[11px] text-[#888] mt-0.5">
                Order #{folio.orderNumber}{folio.nights ? ` · ${folio.nights}N` : ''}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {folio.channel && (
                  <Badge label={folio.channel} style="blue" data-testid="channel-badge" />
                )}
                {folio.pah && <Badge label="Pay at Hotel" style="amber" />}
                {folio.isCheckedOut
                  ? <Badge label="Checked Out" style="gray" data-testid="departed-guest-indicator" />
                  : <Badge label="In-House" style="green" />}
                {folio.roomNo && (
                  <Badge label={`${folio.roomCode ?? 'Room'} · ${folio.roomNo}`} style="orange" data-testid="room-number-badge" />
                )}
              </div>
            </div>
            <div className="text-right text-[11px] space-y-1">
              {folio.checkedInAt && (
                <div><span className="text-[#888]">Checked in </span>
                  <strong>{fmtDate(folio.checkinDate)} · {fmtTime(folio.checkedInAt)}</strong>
                </div>
              )}
              <div>
                <span className="text-[#888]">Expected checkout </span>
                <strong className={folio.isCheckedOut ? 'text-[#888]' : 'text-[#D97706]'}>
                  {fmtDate(folio.checkoutDate)}
                </strong>
              </div>
              <div className="text-[#888]">
                {folio.adults != null ? `${folio.adults} adult${folio.adults !== 1 ? 's' : ''}` : ''}
                {folio.children ? ` · ${folio.children} children` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[#FEE2E2] border border-[#EF4444]/30 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            <span className="text-[12px] text-[#D32F2F]">{error}</span>
          </div>
          <button onClick={() => load(orderId)} className="text-[11px] font-semibold text-[#EF4444] underline">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white border border-[#E5E5E5] rounded-lg animate-pulse" />)}
          </div>
          <div className="lg:col-span-5 space-y-3">
            {[1,2].map(i => <div key={i} className="h-28 bg-white border border-[#E5E5E5] rounded-lg animate-pulse" />)}
          </div>
        </div>
      )}

      {/* ── Main dual-column grid (Option Set C) ── */}
      {!loading && folio && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-7 flex flex-col gap-4">

            {/* Guest & Stay Details */}
            <Card icon={User} title="Guest & Stay Details" testId="section-guest-details">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-3">
                <Meta label="Guest Name"       value={folio.guestName} />
                <Meta label="Phone"            value={folio.phone ? folio.phone.replace(/(\d{5})(\d{5})/, '$1 *****') : null} />
                <Meta label="Booking ID"       value={folio.bookingId} />
                <Meta label="Room Type"        value={folio.roomCode} />
                <Meta label="Check-in"         value={fmtDate(folio.checkinDate)} />
                <Meta label="Check-out"        value={fmtDate(folio.checkoutDate)} />
                <Meta label="Nights"           value={folio.nights} />
                <Meta label="Adults / Children" value={folio.adults != null ? `${folio.adults} / ${folio.children ?? 0}` : null} />
                <Meta label="Meal Plan"        value={folio.mealPlan} />
                <Meta label="Rate Plan"        value={folio.ratePlanCode} />
              </div>
              {folio.specialRequests && (
                <div className="bg-[#FFF4F0] border border-[#F26B33]/20 rounded-lg px-3 py-2 text-[11px] text-[#F26B33] italic">
                  Special requests: {folio.specialRequests}
                </div>
              )}
              {folio.orderNote && (
                <div className="mt-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[11px] text-[#888]">
                  Note: {folio.orderNote}
                </div>
              )}
            </Card>

            {/* Payments Received */}
            <Card icon={CreditCard} accent="#329937" title="Payments Received"
              badge={<span className="text-[10px] text-[#888] bg-[#FAFAFA] border border-[#E5E5E5] px-2 py-0.5 rounded-full">
                {folio.payments.length} payment{folio.payments.length !== 1 ? 's' : ''}
              </span>}
              testId="section-payments">
              {folio.payments.length === 0 ? (
                <p className="text-[11px] text-[#888] text-center py-3">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {folio.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0">
                      <div className="flex items-center gap-2">
                        <ModeBadge mode={p.mode} />
                        <span className="text-[11px] text-[#888] capitalize">{p.type}</span>
                        {p.paidAt && <span className="text-[10px] text-[#ccc]">{String(p.paidAt).slice(0, 10)}</span>}
                      </div>
                      <span className="text-[12px] font-semibold text-[#329937]">{fmtINR(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* F&B Posted to Room */}
            <Card icon={Utensils} accent="#D97706" title="F&B Posted to Room" testId="section-fnb">
              {folio.associatedOrders.length === 0 ? (
                <p className="text-[11px] text-[#888] text-center py-3">No F&B orders posted to this room.</p>
              ) : (
                <>
                  <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                          <th className="px-3 py-2 text-left text-[9px] font-semibold text-[#888] uppercase tracking-wide">Order #</th>
                          <th className="px-3 py-2 text-left text-[9px] font-semibold text-[#888] uppercase tracking-wide">Items</th>
                          <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#888] uppercase tracking-wide">Amount</th>
                          <th className="px-3 py-2 w-6" />
                        </tr>
                      </thead>
                      <tbody>
                        {folio.associatedOrders.map((a, i) => (
                          <tr key={i} data-testid={`fb-order-row-${a.orderId}`}
                            className={`border-b border-[#F5F5F5] last:border-0 cursor-pointer ${i%2===0?'bg-white':'bg-[#FAFAFA]'} hover:bg-[#FFF8F5]`}>
                            <td className="px-3 py-2 font-medium">{a.orderNumber || `#${a.orderId}`}</td>
                            <td className="px-3 py-2 text-[#888]">
                              {a.itemNames?.slice(0, 2).join(', ') || `${a.itemCount ?? '—'} items`}
                              {a.itemNames?.length > 2 && '…'}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">{fmtINR(a.amount)}</td>
                            <td className="px-3 py-2 text-[#ccc]">›</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-1">
                    <span className="text-[10px] text-[#888]">Tap a row to view order details</span>
                    <span className="text-[11px] font-semibold text-[#D97706]">
                      F&B Posted Total: {fmtINR(fnbTotal)}
                    </span>
                  </div>
                </>
              )}
            </Card>

            {/* BUG-424: Room Orders — items ordered directly at this room's own table */}
            <Card icon={BellRing} accent="#D97706" title="Room Orders" testId="section-room-orders">
              {(!folio.roomOrders || folio.roomOrders.length === 0) ? (
                <p className="text-[11px] text-[#888] text-center py-3">No room orders for this stay.</p>
              ) : (
                <>
                  <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                          {['Date', 'Item', 'Qty', 'Rate', 'Amount'].map(h => (
                            <th key={h} className={`px-3 py-2 text-[9px] font-semibold text-[#888] uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {folio.roomOrders.map((item, i) => (
                          <RoomOrderRow key={i} item={item} idx={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-1">
                    <span className="text-[10px] text-[#888]">Tap a row to see GST breakdown</span>
                    <span className="text-[11px] font-semibold text-[#D97706]">
                      Room Orders Total: {fmtINR(folio.roomOrders.reduce((s, r) => s + r.amount, 0))}
                    </span>
                  </div>
                </>
              )}
            </Card>

          </div>{/* /LEFT */}

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-5 flex flex-col gap-4">

            {/* Room Charges */}
            <Card icon={FileText} title="Room Charges" testId="section-charges">
              <FinRow label="Room Price"      value={<span data-testid="room-price-display">{fmtINR(folio.roomPrice)}</span>} />
              <FinRow label="Lodging GST"     value={<span data-testid="lodging-gst-display">{fmtINR(folio.gstTax)}</span>} />
              <FinRow label="Advance Paid"    value={<span data-testid="advance-paid-display">{fmtINR(folio.advancePayment)}</span>} />
              <FinRow label="Amount Received" value={<span data-testid="amount-received-display">{fmtINR(folio.receiveBalance)}</span>} />

              {/* Split balance breakdown */}
              <div className="mt-3 pt-3 border-t-2 border-dashed border-[#E5E5E5]">
                <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-2">Balance Breakdown</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-[#FFF4F0] border border-[#F26B33]/20 rounded-lg p-3 text-center">
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-1">Room Balance</div>
                    <div className="text-[15px] font-bold text-[#EF4444]" data-testid="room-balance-display">
                      {fmtINR(roomBalance)}
                    </div>
                  </div>
                  <div className="bg-[#FFFBEB] border border-[#F4A11A]/25 rounded-lg p-3 text-center">
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-1">F&B Posted</div>
                    <div className={`text-[15px] font-bold ${fnbTotal > 0 ? 'text-[#D97706]' : 'text-[#ccc]'}`}
                      data-testid="fb-balance-display">
                      {fmtINR(fnbTotal)}
                    </div>
                  </div>
                </div>
                <div className="bg-[#FFF4F0] border border-[#F26B33]/25 rounded-lg px-3 py-2.5 flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-[#F26B33]">Total Balance Due</span>
                  <span className="text-[16px] font-bold text-[#F26B33]" data-testid="total-balance-due-display">
                    {fmtINR(roomBalance + fnbTotal)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Actions — hidden for departed guests (OD-364-C3) */}
            {!folio.isCheckedOut && (
              <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 space-y-2.5" data-testid="section-actions">
                <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-1">Actions</div>

                {/* Check Out */}
                <button onClick={() => setIsCheckoutOpen(true)}
                  data-testid="action-checkout-button"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#329937] hover:bg-[#2B8230] text-white text-[12px] font-semibold rounded-lg transition-colors">
                  Check Out
                </button>

                {/* Print Folio — disabled v1 (CR-364-PRINT) */}
                <div className="relative group">
                  <button disabled data-testid="action-print-folio-button"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F5F5F5] text-[#aaa] text-[12px] font-medium rounded-lg cursor-not-allowed border border-[#E5E5E5]">
                    <FileText className="w-3.5 h-3.5" /> Print Folio
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#1A1A1A] text-white text-[10px] px-2.5 py-1 rounded whitespace-nowrap z-10">
                    Print folio — coming soon
                  </div>
                </div>

                {/* Record Payment — PARKED per OD-364-C1 */}
                <p className="text-[10px] text-center text-[#ccc] italic">
                  Record Payment — mid-stay payments currently disabled
                </p>
              </div>
            )}

          </div>{/* /RIGHT */}
        </div>
      )}

      {/* PmsCheckoutDrawer */}
      {folio && (
        <PmsCheckoutDrawer
          open={isCheckoutOpen}
          orderId={folio.orderId}
          roomNo={folio.roomNo}
          guestName={folio.guestName}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => { setIsCheckoutOpen(false); navigate(-1); }}
        />
      )}
    </div>
  );
}
