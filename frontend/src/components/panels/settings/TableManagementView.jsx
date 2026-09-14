// CR-060: Table/Room Management — Real CRUD APIs
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, Table2, LayoutGrid, Upload, Download, Armchair, Square, User, X } from "lucide-react";
import { COLORS } from "../../../constants";
import { useTables } from "../../../contexts";
import { useToast } from "../../../hooks/use-toast";
import {
  getTableConfig, storeTable, deleteTable,
  getAreaOptions, getWaiterList, exportTableList, importTables,
} from "../../../api/services/tableService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { TableBulkEditor } from "./TableBulkEditor"; // CR-060

// CR-060: Table Management View — wired to real APIs
export const TableManagementView = () => {
  const { refreshTables } = useTables();
  const { toast } = useToast();

  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedArea, setSelectedArea] = useState(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // 'add' | 'edit'
  const [dialogData, setDialogData] = useState({ rtype: "TB", tableNo: "", title: "", waiterId: "" });
  const [dialogErrors, setDialogErrors] = useState({});

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, areasRes, waitersRes] = await Promise.all([
        getTableConfig(), getAreaOptions(), getWaiterList(),
      ]);
      setTables(configRes.tables || []);
      setAreas((areasRes || []).filter(Boolean)); // CR-060: sanitize empty/null from API
      setWaiters(waitersRes || []);
      if (!selectedArea) setSelectedArea("All"); // CR-060: always default to All
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to load tables", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedArea]);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = async () => {
    await fetchAll();
    try { await refreshTables(); } catch {} // refresh TableContext for order flow
  };

  // Group tables by area
  const allAreas = [...new Set(tables.map(t => t.title || "Unassigned"))].sort();
  const filteredTables = selectedArea === "All"
    ? tables
    : tables.filter(t => (t.title || "Unassigned") === selectedArea);
  const areaCounts = {};
  allAreas.forEach(a => { areaCounts[a] = tables.filter(t => (t.title || "Unassigned") === a).length; });

  // Dialog handlers
  const openAddDialog = () => {
    setDialogMode("add");
    setDialogData({ rtype: "TB", tableNo: "", title: selectedArea !== "All" ? selectedArea : "", waiterId: "" });
    setDialogErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (t) => {
    setDialogMode("edit");
    setDialogData({ id: t.id, rtype: t.rtype || "TB", tableNo: t.tableNo, title: t.title || "", waiterId: t.waiterId || "" });
    setDialogErrors({});
    setDialogOpen(true);
  };

  const handleDialogSave = async () => {
    const errors = {};
    if (!dialogData.tableNo?.trim()) errors.tableNo = "Number is required";
    if (Object.keys(errors).length) { setDialogErrors(errors); return; }

    setSaving(true);
    try {
      await storeTable(dialogData);
      setDialogOpen(false);
      toast({ title: "Saved", description: `${dialogData.rtype === "RM" ? "Room" : "Table"} "${dialogData.tableNo}" ${dialogMode === "add" ? "added" : "updated"}.` });
      await refreshAll();
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    setDeleting(true);
    try {
      await deleteTable(item.id);
      toast({ title: "Deleted", description: `${item.rtype === "RM" ? "Room" : "Table"} "${item.tableNo}" removed.` });
      setDeleteConfirm(null);
      await refreshAll();
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportTableList();
      if (res?.download_url) {
        window.open(res.download_url, "_blank");
      }
      toast({ title: "Exported", description: "Table list downloaded." });
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Export failed", variant: "destructive" });
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importTables(file);
      toast({ title: "Imported", description: "Tables imported successfully." });
      await refreshAll();
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Import failed", variant: "destructive" });
    }
    e.target.value = "";
  };

  if (bulkEditMode) {
    return (
      <TableBulkEditor
        tables={tables}
        areas={areas}
        waiters={waiters}
        onRefresh={refreshAll}
        onClose={() => { setBulkEditMode(false); refreshAll(); }}
        isLoading={loading}
      />
    );
  }

  return (
    <div className="flex gap-0 h-full" style={{ minHeight: 400 }} data-testid="table-management-view">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
            <span className="text-sm" style={{ color: COLORS.grayText }}>Loading tables...</span>
          </div>
        </div>
      )}

      {/* Left: Sections */}
      <div className="w-1/4 flex flex-col pr-4" style={{ borderRight: `1px solid ${COLORS.borderGray}` }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>
          Sections <span style={{ color: COLORS.grayText }}>({allAreas.length})</span>
        </h3>

        <div className="flex-1 overflow-y-auto" data-testid="section-list">
          {/* All section */}
          <button
            onClick={() => setSelectedArea("All")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 text-left transition-colors"
            style={{
              backgroundColor: selectedArea === "All" ? "rgba(242,107,51,0.08)" : "transparent",
              borderLeft: selectedArea === "All" ? `3px solid ${COLORS.primaryOrange}` : "3px solid transparent",
            }}
            data-testid="section-All"
          >
            <span className="text-sm font-medium" style={{ color: selectedArea === "All" ? COLORS.primaryOrange : COLORS.darkText }}>All</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E5E5E5", color: COLORS.grayText }}>{tables.length}</span>
          </button>

          {allAreas.map((area) => {
            const isSelected = area === selectedArea;
            return (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? "rgba(242,107,51,0.08)" : "transparent",
                  borderLeft: isSelected ? `3px solid ${COLORS.primaryOrange}` : "3px solid transparent",
                }}
                data-testid={`section-${area}`}
              >
                <span className="text-sm font-medium" style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}>{area}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E5E5E5", color: COLORS.grayText }}>{areaCounts[area] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Tables */}
      <div className="flex-1 flex flex-col pl-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4" data-testid="table-toolbar">
          <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
            {selectedArea || "All"}{" "}
            <span style={{ color: COLORS.grayText }}>({filteredTables.length} Tables & Rooms)</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="bulk-edit-toggle"
            >
              <Table2 className="w-3.5 h-3.5" /> Bulk Edit
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="export-btn"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="import-btn"
            >
              <Upload className="w-3.5 h-3.5" /> Import
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={openAddDialog}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
              style={{ backgroundColor: COLORS.primaryOrange }}
              data-testid="add-table-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add Table/Room
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        {filteredTables.length === 0 && !loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <LayoutGrid className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.borderGray }} />
              <p className="text-sm" style={{ color: COLORS.grayText }}>No tables in {selectedArea || "this section"}</p>
              <button onClick={openAddDialog} className="mt-2 text-xs font-medium" style={{ color: COLORS.primaryOrange }}>
                + Add your first table
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto" data-testid="table-card-grid">
            {filteredTables.map((t) => {
              const isRoom = t.rtype === "RM";
              const isDeleting = deleteConfirm?.id === t.id;

              return (
                <div key={t.id}>
                  <div
                    className="relative p-4 rounded-xl border group transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ backgroundColor: COLORS.lightBg, borderColor: COLORS.borderGray }}
                    data-testid={`table-card-${t.id}`}
                  >
                    {/* Type badge */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2"
                      style={{
                        backgroundColor: isRoom ? "rgb(254 243 199)" : "rgb(243 244 246)",
                        color: isRoom ? "rgb(146 64 14)" : "rgb(55 65 81)",
                      }}
                      data-testid={`table-type-badge-${t.id}`}
                    >
                      {isRoom ? <Armchair className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                      {isRoom ? "Room" : "Table"}
                    </span>

                    <div className="text-base font-semibold mb-1" style={{ color: COLORS.darkText }}>{t.tableNo}</div>
                    {t.title && <div className="text-xs mb-1" style={{ color: COLORS.grayText }}>{t.title}</div>}
                    <div className="flex items-center gap-1 text-xs" style={{ color: COLORS.grayText }} data-testid={`table-waiter-${t.id}`}>
                      <User className="w-3 h-3" /> {t.waiterName}
                    </div>

                    {/* Actions */}
                    <div
                      className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        onClick={() => openEditDialog(t)}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                        data-testid={`table-edit-btn-${t.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(t)}
                        className="p-1.5 rounded-lg hover:bg-red-50"
                        data-testid={`table-delete-btn-${t.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                      </button>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  {isDeleting && (
                    <div
                      className="mt-1 p-2 rounded text-xs flex items-center justify-between"
                      style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
                      data-testid={`delete-confirm-${t.id}`}
                    >
                      <span style={{ color: "#EF4444" }}>Delete "{t.tableNo}"?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-0.5 rounded border"
                          style={{ borderColor: COLORS.borderGray }}
                          data-testid={`delete-no-btn-${t.id}`}
                        >No</button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: "#EF4444" }}
                          disabled={deleting}
                          data-testid={`delete-yes-btn-${t.id}`}
                        >
                          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-testid="add-table-dialog">
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Add Table / Room" : "Edit Table / Room"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Type toggle */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.darkText }}>Type</label>
              <div className="flex p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }} data-testid="dialog-type-toggle">
                {[{ v: "TB", l: "Table" }, { v: "RM", l: "Room" }].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setDialogData(p => ({ ...p, rtype: opt.v }))}
                    className="flex-1 py-1.5 text-sm font-medium rounded-md transition-all"
                    style={{
                      backgroundColor: dialogData.rtype === opt.v ? "#FFFFFF" : "transparent",
                      boxShadow: dialogData.rtype === opt.v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      color: dialogData.rtype === opt.v ? COLORS.darkText : COLORS.grayText,
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Number */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.darkText }}>
                {dialogData.rtype === "RM" ? "Room" : "Table"} Number *
              </label>
              <input
                value={dialogData.tableNo}
                onChange={e => { setDialogData(p => ({ ...p, tableNo: e.target.value })); setDialogErrors(p => ({ ...p, tableNo: undefined })); }}
                placeholder={dialogData.rtype === "RM" ? "e.g. R001" : "e.g. T001"}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                style={{
                  borderColor: dialogErrors.tableNo ? "#EF4444" : COLORS.borderGray,
                }}
                data-testid="dialog-table-number"
              />
              {dialogErrors.tableNo && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{dialogErrors.tableNo}</p>}
            </div>

            {/* Area */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.darkText }}>Area / Section</label>
              <input
                value={dialogData.title}
                onChange={e => setDialogData(p => ({ ...p, title: e.target.value }))}
                placeholder="Select or type new area"
                list="area-options"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="dialog-area-select"
              />
              <datalist id="area-options">
                {areas.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>

            {/* Waiter */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.darkText }}>Assign Waiter</label>
              <select
                value={dialogData.waiterId}
                onChange={e => setDialogData(p => ({ ...p, waiterId: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="dialog-waiter-select"
              >
                <option value="">None</option>
                {waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="dialog-cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleDialogSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ backgroundColor: COLORS.primaryOrange }}
              data-testid="dialog-save-btn"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {dialogMode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
