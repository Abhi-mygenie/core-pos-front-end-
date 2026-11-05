import { useState, useEffect } from "react";
import { COLORS } from "../../../constants";
import { useRestaurant, useSettings } from "../../../contexts";
import {
  Field, BoolBadge, SectionTitle, EditBar,
  TextInput, NumberInput, ToggleSwitch,
} from "./shared";

// ═══════════════════════════════════════════════════════════════════════════
// Pattern A: View/Edit Toggle Views
// ═══════════════════════════════════════════════════════════════════════════

// ─── Restaurant Info ────────────────────────────────────────────────────────
export const RestaurantInfoView = () => {
  const { restaurant } = useRestaurant();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        address: restaurant.address || "",
        currency: restaurant.currency || "INR",
        dineIn: restaurant.features?.dineIn ?? false,
        delivery: restaurant.features?.delivery ?? false,
        takeaway: restaurant.features?.takeaway ?? false,
        room: restaurant.features?.room ?? false,
        inventory: restaurant.features?.inventory ?? false,
      });
    }
  }, [restaurant]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  if (!restaurant) return null;

  return (
    <div>
      <EditBar
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => setIsEditing(false)}
        onCancel={() => {
          setIsEditing(false);
          setForm({
            name: restaurant.name, phone: restaurant.phone,
            email: restaurant.email, address: restaurant.address,
            currency: restaurant.currency,
            dineIn: restaurant.features?.dineIn, delivery: restaurant.features?.delivery,
            takeaway: restaurant.features?.takeaway, room: restaurant.features?.room,
            inventory: restaurant.features?.inventory,
          });
        }}
      />

      {isEditing ? (
        <>
          <TextInput label="Name" value={form.name} onChange={(v) => update("name", v)} required />
          <TextInput label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
          <TextInput label="Email" value={form.email} onChange={(v) => update("email", v)} />
          <TextInput label="Address" value={form.address} onChange={(v) => update("address", v)} />
          <TextInput label="Currency" value={form.currency} onChange={(v) => update("currency", v)} />
          <SectionTitle title="Features" />
          <ToggleSwitch label="Dine In" checked={form.dineIn} onChange={(v) => update("dineIn", v)} />
          <ToggleSwitch label="Delivery" checked={form.delivery} onChange={(v) => update("delivery", v)} />
          <ToggleSwitch label="Takeaway" checked={form.takeaway} onChange={(v) => update("takeaway", v)} />
          <ToggleSwitch label="Room" checked={form.room} onChange={(v) => update("room", v)} />
          <ToggleSwitch label="Inventory" checked={form.inventory} onChange={(v) => update("inventory", v)} />
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

// ─── Tax & GST ──────────────────────────────────────────────────────────────
export const TaxGstView = () => {
  const { restaurant } = useRestaurant();
  const tax = restaurant?.tax || {};
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({
      percentage: tax.percentage || 0,
      gstPercentage: tax.gstPercentage || 0,
      gstCode: tax.gstCode || "",
    });
  }, [tax.percentage, tax.gstPercentage, tax.gstCode]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div>
      <EditBar
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => setIsEditing(false)}
        onCancel={() => {
          setIsEditing(false);
          setForm({ percentage: tax.percentage, gstPercentage: tax.gstPercentage, gstCode: tax.gstCode });
        }}
      />
      {isEditing ? (
        <>
          <NumberInput label="Tax %" value={form.percentage} onChange={(v) => update("percentage", v)} min={0} max={100} step={0.1} suffix="%" />
          <NumberInput label="GST %" value={form.gstPercentage} onChange={(v) => update("gstPercentage", v)} min={0} max={100} step={0.1} suffix="%" />
          <TextInput label="GST Code" value={form.gstCode} onChange={(v) => update("gstCode", v)} />
        </>
      ) : (
        <>
          <Field label="Tax %" value={`${tax.percentage}%`} />
          <Field label="GST %" value={`${tax.gstPercentage}%`} />
          <Field label="GST Code" value={tax.gstCode} />
        </>
      )}
    </div>
  );
};

// ─── Service Charge ─────────────────────────────────────────────────────────
export const ServiceChargeView = () => {
  const { restaurant } = useRestaurant();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({
      serviceCharge: restaurant?.features?.serviceCharge ?? false,
      tip: restaurant?.features?.tip ?? false,
    });
  }, [restaurant]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div>
      <EditBar
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => setIsEditing(false)}
        onCancel={() => {
          setIsEditing(false);
          setForm({ serviceCharge: restaurant?.features?.serviceCharge, tip: restaurant?.features?.tip });
        }}
      />
      {isEditing ? (
        <>
          <ToggleSwitch label="Service Charge" checked={form.serviceCharge} onChange={(v) => update("serviceCharge", v)} />
          <ToggleSwitch label="Tip" checked={form.tip} onChange={(v) => update("tip", v)} />
        </>
      ) : (
        <>
          <Field label="Service Charge"><BoolBadge value={restaurant?.features?.serviceCharge} /></Field>
          <Field label="Tip"><BoolBadge value={restaurant?.features?.tip} /></Field>
        </>
      )}
    </div>
  );
};

