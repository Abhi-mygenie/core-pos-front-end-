// CR-135: Aggregator Config service
import api from '../axios';
import { API_ENDPOINTS, AGGREGATOR_CONFIG_ENDPOINTS, RECIPE_MAPPING_ENDPOINTS, AGGREGATOR_SYNC_ENDPOINTS } from '../constants'; // CR-141

// ── Local helpers ─────────────────────────────────────────────────────────────
const toYesNo    = (bool) => (bool ? 'Yes' : 'No');
const capitalize = (str)  => (str || 'ready').replace(/^\w/, c => c.toUpperCase());

// ── GET /api/v2/vendoremployee/product/restaurant-clients ─────────────────────
// Response: { status, clients_found, clients: [...] | 0 }
export const getBrands = async () => {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.RESTAURANT_CLIENTS);
  return res.data;
};

// ── GET /api/v2/vendoremployee/aggregator-config ──────────────────────────────
// GET /api/v2/vendoremployee/aggregator-config?client_id=N  (sub-brand)
// New brand with no config → always 200, data.id = null  (findOrEmptyConfig)
export const getConfig = async (clientId = null) => {
  const url = clientId
    ? `${AGGREGATOR_CONFIG_ENDPOINTS.CONFIG}?client_id=${clientId}`
    : AGGREGATOR_CONFIG_ENDPOINTS.CONFIG;
  const res = await api.get(url);
  return res.data;
};

// ── POST /api/v2/vendoremployee/aggregator-config ─────────────────────────────
// Flat JSON body — both create + update (R25 exception)
// payload = aggregatorConfigTransform.toAPI.config(state)
export const saveConfig = async (payload) => {
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.CONFIG, payload);
  return res.data;
};

// ── POST /api/v2/vendoremployee/aggregator-config/restaurant-clients ──────────
// Step 1 of Add New Brand. name + phone required; email/address optional.
// Response: { status, message, suggested_store_id (TOP-LEVEL), data: { id, name, … } }
export const createBrand = async ({ name, phone, email, address }) => {
  const body = { name, phone };
  if (email)   body.email   = email;
  if (address) body.address = address;
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.CLIENTS, body);
  return res.data;
};

// ── POST /api/v2/vendoremployee/aggregator-config/push-store ─────────────────
// client_id omitted for main brand
export const pushStore = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.PUSH_STORE, body);
  return res.data;
};

// ── POST /api/v2/vendoremployee/aggregator-config/store-toggle ───────────────
// action: 'enable' | 'disable'
// platforms: ['zomato'] | ['swiggy'] | ['zomato','swiggy']
export const storeToggle = async (action, platforms, clientId = null) => {
  const body = { action, platforms };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_CONFIG_ENDPOINTS.STORE_TOGGLE, body);
  return res.data;
};

// ── POST /api/v2/vendoremployee/restaurant-settings/update-settings ───────────
// SPARSE partial merge (D1 confirmed) — only 8 aggregator fields in basic{}
// DO NOT add undefined/null keys — backend isset() only updates present keys
export const updateOperationalSettings = async (form) => {
  const formData = new FormData();
  formData.append('data', JSON.stringify({
    basic: {
      aggregator_auto_kot:        toYesNo(form.aggregatorAutoKot),
      aggregator_auto_bill:       toYesNo(form.aggregatorAutoBill),
      aggregator_auto_bill_stage: capitalize(form.aggregatorAutoBillStage),  // 'ready'→'Ready'
      auto_prep_time_ack:         toYesNo(form.autoPrepTimeAck),
      aggregator_order_tone:      form.aggregatorOrderTone   || 'default',
      default_prep_time:          parseInt(form.defaultPrepTime) || 15,
      prep_time_count_method:     form.prepTimeCountMethod   || 'quantity',
      prep_time_bonus_config:     Array.isArray(form.prepTimeBonusConfig)
                                    ? form.prepTimeBonusConfig : [],
    },
  }));
  const res = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
  return res.data;
};

// ── CR-141: Aggregator Sync Operations ───────────────────────────────────────

