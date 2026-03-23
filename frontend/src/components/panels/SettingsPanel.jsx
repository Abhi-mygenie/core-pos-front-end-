import { useState } from "react";
import {
  X, ArrowLeft, Store, Clock, Receipt, CreditCard, Percent,
  Tags, Printer, Ban, LayoutGrid, Truck, SlidersHorizontal,
} from "lucide-react";
import { COLORS } from "../../constants";

// Pattern A: View/Edit Toggle
import { RestaurantInfoView, TaxGstView, ServiceChargeView, DeliverySettingsView, GeneralSettingsView } from "./settings/ViewEditViews";
// Pattern B: List + Form
import { OperatingHoursView, PaymentMethodsView, DiscountTypesView, PrintersView, CancellationReasonsView } from "./settings/ListFormViews";
// Pattern C: Master-Detail
import { TableManagementView } from "./settings/TableManagementView";

// ─── Tile Definitions ───────────────────────────────────────────────────────
const TILES = [
  { id: "restaurant-info", label: "Restaurant Info", icon: Store },
  { id: "operating-hours", label: "Operating Hours", icon: Clock },
  { id: "tax-gst", label: "Tax & GST", icon: Receipt },
  { id: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { id: "discount-types", label: "Discount Types", icon: Tags },
  { id: "printers", label: "Printers", icon: Printer },
  { id: "cancellation-reasons", label: "Cancellation Reasons", icon: Ban },
  { id: "table-management", label: "Table Management", icon: LayoutGrid },
  { id: "delivery-settings", label: "Delivery Settings", icon: Truck },
  { id: "general-settings", label: "General Settings", icon: SlidersHorizontal },
  { id: "service-charge", label: "Service Charge", icon: Percent },
];

// ─── Detail View Map ────────────────────────────────────────────────────────
const DETAIL_VIEWS = {
  "restaurant-info": RestaurantInfoView,
  "operating-hours": OperatingHoursView,
  "tax-gst": TaxGstView,
  "payment-methods": PaymentMethodsView,
  "discount-types": DiscountTypesView,
  "printers": PrintersView,
  "cancellation-reasons": CancellationReasonsView,
  "table-management": TableManagementView,
  "delivery-settings": DeliverySettingsView,
  "general-settings": GeneralSettingsView,
  "service-charge": ServiceChargeView,
};

// ─── Main Panel ─────────────────────────────────────────────────────────────
const SettingsPanel = ({ isOpen, onClose, sidebarWidth }) => {
  const [activeTile, setActiveTile] = useState(null);

  const handleClose = () => {
    setActiveTile(null);
    onClose();
  };

  const handleBack = () => {
    setActiveTile(null);
  };

  const DetailComponent = activeTile ? DETAIL_VIEWS[activeTile] : null;
  const activeLabel = activeTile ? TILES.find((t) => t.id === activeTile)?.label : "";

  return (
    <div
      data-testid="settings-panel"
      className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl"
      style={{
        left: `${sidebarWidth || 70}px`,
        backgroundColor: COLORS.lightBg,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div className="flex items-center gap-3">
          {activeTile && (
            <button
              data-testid="settings-back-btn"
              onClick={handleBack}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: COLORS.darkText }} />
            </button>
          )}
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            {activeTile ? activeLabel : "Settings"}
          </h2>
        </div>
        <button
          data-testid="settings-close-btn"
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {!activeTile ? (
          /* Tile Grid */
          <div className="grid grid-cols-3 gap-3" data-testid="settings-tiles">
            {TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  data-testid={`settings-tile-${tile.id}`}
                  onClick={() => setActiveTile(tile.id)}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-xl border hover:shadow-md transition-all"
                  style={{ borderColor: COLORS.borderGray }}
                >
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(242,107,51,0.08)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
                  </div>
                  <span className="text-sm font-medium text-center leading-tight" style={{ color: COLORS.darkText }}>
                    {tile.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Detail View */
          <div data-testid={`settings-detail-${activeTile}`}>
            {DetailComponent && <DetailComponent />}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
