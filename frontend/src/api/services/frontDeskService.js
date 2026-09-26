// CR-385 M0 — Front Desk snapshot service. Money: charge.* only (D50). Dates: meta.business_date only (X-06).
// LR window is ALWAYS sent (C2: 422 without start_date/end_date). Board/KPI failures degrade, LR failure throws (F14, OD-385-11).
import api from '../axios';
import { AIOSELL_ENDPOINTS, API_ENDPOINTS } from '../constants'; // CR-385 M6 API_ENDPOINTS (BILL_PAYMENT)
import { fromRoomStatusBoard } from '../transforms/roomStatusTransform';
import { fromFrontDeskSnapshot } from '../transforms/frontDeskTransform';
import { patchRoomStatus as pmsPatchRoomStatus, bulkMarkClean as pmsBulkMarkClean, cancelReservation as pmsCancelReservation, markNoShowBooking as pmsMarkNoShowBooking, getInHouseGuests, getGuestFolio } from './pmsService'; // CR-385 M2 · M5 getInHouseGuests (D85) · M6 getGuestFolio
import { fromAPI as orderFromAPI } from '../transforms/orderTransform'; // CR-385 M6 (unchanged transform, same as PmsCheckoutDrawer)
import { fromAPI as folioFromAPI } from '../transforms/folioTransform'; // CR-385 M6 (unchanged transform, same as GuestFolioPage)
import { applyGrandTotalRoundOff } from '../../utils/roundOffUtils'; // CR-385 M5 BUG-433: same CR-170 helper as CollectPaymentPanel / orderTransform

export const getLocalReservationsAll = ({ start, end }) =>
  api.get(AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS, { params: { start_date: start, end_date: end, view: 'all' } }).then((r) => r.data);

export const getBoard = () =>
  api.get(AIOSELL_ENDPOINTS.ROOM_STATUS_BOARD).then((r) => fromRoomStatusBoard(r.data));

export const getKpis = ({ start, end }) =>
  api.get(AIOSELL_ENDPOINTS.DASHBOARD_KPIS, { params: { start_date: start, end_date: end } }).then((r) => r.data);

// KPIs: server caps the range at 31 days (422 'Date range cannot exceed 31 days.' — found by QA iteration_5); only today.* is read, so the KPI window is a single day.
export const getSnapshot = async ({ start, end, today }) => {
  const kpiDay = today ?? start;
  const [lr, board, kpis] = await Promise.allSettled([
    getLocalReservationsAll({ start, end }),
    getBoard(),
    getKpis({ start: kpiDay, end: kpiDay }),
  ]);
  if (lr.status === 'rejected') throw lr.reason;
  return fromFrontDeskSnapshot({ lr: lr.value, board, kpis });
};

// Re-exports — pmsService is called, never edited (plan §1.3)
export const patchRoomStatus = (tableId, status) => pmsPatchRoomStatus(tableId, status);
export const bulkMarkClean = (tableIds) => pmsBulkMarkClean(tableIds);

// CR-385 M2 — Cancel / No-Show reuse the existing pmsService calls; Modify PATCHes the LR row directly.
// Body is the INTENT only ({checkin, checkout, rateplan_code, reason} + preview:true for a dry run) — never amount_after_tax (G-02, BQ-385-08).
export const cancelReservation = (reservationId, opts) => pmsCancelReservation(reservationId, opts);
export const markNoShow = (bookingId, channel) => pmsMarkNoShowBooking(bookingId, channel);
export const modifyReservation = (reservationId, body) =>
  api.patch(`${AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS}/${reservationId}`, body).then((r) => r.data);
export const previewModifyReservation = (reservationId, body) => modifyReservation(reservationId, { ...body, preview: true });

// ── CR-385 M1 — New Booking (server-priced, BQ-385-10/16). Payload = INTENT only: never rate_per_night / room_price / amount_after_tax. ──
export { getRatesData } from './pmsService'; // display rates only (grid); pmsService not edited
export const getAvailability = ({ checkin, checkout }) =>
  api.get(AIOSELL_ENDPOINTS.ROOM_AVAILABILITY, { params: { checkin, checkout } }).then((r) => r.data?.data ?? r.data);

