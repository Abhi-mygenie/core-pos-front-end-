/**
 * DeliveryManagementPage — CR-147 (POS 6.0)
 *
 * Delivery configuration: restaurant location (Google Places + Get Coordinates)
 * + delivery toggles + distance-based charge matrix (spreadsheet UX).
 *
 * Design frozen: /app/frontend/public/mockups_preview.html
 * Backend doc:   /app/memory/evidence/CR-147/deliver.md
 */
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
  Plus, Trash2, ChevronDown, ChevronUp,
  Save, Settings2, LayoutGrid, Code,
} from 'lucide-react';

// ── Google Maps SDK loader (same singleton pattern as AddressFormModal.jsx) ──
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const toYN   = (bool) => bool ? 'Yes' : 'No';
const fromYN = (str)  => str  === 'Yes';

let _uid = Date.now();
const uid = () => `_${_uid++}`;

/**
 * Reconstruct matrix rows/cols/cells from flat slab array returned by GET /delivery-config.
 */
const reconstructMatrix = (slabs) => {
  if (!slabs?.length) return { rows: [], cols: [], cells: {} };

  const distPairs = [...new Map(
    slabs.map(s => [`${+s.min_distance_km}-${+s.max_distance_km}`,
      { from: +s.min_distance_km, to: +s.max_distance_km }])
  ).values()].sort((a, b) => a.from - b.from);

  const orderVals = [...new Set(slabs.map(s => +s.min_order_value))].sort((a, b) => a - b);

  const rows = distPairs.map(p => ({ id: uid(), from: p.from, to: p.to }));
  const cols = orderVals.map((v, i) => ({
    id: uid(),
    from: v,
    toValue: orderVals[i + 1] != null ? orderVals[i + 1] - 1 : null,
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
      if (match) cells[`${row.id}-${col.id}`] = parseFloat(match.charge) || 0;
    });
  });

  return { rows, cols, cells };
};

/**
 * Build POST /delivery-charges parallel arrays payload from matrix state.
 * Each matrix cell (row × col) = one slab entry.
 * min_order_value = column From ₹ value (D12).
 */
