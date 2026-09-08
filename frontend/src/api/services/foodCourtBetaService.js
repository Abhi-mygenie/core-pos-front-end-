// CR-157: Food Court Beta — dedicated backend endpoint service
// POST /api/v1/vendoremployee/food-court-order-report
// sort_by: "collect_bill" always sent (owner decision Q3)

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * CR-157: Step 1 — Get station list + station_gst_map (no station param)
 * Returns: { stations[], station_gst_map{}, orders: [], total_orders: 0 }
 */
export async function getFoodCourtStations(from, to) {
  const res = await api.post(API_ENDPOINTS.FOOD_COURT_ORDER_REPORT, {
    from,
    to,
    sort_by: 'collect_bill', // CR-157: always hardcoded per owner Q3
  });
  return res.data || {};
}

/**
 * CR-157: Step 2 — Get orders for a specific station
 * Returns: { orders[], stations[], station_gst_map{}, total_orders: N }
 */
export async function getFoodCourtBetaOrders(from, to, station) {
  const res = await api.post(API_ENDPOINTS.FOOD_COURT_ORDER_REPORT, {
    from,
    to,
    station,
    sort_by: 'collect_bill', // CR-157: always hardcoded per owner Q3
  });
  return res.data || {};
}
