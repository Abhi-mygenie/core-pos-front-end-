# CR-147 — Delivery Management Page
## Gate 3: Implementation Plan

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Risk:** MEDIUM
**Sprint:** POS 6.0
**Gate 2 doc:** `/app/memory/impact/CR-147_IMPACT_ANALYSIS.md`
**Design ref:** `/app/frontend/public/mockups_preview.html`

---

## Entry Verification (confirmed 2026-08-22)

| # | Fact | Confirmed |
|---|---|---|
| 1 | Pages dir: `/app/frontend/src/pages/` (no settings/ subdir) | ✅ |
| 2 | `loadGoogleMaps()` singleton already exists in `AddressFormModal.jsx` lines 7–33 — reuse exact pattern | ✅ |
| 3 | Sidebar Settings children at lines 108–122 — insert after `restaurant-setup` (line 112) | ✅ |
| 4 | App.js `/restaurant-settings` route at line 201 — insert after | ✅ |
| 5 | `FOOD_COURT_ORDER_REPORT` constant at line 18 — insert after | ✅ |
| 6 | `REACT_APP_GOOGLE_MAPS_KEY` already in `.env` | ✅ |
| 7 | `deliveryConfigService.js` does not exist | ✅ |
| 8 | `DeliveryManagementPage.jsx` does not exist | ✅ |

---

## Scope Lock

**Files WILL change (5 files, 2 new):**
- `src/api/constants.js` — additive
- `src/api/services/deliveryConfigService.js` — **NEW**
- `src/pages/DeliveryManagementPage.jsx` — **NEW**
- `src/components/layout/Sidebar.jsx` — additive
- `src/App.js` — additive

**Files WILL NOT touch:**
`RestaurantSettingsPage.jsx` · `restaurantSettingsTransform.js` · `orderTransform.js` · `CollectPaymentPanel.jsx` · `AddressFormModal.jsx` (used as reference only)

---

## Edit 1 — `src/api/constants.js`

**Change:** Add `DELIVERY_CONFIG_ENDPOINTS` block after `FOOD_COURT_ORDER_REPORT`.

**Location:** Line 19 (after `FOOD_COURT_ORDER_REPORT` line 18).

**Before:**
```js
  FOOD_COURT_ORDER_REPORT: '/api/v1/vendoremployee/food-court-order-report', // CR-157
```

**After:**
```js
  FOOD_COURT_ORDER_REPORT: '/api/v1/vendoremployee/food-court-order-report', // CR-157
  // CR-147: Delivery Management
  DELIVERY_CONFIG:        '/api/v2/vendoremployee/restaurant-settings/delivery-config',
  UPDATE_DELIVERY_CONFIG: '/api/v2/vendoremployee/restaurant-settings/update-delivery-config',
  DELIVERY_CHARGES:       '/api/v2/vendoremployee/restaurant-settings/delivery-charges',
  DELIVERY_ZONES:         '/api/v2/vendoremployee/restaurant-settings/zones',
```

Note: Delete endpoint path is constructed in the service function:
`\`${DELIVERY_CHARGES}/{id}\`` → done inline in `deleteDeliveryCharge(id)`.

**Risk:** LOW — additive constants.

---

## Edit 2 — `src/api/services/deliveryConfigService.js` (NEW FILE)

**Full file:**
```js
// CR-147: Delivery Management Service
// Base: /api/v2/vendoremployee/restaurant-settings/
// Auth: vendoremployee token (restaurant resolved from token)

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Load existing delivery configuration + slabs.
 * Returns: { status, data: { restaurant, delivery_charges[] } }
 */
export async function getDeliveryConfig() {
  const res = await api.get(API_ENDPOINTS.DELIVERY_CONFIG);
  return res.data || {};
}

/**
 * Update basic delivery settings (lat/lng, toggles, contact).
 * Only sent keys are updated (patch semantics).
 * All boolean toggle fields must be "Yes" / "No" strings.
 *
 * @param {Object} payload - { zone_id?, latitude?, longitude?,
 *   delivery_fee?, surcharge?, validate_address_from_google?,
 *   delivery_person_name?, delivery_contact_no?,
 *   show_real_status_to_customer?, delivery_assign? }
 */
export async function updateDeliveryConfig(payload) {
  const res = await api.post(API_ENDPOINTS.UPDATE_DELIVERY_CONFIG, payload);
  return res.data || {};
}

/**
 * Add one or more distance slabs via parallel arrays.
 * All four arrays must be the same length.
 * For each index i: min_distance_km[i] < max_distance_km[i]
 *
 * @param {Object} payload - {
 *   min_distance_km: number[],
 *   max_distance_km: number[],
 *   min_order_value: number[],
 *   charge: number[]
 * }
 */
export async function addDeliveryCharges(payload) {
  const res = await api.post(API_ENDPOINTS.DELIVERY_CHARGES, payload);
  return res.data || {};
}

/**
 * Delete a single delivery charge slab.
 * @param {number} id - slab id from delivery_charges[].id
 */
export async function deleteDeliveryCharge(id) {
  const res = await api.delete(`${API_ENDPOINTS.DELIVERY_CHARGES}/${id}`);
  return res.data || {};
}

/**
 * Get list of delivery zones for the zone dropdown.
 * Returns: { data: [{ id, name }] }
 */
export async function getDeliveryZones() {
  const res = await api.get(API_ENDPOINTS.DELIVERY_ZONES);
  return res.data?.data || [];
}
```

**Risk:** LOW — new isolated service.

---

## Edit 3 — `src/pages/DeliveryManagementPage.jsx` (NEW FILE)

This is the main deliverable. Spec follows exactly the frozen design.

