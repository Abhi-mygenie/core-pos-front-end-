// CR-059: Expense Entry Panel — Daily expense logging
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Receipt, ChevronDown, Plus, Trash2, Edit3, X, Check,
  Loader2, RefreshCw, Banknote, Smartphone, Building2, Wallet
} from "lucide-react";
import { COLORS } from "../../constants";
import { useToast } from "../../hooks/use-toast";
import * as expenseService from "../../api/services/expenseService";
import {
  fromAPI,
  formatDateDDMMYYYY,
  formatDateISO,
  parseDateDDMMYYYY,
  toAPI,
} from "../../api/transforms/expenseTransform";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(parseFloat(v) || 0);

const fmtTime = (str) => {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const EMPTY_LINE = {
  categoryId: "", itemName: "", amount: "", paymentMethod: "Cash Draw", // BUG-156: default to Cash Draw
  quantity: "", unit: "", physical_quantity: "",                         // BUG-176: physical_quantity user-enterable
  unitPrice: null,     // BUG-154: null = manual amount; non-null = qty×price auto-calc
  isCustomItem: false, // BUG-155: true when free-text item (not from master) → show category select
  notes: "",           // BUG-177: notes field — backend accepts and stores
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, accent, testId }) => (
  <div
    className="flex-1 rounded-xl p-4 border min-w-0 bg-white"
    style={{ borderColor: COLORS.borderGray }}
    data-testid={testId}
  >
    <div className="flex items-center gap-2 mb-1">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <span className="text-xs font-medium uppercase tracking-wide truncate"
        style={{ color: COLORS.grayText }}>{label}</span>
    </div>
    <div className="text-xl font-bold" style={{ color: accent === COLORS.primaryOrange ? accent : COLORS.darkText }}>
      {fmt(value)}
    </div>
  </div>
);

