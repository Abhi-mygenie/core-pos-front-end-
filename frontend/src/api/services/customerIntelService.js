// CR-002 Cross-Sell + Customer Intelligence — CRM API Service
// POST wrapper for /pos/customers/order-suggestions
// Auth: X-API-Key via existing crmAxios interceptor (login response crm_token)
// Timeout: 3000ms hard (contract §7.1)

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';

/**
 * Fetch customer order suggestions from CRM.
 *
 * @param {Object} params
 * @param {string} params.customerId - CRM customer UUID
 * @param {Array}  params.cart       - Cart items [{id, qty, price}]
 * @param {string} [params.orderType] - 'dine_in' | 'takeaway' | 'delivery'
 * @returns {Promise<Object>} Raw API response data
 */
export const getOrderSuggestions = async ({ customerId, cart = [], orderType = null }) => {
  const body = {
    crm_customer_id: customerId,
    current_cart: cart.map(item => ({
      item_id: String(item.id),
      qty: item.qty || 1,
      unit_price: Number(item.price) || 0,
    })),
  };
  if (orderType) body.order_type = orderType;

  const response = await crmApi.post(
    API_ENDPOINTS.CUSTOMER_ORDER_SUGGESTIONS,
    body,
    { timeout: 3000 }
  );
  return response.data;
};
