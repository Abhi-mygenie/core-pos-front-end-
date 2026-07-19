// CR-072: Inventory Service — 22 API functions for inventory CRUD
// CR-078: +2 services (getDailyConsumptionReport, getVendorItemList)
import api from '../axios';
import { INVENTORY_ENDPOINTS, EXPENSE_ENDPOINTS, REPORT_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/inventoryTransform';

// ── Ingredients Master ──────────────────────────────────────────
export async function getIngredients() {
  const res = await api.get(INVENTORY_ENDPOINTS.GET_INVENTORY_MASTER);
  return fromAPI.ingredients(res.data);
}

export async function addIngredient(data) {
  const payload = toAPI.addIngredient(data);
  return api.post(INVENTORY_ENDPOINTS.ADD_INVENTORY, payload);
}

export async function deleteIngredient(id) {
  return api.delete(`${INVENTORY_ENDPOINTS.DELETE_INGREDIENT}/${id}`);
}

export async function exportIngredients() {
  return api.get(INVENTORY_ENDPOINTS.EXPORT_INVENTORY, { responseType: 'blob' });
}

export async function importIngredients(formData) {
  return api.post(INVENTORY_ENDPOINTS.IMPORT_INVENTORY, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ── Categories ──────────────────────────────────────────────────
export async function getCategories() {
  const res = await api.get(INVENTORY_ENDPOINTS.STOCK_CATEGORIES);
  return fromAPI.categories(res.data);
}

export async function storeCategory(data) {
  const payload = toAPI.storeCategory(data);
  return api.post(INVENTORY_ENDPOINTS.STORE_CATEGORY, payload);
}

// ── Stock ────────────────────────────────────────────────────────
export async function getStockInventory() {
  const res = await api.get(INVENTORY_ENDPOINTS.STOCK_INVENTORY);
  return fromAPI.stockItems(res.data);
}

export async function getUnitInventory(id) {
  const res = await api.get(`${INVENTORY_ENDPOINTS.UNIT_INVENTORY}/${id}`);
  return fromAPI.unitInventory(res.data);
}

export async function updateStock(id, data) {
  const payload = toAPI.updateStock(data);
  return api.post(`${INVENTORY_ENDPOINTS.UPDATE_STOCK}/${id}`, payload);
}

export async function addStock(id, data) {
  const payload = toAPI.addStock(data);
  return api.post(`${INVENTORY_ENDPOINTS.ADD_STOCK}/${id}`, payload);
}

export async function addPurchase(data) {
  const payload = toAPI.addPurchase(data);
  return api.post(INVENTORY_ENDPOINTS.ADD_PURCHASE, payload);
}

export async function exportStock() {
  // CR-075-A · S1 — support JSON { download_url } (new) OR blob (legacy) response shapes
  try {
    const res = await api.get(INVENTORY_ENDPOINTS.EXPORT_STOCK);
    return res;
  } catch (err) {
    // Fallback to blob if server rejects the JSON default
    if (err?.response?.status === 406 || err?.response?.status === 415) {
      return api.get(INVENTORY_ENDPOINTS.EXPORT_STOCK, { responseType: 'blob' });
    }
    throw err;
  }
}

export async function importStock(formData) {
  return api.post(INVENTORY_ENDPOINTS.IMPORT_STOCK, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ── Vendors ──────────────────────────────────────────────────────
export async function getVendorTypes() {
  const res = await api.get(INVENTORY_ENDPOINTS.VENDOR_TYPE);
  return fromAPI.vendorTypes(res.data);
}

export async function addVendor(data) {
  const payload = toAPI.addVendor(data);
  return api.post(INVENTORY_ENDPOINTS.ADD_VENDOR, payload); // BUG-197 #2
}

// ── Wastage ──────────────────────────────────────────────────────
export async function getWastageReasons() {
  const res = await api.get(INVENTORY_ENDPOINTS.WASTAGE_LIST); // BUG-197 #3: new list endpoint
  return fromAPI.wastageReasons(res.data);
}

export async function addWastageReason(data) {
  return api.post(INVENTORY_ENDPOINTS.ADD_WASTAGE_REASON, toAPI.addWastageReason(data)); // BUG-197 #3
}

export async function updateWastageReason(id, data) {
  return api.post(`${INVENTORY_ENDPOINTS.UPDATE_WASTAGE_REASON}/${id}`, toAPI.updateWastageReason(data)); // BUG-197 #3
}

export async function toggleWastageStatus(id, status) {
  return api.post(`${INVENTORY_ENDPOINTS.WASTAGE_REASON_STATUS}/${id}`, toAPI.toggleWastageStatus(status)); // BUG-197 #3
}

export async function deleteWastageReason(id) {
  return api.delete(`${INVENTORY_ENDPOINTS.DELETE_WASTAGE_REASON}/${id}`); // BUG-197 #3
}

// ── Shared with Expense (import, don't duplicate) ────────────────
export async function getUnits() {
  const res = await api.get(EXPENSE_ENDPOINTS.GET_UNIT);
  return res.data?.units || res.data?.data || res.data || [];
}

export async function getPaymentMethods() {
  const res = await api.get(EXPENSE_ENDPOINTS.PAYMENT_METHOD);
  return res.data?.Payment_method || res.data?.payment_method || res.data?.data || res.data || []; // R9: capital P in response key
}

// CR-078: Smart Purchase — daily consumption report (POST body { from_date, to_date } as YYYY-MM-DD)
export async function getDailyConsumptionReport({ from_date, to_date }) {
  const res = await api.post(REPORT_ENDPOINTS.DAILY_CONSUMPTION_REPORT, { from_date, to_date });
  return res.data;  // { stock_summary, stock_details, date_range, restaurant_id, applied_restaurant_ids, hierarchy_scope }
}

// CR-078: Smart Purchase — vendor purchase history (unwraps .data.data wrapper)
export async function getVendorItemList() {
  const res = await api.get(INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST);
  return res.data?.data || [];
}
