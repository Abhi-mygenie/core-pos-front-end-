// CR-060: Table Bulk Editor — spreadsheet-style grid (simplified BulkEditor.jsx pattern)
import { useState, useMemo, useCallback, useRef } from "react";
import {
  Plus, Save, X, Search, Download, Upload, Loader2, Check,
  AlertCircle, Trash2, Table2,
} from "lucide-react";
import { COLORS } from "../../../constants";
import { useToast } from "../../../hooks/use-toast";
import { storeTable, deleteTable, exportTableList, importTables } from "../../../api/services/tableService";

const COLUMNS = [
  { key: "rtype", label: "Type", width: 110, type: "dropdown" },
  { key: "tableNo", label: "Table/Room No.", width: 170, type: "text", required: true },
  { key: "title", label: "Area / Section", width: 170, type: "dropdown-free" },
  { key: "waiterId", label: "Assign Waiter", width: 160, type: "dropdown" },
];

let _tempId = 0;
const nextTempId = () => `_new_${++_tempId}`;

const makeRow = (item, isNew = false) => ({
  _id: isNew ? nextTempId() : item.id,
  _isNew: isNew,
  _original: isNew ? null : { ...item },
  _saveStatus: null, // null | 'saving' | 'saved' | 'error'
  _saveError: null,
  _validationErrors: {},
  id: item.id || null,
  rtype: item.rtype || "TB",
  tableNo: item.tableNo || "",
  title: item.title || "",
  waiterId: item.waiterId || "",
  waiterName: item.waiterName || "",
});