### 3.1 — Imports
```jsx
// CR-147: Delivery Management Page
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../contexts';
import {
  getDeliveryConfig, updateDeliveryConfig,
  addDeliveryCharges, deleteDeliveryCharge, getDeliveryZones,
} from '../api/services/deliveryConfigService';
import Sidebar from '../components/layout/Sidebar';
import {
  ArrowLeft, MapPin, Navigation, Loader2, Check,
  Plus, Trash2, ChevronDown, ChevronUp, Infinity,
  Save, Settings2, LayoutGrid,
} from 'lucide-react';
```

### 3.2 — Google Maps loader (reuse AddressFormModal.jsx pattern exactly)

```js
// CR-147: Google Maps SDK loader — same singleton pattern as AddressFormModal.jsx
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;
let _googleMapsLoaded = false;
let _googleMapsLoadPromise = null;

const loadGoogleMaps = () => {
  if (_googleMapsLoaded && window.google?.maps?.places) return Promise.resolve();
  if (_googleMapsLoadPromise) return _googleMapsLoadPromise;
  _googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { _googleMapsLoaded = true; resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true; script.defer = true;
    script.onload  = () => { _googleMapsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('[CR-147] Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return _googleMapsLoadPromise;
};
```

### 3.3 — Helper functions (outside component)

```js
// Yes/No string conversion for backend toggle fields
const toYN    = (bool) => bool ? 'Yes' : 'No';
const fromYN  = (str)  => str === 'Yes';

// Format currency
const fmtINR = (n) => `₹${parseFloat(n) || 0}`;

// Unique ID generator for matrix rows/cols
let _uid = 1;
const uid = () => `_${_uid++}`;

/**
 * Reconstruct matrix rows/cols/cells from flat slab array.
 * Input:  [{ id, min_distance_km, max_distance_km, min_order_value, charge }]
 * Output: { rows: [{id, from, to}], cols: [{id, from, toValue, isUnlimited}], cells: {'rowId-colId': charge} }
 */
const reconstructMatrix = (slabs) => {
  if (!slabs?.length) return { rows: [], cols: [], cells: {} };

  // Unique distance bands (rows) by [min, max] pair
  const distPairs = [...new Map(
    slabs.map(s => [`${s.min_distance_km}-${s.max_distance_km}`, { from: +s.min_distance_km, to: +s.max_distance_km }])
  ).values()].sort((a, b) => a.from - b.from);

  // Unique order tiers (cols) by min_order_value
  const orderVals = [...new Set(slabs.map(s => +s.min_order_value))].sort((a, b) => a - b);

  const rows = distPairs.map(p => ({ id: uid(), from: p.from, to: p.to }));
  const cols = orderVals.map((v, i) => ({
    id: uid(),
    from: v,
    toValue: orderVals[i + 1] ? orderVals[i + 1] - 1 : null,
    isUnlimited: i === orderVals.length - 1,
  }));

  const cells = {};
  rows.forEach(row => {
    cols.forEach(col => {
      const match = slabs.find(s =>
        +s.min_distance_km === row.from &&
        +s.max_distance_km === row.to &&
        +s.min_order_value === col.from
      );
      if (match !== undefined) {
        cells[`${row.id}-${col.id}`] = parseFloat(match.charge) || 0;
      }
    });
  });

  return { rows, cols, cells };
};

/**
 * Build POST /delivery-charges parallel arrays payload from matrix state.
 * Each matrix cell (row × col) = one slab entry.
 */
const buildSlabPayload = (rows, cols, cells) => {
  const min_distance_km = [];
  const max_distance_km = [];
  const min_order_value = [];
  const charge          = [];

  rows.forEach(row => {
    cols.forEach(col => {
      const key = `${row.id}-${col.id}`;
      min_distance_km.push(parseFloat(row.from) || 0);
      max_distance_km.push(parseFloat(row.to)   || 0);
      min_order_value.push(parseFloat(col.from) || 0);
      charge.push(parseFloat(cells[key]) || 0);
    });
  });

  return { min_distance_km, max_distance_km, min_order_value, charge };
};
```

### 3.4 — Component state
```js
export default function DeliveryManagementPage() {
  const navigate  = useNavigate();
  const { restaurant } = useRestaurant();

  // UI
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode,      setIsSilentMode]      = useState(false);
  const [sec1Open, setSec1Open] = useState(true);
  const [sec2Open, setSec2Open] = useState(true);

  // ── Section 1 state ──────────────────────────────────────────────
  const [zones,   setZones]   = useState([]);
  const [zoneId,  setZoneId]  = useState('');
  const [address, setAddress] = useState('');  // D3: editable, pre-filled from restaurant.address
  const [latitude,  setLatitude]  = useState('');
  const [longitude, setLongitude] = useState('');
  const [deliveryPersonName, setDeliveryPersonName] = useState('');
  const [deliveryContactNo,  setDeliveryContactNo]  = useState('');
  // D13: validate_address_from_google NOT exposed as toggle — sent as "Yes" always
  const [deliveryFee,        setDeliveryFee]        = useState(false);
  const [surcharge,          setSurcharge]          = useState(false);
  const [showRealStatus,     setShowRealStatus]      = useState(false);
  const [deliveryAssign,     setDeliveryAssign]      = useState(false);

  const [mapsReady,    setMapsReady]   = useState(false);
  const [isGeocoding,  setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null); // 'success' | 'error' | null
  const [savingBasic,  setSavingBasic] = useState(false);
  const [basicError,   setBasicError]  = useState(null);

  const inputRef       = useRef(null); // address input ref for Places Autocomplete
  const autocompleteRef = useRef(null);

  // ── Section 2 state ──────────────────────────────────────────────
  const [existingSlabs, setExistingSlabs] = useState([]); // raw from API (for delete ids)
  const [rows,  setRows]  = useState([]);  // [{ id, from, to }]
  const [cols,  setCols]  = useState([]);  // [{ id, from, toValue, isUnlimited }]
  const [cells, setCells] = useState({});  // { 'rowId-colId': number }
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixError,  setMatrixError]  = useState(null);
  const [showPayload,  setShowPayload]  = useState(false);

  const totalSlabs = rows.length * cols.length;
```

