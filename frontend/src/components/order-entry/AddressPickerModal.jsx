import { useState } from "react";
import { X, MapPin, Plus, Trash2, Star, ChevronRight, Building2, Home, Briefcase, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";
import { deleteAddress, setDefaultAddress } from "../../api/services/customerService";

const typeIcons = {
  Home: Home,
  Office: Building2,
  Work: Briefcase,
  Other: MapPin,
};

const AddressPickerModal = ({ onClose, onSelect, onAddNew, addresses = [], customerId = null, loading = false }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (addr) => {
    if (!customerId || !addr.id) return;
    setDeleting(addr.id);
    try {
      await deleteAddress(customerId, addr.id);
      // Parent will re-fetch addresses
      onClose();
    } catch (err) {
      console.error('[AddressPicker] Delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (addr) => {
    if (!customerId || !addr.id) return;
    try {
      await setDefaultAddress(customerId, addr.id);
      onSelect(addr);
    } catch (err) {
      console.error('[AddressPicker] Set default failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="address-picker-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
            <h2 className="text-lg font-bold" style={{ color: COLORS.darkText }}>Delivery Address</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" data-testid="address-picker-close">
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Address List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-8" data-testid="no-addresses">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm" style={{ color: COLORS.grayText }}>No saved addresses</p>
              <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>Add a delivery address to continue</p>
            </div>
          ) : (
            addresses.map((addr) => {
              const Icon = typeIcons[addr.addressType] || MapPin;
              const displayAddress = [addr.address, addr.city, addr.pincode].filter(Boolean).join(', ');
              return (
                <button
                  key={addr.id || addr.address}
                  onClick={() => onSelect(addr)}
                  className="w-full text-left p-3 rounded-xl border transition-all hover:shadow-md"
                  style={{
                    borderColor: addr.isDefault ? COLORS.primaryGreen : COLORS.borderGray,
                    backgroundColor: addr.isDefault ? `${COLORS.primaryGreen}08` : 'white',
                  }}
                  data-testid={`address-option-${addr.id || 'cross'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${COLORS.primaryOrange}12` }}>
                      <Icon className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{addr.addressType || 'Address'}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${COLORS.primaryGreen}20`, color: COLORS.primaryGreen }}>
                            Default
                          </span>
                        )}
                        {addr.sourceRestaurant && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${COLORS.primaryOrange}15`, color: COLORS.primaryOrange }}>
                            {addr.sourceRestaurant}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.grayText }}>{displayAddress}</p>
                      {addr.house && <p className="text-xs" style={{ color: COLORS.grayText }}>House: {addr.house}{addr.floor ? `, Floor: ${addr.floor}` : ''}</p>}
                      {addr.deliveryInstructions && <p className="text-xs italic mt-0.5" style={{ color: COLORS.primaryOrange }}>{addr.deliveryInstructions}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {customerId && addr.id && !addr.isDefault && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSetDefault(addr); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                          title="Set as default"
                        >
                          <Star className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                        </button>
                      )}
                      {customerId && addr.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(addr); }}
                          disabled={deleting === addr.id}
                          className="p-1.5 hover:bg-red-50 rounded-lg"
                          title="Delete address"
                        >
                          {deleting === addr.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: COLORS.grayText }} />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                          )}
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Add New Button */}
        <div className="p-3 border-t" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={onAddNew}
            className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
            data-testid="add-new-address-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add New Address</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressPickerModal;