// ─── Searchable Item Combobox ────────────────────────────────────────────────
const ItemCombobox = ({ items, value, onChange, placeholder, disabled, categoryName, testId }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );
  // Also show value even if not in current filtered list (free-text entry)
  const selected = value ? (items.find(i => i.title === value) || { title: value }) : null;

  const handleSelect = (item) => {
    onChange(item.title, item);
    setSearch("");
    setOpen(false);
  };

  // Use typed text directly as free-text expense (API accepts it)
  const handleUseFreeText = () => {
    if (!search.trim()) return;
    onChange(search.trim(), { title: search.trim(), id: null, unitPriceAmount: null });
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative min-w-0 flex-1" data-testid={testId}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-1 px-3 py-2 rounded-lg border text-sm text-left bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: COLORS.borderGray, color: selected ? COLORS.darkText : COLORS.grayText }}
      >
        <span className="truncate">{selected ? selected.title : placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg border shadow-lg overflow-hidden"
          style={{ borderColor: COLORS.borderGray, minWidth: 220 }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && filtered.length === 0 && search.trim()) handleUseFreeText(); }}
            placeholder="Search or type new item..."
            className="w-full px-3 py-2 text-sm border-b outline-none"
            style={{ borderColor: COLORS.borderGray }}
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <>
                {search.trim() ? (
                  <li
                    onClick={handleUseFreeText}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 flex items-center gap-2 border-b"
                    style={{ borderColor: COLORS.borderGray }}
                    data-testid="item-add-freetext"
                  >
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryGreen }} />
                    <span>
                      Use <span className="font-semibold" style={{ color: COLORS.darkText }}>"{search.trim()}"</span>
                      <span className="text-xs ml-1" style={{ color: COLORS.grayText }}>
                        {categoryName ? `(new item in ${categoryName})` : "(as custom expense)"}
                      </span>
                    </span>
                  </li>
                ) : null}
                <li className="px-3 py-2 text-xs" style={{ color: COLORS.grayText }}>
                  {search.trim() ? "No matching items in master" : "No items — type to add custom expense"}
                </li>
              </>
            ) : (
              filtered.map(item => (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  style={{ color: COLORS.darkText }}
                >
                  <span>{item.title}</span>
                  {/* BUG-153: show category hint so user can identify items without selecting category first */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {item.categoryName && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: `${COLORS.primaryOrange}18`, color: COLORS.primaryOrange, whiteSpace: 'nowrap' }}>
                        {item.categoryName}
                      </span>
                    )}
                    {item.unitPriceAmount && (
                      <span className="text-xs" style={{ color: COLORS.grayText, whiteSpace: 'nowrap' }}>
                        ₹{item.unitPriceAmount}/{item.unit || "unit"}
                      </span>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── Single Entry Line ────────────────────────────────────────────────────────
const EntryLine = ({ line, idx, categories, filteredItems, paymentMethods, units, onChange, onRemove, showRemove, showError }) => {
  const handleField = (field, val) => onChange(idx, field, val);

  const handleItemSelect = (title, item) => {
    onChange(idx, "itemName", title);
    // BUG-155: track whether item is free-text (no master ID) to show optional category select
    const isCustom = !item?.id;
    onChange(idx, "isCustomItem", isCustom);
    // BUG-153: auto-fill category from master item
    if (!isCustom && item?.categoryId && !line.categoryId) {
      onChange(idx, "categoryId", String(item.categoryId));
    }
    // BUG-154: store unitPrice for conditional qty/amount rendering
    const price = item?.unitPriceAmount ?? null;
    onChange(idx, "unitPrice", price);
    if (price) {
      // BUG-175: amount = unit price directly (qty implicit = 1, qty input hidden in Case A)
      onChange(idx, "unit", item?.unit ?? "");
      onChange(idx, "amount", String(price));
    } else {
      onChange(idx, "amount", ""); // clear any previous auto-calc
    }
  };


  const inputCls = "px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-orange-200 bg-white w-full";
  // BUG-153: category is now optional — removed from required validator
  const catError = false;

  return (
    <div className="flex flex-wrap gap-2 items-start p-3 rounded-lg border bg-gray-50"
      style={{ borderColor: COLORS.borderGray }}>

      {/* Item — always first, no category gate */}
      {/* BUG-154 BUG-155: item drives qty/price/category logic */}
      <div className="min-w-[160px] flex-1">
        <ItemCombobox
          items={filteredItems(line.categoryId)}
          value={line.itemName}
          onChange={handleItemSelect}
          placeholder="Type or search expense item..."
          categoryName={categories.find(c => String(c.id) === String(line.categoryId))?.name}
          testId={`expense-item-select-${idx}`}
        />
      </div>

      {/* BUG-155: Category select — shown only for free-text (custom) items */}
      {line.isCustomItem && (
        <div className="min-w-[140px] flex-1">
          <select
            value={line.categoryId}
            onChange={e => handleField("categoryId", e.target.value)}
            className={inputCls}
            style={{ borderColor: COLORS.borderGray, color: line.categoryId ? COLORS.darkText : COLORS.grayText }}
            data-testid={`expense-category-select-${idx}`}
          >
            <option value="">Category (optional)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Amount — editable for manual items; read-only auto-calc for priced items */}
      <div className="min-w-[110px] flex-1">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: COLORS.grayText }}>₹</span>
          <input
            type="number" min="0" step="0.01"
            value={line.amount}
            onChange={e => line.unitPrice ? null : handleField("amount", e.target.value)}
            readOnly={!!(line.unitPrice && line.unitPrice > 0)}
            placeholder="Amount"
            className={inputCls + " pl-6"}
            style={{
              borderColor: COLORS.borderGray,
              color: COLORS.darkText,
              // BUG-154: read-only when auto-calculated
              background: (line.unitPrice && line.unitPrice > 0) ? COLORS.sectionBg : "#fff",
              cursor: (line.unitPrice && line.unitPrice > 0) ? "not-allowed" : "text",
            }}
            data-testid={`expense-amount-input-${idx}`}
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="min-w-[130px] flex-1">
        <select
          value={line.paymentMethod}
          onChange={e => handleField("paymentMethod", e.target.value)}
          className={inputCls}
          style={{ borderColor: COLORS.borderGray, color: line.paymentMethod ? COLORS.darkText : COLORS.grayText }}
          data-testid={`expense-payment-select-${idx}`}
        >
          <option value="">Payment</option>
          {paymentMethods.map(pm => (
            <option key={pm} value={pm}>{pm}</option>
          ))}
        </select>
      </div>

      {/* BUG-175: Case A — unit at end, after Amount + Payment */}
      {line.unitPrice != null && line.unitPrice > 0 && (
        <div className="min-w-[90px] w-[90px]">
          <select
            value={line.unit}
            onChange={e => handleField("unit", e.target.value)}
            className={inputCls}
            style={{ borderColor: COLORS.borderGray, color: line.unit ? COLORS.darkText : COLORS.grayText }}
            data-testid={`expense-unit-select-${idx}`}
          >
            <option value="">Unit</option>
            {units.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* BUG-176: Case B — qty / unit / phys.qty at end, after Amount + Payment */}
      {(!line.unitPrice || line.unitPrice <= 0) && (
        <>
          <div className="min-w-[75px] w-[75px]">
            <input
              type="number" min="0" step="0.01"
              value={line.quantity}
              onChange={e => handleField("quantity", e.target.value)}
              placeholder="Qty"
              className={inputCls}
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid={`expense-qty-input-${idx}`}
            />
          </div>
          <div className="min-w-[85px] w-[85px]">
            <select
              value={line.unit}
              onChange={e => handleField("unit", e.target.value)}
              className={inputCls}
              style={{ borderColor: COLORS.borderGray, color: line.unit ? COLORS.darkText : COLORS.grayText }}
              data-testid={`expense-unit-select-${idx}`}
            >
              <option value="">Unit</option>
              {units.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[75px] w-[75px]">
            <input
              type="number" min="0" step="0.01"
              value={line.physical_quantity}
              onChange={e => handleField("physical_quantity", e.target.value)}
              placeholder="Phys. Qty"
              className={inputCls}
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid={`expense-physical-qty-input-${idx}`}
            />
          </div>
        </>
      )}

      {/* Remove line */}
      {showRemove && (
        <button type="button" onClick={() => onRemove(idx)} className="p-2 rounded-lg hover:bg-red-50 flex-shrink-0">
          <X className="w-4 h-4" style={{ color: COLORS.errorText }} />
        </button>
      )}

      {/* BUG-177: Notes input — full width row below */}
      <div className="w-full">
        <input
          value={line.notes}
          onChange={e => handleField("notes", e.target.value)}
          placeholder="Notes (optional)"
          className={inputCls}
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          data-testid={`expense-notes-input-${idx}`}
        />
      </div>
    </div>
  );
};

// ─── Main Panel ──────────────────────────────────────────────────────────────
const ExpenseEntryPanel = () => {
  const { toast } = useToast();

  // Reference data
  const [categories, setCategories] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [units, setUnits] = useState([]);

  // Report data
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);

  // Form state
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState(null);

  // ── Filtered items per category ───────────────────────────────────
  const filteredItems = useCallback((categoryId) => {
    if (!categoryId) return allItems;
    return allItems.filter(i => String(i.categoryId) === String(categoryId));
  }, [allItems]);

  // ── Fetch reference data once ─────────────────────────────────────
  useEffect(() => {
    const fetchRef = async () => {
      try {
        const [catRes, itemRes, pmRes, unitRes] = await Promise.all([
          expenseService.getCategories(),
          expenseService.getExpenseItems(),
          expenseService.getPaymentMethods(),
          expenseService.getUnits(),
        ]);
        const cats = fromAPI.categories(catRes);
        setCategories(cats);

        // CR-059: API has no category_id on items — cross-ref by name
        const catByName = {};
        cats.forEach(c => { catByName[c.name.toLowerCase().trim()] = c.id; });
        const rawItems = fromAPI.expenseItems(itemRes).map(item => ({
          ...item,
          categoryId: item.categoryId
            ?? catByName[item.categoryName?.toLowerCase().trim()]
            ?? null,
        }));
        setAllItems(rawItems);

        setPaymentMethods(fromAPI.paymentMethods(pmRes));
        setUnits(fromAPI.units(unitRes));
      } catch (err) {
        console.error("[ExpenseEntry] Failed to load reference data:", err);
        toast({ title: "Error", description: err.readableMessage || "Failed to load data", variant: "destructive" });
      }
    };
    fetchRef();
  }, [toast]);

  // ── Fetch report for selected date ───────────────────────────────
  const fetchReport = useCallback(async (date) => {
    setLoadingReport(true);
    try {
      const dateStr = formatDateDDMMYYYY(date);
      const res = await expenseService.getExpenseReport(dateStr, dateStr);
      const data = fromAPI.expenseReport(res);
      setTransactions(data.transactions);
      setTotalAmount(data.totalAmount);
    } catch (err) {
      console.error("[ExpenseEntry] Failed to load report:", err);
      toast({ title: "Error", description: err.readableMessage || "Failed to load expenses", variant: "destructive" });
      setTransactions([]);
      setTotalAmount(0);
    } finally {
      setLoadingReport(false);
    }
  }, [toast]);

  useEffect(() => { fetchReport(selectedDate); }, [selectedDate, fetchReport]);

  // ── KPI computation ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const sum = (method) =>
      transactions
        .filter(t => method === "ALL" || t.paymentMethod?.toLowerCase() === method.toLowerCase())
        .reduce((acc, t) => acc + t.amount, 0);
    return {
      total: sum("ALL"),
      cash: sum("Cash"),
      upi: sum("UPI"),
      bank: sum("Bank Transfer"),
      cashDraw: sum("Cash Draw"),
    };
  }, [transactions]);

  // ── Line handlers ─────────────────────────────────────────────────
  const [showErrors, setShowErrors] = useState(false);

  const handleLineChange = (idx, field, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  const addLine = () => setLines(prev => [...prev, { ...EMPTY_LINE }]);

  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const resetForm = () => { setLines([{ ...EMPTY_LINE }]); setShowErrors(false); };

  // ── Save expense ──────────────────────────────────────────────────
  const handleSave = async () => {
    // Validate: category + item + amount + payment all required
    // BUG-153: category optional — only item name, amount, payment method required
    const hasErrors = lines.some(l => !l.itemName || !l.amount || !l.paymentMethod);
    if (hasErrors) {
      setShowErrors(true);
      toast({
        title: "Missing fields",
        description: "Item name, amount and payment method are required for all expense lines.",
        variant: "destructive",
      });
      return;
    }
    setShowErrors(false);
    setSaving(true);
    try {
      const dateStr = formatDateDDMMYYYY(selectedDate);
      const details = lines.map(l => ({
        expense: l.itemName,
        amount: parseFloat(l.amount),
        payment_method: l.paymentMethod,
        quantity: parseFloat(l.quantity || 0),
        unit: l.unit || "",
        physical_quantity: parseFloat(l.physical_quantity || 0), // BUG-176
        notes: l.notes || "",  // BUG-177
      }));
      const total = lines.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
      await expenseService.addExpenseEntry(dateStr, total, details);
      toast({ title: "Saved", description: `${lines.length} expense${lines.length > 1 ? "s" : ""} added` });
      resetForm();
      fetchReport(selectedDate);
    } catch (err) {
      console.error("[ExpenseEntry] Save failed:", err);
      toast({ title: "Error", description: err.readableMessage || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Inline edit ───────────────────────────────────────────────────
  const startEdit = (tx) => {
    setEditingId(tx.id);
    setEditRow({
      expense: tx.expense,
      e_dates: tx.date || formatDateDDMMYYYY(selectedDate),
      d_amount: String(tx.amount),
      payment_method: tx.paymentMethod,
      quantity: String(tx.quantity || ""),
      unit: tx.unit || "",
      physical_quantity: String(tx.physical_quantity || ""), // BUG-176
      notes: tx.notes || "",  // BUG-177
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditRow({}); };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await expenseService.editExpenseEntry(editingId, editRow);
      toast({ title: "Updated", description: "Expense updated" });
      cancelEdit();
      fetchReport(selectedDate);
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Update failed", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await expenseService.deleteExpenseEntry(deletingId);
      toast({ title: "Deleted", description: "Expense removed" });
      setDeletingId(null);
      fetchReport(selectedDate);
    } catch (err) {
      // OQ-1: DELETE may 404 on some backend versions
      if (err.response?.status === 404) {
        toast({ title: "Not supported", description: "Delete is not available for this entry", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.readableMessage || "Delete failed", variant: "destructive" });
      }
      setDeletingId(null);
    }
  };

  const inputCls = "px-2 py-1 rounded border text-sm outline-none focus:ring-1 focus:ring-orange-200 bg-white";
  const inputStyle = { borderColor: COLORS.borderGray, color: COLORS.darkText };

  return (
    <div className="p-6 min-h-full" data-testid="expense-entry-panel">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
          <h1 className="text-xl font-bold" style={{ color: COLORS.darkText, fontFamily: "Poppins, sans-serif" }}>
            Expenses
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formatDateISO(selectedDate)}
            onChange={e => setSelectedDate(e.target.value ? new Date(e.target.value) : new Date())}
            className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-orange-200"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            data-testid="expense-date-picker"
          />
          <button
            onClick={() => fetchReport(selectedDate)}
            className="p-2 rounded-lg border hover:bg-gray-50"
            style={{ borderColor: COLORS.borderGray }}
          >
            <RefreshCw className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <KpiCard icon={Banknote}   label="Today's Total" value={kpis.total}    accent={COLORS.primaryOrange} testId="expense-kpi-total" />
        <KpiCard icon={Wallet}     label="Cash"          value={kpis.cash}     accent={COLORS.primaryGreen}  testId="expense-kpi-cash" />
        <KpiCard icon={Smartphone} label="UPI"           value={kpis.upi}      accent="#8B5CF6"              testId="expense-kpi-upi" />
        <KpiCard icon={Building2}  label="Bank Transfer" value={kpis.bank}     accent="#3B82F6"              testId="expense-kpi-bank" />
        <KpiCard icon={Banknote}   label="Cash Draw"     value={kpis.cashDraw} accent={COLORS.amber}         testId="expense-kpi-cashdraw" />
      </div>

      {/* ── Quick-Add Form ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border mb-5 p-4" style={{ borderColor: COLORS.borderGray }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>Add Expense</h2>
        <div className="flex flex-col gap-3">
          {lines.map((line, idx) => (
            <EntryLine
              key={idx}
              line={line}
              idx={idx}
              categories={categories}
              filteredItems={filteredItems}
              paymentMethods={paymentMethods}
              units={units}
              onChange={handleLineChange}
              onRemove={removeLine}
              showRemove={lines.length > 1}
              showError={showErrors}
            />
          ))}
        </div>

        {/* Form actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80"
            style={{ color: COLORS.primaryGreen }}
            data-testid="expense-add-line-btn"
          >
            <Plus className="w-4 h-4" />
            Add Another Line
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="expense-reset-btn"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
              style={{ background: COLORS.primaryGreen, fontFamily: "Poppins, sans-serif" }}
              data-testid="expense-save-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Expense
            </button>
          </div>
        </div>
      </div>

      {/* ── Today's Log Table ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: COLORS.borderGray }} data-testid="expense-table">
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
          <h2 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
            {loadingReport ? "Loading..." : `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
          </h2>
        </div>

        {loadingReport ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Receipt className="w-8 h-8 opacity-30" style={{ color: COLORS.grayText }} />
            <p className="text-sm" style={{ color: COLORS.grayText }}>No expenses for this date</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Payment</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Added By</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Notes</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr
                      key={tx.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: COLORS.borderGray, background: i % 2 === 0 ? "#fff" : COLORS.sectionBg }}
                      data-testid={`expense-table-row-${tx.id}`}
                    >
                      {editingId === tx.id ? (
                        <>
                          <td className="px-4 py-2" style={{ color: COLORS.grayText }}>{fmtTime(tx.time)}</td>
                          <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>
                            {/* BUG-178: item name read-only in edit mode */}
                            {editRow.expense}
                          </td>
                          <td className="px-4 py-2" style={{ color: COLORS.grayText }}>{tx.category}</td>
                          <td className="px-4 py-2">
                            <input type="number" value={editRow.d_amount} onChange={e => setEditRow(r => ({ ...r, d_amount: e.target.value }))}
                              className={inputCls + " w-24 text-right"} style={inputStyle} />
                          </td>
                          <td className="px-4 py-2">
                            <select value={editRow.payment_method} onChange={e => setEditRow(r => ({ ...r, payment_method: e.target.value }))}
                              className={inputCls} style={inputStyle}>
                              {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                            </select>
                          </td>
                          {/* BUG-181: Added By (read-only in edit) */}
                          <td className="px-4 py-2 text-xs" style={{ color: COLORS.grayText }}>{tx.employeeName || "—"}</td>
                          {/* BUG-177: Notes (editable in edit) */}
                          <td className="px-4 py-2">
                            <input value={editRow.notes} onChange={e => setEditRow(r => ({ ...r, notes: e.target.value }))}
                              placeholder="Notes" className={inputCls + " w-28"} style={inputStyle}
                              data-testid={`expense-edit-notes-${tx.id}`} />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={saveEdit} disabled={savingEdit}
                                className="px-2.5 py-1 text-xs font-medium rounded text-white disabled:opacity-50"
                                style={{ background: COLORS.primaryGreen }}
                                data-testid={`expense-edit-save-${tx.id}`}>
                                {savingEdit ? "..." : "Save"}
                              </button>
                              <button onClick={cancelEdit} className="px-2.5 py-1 text-xs font-medium rounded border hover:bg-gray-100"
                                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2.5 text-xs" style={{ color: COLORS.grayText }}>{fmtTime(tx.time)}</td>
                          <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>{tx.expense}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F0FFF0", color: COLORS.primaryGreen }}>
                              {tx.category || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold" style={{ color: COLORS.darkText }}>{fmt(tx.amount)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: COLORS.grayText }}>{tx.paymentMethod}</td>
                          {/* BUG-181: Added By column */}
                          <td className="px-4 py-2.5 text-xs" style={{ color: COLORS.grayText }} data-testid={`expense-added-by-${tx.id}`}>{tx.employeeName || "—"}</td>
                          {/* BUG-177: Notes column */}
                          <td className="px-4 py-2.5 text-xs max-w-[150px] truncate" style={{ color: COLORS.grayText }} data-testid={`expense-notes-${tx.id}`}>{tx.notes || "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEdit(tx)}
                                className="p-1.5 rounded hover:bg-orange-50"
                                data-testid={`expense-edit-btn-${tx.id}`}>
                                <Edit3 className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
                              </button>
                              <button onClick={() => setDeletingId(tx.id)}
                                className="p-1.5 rounded hover:bg-red-50"
                                data-testid={`expense-delete-btn-${tx.id}`}>
                                <Trash2 className="w-3.5 h-3.5" style={{ color: COLORS.errorText }} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: COLORS.sectionBg }}>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold" style={{ color: COLORS.darkText }}>Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: COLORS.primaryOrange }} data-testid="expense-total-amount">
                      {fmt(totalAmount || kpis.total)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ───────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="expense-delete-confirm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 border" style={{ borderColor: COLORS.borderGray }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Delete Expense?</h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: COLORS.errorText }}
                data-testid="expense-delete-confirm-btn">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseEntryPanel;
