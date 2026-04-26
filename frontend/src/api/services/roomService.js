// Room Service — Room Check-In API call
// Always uses multipart/form-data.
// Payload shape mirrors the preprod reference curl exactly: every key is always
// appended, with empty-string / "0" / default placeholders when the user hasn't
// provided a value. Flag gating (guest_details / booking_details) is intentionally
// NOT applied at the payload level — the backend receives the full field set on
// every submission.

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/** Normalize a numeric value to a 2-decimal string. */
const to2dp = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

/**
 * Group Room Check-In.
 *
 * @param {Object} params
 * @param {string}   params.name
 * @param {string}   params.phone               — full E.164 string (e.g., "+919876543210")
 * @param {string}   [params.email]
 * @param {Array<number|string>} params.roomIds — one or more selected room IDs
 * @param {string}   [params.idType]            — primary guest ID type
 * @param {File}     [params.frontImage]
 * @param {File}     [params.backImage]
 * @param {Array<{name:string,idType:string,frontImage:File,backImage?:File}>} [params.extraAdults]
 * @param {string[]} [params.childNames]
 * @param {string}   [params.bookingType]       — "WalkIn" | "Online" (default "Individual")
 * @param {string}   [params.bookingFor]        — "Individual" | "Corporate" (default "Individual")
 * @param {string}   [params.checkinDate]       — "YYYY-MM-DD HH:mm:ss"
 * @param {string}   [params.checkoutDate]      — "YYYY-MM-DD HH:mm:ss"
 * @param {number|string} [params.roomPrice]
 * @param {number|string} [params.advancePayment]
 * @param {number|string} [params.balancePayment]
 * @param {string}   [params.paymentMethod]     — BUG-027: "cash" | "card" | "upi" (advance tender)
 * @param {string}   [params.orderNote]
 * @param {string}   [params.firmName]
 * @param {string}   [params.firmGst]
 *
 * @returns {Promise<Object>} response.data from the server
 */
export const checkIn = async (params) => {
  const fd = new FormData();

  const extraAdults = params.extraAdults || [];
  const childNames = (params.childNames || []).filter((n) => n && n.trim());
  const hasPrimaryGuest = !!(params.name && String(params.name).trim());

  // ── Identity ────────────────────────────────────────────────────────────────
  fd.append('name', params.name || '');
  fd.append('phone', params.phone || '');
  fd.append('email', params.email || '');

  // ── Rooms (bracket-indexed) ─────────────────────────────────────────────────
  (params.roomIds || []).forEach((id, i) => {
    fd.append(`room_id[${i}]`, String(id));
  });

  // ── Counts ──────────────────────────────────────────────────────────────────
  fd.append('total_adult', String(hasPrimaryGuest ? 1 + extraAdults.length : 0));
  fd.append('total_children', String(childNames.length));

  // ── Primary ID ──────────────────────────────────────────────────────────────
  fd.append('id_type', params.idType || 'Select document type');
  if (params.frontImage) fd.append('front_image_file', params.frontImage);
  if (params.backImage) fd.append('back_image_file', params.backImage);

  // ── Additional adult slots 2, 3, 4 — always present (reference curl shape) ──
  for (let i = 0; i < 3; i++) {
    const slot = i + 2;
    const row = extraAdults[i];
    fd.append(`name${slot}`, row?.name || '');
    fd.append(`id_type${slot}`, row?.idType || '');
    if (row?.frontImage) fd.append(`front_image_file${slot}`, row.frontImage);
    if (row?.backImage) fd.append(`back_image_file${slot}`, row.backImage);
  }
  // Extra slots 5+ (only when operator actually added more — rare per V2 §11 R1)
  for (let i = 3; i < extraAdults.length; i++) {
    const slot = i + 2;
    const row = extraAdults[i];
    fd.append(`name${slot}`, row?.name || '');
    fd.append(`id_type${slot}`, row?.idType || '');
    if (row?.frontImage) fd.append(`front_image_file${slot}`, row.frontImage);
    if (row?.backImage) fd.append(`back_image_file${slot}`, row.backImage);
  }

  // ── Children (comma-joined, empty string if none) ──────────────────────────
  fd.append('children_name', childNames.length > 0 ? childNames.map((n) => n.trim()).join(',') : '');

  // ── Booking block — always sent ─────────────────────────────────────────────
  fd.append('checkin_date', params.checkinDate || '');
  fd.append('checkout_date', params.checkoutDate || '');
  fd.append('booking_details', '');
  fd.append('booking_type', params.bookingType || 'Individual');
  fd.append('booking_for', params.bookingFor || 'Individual');

  // ── Money — always sent. UI "Room Price" maps to both `room_price` and
  //    `order_amount` per product rule + reference curl shape. ────────────────
  fd.append('room_price', to2dp(params.roomPrice));
  fd.append('order_amount', to2dp(params.roomPrice));
  fd.append('advance_payment', to2dp(params.advancePayment));
  fd.append('balance_payment', to2dp(params.balancePayment));
  // BUG-027: Capture how the advance was tendered (cash / card / upi).
  // Empty string when advance is 0 or operator hasn't picked yet.
  fd.append('payment_method', params.paymentMethod || '');
  fd.append('order_note', params.orderNote || '');

  // ── GST / Firm block — always sent (empty when not Corporate) ──────────────
  fd.append('gst_tax', '0.00');
  fd.append('firm_name', params.firmName || '');
  fd.append('firm_gst', params.firmGst || '');

  const res = await api.post(API_ENDPOINTS.ROOM_CHECK_IN, fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-localization': 'en',
    },
  });
  return res.data;
};
