import { useState, useEffect, useRef, useCallback } from "react";
import { X, MapPin, Loader2, Search } from "lucide-react";
import { COLORS } from "../../constants";

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

// Load Google Maps JS SDK dynamically (once)
let googleMapsLoaded = false;
let googleMapsLoadPromise = null;

const loadGoogleMaps = () => {
  if (googleMapsLoaded && window.google?.maps?.places) {
    return Promise.resolve();
  }
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      googleMapsLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => { googleMapsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

// Extract address components from Google Place result
const extractAddressComponents = (place) => {
  const components = {};
  const mapping = {
    street_number: 'streetNumber',
    route: 'route',
    sublocality_level_1: 'sublocality',
    sublocality_level_2: 'sublocalityL2',
    locality: 'city',
    administrative_area_level_1: 'state',
    postal_code: 'pincode',
    country: 'country',
    neighborhood: 'neighborhood',
  };

  (place.address_components || []).forEach(comp => {
    comp.types.forEach(type => {
      if (mapping[type]) {
        components[mapping[type]] = comp.long_name;
      }
    });
  });

  return {
    address: place.formatted_address || '',
    road: components.route || components.sublocality || components.neighborhood || '',
    city: components.city || '',
    state: components.state || '',
    pincode: components.pincode || '',
    country: components.country || 'India',
    latitude: place.geometry?.location?.lat()?.toString() || '',
    longitude: place.geometry?.location?.lng()?.toString() || '',
  };
};

const AddressFormModal = ({ onClose, onSave, initialData = null, saving = false }) => {
  const [form, setForm] = useState({
    addressType: initialData?.addressType || 'Home',
    address: initialData?.address || '',
    house: initialData?.house || '',
    floor: initialData?.floor || '',
    road: initialData?.road || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    pincode: initialData?.pincode || '',
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
    contactPersonName: initialData?.contactPersonName || '',
    contactPersonNumber: initialData?.contactPersonNumber || '',
    deliveryInstructions: initialData?.deliveryInstructions || '',
    isDefault: initialData?.isDefault || false,
  });

  const [mapsReady, setMapsReady] = useState(false);
  const [searchText, setSearchText] = useState(initialData?.address || '');
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const isValid = form.address.trim();

  // Load Google Maps SDK
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) {
      console.warn('[AddressForm] REACT_APP_GOOGLE_MAPS_KEY not set');
      return;
    }
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(err => console.error('[AddressForm] Google Maps load failed:', err));
  }, []);

  // Initialize autocomplete when SDK is ready
  const initAutocomplete = useCallback(() => {
    if (!mapsReady || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'in' },
      fields: ['address_components', 'formatted_address', 'geometry'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place?.geometry) return;

      const extracted = extractAddressComponents(place);
      setSearchText(extracted.address);
      setForm(prev => ({
        ...prev,
        address: extracted.address,
        road: extracted.road || prev.road,
        city: extracted.city || prev.city,
        state: extracted.state || prev.state,
        pincode: extracted.pincode || prev.pincode,
        latitude: extracted.latitude,
        longitude: extracted.longitude,
      }));
    });

    autocompleteRef.current = autocomplete;
  }, [mapsReady]);

  useEffect(() => {
    initAutocomplete();
  }, [initAutocomplete]);

  const handleSave = () => {
    if (!isValid || saving) return;
    onSave(form);
  };

  const addressTypes = ['Home', 'Office', 'Other'];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" data-testid="address-form-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
            <h2 className="text-lg font-bold" style={{ color: COLORS.darkText }}>
              {initialData ? 'Edit Address' : 'New Address'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Address Type */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>Type</label>
            <div className="flex gap-2">
              {addressTypes.map(type => (
                <button
                  key={type}
                  onClick={() => updateField('addressType', type)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                  style={{
                    borderColor: form.addressType === type ? COLORS.primaryOrange : COLORS.borderGray,
                    backgroundColor: form.addressType === type ? `${COLORS.primaryOrange}15` : 'white',
                    color: form.addressType === type ? COLORS.primaryOrange : COLORS.grayText,
                  }}
                  data-testid={`addr-type-${type.toLowerCase()}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Address — Google Places Autocomplete */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
              Address <span style={{ color: COLORS.primaryOrange }}>*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
              <input
                ref={inputRef}
                type="text"
                placeholder={mapsReady ? "Search address..." : "Loading Google Maps..."}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (!mapsReady) updateField('address', e.target.value);
                }}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-address-input"
              />
              {!mapsReady && GOOGLE_MAPS_KEY && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: COLORS.grayText }} />
              )}
            </div>
            {form.address && form.latitude && (
              <p className="text-[10px] mt-1 px-1" style={{ color: COLORS.primaryGreen }}>
                Auto-mapped: {form.city}{form.pincode ? `, ${form.pincode}` : ''}
              </p>
            )}
          </div>

          {/* House + Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>House/Flat</label>
              <input
                type="text"
                placeholder="A-101"
                value={form.house}
                onChange={(e) => updateField('house', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-house-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>Floor</label>
              <input
                type="text"
                placeholder="1st"
                value={form.floor}
                onChange={(e) => updateField('floor', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-floor-input"
              />
            </div>
          </div>

          {/* City + Pincode (auto-filled) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: form.city ? COLORS.primaryGreen : COLORS.grayText }}>
                City {form.city && form.latitude ? '(auto)' : ''}
              </label>
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: form.city && form.latitude ? COLORS.primaryGreen : COLORS.borderGray }}
                data-testid="addr-city-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: form.pincode ? COLORS.primaryGreen : COLORS.grayText }}>
                Pincode {form.pincode && form.latitude ? '(auto)' : ''}
              </label>
              <input
                type="text"
                placeholder="560001"
                value={form.pincode}
                onChange={(e) => updateField('pincode', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: form.pincode && form.latitude ? COLORS.primaryGreen : COLORS.borderGray }}
                data-testid="addr-pincode-input"
              />
            </div>
          </div>

          {/* State + Road (auto-filled) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: form.state ? COLORS.primaryGreen : COLORS.grayText }}>
                State {form.state && form.latitude ? '(auto)' : ''}
              </label>
              <input
                type="text"
                placeholder="State"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: form.state && form.latitude ? COLORS.primaryGreen : COLORS.borderGray }}
                data-testid="addr-state-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: form.road ? COLORS.primaryGreen : COLORS.grayText }}>
                Road/Landmark {form.road && form.latitude ? '(auto)' : ''}
              </label>
              <input
                type="text"
                placeholder="Main Road"
                value={form.road}
                onChange={(e) => updateField('road', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: form.road && form.latitude ? COLORS.primaryGreen : COLORS.borderGray }}
                data-testid="addr-road-input"
              />
            </div>
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>Contact Name</label>
              <input
                type="text"
                placeholder="Delivery contact"
                value={form.contactPersonName}
                onChange={(e) => updateField('contactPersonName', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-contact-name-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>Contact Phone</label>
              <input
                type="tel"
                placeholder="Phone number"
                value={form.contactPersonNumber}
                onChange={(e) => updateField('contactPersonNumber', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-contact-phone-input"
              />
            </div>
          </div>

          {/* Delivery Instructions */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>Delivery Instructions</label>
            <input
              type="text"
              placeholder="Ring bell twice, leave at door..."
              value={form.deliveryInstructions}
              onChange={(e) => updateField('deliveryInstructions', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              data-testid="addr-instructions-input"
            />
          </div>

          {/* Set as Default */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => updateField('isDefault', e.target.checked)}
              className="w-4 h-4 rounded"
              data-testid="addr-default-checkbox"
            />
            <span className="text-xs" style={{ color: COLORS.grayText }}>Set as default delivery address</span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-3 border-t" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full py-3 font-semibold text-white text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="addr-save-btn"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : (initialData ? 'Update Address' : 'Save Address')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressFormModal;
