import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  X, Search, Save, Plus, RotateCcw, Check, AlertCircle,
  Columns3, ChevronDown, ChevronRight, Eye, EyeOff, Table2,
  ArrowUpDown, Download, Upload, Loader2
} from "lucide-react";
import { COLORS } from "../../../constants";
import { useToast } from "../../../hooks/use-toast";
import * as menuService from "../../../api/services/menuManagementService";

// ─── Column Definitions ────────────────────────────────────────────
const ALL_COLUMNS = [
  // Tier 1
  { key: "productName",      label: "Name",            type: "text",     width: 200, tier: 1, required: true, alwaysVisible: true },
  { key: "categoryId",       label: "Category",        type: "dropdown", width: 170, tier: 1, required: true },
  { key: "basePrice",        label: "Price",            type: "number",   width: 90,  tier: 1, required: true },
  { key: "status",           label: "Status",           type: "toggle",   width: 85,  tier: 1 },
  { key: "itemType",         label: "Type",             type: "dropdown", width: 100, tier: 1 },
  { key: "taxPercent",       label: "Tax %",            type: "number",   width: 75,  tier: 1 },
  { key: "taxType",          label: "Tax Type",         type: "dropdown", width: 95,  tier: 1 },
  { key: "description",      label: "Description",      type: "textarea", width: 180, tier: 1 },
  { key: "packedFood",       label: "Packaged Item",    type: "yesno",    width: 105, tier: 1 },
  { key: "isInventory",      label: "Inventory",        type: "yesno",    width: 90,  tier: 1 },
  // Tier 2
  { key: "discount",         label: "Discount",         type: "number",   width: 85,  tier: 2 },
  { key: "discountType",     label: "Discount Type",    type: "dropdown", width: 110, tier: 2 },
  { key: "giveDiscount",     label: "Give Discount",    type: "yesno",    width: 110, tier: 2 },
  { key: "liveWeb",          label: "Live Web",         type: "yesno",    width: 85,  tier: 2 },
  { key: "dineIn",           label: "Dine-in",          type: "yesno",    width: 80,  tier: 2 },
  { key: "delivery",         label: "Delivery",         type: "yesno",    width: 80,  tier: 2 },
  { key: "takeaway",         label: "Takeaway",         type: "yesno",    width: 85,  tier: 2 },
  { key: "complementary",    label: "Complementary",    type: "yesno",    width: 110, tier: 2 },
  { key: "complementaryPrice", label: "Comp. Price",    type: "number",   width: 95,  tier: 2 },
  { key: "stockOut",         label: "Out of Stock",     type: "yesno",    width: 100, tier: 2 },
  { key: "isDisabled",       label: "Hidden from POS",  type: "yesno",    width: 120, tier: 2 },
  { key: "taxCalc",          label: "Tax Calc",         type: "dropdown", width: 100, tier: 2 },
  // Tier 3
  { key: "prepTimeMin",      label: "Prep Time",        type: "number",   width: 85,  tier: 3 },
  { key: "serveTimeMin",     label: "Serve Time",       type: "number",   width: 90,  tier: 3 },
  { key: "packCharges",      label: "Pack Charges",     type: "number",   width: 100, tier: 3 },
  { key: "takeawayCharge",   label: "Takeaway Charge",  type: "number",   width: 120, tier: 3 },
  { key: "deliveryCharge",   label: "Delivery Charge",  type: "number",   width: 115, tier: 3 },
  { key: "availableTimeStart", label: "Avail. Start",   type: "time",     width: 100, tier: 3 },
  { key: "availableTimeEnd", label: "Avail. End",       type: "time",     width: 100, tier: 3 },
  { key: "itemCode",         label: "Item Code",        type: "text",     width: 100, tier: 3 },
  { key: "sortOrder",        label: "Sort Order",       type: "number",   width: 85,  tier: 3 },
  // Tier 4
  { key: "allergen",         label: "Allergens",        type: "text",     width: 120, tier: 4 },
  { key: "kcal",             label: "Kcal",             type: "number",   width: 70,  tier: 4 },
  { key: "portionSize",      label: "Portion Size",     type: "text",     width: 100, tier: 4 },
  // CR-010: itemUnit as dropdown for weight-based billing
  { key: "itemUnit",         label: "Sold By",          type: "dropdown", width: 100, tier: 4 },
];