export const buildBookingBody = ({ name, phone, checkin, checkout, adults, children, roomCode, rateplanCode, advance }) => {
  const body = {
    guest: { name: name.trim(), phone: phone.trim() },
    checkin, checkout, adults: Number(adults ?? 1), children: Number(children ?? 0),
    rooms: [{ room_code: roomCode, rateplan_code: rateplanCode, rooms_count: 1 }],
  };
  const amt = Number(advance?.amount ?? 0);
  if (amt > 0) body.advance = { amount: amt, method: advance.method, ...(advance.reference?.trim() ? { reference: advance.reference.trim() } : {}) };
  return body;
};

// BQ-385-26: the server answers HTTP 200 {status:true, skipped:true, data:null} for an incomplete body → hard failure, never a success toast
export const reservationOf = (res) => {
  const body = res ?? {};
  if (body.skipped === true || !body.data?.reservation) throw new Error(`Booking not created — ${body.message || 'server returned no reservation'}`);
  return body.data.reservation;
};
export const createBooking = (body) => api.post(AIOSELL_ENDPOINTS.DIRECT_RESERVATION, body).then((r) => reservationOf(r.data));

// ── CR-385 M3 — Check-In. FormData builder COPIED from pmsService.pmsCheckIn (L218–283 @ P2 entry, mirror rule until FU-385-C) + upgrade_* / aiosell_reservation_id.
// Money: room_price/order_amount/gst_tax/balance_payment = 0 → the server prices from the reservation charge (BQ-385-08/09); advance_payment = collect-now only (D17 fixed: server merges booking carry).
const to2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const buildCheckInFormData = (p) => {
  const fd = new FormData();
  fd.append('booking_type', p.bookingType);
  fd.append('booking_id', String(p.bookingId));
  fd.append('aiosell_reservation_id', String(p.reservationId));
  fd.append('name', p.name ?? '');
  fd.append('phone', p.phone ?? '');
  fd.append('email', p.email ?? '');
  if (p.customerId) { fd.append('customer_id', String(p.customerId)); fd.append('cust_membership_id', String(p.customerId)); }
  fd.append('room_id[0]', String(Number(p.restaurantTableId)));
  fd.append('id_type', p.idType || 'Select document type');
  if (p.frontImage) fd.append('front_image_file', p.frontImage);
  if (p.backImage) fd.append('back_image_file', p.backImage);
  fd.append('total_adult', String(Number(p.adults ?? 1)));
  fd.append('total_children', String(Number(p.children ?? 0)));
  fd.append('children_name', p.childrenNames?.length ? p.childrenNames.join(',') : '');
  for (let i = 0; i < 3; i++) {
    const slot = i + 2; const adult = p.extraAdults?.[i];
    fd.append(`name${slot}`, adult?.name ?? ''); fd.append(`id_type${slot}`, adult?.idType ?? '');
    if (adult?.frontImage) fd.append(`front_image_file${slot}`, adult.frontImage);
    if (adult?.backImage) fd.append(`back_image_file${slot}`, adult.backImage);
  }
  fd.append('checkin_date', p.checkin);
  fd.append('checkout_date', p.checkout);
  fd.append('booking_details', '');
  fd.append('booking_for', 'Individual');
  fd.append('order_amount', '0');
  fd.append('room_price', '0');
  fd.append('advance_payment', String(to2(p.collectNow)));
  fd.append('balance_payment', '0');
  fd.append('payment_method', to2(p.collectNow) > 0 ? (p.paymentMethod ?? '') : '');
  fd.append('order_note', p.note ?? '');
  fd.append('gst_tax', '0');
  fd.append('firm_name', p.firmName ?? '');
  fd.append('firm_gst', p.firmGst ?? '');
  fd.append('upgrade_type', p.upgradeType ?? 'none');
  fd.append('upgrade_amount', p.upgradeType === 'paid' ? String(to2(p.upgradeAmount)) : '0');
  fd.append('upgrade_reason', p.upgradeType && p.upgradeType !== 'none' ? (p.upgradeReason ?? '') : '');
  return fd;
};
export const checkIn = (p) =>
  api.post(AIOSELL_ENDPOINTS.LOCAL_CHECKIN, buildCheckInFormData(p), { headers: { 'Content-Type': 'multipart/form-data', 'X-localization': 'en' } }).then((r) => r.data); // explicit multipart (C10, D75)

