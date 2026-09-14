// CR-017: WhatsApp Payment Link Service
// Sends a Razorpay payment link to customer via WhatsApp/SMS.
// Backend: creates (or reuses) Razorpay link, saves to order_online_payments,
// triggers WhatsApp via razoar_payment_with_url template.

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Send payment link via WhatsApp/SMS
 * @param {Object} params
 * @param {string|number} params.orderId - Order ID
 * @param {number} params.amount - Payment amount
 * @param {string} params.phone - 10-digit customer phone
 * @param {string} [params.customerName] - Customer name (defaults to "Customer")
 * @param {string} [params.restaurantName] - Restaurant name (optional)
 * @returns {Promise<{ orderId: string, paymentLink: string, source: string }>}
 *   source: "razorpay" (new link created) | "db" (existing pending link reused)
 */
export const sendPaymentLink = async ({ orderId, amount, phone, customerName, restaurantName }) => {
  const response = await api.post(API_ENDPOINTS.PAYMENT_LINK, {
    order_id: String(orderId),
    payment_amount: amount,
    customer_phone: phone,
    customer_name: customerName || 'Customer',
    restaurant_name: restaurantName || '',
  });

  const data = response.data;
  return {
    orderId: data.order_id,
    paymentLink: data.payment_link,
    source: data.source, // "razorpay" or "db"
  };
};
