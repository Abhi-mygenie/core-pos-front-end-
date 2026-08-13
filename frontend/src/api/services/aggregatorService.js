// CR-106: Aggregator order lifecycle API calls (UrbanPiper — Swiggy/Zomato)
import api from '../axios';
import { AGGREGATOR_ENDPOINTS } from '../constants';

export async function getAggregatorOrderList() {
  const res = await api.get(AGGREGATOR_ENDPOINTS.ORDER_LIST);
  return res.data;
}

export async function updateAggregatorOrderStatus({ order_id, urban_order_id, new_status, message, extra, reason_code }) {
  const payload = { order_id, urban_order_id, new_status, message: message || 'Success' };
  if (extra) payload.extra = extra;
  if (reason_code) payload.reason_code = reason_code;
  const res = await api.post(AGGREGATOR_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
  return res.data;
}

// CR-118: Manual KOT/Bill print for aggregator orders
// CR-125: added optional brandName → appended as brand_name in payload (key confirmed 2026-08-01)
export async function manuallyPrintAggregator(aggrOrderId, aggrOrderType, brandName) {
  const payload = {
    aggr_order_id: String(aggrOrderId),
    aggr_order_type: aggrOrderType, // 'aggr_kot' | 'aggr_bill'
  };
  if (brandName) payload.brand_name = brandName; // CR-125: omitted when null → no regression for single-brand
  const res = await api.post(AGGREGATOR_ENDPOINTS.MANUALLY_PRINT, payload);
  return res.data;
}