// ── CR-385 M4 — Extend Stay (BQ-385-14/17/19, OD-385-16 a). Body = INTENT only: never new_room_price / amount_after_tax / rate_per_night.
export const buildExtendBody = ({ orderId, newCheckoutDate, reason, payment, discount, newRestaurantTableId }) => {
  const body = { order_id: Number(orderId), new_checkout_date: newCheckoutDate, reason: (reason ?? '').trim() };
  const pay = Number(payment?.amount ?? 0);
  if (pay > 0) body.payment = { amount: pay, method: payment.method, ...(payment.reference?.trim() ? { reference: payment.reference.trim() } : {}) };
  const disc = Number(discount?.value ?? 0);
  if (disc > 0) body.discount = { type: discount.type, value: disc, reason: (discount.reason ?? '').trim() };
  if (newRestaurantTableId) body.new_restaurant_table_id = Number(newRestaurantTableId);
  return body;
};
export const extendStay = (p) => api.post(AIOSELL_ENDPOINTS.EXTEND_STAY, buildExtendBody(p)).then((r) => r.data);

// ── CR-385 M5 / BUG-433 — row balances. D85 (temporary D50 exception, balance cell only): raw = existing pmsService.getInHouseGuests sum
// (CR-358 pattern, no maths copied); display = the SAME CR-170 helper the Bill / POS panel uses → row == bill grand total by construction (AC-02).
export const roundBalance = (raw, totalRound = true) => {
  const r = Math.round(Number(raw ?? 0) * 100) / 100;
  const display = applyGrandTotalRoundOff(r, totalRound !== false);
  return { raw: r, display, roundOff: Math.round((display - r) * 100) / 100 };
};
export const joinRowBalances = (inHouseRows, { totalRound = true } = {}) =>
  (inHouseRows ?? []).reduce((m, g) => {
    if (!g?.parentOrderId || g.balance == null) return m;
    m[String(g.parentOrderId)] = { ...roundBalance(g.balance, totalRound), room: g.roomBalance ?? null, fnb: g.roomOrdersBalance ?? null, transferred: g.transferredFnbBalance ?? null };
    return m;
  }, {});
export const getRowBalances = async ({ roomGstApplicable = false, totalRound = true } = {}) =>
  joinRowBalances(await getInHouseGuests({ roomGstApplicable }), { totalRound });

// ── CR-385 M6 — Bill / Checkout. One network call per expand (existing getGuestFolio, unchanged) → two existing transforms (no maths copied).
export const getFolio = async (orderId) => {
  const raw = await getGuestFolio(orderId);
  if (!raw) throw new Error('Empty order detail');
  return { raw, order: orderFromAPI.order(raw), folio: folioFromAPI(raw) };
};
// D87: checkout body = unchanged POS collectBillExisting + room_gst_tax passthrough (built by the host, same as PmsCheckoutDrawer L138–161); returns data so the host reads status === 'already_paid' (M6-04)
export const payBill = (payload) => api.post(API_ENDPOINTS.BILL_PAYMENT, payload).then((r) => r.data);
// M6-10: the panel's room figures come from the LR row charge.* (D50) — the drawer's BUG-425 hand formula is NOT copied. gstTax = sgst + cgst is two server fields for one prop the panel requires.
export const roomInfoFromCharge = (roomInfo, charge) => ({
  ...(roomInfo ?? {}),
  roomPrice: Number(charge?.booking_charge ?? 0),
  gstTax: Number(charge?.sgst ?? 0) + Number(charge?.cgst ?? 0),
  advancePayment: Number(charge?.advance_payment ?? 0),
  roomPaymentSummary: { ...(roomInfo?.roomPaymentSummary ?? {}), remainingRoomBalance: Number(charge?.balance_due ?? 0) },
});
// Q3 a: the folio carries the upgrade as an order line "Room upgrade: <reason>" (probes s3/s5/s6) → shown in the ROOM section, excluded from ROOM ORDERS
export const splitUpgradeLine = (roomOrders) => {
  const isUp = (o) => /^room upgrade/i.test(o?.name ?? '');
  const up = (roomOrders ?? []).find(isUp);
  return { upgrade: up ? { reason: (up.name.split(':')[1] ?? '').trim() || null, amount: up.amount } : null, orders: (roomOrders ?? []).filter((o) => !isUp(o)) };
};
