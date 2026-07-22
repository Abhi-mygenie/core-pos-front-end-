import { useState } from "react";
import { GripVertical, Zap, Pencil, Trash2, Power } from "lucide-react";
import { COLORS } from "../../../constants";

const getFoodDot = (product) => {
  if (product.hasEgg) return { color: "#F59E0B", label: "Egg" };
  if (product.isJain) return { color: "#8B5CF6", label: "Jain" };
  if (product.isVeg) return { color: COLORS.primaryGreen, label: "Veg" };
  return { color: "#EF4444", label: "Non-Veg" };
};

const ChannelChip = ({ label, active }) => (
  <span
    className="text-xs px-2 py-0.5 rounded"
    style={{
      backgroundColor: active ? "rgba(50,153,55,0.08)" : "rgba(239,68,68,0.05)",
      color: active ? COLORS.primaryGreen : "#EF4444",
      border: `1px solid ${active ? "rgba(50,153,55,0.2)" : "rgba(239,68,68,0.15)"}`,
    }}
  >
    {label}
  </span>
);

// ─── Quick Edit Form (inline) ──────────────────────────────────────────────
const QuickEditForm = ({ product, categories, currencySymbol, onSave, onCancel }) => {
  const [form, setForm] = useState({
    productName: product.productName || "",
    categoryId: product.categoryId || "",
    basePrice: product.basePrice || 0,
    foodType: product.hasEgg ? "egg" : product.isJain ? "jain" : product.isVeg ? "veg" : "nonveg",
    isComplementary: product.isComplementary || false,
    taxType: product.tax?.type || "GST",
    taxPercentage: product.tax?.percentage || 0,
    // Pass through all existing product fields for the API call
    description: product.description || "",
    discount: product.discount || 0,
    discountType: product.discountType || "percent",
    dineIn: product.availability?.dineIn ?? true,
    delivery: product.availability?.delivery ?? true,
    takeaway: product.availability?.takeaway ?? true,
    liveWeb: product.liveWeb ?? true,
    giveDiscount: product.giveDiscount ?? true,
    prepTimeMin: product.prepTimeMin || 0,
    serveTimeMin: product.serveTimeMin || 0,
    allergens: product.allergen || "",
    kcal: product.kcal || 0,
    itemCode: product.itemCode || "",
    isInventory: product.isInventory || false,
    packedFood: product.packedFood || false,
    isOutOfStock: product.isOutOfStock || false,
    isDisabled: product.isDisabled || false,
    taxCalc: product.taxCalc || 'Exclusive',
    // CR-010: Weight-based billing
    itemUnit: product.itemUnit || '',
    itemUnitPrice: product.itemUnitPrice || 0,
  });

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="p-4 rounded-xl border-2" style={{ borderColor: COLORS.primaryOrange, backgroundColor: "rgba(242,107,51,0.02)" }} data-testid="quick-edit-form">
      <div className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>Quick Edit</div>
      <hr style={{ borderColor: COLORS.borderGray }} className="mb-3" />

      {/* Row 1: Name + Sold By */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-8">
          <input
            value={form.productName}
            onChange={(e) => update("productName", e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="quick-edit-name"
          />
        </div>
        <div className="col-span-4">
          <select
            value={form.itemUnit}
            onChange={(e) => update("itemUnit", e.target.value)}
            className="w-full px-2 py-2.5 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="quick-edit-unit"
          >
            <option value="">Piece</option>
            <option value="Kg">Kg</option>
            <option value="gm">gm</option>
            <option value="L">L</option>
            <option value="ml">ml</option>
          </select>
        </div>
      </div>

      {/* Row 2: Category + Price */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-7">
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Category</label>
          <div className="flex gap-1">
            <select
              value={form.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none bg-white"
              style={{ borderColor: COLORS.borderGray }}
            >
              {(categories || []).map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
              ))}
            </select>
            <button className="p-2 rounded-lg border" style={{ borderColor: COLORS.borderGray }} title="Add Category">
              <span className="text-lg leading-none" style={{ color: COLORS.grayText }}>+</span>
            </button>
          </div>
        </div>
        <div className="col-span-5">
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Price ({currencySymbol})</label>
          <input
            type="number"
            value={form.basePrice}
            onChange={(e) => update("basePrice", parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="quick-edit-price"
          />
        </div>
      </div>

      {/* Row 3: Food Type + Complementary */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Food Type</label>
          <select
            value={form.foodType}
            onChange={(e) => update("foodType", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray }}
          >
            <option value="veg">Veg</option>
            <option value="nonveg">Non-Veg</option>
            <option value="egg">Egg</option>
            <option value="jain">Jain</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Complementary</label>
          <select
            value={form.isComplementary ? "yes" : "no"}
            onChange={(e) => update("isComplementary", e.target.value === "yes")}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray }}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>

      {/* Row 4: Tax Type + Tax % + Tax Calc */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Tax Type</label>
          <select
            value={form.taxType}
            onChange={(e) => update("taxType", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray }}
          >
            <option value="GST">GST</option>
            <option value="VAT">VAT</option>
            <option value="None">None</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Tax %</label>
          <input
            type="number"
            value={form.taxPercentage}
            onChange={(e) => update("taxPercentage", parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: COLORS.borderGray }}
            step="0.01"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Tax Calc</label>
          <select
            value={form.taxCalc}
            onChange={(e) => update("taxCalc", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray }}
          >
            <option value="Inclusive">Inclusive</option>
            <option value="Exclusive">Exclusive</option>
          </select>
        </div>
      </div>

      {/* Row 5: Flags */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Inventory</label>
          <select value={form.isInventory ? "yes" : "no"} onChange={(e) => update("isInventory", e.target.value === "yes")} className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white" style={{ borderColor: COLORS.borderGray }}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Packaged</label>
          <select value={form.packedFood ? "yes" : "no"} onChange={(e) => update("packedFood", e.target.value === "yes")} className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white" style={{ borderColor: COLORS.borderGray }}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: COLORS.primaryGreen }} data-testid="quick-edit-save">
          Save
        </button>
      </div>
    </div>
  );
};

// ─── Main Product Card ─────────────────────────────────────────────────────
const ProductCard = ({
  product, categoryName, currencySymbol, categories, deleteReasons,
  isDragging, dragHandleProps,
  isQuickEditing, onQuickEdit, onFullEdit, onDelete, onStatusToggle,
  onQuickSave, onQuickCancel,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const food = getFoodDot(product);

  if (isQuickEditing) {
    return (
      <QuickEditForm
        product={product}
        categories={categories}
        currencySymbol={currencySymbol}
        onSave={onQuickSave}
        onCancel={onQuickCancel}
      />
    );
  }

  return (
    <div
      className="rounded-xl border transition-all group"
      style={{
        borderColor: isDragging ? COLORS.primaryOrange : COLORS.borderGray,
        backgroundColor: isDragging ? "rgba(242,107,51,0.05)" : product.isActive ? "#fff" : "#F8FAFC",
        opacity: product.isActive ? 1 : 0.7,
      }}
      data-testid={`product-card-${product.productId}`}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag Handle */}
        <div {...dragHandleProps} className="pt-1 cursor-grab opacity-20 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </div>

        {/* Food Type Dot */}
        <div className="pt-1.5">
          <div className="w-3 h-3 rounded-sm border-2" style={{ borderColor: food.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold truncate" style={{ color: product.isActive ? COLORS.darkText : "#94A3B8" }}>
              {product.productName}
            </span>
            {!product.isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "#64748B" }}>
                Inactive
              </span>
            )}
          </div>

          <div className="text-xs mb-1.5" style={{ color: COLORS.grayText }}>
            {categoryName} &middot; {food.label}
            {product.isComplementary && " · Complementary"}
          </div>

          <div className="flex flex-wrap gap-1">
            <ChannelChip label="Dine-In" active={product.availability?.dineIn} />
            <ChannelChip label="Delivery" active={product.availability?.delivery} />
            <ChannelChip label="Takeaway" active={product.availability?.takeaway} />
            {product.isInventory && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>Inventory</span>}
            {product.packedFood && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>Packaged</span>}
            {product.isOutOfStock && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>Out of Stock</span>}
            {product.isDisabled && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "#64748B", border: "1px solid rgba(148,163,184,0.2)" }}>Hidden</span>}
            {product.taxCalc === 'Inclusive' && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(148,163,184,0.08)", color: "#94A3B8", border: "1px solid rgba(148,163,184,0.15)" }}>Tax Incl.</span>}
          </div>
        </div>

        {/* Right side: Station + Price + Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold min-w-[60px] text-right" style={{ color: product.isActive ? COLORS.darkText : "#94A3B8" }}>
            {currencySymbol}{product.basePrice}
          </span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onStatusToggle(); }}
              className="p-1.5 rounded hover:bg-green-50 transition-colors"
              title={product.isActive ? "Deactivate" : "Activate"}
              data-testid={`status-toggle-${product.productId}`}
            >
              <Power className="w-3.5 h-3.5" style={{ color: product.isActive ? COLORS.primaryGreen : "#94A3B8" }} />
            </button>
            <button
              onClick={onQuickEdit}
              className="p-1.5 rounded hover:bg-amber-50 transition-colors"
              title="Quick Edit"
              data-testid={`quick-edit-${product.productId}`}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
            </button>
            <button
              onClick={onFullEdit}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Full Edit"
              data-testid={`full-edit-${product.productId}`}
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
            </button>
            <button
              onClick={() => { setDeleteConfirm(true); setSelectedReason(""); }}
              className="p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Delete"
              data-testid={`delete-${product.productId}`}
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation with Reason Dropdown */}
      {deleteConfirm && (
        <div className="mx-3 mb-3 p-2.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "#EF4444" }}>Delete "{product.productName}"?</span>
          </div>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-white mb-2"
            style={{ borderColor: "rgba(239,68,68,0.3)" }}
            data-testid={`delete-reason-${product.productId}`}
          >
            <option value="">Select reason...</option>
            {(deleteReasons || []).map((r, i) => (
              <option key={i} value={r}>{r}</option>
            ))}
          </select>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteConfirm(false)} className="text-xs px-3 py-1 rounded border" style={{ borderColor: COLORS.borderGray }}>Cancel</button>
            <button
              onClick={() => { if (selectedReason) { onDelete(selectedReason); setDeleteConfirm(false); } }}
              disabled={!selectedReason}
              className="text-xs px-3 py-1 rounded text-white disabled:opacity-50"
              style={{ backgroundColor: "#EF4444" }}
              data-testid={`confirm-delete-${product.productId}`}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
