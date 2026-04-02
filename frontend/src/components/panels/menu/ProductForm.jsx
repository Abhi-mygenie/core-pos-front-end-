import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { COLORS } from "../../../constants";

const ProductForm = ({ product, categories, currencySymbol, onBack, onSave }) => {
  const isNew = !product;
  const [form, setForm] = useState({});

  useEffect(() => {
    if (product) {
      setForm({
        productName: product.productName || "",
        description: product.description || "",
        basePrice: product.basePrice || 0,
        categoryId: product.categoryId || "",
        station: product.station || "KDS",
        itemCode: product.itemCode || "",
        foodType: product.hasEgg ? "egg" : product.isJain ? "jain" : product.isVeg ? "veg" : "nonveg",
        dineIn: product.availability?.dineIn ?? true,
        delivery: product.availability?.delivery ?? true,
        takeaway: product.availability?.takeaway ?? true,
        isOutOfStock: product.isOutOfStock || false,
        isDisabled: product.isDisabled || false,
        isComplementary: product.isComplementary || false,
        complementaryPrice: product.complementaryPrice || 0,
        taxPercentage: product.tax?.percentage || 0,
        taxType: product.tax?.type || "GST",
        taxIsInclusive: product.tax?.isInclusive || false,
        discount: product.discount || 0,
        discountType: product.discountType || "percent",
        prepTimeMin: product.prepTimeMin || 15,
        serveTimeMin: product.serveTimeMin || 10,
      });
    } else {
      setForm({
        productName: "", description: "", basePrice: 0, categoryId: categories?.[0]?.categoryId || "",
        station: "KDS", itemCode: "", foodType: "veg",
        dineIn: true, delivery: true, takeaway: true,
        isOutOfStock: false, isDisabled: false, isComplementary: false, complementaryPrice: 0,
        taxPercentage: 0, taxType: "GST", taxIsInclusive: false,
        discount: 0, discountType: "percent", prepTimeMin: 15, serveTimeMin: 10,
      });
    }
  }, [product, categories]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const InputField = ({ label, value, onChange, type = "text", ...props }) => (
    <div className="py-2">
      <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
        style={{ borderColor: COLORS.borderGray }}
        {...props}
      />
    </div>
  );

  const SelectField = ({ label, value, onChange, options }) => (
    <div className="py-2">
      <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
        style={{ borderColor: COLORS.borderGray }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const ToggleField = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: COLORS.borderGray }}>
      <span className="text-sm" style={{ color: COLORS.darkText }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{ backgroundColor: checked ? COLORS.primaryGreen : COLORS.borderGray }}
      >
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow" style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
      </button>
    </div>
  );

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

      {/* Form */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <InputField label="Name *" value={form.productName} onChange={(v) => update("productName", v)} />
        <InputField label="Description" value={form.description} onChange={(v) => update("description", v)} />

        <div className="grid grid-cols-2 gap-4">
          <InputField label={`Price (${currencySymbol}) *`} value={form.basePrice} onChange={(v) => update("basePrice", v)} type="number" min={0} step={0.01} />
          <SelectField
            label="Category *"
            value={form.categoryId}
            onChange={(v) => update("categoryId", v)}
            options={(categories || []).map((c) => ({ value: c.categoryId, label: c.categoryName }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Station *"
            value={form.station}
            onChange={(v) => update("station", v)}
            options={[{ value: "KDS", label: "KDS (Kitchen)" }, { value: "BAR", label: "BAR" }, { value: "BILL", label: "BILL" }]}
          />
          <InputField label="Item Code" value={form.itemCode} onChange={(v) => update("itemCode", v)} />
        </div>

        {/* Food Type */}
        <div className="py-3">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Food Type</label>
          <div className="flex gap-3">
            {[
              { value: "veg", label: "Veg", color: COLORS.primaryGreen },
              { value: "nonveg", label: "Non-Veg", color: "#EF4444" },
              { value: "egg", label: "Egg", color: "#F59E0B" },
              { value: "jain", label: "Jain", color: "#8B5CF6" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="foodType"
                  checked={form.foodType === opt.value}
                  onChange={() => update("foodType", opt.value)}
                  className="sr-only"
                />
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: opt.color }}
                >
                  {form.foodType === opt.value && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                </div>
                <span className="text-sm" style={{ color: COLORS.darkText }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Availability</label>
          <ToggleField label="Dine-In" checked={form.dineIn} onChange={(v) => update("dineIn", v)} />
          <ToggleField label="Delivery" checked={form.delivery} onChange={(v) => update("delivery", v)} />
          <ToggleField label="Takeaway" checked={form.takeaway} onChange={(v) => update("takeaway", v)} />
        </div>

        {/* Status */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Status</label>
          <ToggleField label="Stock Out" checked={form.isOutOfStock} onChange={(v) => update("isOutOfStock", v)} />
          <ToggleField label="Disabled (hidden from POS)" checked={form.isDisabled} onChange={(v) => update("isDisabled", v)} />
        </div>

        {/* Complementary */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Complementary</label>
          <ToggleField label="Is Complementary" checked={form.isComplementary} onChange={(v) => update("isComplementary", v)} />
          {form.isComplementary && (
            <InputField label={`Complementary Price (${currencySymbol})`} value={form.complementaryPrice} onChange={(v) => update("complementaryPrice", v)} type="number" min={0} />
          )}
        </div>

        {/* Tax */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Tax</label>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Tax Type"
              value={form.taxType}
              onChange={(v) => update("taxType", v)}
              options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]}
            />
            <InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
          </div>
          <ToggleField label="Tax Inclusive" checked={form.taxIsInclusive} onChange={(v) => update("taxIsInclusive", v)} />
        </div>

        {/* Discount */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Discount</label>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Discount" value={form.discount} onChange={(v) => update("discount", v)} type="number" min={0} />
            <SelectField
              label="Type"
              value={form.discountType}
              onChange={(v) => update("discountType", v)}
              options={[{ value: "percent", label: "Percent" }, { value: "amount", label: "Amount" }]}
            />
          </div>
        </div>

        {/* Prep Time */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Timing</label>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Prep Time (min)" value={form.prepTimeMin} onChange={(v) => update("prepTimeMin", v)} type="number" min={0} />
            <InputField label="Serve Time (min)" value={form.serveTimeMin} onChange={(v) => update("serveTimeMin", v)} type="number" min={0} />
          </div>
        </div>

        {/* Variations (read-only) */}
        {product?.variations?.length > 0 && (
          <div className="py-3">
            <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>
              Variations ({product.variations.length})
              <span className="ml-2 text-xs font-normal italic">Read-only — full CRUD coming later</span>
            </label>
            {product.variations.map((v, i) => (
              <div key={i} className="p-2 mb-1 rounded border text-xs" style={{ borderColor: COLORS.borderGray }}>
                <span className="font-medium" style={{ color: COLORS.darkText }}>{v.name}</span>
                <span className="ml-2" style={{ color: COLORS.grayText }}>
                  ({v.type}) {v.values?.length || 0} options
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add-Ons (read-only) */}
        {product?.addOns?.length > 0 && (
          <div className="py-3">
            <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>
              Add-Ons ({product.addOns.length})
              <span className="ml-2 text-xs font-normal italic">Read-only — separate API coming later</span>
            </label>
            {product.addOns.map((a, i) => (
              <div key={i} className="p-2 mb-1 rounded border text-xs flex justify-between" style={{ borderColor: COLORS.borderGray }}>
                <span className="font-medium" style={{ color: COLORS.darkText }}>{a.name}</span>
                <span style={{ color: COLORS.grayText }}>{currencySymbol}{a.price}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 mt-4" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
        <button onClick={onBack} className="px-5 py-2.5 text-sm font-medium rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
          Cancel
        </button>
        <button onClick={onSave} className="px-5 py-2.5 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: COLORS.primaryGreen }} data-testid="product-form-save">
          {isNew ? "Add Product" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default ProductForm;
