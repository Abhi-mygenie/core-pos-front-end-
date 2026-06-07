import { useState } from "react";
import { COLORS } from "../../../constants";
import { useRestaurant, useSettings } from "../../../contexts";
import {
  ListItem, ListHeader, FormContainer, BoolBadge,
  TextInput, NumberInput, TimeInput, SelectInput, ToggleSwitch,
} from "./shared";

// ═══════════════════════════════════════════════════════════════════════════
// Pattern B: List + Add/Edit Form Views
// ═══════════════════════════════════════════════════════════════════════════

// ─── Operating Hours ────────────────────────────────────────────────────────
export const OperatingHoursView = () => {
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'form'
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({});

  const handleEdit = (schedule) => {
    setEditingItem(schedule);
    setForm({ dayName: schedule.dayName, openingTime: schedule.openingTime || "", closingTime: schedule.closingTime || "" });
    setViewMode("form");
  };

  const handleBack = () => {
    setViewMode("list");
    setEditingItem(null);
    setForm({});
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  if (viewMode === "form") {
    return (
      <FormContainer title={`Edit ${form.dayName || "Schedule"}`} onBack={handleBack} onSave={handleBack}>
        <TextInput label="Day" value={form.dayName} onChange={() => {}} />
        <TimeInput label="Opening Time" value={form.openingTime} onChange={(v) => update("openingTime", v)} />
        <TimeInput label="Closing Time" value={form.closingTime} onChange={(v) => update("closingTime", v)} />
      </FormContainer>
    );
  }

  return (
    <div>
      {schedules.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.grayText }}>No operating hours configured.</p>
      ) : (
        schedules.map((s) => (
          <ListItem key={s.id} onEdit={() => handleEdit(s)} onDelete={() => {}} testId={`schedule-${s.id}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{s.dayName}</span>
              <span className="text-sm" style={{ color: COLORS.grayText }}>{s.openingTime || "—"} — {s.closingTime || "—"}</span>
            </div>
          </ListItem>
        ))
      )}
    </div>
  );
};

// ─── Payment Methods ────────────────────────────────────────────────────────
export const PaymentMethodsView = () => {
  const { restaurant, paymentTypes } = useRestaurant();
  const methods = restaurant?.paymentMethods || {};
  const [viewMode, setViewMode] = useState("list");
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({});
  const [toggles, setToggles] = useState({
    cash: methods.cash ?? true,
    upi: methods.upi ?? false,
    card: methods.card ?? false,
    tab: methods.tab ?? false,
  });

  const handleAdd = () => {
    setEditingItem(null);
    setForm({ name: "", displayName: "" });
    setViewMode("form");
  };

  const handleEdit = (pt) => {
    setEditingItem(pt);
    setForm({ name: pt.name || "", displayName: pt.displayName || "" });
    setViewMode("form");
  };

  const handleBack = () => {
    setViewMode("list");
    setEditingItem(null);
    setForm({});
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  if (viewMode === "form") {
    return (
      <FormContainer title={editingItem ? "Edit Payment Type" : "Add Payment Type"} onBack={handleBack} onSave={handleBack}>
        <TextInput label="Name" value={form.name} onChange={(v) => update("name", v)} required />
        <TextInput label="Display Name" value={form.displayName} onChange={(v) => update("displayName", v)} />
      </FormContainer>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>Payment Toggles</h3>
      <ToggleSwitch label="Cash" checked={toggles.cash} onChange={(v) => setToggles((p) => ({ ...p, cash: v }))} />
      <ToggleSwitch label="UPI" checked={toggles.upi} onChange={(v) => setToggles((p) => ({ ...p, upi: v }))} />
      <ToggleSwitch label="Card" checked={toggles.card} onChange={(v) => setToggles((p) => ({ ...p, card: v }))} />
      <ToggleSwitch label="Tab/Credit" checked={toggles.tab} onChange={(v) => setToggles((p) => ({ ...p, tab: v }))} />

      <div className="mt-6">
        <ListHeader title="Payment Types" count={paymentTypes.length} onAdd={handleAdd} />
        {paymentTypes.map((pt) => (
          <ListItem key={pt.id} onEdit={() => handleEdit(pt)} onDelete={() => {}} testId={`payment-type-${pt.id}`}>
            <div className="text-sm font-medium" style={{ color: COLORS.darkText }}>{pt.displayName || pt.name}</div>
            <div className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>ID: {pt.id}</div>
          </ListItem>
        ))}
      </div>
    </div>
  );
};

// ─── Discount Types ─────────────────────────────────────────────────────────
export const DiscountTypesView = () => {
  const { discountTypes } = useRestaurant();
  const [viewMode, setViewMode] = useState("list");
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({});

  const handleAdd = () => {
    setEditingItem(null);
    setForm({ name: "", discountPercent: 0 });
    setViewMode("form");
  };

  const handleEdit = (d) => {
    setEditingItem(d);
    setForm({ name: d.name || "", discountPercent: d.discountPercent || 0 });
    setViewMode("form");
  };

  const handleBack = () => {
    setViewMode("list");
    setEditingItem(null);
    setForm({});
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  if (viewMode === "form") {
    return (
      <FormContainer title={editingItem ? "Edit Discount Type" : "Add Discount Type"} onBack={handleBack} onSave={handleBack}>
        <TextInput label="Name" value={form.name} onChange={(v) => update("name", v)} required />
        <NumberInput label="Discount %" value={form.discountPercent} onChange={(v) => update("discountPercent", v)} min={0} max={100} step={0.5} suffix="%" />
      </FormContainer>
    );
  }

  return (
    <div>
      <ListHeader title="Discount Types" count={discountTypes.length} onAdd={handleAdd} />
      {discountTypes.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.grayText }}>No discount types configured.</p>
      ) : (
        discountTypes.map((d) => (
          <ListItem key={d.id} onEdit={() => handleEdit(d)} onDelete={() => {}} testId={`discount-${d.id}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{d.name}</span>
              <span className="text-sm font-medium" style={{ color: COLORS.primaryOrange }}>{d.discountPercent}%</span>
            </div>
          </ListItem>
        ))
      )}
    </div>
  );
};

