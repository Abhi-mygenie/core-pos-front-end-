// Room Service — Room check-in API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Check in guest(s) to one or more rooms.
 * Uses JSON body when no images attached; multipart/form-data when images are present.
 *
 * @param {Object} params
 * @param {string} params.name           — Guest name (required)
 * @param {string} params.phone          — Guest phone (required)
 * @param {string} [params.email]
 * @param {number[]} params.roomIds      — Array of room IDs (at least one)
 * @param {string} [params.bookingType]  — e.g. "WalkIn"
 * @param {string} [params.bookingFor]   — e.g. "personal"
 * @param {number} [params.orderAmount]
 * @param {number} [params.advancePayment]
 * @param {number} [params.balancePayment]
 * @param {string} [params.paymentMode]  — e.g. "cash"
 * @param {string} [params.orderNote]
 * @param {number} [params.totalAdult]
 * @param {number} [params.totalChildren]
 * @param {string} [params.idType]       — e.g. "Aadhaar"
 * @param {string} [params.checkinDate]  — YYYY-MM-DD
 * @param {string} [params.checkoutDate] — YYYY-MM-DD
 * @param {File}   [params.frontImage]
 * @param {File}   [params.backImage]
 * @returns {Promise<Object>} API response data
 */
export const checkIn = async (params) => {
  const hasImages = params.frontImage || params.backImage;

  if (hasImages) {
    // Multipart form-data mode
    const fd = new FormData();
    fd.append('phone', params.phone);
    fd.append('name', params.name);
    if (params.email) fd.append('email', params.email);
    params.roomIds.forEach(id => fd.append('room_id[]', id));
    fd.append('booking_type', params.bookingType || 'WalkIn');
    fd.append('booking_for', params.bookingFor || 'personal');
    fd.append('order_amount', params.orderAmount ?? 0);
    fd.append('advance_payment', params.advancePayment ?? 0);
    fd.append('balance_payment', params.balancePayment ?? 0);
    fd.append('payment_mode', params.paymentMode || 'cash');
    if (params.orderNote) fd.append('order_note', params.orderNote);
    if (params.totalAdult != null) fd.append('total_adult', params.totalAdult);
    if (params.totalChildren != null) fd.append('total_children', params.totalChildren);
    if (params.idType) fd.append('id_type', params.idType);
    if (params.checkinDate) fd.append('checkin_date', params.checkinDate);
    if (params.checkoutDate) fd.append('checkout_date', params.checkoutDate);
    if (params.frontImage) fd.append('front_image_file', params.frontImage);
    if (params.backImage) fd.append('back_image_file', params.backImage);

    const res = await api.post(API_ENDPOINTS.ROOM_CHECK_IN, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  // JSON body mode (no images)
  const payload = {
    phone: params.phone,
    name: params.name,
    room_id: params.roomIds,
    booking_type: params.bookingType || 'WalkIn',
    booking_for: params.bookingFor || 'personal',
    order_amount: params.orderAmount ?? 0,
    advance_payment: params.advancePayment ?? 0,
    balance_payment: params.balancePayment ?? 0,
    payment_mode: params.paymentMode || 'cash',
  };
  if (params.email) payload.email = params.email;
  if (params.orderNote) payload.order_note = params.orderNote;
  if (params.totalAdult != null) payload.total_adult = params.totalAdult;
  if (params.totalChildren != null) payload.total_children = params.totalChildren;
  if (params.idType) payload.id_type = params.idType;
  if (params.checkinDate) payload.checkin_date = params.checkinDate;
  if (params.checkoutDate) payload.checkout_date = params.checkoutDate;

  const res = await api.post(API_ENDPOINTS.ROOM_CHECK_IN, payload);
  return res.data;
};