/** CR-141 GAP-8: Push this brand's menu to UrbanPiper. Async — two-phase. */
export const syncCatalog = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.SYNC_CATALOG, body);
  return res.data;
};

/**
 * CR-141 GAP-9: Clear catalog.
 * fullMasterReset=false → store-only (safe). fullMasterReset=true → DANGER: wipes ALL brands.
 */
export const clearCatalog = async (clientId = null, fullMasterReset = false) => {
  const body = { full_master_reset: fullMasterReset };
  if (clientId && !fullMasterReset) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CLEAR_CATALOG, body);
  return res.data;
};

/** CR-141 GAP-10: Remove option/modifier groups for this store. Store-scoped. */
export const clearModifiers = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CLEAR_MODIFIERS, body);
  return res.data;
};

/** CR-141 GAP-11a: Fetch all timing groups (restaurant-wide; client_id ignored for GET). */
export const getCategoryTimings = async () => {
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS);
  return res.data;
};

/**
 * CR-141 GAP-11b: Upsert timing groups locally then push to UrbanPiper.
 * Local save is RESTAURANT-WIDE regardless of clientId.
 * clientId selects which store credentials to use for the UP push.
 */
export const saveCategoryTimings = async (timingGroups, clientId = null) => {
  const body = { timing_groups: timingGroups };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS, body);
  return res.data;
};

/** CR-141 GAP-11c: Push existing DB rows to UrbanPiper without upsert. */
export const pushCategoryTimings = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS_PUSH, body);
  return res.data;
};

// ── CR-143: Aggregator Leftover ───────────────────────────────────────────────

/** CR-143 GAP-G: Force-enable all active Swiggy items for this brand.
 *  ⚠ Returns 502 if no Swiggy config — handle gracefully in UI. */
export const forceSwiggyEnable = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.FORCE_SWIGGY_ENABLE, body);
  return res.data;
};

/** CR-143 GAP-H: List addons with aggregator status for a brand.
 *  Response: { status, client_id, addons:[{id,name,price,status,status_text}] } */
export const getBulkAddons = async (clientId = null) => {
  const params = clientId ? { client_id: clientId } : {};
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_ADDONS, { params });
  return res.data;
};

/** CR-143 GAP-H: Foods using a specific addon on this brand. */
export const getBulkAddonItems = async (addonId, clientId = null) => {
  const params = { addon_id: addonId, ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_ITEMS, { params });
  return res.data;
};

/** CR-143 GAP-H: Apply catalog status change — RESTAURANT-WIDE (confirmed probe P8e).
 *  action: 'enable' | 'out_of_stock'
 *  ⚠ Writes add_ons.status for ALL brands — confirm dialog required. */
export const applyBulkAddon = async (addonId, action, clientId = null) => {
  const body = { addon_id: addonId, action, ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_APPLY, body);
  return res.data;
};

/** CR-143 GAP-H: Toggle addon on UrbanPiper (per-brand).
 *  ⚠ Returns 404 {errors:[{code:"no_items"}]} when addon not on aggregator — treat as warning. */
export const toggleAddonStock = async (addonId, action, clientId = null) => {
  const body = { addon_id: addonId, action, ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.TOGGLE_ADDON, body);
  return res.data;
};

/** CR-143 GAP-I: List foods with variations for this brand.
 *  Response: { status, client_id, items:[{id,name,category_id,status,variations:[...]}] } */
export const getVariations = async (clientId = null) => {
  const params = clientId ? { client_id: clientId } : {};
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.VARIATIONS, { params });
  return res.data;
};

/** CR-143 GAP-I: Toggle a variation value on UrbanPiper (per-brand).
 *  OPT ref: OPT-VAR-{foodId}-{varIdx}-{valIdx} */
export const toggleVariation = async ({ food_id, variation_index, variation_value_index, action, clientId = null }) => {
  const body = { food_id, variation_index, variation_value_index, action,
                 ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.TOGGLE_VARIATION, body);
  return res.data;
};
