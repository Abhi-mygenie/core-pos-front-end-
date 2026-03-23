import { useState } from "react";
import {
  X, ArrowLeft, Store, Clock, Receipt, CreditCard, Percent,
  Tags, Printer, Ban, LayoutGrid, Truck, SlidersHorizontal,
  Check, XCircle,
} from "lucide-react";
import { COLORS } from "../../constants";
import { useRestaurant, useTables, useSettings } from "../../contexts";
import { useToast } from "../../hooks/use-toast";

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

// ─── Small Helpers ──────────────────────────────────────────────────────────
const BoolBadge = ({ value, trueLabel = "Enabled", falseLabel = "Disabled" }) => (
  <span
    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
    style={{
      backgroundColor: value ? "rgba(50,153,55,0.1)" : "rgba(239,68,68,0.1)",
      color: value ? COLORS.primaryGreen : "#EF4444",
    }}
  >
    {value ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {value ? trueLabel : falseLabel}
  </span>
);

const Field = ({ label, value, children }) => (
  <div className="py-3 flex justify-between items-start gap-4 border-b" style={{ borderColor: COLORS.borderGray }}>
    <span className="text-sm" style={{ color: COLORS.grayText }}>{label}</span>
    <span className="text-sm font-medium text-right" style={{ color: COLORS.darkText }}>
      {children || value || "—"}
    </span>
  </div>
);

const SectionTitle = ({ title, count, onAdd }) => {
  const { toast } = useToast();
  return (
    <div className="flex items-center justify-between mb-3 mt-6 first:mt-0">
      <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
        {title} {count !== undefined && <span style={{ color: COLORS.grayText }}>({count})</span>}
      </h3>
      {onAdd && (
        <button
          className="text-xs font-medium px-3 py-1 rounded-md"
          style={{ color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
          onClick={() => toast({ title: "Coming Soon", description: "This feature will be available in a future update." })}
          data-testid="settings-add-btn"
        >
          + Add
        </button>
      )}
    </div>
  );
};

// ─── Detail Views ───────────────────────────────────────────────────────────
const RestaurantInfoView = () => {
  const { restaurant } = useRestaurant();
  if (!restaurant) return null;
  return (
    <div>
      {restaurant.logo && (
        <div className="flex justify-center mb-4">
          <img src={restaurant.logo} alt="Logo" className="h-20 w-auto rounded-lg" />
        </div>
      )}
      <Field label="Name" value={restaurant.name} />
      <Field label="Phone" value={restaurant.phone} />
      <Field label="Email" value={restaurant.email} />
      <Field label="Address" value={restaurant.address} />
      <Field label="Currency" value={restaurant.currency} />
      <SectionTitle title="Features" />
      <Field label="Dine In"><BoolBadge value={restaurant.features?.dineIn} /></Field>
      <Field label="Delivery"><BoolBadge value={restaurant.features?.delivery} /></Field>
      <Field label="Takeaway"><BoolBadge value={restaurant.features?.takeaway} /></Field>
      <Field label="Room"><BoolBadge value={restaurant.features?.room} /></Field>
      <Field label="Inventory"><BoolBadge value={restaurant.features?.inventory} /></Field>
    </div>
  );
};

const OperatingHoursView = () => {
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];
  return (
    <div>
      {schedules.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.grayText }}>No operating hours configured.</p>
      ) : (
        schedules.map((s) => (
          <Field key={s.id} label={s.dayName} value={`${s.openingTime || '—'} — ${s.closingTime || '—'}`} />
        ))
      )}
    </div>
  );
};

const TaxGstView = () => {
  const { restaurant } = useRestaurant();
  const tax = restaurant?.tax || {};
  return (
    <div>
      <Field label="Tax %" value={`${tax.percentage}%`} />
      <Field label="GST %" value={`${tax.gstPercentage}%`} />
      <Field label="GST Code" value={tax.gstCode} />
    </div>
  );
};

const PaymentMethodsView = () => {
  const { restaurant, paymentTypes } = useRestaurant();
  const methods = restaurant?.paymentMethods || {};
  return (
    <div>
      <SectionTitle title="Payment Toggles" />
      <Field label="Cash"><BoolBadge value={methods.cash} /></Field>
      <Field label="UPI"><BoolBadge value={methods.upi} /></Field>
      <Field label="Card"><BoolBadge value={methods.card} /></Field>
      <Field label="Tab/Credit"><BoolBadge value={methods.tab} /></Field>
      <SectionTitle title="Payment Types" count={paymentTypes.length} onAdd />
      {paymentTypes.map((pt) => (
        <Field key={pt.id} label={pt.displayName || pt.name} value={`ID: ${pt.id}`} />
      ))}
    </div>
  );
};

const DiscountTypesView = () => {
  const { discountTypes, currencySymbol } = useRestaurant();
  return (
    <div>
      <SectionTitle title="Discount Types" count={discountTypes.length} onAdd />
      {discountTypes.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.grayText }}>No discount types configured.</p>
      ) : (
        discountTypes.map((d) => (
          <Field key={d.id} label={d.name} value={`${d.discountPercent}%`} />
        ))
      )}
    </div>
  );
};