const buildSlabPayload = (rows, cols, cells) => {
  const min_distance_km = [], max_distance_km = [], min_order_value = [], charge = [];
  rows.forEach(row => {
    cols.forEach(col => {
      min_distance_km.push(parseFloat(row.from) || 0);
      max_distance_km.push(parseFloat(row.to)   || 0);
      min_order_value.push(parseFloat(col.from) || 0);
      charge.push(parseFloat(cells[`${row.id}-${col.id}`]) || 0);
    });
  });
  return { min_distance_km, max_distance_km, min_order_value, charge };
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function DeliveryManagementPage() {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();

  // Sidebar
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // Section collapse
  const [sec1Open, setSec1Open] = useState(true);
  const [sec2Open, setSec2Open] = useState(true);

  // ── Section 1 state ───────────────────────────────────────────────
  const [zones,    setZones]   = useState([]);
  const [zoneId,   setZoneId]  = useState('');
  const [address,  setAddress] = useState(''); // D3: editable, pre-filled from restaurant.address
  const [latitude,  setLatitude]  = useState('');
  const [longitude, setLongitude] = useState('');
  const [deliveryPersonName, setDeliveryPersonName] = useState('');
  const [deliveryContactNo,  setDeliveryContactNo]  = useState('');
  const [deliveryFee,    setDeliveryFee]    = useState(false);
  const [surcharge,      setSurcharge]      = useState(false);
  const [showRealStatus, setShowRealStatus]  = useState(false);
  const [deliveryAssign, setDeliveryAssign]  = useState(false);

  const [mapsReady,     setMapsReady]     = useState(false);
  const [isGeocoding,   setIsGeocoding]   = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null); // 'success' | 'error' | null
  const [savingBasic,   setSavingBasic]   = useState(false);
  const [basicSaved,    setBasicSaved]    = useState(false);
  const [basicError,    setBasicError]    = useState(null);
  const [loading,       setLoading]       = useState(true);

  const inputRef        = useRef(null);
  const autocompleteRef = useRef(null);

  // ── Section 2 state ───────────────────────────────────────────────
  const [existingSlabs, setExistingSlabs] = useState([]);
  const [rows,  setRows]  = useState([]);
  const [cols,  setCols]  = useState([]);
  const [cells, setCells] = useState({});
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixSaved,  setMatrixSaved]  = useState(false);
  const [matrixError,  setMatrixError]  = useState(null);
  const [showPayload,  setShowPayload]  = useState(false);

  const totalSlabs = rows.length * cols.length;

  // ── Load page data ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [configRes, zonesData] = await Promise.all([
          getDeliveryConfig().catch(() => ({})),
          getDeliveryZones().catch(() => []),
        ]);
        setZones(zonesData || []);
        const rest = configRes?.data?.restaurant || {};
        setZoneId(String(rest.zone_id || ''));
        setLatitude(rest.latitude   || '');
        setLongitude(rest.longitude  || '');
        setDeliveryPersonName(rest.delivery_person_name || '');
        setDeliveryContactNo(rest.delivery_contact_no  || '');
        setDeliveryFee(fromYN(rest.delivery_fee));
        setSurcharge(fromYN(rest.surcharge));
        setShowRealStatus(fromYN(rest.show_real_status_to_customer));
        setDeliveryAssign(fromYN(rest.delivery_assign));
        // D3: pre-fill address from profile context
        setAddress(restaurant?.address || '');
        const slabs = configRes?.data?.delivery_charges || [];
        setExistingSlabs(slabs);
        const { rows: r, cols: c, cells: ce } = reconstructMatrix(slabs);
        setRows(r); setCols(c); setCells(ce);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load Google Maps SDK (D2) ─────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(err => console.error('[CR-147] Google Maps load failed:', err));
  }, []);

  // ── Init Places Autocomplete (D2) ────────────────────────────────
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
      setAddress(place.formatted_address || address);
      setLatitude(place.geometry.location.lat().toString());
      setLongitude(place.geometry.location.lng().toString());
      setGeocodeStatus('success'); // D2: auto-fill on place selection
    });
    autocompleteRef.current = ac;
  }, [mapsReady, address]);

  useEffect(() => { initAutocomplete(); }, [initAutocomplete]);

  // ── [Get Coordinates] button handler (D4: explicit button only) ───
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

  // ── [Update Basic Setting] ────────────────────────────────────────
  const handleSaveBasic = async () => {
    setSavingBasic(true); setBasicError(null); setBasicSaved(false);
    try {
      await updateDeliveryConfig({
        ...(zoneId ? { zone_id: Number(zoneId) } : {}),
        ...(latitude  ? { latitude }  : {}),
        ...(longitude ? { longitude } : {}),
        ...(deliveryPersonName ? { delivery_person_name: deliveryPersonName } : {}),
        ...(deliveryContactNo  ? { delivery_contact_no:  deliveryContactNo  } : {}),
        delivery_fee:                 toYN(deliveryFee),
        surcharge:                    toYN(surcharge),
        show_real_status_to_customer: toYN(showRealStatus),
        delivery_assign:              toYN(deliveryAssign),
        validate_address_from_google: 'Yes', // D13: always Yes, not exposed as toggle
      });
      setBasicSaved(true);
      setTimeout(() => setBasicSaved(false), 2500);
    } catch (e) {
      setBasicError(e.readableMessage || e.message || 'Failed to update settings');
    } finally {
      setSavingBasic(false);
    }
  };

  // ── Matrix: row/col/cell handlers ────────────────────────────────
  const handleAddRow = () => {
    const last = rows[rows.length - 1];
    const newFrom = last ? last.to : 0;
    setRows(prev => [...prev, { id: uid(), from: newFrom, to: newFrom + 1 }]);
  };

  const handleRowChange = (rowId, field, value) =>
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value === '' ? '' : parseFloat(value) ?? 0 } : r));

  const handleDeleteRow = (rowId) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    setCells(prev => {
      const next = { ...prev };
      Object.keys(next).filter(k => k.startsWith(`${rowId}-`)).forEach(k => delete next[k]);
      return next;
    });
  };

  const handleAddCol = () => {
    const last = cols[cols.length - 1];
    setCols(prev => {
      const updated = prev.map((c, i) =>
        i === prev.length - 1 ? { ...c, isUnlimited: false, toValue: last ? last.from + 499 : 199 } : c
      );
      return [...updated, {
        id: uid(),
        from: last ? (last.from + 500) : 0,
        toValue: null,
        isUnlimited: true,
      }];
    });
  };

  const handleColChange = (colId, field, value) =>
    setCols(prev => prev.map(c => c.id === colId ? { ...c, [field]: value === '' ? '' : parseFloat(value) ?? 0 } : c));

  const handleDeleteCol = (colId) => {
    setCols(prev => {
      const filtered = prev.filter(c => c.id !== colId);
      if (filtered.length > 0) filtered[filtered.length - 1].isUnlimited = true;
      return filtered;
    });
    setCells(prev => {
      const next = { ...prev };
      Object.keys(next).filter(k => k.endsWith(`-${colId}`)).forEach(k => delete next[k]);
      return next;
    });
  };

  const handleCellChange = (rowId, colId, value) =>
    setCells(prev => ({ ...prev, [`${rowId}-${colId}`]: value === '' ? 0 : parseFloat(value) || 0 }));

  const handleLoadTemplate = () => {
    const tRows = [
      { id: uid(), from: 0, to: 1 }, { id: uid(), from: 1, to: 2 },
      { id: uid(), from: 2, to: 3 }, { id: uid(), from: 3, to: 4 },
      { id: uid(), from: 4, to: 5 }, { id: uid(), from: 5, to: 6 },
    ];
    const tCols = [
      { id: uid(), from: 0,   toValue: 199, isUnlimited: false },
      { id: uid(), from: 200, toValue: 499, isUnlimited: false },
      { id: uid(), from: 500, toValue: null, isUnlimited: true },
    ];
    setRows(tRows); setCols(tCols); setCells({});
  };

  // ── [Save All Slabs] (D11) ────────────────────────────────────────
  const handleSaveMatrix = async () => {
    if (!rows.length || !cols.length) {
      setMatrixError('Add at least one distance band and one order tier before saving.');
      return;
    }
    const invalidRow = rows.find(r => parseFloat(r.from) >= parseFloat(r.to));
    if (invalidRow) {
      setMatrixError(`Row ${invalidRow.from}–${invalidRow.to}: Min Distance must be less than Max Distance.`);
      return;
    }
    setSavingMatrix(true); setMatrixError(null); setMatrixSaved(false);
    try {
      for (const slab of existingSlabs) {
        await deleteDeliveryCharge(slab.id);
      }
      const payload = buildSlabPayload(rows, cols, cells);
      if (payload.charge.length > 0) await addDeliveryCharges(payload);
      const res = await getDeliveryConfig().catch(() => ({}));
      const newSlabs = res?.data?.delivery_charges || [];
      setExistingSlabs(newSlabs);
      setMatrixSaved(true);
      setTimeout(() => setMatrixSaved(false), 2500);
    } catch (e) {
      setMatrixError(e.readableMessage || e.message || 'Failed to save delivery charges');
    } finally {
      setSavingMatrix(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#329937]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden" data-testid="delivery-management-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}    setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false}
      />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10"
             data-testid="delivery-mgmt-header">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-lg text-zinc-500 hover:border-[#F26B33] hover:text-[#F26B33] transition-colors"
            data-testid="delivery-mgmt-back-btn">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Delivery Management</h1>
            <p className="text-xs text-zinc-400">Configure restaurant location, delivery rules and distance-based charges</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ══ SECTION 1: Basic Settings ══════════════════════════════════ */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
                 data-testid="section-basic-settings">

              {/* Section header */}
              <button className="w-full flex items-center justify-between px-6 py-4 bg-zinc-50/80 border-b border-zinc-200 hover:bg-zinc-100/70 transition-colors text-left"
                      onClick={() => setSec1Open(v => !v)}
                      data-testid="section-basic-settings-toggle">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Settings2 className="w-4 h-4 text-[#329937]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Basic Settings &amp; Restaurant Location</div>
                    <div className="text-xs text-zinc-400">Address geocoding · lat/lng · delivery personnel · operational toggles</div>
                  </div>
                </div>
                {sec1Open ? <ChevronUp className="w-4 h-4 text-zinc-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />}
              </button>

              {sec1Open && (
                <div className="p-6 space-y-6">

                  {/* Restaurant Location & Geocoding */}
                  <div className="border border-zinc-200 rounded-xl p-5 space-y-4 bg-zinc-50/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#F26B33]" />
                        <span className="text-sm font-semibold text-zinc-800">Restaurant Location &amp; Geocoding</span>
                        <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-[#F26B33] font-semibold rounded uppercase tracking-wide">Critical UX Flow</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Pre-filled from Restaurant Profile · Always editable</span>
                    </div>

                    {/* Address + Get Coordinates button (D2, D3, D4) */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Full Restaurant Address *
                        <span className="ml-1 text-zinc-400 normal-case font-normal">Type to see Google Places suggestions</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          {mapsReady && <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />}
                          <input
                            ref={inputRef}
                            type="text"
                            autoComplete="off"
                            data-form-type="other"
                            spellCheck={false}
                            value={address}
                            onChange={e => { setAddress(e.target.value); setGeocodeStatus(null); }}
                            placeholder={mapsReady ? 'Start typing to see suggestions…' : 'Loading Google Maps…'}
                            className={`w-full border rounded-lg py-2.5 text-sm text-zinc-800 outline-none transition-colors focus:border-[#F26B33] ${mapsReady ? 'pl-9 pr-3' : 'px-3'}`}
                            style={{ borderColor: geocodeStatus === 'success' ? '#329937' : geocodeStatus === 'error' ? '#EF4444' : '#E5E7EB' }}
                            data-testid="delivery-address-input"
                          />
                          {!mapsReady && GOOGLE_MAPS_KEY && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" />
                          )}
                        </div>
                        <button onClick={handleGetCoordinates}
                          disabled={isGeocoding || !address.trim() || !mapsReady}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#F26B33] hover:bg-[#d95720] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                          data-testid="get-coordinates-btn">
                          {isGeocoding
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Geocoding…</>
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

                    {/* Lat / Lng (D5: always editable) */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Latitude (LAT)', val: latitude, set: setLatitude, testId: 'delivery-latitude-input', placeholder: 'e.g. 12.9715987' },
                        { label: 'Longitude (LNG)', val: longitude, set: setLongitude, testId: 'delivery-longitude-input', placeholder: 'e.g. 77.5945627' },
                      ].map(f => (
                        <div key={f.testId}>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                            {f.label}
                            <span className="ml-1 text-zinc-400 normal-case font-normal">Manual &amp; Auto-fill</span>
                          </label>
                          <input type="text" value={f.val}
                            onChange={e => { f.set(e.target.value); setGeocodeStatus(null); }}
                            placeholder={f.placeholder}
                            className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono outline-none transition-colors focus:border-[#F26B33] ${f.val && geocodeStatus === 'success' ? 'bg-green-50 border-green-300 text-green-700' : 'text-zinc-800 border-zinc-200'}`}
                            data-testid={f.testId} />
                          <p className="text-[10px] text-zinc-400 mt-1">Directly editable if geocoder is inaccurate</p>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-zinc-400 bg-zinc-100 rounded-lg px-3 py-2">
                      💡 These coordinates are used as the <strong>origin</strong> in <code>POST /distance-api-new</code> to calculate delivery charges per order.
                    </div>
                  </div>

                  {/* Zone + Personnel */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">Delivery Zone</label>
                      <select value={zoneId} onChange={e => setZoneId(e.target.value)}
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#F26B33] bg-white"
                        data-testid="delivery-zone-select">
                        <option value="">Select zone…</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.name || `Zone ${z.id}`}</option>)}
                      </select>
                      <p className="text-[10px] text-zinc-400 mt-1">Populated from GET /zones</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">Primary Delivery Staff</label>
                      <input type="text" value={deliveryPersonName}
                        onChange={e => setDeliveryPersonName(e.target.value)}
                        placeholder="Default rider name"
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#F26B33]"
                        data-testid="delivery-person-name-input" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">Delivery Phone</label>
                      <input type="tel" value={deliveryContactNo}
                        onChange={e => setDeliveryContactNo(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#F26B33]"
                        data-testid="delivery-contact-no-input" />
                    </div>
                  </div>

                  {/* Toggles grid */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">Operational Flags &amp; Dispatch Rules</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Delivery Fee',   desc: 'Enable fee billing',      val: deliveryFee,    set: setDeliveryFee,    testId: 'toggle-delivery-fee' },
                        { label: 'Peak Surcharge', desc: 'Rain / night surge',       val: surcharge,      set: setSurcharge,      testId: 'toggle-surcharge' },
                        { label: 'Real Status',    desc: 'Customer live link',       val: showRealStatus, set: setShowRealStatus,  testId: 'toggle-real-status' },
                        { label: 'Auto Assign',    desc: 'Rider round-robin',        val: deliveryAssign, set: setDeliveryAssign,  testId: 'toggle-delivery-assign' },
                      ].map(t => (
                        <div key={t.testId} className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg bg-zinc-50/40">
                          <div>
                            <div className="text-sm font-medium text-zinc-800">{t.label}</div>
                            <div className="text-[11px] text-zinc-400">{t.desc}</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer" data-testid={t.testId}>
                            <input type="checkbox" className="sr-only" checked={t.val} onChange={e => t.set(e.target.checked)} />
                            <div className={`w-11 h-6 rounded-full transition-colors ${t.val ? 'bg-[#329937]' : 'bg-zinc-300'}`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${t.val ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Basic CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <p className="text-[11px] text-zinc-400">Changes here update store coordinates and fleet rules globally.</p>
                    <div className="flex items-center gap-3">
                      {basicError && <p className="text-[11px] text-red-500">{basicError}</p>}
                      {basicSaved && <p className="text-[11px] text-[#329937] flex items-center gap-1"><Check className="w-3 h-3" /> Saved!</p>}
                      <button onClick={handleSaveBasic} disabled={savingBasic}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#329937] hover:bg-[#287a2d] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                        data-testid="update-basic-setting-btn">
                        {savingBasic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {savingBasic ? 'Updating…' : 'Update Basic Setting'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ══ SECTION 2: Delivery Charges Matrix ════════════════════════ */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
                 data-testid="section-delivery-charges">

              {/* Section header */}
              <div className="flex items-center justify-between px-6 py-4 bg-zinc-50/80 border-b border-zinc-200">
                <button className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                        onClick={() => setSec2Open(v => !v)}
                        data-testid="section-delivery-charges-toggle">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <LayoutGrid className="w-4 h-4 text-[#F26B33]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Distance-Based Delivery Charges</div>
                    <div className="text-xs text-zinc-400">Tiered distance pricing automatically applied during delivery order billing</div>
                  </div>
                </button>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {rows.length > 0 && cols.length > 0 && (
                    <span className="text-[11px] text-zinc-400">{totalSlabs} slabs ({rows.length}×{cols.length})</span>
                  )}
                  <button onClick={handleAddCol}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors whitespace-nowrap"
                    data-testid="add-order-tier-btn">
                    <Plus className="w-3 h-3" /> Add Order Tier
                  </button>
                  <button onClick={handleSaveMatrix}
                    disabled={savingMatrix || totalSlabs === 0}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#329937] hover:bg-[#287a2d] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    data-testid="save-all-slabs-btn">
                    {savingMatrix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingMatrix ? 'Saving…' : `Save All Slabs (${totalSlabs})`}
                  </button>
                  {sec2Open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
              </div>

              {sec2Open && (
                <div className="p-6">
                  {/* Matrix saved indicator */}
                  {matrixSaved && (
                    <div className="flex items-center gap-2 text-[#329937] text-sm font-medium mb-4">
                      <Check className="w-4 h-4" /> All slabs saved successfully!
                    </div>
                  )}
                  {matrixError && (
                    <p className="text-sm text-red-500 mb-4">{matrixError}</p>
                  )}

                  {/* D10: Empty state — 3-step guided setup */}
                  {rows.length === 0 && cols.length === 0 ? (
                    <div className="text-center py-8" data-testid="matrix-empty-state">
                      <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <LayoutGrid className="w-7 h-7 text-[#F26B33]" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-800 mb-2">Create Your Delivery Charges Matrix</h3>
                      <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
                        No delivery slabs configured yet. Follow the 3-step setup below.
                      </p>
                      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
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
                        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-4 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-6 h-6 bg-zinc-800 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Rate Grid</span>
                          </div>
                          <div className="text-sm font-semibold text-zinc-800 mb-1">Fill in Delivery Charges</div>
                          <div className="text-xs text-zinc-500 mb-3">Fill delivery rates in the grid or click Free.</div>
                          <button onClick={handleLoadTemplate}
                            className="w-full flex items-center justify-center gap-1 py-2 border border-zinc-300 text-zinc-600 text-xs font-semibold rounded-lg hover:bg-zinc-50 transition-colors"
                            data-testid="load-template-btn">
                            Load Standard 3×6 Template
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Matrix grid (D6, D7, D8, D9) */
                    <div data-testid="delivery-charges-matrix">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr>
                              {/* Corner */}
                              <th className="min-w-[170px] p-2 text-left border-b-2 border-r-2 border-zinc-200 bg-zinc-50">
                                <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">DISTANCE \ ORDER VALUE</div>
                                <div className="text-[10px] font-semibold text-zinc-600 mt-0.5">Distance Range (km)</div>
                              </th>
                              {/* Column headers (D7: From ₹ — To ₹ inputs) */}
                              {cols.map((col, ci) => (
                                <th key={col.id} className="min-w-[190px] p-2 border-b-2 border-r border-zinc-200 bg-zinc-50/50 text-left"
                                    data-testid={`col-header-${col.id}`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[9px] font-semibold text-zinc-400 uppercase">
                                      TIER {ci + 1}{col.isUnlimited ? ' · Unlimited' : ''}
                                    </span>
                                    <button onClick={() => handleDeleteCol(col.id)}
                                      className="p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors"
                                      data-testid={`delete-col-${col.id}`}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {/* Two ₹ inputs per column (D7) */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-zinc-400">₹</span>
                                    <input type="number" min="0" value={col.from}
                                      onChange={e => handleColChange(col.id, 'from', e.target.value)}
                                      className="w-16 border border-zinc-200 rounded px-1.5 py-1 text-xs text-zinc-700 text-center outline-none focus:border-[#329937] bg-white"
                                      data-testid={`col-from-${col.id}`} />
                                    <span className="text-zinc-400">—</span>
                                    {col.isUnlimited ? (
                                      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded text-xs text-zinc-500 font-medium">
                                        <span className="text-base leading-none">∞</span>
                                        <span>no limit</span>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-zinc-400">₹</span>
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
                                <td className="p-2 border-r-2 border-zinc-200 bg-zinc-50/30"
                                    data-testid={`row-header-${row.id}`}>
                                  <div className="flex items-center gap-1">
                                    <input type="number" min="0" step="0.5" value={row.from}
                                      onChange={e => handleRowChange(row.id, 'from', e.target.value)}
                                      className="w-14 border border-zinc-200 rounded px-1.5 py-1.5 text-xs text-zinc-700 text-center outline-none focus:border-[#329937] bg-white"
                                      data-testid={`row-from-${row.id}`} />
                                    <span className="text-zinc-400">—</span>
                                    <input type="number" min="0" step="0.5" value={row.to}
                                      onChange={e => handleRowChange(row.id, 'to', e.target.value)}
                                      className="w-14 border border-zinc-200 rounded px-1.5 py-1.5 text-xs text-zinc-700 text-center outline-none focus:border-[#329937] bg-white"
                                      data-testid={`row-to-${row.id}`} />
                                    <span className="text-zinc-400">km</span>
                                    <button onClick={() => handleDeleteRow(row.id)}
                                      className="ml-1 p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors"
                                      data-testid={`delete-row-${row.id}`}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                {/* Cells (D6: inline editable + Free) */}
                                {cols.map(col => {
                                  const key    = `${row.id}-${col.id}`;
                                  const val    = cells[key] ?? 0;
                                  const isFree = val === 0;
                                  return (
                                    <td key={col.id} className="p-2 border-r border-zinc-100"
                                        data-testid={`cell-${row.id}-${col.id}`}>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-zinc-400">₹</span>
                                        <input type="number" min="0" step="1" value={val}
                                          onChange={e => handleCellChange(row.id, col.id, e.target.value)}
                                          className={`w-20 border rounded px-2 py-1.5 text-xs text-center outline-none focus:border-[#329937] transition-colors ${isFree ? 'bg-green-50 border-green-200 text-green-700' : 'border-zinc-200 bg-white text-zinc-800'}`}
                                          data-testid={`cell-input-${row.id}-${col.id}`} />
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
                            {/* Add Row */}
                            <tr>
                              <td colSpan={cols.length + 1} className="p-2">
                                <button onClick={handleAddRow}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-[#F26B33] transition-colors"
                                  data-testid="add-distance-band-btn">
                                  <Plus className="w-3.5 h-3.5" /> Add Distance Band (Row)
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Matrix footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100">
                        <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" />
                            Free Delivery (₹0)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-zinc-50 border border-zinc-200 inline-block" />
                            Chargeable Slab
                          </span>
                          <span className="text-zinc-300">• Press Tab to move between cells</span>
                        </div>
                        <button onClick={() => setShowPayload(v => !v)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                          data-testid="inspect-wire-json-btn">
                          <Code className="w-3.5 h-3.5" /> Inspect Wire JSON
                        </button>
                      </div>

                      {/* Wire JSON preview */}
                      {showPayload && (
                        <div className="mt-3 p-4 bg-zinc-900 rounded-xl overflow-x-auto"
                             data-testid="wire-json-preview">
                          <p className="text-[10px] text-zinc-400 mb-2 uppercase tracking-wide">POST /delivery-charges payload</p>
                          <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap break-all">
                            {JSON.stringify(buildSlabPayload(rows, cols, cells), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>{/* /max-w */}
        </div>{/* /overflow */}
      </div>
    </div>
  );
}