### 3.5 — Data loading & Google Maps init

```js
  // Load page data
  useEffect(() => {
    const loadAll = async () => {
      const [configRes, zonesData] = await Promise.all([
        getDeliveryConfig(),
        getDeliveryZones(),
      ]);

      setZones(zonesData || []);

      const rest = configRes?.data?.restaurant || {};
      setZoneId(String(rest.zone_id || ''));
      setLatitude(rest.latitude  || '');
      setLongitude(rest.longitude || '');
      setDeliveryPersonName(rest.delivery_person_name || '');
      setDeliveryContactNo(rest.delivery_contact_no  || '');
      setDeliveryFee(fromYN(rest.delivery_fee));
      setSurcharge(fromYN(rest.surcharge));
      setShowRealStatus(fromYN(rest.show_real_status_to_customer));
      setDeliveryAssign(fromYN(rest.delivery_assign));

      // D3: Pre-fill address from restaurant profile context
      setAddress(restaurant?.address || '');

      // Reconstruct matrix from existing slabs
      const slabs = configRes?.data?.delivery_charges || [];
      setExistingSlabs(slabs);
      const { rows: r, cols: c, cells: ce } = reconstructMatrix(slabs);
      setRows(r); setCols(c); setCells(ce);
    };
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load Google Maps SDK (D2)
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(err => console.error('[CR-147] Google Maps load failed:', err));
  }, []);

  // Init Places Autocomplete on address input (D2)
  const initAutocomplete = useCallback(() => {
    if (!mapsReady || !inputRef.current || autocompleteRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'in' },
      fields: ['formatted_address', 'geometry'],
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place?.geometry) return;
      const lat = place.geometry.location.lat().toString();
      const lng = place.geometry.location.lng().toString();
      setAddress(place.formatted_address || address);
      setLatitude(lat);
      setLongitude(lng);
      setGeocodeStatus('success');  // D2: auto-fill on place selection
    });
    autocompleteRef.current = ac;
  }, [mapsReady, address]);

  useEffect(() => { initAutocomplete(); }, [initAutocomplete]);
```

### 3.6 — Section 1 handlers

```js
  // [📍 Get Coordinates] button handler (D4: explicit button only)
  const handleGetCoordinates = async () => {
    if (!address.trim() || !mapsReady) return;
    setIsGeocoding(true); setGeocodeStatus(null);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result   = await geocoder.geocode({ address: address.trim() });
      if (result?.results?.[0]) {
        const loc = result.results[0].geometry.location;
        setLatitude(loc.lat().toString());
        setLongitude(loc.lng().toString());
        setGeocodeStatus('success');
      } else {
        setGeocodeStatus('error');
      }
    } catch {
      setGeocodeStatus('error');
    } finally {
      setIsGeocoding(false);
    }
  };

  // [Update Basic Setting] handler
  const handleSaveBasic = async () => {
    setSavingBasic(true); setBasicError(null);
    try {
      await updateDeliveryConfig({
        zone_id: zoneId ? Number(zoneId) : undefined,
        latitude:  latitude  || undefined,
        longitude: longitude || undefined,
        delivery_person_name: deliveryPersonName || undefined,
        delivery_contact_no:  deliveryContactNo  || undefined,
        delivery_fee:                  toYN(deliveryFee),
        surcharge:                     toYN(surcharge),
        show_real_status_to_customer:  toYN(showRealStatus),
        delivery_assign:               toYN(deliveryAssign),
        validate_address_from_google: 'Yes', // D13: always Yes (not exposed as toggle)
      });
      // show success toast (follow existing pattern — add a simple inline toast state)
    } catch (e) {
      setBasicError(e.readableMessage || 'Failed to update settings');
    } finally {
      setSavingBasic(false);
    }
  };
```

### 3.7 — Section 2: Matrix handlers

