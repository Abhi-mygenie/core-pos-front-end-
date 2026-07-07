// CR-059: Expense Bulk Editor — spreadsheet-style grid for mass item edits
import { useState } from "react";
import { Trash2, Plus, Save, X, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";

// 5-column grid: Item Name | Category | Unit Price | Unit | Actions
const COLUMNS = [
  { key: "title",     label: "Item Name",   width: "flex-[3]" },
  { key: "category",  label: "Category",    width: "flex-[2]" },
  { key: "price",     label: "Unit Price",  width: "flex-[2]" },
  { key: "unit",      label: "Unit",        width: "flex-[1]" },
];

const EMPTY_ROW = { title: "", category: "", categoryId: "", price: "", unit: "" };

const ExpenseBulkEditor = ({ items, categories, units, onSave, onCancel, saving }) => {
  const [rows, setRows] = useState(
    items.length > 0
      ? items.map(i => ({
          id: i.id,
          categoryId: String(i.categoryId ?? ""),
          title: i.title ?? "",
          category: i.categoryName ?? "",
          price: i.unitPriceAmount != null ? String(i.unitPriceAmount) : "",
          unit: i.unit ?? "",
        }))
      : [{ ...EMPTY_ROW }]
  );

  const setRow = (idx, field, val) =>
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: val };
      if (field === "categoryId") {
        const cat = categories.find(c => String(c.id) === String(val));
        updated.category = cat?.name ?? "";
      }
      return updated;
    }));

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const thStyle = { color: COLORS.grayText, borderColor: COLORS.borderGray };
  const inputCls = "w-full px-2 py-1.5 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-white";
  const inputStyle = { borderColor: COLORS.borderGray, color: COLORS.darkText };

  return (
    <div className="flex flex-col h-full" data-testid="bulk-editor">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
        <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
          Bulk Editor — {rows.length} item{rows.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            data-testid="bulk-editor-cancel">
            <X className="w-3.5 h-3.5 inline mr-1" /> Cancel
          </button>
          <button onClick={() => onSave(rows)} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium text-white disabled:opacity-50"
            style={{ background: COLORS.primaryGreen }}
            data-testid="bulk-editor-save">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide"
        style={{ background: COLORS.sectionBg, borderColor: COLORS.borderGray }}>
        {COLUMNS.map(col => (
          <span key={col.key} className={`${col.width} px-1`} style={{ color: COLORS.grayText }}>{col.label}</span>
        ))}
        <span className="w-8" />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center px-4 py-2 border-b hover:bg-gray-50"
            style={{ borderColor: COLORS.borderGray }}
            data-testid={`bulk-row-${idx}`}>
            {/* Item Name */}
            <div className="flex-[3] px-1">
              <input value={row.title} onChange={e => setRow(idx, "title", e.target.value)}
                placeholder="Item name" className={inputCls} style={inputStyle}
                data-testid={`bulk-title-${idx}`} />
            </div>
            {/* Category */}
            <div className="flex-[2] px-1">
              <select value={row.categoryId} onChange={e => setRow(idx, "categoryId", e.target.value)}
                className={inputCls} style={inputStyle}
                data-testid={`bulk-category-${idx}`}>
                <option value="">Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {/* Unit Price */}
            <div className="flex-[2] px-1">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: COLORS.grayText }}>₹</span>
                <input type="number" min="0" step="0.01" value={row.price}
                  onChange={e => setRow(idx, "price", e.target.value)}
                  placeholder="0.00" className={inputCls + " pl-5"} style={inputStyle}
                  data-testid={`bulk-price-${idx}`} />
              </div>
            </div>
            {/* Unit */}
            <div className="flex-[1] px-1">
              <select value={row.unit} onChange={e => setRow(idx, "unit", e.target.value)}
                className={inputCls} style={inputStyle}
                data-testid={`bulk-unit-${idx}`}>
                <option value="">—</option>
                {units.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            {/* Delete */}
            <div className="w-8 flex justify-center">
              <button onClick={() => removeRow(idx)} className="p-1 rounded hover:bg-red-50"
                data-testid={`bulk-delete-${idx}`}>
                <Trash2 className="w-3.5 h-3.5" style={{ color: COLORS.errorText }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Row */}
      <div className="px-4 py-3 border-t" style={{ borderColor: COLORS.borderGray }}>
        <button onClick={addRow}
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80"
          style={{ color: COLORS.primaryGreen }}
          data-testid="bulk-add-row">
          <Plus className="w-4 h-4" /> Add Row
        </button>
      </div>
    </div>
  );
};

export default ExpenseBulkEditor;