const PrintersView = () => {
  const { printers } = useRestaurant();
  return (
    <div>
      <SectionTitle title="Printer Stations" count={printers.length} onAdd />
      {printers.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.grayText }}>No printers configured.</p>
      ) : (
        printers.map((p) => (
          <div
            key={p.id}
            className="p-3 rounded-lg mb-2 border"
            style={{ borderColor: COLORS.borderGray }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{p.name}</span>
              <BoolBadge value={p.isActive} trueLabel="Active" falseLabel="Inactive" />
            </div>
            <div className="text-xs" style={{ color: COLORS.grayText }}>
              Type: {p.type} &middot; Paper: {p.paperSize}mm &middot; Categories: {p.categoryIds?.length || 0}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const CancellationReasonsView = () => {
  const { cancellationReasons } = useSettings();
  return (
    <div>
      <SectionTitle title="Cancellation Reasons" count={cancellationReasons.length} onAdd />
      {cancellationReasons.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.grayText }}>No cancellation reasons configured.</p>
      ) : (
        cancellationReasons.map((r) => (
          <div
            key={r.reasonId}
            className="p-3 rounded-lg mb-2 border"
            style={{ borderColor: COLORS.borderGray }}
          >
            <div className="text-sm font-medium" style={{ color: COLORS.darkText }}>{r.reasonText}</div>
            <div className="text-xs mt-1" style={{ color: COLORS.grayText }}>
              Applies to: {r.applicableTo}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const TableManagementView = () => {
  const { tables, sections } = useTables();
  return (
    <div>
      <SectionTitle title="Sections" count={sections.length} onAdd />
      {sections.map((section) => {
        const sectionTables = tables.filter((t) => (t.sectionName || "Default") === section);
        return (
          <div key={section} className="mb-4">
            <div className="text-sm font-medium mb-2" style={{ color: COLORS.darkText }}>
              {section} <span className="font-normal" style={{ color: COLORS.grayText }}>({sectionTables.length} tables)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {sectionTables.map((t) => (
                <div
                  key={t.tableId}
                  className="text-center p-2 rounded-lg border text-xs"
                  style={{
                    borderColor: t.isOccupied ? COLORS.primaryOrange : COLORS.borderGray,
                    backgroundColor: t.isOccupied ? "rgba(242,107,51,0.05)" : COLORS.lightBg,
                    color: t.isOccupied ? COLORS.primaryOrange : COLORS.darkText,
                  }}
                >
                  <div className="font-medium">T{t.tableNumber}</div>
                  <div style={{ color: COLORS.grayText, fontSize: "10px" }}>
                    {t.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ServiceChargeView = () => {
  const { restaurant } = useRestaurant();
  return (
    <div>
      <Field label="Service Charge"><BoolBadge value={restaurant?.features?.serviceCharge} /></Field>
      <Field label="Tip"><BoolBadge value={restaurant?.features?.tip} /></Field>
      <p className="text-xs mt-4" style={{ color: COLORS.grayText }}>
        Detailed service charge percentage is managed from the admin panel.
      </p>
    </div>
  );
};

const DeliverySettingsView = () => {
  const { restaurant } = useRestaurant();
  return (
    <div>
      <Field label="Delivery"><BoolBadge value={restaurant?.features?.delivery} /></Field>
      <Field label="Takeaway"><BoolBadge value={restaurant?.features?.takeaway} /></Field>
      <p className="text-xs mt-4" style={{ color: COLORS.grayText }}>
        Detailed delivery settings (fees, radius, contacts) are managed from the admin panel.
      </p>
    </div>
  );
};

const GeneralSettingsView = () => {
  const { restaurant } = useRestaurant();
  const settings = restaurant?.settings || {};
  return (
    <div>
      <Field label="Coupons"><BoolBadge value={settings.isCoupon} /></Field>
      <Field label="Loyalty"><BoolBadge value={settings.isLoyalty} /></Field>
      <Field label="Customer Wallet"><BoolBadge value={settings.isCustomerWallet} /></Field>
      <Field label="Aggregator Auto KOT"><BoolBadge value={settings.aggregatorAutoKot} /></Field>
      <Field label="Default Prep Time" value={`${settings.defaultPrepTime || 15} min`} />
      <SectionTitle title="Search Options" />
      {(restaurant?.searchOptions || []).map((opt, i) => (
        <Field key={i} label={`Option ${i + 1}`} value={opt} />
      ))}
    </div>
  );
};

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
const SettingsPanel = ({ isOpen, onClose }) => {
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
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          data-testid="settings-backdrop"
          className="fixed inset-0 bg-black/20 z-40"
          onClick={handleClose}
        />
      )}

      {/* Panel */}
      <div
        data-testid="settings-panel"
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl"
        style={{
          width: "520px",
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
                    className="flex flex-col items-center gap-2.5 p-4 rounded-xl border hover:shadow-md transition-all"
                    style={{ borderColor: COLORS.borderGray }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "rgba(242,107,51,0.08)" }}
                    >
                      <Icon className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight" style={{ color: COLORS.darkText }}>
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
    </>
  );
};

export default SettingsPanel;
