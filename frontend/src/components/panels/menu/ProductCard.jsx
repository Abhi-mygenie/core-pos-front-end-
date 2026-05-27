import { useState } from "react";
import { GripVertical, Zap, Pencil, Trash2 } from "lucide-react";
import { COLORS } from "../../../constants";

// Food type helpers
const getFoodDot = (product) => {
  if (product.hasEgg) return { color: "#F59E0B", label: "Egg" };
  if (product.isJain) return { color: "#8B5CF6", label: "Jain" };
  if (product.isVeg) return { color: COLORS.primaryGreen, label: "Veg" };
  return { color: "#EF4444", label: "Non-Veg" };
};

const StationBadge = ({ station }) => {
  if (!station) return null;
  const colors = {
    KDS: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
    BAR: { bg: "rgba(168,85,247,0.1)", text: "#A855F7" },
    BILL: { bg: "rgba(34,197,94,0.1)", text: "#22C55E" },
  };
  const c = colors[station] || { bg: COLORS.borderGray, text: COLORS.grayText };
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: c.bg, color: c.text }}>
      {station}
    </span>
  );
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
  });

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="p-4 rounded-xl border-2" style={{ borderColor: COLORS.primaryOrange, backgroundColor: "rgba(242,107,51,0.02)" }} data-testid="quick-edit-form">
      <div className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>Quick Edit</div>
      <hr style={{ borderColor: COLORS.borderGray }} className="mb-3" />

      {/* Row 1: Name */}
      <input
        value={form.productName}
        onChange={(e) => update("productName", e.target.value)}
        className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none mb-3"
        style={{ borderColor: COLORS.borderGray }}
        data-testid="quick-edit-name"
      />

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

      {/* Row 4: Tax Type + Tax % */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
          Cancel
        </button>
        <button onClick={onSave} className="px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: COLORS.primaryGreen }} data-testid="quick-edit-save">
          Save
        </button>
      </div>
    </div>
  );
};

// ─── Main Product Card ─────────────────────────────────────────────────────
const ProductCard = ({
  product, categoryName, currencySymbol, categories,
  isDragging, dragHandleProps,
  isQuickEditing, onQuickEdit, onFullEdit, onDelete,
  onQuickSave, onQuickCancel,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const food = getFoodDot(product);
  const isDisabled = product.isDisabled;
  const isOutOfStock = product.isOutOfStock;

  // Quick Edit state
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
        borderColor: isDragging ? COLORS.primaryOrange : isDisabled ? "#CBD5E1" : COLORS.borderGray,
        borderStyle: isDisabled ? "dashed" : "solid",
        backgroundColor: isDragging ? "rgba(242,107,51,0.05)" : isOutOfStock ? "#FAFAFA" : isDisabled ? "#F8FAFC" : "#fff",
        opacity: isOutOfStock ? 0.7 : 1,
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
            <span className="text-sm font-semibold truncate" style={{ color: isDisabled ? "#94A3B8" : COLORS.darkText }}>
              {product.productName}
            </span>
            {isOutOfStock && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                Out of Stock
              </span>
            )}
            {isDisabled && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "#64748B" }}>
                Hidden from POS
              </span>
            )}
          </div>

          <div className="text-xs mb-1.5" style={{ color: COLORS.grayText }}>
            {categoryName} &middot; {isOutOfStock ? "Out of Stock" : "In Stock"} &middot; {food.label}
            {product.isComplementary && " · Complementary"}
          </div>

          <div className="flex flex-wrap gap-1">
            <ChannelChip label="Dine-In" active={product.availability?.dineIn} />
            <ChannelChip label="Delivery" active={product.availability?.delivery} />
            <ChannelChip label="Takeaway" active={product.availability?.takeaway} />
          </div>
        </div>

        {/* Right side: Station + Price + Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StationBadge station={product.station} />
          <span className="text-sm font-bold min-w-[60px] text-right" style={{ color: isDisabled ? "#94A3B8" : COLORS.darkText }}>
            {currencySymbol}{product.basePrice}
          </span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
              onClick={() => setDeleteConfirm(true)}
              className="p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Delete"
              data-testid={`delete-${product.productId}`}
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="mx-3 mb-3 p-2.5 rounded-lg flex items-center justify-between" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span className="text-xs" style={{ color: "#EF4444" }}>Delete "{product.productName}"?</span>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(false)} className="text-xs px-3 py-1 rounded border" style={{ borderColor: COLORS.borderGray }}>No</button>
            <button onClick={() => { onDelete(); setDeleteConfirm(false); }} className="text-xs px-3 py-1 rounded text-white" style={{ backgroundColor: "#EF4444" }}>Yes, Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