export const TableBulkEditor = ({ tables, areas, waiters, onRefresh, onClose, isLoading }) => {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [rows, setRows] = useState(() => tables.map(t => makeRow(t)));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Dirty detection
  const isDirty = useCallback((row) => {
    if (row._isNew) return true;
    if (!row._original) return false;
    return COLUMNS.some(c => String(row[c.key] ?? "") !== String(row._original[c.key] ?? ""));
  }, []);

  const dirtyRows = useMemo(() => rows.filter(isDirty), [rows, isDirty]);

  // Filter by search
  const visibleRows = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      r.tableNo.toLowerCase().includes(s) ||
      (r.title || "").toLowerCase().includes(s) ||
      (r.waiterName || "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  // Validate
  const validateRow = (row) => {
    const errs = {};
    if (!row.tableNo?.trim()) errs.tableNo = "Required";
    return errs;
  };

  // Cell change
  const updateCell = (rowId, key, value) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId) return r;
      const updated = { ...r, [key]: value, _saveStatus: null, _saveError: null };
      // Resolve waiter name for display
      if (key === "waiterId") {
        const w = waiters.find(w => String(w.id) === String(value));
        updated.waiterName = w ? w.name : "";
      }
      updated._validationErrors = validateRow(updated);
      return updated;
    }));
  };

  // Add row
  const handleAddRow = () => {
    const newRow = makeRow({ rtype: "TB", tableNo: "", title: "", waiterId: "" }, true);
    setRows(prev => [newRow, ...prev]);
    // Focus will be handled by autoFocus on new row input
  };

  // Delete row
  const handleDeleteRow = async (row) => {
    if (row._isNew) {
      setRows(prev => prev.filter(r => r._id !== row._id));
      return;
    }
    try {
      await deleteTable(row.id);
      setRows(prev => prev.filter(r => r._id !== row._id));
      toast({ title: "Deleted", description: `"${row.tableNo}" removed.` });
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Delete failed", variant: "destructive" });
    }
  };

  // Save all dirty
  const handleSave = async () => {
    // Validate all dirty rows
    let hasErrors = false;
    setRows(prev => prev.map(r => {
      if (!isDirty(r)) return r;
      const errs = validateRow(r);
      if (Object.keys(errs).length) hasErrors = true;
      return { ...r, _validationErrors: errs };
    }));
    if (hasErrors) {
      toast({ title: "Validation Error", description: `${dirtyRows.length} item(s) have issues.`, variant: "destructive" });
      return;
    }

    setSaving(true);
    const results = await Promise.allSettled(
      dirtyRows.map(async (row) => {
        setRows(prev => prev.map(r => r._id === row._id ? { ...r, _saveStatus: "saving" } : r));
        const res = await storeTable({
          ...(row._isNew ? {} : { id: row.id }),
          rtype: row.rtype,
          tableNo: row.tableNo,
          title: row.title,
          waiterId: row.waiterId || null,
        });
        return { rowId: row._id, res };
      })
    );

    let successCount = 0;
    let errorCount = 0;
    results.forEach((result, idx) => {
      const rowId = dirtyRows[idx]._id;
      if (result.status === "fulfilled") {
        successCount++;
        setRows(prev => prev.map(r => r._id === rowId ? {
          ...r, _saveStatus: "saved", _isNew: false, _saveError: null,
          id: result.value?.res?.id || r.id,
          _original: { ...r, id: result.value?.res?.id || r.id },
        } : r));
      } else {
        errorCount++;
        setRows(prev => prev.map(r => r._id === rowId ? {
          ...r, _saveStatus: "error",
          _saveError: result.reason?.response?.data?.message || "Save failed",
        } : r));
      }
    });

    setSaving(false);
    if (successCount) toast({ title: "Saved", description: `${successCount} item(s) saved.` });
    if (errorCount) toast({ title: "Error", description: `${errorCount} item(s) failed.`, variant: "destructive" });
    if (successCount) onRefresh?.();
  };

  // Export
  const handleExport = async () => {
    try {
      const res = await exportTableList();
      if (res?.download_url) window.open(res.download_url, "_blank");
      else toast({ title: "Exported", description: "Table list exported." });
    } catch (err) {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  };

  // Import
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importTables(file);
      toast({ title: "Imported", description: "Tables imported." });
      onRefresh?.();
      onClose?.(); // Return to normal view after import
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const getRowBg = (row) => {
    if (Object.keys(row._validationErrors || {}).length) return "rgba(239,68,68,0.06)";
    if (row._saveStatus === "error") return "rgba(239,68,68,0.08)";
    if (row._saveStatus === "saved") return "rgba(34,197,94,0.08)";
    if (row._isNew) return "rgba(34,197,94,0.06)";
    if (isDirty(row)) return "rgba(245,158,11,0.06)";
    return "transparent";
  };

  const getRowBorder = (row) => {
    if (Object.keys(row._validationErrors || {}).length) return "4px solid #EF4444";
    if (row._saveStatus === "error") return "4px solid #F87171";
    return "4px solid transparent";
  };

  const getCellBg = (row, key) => {
    if (row._validationErrors?.[key]) return "rgba(239,68,68,0.1)";
    if (isDirty(row) && row._original && String(row[key] ?? "") !== String(row._original[key] ?? "")) return "rgba(245,158,11,0.1)";
    return "transparent";
  };

  const getStatusIcon = (row) => {
    if (row._saveStatus === "saving") return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#F59E0B" }} />;
    if (row._saveStatus === "saved") return <Check className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />;
    if (row._saveStatus === "error") return <AlertCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} title={row._saveError} />;
    if (row._isNew) return <span className="text-xs font-bold" style={{ color: "#22C55E" }}>+</span>;
    return null;
  };

  return (
    <div className="flex flex-col h-full" data-testid="table-bulk-editor">
      {/* Loading overlay */}
      {(isLoading || importing) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10 rounded-xl" data-testid="table-bulk-loader-overlay">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
            <span className="text-sm" style={{ color: COLORS.grayText }}>{importing ? "Importing..." : "Loading..."}</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center gap-3">
          <Table2 className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
          <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>Bulk Editor</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F7F7F7", color: COLORS.grayText }}>{rows.length} items</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: COLORS.grayText }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none"
              style={{ borderColor: COLORS.borderGray, width: 160 }}
              data-testid="table-bulk-search"
            />
          </div>

          <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border hover:bg-gray-50" style={{ borderColor: COLORS.borderGray }} data-testid="table-bulk-export-btn">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border hover:bg-gray-50" style={{ borderColor: COLORS.borderGray }} data-testid="table-bulk-import-btn">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />

          <button onClick={handleAddRow} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-white" style={{ backgroundColor: "#329937" }} data-testid="table-bulk-add-btn">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirtyRows.length}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
            style={{ backgroundColor: dirtyRows.length ? COLORS.primaryOrange : COLORS.grayText }}
            data-testid="table-bulk-save-btn"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {dirtyRows.length ? `Save ${dirtyRows.length} Change${dirtyRows.length > 1 ? "s" : ""}` : "No Changes"}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="table-bulk-close-btn">
            <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-[5]">
            <tr style={{ backgroundColor: "#F9FAFB" }}>
              <th className="px-3 py-2 text-left font-semibold uppercase border-b" style={{ color: COLORS.grayText, width: 48, borderColor: COLORS.borderGray }}>#</th>
              {COLUMNS.map(col => (
                <th key={col.key} className="px-3 py-2 text-left font-semibold uppercase border-b" style={{ color: COLORS.grayText, width: col.width, borderColor: COLORS.borderGray }}>
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 border-b" style={{ width: 48, borderColor: COLORS.borderGray }}></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr
                key={row._id}
                style={{ backgroundColor: getRowBg(row), borderLeft: getRowBorder(row) }}
                data-testid={`table-bulk-row-${row._id}`}
              >
                {/* # col */}
                <td className="px-3 py-1.5 border-b" style={{ borderColor: COLORS.borderGray }}>
                  <div className="flex items-center justify-center w-5 h-5">
                    {getStatusIcon(row) || <span style={{ color: COLORS.grayText }}>{idx + 1}</span>}
                  </div>
                </td>

                {/* Type */}
                <td className="px-1 py-1 border-b" style={{ borderColor: COLORS.borderGray, backgroundColor: getCellBg(row, "rtype") }} data-testid={`table-bulk-cell-rtype-${row._id}`}>
                  <select
                    value={row.rtype}
                    onChange={e => updateCell(row._id, "rtype", e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent"
                    style={{ borderColor: "transparent" }}
                  >
                    <option value="TB">Table</option>
                    <option value="RM">Room</option>
                  </select>
                </td>

                {/* Table/Room No */}
                <td className="px-1 py-1 border-b" style={{ borderColor: COLORS.borderGray, backgroundColor: getCellBg(row, "tableNo") }} data-testid={`table-bulk-cell-tableNo-${row._id}`}>
                  <input
                    value={row.tableNo}
                    onChange={e => updateCell(row._id, "tableNo", e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border outline-none"
                    style={{ borderColor: row._validationErrors?.tableNo ? "#EF4444" : "transparent" }}
                    placeholder="e.g. T001"
                    autoFocus={row._isNew}
                  />
                </td>

                {/* Area */}
                <td className="px-1 py-1 border-b" style={{ borderColor: COLORS.borderGray, backgroundColor: getCellBg(row, "title") }} data-testid={`table-bulk-cell-title-${row._id}`}>
                  <input
                    value={row.title}
                    onChange={e => updateCell(row._id, "title", e.target.value)}
                    list={`area-list-${row._id}`}
                    className="w-full px-2 py-1.5 text-xs rounded border outline-none"
                    style={{ borderColor: "transparent" }}
                    placeholder="Area"
                  />
                  <datalist id={`area-list-${row._id}`}>
                    {areas.map(a => <option key={a} value={a} />)}
                  </datalist>
                </td>

                {/* Waiter */}
                <td className="px-1 py-1 border-b" style={{ borderColor: COLORS.borderGray, backgroundColor: getCellBg(row, "waiterId") }} data-testid={`table-bulk-cell-waiterId-${row._id}`}>
                  <select
                    value={row.waiterId || ""}
                    onChange={e => updateCell(row._id, "waiterId", e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent"
                    style={{ borderColor: "transparent" }}
                  >
                    <option value="">None</option>
                    {waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </td>

                {/* Delete */}
                <td className="px-2 py-1 border-b text-center" style={{ borderColor: COLORS.borderGray }}>
                  <button
                    onClick={() => handleDeleteRow(row)}
                    className="p-1 rounded hover:bg-red-50"
                    data-testid={`table-bulk-delete-${row._id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: row._isNew ? "#EF4444" : COLORS.grayText }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
