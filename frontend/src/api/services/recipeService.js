// CR-072: Recipe Service — 15 API functions for recipe CRUD
import api from '../axios';
import { RECIPE_ENDPOINTS, RECIPE_MAPPING_ENDPOINTS } from '../constants'; // CR-119: +mapping endpoints
import { fromAPI, toAPI } from '../transforms/recipeTransform';

// ── Standard Recipes ─────────────────────────────────────────────
export async function getRecipes() {
  const res = await api.get(RECIPE_ENDPOINTS.GET_RECIPES);
  return fromAPI.recipes(res.data);
}

export async function storeRecipe(data) {
  const payload = toAPI.storeRecipe(data);
  return api.post(RECIPE_ENDPOINTS.STORE_RECIPE, payload);
}

export async function updateRecipe(id, data) {
  const payload = toAPI.updateRecipe(data); // BUG-197 #5: separate transform
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_RECIPE}/${id}`, payload); // BUG-197 #5: PUT not POST
}

export async function deleteRecipe(id) {
  return api.delete(`${RECIPE_ENDPOINTS.DELETE_RECIPE}/${id}`);
}

export async function exportRecipes() {
  // BUG-222: backend returns JSON { download_url } — blob responseType corrupted the file
  try {
    return await api.get(RECIPE_ENDPOINTS.EXPORT_RECIPE);
  } catch (err) {
    if (err?.response?.status === 406 || err?.response?.status === 415) {
      return api.get(RECIPE_ENDPOINTS.EXPORT_RECIPE, { responseType: 'blob' });
    }
    throw err;
  }
}
export async function exportSampleRecipes() { // BUG-222: template
  return api.get(RECIPE_ENDPOINTS.EXPORT_SAMPLE_RECIPE);
}

export async function importRecipes(formData) {
  return api.post(RECIPE_ENDPOINTS.IMPORT_RECIPE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ── Sub-Recipes ──────────────────────────────────────────────────
export async function getSubRecipes() {
  const res = await api.get(RECIPE_ENDPOINTS.GET_SUB_RECIPES);
  return fromAPI.subRecipes(res.data);
}

export async function storeSubRecipe(data) {
  const payload = toAPI.storeSubRecipe(data);
  return api.post(RECIPE_ENDPOINTS.STORE_SUB_RECIPE, payload);
}

export async function updateSubRecipe(id, data) {
  const payload = toAPI.updateSubRecipe(data); // BUG-197 #9: separate update transform
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_SUB_RECIPE}/${id}`, payload); // BUG-197 #9: PUT
}

export async function deleteSubRecipe(id) {
  return api.delete(`${RECIPE_ENDPOINTS.DELETE_SUB_RECIPE}/${id}`);
}

// ── Addon Recipes ────────────────────────────────────────────────
export async function getAddonRecipes() {
  const res = await api.get(RECIPE_ENDPOINTS.GET_ADDON_RECIPES);
  return fromAPI.addonRecipes(res.data);
}

export async function storeAddonRecipe(data) {
  const payload = toAPI.storeAddonRecipe(data);
  return api.post(RECIPE_ENDPOINTS.STORE_ADDON_RECIPE, payload);
}

export async function updateAddonRecipe(id, data) {
  const payload = toAPI.updateAddonRecipe(data); // BUG-197 #9: separate update transform
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_ADDON_RECIPE}/${id}`, payload); // BUG-197 #9: PUT
}

export async function deleteAddonRecipe(id) {
  return api.delete(`${RECIPE_ENDPOINTS.DELETE_ADDON_RECIPE}/${id}`);
}

// ── Supporting ───────────────────────────────────────────────────
export async function getActiveFoods() {
  const res = await api.get(RECIPE_ENDPOINTS.ACTIVE_FOODS_LIST);
  return fromAPI.activeFoods(res.data);
}

// BUG-197 B2-4: Fetch active addon items (separate from foods)
export async function getActiveAddons() {
  const res = await api.get(RECIPE_ENDPOINTS.ACTIVE_ADDONS_LIST);
  return fromAPI.activeAddons(res.data);
}

// ── CR-119: Aggregator Food → Recipe Mapping ─────────────────────
export async function getRestaurantClients() {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.RESTAURANT_CLIENTS);
  const data = res.data;
  return {
    clientsFound: data.clients_found,
    clients: Array.isArray(data.clients) ? data.clients : [],
  };
}

export async function getFoodRecipeMapping(clientId = 0) {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.FOOD_RECIPE_MAPPING, {
    params: { client: clientId },
  });
  const data = res.data;
  return {
    recipes: data.recipes || [],
    foods: (data.aggregator_foods || []).map(f => ({
      id: f.id,
      foodName: f.food_name,
      recipeId: f.recipe_id,
      recipeName: f.recipe_name,
    })),
    stats: data.stats || {},
    clients: Array.isArray(data.clients) ? data.clients : [],
  };
}

export async function updateRecipeMapping({ itemId, recipeId, clientId = 0 }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.UPDATE_RECIPE_MAPPING, {
    type: 'aggregator',
    item_id: itemId,
    recipe_id: recipeId,
    client_id: clientId,
  });
  return res.data;
}

export async function unlinkRecipeMapping({ itemId, clientId = 0 }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.UNLINK_RECIPE_MAPPING, {
    type: 'aggregator',
    item_id: itemId,
    client_id: clientId,
  });
  return res.data;
}

export async function batchUpdateRecipeMapping({ updates, clientId = 0 }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.BATCH_RECIPE_MAPPING, {
    client_id: clientId,
    updates: updates.map(u => ({
      type: 'aggregator',
      item_id: u.itemId,
      recipe_id: u.recipeId,
    })),
  });
  return res.data;
}

export async function exportRecipeMapping() {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.EXPORT_RECIPE_MAPPING, {
    params: { type: 'aggregator' },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aggregator_recipe_mapping.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
