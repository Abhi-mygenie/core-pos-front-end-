// CR-364 — Guest Folio transform (data path only; print = CR-364-PRINT)
// Rules: pass-through money (R6). ONE derived field: nights (date math — not money).
// OD-364-C1: Record Payment PARKED — no payments action here.

const str = (v) => (v == null || v === '' ? null : String(v));
const num = (v) => (v == null || isNaN(Number(v)) ? 0 : Number(v));

/** Guest name priority — mirrors orderTransform.roomInfo.guestName */
const resolveGuestName = (ri, raw, g) => {
  const n3  = str(ri.name3);          if (n3)  return n3;
  const top = str(raw.user_name);     if (top) return top;
  const fn  = [g?.first_name, g?.last_name].filter(Boolean).join(' ').trim();
  if (fn) return fn;
  const bt = (str(ri.booking_type) || '').toLowerCase();
  return bt.includes('walkin') ? 'Walk-in' : null;
};

/** Nights — date arithmetic only; R6 does not apply to date math */
const calcNights = (ci, co) => {
  if (!ci || !co) return null;
  const diff = new Date(co) - new Date(ci);
  return Math.max(Math.round(diff / 86400000), 0) || null;
};

export function fromAPI(raw) {
  if (!raw) return null;

  const ri  = raw.room_info            ?? {};
  const res = ri.reservation           ?? {};
  const rps = ri.room_payment_summary  ?? {};
  const g   = res.guest                ?? {};

  return {
    // IDs
    orderId:     raw.id                       ?? null,
    orderNumber: str(raw.restaurant_order_id) ?? '',

    // Status
    fOrderStatus: raw.f_order_status          ?? null,
    isCheckedOut: Number(raw.f_order_status) === 6,

    // Guest
    guestName: resolveGuestName(ri, raw, g),
    phone:     str(g.phone) ?? null,
    email:     str(g.email) ?? null,

    // Room header
    roomNo:          str(ri.room_no)                         ?? null,
    roomCode:        str(res.room_code || ri.room_type)      ?? null,
    channel:         str(res.channel)                        ?? null,
    pah:             res.pah === true,
    bookingId:       str(res.booking_id)                     ?? null,
    adults:          res.adults  ?? null,
    children:        res.children ?? null,
    specialRequests: str(res.special_requests)               ?? null,

    // Dates
    checkinDate:  str(ri.checkin_date  || res.checkin)  ?? null,
    checkoutDate: str(ri.checkout_date || res.checkout) ?? null,
    checkedInAt:  str(res.checked_in_at)                ?? null,
    checkedOutAt: str(res.checked_out_at)               ?? null,
    nights:       calcNights(ri.checkin_date || res.checkin, ri.checkout_date || res.checkout),

    // Meal plan (OD-364-C4 — BN-364-MEAL: explicit BE field pending; shows '—' until populated)
    mealPlan:    str(res.meal_plan || ri.booking_details?.meal_plan) ?? null,
    ratePlanCode:str(res.rateplan_code)                              ?? null,

    // Room charges — all pass-through, R6
    roomPrice:      num(ri.room_price),
    gstTax:         num(ri.gst_tax),           // Q-364P-05: use room_info.gst_tax
    advancePayment: num(ri.advance_payment),
    receiveBalance: num(ri.receive_balance),
    balancePayment: num(ri.balance_payment),   // includes GST
    paymentStatus:  str(ri.payment_status)     ?? null,
    paymentMode:    str(ri.payment_mode)       ?? null,

    // Live balance (prefer over balancePayment; falls back if payments[] absent)
    remainingRoomBalance: num(rps.remaining_room_balance),

    // Payment history (OD-364-01: totals-only v1)
    payments: (rps.payments || []).map(p => ({
      id:     p.id,
      amount: num(p.payment_amount),
      mode:   str(p.payment_mode) ?? '',
      type:   str(p.payment_type) ?? 'advance',
      paidAt: str(p.paid_at)      ?? '',
    })),

    // F&B posted to room (OD-364-04: drill-down rows; display aggregation only)
    associatedOrders: (raw.associated_order_list || []).map(a => ({
      orderId:     a.id,
      orderNumber: str(a.restaurant_order_id) ?? '',
      amount:      num(a.order_amount),
      itemNames:   Array.isArray(a.item_names) ? a.item_names : [],
      itemCount:   a.item_count ?? null,
      waiterName:  str(a.waiter_name) ?? null,
    })),

    orderNote: str(ri.order_note) ?? null,

    // BUG-424: room-native food items (ordered directly at this room's own table).
    // Source: raw.orderDetails[] — same array used by orderTransform for CollectPaymentPanel.
    // Excludes: check-in marker (name === 'check in') + cancelled items.
    // GST is item-level — shows if food_details.tax > 0, ₹0 otherwise (correct per owner).
    roomOrders: (raw.orderDetails || [])
      .filter(d => {
        if ((d.food_details?.name || '').toLowerCase() === 'check in') return false;
        if (d.food_status === 'cancelled') return false;
        return true;
      })
      .map(d => {
        const fd     = d.food_details || {};
        const qty    = Number(d.quantity)  || 1;
        const unit   = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
        const amt    = Math.round(unit * qty * 100) / 100;
        const gstPct = parseFloat(fd.tax)  || 0;
        const gstAmt = Math.round(amt * gstPct / 100 * 100) / 100;
        return {
          name:       fd.name   || 'Item',
          qty,
          unitPrice:  unit,
          amount:     amt,
          gstPercent: gstPct,
          gstAmount:  gstAmt,
          sgst:       Math.round(gstAmt / 2 * 100) / 100,
          cgst:       Math.round(gstAmt / 2 * 100) / 100,
          orderedAt:  d.created_at || null,
        };
      }),
  };
}
