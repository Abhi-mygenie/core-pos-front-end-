// Menu Management Service — CR-014
// All food-level CRUD operations via Menu Management API (v2)
// Category CRUD and Add-on CRUD deferred — will be added when APIs are provided.

import api from '../axios';

const BASE = '/api/v2/vendoremployee/product';

/**
 * API #3 — Get foods list
 * @param {string} foodFor - Menu type filter: 'Normal' | 'Party' | 'Premium'
 */
export const getFoodsList = (foodFor = 'Normal') =>
  api.get(`${BASE}/foods-list`, { params: { food_for: foodFor } });

/**
 * API #7 — Get menu master (menu types)
 */
export const getMenuMaster = () =>
  api.get(`${BASE}/menu-master`);

/**
 * API #5 — Get delete reasons
 */
export const getDeleteReasons = () =>
  api.get(`${BASE}/delete-reasons`);

/**
 * API #1 — Add food item
 * @param {Object} foodInfo - Food data object
 * @param {File|null} image - Optional image file
 */
export const addFood = (foodInfo, image = null) => {
  const formData = new FormData();
  formData.append('food_info', JSON.stringify(foodInfo));
  if (image) formData.append('image', image);
  return api.post(`${BASE}/add-food`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * API #2 — Edit food item
 * @param {number} foodId
 * @param {Object} foodInfo - Food data object
 * @param {File|null} image - Optional image file
 */
export const editFood = (foodId, foodInfo, image = null) => {
  const formData = new FormData();
  formData.append('food_info', JSON.stringify(foodInfo));
  if (image) formData.append('image', image);
  return api.post(`${BASE}/foods/${foodId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * API #4 — Delete food item
 * @param {number} foodId
 * @param {string} deleteReason
 */
export const deleteFood = (foodId, deleteReason) =>
  api.delete(`${BASE}/delete/${foodId}`, {
    data: { delete_reason: deleteReason },
  });

/**
 * API #6 — Toggle food status (active/inactive)
 * @param {number} foodId
 * @param {number} status - 1 = active, 0 = inactive
 */
export const toggleFoodStatus = (foodId, status) =>
  api.post(`${BASE}/status-food/${foodId}`, { status });

/**
 * API #11 — Quick reorder (food or category)
 * @param {'food'|'category'} type
 * @param {Array<{id: number, position: number}>} items
 */
export const quickReorder = (type, items) =>
  api.post(`${BASE}/quick-reorder`, { type, items });
