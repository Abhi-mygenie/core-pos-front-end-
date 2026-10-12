// Delivery Service — BUG-097: Dispatch + Assign Rider API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Dispatch a delivery order (own delivery, no rider assignment).
 * Calls order-status-update with order_dispatch_status: "Yes".
 *
 * @param {number|string} orderId - Order ID
 * @param {string} roleName - User role from auth (e.g., "Owner", "Manager")
 * @returns {Promise<object>} API response data
 */
export const dispatchOrder = async (orderId, roleName) => {
  const response = await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, {
    order_id: orderId,
    order_status: 'serve',
    role_name: roleName,
    order_dispatch_status: 'Yes',
  });
  return response.data;
};

/**
 * BUG-097 Bucket 4 (2026-05-20): Fetch list of delivery employees (riders).
 * POST /api/v1/vendoremployee/delivery-employee-list
 *
 * IMPORTANT: Backend ONLY accepts POST on this route (verified live 2026-05-20
 * via 405 on GET — same family of bugs as Bucket 2's order-status-update PUT
 * issue). Empty `{}` body is sufficient.
 *
 * Returns normalized riders: { id, fullName, phone, image, _raw }.
 * Per owner directive 2026-05-20: NO role/availability filter — backend does
 * not expose such a field today (response has no `employee_role` flag scoped
 * to delivery riders), show ALL employees returned by the endpoint.
 *
 * @returns {Promise<Array<{id:number, fullName:string, phone:string, image:string|null, _raw:object}>>}
 */
export const getDeliveryEmployees = async () => {
  const response = await api.post(API_ENDPOINTS.DELIVERY_EMPLOYEE_LIST, {});
  // Response is a TOP-LEVEL ARRAY in preprod (verified 2026-05-20).
  // Defensive: also accept { data: [...] } or { data: { data: [...] } } shapes
  // in case backend wraps the response on other tenants.
  const raw = Array.isArray(response?.data)
    ? response.data
    : (response?.data?.data ?? []);
  const list = Array.isArray(raw) ? raw : [];
  return list.map((r) => ({
    id: r.id,
    fullName: [r.f_name, r.l_name].filter(Boolean).join(' ').trim() || `Rider #${r.id}`,
    phone: r.phone || '',
    image: r.image || null,
    _raw: r,
  }));
};

/**
 * BUG-097 Bucket 4 (2026-05-20): Assign a rider to a delivery order.
 * POST /api/v2/vendoremployee/order/delivery-order-assign
 *
 * Payload (minimal — owner-approved smoke-then-patch on 2026-05-20):
 *   { order_id, delivery_man_id }
 *
 * Bucket 5 (socket reflection of rider accept/reject) is NOT wired here —
 * the parent relies on the existing socket refresh for the order to pick up
 * the new delivery_man / delivery_man_status values.
 *
 * @param {number|string} orderId        - Order ID
 * @param {number|string} deliveryManId  - Selected rider's employee ID
 * @returns {Promise<object>} API response data
 */
export const assignDeliveryRider = async (orderId, deliveryManId) => {
  const response = await api.post(API_ENDPOINTS.DELIVERY_ORDER_ASSIGN, {
    order_id: orderId,
    delivery_man_id: deliveryManId,
  });
  return response.data;
};
