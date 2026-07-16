// CR-072: Recipe Service — 15 API functions for recipe CRUD
import api from '../axios';
import { RECIPE_ENDPOINTS } from '../constants';
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
  const payload = toAPI.storeRecipe(data);
  return api.post(`${RECIPE_ENDPOINTS.UPDATE_RECIPE}/${id}`, payload);
}

export async function deleteRecipe(id) {
  return api.delete(`${RECIPE_ENDPOINTS.DELETE_RECIPE}/${id}`);
}

export async function exportRecipes() {
  return api.get(RECIPE_ENDPOINTS.EXPORT_RECIPE, { responseType: 'blob' });
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
  const payload = toAPI.storeSubRecipe(data);
  return api.post(`${RECIPE_ENDPOINTS.UPDATE_SUB_RECIPE}/${id}`, payload);
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
  const payload = toAPI.storeAddonRecipe(data);
  return api.post(`${RECIPE_ENDPOINTS.UPDATE_ADDON_RECIPE}/${id}`, payload);
}

export async function deleteAddonRecipe(id) {
  return api.delete(`${RECIPE_ENDPOINTS.DELETE_ADDON_RECIPE}/${id}`);
}

// ── Supporting ───────────────────────────────────────────────────
export async function getActiveFoods() {
  const res = await api.get(RECIPE_ENDPOINTS.ACTIVE_FOODS_LIST);
  return fromAPI.activeFoods(res.data);
}
