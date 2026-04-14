import { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";

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
    contactPersonName: initialData?.contactPersonName || '',
    contactPersonNumber: initialData?.contactPersonNumber || '',
    deliveryInstructions: initialData?.deliveryInstructions || '',
    isDefault: initialData?.isDefault || false,
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const isValid = form.address.trim();

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

          {/* Address */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
              Address <span style={{ color: COLORS.primaryOrange }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Street address, area, landmark"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              data-testid="addr-address-input"
            />
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

          {/* City + Pincode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>City</label>
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-city-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>Pincode</label>
              <input
                type="text"
                placeholder="560001"
                value={form.pincode}
                onChange={(e) => updateField('pincode', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-pincode-input"
              />
            </div>
          </div>

          {/* State + Road */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>State</label>
              <input
                type="text"
                placeholder="State"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="addr-state-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>Road/Landmark</label>
              <input
                type="text"
                placeholder="Main Road"
                value={form.road}
                onChange={(e) => updateField('road', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
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
