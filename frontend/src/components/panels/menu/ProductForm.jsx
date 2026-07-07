import { useState, useEffect } from "react";
import { ArrowLeft, Upload, X as XIcon, ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from "lucide-react";
import { COLORS } from "../../../constants";
import { useToast } from "../../../hooks/use-toast";
import * as menuService from "../../../api/services/menuManagementService";
import { toAPI } from "../../../api/transforms/menuManagementTransform";

// ── Module-scope sub-components (BUG-120-A: stable React identity) ──

const InputField = ({ label, value, onChange, type = "text", required, placeholder, ...props }) => (
  <div className="py-1.5">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label}{required && <span style={{ color: "#EF4444" }}> *</span>}
    </label>
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
      onFocus={(e) => { if (type === "number" && (e.target.value === "0" || e.target.value === 0)) e.target.value = ""; }}
      onBlur={(e) => { if (type === "number" && e.target.value === "") onChange(0); }}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300"
      style={{ borderColor: COLORS.borderGray }}
      {...props}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, required }) => (
  <div className="py-1.5">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label}{required && <span style={{ color: "#EF4444" }}> *</span>}
    </label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white focus:ring-2 focus:ring-orange-100"
      style={{ borderColor: COLORS.borderGray }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const ToggleField = ({ label, checked, onChange, description }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <span className="text-sm" style={{ color: COLORS.darkText }}>{label}</span>
      {description && <span className="block text-xs" style={{ color: COLORS.grayText }}>{description}</span>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ backgroundColor: checked ? COLORS.primaryGreen : COLORS.borderGray }}
    >
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow" style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  </div>
);

const Section = ({ title, defaultOpen = true, badge, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl mb-3 overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>{title}</span>
          {badge && <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100" style={{ color: COLORS.grayText }}>{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: COLORS.grayText }} /> : <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />}
      </button>
      {open && <div className="px-4 pb-4 border-t" style={{ borderColor: COLORS.borderGray }}>{children}</div>}
    </div>
  );
};

const VariationOptionRow = ({ option, onChange, onDelete }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="pt-1 cursor-grab opacity-30 hover:opacity-100">
      <GripVertical className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
    </div>
    <input
      value={option.label}
      onChange={(e) => onChange({ ...option, label: e.target.value })}
      placeholder="Option name (e.g. Small)"
      className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-orange-100"
      style={{ borderColor: COLORS.borderGray }}
    />
    <div className="relative w-28">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: COLORS.grayText }}>+</span>
      <input
        type="number"
        value={option.optionPrice}
        onChange={(e) => onChange({ ...option, optionPrice: e.target.value })}
        placeholder="0"
        className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border outline-none text-right focus:ring-2 focus:ring-orange-100"
        style={{ borderColor: COLORS.borderGray }}
      />
    </div>
    <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 transition-colors">
      <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
    </button>
  </div>
);