const TIER_LABELS = { 1: "Default", 2: "Pricing & Availability", 3: "Operations", 4: "Info" };
const ITEM_TYPE_OPTIONS = [
  { value: 0, label: "Non-Veg", dot: "#EF4444" },
  { value: 1, label: "Veg",     dot: "#16A34A" },
  { value: 2, label: "Egg",     dot: "#F59E0B" },
  { value: 3, label: "Jain",    dot: "#8B5CF6" },
];
const TAX_TYPE_OPTIONS = [{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }];
const DISCOUNT_TYPE_OPTIONS = [{ value: "percent", label: "Percent" }, { value: "amount", label: "Amount" }];
// CR-010: Unit options for weight-based billing
const ITEM_UNIT_OPTIONS = [{ value: "", label: "Piece" }, { value: "Kg", label: "Kg" }, { value: "gm", label: "gm" }, { value: "L", label: "L" }, { value: "ml", label: "ml" }];
const MAX_CONCURRENT = 5;

const getItemTypeDot = (val) => ITEM_TYPE_OPTIONS.find(o => o.value === val)?.dot || "#9CA3AF";

// ─── Row builder ───────────────────────────────────────────────────
const buildRow = (f, isNew = false) => ({
  _id: isNew ? `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : f.productId,
  _original: isNew ? {} : { ...f },
  _isNew: isNew,
  _saveStatus: null,
  productName: f.productName || "",
  categoryId: f.categoryId,
  categoryName: f.categoryName || "Uncategorized",
  basePrice: f.basePrice || 0,
  status: f.isActive !== false ? 1 : 0,
  itemType: f.itemType ?? 0,
  taxPercent: f.tax?.percentage ?? 0,
  taxType: f.tax?.type || "GST",
  description: f.description || "",
  packedFood: f.packedFood ? "Yes" : "No",
  isInventory: f.isInventory ? "Yes" : "No",
  stockOut: f.isOutOfStock ? "Yes" : "No",
  isDisabled: f.isDisabled ? "Yes" : "No",
  taxCalc: f.taxCalc || "Exclusive",
  discount: f.discount || 0,
  discountType: f.discountType || "percent",
  giveDiscount: f.giveDiscount ? "Yes" : "No",
  liveWeb: f.liveWeb ? "Yes" : "No",
  dineIn: f.availability?.dineIn !== false ? "Yes" : "No",
  delivery: f.availability?.delivery !== false ? "Yes" : "No",
  takeaway: f.availability?.takeaway !== false ? "Yes" : "No",
  complementary: f.isComplementary ? "Yes" : "No",
  complementaryPrice: f.complementaryPrice || 0,
  prepTimeMin: f.prepTimeMin || 0,
  serveTimeMin: f.serveTimeMin || 0,
  packCharges: f.packCharges || 0,
  takeawayCharge: f.takeawayCharge || 0,
  deliveryCharge: f.deliveryCharge || 0,
  availableTimeStart: f.availableTimeStart || "00:00:00",
  availableTimeEnd: f.availableTimeEnd || "23:59:59",
  itemCode: f.itemCode || "",
  sortOrder: f.sortOrder || 0,
  allergen: f.allergen || "",
  kcal: f.kcal || 0,
  portionSize: f.portionSize || "",
  itemUnit: f.itemUnit || "",
  itemUnitPrice: f.itemUnitPrice || 0,
  foodFor: f.foodFor || "Normal",
});

// ─── Build food_info payload from row ──────────────────────────────
const buildPayload = (row) => ({
  name: row.productName,
  description: row.description || "",
  category_id: Number(row.categoryId),
  price: Number(row.basePrice),
  discount: Number(row.discount) || 0,
  discount_type: row.discountType || "percent",
  food_for: row.foodFor || "Normal",
  dinein: row.dineIn === "Yes" ? "Yes" : "No",
  delivery: row.delivery === "Yes" ? "Yes" : "No",
  takeaway: row.takeaway === "Yes" ? "Yes" : "No",
  live_web: row.liveWeb === "Yes" ? "Y" : "N",
  available_time_starts: row.availableTimeStart || "00:00:00",
  available_time_ends: row.availableTimeEnd || "23:59:59",
  prepration_time_min: Number(row.prepTimeMin) || 0,
  serve_time_in_min: Number(row.serveTimeMin) || 0,
  pack_charges: String(parseFloat(row.packCharges) || 0),
  takeaway_charge: String(parseFloat(row.takeawayCharge) || 0),
  delivery_charge: String(parseFloat(row.deliveryCharge) || 0),
  tax_type: row.taxType || "GST",
  tax: String(Number(row.taxPercent) || 0),
  complementary: row.complementary === "Yes" ? "Yes" : "No",
  complementary_price: String(Number(row.complementaryPrice) || 0),
  give_discount: row.giveDiscount === "Yes" ? "Yes" : "No",
  item_code: row.itemCode || "",
  kcal: Number(row.kcal) || 0,
  allergens: row.allergen || "",
  item_type: Number(row.itemType),
  is_inventory: row.isInventory === "Yes" ? "Yes" : "No",
  packed_food: row.packedFood === "Yes" ? "Yes" : "No",
  stock_out: row.stockOut === "Yes" ? "Y" : "N",
  is_disable: row.isDisabled === "Yes" ? "Y" : "N",
  tax_calc: row.taxCalc || "Exclusive",
  // CR-010: Weight-based billing — unit price always equals base price
  item_unit: row.itemUnit || '',
  item_unit_price: ['Kg','gm','L','ml'].includes(row.itemUnit) ? String(Number(row.basePrice) || 0) : '',
});

// ─── Main Component ────────────────────────────────────────────────
const BulkEditor = ({ foods = [], categories = [], menuType = "Normal", onRefresh, onClose }) => {
  const { toast } = useToast();
  const [visibleCols, setVisibleCols] = useState(() =>
    ALL_COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: c.tier === 1 }), {})
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const [collapsedTiers, setCollapsedTiers] = useState({ 1: false, 2: true, 3: true, 4: true });
  const colPickerRef = useRef(null);
  const [rows, setRows] = useState(() => foods.map(f => buildRow(f)));
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync rows when foods prop changes (after refresh)
  useEffect(() => { setRows(foods.map(f => buildRow(f))); }, [foods]);

  // Close column picker + export menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setShowColPicker(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Warn before leaving with unsaved changes
  const dirtyCountRef = useRef(0);
  useEffect(() => {
    const handler = (e) => {
      if (dirtyCountRef.current > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const catOptions = useMemo(() =>
    categories.map(c => ({ value: c.categoryId, label: c.categoryName })),
    [categories]
  );

  // ─── Dirty detection ─────────────────────────────────────────────
  const isDirty = useCallback((row, field) => {
    if (row._isNew) return true;
    const o = row._original;
    const checks = {
      status:      () => (o.isActive ? 1 : 0) !== row.status,
      itemType:    () => (o.itemType ?? 0) !== row.itemType,
      taxPercent:  () => (o.tax?.percentage ?? 0) !== Number(row.taxPercent),
      taxType:     () => (o.tax?.type || "GST") !== row.taxType,
      categoryId:  () => o.categoryId !== Number(row.categoryId),
      basePrice:   () => o.basePrice !== Number(row.basePrice),
      description: () => (o.description || "") !== (row.description || ""),
      productName: () => o.productName !== row.productName,
      discount:    () => (o.discount || 0) !== Number(row.discount),
      discountType: () => (o.discountType || "percent") !== row.discountType,
      giveDiscount: () => (o.giveDiscount ? "Yes" : "No") !== row.giveDiscount,
      liveWeb:     () => (o.liveWeb ? "Yes" : "No") !== row.liveWeb,
      dineIn:      () => (o.availability?.dineIn !== false ? "Yes" : "No") !== row.dineIn,
      delivery:    () => (o.availability?.delivery !== false ? "Yes" : "No") !== row.delivery,
      takeaway:    () => (o.availability?.takeaway !== false ? "Yes" : "No") !== row.takeaway,
      complementary: () => (o.isComplementary ? "Yes" : "No") !== row.complementary,
      complementaryPrice: () => (o.complementaryPrice || 0) !== Number(row.complementaryPrice),
      prepTimeMin: () => (o.prepTimeMin || 0) !== Number(row.prepTimeMin),
      serveTimeMin: () => (o.serveTimeMin || 0) !== Number(row.serveTimeMin),
      packCharges: () => (o.packCharges || 0) !== Number(row.packCharges),
      takeawayCharge: () => (o.takeawayCharge || 0) !== Number(row.takeawayCharge),
      deliveryCharge: () => (o.deliveryCharge || 0) !== Number(row.deliveryCharge),
      itemCode:    () => (o.itemCode || "") !== (row.itemCode || ""),
      sortOrder:   () => (o.sortOrder || 0) !== Number(row.sortOrder),
      allergen:    () => (o.allergen || "") !== (row.allergen || ""),
      kcal:        () => (o.kcal || 0) !== Number(row.kcal),
    };
    return checks[field] ? checks[field]() : false;
  }, []);

  const isRowDirty = useCallback((row) => ALL_COLUMNS.some(c => isDirty(row, c.key)), [isDirty]);
  const dirtyCount = useMemo(() => {
    const c = rows.filter(isRowDirty).length;
    dirtyCountRef.current = c;
    return c;
  }, [rows, isRowDirty]);

  // ─── Grouping ─────────────────────────────────────────────────────
  const groupedRows = useMemo(() => {
    let result = rows;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.productName.toLowerCase().includes(s) ||
        r.categoryName?.toLowerCase().includes(s) ||
        r.itemCode?.toLowerCase().includes(s)
      );
    }
    const groups = new Map();
    result.forEach(r => {
      const cat = r.categoryName || "Uncategorized";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(r);
    });
    const sorted = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    const out = [];
    sorted.forEach(cat => {
      const items = groups.get(cat);
      items.sort((a, b) => {
        if (sortCol) {
          const av = a[sortCol], bv = b[sortCol];
          if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
          const cmp = String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        }
        return a.productName.localeCompare(b.productName);
      });
      out.push({ _type: "header", catName: cat, count: items.length });
      items.forEach(item => out.push({ _type: "row", ...item }));
    });
    return out;
  }, [rows, search, sortCol, sortDir]);

  // ─── Handlers ─────────────────────────────────────────────────────
  const updateCell = (rowId, field, value) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId) return r;
      const u = { ...r, [field]: value };
      if (field === "categoryId") {
        const cat = categories.find(c => c.categoryId === Number(value));
        u.categoryName = cat?.categoryName || "Uncategorized";
      }
      return u;
    }));
  };

  const toggleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
  };

  const addNewRow = () => {
    const dc = categories[0];
    const row = buildRow({
      productName: "", categoryId: dc?.categoryId, categoryName: dc?.categoryName || "Uncategorized",
      basePrice: 0, isActive: true, itemType: 1, tax: { percentage: 5, type: "GST" },
      description: "", discount: 0, discountType: "percent", giveDiscount: false, liveWeb: true,
      availability: { dineIn: true, delivery: true, takeaway: true }, isComplementary: false,
      complementaryPrice: 0, prepTimeMin: 0, serveTimeMin: 0, packCharges: 0,
      takeawayCharge: 0, deliveryCharge: 0, availableTimeStart: "00:00:00", availableTimeEnd: "23:59:59",
      itemCode: "", sortOrder: 0, allergen: "", kcal: 0, foodFor: menuType,
    }, true);
    setRows(prev => [row, ...prev]);
  };

  const resetRow = (rowId) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r._id === rowId);
      if (idx === -1) return prev;
      if (prev[idx]._isNew) return prev.filter((_, i) => i !== idx);
      return prev.map((r, i) => i === idx ? buildRow(r._original) : r);
    });
  };

  const resetAll = () => setRows(foods.map(f => buildRow(f)));

  // ─── Validate row ─────────────────────────────────────────────────
  const validateRow = (row) => {
    const errors = [];
    if (!row.productName?.trim()) errors.push("Name is required");
    if (!row.categoryId) errors.push("Category is required");
    if (Number(row.basePrice) <= 0 && !row._isNew) { /* allow 0 for existing */ }
    else if (row._isNew && Number(row.basePrice) <= 0) errors.push("Price must be > 0");
    return errors;
  };

  // ─── Save (batch parallel) ────────────────────────────────────────
  const handleSave = async () => {
    // CR-023 OD-023-2: flush in-progress text edits before save
    document.activeElement?.blur();
    // Allow React state to flush from LocalTextInput onBlur
    await new Promise(r => setTimeout(r, 0));
    const dirty = rows.filter(isRowDirty);
    if (dirty.length === 0) return;

    // Validate all dirty rows
    const invalid = dirty.map(r => ({ row: r, errors: validateRow(r) })).filter(v => v.errors.length > 0);
    if (invalid.length > 0) {
      toast({ title: "Validation Error", description: `${invalid.length} item(s) have errors. Check required fields.`, variant: "destructive" });
      return;
    }

    setSaving(true);
    setRows(prev => prev.map(r => isRowDirty(r) ? { ...r, _saveStatus: "saving" } : r));

    let saved = 0, failed = 0;
    const queue = [...dirty];

    const processOne = async (row) => {
      try {
        const payload = buildPayload(row);
        if (row._isNew) {
          await menuService.addFood(payload);
        } else {
          await menuService.editFood(row._id, payload);
          // Also update status if it changed
          const origActive = row._original.isActive ? 1 : 0;
          if (origActive !== row.status) {
            await menuService.toggleFoodStatus(row._id, row.status);
          }
        }
        saved++;
        setRows(prev => prev.map(r => r._id === row._id ? { ...r, _saveStatus: "saved" } : r));
      } catch (err) {
        failed++;
        console.error(`[BulkEditor] Failed to save ${row.productName}:`, err);
        setRows(prev => prev.map(r => r._id === row._id ? { ...r, _saveStatus: "error" } : r));
      }
    };

    // Process in batches of MAX_CONCURRENT
    while (queue.length > 0) {
      const batch = queue.splice(0, MAX_CONCURRENT);
      await Promise.all(batch.map(processOne));
    }

    setSaving(false);
    const desc = failed > 0
      ? `${saved} saved, ${failed} failed. Failed items remain editable.`
      : `${saved} item${saved > 1 ? "s" : ""} saved successfully.`;
    toast({ title: failed > 0 ? "Partial Save" : "Saved", description: desc });

    // Refresh data from API
    if (saved > 0 && onRefresh) {
      setTimeout(() => onRefresh(), 500);
    }
  };

  const toggleCol = (key) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col?.alwaysVisible) return;
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Excel Export/Import handlers (CR-014 Phase 2B) ─────────────
  const handleExportAll = async () => {
    setShowExportMenu(false);
    setExporting(true);
    try {
      const res = await menuService.bulkExport('all');
      const url = res.data?.download_url;
      if (url) window.open(url, '_blank');
      else toast({ title: "Error", description: "No download URL received." });
    } catch (err) {
      toast({ title: "Error", description: "Export failed." });
    } finally { setExporting(false); }
  };

  const handleExportTemplate = async () => {
    setShowExportMenu(false);
    setExporting(true);
    try {
      const res = await menuService.exportSample();
      const url = res.data?.download_url;
      if (url) window.open(url, '_blank');
      else toast({ title: "Error", description: "No download URL received." });
    } catch (err) {
      toast({ title: "Error", description: "Template download failed." });
    } finally { setExporting(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const res = await menuService.bulkImport(file);
      const d = res.data;
      const imported = (d.normal_food?.imported || 0) + (d.aggregator_food?.imported || 0);
      const updated = (d.normal_food?.updated || 0) + (d.aggregator_food?.updated || 0);
      toast({ title: "Import Complete", description: `${imported} new, ${updated} updated (${d.total} total)` });
      if (onRefresh) setTimeout(() => onRefresh(), 500);
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Import failed." });
    } finally { setImporting(false); }
  };

  const toggleTier = (tier) => {
    const tierCols = ALL_COLUMNS.filter(c => c.tier === tier);
    const allOn = tierCols.every(c => visibleCols[c.key] || c.alwaysVisible);
    setVisibleCols(prev => {
      const next = { ...prev };
      tierCols.forEach(c => { if (!c.alwaysVisible) next[c.key] = !allOn; });
      return next;
    });
  };

  const activeColumns = ALL_COLUMNS.filter(c => visibleCols[c.key]);
  const tier1Active = ALL_COLUMNS.filter(c => visibleCols[c.key] && c.tier === 1);
  const extraCount = activeColumns.length - tier1Active.length;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white" data-testid="bulk-editor-panel">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center gap-3">
          <Table2 className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
          <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Bulk Editor</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.sectionBg, color: COLORS.grayText }}>{rows.length} items</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
            <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none bg-white w-44 focus:ring-1 focus:ring-orange-200"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} data-testid="bulk-editor-search" />
          </div>
          {/* Column Picker */}
          <div className="relative" ref={colPickerRef}>
            <button onClick={() => setShowColPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} data-testid="column-picker-btn">
              <Columns3 className="w-3.5 h-3.5" /> Columns
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: COLORS.primaryOrange, color: "#fff" }}>{activeColumns.length}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border z-50 py-1 max-h-[420px] overflow-y-auto" style={{ borderColor: COLORS.borderGray }}>
                {[1, 2, 3, 4].map(tier => {
                  const tc = ALL_COLUMNS.filter(c => c.tier === tier);
                  const allOn = tc.every(c => visibleCols[c.key] || c.alwaysVisible);
                  const someOn = tc.some(c => visibleCols[c.key]);
                  return (
                    <div key={tier}>
                      <button onClick={() => setCollapsedTiers(p => ({ ...p, [tier]: !p[tier] }))}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-gray-50"
                        style={{ color: COLORS.grayText, borderBottom: `1px solid ${COLORS.borderGray}` }}>
                        <div className="flex items-center gap-1.5">
                          <ChevronRight className={`w-3 h-3 transition-transform ${collapsedTiers[tier] ? "" : "rotate-90"}`} />
                          Tier {tier} — {TIER_LABELS[tier]}
                        </div>
                        <span onClick={(e) => { e.stopPropagation(); toggleTier(tier); }}
                          className="text-xs px-2 py-0.5 rounded-full cursor-pointer"
                          style={{ background: allOn ? COLORS.primaryOrange : someOn ? COLORS.amber : COLORS.sectionBg, color: allOn || someOn ? "#fff" : COLORS.grayText }}>
                          {allOn ? "All ON" : someOn ? "Some" : "All OFF"}
                        </span>
                      </button>
                      {!collapsedTiers[tier] && tc.map(col => (
                        <button key={col.key} onClick={() => toggleCol(col.key)} disabled={col.alwaysVisible}
                          className="flex items-center gap-2 w-full px-4 py-1.5 text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
                          style={{ color: COLORS.darkText }} data-testid={`col-toggle-${col.key}`}>
                          {visibleCols[col.key] ? <Eye className="w-3.5 h-3.5" style={{ color: COLORS.primaryGreen }} /> : <EyeOff className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />}
                          {col.label}
                          {col.alwaysVisible && <span className="ml-auto text-xs" style={{ color: COLORS.grayText }}>locked</span>}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />
          <div className="relative" ref={exportRef}>
            <button onClick={() => setShowExportMenu(v => !v)} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-orange-50"
              style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange, opacity: exporting ? 0.6 : 1 }} data-testid="download-excel-btn">
              <Download className="w-3.5 h-3.5" /> {exporting ? "Exporting..." : "Excel"}
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-xl shadow-lg z-50 overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
                <button onClick={handleExportAll} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors" style={{ color: COLORS.darkText }} data-testid="export-all-btn">
                  <Download className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} /> Export All Items (.xlsx)
                </button>
                <button onClick={handleExportTemplate} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors" style={{ color: COLORS.darkText }} data-testid="export-template-btn">
                  <Download className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} /> Download Template (.xlsx)
                </button>
              </div>
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-green-50"
            style={{ borderColor: COLORS.primaryGreen, color: COLORS.primaryGreen, opacity: importing ? 0.6 : 1 }} data-testid="upload-excel-btn">
            <Upload className="w-3.5 h-3.5" /> {importing ? "Importing..." : "Import"}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} data-testid="import-file-input" />
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />
          <button onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white hover:opacity-90"
            style={{ backgroundColor: COLORS.primaryGreen }} data-testid="add-row-btn">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
          <button onClick={handleSave} disabled={dirtyCount === 0 || saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: dirtyCount > 0 ? COLORS.primaryOrange : COLORS.grayText }} data-testid="save-changes-btn">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : dirtyCount > 0 ? `Save ${dirtyCount} Change${dirtyCount > 1 ? "s" : ""}` : "No Changes"}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="bulk-editor-close-btn">
            <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* Column chips */}
      <div className="flex items-center gap-1.5 px-5 py-2 border-b overflow-x-auto flex-shrink-0"
           style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
        <span className="text-xs font-medium mr-1 flex-shrink-0" style={{ color: COLORS.grayText }}>Editing:</span>
        {tier1Active.map(c => (
          <button key={c.key} onClick={() => toggleCol(c.key)} disabled={c.alwaysVisible}
            className="px-2.5 py-1 text-xs rounded-full text-white flex-shrink-0"
            style={{ backgroundColor: COLORS.primaryOrange }} data-testid={`chip-${c.key}`}>{c.label}</button>
        ))}
        {extraCount > 0 && <span className="px-2.5 py-1 text-xs rounded-full flex-shrink-0" style={{ background: COLORS.amber, color: "#fff" }}>+{extraCount} more</span>}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" data-testid="bulk-editor-grid">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: "#F9FAFB" }}>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider border-b border-r w-10 sticky left-0 z-20 bg-[#F9FAFB]"
                  style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>#</th>
              {activeColumns.map(col => (
                <th key={col.key}
                  className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider border-b border-r cursor-pointer hover:bg-gray-100/50 select-none"
                  style={{ color: COLORS.grayText, borderColor: COLORS.borderGray, minWidth: col.width }}
                  onClick={() => toggleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && <ArrowUpDown className="w-3 h-3" style={{ color: COLORS.primaryOrange }} />}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 border-b w-12" style={{ borderColor: COLORS.borderGray }} />
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((entry, gIdx) => {
              if (entry._type === "header") {
                return (
                  <tr key={`hdr-${entry.catName}`} data-testid={`category-group-${entry.catName}`}>
                    <td colSpan={activeColumns.length + 2}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b sticky left-0"
                      style={{ background: "#F0F0F0", color: COLORS.darkText, borderColor: COLORS.borderGray }}>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: COLORS.primaryOrange }} />
                        {entry.catName}
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: COLORS.borderGray, color: COLORS.grayText }}>{entry.count}</span>
                      </div>
                    </td>
                  </tr>
                );
              }
              const row = entry;
              const rowDirty = isRowDirty(row);
              return (
                <tr key={row._id}
                  className={`border-b transition-colors ${row._isNew ? "bg-green-50/40" : row._saveStatus === "saved" ? "bg-green-50/60" : row._saveStatus === "error" ? "bg-red-50/60" : rowDirty ? "bg-amber-50/40" : "hover:bg-gray-50/50"}`}
                  style={{ borderColor: COLORS.borderGray }} data-testid={`row-${row._id}`}>
                  <td className="px-3 py-1.5 text-xs font-mono border-r sticky left-0 bg-inherit" style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>
                    {row._saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
                    {row._saveStatus === "saved" && <Check className="w-3 h-3 text-green-500" />}
                    {row._saveStatus === "error" && <AlertCircle className="w-3 h-3 text-red-500" />}
                    {!row._saveStatus && (row._isNew ? "+" : gIdx)}
                  </td>
                  {activeColumns.map(col => (
                    <td key={col.key} className={`px-1.5 py-1 border-r ${isDirty(row, col.key) ? "bg-amber-100/60" : ""}`}
                        style={{ borderColor: COLORS.borderGray, minWidth: col.width }}>
                      <CellRenderer col={col} row={row} updateCell={updateCell} catOptions={catOptions} dirty={isDirty(row, col.key)} />
                    </td>
                  ))}
                  <td className="px-1.5 py-1 text-center">
                    {rowDirty && row._saveStatus !== "saving" && (
                      <button onClick={() => resetRow(row._id)} className="p-1 rounded hover:bg-gray-100" title={row._isNew ? "Remove" : "Undo"} data-testid={`reset-row-${row._id}`}>
                        <RotateCcw className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {groupedRows.length === 0 && (
              <tr><td colSpan={activeColumns.length + 2} className="px-6 py-12 text-center text-sm" style={{ color: COLORS.grayText }}>
                {search ? `No items matching "${search}"` : "No menu items found."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {dirtyCount > 0 && (
        <div className="flex items-center justify-between px-5 py-2.5 border-t flex-shrink-0"
             style={{ borderColor: COLORS.borderGray, background: "linear-gradient(to right, #FFF7ED, #FFFFFF)" }}>
          <span className="text-sm" style={{ color: COLORS.darkText }}>
            <strong style={{ color: COLORS.primaryOrange }}>{dirtyCount}</strong> item{dirtyCount > 1 ? "s" : ""} modified
          </span>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }} data-testid="reset-all-btn">Reset All</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-white hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: COLORS.primaryOrange }} data-testid="footer-save-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : `Save ${dirtyCount} Change${dirtyCount > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Local Text Input (CR-023: type locally, flush on blur) ────────
function LocalTextInput({ value, onChange, ...props }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <input {...props} type="text" value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onChange(local); }}
    />
  );
}