// ─── Printers ───────────────────────────────────────────────────────────────
export const PrintersView = () => {
  const { printers } = useRestaurant();
  const [viewMode, setViewMode] = useState("list");
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({});

  const handleAdd = () => {
    setEditingItem(null);
    setForm({ name: "", type: "kitchen", paperSize: "80", isActive: true });
    setViewMode("form");
  };

  const handleEdit = (p) => {
    setEditingItem(p);
    setForm({ name: p.name || "", type: p.type || "kitchen", paperSize: String(p.paperSize || "80"), isActive: p.isActive ?? true });
    setViewMode("form");
  };

  const handleBack = () => {
    setViewMode("list");
    setEditingItem(null);
    setForm({});
  };

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  if (viewMode === "form") {
    return (
      <FormContainer title={editingItem ? "Edit Printer" : "Add Printer"} onBack={handleBack} onSave={handleBack}>
        <TextInput label="Name" value={form.name} onChange={(v) => update("name", v)} required />
        <SelectInput
          label="Type"
          value={form.type}
          onChange={(v) => update("type", v)}
          options={[
            { value: "kitchen", label: "Kitchen" },
            { value: "bar", label: "Bar" },
            { value: "bill", label: "Bill" },
            { value: "kds", label: "KDS" },
          ]}
        />
        <SelectInput
          label="Paper Size"
          value={form.paperSize}
          onChange={(v) => update("paperSize", v)}
          options={[
            { value: "58", label: "58mm" },
            { value: "80", label: "80mm" },
          ]}
        />
        <ToggleSwitch label="Active" checked={form.isActive} onChange={(v) => update("isActive", v)} />
      </FormContainer>
    );
  }

  return (
    <div>
      <ListHeader title="Printer Stations" count={printers.length} onAdd={handleAdd} />
      {printers.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.grayText }}>No printers configured.</p>
      ) : (
        printers.map((p) => (
          <ListItem key={p.id} onEdit={() => handleEdit(p)} onDelete={() => {}} testId={`printer-${p.id}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{p.name}</span>
              <BoolBadge value={p.isActive} trueLabel="Active" falseLabel="Inactive" />
            </div>
            <div className="text-xs" style={{ color: COLORS.grayText }}>
              Type: {p.type} &middot; Paper: {p.paperSize}mm &middot; Categories: {p.categoryIds?.length || 0}
            </div>
          </ListItem>
        ))
      )}
    </div>
  );
};

// ─── Cancellation Reasons ───────────────────────────────────────────────────
export const CancellationReasonsView = () => {
  const { cancellationReasons } = useSettings();
  const [viewMode, setViewMode] = useState("list");
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({});

  const handleAdd = () => {
    setEditingItem(null);
    setForm({ reasonText: "", applicableTo: "both", isActive: true });
    setViewMode("form");
  };

  const handleEdit = (r) => {
    setEditingItem(r);
    setForm({ reasonText: r.reasonText || "", applicableTo: r.isForOrder && r.isForItem ? "both" : r.isForOrder ? "order" : "item", isActive: r.isActive ?? true });
    setViewMode("form");
  };

  const handleBack = () => {
    setViewMode("list");
    setEditingItem(null);
    setForm({});
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  if (viewMode === "form") {
    return (
      <FormContainer title={editingItem ? "Edit Reason" : "Add Reason"} onBack={handleBack} onSave={handleBack}>
        <TextInput label="Reason" value={form.reasonText} onChange={(v) => update("reasonText", v)} required />
        <SelectInput
          label="Applies To"
          value={form.applicableTo}
          onChange={(v) => update("applicableTo", v)}
          options={[
            { value: "order", label: "Order Level" },
            { value: "item", label: "Item Level" },
            { value: "both", label: "Both" },
          ]}
        />
        <ToggleSwitch label="Active" checked={form.isActive} onChange={(v) => update("isActive", v)} />
      </FormContainer>
    );
  }

  return (
    <div>
      <ListHeader title="Cancellation Reasons" count={cancellationReasons.length} onAdd={handleAdd} />
      {cancellationReasons.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.grayText }}>No cancellation reasons configured.</p>
      ) : (
        cancellationReasons.map((r) => (
          <ListItem key={r.reasonId} onEdit={() => handleEdit(r)} onDelete={() => {}} testId={`reason-${r.reasonId}`}>
            <div className="text-sm font-medium" style={{ color: COLORS.darkText }}>{r.reasonText}</div>
            <div className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>Applies to: {r.applicableTo}</div>
          </ListItem>
        ))
      )}
    </div>
  );
};