```js
  // Add distance band row (D9)
  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    const newFrom = lastRow ? lastRow.to : 0;
    setRows(prev => [...prev, { id: uid(), from: newFrom, to: newFrom + 1 }]);
  };

  // Update row from/to values
  const handleRowChange = (rowId, field, value) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: parseFloat(value) || 0 } : r));
  };

  // Delete a row (D9)
  const handleDeleteRow = (rowId) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    setCells(prev => {
      const next = { ...prev };
      Object.keys(next).filter(k => k.startsWith(`${rowId}-`)).forEach(k => delete next[k]);
      return next;
    });
  };

  // Add order value tier column (D9)
  const handleAddCol = () => {
    const lastCol = cols[cols.length - 1];
    // Previous last col loses isUnlimited
    setCols(prev => {
      const updated = prev.map((c, i) => i === prev.length - 1 ? { ...c, isUnlimited: false, toValue: (lastCol?.from || 0) + 499 } : c);
      return [...updated, { id: uid(), from: lastCol ? lastCol.from + 500 : 0, toValue: null, isUnlimited: true }];
    });
  };

  // Update col from/to values
  const handleColChange = (colId, field, value) => {
    setCols(prev => prev.map(c => c.id === colId ? { ...c, [field]: parseFloat(value) || 0 } : c));
  };

  // Delete a column
  const handleDeleteCol = (colId) => {
    setCols(prev => {
      const filtered = prev.filter(c => c.id !== colId);
      // Last remaining col becomes unlimited
      if (filtered.length > 0) filtered[filtered.length - 1].isUnlimited = true;
      return filtered;
    });
    setCells(prev => {
      const next = { ...prev };
      Object.keys(next).filter(k => k.endsWith(`-${colId}`)).forEach(k => delete next[k]);
      return next;
    });
  };

  // Update a single cell value (D6: inline editing)
  const handleCellChange = (rowId, colId, value) => {
    const key = `${rowId}-${colId}`;
    setCells(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  // [Save All Slabs (N)] handler (D11)
  const handleSaveMatrix = async () => {
    if (!rows.length || !cols.length) {
      setMatrixError('Add at least one distance band and one order tier before saving.');
      return;
    }
    // Validate rows: min < max
    const invalidRow = rows.find(r => parseFloat(r.from) >= parseFloat(r.to));
    if (invalidRow) {
      setMatrixError('Each distance band must have Min Distance less than Max Distance.');
      return;
    }
    setSavingMatrix(true); setMatrixError(null);
    try {
      // Delete all existing slabs first, then re-add
      for (const slab of existingSlabs) {
        await deleteDeliveryCharge(slab.id);
      }
      const payload = buildSlabPayload(rows, cols, cells);
      if (payload.charge.length > 0) {
        await addDeliveryCharges(payload);
      }
      // Reload to get fresh ids
      const res = await getDeliveryConfig();
      const newSlabs = res?.data?.delivery_charges || [];
      setExistingSlabs(newSlabs);
      // show success toast
    } catch (e) {
      setMatrixError(e.readableMessage || 'Failed to save delivery charges');
    } finally {
      setSavingMatrix(false);
    }
  };

  // Load template (3×6) — D10 empty state shortcut
  const handleLoadTemplate = () => {
    const tRows = [
      { id: uid(), from: 0, to: 1 }, { id: uid(), from: 1, to: 2 },
      { id: uid(), from: 2, to: 3 }, { id: uid(), from: 3, to: 4 },
      { id: uid(), from: 4, to: 5 }, { id: uid(), from: 5, to: 6 },
    ];
    const tCols = [
      { id: uid(), from: 0, toValue: 199, isUnlimited: false },
      { id: uid(), from: 200, toValue: 499, isUnlimited: false },
      { id: uid(), from: 500, toValue: null, isUnlimited: true },
    ];
    setRows(tRows); setCols(tCols); setCells({});
  };
```

### 3.8 — JSX structure

