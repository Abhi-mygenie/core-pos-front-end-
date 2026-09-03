// CR-153: Wastage Report service — getWastageReport + getTopWastedItems
import api from '../axios';
import { INVENTORY_ENDPOINTS } from '../constants';

/**
 * CR-153: Fetch wastage report for a date range.
 * POST /inventory/wastage-report
 * @param {string} from - YYYY-MM-DD start date
 * @param {string} to   - YYYY-MM-DD end date
 */
export async function getWastageReport(from, to) {
  const body = {};
  if (from && to) { body.start_date = from; body.end_date = to; }
  const res = await api.post(INVENTORY_ENDPOINTS.WASTAGE_REPORT, body);
  return res.data;
}

/**
 * CR-153: Fetch top wasted items for a date range.
 * POST /inventory/top-wasted-items
 * @param {string} from  - YYYY-MM-DD start date
 * @param {string} to    - YYYY-MM-DD end date
 * @param {number} limit - max items returned (default 10)
 */
export async function getTopWastedItems(from, to, limit = 10) {
  const body = { limit };
  if (from && to) { body.start_date = from; body.end_date = to; }
  const res = await api.post(INVENTORY_ENDPOINTS.TOP_WASTED_ITEMS, body);
  return res.data;
}
