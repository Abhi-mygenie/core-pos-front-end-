// Menu Management Service — CR-014
// Food, Category, Add-on, and Station CRUD via Menu Management API

import api from '../axios';

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

/** API #2 — Edit food item */
export const editFood = (foodId, foodInfo, image = null) => {
  const formData = new FormData();
  formData.append('food_info', JSON.stringify(foodInfo));
  if (image) formData.append('image', image);
  return api.post(`${BASE_V2}/foods/${foodId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** API #4 — Delete food item */
export const deleteFood = (foodId, deleteReason) =>
  api.delete(`${BASE_V2}/delete/${foodId}`, {
    data: { delete_reason: deleteReason },
  });

/** API #6 — Toggle food status (active/inactive) */
export const toggleFoodStatus = (foodId, status) =>
  api.post(`${BASE_V2}/status-food/${foodId}`, { status });

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

/** API #18 — Add addon */
export const addAddon = (name, price) =>
  api.post(`${BASE_V2}/add-addon`, { name, price: Number(price) });

/** API #19 — Update addon */
export const updateAddon = (addonId, name, price) =>
  api.post(`${BASE_V2}/addon-update/${addonId}`, { name, price: Number(price) });

/** API #20 — Delete addon */
export const deleteAddon = (addonId) =>
  api.delete(`${BASE_V2}/delete-addon/${addonId}`);
