import { useState } from "react";
import { Check, XCircle, Pencil, Trash2, X } from "lucide-react";
import { COLORS } from "../../../constants";
import { useToast } from "../../../hooks/use-toast";

// ─── Form Inputs ────────────────────────────────────────────────────────────
export const TextInput = ({ label, value, onChange, placeholder, required }) => (
  <div className="py-2">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || label}
      className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
    />
  </div>
);

export const NumberInput = ({ label, value, onChange, min, max, step, suffix }) => (
  <div className="py-2">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step || 1}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {suffix && <span className="text-sm" style={{ color: COLORS.grayText }}>{suffix}</span>}
    </div>
  </div>
);

export const TimeInput = ({ label, value, onChange }) => (
  <div className="py-2">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label}
    </label>
    <input
      type="time"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
    />
  </div>
);

export const SelectInput = ({ label, value, onChange, options }) => (
  <div className="py-2">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      {label}
    </label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 bg-white"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      data-testid={`select-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const ToggleSwitch = ({ label, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
    <span className="text-sm" style={{ color: COLORS.darkText }}>{label}</span>
    <button
      onClick={() => !disabled && onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ backgroundColor: checked ? COLORS.primaryGreen : COLORS.borderGray }}
      disabled={disabled}
      data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  </div>
);

// ─── Display Components ─────────────────────────────────────────────────────
export const BoolBadge = ({ value, trueLabel = "Enabled", falseLabel = "Disabled" }) => (
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

export const Field = ({ label, value, children }) => (
  <div className="py-3 flex justify-between items-start gap-4 border-b" style={{ borderColor: COLORS.borderGray }}>
    <span className="text-sm" style={{ color: COLORS.grayText }}>{label}</span>
    <span className="text-sm font-medium text-right" style={{ color: COLORS.darkText }}>
      {children || value || "—"}
    </span>
  </div>
);

export const SectionTitle = ({ title, count }) => (
  <div className="flex items-center justify-between mb-3 mt-6 first:mt-0">
    <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
      {title} {count !== undefined && <span style={{ color: COLORS.grayText }}>({count})</span>}
    </h3>
  </div>
);

// ─── Edit/Save/Cancel Bar ───────────────────────────────────────────────────
export const EditBar = ({ isEditing, onEdit, onSave, onCancel }) => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Saved", description: "Changes saved successfully." });
    onSave();
  };

  if (!isEditing) {
    return (
      <div className="sticky top-0 z-10 flex justify-end pb-4">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg"
          style={{ color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
          data-testid="edit-btn"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
    );
  }

  return (
    <div
      className="sticky bottom-0 z-10 flex justify-end gap-3 pt-4 pb-2 mt-4"
      style={{ backgroundColor: COLORS.lightBg, borderTop: `1px solid ${COLORS.borderGray}` }}
    >
      <button
        onClick={onCancel}
        className="px-5 py-2 text-sm font-medium rounded-lg border"
        style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
        data-testid="cancel-btn"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        className="px-5 py-2 text-sm font-medium rounded-lg text-white"
        style={{ backgroundColor: COLORS.primaryGreen }}
        data-testid="save-btn"
      >
        Save Changes
      </button>
    </div>
  );
};

// ─── List Item with Edit/Delete ─────────────────────────────────────────────
export const ListItem = ({ children, onEdit, onDelete, testId }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    toast({ title: "Deleted", description: "Item removed successfully." });
    setShowDeleteConfirm(false);
    onDelete?.();
  };

  return (
    <div
      className="p-3 rounded-lg mb-2 border relative"
      style={{ borderColor: COLORS.borderGray }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">{children}</div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            data-testid={`${testId}-edit`}
          >
            <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded hover:bg-red-50 transition-colors"
            data-testid={`${testId}-delete`}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
          </button>
        </div>
      </div>

      {/* Inline Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          className="mt-2 p-2.5 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span className="text-xs" style={{ color: "#EF4444" }}>Are you sure?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs px-3 py-1 rounded border"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            >
              No
            </button>
            <button
              onClick={handleDelete}
              className="text-xs px-3 py-1 rounded text-white"
              style={{ backgroundColor: "#EF4444" }}
              data-testid={`${testId}-confirm-delete`}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── List Header with Add Button ────────────────────────────────────────────
export const ListHeader = ({ title, count, onAdd }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
      {title} {count !== undefined && <span style={{ color: COLORS.grayText }}>({count})</span>}
    </h3>
    <button
      onClick={onAdd}
      className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
      style={{ backgroundColor: COLORS.primaryOrange }}
      data-testid={`add-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      + Add
    </button>
  </div>
);

// ─── Form Container with Back/Save ─────────────────────────────────────────
export const FormContainer = ({ title, onBack, onSave, children }) => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Saved", description: `${title} saved successfully.` });
    onSave();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1 rounded hover:bg-gray-100">
          <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </button>
        <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>{title}</h3>
      </div>
      {children}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onBack}
          className="px-5 py-2 text-sm font-medium rounded-lg border"
          style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-5 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="form-save-btn"
        >
          Save
        </button>
      </div>
    </div>
  );
};
