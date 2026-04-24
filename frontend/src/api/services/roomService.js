// Room Service — Room Module V2 Check-In API call
// Always uses multipart/form-data per V2 §8.3.
// Public export `checkIn` is preserved per V2 §13.3.

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/** Normalize a numeric value to a 2-decimal string per V2 §7.5. */
const to2dp = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

/**
 * V2 Group Room Check-In.
 *
 * @param {Object} params
 * // Always
 * @param {string}   params.name
 * @param {string}   params.phone                — full E.164 string (e.g., "+919876543210")
 * @param {string}   [params.email]
 * @param {Array<number|string>} params.roomIds  — one or more selected room IDs
 *
 * // Profile-flag gating (booleans read from restaurant.checkInFlags)
 * @param {boolean}  params.guestDetailsEnabled
 * @param {boolean}  params.bookingDetailsEnabled
 *
 * // guest_details=Yes
 * @param {string}   [params.idType]             — primary guest ID type (enum per V2 §5.7)
 * @param {File}     [params.frontImage]         — primary guest front (mandatory when enabled)
 * @param {File}     [params.backImage]          — primary guest back (optional)
 * @param {Array<{name:string,idType:string,frontImage:File,backImage?:File}>} [params.extraAdults]
 * @param {string[]} [params.childNames]         — child name rows
 *
 * // booking_details=Yes
 * @param {string}   [params.bookingType]        — "WalkIn" | "Online"
 * @param {string}   [params.bookingFor]         — "Individual" | "Corporate"
 * @param {string}   [params.checkinDate]        — "YYYY-MM-DD HH:mm:ss"
 * @param {string}   [params.checkoutDate]       — "YYYY-MM-DD HH:mm:ss"
 * @param {number|string} [params.roomPrice]
 * @param {number|string} [params.orderAmount]
 * @param {number|string} [params.advancePayment]
 * @param {number|string} [params.balancePayment]
 * @param {string}   [params.orderNote]          — UI "Special Request"
 * @param {string}   [params.firmName]           — GST block
 * @param {string}   [params.firmGst]            — GST block
 *
 * @returns {Promise<Object>} response.data from the server
 */
export const checkIn = async (params) => {
  const fd = new FormData();

  // ── Always sent ────────────────────────────────────────────────────────────
  fd.append('name', params.name);
  fd.append('phone', params.phone);
  if (params.email) fd.append('email', params.email);

  // Bracket-indexed per V2 §5.6
  (params.roomIds || []).forEach((id, i) => {
    fd.append(`room_id[${i}]`, String(id));
  });

  // ── guest_details=Yes ──────────────────────────────────────────────────────
  if (params.guestDetailsEnabled) {
    const extraAdults = params.extraAdults || [];
    const childNames = (params.childNames || []).filter((n) => n && n.trim());

    // Primary adult counts as #1; total_adult = 1 + extra adult rows
    fd.append('total_adult', String(1 + extraAdults.length));
    fd.append('total_children', String(childNames.length));

    if (params.idType) fd.append('id_type', params.idType);
    if (params.frontImage) fd.append('front_image_file', params.frontImage);
    if (params.backImage) fd.append('back_image_file', params.backImage);

    // Extra adult rows: indexed from 2 upward per V2 §4.4
    extraAdults.forEach((row, idx) => {
      const n = idx + 2;
      if (row?.name) fd.append(`name${n}`, row.name);
      if (row?.idType) fd.append(`id_type${n}`, row.idType);
      if (row?.frontImage) fd.append(`front_image_file${n}`, row.frontImage);
      if (row?.backImage) fd.append(`back_image_file${n}`, row.backImage);
    });

    // Children collapsed to comma-joined string per V2 §4.5
    if (childNames.length > 0) {
      fd.append('children_name', childNames.map((n) => n.trim()).join(','));
    }
  }

  // ── booking_details=Yes ────────────────────────────────────────────────────
  if (params.bookingDetailsEnabled) {
    // Booking Type is OPTIONAL — default to "Individual" when operator doesn't pick.
    fd.append('booking_type', params.bookingType || 'Individual');
    if (params.bookingFor) fd.append('booking_for', params.bookingFor);
    if (params.checkinDate) fd.append('checkin_date', params.checkinDate);
    if (params.checkoutDate) fd.append('checkout_date', params.checkoutDate);

    // Single "Room Price" field in UI maps to backend key `order_amount`.
    // Legacy `room_price` key is intentionally NOT sent (backend does not consume it).
    fd.append('order_amount', to2dp(params.roomPrice));
    fd.append('advance_payment', to2dp(params.advancePayment));
    fd.append('balance_payment', to2dp(params.balancePayment));

    if (params.orderNote) fd.append('order_note', params.orderNote);

    // Always send empty string when booking_details flag is Yes per V2 §11 R2.
    fd.append('booking_details', '');

    // GST / Firm block — only present when Corporate + show_user_gst visible.
    if (params.firmName) fd.append('firm_name', params.firmName);
    if (params.firmGst) fd.append('firm_gst', params.firmGst);
  }

  // NOTE: payment_mode, gst_tax, and X-localization are intentionally NEVER sent per V2.
  const res = await api.post(API_ENDPOINTS.ROOM_CHECK_IN, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