// ─── Cell Renderer ─────────────────────────────────────────────────
const CellRenderer = React.memo(function CellRenderer({ col, row, updateCell, catOptions, dirty }) {
  const bc = dirty ? COLORS.amber : COLORS.borderGray;
  const base = "w-full px-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-transparent";

  if (col.type === "text" || col.type === "textarea") {
    return <LocalTextInput value={row[col.key] || ""} onChange={val => updateCell(row._id, col.key, val)}
      className={base} style={{ color: COLORS.darkText, borderColor: bc }} placeholder={col.label + "..."} data-testid={`cell-${col.key}-${row._id}`} />;
  }
  if (col.type === "number") {
    return <input type="number" value={row[col.key] ?? 0} onChange={e => updateCell(row._id, col.key, Number(e.target.value))}
      className={`${base} text-right font-mono`} style={{ color: COLORS.darkText, borderColor: bc }} min={0}
      step={col.key.includes("tax") || col.key.includes("Price") || col.key.includes("Charge") || col.key.includes("charge") ? 0.01 : 1}
      data-testid={`cell-${col.key}-${row._id}`} />;
  }
  if (col.type === "time") {
    return <input type="time" value={(row[col.key] || "00:00:00").substring(0, 5)} onChange={e => updateCell(row._id, col.key, e.target.value + ":00")}
      className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-${col.key}-${row._id}`} />;
  }
  if (col.type === "toggle") {
    const on = row[col.key] === 1;
    return <button onClick={() => updateCell(row._id, col.key, on ? 0 : 1)}
      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full w-full justify-center ${on ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
      data-testid={`cell-${col.key}-${row._id}`}>
      <div className={`w-2 h-2 rounded-full ${on ? "bg-green-500" : "bg-gray-400"}`} />
      {on ? "Active" : "Off"}
    </button>;
  }
  if (col.type === "yesno") {
    const yes = row[col.key] === "Yes";
    return <button onClick={() => updateCell(row._id, col.key, yes ? "No" : "Yes")}
      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full w-full justify-center ${yes ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-50 text-gray-400 border border-gray-200"}`}
      data-testid={`cell-${col.key}-${row._id}`}>{yes ? "Yes" : "No"}</button>;
  }
  if (col.type === "dropdown") {
    if (col.key === "categoryId") {
      return <select value={row.categoryId || ""} onChange={e => updateCell(row._id, "categoryId", Number(e.target.value))}
        className={`${base} truncate`} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-categoryId-${row._id}`}>
        <option value="">—</option>
        {catOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>;
    }
    if (col.key === "itemType") {
      return <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: getItemTypeDot(row.itemType) }} />
        <select value={row.itemType} onChange={e => updateCell(row._id, "itemType", Number(e.target.value))}
          className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-itemType-${row._id}`}>
          {ITEM_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>;
    }
    if (col.key === "taxType") {
      return <select value={row.taxType} onChange={e => updateCell(row._id, "taxType", e.target.value)}
        className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-taxType-${row._id}`}>
        {TAX_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    }
    if (col.key === "discountType") {
      return <select value={row.discountType || "percent"} onChange={e => updateCell(row._id, "discountType", e.target.value)}
        className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-discountType-${row._id}`}>
        {DISCOUNT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    }
    if (col.key === "taxCalc") {
      return <select value={row.taxCalc || "Exclusive"} onChange={e => updateCell(row._id, "taxCalc", e.target.value)}
        className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-taxCalc-${row._id}`}>
        <option value="Inclusive">Inclusive</option>
        <option value="Exclusive">Exclusive</option>
      </select>;
    }
    // CR-010: Item Unit dropdown for weight-based billing
    if (col.key === "itemUnit") {
      return <select value={row.itemUnit || ""} onChange={e => updateCell(row._id, "itemUnit", e.target.value)}
        className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-itemUnit-${row._id}`}>
        {ITEM_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    }
  }
  return <span className="text-xs" style={{ color: COLORS.grayText }}>—</span>;
});

export default BulkEditor;
