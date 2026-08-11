// CR-135: Aggregator Config service
import api from '../axios';
import { API_ENDPOINTS, AGGREGATOR_CONFIG_ENDPOINTS, RECIPE_MAPPING_ENDPOINTS } from '../constants';

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
