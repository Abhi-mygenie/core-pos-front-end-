// CR-135: Aggregator Config transform
// ⚠️  swiggi_code / swiggi_url  = backend typo — preserve exactly, do NOT fix
// ⚠️  swiggy_status             = correct spelling (unlike swiggi_code/url)
// ⚠️  GET response wrapper: response.data  (NOT response.config)
// ⚠️  POST body: flat top-level fields ($request->all()) — no wrapper
// ⚠️  Pass-through via _raw: tone_timing, auto_aknowledge, auto_kot_id,
//                            notification_number, parent_store_id

const deepClone = (obj) => {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
};

export const aggregatorConfigTransform = {

  fromAPI: {

    // GET /aggregator-config → FE state
    // response = { status, suggested_store_id, data: { id, store_id, urban_key, … } }
    // New brand (D3): data.id = null, all fields null — findOrEmptyConfig, never 404
    config: (response) => {
      const d = response?.data || {};
      const isNewConfig = (d.id === null || d.id === undefined);
      return {
        _raw:         deepClone(d),
        isNewConfig,
        configId:     d.id          ?? null,
        clientId:     d.client_id   ?? null,
        // D3: prefill storeId from top-level suggested_store_id when data.store_id is null
        storeId:      d.store_id    || response?.suggested_store_id || '',
        suggestedStoreId: response?.suggested_store_id || '',
        urbanKey:     d.urban_key   || '',
        urbanToken:   d.urban_token || '',
        city:         d.city        || '',
        pincode:      d.pincode     || '',
        zomatoCode:   d.zomato_code || '',
        zomatoUrl:    d.zomato_url  || '',
        swiggiCode:   d.swiggi_code || '',   // ⚠️ typo preserved
        swiggiUrl:    d.swiggi_url  || '',   // ⚠️ typo preserved
        zomatoStatus: d.zomato_status  === 'Yes',  // null → false for new brand ✅
        swiggyStatus: d.swiggy_status  === 'Yes',  // ⚠️ correct spelling; null → false ✅
        toneTiming:   d.tone_timing != null ? parseInt(d.tone_timing) : null, // BUG-307: explicit mapping
        // Excluded from UI (OD-16/17/18): auto_aknowledge, auto_kot_id, notification_number
      };
    },

    // GET /restaurant-clients → sub-brands array
    // D4: clients = integer 0 when empty — guard with Array.isArray
    brands: (response) => {
      if (!response?.clients_found || !Array.isArray(response.clients)) return [];
      return response.clients.map(c => ({
        id:      c.id,
        name:    c.name    || '',
        phone:   c.phone   || '',
        email:   c.email   || '',
        address: c.address || '',
        status:  c.status,
      }));
    },

    // POST /restaurant-clients → new brand result
    // D2: suggested_store_id is TOP-LEVEL, NOT inside data
    newBrand: (response) => ({
      id:              response?.data?.id,
      suggestedStoreId: response?.suggested_store_id || '',
      name:            response?.data?.name || '',
    }),
  },

  toAPI: {
    // FE state → POST /aggregator-config flat body
    // Spread _raw first (pass-through), then overlay user-edited fields
    config: (state) => ({
      ...(state._raw || {}),
      store_id:      state.storeId,
      urban_key:     state.urbanKey,
      urban_token:   state.urbanToken,
      city:          state.city,
      pincode:       state.pincode,
      zomato_code:   state.zomatoCode,
      zomato_url:    state.zomatoUrl,
      swiggi_code:   state.swiggiCode,   // ⚠️ typo preserved
      swiggi_url:    state.swiggiUrl,    // ⚠️ typo preserved
      zomato_status: state.zomatoStatus ? 'Yes' : 'No',
      swiggy_status: state.swiggyStatus ? 'Yes' : 'No',  // ⚠️ correct spelling
      tone_timing:   state.toneTiming ?? null, // BUG-307: explicit override so UI value takes precedence over _raw
      ...(state.clientId ? { client_id: state.clientId } : {}),
    }),
  },
};