```jsx
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden" data-testid="delivery-management-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false}
      />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10"
             data-testid="delivery-mgmt-header">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-lg text-zinc-500 hover:border-[#F26B33] hover:text-[#F26B33] transition-colors"
            data-testid="delivery-mgmt-back-btn">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900" data-testid="delivery-mgmt-title">
              Delivery Management
            </h1>
            <p className="text-xs text-zinc-400">Configure restaurant location, delivery rules and distance-based charges</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-w-4xl">

          {/* ── SECTION 1: Basic Settings ──────────────────────────────── */}
          <div className="bg-white border border-zinc-200 rounded-xl mb-6 overflow-hidden" data-testid="section-basic-settings">
            {/* Section header — collapsible */}
            <button className="w-full flex items-center justify-between px-6 py-4 bg-zinc-50/80 border-b border-zinc-200 hover:bg-zinc-100/70 transition-colors"
                    onClick={() => setSec1Open(v => !v)}
                    data-testid="section-basic-settings-toggle">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Settings2 className="w-4 h-4 text-[#329937]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-700 text-zinc-900">Basic Settings &amp; Restaurant Location</div>
                  <div className="text-xs text-zinc-400">Address geocoding, lat/lng, delivery personnel, operational toggles</div>
                </div>
              </div>
              {sec1Open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {sec1Open && (
              <div className="p-6 space-y-6">

                {/* Restaurant Location & Geocoding block */}
                <div className="border border-zinc-200 rounded-xl p-5 space-y-4 bg-zinc-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#F26B33]" />
                      <span className="text-sm font-semibold text-zinc-800">Restaurant Location &amp; Geocoding</span>
                      <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-[#F26B33] font-semibold rounded uppercase tracking-wide">Critical UX Flow</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Pre-filled from Restaurant Profile · Always editable</span>
                  </div>

                  {/* Address field + [Get Coordinates] button (D2, D3, D4) */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Full Restaurant Address *
                      <span className="ml-1 text-zinc-400 normal-case font-normal">Type new address to re-calculate coordinates</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        {mapsReady && <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />}
                        <input
                          ref={inputRef}
                          type="text"
                          autoComplete="off"
                          data-form-type="other"
                          value={address}
                          onChange={e => { setAddress(e.target.value); setGeocodeStatus(null); }}
                          placeholder={mapsReady ? "Start typing to see suggestions..." : "Loading Google Maps..."}
                          className={`w-full border rounded-lg py-2.5 text-sm text-zinc-800 outline-none transition-colors focus:border-[#F26B33] ${mapsReady ? 'pl-9 pr-3' : 'px-3'}`}
                          style={{ borderColor: geocodeStatus === 'success' ? '#329937' : geocodeStatus === 'error' ? '#EF4444' : '#E5E7EB' }}
                          data-testid="delivery-address-input"
                        />
                        {!mapsReady && GOOGLE_MAPS_KEY && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" />
                        )}
                      </div>
                      {/* [Get Coordinates] button (D4: explicit button) */}
                      <button
                        onClick={handleGetCoordinates}
                        disabled={isGeocoding || !address.trim() || !mapsReady}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#F26B33] hover:bg-[#d95720] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                        data-testid="get-coordinates-btn">
                        {isGeocoding
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Geocoding...</>
                          : <><Navigation className="w-3.5 h-3.5" /> Get Coordinates</>}
                      </button>
                    </div>
                    {geocodeStatus === 'success' && (
                      <p className="text-[11px] text-[#329937] mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Coordinates auto-filled from Google Maps
                      </p>
                    )}
                    {geocodeStatus === 'error' && (
                      <p className="text-[11px] text-red-500 mt-1">
                        ⚠ Address not found. Try a more specific address or enter coordinates manually.
                      </p>
                    )}
                  </div>

                  {/* Latitude + Longitude (D5: always manually editable) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Latitude (LAT)
                        <span className="ml-1 text-zinc-400 normal-case font-normal">Manual &amp; Auto-fill</span>
                      </label>
                      <input
                        type="text"
                        value={latitude}
                        onChange={e => { setLatitude(e.target.value); setGeocodeStatus(null); }}
                        placeholder="e.g. 12.9715987"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono outline-none transition-colors focus:border-[#F26B33] ${latitude && geocodeStatus === 'success' ? 'bg-green-50 border-green-300 text-green-700' : 'text-zinc-800'}`}
                        style={{ borderColor: latitude && geocodeStatus === 'success' ? '#329937' : '#E5E7EB' }}
                        data-testid="delivery-latitude-input"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1">Directly editable if geocoder is inaccurate</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Longitude (LNG)
                        <span className="ml-1 text-zinc-400 normal-case font-normal">Manual &amp; Auto-fill</span>
                      </label>
                      <input
                        type="text"
                        value={longitude}
                        onChange={e => { setLongitude(e.target.value); setGeocodeStatus(null); }}
                        placeholder="e.g. 77.5945627"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono outline-none transition-colors focus:border-[#F26B33] ${longitude && geocodeStatus === 'success' ? 'bg-green-50 border-green-300 text-green-700' : 'text-zinc-800'}`}
                        style={{ borderColor: longitude && geocodeStatus === 'success' ? '#329937' : '#E5E7EB' }}
                        data-testid="delivery-longitude-input"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1">Directly editable if geocoder is inaccurate</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400 bg-zinc-100 rounded-lg px-3 py-2">
                    💡 These coordinates are used as the <strong>origin</strong> in <code>POST /distance-api-new</code> to calculate delivery charges per order.
                  </div>
                </div>

                {/* Zone + Delivery Personnel row */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">Delivery Zone</label>
                    <select
                      value={zoneId}
                      onChange={e => setZoneId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#F26B33] bg-white"
                      data-testid="delivery-zone-select">
                      <option value="">Select zone...</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <p className="text-[10px] text-zinc-400 mt-1">Populated from GET /zones</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">Primary Delivery Staff</label>
                    <input type="text" value={deliveryPersonName} onChange={e => setDeliveryPersonName(e.target.value)}
                      placeholder="Default rider name"
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#F26B33]"
                      data-testid="delivery-person-name-input" />
                    <p className="text-[10px] text-zinc-400 mt-1">Default contact for store fleet</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">Delivery Phone</label>
                    <input type="tel" value={deliveryContactNo} onChange={e => setDeliveryContactNo(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#F26B33]"
                      data-testid="delivery-contact-no-input" />
                    <p className="text-[10px] text-zinc-400 mt-1">Printed on delivery bill slips</p>
                  </div>
                </div>

                {/* Operational toggles grid (4 toggles in 2×2) */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">Operational Flags &amp; Dispatch Rules</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'delivery-fee', label: 'Delivery Fee', desc: 'Enable fee billing', val: deliveryFee, set: setDeliveryFee, testId: 'toggle-delivery-fee' },
                      { id: 'surcharge', label: 'Peak Surcharge', desc: 'Rain / night surge', val: surcharge, set: setSurcharge, testId: 'toggle-surcharge' },
                      { id: 'real-status', label: 'Real Status', desc: 'Customer live link', val: showRealStatus, set: setShowRealStatus, testId: 'toggle-real-status' },
                      { id: 'auto-assign', label: 'Auto Assign', desc: 'Rider round-robin', val: deliveryAssign, set: setDeliveryAssign, testId: 'toggle-delivery-assign' },
                    ].map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg bg-zinc-50/40">
                        <div>
                          <div className="text-sm font-medium text-zinc-800">{t.label}</div>
                          <div className="text-[11px] text-zinc-400">{t.desc}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer" data-testid={t.testId}>
                          <input type="checkbox" className="sr-only" checked={t.val} onChange={e => t.set(e.target.checked)} />
                          <div className={`w-11 h-6 rounded-full transition-colors ${t.val ? 'bg-[#329937]' : 'bg-zinc-300'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${t.val ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Basic Settings save */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <p className="text-[11px] text-zinc-400">Changes here update store coordinates and fleet rules globally.</p>
                  {basicError && <p className="text-[11px] text-red-500 mr-auto ml-4">{basicError}</p>}
                  <button
                    onClick={handleSaveBasic}
                    disabled={savingBasic}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#329937] hover:bg-[#287a2d] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                    data-testid="update-basic-setting-btn">
                    {savingBasic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {savingBasic ? 'Updating...' : 'Update Basic Setting'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 2: Delivery Charges Matrix ───────────────────── */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="section-delivery-charges">
            {/* Section header — collapsible */}
            <button className="w-full flex items-center justify-between px-6 py-4 bg-zinc-50/80 border-b border-zinc-200 hover:bg-zinc-100/70 transition-colors"
                    onClick={() => setSec2Open(v => !v)}
                    data-testid="section-delivery-charges-toggle">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4 text-[#F26B33]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-700 text-zinc-900">Distance-Based Delivery Charges</div>
                  <div className="text-xs text-zinc-400">Tiered distance pricing automatically applied during delivery order billing</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {rows.length > 0 && cols.length > 0 && (
                  <span className="text-[11px] text-zinc-400">{totalSlabs} slabs ({rows.length} rows × {cols.length} cols)</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleAddCol(); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                  data-testid="add-order-tier-btn">
                  <Plus className="w-3 h-3" /> Add Order Tier (Col)
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleSaveMatrix(); }}
                  disabled={savingMatrix || totalSlabs === 0}
                  className="flex items-center gap-2 px-4 py-1.5 bg-[#329937] hover:bg-[#287a2d] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  data-testid="save-all-slabs-btn">
                  {savingMatrix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingMatrix ? 'Saving...' : `Save All Slabs (${totalSlabs})`}
                </button>
                {sec2Open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </div>
            </button>

            {sec2Open && (
              <div className="p-6">
                {/* D10: Empty state — 3-step guided setup */}
                {rows.length === 0 && cols.length === 0 ? (
                  <div className="text-center py-8" data-testid="matrix-empty-state">
                    <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <LayoutGrid className="w-7 h-7 text-[#F26B33]" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-800 mb-2">Create Your Delivery Charges Matrix</h3>
                    <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
                      No delivery slabs configured yet. Follow the 3-step setup below to build your delivery rate card from scratch.
                    </p>
                    <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                      {/* Step 1 */}
                      <div className="border-2 border-dashed border-green-200 rounded-xl p-4 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-6 h-6 bg-[#329937] text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                          <span className="text-[10px] font-semibold text-[#329937] uppercase tracking-wide">Columns</span>
                        </div>
                        <div className="text-sm font-semibold text-zinc-800 mb-1">Define Order Value Tiers</div>
                        <div className="text-xs text-zinc-500 mb-3">e.g. ₹0–₹199, ₹200–₹499, ₹500+</div>
                        <button onClick={handleAddCol}
                          className="w-full flex items-center justify-center gap-1 py-2 bg-[#329937] text-white text-xs font-semibold rounded-lg hover:bg-[#287a2d] transition-colors"
                          data-testid="empty-add-tier-btn">
                          <Plus className="w-3 h-3" /> Add Order Tier
                        </button>
                      </div>
                      {/* Step 2 */}
                      <div className="border-2 border-dashed border-orange-200 rounded-xl p-4 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-6 h-6 bg-[#F26B33] text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                          <span className="text-[10px] font-semibold text-[#F26B33] uppercase tracking-wide">Rows</span>
                        </div>
                        <div className="text-sm font-semibold text-zinc-800 mb-1">Define Distance Bands</div>
                        <div className="text-xs text-zinc-500 mb-3">e.g. 0–1km, 1–2km, 2–3km</div>
                        <button onClick={handleAddRow}
                          className="w-full flex items-center justify-center gap-1 py-2 bg-[#F26B33] text-white text-xs font-semibold rounded-lg hover:bg-[#d95720] transition-colors"
                          data-testid="empty-add-band-btn">
                          <Plus className="w-3 h-3" /> Add Distance Band
                        </button>
                      </div>
                      {/* Step 3 */}
                      <div className="border-2 border-dashed border-zinc-200 rounded-xl p-4 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-6 h-6 bg-zinc-800 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Rate Grid</span>
                        </div>
                        <div className="text-sm font-semibold text-zinc-800 mb-1">Fill in Delivery Charges</div>
                        <div className="text-xs text-zinc-500 mb-3">Once rows and columns are added, fill delivery rates in the grid or click Free.</div>
                        <button onClick={handleLoadTemplate}
                          className="w-full flex items-center justify-center gap-1 py-2 border border-zinc-300 text-zinc-600 text-xs font-semibold rounded-lg hover:bg-zinc-50 transition-colors"
                          data-testid="load-template-btn">
                          Load Standard 3×6 Template
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Matrix grid */
                  <div data-testid="delivery-charges-matrix">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            {/* Corner cell */}
                            <th className="min-w-[160px] p-2 text-left border-b-2 border-r-2 border-zinc-200">
                              <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">DISTANCE \ ORDER VALUE</div>
                              <div className="text-[10px] font-semibold text-zinc-600">Distance Range (km)</div>
                            </th>
                            {/* Column headers (D7: two inputs each) */}
                            {cols.map((col, ci) => (
                              <th key={col.id} className="min-w-[180px] p-2 border-b-2 border-r border-zinc-200 bg-zinc-50/50"
                                  data-testid={`col-header-${col.id}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[9px] font-semibold text-zinc-400 uppercase">TIER {ci + 1}{col.isUnlimited ? ' · Unlimited' : ''}</span>
                                  <button onClick={() => handleDeleteCol(col.id)}
                                    className="p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors"
                                    data-testid={`delete-col-${col.id}`}>
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-zinc-400">₹</span>
                                  <input type="number" min="0" value={col.from}
                                    onChange={e => handleColChange(col.id, 'from', e.target.value)}
                                    className="w-16 border border-zinc-200 rounded px-1.5 py-1 text-xs text-zinc-700 text-center outline-none focus:border-[#329937] bg-white"
                                    data-testid={`col-from-${col.id}`} />
                                  <span className="text-[10px] text-zinc-400">—</span>
                                  {col.isUnlimited ? (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded text-xs text-zinc-500 font-medium">
                                      <Infinity className="w-3 h-3" />
                                      <span>no limit</span>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-[10px] text-zinc-400">₹</span>
                                      <input type="number" min="0" value={col.toValue ?? ''}
                                        onChange={e => handleColChange(col.id, 'toValue', e.target.value)}
                                        className="w-16 border border-zinc-200 rounded px-1.5 py-1 text-xs text-zinc-700 text-center outline-none focus:border-[#329937] bg-white"
                                        data-testid={`col-to-${col.id}`} />
                                    </>
                                  )}
                                </div>
                                <div className="text-[9px] text-zinc-400 mt-1">
                                  min_order_value: <strong className="text-zinc-600">₹{col.from}</strong>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(row => (
                            <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/30 transition-colors"
                                data-testid={`matrix-row-${row.id}`}>
                              {/* Row header (D8: two km inputs) */}
                              <td className="p-2 border-r-2 border-zinc-200 bg-zinc-50/30" data-testid={`row-header-${row.id}`}>
                                <div className="flex items-center gap-1">
                                  <input type="number" min="0" step="0.5" value={row.from}
                                    onChange={e => handleRowChange(row.id, 'from', e.target.value)}
                                    className="w-14 border border-zinc-200 rounded px-1.5 py-1 text-xs text-zinc-700 text-center outline-none focus:border-[#329937] bg-white"
                                    data-testid={`row-from-${row.id}`} />
                                  <span className="text-[10px] text-zinc-400">—</span>
                                  <input type="number" min="0" step="0.5" value={row.to}
                                    onChange={e => handleRowChange(row.id, 'to', e.target.value)}
                                    className="w-14 border border-zinc-200 rounded px-1.5 py-1 text-xs text-zinc-700 text-center outline-none focus:border-[#329937] bg-white"
                                    data-testid={`row-to-${row.id}`} />
                                  <span className="text-[10px] text-zinc-400">km</span>
                                  <button onClick={() => handleDeleteRow(row.id)}
                                    className="ml-1 p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors"
                                    data-testid={`delete-row-${row.id}`}>
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              {/* Cells (D6: inline editable + Free checkbox) */}
                              {cols.map(col => {
                                const key     = `${row.id}-${col.id}`;
                                const val     = cells[key] ?? 0;
                                const isFree  = val === 0;
                                return (
                                  <td key={col.id} className="p-2 border-r border-zinc-100"
                                      data-testid={`cell-${row.id}-${col.id}`}>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-zinc-400">₹</span>
                                      <input
                                        type="number" min="0" step="1"
                                        value={val}
                                        onChange={e => handleCellChange(row.id, col.id, e.target.value)}
                                        className={`w-20 border rounded px-2 py-1.5 text-xs text-center outline-none focus:border-[#329937] transition-colors ${isFree ? 'bg-green-50 border-green-200 text-green-700' : 'border-zinc-200 bg-white text-zinc-800'}`}
                                        data-testid={`cell-input-${row.id}-${col.id}`}
                                      />
                                      <button
                                        onClick={() => handleCellChange(row.id, col.id, 0)}
                                        className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors ${isFree ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500 hover:bg-green-50 hover:text-green-600'}`}
                                        data-testid={`cell-free-${row.id}-${col.id}`}>
                                        Free
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {/* Add Row button row */}
                          <tr>
                            <td colSpan={cols.length + 1} className="p-2">
                              <button onClick={handleAddRow}
                                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#F26B33] transition-colors"
                                data-testid="add-distance-band-btn">
                                <Plus className="w-3.5 h-3.5" /> Add Distance Band (Row)
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Matrix footer: legend + save */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" />
                          Free Delivery (₹0)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm bg-zinc-50 border border-zinc-200 inline-block" />
                          Chargeable Slab
                        </span>
                        <span className="text-zinc-400">• Press Tab to move across cells quickly</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowPayload(v => !v)}
                          className="px-3 py-2 text-xs font-semibold text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                          data-testid="inspect-wire-json-btn">
                          Inspect Wire JSON
                        </button>
                        {matrixError && <p className="text-[11px] text-red-500">{matrixError}</p>}
                      </div>
                    </div>

                    {/* Wire JSON preview (collapsible) */}
                    {showPayload && (
                      <div className="mt-3 p-4 bg-zinc-900 rounded-xl overflow-x-auto" data-testid="wire-json-preview">
                        <p className="text-[10px] text-zinc-400 mb-2 uppercase tracking-wide">POST /delivery-charges payload</p>
                        <pre className="text-[11px] text-green-400 font-mono">
                          {JSON.stringify(buildSlabPayload(rows, cols, cells), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>{/* /content */}
      </div>
    </div>
  );
}
```

---

## Edit 4 — `src/components/layout/Sidebar.jsx`

**Change:** Add "Delivery Management" entry in Settings children, after `restaurant-setup`.

**Location:** Line 113 (after `restaurant-setup` entry).

**Before:**
```js
      { id: "restaurant-setup", label: "Restaurant Setup", path: "/restaurant-settings" },
      { id: "table-management", label: "Table Management", path: "/settings" }, // CR-060
```

**After:**
```js
      { id: "restaurant-setup", label: "Restaurant Setup", path: "/restaurant-settings" },
      { id: "delivery-management", label: "Delivery Management", path: "/delivery-management" }, // CR-147
      { id: "table-management", label: "Table Management", path: "/settings" }, // CR-060
```

**Risk:** LOW — additive sidebar entry.

---

## Edit 5 — `src/App.js`

**Edit 5a — Import** (after `RestaurantSettingsPage` import, line ~58):

**Before:**
```js
import RestaurantSettingsPage from "./pages/RestaurantSettingsPage";
```

**After:**
```js
import RestaurantSettingsPage from "./pages/RestaurantSettingsPage";
import DeliveryManagementPage from "./pages/DeliveryManagementPage"; // CR-147
```

**Edit 5b — Route** (after `/restaurant-settings` route, line ~201):

**Before:**
```jsx
              {/* CR-019: Restaurant Settings Self-Onboarding Wizard */}
              <Route path="/restaurant-settings" element={<ProtectedRoute><RestaurantSettingsPage /></ProtectedRoute>} />
```

**After:**
```jsx
              {/* CR-019: Restaurant Settings Self-Onboarding Wizard */}
              <Route path="/restaurant-settings" element={<ProtectedRoute><RestaurantSettingsPage /></ProtectedRoute>} />
              {/* CR-147: Delivery Management */}
              <Route path="/delivery-management" element={<ProtectedRoute><DeliveryManagementPage /></ProtectedRoute>} />
```

**Risk:** LOW — additive import and route.

---

## Execution Sequence

```
1. Edit 1 — constants.js                   (no dependencies)
2. Edit 2 — deliveryConfigService.js        (depends on Edit 1 for API_ENDPOINTS)
3. Edit 4 — Sidebar.jsx                     (no dependencies)
4. Edit 5a — App.js import                  (no dependencies)
5. Edit 3 — DeliveryManagementPage.jsx      (depends on Edit 2)
6. Edit 5b — App.js route                   (depends on Edit 3 — file must exist)
```

Webpack compile check after Edit 5b.

---

## Verification Matrix (20 items, matches Gate 2)

| # | Check | File | How |
|---|---|---|---|
| 1 | `DELIVERY_CONFIG`, `UPDATE_DELIVERY_CONFIG`, `DELIVERY_CHARGES`, `DELIVERY_ZONES` in constants | `constants.js` | `grep -n "DELIVERY_CONFIG"` |
| 2 | All 5 service functions exported | `deliveryConfigService.js` | `grep -n "export async"` |
| 3 | Sidebar entry `delivery-management` after `restaurant-setup` | `Sidebar.jsx` | `grep -n "delivery-management"` |
| 4 | App.js import + route | `App.js` | `grep -n "DeliveryManagementPage"` |
| 5 | `/delivery-management` loads without 404 | Browser | Navigate to URL |
| 6 | Sidebar "Delivery Management" active when on page | Browser | Active state shown |
| 7 | Page loads config from GET /delivery-config | Browser | Fields populated |
| 8 | Address pre-filled from `restaurant.address` profile | Browser | Visible |
| 9 | Typing in address → Places Autocomplete dropdown (D2) | Browser | Suggestions appear |
| 10 | Selecting a Place → lat/lng auto-fills immediately (D2) | Browser Network | No extra API call |
| 11 | [Get Coordinates] button → geocodes typed address (D4) | Browser Network | Geocoder call |
| 12 | Lat/lng fields manually editable after auto-fill (D5) | Browser | Can override |
| 13 | [Update Basic Setting] → POST /update-delivery-config (D1) | Browser Network | Success toast |
| 14 | Empty state: 3-step guided setup shows when no slabs (D10) | Browser | Cards visible |
| 15 | [Load Standard 3×6 Template] creates 6 rows + 3 cols (D10) | Browser | Grid appears |
| 16 | [+ Add Order Tier (Col)] → new col with From/To ₹ inputs (D9) | Browser | Column added |
| 17 | Last column shows ∞ no limit badge (D7) | Browser | ∞ visible |
| 18 | [+ Add Distance Band (Row)] → new row with From/To km (D8, D9) | Browser | Row added |
| 19 | Cell inline editing: click → type charge (D6) | Browser | Value updates |
| 20 | [Save All Slabs (N)] → POST /delivery-charges parallel arrays (D11) | Browser Network | Correct format |
| 21 | min_order_value = column From ₹ value (D12) | Network payload | JSON verified |
| 22 | Delete row → row + cells removed | Browser | Row gone |
| 23 | Delete column → column + cells removed | Browser | Col gone |
| 24 | [Inspect Wire JSON] → shows payload | Browser | JSON visible |
| 25 | GET /zones populates zone dropdown | Browser | Options appear |
| 26 | Webpack: 0 new warnings | Log | `tail -3 frontend.out.log` |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-147 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: CR-147 row → Gate 5 IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: constants.js, deliveryConfigService.js (NEW), DeliveryManagementPage.jsx (NEW), Sidebar.jsx, App.js (CR-147, 2026-08-22)
- [ ] Code markers: // CR-147 in every file
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Google Maps SDK already loaded by AddressFormModal | LOW | Module-level singleton (`_googleMapsLoaded`) prevents double-load |
| Matrix state complexity | MEDIUM | `reconstructMatrix()` + `buildSlabPayload()` are pure functions — unit testable |
| Delete-all-then-re-add approach | MEDIUM | Best approach given backend has no bulk-update endpoint. Delete loop runs sequentially. |
| `validate_address_from_google` backend field | LOW | Always send `"Yes"` (D13) — backend accepts it, no UI toggle |
| Phone input validation | LOW | `delivery_contact_no` accepts max 20 chars per backend schema |

---

Planning complete: CR-147
Stage: Gate 3 — Implementation Plan
Code reality: NONE (2 new files)
Risk: MEDIUM
Files WILL change: constants.js · deliveryConfigService.js (NEW) · DeliveryManagementPage.jsx (NEW) · Sidebar.jsx · App.js
Files WILL NOT touch: RestaurantSettingsPage.jsx · restaurantSettingsTransform.js · AddressFormModal.jsx
Owner decisions: 13/13 locked
Design: FROZEN at /app/frontend/public/mockups_preview.html
Next: Gate 4 GO → Implementation
