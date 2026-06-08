import { useState, useEffect } from "react";
import { ArrowLeft, Upload, X as XIcon } from "lucide-react";
import { COLORS } from "../../../constants";
import { useToast } from "../../../hooks/use-toast";
import * as menuService from "../../../api/services/menuManagementService";
import { toAPI } from "../../../api/transforms/menuManagementTransform";

const ProductForm = ({ product, categories, addons: allAddons, currencySymbol, menuType, onBack, onSave, onRefreshAddons }) => {
  const isNew = !product;
  const [form, setForm] = useState({});
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
        discount: product.discount || 0,
        discountType: product.discountType || "percent",
        prepTimeMin: product.prepTimeMin || 15,
        serveTimeMin: product.serveTimeMin || 10,
        allergens: product.allergen || "",
        kcal: product.kcal || 0,
        giveDiscount: product.giveDiscount ?? true,
        liveWeb: product.liveWeb ?? true,
        imageFile: null,
        imagePreview: product.productImage || null,
      });
    } else {
      setForm({
        productName: "", description: "", basePrice: 0, categoryId: categories?.[0]?.categoryId || "",
        itemCode: "", foodType: "veg",
        dineIn: true, delivery: true, takeaway: true,
        isComplementary: false, complementaryPrice: 0,
        taxPercentage: 0, taxType: "GST",
        discount: 0, discountType: "percent", prepTimeMin: 15, serveTimeMin: 10,
        allergens: "", kcal: 0, giveDiscount: true, liveWeb: true,
        imageFile: null, imagePreview: null,
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

        {/* Image Upload */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Product Image</label>
          <div className="flex items-center gap-3">
            {form.imagePreview && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
                <img src={form.imagePreview} alt="preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => update("imagePreview", null)}
                  className="absolute top-0 right-0 p-0.5 bg-white/80 rounded-bl"
                >
                  <XIcon className="w-3 h-3" style={{ color: "#EF4444" }} />
                </button>
              </div>
            )}
            <label
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="image-upload-btn"
            >
              <Upload className="w-4 h-4" />
              {form.imagePreview ? "Change" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    update("imageFile", file);
                    update("imagePreview", URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>
        </div>

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
          <InputField label="Item Code" value={form.itemCode} onChange={(v) => update("itemCode", v)} />
          <InputField label={`Price (${currencySymbol}) *`} value={form.basePrice} onChange={(v) => update("basePrice", v)} type="number" min={0} step={0.01} />
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

        {/* Allergens + Kcal */}
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Allergens" value={form.allergens} onChange={(v) => update("allergens", v)} placeholder="e.g. Milk, Nuts" />
          <InputField label="Kcal" value={form.kcal} onChange={(v) => update("kcal", v)} type="number" min={0} />
        </div>

        {/* Availability */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Availability</label>
          <ToggleField label="Dine-In" checked={form.dineIn} onChange={(v) => update("dineIn", v)} />
          <ToggleField label="Delivery" checked={form.delivery} onChange={(v) => update("delivery", v)} />
          <ToggleField label="Takeaway" checked={form.takeaway} onChange={(v) => update("takeaway", v)} />
          <ToggleField label="Live Web (Online Ordering)" checked={form.liveWeb} onChange={(v) => update("liveWeb", v)} />
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
        </div>

        {/* Discount */}
        <div className="py-2">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>Discount</label>
          <ToggleField label="Allow Discount" checked={form.giveDiscount} onChange={(v) => update("giveDiscount", v)} />
          {form.giveDiscount && (
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Discount" value={form.discount} onChange={(v) => update("discount", v)} type="number" min={0} />
              <SelectField
                label="Type"
                value={form.discountType}
                onChange={(v) => update("discountType", v)}
                options={[{ value: "percent", label: "Percent" }, { value: "amount", label: "Amount" }]}
              />
            </div>
          )}
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

        {/* Add-Ons — select from global list + inline create */}
        <div className="py-3">
          <label className="block text-xs font-medium mb-2" style={{ color: COLORS.grayText }}>
            Add-Ons ({selectedAddonIds.length} selected)
          </label>
          {/* Existing addons — toggle selection */}
          <div className="max-h-40 overflow-y-auto mb-2 space-y-1">
            {(allAddons || []).map((a) => {
              const isSelected = selectedAddonIds.includes(a.id);
              return (
                <label key={a.id} className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50" data-testid={`addon-option-${a.id}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedAddonIds((prev) =>
                        isSelected ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                      );
                    }}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: COLORS.primaryOrange }}
                  />
                  <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{a.name}</span>
                  <span className="text-xs" style={{ color: COLORS.grayText }}>{currencySymbol}{a.price}</span>
                </label>
              );
            })}
            {(!allAddons || allAddons.length === 0) && (
              <div className="text-xs py-2 text-center" style={{ color: COLORS.grayText }}>No add-ons available</div>
            )}
          </div>
          {/* Inline add new addon */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                placeholder="New add-on name"
                className="w-full px-2 py-1.5 text-xs rounded border outline-none"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="new-addon-name"
              />
            </div>
            <div className="w-20">
              <input
                type="number"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(e.target.value)}
                placeholder="Price"
                className="w-full px-2 py-1.5 text-xs rounded border outline-none"
                style={{ borderColor: COLORS.borderGray }}
                min={0}
                data-testid="new-addon-price"
              />
            </div>
            <button
              onClick={async () => {
                if (!newAddonName.trim() || !newAddonPrice) return;
                try {
                  await menuService.addAddon(newAddonName.trim(), newAddonPrice);
                  toast({ title: "Added", description: `Add-on "${newAddonName}" created.` });
                  setNewAddonName("");
                  setNewAddonPrice("");
                  if (onRefreshAddons) onRefreshAddons();
                } catch (err) {
                  toast({ title: "Error", description: "Failed to create add-on." });
                }
              }}
              className="px-3 py-1.5 text-xs rounded text-white"
              style={{ backgroundColor: COLORS.primaryOrange }}
              data-testid="add-addon-btn"
            >
              Add
            </button>
          </div>
        </div>
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
              const foodInfo = toAPI.foodInfo({ ...form, foodFor: menuType || 'Normal', addonIds: selectedAddonIds });
              if (isNew) {
                await menuService.addFood(foodInfo, form.imageFile);
              } else {
                await menuService.editFood(product.productId, foodInfo, form.imageFile);
              }
              toast({ title: "Saved", description: isNew ? "Product added." : "Product updated." });
              onSave();
            } catch (err) {
              console.error('[ProductForm] Save failed:', err);
              toast({ title: "Error", description: err?.response?.data?.message || "Failed to save product." });
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
