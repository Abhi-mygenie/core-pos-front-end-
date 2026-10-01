// Menu Management Service — CR-014
// Food, Category, Add-on, and Station CRUD via Menu Management API

import api from '../axios';
import { AGGREGATOR_SYNC_ENDPOINTS, API_ENDPOINTS } from '../constants'; // CR-140, CR-148: API_ENDPOINTS added

const BASE_V2 = '/api/v2/vendoremployee/product';
const BASE_V1 = '/api/v1/vendoremployee/product';

// =============================================================================
// FOOD APIs (#1-7, #11)
// =============================================================================

/** API #3 — Get foods list */
export const getFoodsList = (foodFor = 'Normal') =>
  api.get(`${BASE_V2}/foods-list`, { params: { food_for: foodFor } });

/** API #7 — Get menu master (menu types) */
export const getMenuMaster = () =>
  api.get(`${BASE_V2}/menu-master`);

/** CR-148 — Popular food items ordered by order frequency */
export const getPopularFoods = (type = 'all') =>
  api.get(API_ENDPOINTS.POPULAR_FOOD, { params: { type } });

/** API #5 — Get delete reasons */
export const getDeleteReasons = () =>
  api.get(`${BASE_V2}/delete-reasons`);

/** API #1 — Add food item */
export const addFood = (foodInfo, image = null) => {
  const formData = new FormData();
  formData.append('food_info', JSON.stringify(foodInfo));
  if (image) formData.append('image', image);
  return api.post(`${BASE_V2}/add-food`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** CR-140 GAP-1: Add aggregator food — dedicated endpoint, JSON body (not multipart) */
export const addFoodAggregator = (payload) =>
  api.post(`${BASE_V2}/add-food-aggregator`, payload); // CR-140

/** BUG-327: Add aggregator food with image upload — flat multipart (no food_info wrapper).
 *  ⚠ SKIP variations + addon_ids: multipart string value corrupts DB (cleanBindings TypeError). */
export const addFoodAggregatorMultipart = (foodInfo, imageFile = null, swiggyImageFile = null) => { // BUG-327
  const formData = new FormData();
  const SKIP = new Set(['variations', 'addon_ids']);
  Object.entries(foodInfo).forEach(([key, val]) => {
    if (SKIP.has(key) || val === undefined || val === null) return;
    formData.append(key, val);
  });
  if (imageFile)       formData.append('image',        imageFile);
  if (swiggyImageFile) formData.append('swiggy_image', swiggyImageFile);
  return api.post(`${BASE_V2}/add-food-aggregator`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** CR-140 GAP-3: Fetch restaurant clients (sub-brands) for brand selector */
export const getRestaurantClients = () =>
  api.get(AGGREGATOR_SYNC_ENDPOINTS.RESTAURANT_CLIENTS); // CR-140

/** CR-140 GAP-5: Aggregator stock toggle via UrbanPiper */
export const aggregatorStockToggle = ({ action, item_ids, client_id, turn_on_preset, turn_on_at }) => {
  const payload = { action, item_ids };
  if (client_id)      payload.client_id      = client_id;
  if (turn_on_preset) payload.turn_on_preset  = turn_on_preset;
  if (turn_on_at)     payload.turn_on_at      = turn_on_at;
  return api.post(AGGREGATOR_SYNC_ENDPOINTS.STOCK_TOGGLE, payload); // CR-140
};

/** API #2 — Edit food item */
export const editFood = (foodId, foodInfo, image = null) => {
  const formData = new FormData();
  formData.append('food_info', JSON.stringify(foodInfo));
  if (image) formData.append('image', image);
  return api.post(`${BASE_V2}/foods/${foodId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** BUG-327: Edit aggregator food — flat multipart fields (no food_info wrapper).
 *  Files optional: omit = backend keeps existing file.
 *  ⚠ SKIP variations + addon_ids: multipart string value corrupts DB. */
export const editFoodAggregator = (foodId, foodInfo, imageFile = null, swiggyImageFile = null) => { // BUG-327
  const formData = new FormData();
  const SKIP = new Set(['variations', 'addon_ids']);
  Object.entries(foodInfo).forEach(([key, val]) => {
    if (SKIP.has(key) || val === undefined || val === null) return;
    formData.append(key, val);
  });
  if (imageFile)       formData.append('image',        imageFile);
  if (swiggyImageFile) formData.append('swiggy_image', swiggyImageFile);
  return api.post(`${BASE_V2}/foods/${foodId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** API #4 — Delete food item */
export const deleteFood = (foodId, deleteReason) =>
  api.delete(`${BASE_V2}/delete/${foodId}`, {
    data: { delete_reason: deleteReason },
  });

/** CR-159: Bulk delete — non-Aggregator menus only.
 *  DELETE /api/v2/vendoremployee/product/delete-bulk
 *  { ids: number[], delete_reason: string, food_for: 'Normal'|'Party'|'Premium' }
 */
export const deleteFoodBulk = (ids, deleteReason, foodFor = 'Normal') =>
  api.delete(`${BASE_V2}/delete-bulk`, {
    data: { ids, delete_reason: deleteReason, food_for: foodFor },
  });

/** API #6 — Toggle food status (active/inactive)
 * BUG-301: Aggregator items require { food_for: 'Aggregator' } — { status } only works for Normal.
 */
export const toggleFoodStatus = (foodId, status, foodFor = 'Normal') => // BUG-301
  api.post(`${BASE_V2}/status-food/${foodId}`,
    foodFor === 'Aggregator' ? { food_for: 'Aggregator' } : { status }); // BUG-301

/** API #11 — Quick reorder (food or category) */
export const quickReorder = (type, items) =>
  api.post(`${BASE_V2}/quick-reorder`, { type, items });

/** API #9 — Bulk export all foods → { message, download_url } */
export const bulkExport = (type = 'all') =>
  api.post(`${BASE_V2}/bulk-export`, { type });

/** API #8 — Bulk import from xlsx → { normal_food, aggregator_food, total, message } */
export const bulkImport = (file) => {
  const formData = new FormData();
  formData.append('products_file', file);
  return api.post(`${BASE_V2}/bulk-import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** API #10 — Export sample template → { message, download_url } */
export const exportSample = () =>
  api.get(`${BASE_V2}/export-sample`);

// =============================================================================
// CATEGORY APIs (#12-15)
// =============================================================================

/** API #12 — Get categories */
export const getCategories = () =>
  api.get(`${BASE_V2}/categories`);

/** API #13 — Add category (multipart/form-data) */
export const addCategory = ({ name, image, catType = 'food', vendorType = 'restaurant', stationName = 'KDS', printerId = '', catOrder = 0 }) => {
  const formData = new FormData();
  formData.append('name', name);
  if (image) formData.append('image', image);
  formData.append('cat_type', catType);
  formData.append('vendor_type', vendorType);
  formData.append('station_name', stationName);
  formData.append('restaurant_printer_id', String(printerId));
  formData.append('cat_order', String(catOrder));
  return api.post(`${BASE_V1}/add-categories`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** API #14 — Edit category (JSON) */
export const editCategory = (categoryId, data) =>
  api.post(`${BASE_V1}/update-categories/${categoryId}`, {
    name: data.name,
    image: data.image || '',
    cat_type: data.catType || 'food',
    vendor_type: data.vendorType || 'restaurant',
    station_name: data.stationName || 'KDS',
    restaurant_printer_id: data.printerId || 0,
    cat_order: data.catOrder || 0,
  });

/** API #15 — Delete category */
export const deleteCategory = (categoryId) =>
  api.delete(`${BASE_V2}/delete-categories/${categoryId}`);

// =============================================================================
// STATION/PRINTER API (#16)
// =============================================================================

/** API #16 — Get station printer list */
export const getStationPrinterList = () =>
  api.get(`${BASE_V2}/station-printer-list`);

// =============================================================================
// ADD-ON APIs (#17-20)
// =============================================================================

/** API #17 — Get addon list */
export const getAddonList = () =>
  api.get(`${BASE_V2}/addon-list`);

/** CR-142/CR-144 GAP-B: Add addon — V2 full payload */
export const addAddon = ({ name, price, weight = 0, veg = 1, status = 1, has_inventory = 'No' }) =>
  api.post(`${BASE_V2}/add-addon`, { name, price: Number(price), weight, veg, status, has_inventory });

/** CR-142/CR-144 GAP-C: Update addon — PUT (R25: Laravel uses PUT for updates) */
export const updateAddon = (addonId, { name, price, weight, veg, status, has_inventory }) =>
  api.put(`${BASE_V2}/addon-update/${addonId}`, {  // CR-142/CR-144: POST→PUT
    name,
    price: Number(price),
    ...(weight        !== undefined ? { weight }        : {}),
    ...(veg           !== undefined ? { veg }           : {}),
    ...(status        !== undefined ? { status }        : {}),
    ...(has_inventory !== undefined ? { has_inventory } : {}),
  });

/** CR-142/CR-144 GAP-D: Toggle addon active/inactive */
export const toggleAddonStatus = (addonId, status) =>
  api.post(`${BASE_V2}/status-change/${addonId}`, { status });

/** API #20 — Delete addon (unchanged) */
export const deleteAddon = (addonId) =>
  api.delete(`${BASE_V2}/delete-addon/${addonId}`);