const VariationGroup = ({ variation, index, onChange, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const optionCount = variation.values?.length || 0;

  const updateField = (key, val) => onChange({ ...variation, [key]: val });
  const addOption = () => onChange({ ...variation, values: [...(variation.values || []), { label: '', optionPrice: '0' }] });
  const updateOption = (i, opt) => { const v = [...variation.values]; v[i] = opt; onChange({ ...variation, values: v }); };
  const deleteOption = (i) => onChange({ ...variation, values: variation.values.filter((_, j) => j !== i) });

  return (
    <div className="border rounded-lg mb-3 overflow-hidden" style={{ borderColor: COLORS.borderGray, backgroundColor: '#FAFBFC' }} data-testid={`variation-group-${index}`}>
      <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Variation {index + 1}</span>
          {variation.name && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50" style={{ color: COLORS.primaryOrange }}>{variation.name}</span>}
          <span className="text-xs" style={{ color: COLORS.grayText }}>{optionCount} option{optionCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: COLORS.grayText }} /> : <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: COLORS.borderGray }}>
          <div className="pt-2">
            <input
              value={variation.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Variation name (e.g. Size, Spice Level)"
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-orange-100"
              style={{ borderColor: COLORS.borderGray }}
              data-testid={`variation-name-${index}`}
            />
          </div>

          <div className="flex items-center gap-3 mt-2 mb-3">
            <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => updateField('type', 'single')} className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ backgroundColor: variation.type === 'single' ? COLORS.primaryGreen : '#fff', color: variation.type === 'single' ? '#fff' : COLORS.grayText }}>
                Single
              </button>
              <button onClick={() => updateField('type', 'multi')} className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ backgroundColor: variation.type === 'multi' ? COLORS.primaryGreen : '#fff', color: variation.type === 'multi' ? '#fff' : COLORS.grayText }}>
                Multiple
              </button>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={variation.required === 'on'} onChange={(e) => updateField('required', e.target.checked ? 'on' : 'off')}
                className="w-3.5 h-3.5 rounded" style={{ accentColor: COLORS.primaryGreen }} />
              <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>Required</span>
            </label>
            {variation.type === 'multi' && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: COLORS.grayText }}>Min:</span>
                  <input type="number" value={variation.min || 0} min={0} onChange={(e) => updateField('min', parseInt(e.target.value) || 0)}
                    className="w-12 px-2 py-1 text-xs rounded border outline-none text-center" style={{ borderColor: COLORS.borderGray }} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: COLORS.grayText }}>Max:</span>
                  <input type="number" value={variation.max || 0} min={0} onChange={(e) => updateField('max', parseInt(e.target.value) || 0)}
                    className="w-12 px-2 py-1 text-xs rounded border outline-none text-center" style={{ borderColor: COLORS.borderGray }} />
                </div>
              </>
            )}
          </div>

          <div className="mb-2">
            <span className="text-xs font-medium block mb-1.5" style={{ color: COLORS.grayText }}>Options</span>
            {(variation.values || []).map((opt, i) => (
              <VariationOptionRow key={i} option={opt} onChange={(o) => updateOption(i, o)} onDelete={() => deleteOption(i)} />
            ))}
            {optionCount === 0 && (
              <div className="text-xs py-3 text-center rounded-lg border border-dashed" style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>
                No options added yet
              </div>
            )}
          </div>
          <button onClick={addOption} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
            style={{ color: COLORS.primaryGreen }} data-testid={`add-option-btn-${index}`}>
            <Plus className="w-3.5 h-3.5" /> Add Option
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main ProductForm ────────────────────────────────────────────────

