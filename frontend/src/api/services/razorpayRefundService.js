// CR-165: Razorpay cancel and refund service
import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Calls the backend cancel-and-refund endpoint for Razorpay PG orders.
 * Backend derives restaurant_id from the Bearer token.
 * Response shape: { message: "" } — HTTP 200 = success, non-200 = error.
 */
export const cancelAndRefund = async (orderId, cancellationReason, cancellationNote) => {
  const response = await api.post(API_ENDPOINTS.RAZORPAY_CANCEL_REFUND, {
    order_id: orderId,
    cancellation_reason: cancellationReason,
    cancellation_note: cancellationNote,
  });
  return response.data;
};