// ─── Delivery Settings ──────────────────────────────────────────────────────
export const DeliverySettingsView = () => {
  const { restaurant } = useRestaurant();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({
      delivery: restaurant?.features?.delivery ?? false,
      takeaway: restaurant?.features?.takeaway ?? false,
    });
  }, [restaurant]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div>
      <EditBar
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => setIsEditing(false)}
        onCancel={() => {
          setIsEditing(false);
          setForm({ delivery: restaurant?.features?.delivery, takeaway: restaurant?.features?.takeaway });
        }}
      />
      {isEditing ? (
        <>
          <ToggleSwitch label="Delivery" checked={form.delivery} onChange={(v) => update("delivery", v)} />
          <ToggleSwitch label="Takeaway" checked={form.takeaway} onChange={(v) => update("takeaway", v)} />
        </>
      ) : (
        <>
          <Field label="Delivery"><BoolBadge value={restaurant?.features?.delivery} /></Field>
          <Field label="Takeaway"><BoolBadge value={restaurant?.features?.takeaway} /></Field>
        </>
      )}
    </div>
  );
};

// ─── General Settings ───────────────────────────────────────────────────────
export const GeneralSettingsView = () => {
  const { restaurant } = useRestaurant();
  const { enableDynamicTables, setEnableDynamicTables } = useSettings();
  const settings = restaurant?.settings || {};
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({
      isCoupon: settings.isCoupon ?? false,
      isLoyalty: settings.isLoyalty ?? false,
      isCustomerWallet: settings.isCustomerWallet ?? false,
      aggregatorAutoKot: settings.aggregatorAutoKot ?? false,
      defaultPrepTime: settings.defaultPrepTime || 15,
      enableDynamicTables: enableDynamicTables ?? false,
    });
  }, [settings.isCoupon, settings.isLoyalty, settings.isCustomerWallet, settings.aggregatorAutoKot, settings.defaultPrepTime, enableDynamicTables]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div>
      <EditBar
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => {
          // Save dynamic tables setting to localStorage
          setEnableDynamicTables(form.enableDynamicTables);
          setIsEditing(false);
        }}
        onCancel={() => {
          setIsEditing(false);
          setForm({
            isCoupon: settings.isCoupon, isLoyalty: settings.isLoyalty,
            isCustomerWallet: settings.isCustomerWallet,
            aggregatorAutoKot: settings.aggregatorAutoKot,
            defaultPrepTime: settings.defaultPrepTime || 15,
            enableDynamicTables: enableDynamicTables,
          });
        }}
      />
      
      {/* Local Settings Section */}
      <SectionTitle>Order Entry</SectionTitle>
      {isEditing ? (
        <ToggleSwitch 
          label="Dynamic Table Names" 
          checked={form.enableDynamicTables} 
          onChange={(v) => update("enableDynamicTables", v)} 
        />
      ) : (
        <Field label="Dynamic Table Names"><BoolBadge value={enableDynamicTables} /></Field>
      )}
      <p className="text-xs mb-4 -mt-2" style={{ color: COLORS.grayText }}>
        Show custom table name input for walk-in orders
      </p>

      <SectionTitle>General</SectionTitle>
      {isEditing ? (
        <>
          <ToggleSwitch label="Coupons" checked={form.isCoupon} onChange={(v) => update("isCoupon", v)} />
          <ToggleSwitch label="Loyalty" checked={form.isLoyalty} onChange={(v) => update("isLoyalty", v)} />
          <ToggleSwitch label="Customer Wallet" checked={form.isCustomerWallet} onChange={(v) => update("isCustomerWallet", v)} />
          <ToggleSwitch label="Aggregator Auto KOT" checked={form.aggregatorAutoKot} onChange={(v) => update("aggregatorAutoKot", v)} />
          <NumberInput label="Default Prep Time" value={form.defaultPrepTime} onChange={(v) => update("defaultPrepTime", v)} min={1} max={120} suffix="min" />
        </>
      ) : (
        <>
          <Field label="Coupons"><BoolBadge value={settings.isCoupon} /></Field>
          <Field label="Loyalty"><BoolBadge value={settings.isLoyalty} /></Field>
          <Field label="Customer Wallet"><BoolBadge value={settings.isCustomerWallet} /></Field>
          <Field label="Aggregator Auto KOT"><BoolBadge value={settings.aggregatorAutoKot} /></Field>
          <Field label="Default Prep Time" value={`${settings.defaultPrepTime || 15} min`} />
        </>
      )}
    </div>
  );
};