const ProductForm = ({ product, categories, addons: allAddons, currencySymbol, menuType, onBack, onSave, onRefreshAddons }) => {
  const isNew = !product;
  const [form, setForm] = useState({});
  const [variations, setVariations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setSelectedAddonIds((product.addOns || []).map((a) => a.id).filter(Boolean));
      setForm({
        productName: product.productName || "",
        description: product.description || "",
        basePrice: product.basePrice || 0,
        categoryId: product.categoryId || "",
        itemCode: product.itemCode || "",
        foodType: product.hasEgg ? "egg" : product.isJain ? "jain" : product.isVeg ? "veg" : "nonveg",
        dineIn: product.availability?.dineIn ?? true,
        delivery: product.availability?.delivery ?? true,
        takeaway: product.availability?.takeaway ?? true,
        isComplementary: product.isComplementary || false,
        complementaryPrice: product.complementaryPrice || 0,
        taxPercentage: product.tax?.percentage || 0,
        taxType: product.tax?.type || "GST",
        taxCalc: product.taxCalc || 'Exclusive',
        discount: product.discount || 0,
        discountType: product.discountType || "percent",
        prepTimeMin: product.prepTimeMin || 15,
        serveTimeMin: product.serveTimeMin || 10,
        allergens: product.allergen || "",
        kcal: product.kcal || 0,
        giveDiscount: product.giveDiscount ?? true,
        liveWeb: product.liveWeb ?? true,
        isInventory: product.isInventory || false,
        packedFood: product.packedFood || false,
        isOutOfStock: product.isOutOfStock || false,
        isDisabled: product.isDisabled || false,
        packCharges: product.packCharges || 0,
        takeawayCharge: product.takeawayCharge || 0,
        deliveryCharge: product.deliveryCharge || 0,
        availableTimeStart: product.availableTimeStart || '00:00:00',
        availableTimeEnd: product.availableTimeEnd || '23:59:59',
        // CR-010: Weight-based billing fields
        itemUnit: product.itemUnit || '',
        itemUnitPrice: product.itemUnitPrice || 0,
        imageFile: null,
        imagePreview: product.productImage || null,
      });
      setVariations((product.variations || []).map((v) => ({
        name: v.name,
        type: v.type,
        required: v.required ? 'on' : 'off',
        min: v.min || 0,
        max: v.max || 0,
        values: (v.values || []).map((opt) => ({ label: opt.name, optionPrice: String(opt.price || 0) })),
      })));
    } else {
      setForm({
        productName: "", description: "", basePrice: 0, categoryId: categories?.[0]?.categoryId || "",
        itemCode: "", foodType: "veg",
        dineIn: true, delivery: true, takeaway: true,
        isComplementary: false, complementaryPrice: 0,
        taxPercentage: 0, taxType: "GST", taxCalc: 'Exclusive',
        discount: 0, discountType: "percent", prepTimeMin: 15, serveTimeMin: 10,
        allergens: "", kcal: 0, giveDiscount: true, liveWeb: true,
        isInventory: false, packedFood: false, isOutOfStock: false, isDisabled: false,
        packCharges: 0, takeawayCharge: 0, deliveryCharge: 0,
        availableTimeStart: '00:00:00', availableTimeEnd: '23:59:59',
        // CR-010: Weight-based billing fields
        itemUnit: '', itemUnitPrice: 0,
        imageFile: null, imagePreview: null,
      });
      setVariations([]);
    }
  }, [product, categories]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const addVariation = () => setVariations((v) => [...v, { name: '', type: 'single', required: 'off', min: 0, max: 0, values: [] }]);
  const updateVariation = (i, v) => setVariations((prev) => { const n = [...prev]; n[i] = v; return n; });
  const deleteVariation = (i) => setVariations((prev) => prev.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col h-full" data-testid="product-form">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" style={{ color: COLORS.darkText }} />
        </button>
        <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>
          {isNew ? "Add Product" : `Edit: ${product.productName}`}
        </h3>
      </div>

      {/* Form — sectioned layout */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Basic Info (always visible) ────────────────────────── */}
        <div className="mb-4">
          {/* CR-010: Name + Sold By side by side */}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Name" value={form.productName} onChange={(v) => update("productName", v)} required />
            <SelectField label="Sold By (Unit)" value={form.itemUnit} onChange={(v) => update("itemUnit", v)}
              options={[
                { value: "", label: "Piece (default)" },
                { value: "Kg", label: "Kilogram (Kg)" },
                { value: "gm", label: "Gram (gm)" },
                { value: "L", label: "Litre (L)" },
                { value: "ml", label: "Millilitre (ml)" },
              ]} />
          </div>
          <div className="py-1.5">
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Description</label>
            <textarea
              value={form.description || ""} onChange={(e) => update("description", e.target.value)}
              rows={2} placeholder="Item description..."
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-none focus:ring-2 focus:ring-orange-100"
              style={{ borderColor: COLORS.borderGray }}
            />
          </div>
          <div className="py-1.5">
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Product Image</label>
            <div className="flex items-center gap-3">
              {form.imagePreview && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
                  <img src={form.imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={() => update("imagePreview", null)} className="absolute top-0 right-0 p-0.5 bg-white/80 rounded-bl">
                    <XIcon className="w-3 h-3" style={{ color: "#EF4444" }} />
                  </button>
                </div>
              )}
              <label className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }} data-testid="image-upload-btn">
                <Upload className="w-4 h-4" />
                {form.imagePreview ? "Change" : "Upload"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { update("imageFile", file); update("imagePreview", URL.createObjectURL(file)); }
                }} />
              </label>
            </div>
          </div>
        </div>

        {/* ── Pricing & Tax ──────────────────────────────────────── */}
        <Section title="Pricing & Tax" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <InputField label={`Price (${currencySymbol})`} value={form.basePrice} onChange={(v) => update("basePrice", v)} type="number" min={0} step={0.01} required />
            <SelectField label="Category" value={form.categoryId} onChange={(v) => update("categoryId", v)} required
              options={(categories || []).map((c) => ({ value: c.categoryId, label: c.categoryName }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SelectField label="Tax Type" value={form.taxType} onChange={(v) => update("taxType", v)}
              options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]} />
            <InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
            <SelectField label="Tax Calculation" value={form.taxCalc} onChange={(v) => update("taxCalc", v)}
              options={[{ value: "Inclusive", label: "Inclusive" }, { value: "Exclusive", label: "Exclusive" }]} />
          </div>
          <ToggleField label="Allow Discount" checked={form.giveDiscount} onChange={(v) => update("giveDiscount", v)} />
          {form.giveDiscount && (
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Discount" value={form.discount} onChange={(v) => update("discount", v)} type="number" min={0} />
              <SelectField label="Type" value={form.discountType} onChange={(v) => update("discountType", v)}
                options={[{ value: "percent", label: "Percent" }, { value: "amount", label: "Amount" }]} />
            </div>
          )}
        </Section>

        {/* ── Classification ─────────────────────────────────────── */}
        <Section title="Classification" defaultOpen={true}>
          <InputField label="Item Code" value={form.itemCode} onChange={(v) => update("itemCode", v)} />
          <div className="py-2">
            <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Food Type</label>
            <div className="flex gap-3">
              {[
                { value: "veg", label: "Veg", color: COLORS.primaryGreen },
                { value: "nonveg", label: "Non-Veg", color: "#EF4444" },
                { value: "egg", label: "Egg", color: "#F59E0B" },
                { value: "jain", label: "Jain", color: "#8B5CF6" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="foodType" checked={form.foodType === opt.value} onChange={() => update("foodType", opt.value)} className="sr-only" />
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: opt.color }}>
                    {form.foodType === opt.value && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                  </div>
                  <span className="text-sm" style={{ color: COLORS.darkText }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Allergens" value={form.allergens} onChange={(v) => update("allergens", v)} placeholder="e.g. Milk, Nuts" />
            <InputField label="Kcal" value={form.kcal} onChange={(v) => update("kcal", v)} type="number" min={0} />
          </div>
        </Section>

        {/* ── Availability & Channels ────────────────────────────── */}
        <Section title="Availability & Channels" defaultOpen={false}>
          <div className="pt-2">
            <ToggleField label="Dine-In" checked={form.dineIn} onChange={(v) => update("dineIn", v)} />
            <ToggleField label="Delivery" checked={form.delivery} onChange={(v) => update("delivery", v)} />
            <ToggleField label="Takeaway" checked={form.takeaway} onChange={(v) => update("takeaway", v)} />
            <ToggleField label="Live Web (Online Ordering)" checked={form.liveWeb} onChange={(v) => update("liveWeb", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <InputField label="Available From" value={form.availableTimeStart} onChange={(v) => update("availableTimeStart", v)} type="time" />
            <InputField label="Available Until" value={form.availableTimeEnd} onChange={(v) => update("availableTimeEnd", v)} type="time" />
          </div>
        </Section>

        {/* ── Food Variations (CRUD) ─────────────────────────────── */}
        <Section title="Food Variations" defaultOpen={variations.length > 0} badge={variations.length > 0 ? `${variations.length}` : undefined}>
          <div className="pt-2">
            {variations.length === 0 && (
              <div className="text-center py-6 rounded-lg border border-dashed mb-3" style={{ borderColor: COLORS.borderGray }}>
                <span className="text-sm" style={{ color: COLORS.grayText }}>No variations added</span>
                <br />
                <span className="text-xs" style={{ color: COLORS.grayText }}>Add size, spice level, or other options</span>
              </div>
            )}
            {variations.map((v, i) => (
              <VariationGroup key={i} variation={v} index={i} onChange={(upd) => updateVariation(i, upd)} onDelete={() => deleteVariation(i)} />
            ))}
            <button onClick={addVariation}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-dashed transition-colors hover:bg-green-50"
              style={{ borderColor: COLORS.primaryGreen, color: COLORS.primaryGreen }} data-testid="add-variation-btn">
              <Plus className="w-4 h-4" /> Add New Variation
            </button>
          </div>
        </Section>

        {/* ── Food Addons ────────────────────────────────────────── */}
        <Section title="Food Addons" defaultOpen={false} badge={selectedAddonIds.length > 0 ? `${selectedAddonIds.length} selected` : undefined}>
          <div className="pt-2">
            <div className="max-h-40 overflow-y-auto mb-2 space-y-1">
              {(allAddons || []).map((a) => {
                const isSelected = selectedAddonIds.includes(a.id);
                return (
                  <label key={a.id} className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50" data-testid={`addon-option-${a.id}`}>
                    <input type="checkbox" checked={isSelected}
                      onChange={() => setSelectedAddonIds((prev) => isSelected ? prev.filter((id) => id !== a.id) : [...prev, a.id])}
                      className="w-3.5 h-3.5 rounded" style={{ accentColor: COLORS.primaryOrange }} />
                    <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{a.name}</span>
                    <span className="text-xs" style={{ color: COLORS.grayText }}>{currencySymbol}{a.price}</span>
                  </label>
                );
              })}
              {(!allAddons || allAddons.length === 0) && (
                <div className="text-xs py-2 text-center" style={{ color: COLORS.grayText }}>No add-ons available</div>
              )}
            </div>
            <div className="flex gap-2 items-end pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
              <div className="flex-1">
                <input value={newAddonName} onChange={(e) => setNewAddonName(e.target.value)} placeholder="New add-on name"
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none" style={{ borderColor: COLORS.borderGray }} data-testid="new-addon-name" />
              </div>
              <div className="w-20">
                <input type="number" value={newAddonPrice} onChange={(e) => setNewAddonPrice(e.target.value)} placeholder="Price"
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none" style={{ borderColor: COLORS.borderGray }} min={0} data-testid="new-addon-price" />
              </div>
              <button onClick={async () => {
                if (!newAddonName.trim() || !newAddonPrice) return;
                try {
                  await menuService.addAddon(newAddonName.trim(), newAddonPrice);
                  toast({ title: "Added", description: `Add-on "${newAddonName}" created.` });
                  setNewAddonName(""); setNewAddonPrice("");
                  if (onRefreshAddons) onRefreshAddons();
                } catch (err) {
                  console.error('[ProductForm] Add-on create failed:', err);
                  toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
                }
              }} className="px-3 py-1.5 text-xs rounded text-white" style={{ backgroundColor: COLORS.primaryOrange }} data-testid="add-addon-btn">
                Add
              </button>
            </div>
          </div>
        </Section>

        {/* ── Operations ─────────────────────────────────────────── */}
        <Section title="Operations" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <InputField label="Prep Time (min)" value={form.prepTimeMin} onChange={(v) => update("prepTimeMin", v)} type="number" min={0} />
            <InputField label="Serve Time (min)" value={form.serveTimeMin} onChange={(v) => update("serveTimeMin", v)} type="number" min={0} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <InputField label="Pack Charges" value={form.packCharges} onChange={(v) => update("packCharges", v)} type="number" min={0} />
            <InputField label="Takeaway Charge" value={form.takeawayCharge} onChange={(v) => update("takeawayCharge", v)} type="number" min={0} />
            <InputField label="Delivery Charge" value={form.deliveryCharge} onChange={(v) => update("deliveryCharge", v)} type="number" min={0} />
          </div>
        </Section>

        {/* ── Status & Flags ─────────────────────────────────────── */}
        <Section title="Status & Flags" defaultOpen={false}>
          <div className="pt-2">
            <ToggleField label="Complementary" checked={form.isComplementary} onChange={(v) => update("isComplementary", v)} description="Offer as complimentary item" />
            {form.isComplementary && (
              <InputField label={`Complementary Price (${currencySymbol})`} value={form.complementaryPrice} onChange={(v) => update("complementaryPrice", v)} type="number" min={0} />
            )}
            <ToggleField label="Inventory Item" checked={form.isInventory} onChange={(v) => update("isInventory", v)} description="Track in inventory" />
            <ToggleField label="Packaged Item" checked={form.packedFood} onChange={(v) => update("packedFood", v)} description="Pre-packaged product" />
            <ToggleField label="Out of Stock" checked={form.isOutOfStock} onChange={(v) => update("isOutOfStock", v)} description="Mark as unavailable" />
            <ToggleField label="Hidden from POS" checked={form.isDisabled} onChange={(v) => update("isDisabled", v)} description="Hide from order-taking" />
          </div>
        </Section>

      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 mt-4" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
        <button onClick={onBack} className="px-5 py-2.5 text-sm font-medium rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
          Cancel
        </button>
        <button
          onClick={async () => {
            setSaving(true);
            try {
              const foodInfo = toAPI.foodInfo({ ...form, foodFor: menuType || 'Normal', addonIds: selectedAddonIds, variations: variations });
              if (isNew) {
                await menuService.addFood(foodInfo, form.imageFile);
              } else {
                await menuService.editFood(product.productId, foodInfo, form.imageFile);
              }
              toast({ title: "Saved", description: isNew ? "Product added." : "Product updated." });
              onSave();
            } catch (err) {
              console.error('[ProductForm] Save failed:', err);
              toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-medium rounded-lg text-white disabled:opacity-60"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="product-form-save"
        >
          {saving ? "Saving..." : isNew ? "Add Product" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default ProductForm;
