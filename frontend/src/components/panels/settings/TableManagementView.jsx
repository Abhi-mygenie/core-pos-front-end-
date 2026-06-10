import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { COLORS } from "../../../constants";
import { useTables } from "../../../contexts";
import { useToast } from "../../../hooks/use-toast";
import { TextInput } from "./shared";

// ═══════════════════════════════════════════════════════════════════════════
// Pattern C: Master-Detail (Table Management)
// ═══════════════════════════════════════════════════════════════════════════

export const TableManagementView = () => {
  const { tables, sections } = useTables();
  const { toast } = useToast();

  const [selectedSection, setSelectedSection] = useState(sections[0] || "Default");
  const [addingSection, setAddingSection] = useState(false);
  const [addingTable, setAddingTable] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [newTableNumber, setNewTableNumber] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'section'|'table', id }

  const sectionTables = tables.filter((t) => (t.sectionName || "Default") === selectedSection);

  const handleSave = (msg) => {
    toast({ title: "Saved", description: msg });
  };

  const handleDelete = (type, name) => {
    toast({ title: "Deleted", description: `${type} "${name}" removed.` });
    setDeleteConfirm(null);
  };

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: "400px" }}>
      {/* Left Column: Sections */}
      <div className="w-1/3 flex flex-col" style={{ borderRight: `1px solid ${COLORS.borderGray}` }}>
        <div className="flex items-center justify-between pr-4 mb-3">
          <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
            Sections <span style={{ color: COLORS.grayText }}>({sections.length})</span>
          </h3>
          <button
            onClick={() => { setAddingSection(true); setNewSectionName(""); }}
            className="p-1.5 rounded-lg hover:bg-gray-100"
            data-testid="add-section-btn"
          >
            <Plus className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
          </button>
        </div>

        {/* Add Section Input */}
        {addingSection && (
          <div className="pr-4 mb-2">
            <div className="flex gap-2">
              <input
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name"
                className="flex-1 px-2 py-1.5 text-sm rounded border outline-none"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="new-section-input"
              />
              <button
                onClick={() => {
                  if (newSectionName.trim()) handleSave(`Section "${newSectionName}" added.`);
                  setAddingSection(false);
                }}
                className="px-2 py-1 text-xs rounded text-white"
                style={{ backgroundColor: COLORS.primaryGreen }}
              >
                Add
              </button>
              <button
                onClick={() => setAddingSection(false)}
                className="px-2 py-1 text-xs rounded border"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              >
                X
              </button>
            </div>
          </div>
        )}

        {/* Section List */}
        <div className="flex-1 overflow-y-auto pr-2">
          {sections.map((section) => {
            const count = tables.filter((t) => (t.sectionName || "Default") === section).length;
            const isSelected = section === selectedSection;
            const isDeleting = deleteConfirm?.type === "section" && deleteConfirm.id === section;

            if (editingSection === section) {
              return (
                <div key={section} className="flex gap-1 mb-1 pr-2">
                  <input
                    autoFocus
                    defaultValue={section}
                    className="flex-1 px-2 py-1.5 text-sm rounded border outline-none"
                    style={{ borderColor: COLORS.primaryOrange }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { handleSave(`Section renamed.`); setEditingSection(null); }
                      if (e.key === "Escape") setEditingSection(null);
                    }}
                  />
                  <button
                    onClick={() => { handleSave("Section renamed."); setEditingSection(null); }}
                    className="px-2 text-xs rounded text-white"
                    style={{ backgroundColor: COLORS.primaryGreen }}
                  >
                    OK
                  </button>
                </div>
              );
            }

            return (
              <div key={section}>
                <button
                  onClick={() => setSelectedSection(section)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 text-left group transition-colors"
                  style={{
                    backgroundColor: isSelected ? "rgba(242,107,51,0.08)" : "transparent",
                    borderLeft: isSelected ? `3px solid ${COLORS.primaryOrange}` : "3px solid transparent",
                  }}
                  data-testid={`section-${section}`}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}>
                      {section}
                    </div>
                    <div className="text-xs" style={{ color: COLORS.grayText }}>{count} tables</div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingSection(section); }}
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      <Pencil className="w-3 h-3" style={{ color: COLORS.grayText }} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "section", id: section }); }}
                      className="p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                </button>

                {isDeleting && (
                  <div className="mx-2 mb-2 p-2 rounded text-xs flex items-center justify-between" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <span style={{ color: "#EF4444" }}>Delete "{section}"?</span>
                    <div className="flex gap-1">
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 rounded border" style={{ borderColor: COLORS.borderGray }}>No</button>
                      <button onClick={() => handleDelete("Section", section)} className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: "#EF4444" }}>Yes</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Tables for selected section */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
            {selectedSection} <span style={{ color: COLORS.grayText }}>({sectionTables.length} tables)</span>
          </h3>
          <button
            onClick={() => { setAddingTable(true); setNewTableNumber(""); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
            style={{ backgroundColor: COLORS.primaryOrange }}
            data-testid="add-table-btn"
          >
            <Plus className="w-3 h-3" /> Add Table
          </button>
        </div>

        {/* Add Table Input */}
        {addingTable && (
          <div className="mb-3 p-3 rounded-lg border" style={{ borderColor: COLORS.primaryOrange, backgroundColor: "rgba(242,107,51,0.03)" }}>
            <TextInput label="Table Number" value={newTableNumber} onChange={setNewTableNumber} placeholder="e.g. T15" required />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setAddingTable(false)} className="px-3 py-1.5 text-xs rounded border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button
                onClick={() => { if (newTableNumber.trim()) handleSave(`Table "${newTableNumber}" added.`); setAddingTable(false); }}
                className="px-3 py-1.5 text-xs rounded text-white"
                style={{ backgroundColor: COLORS.primaryGreen }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Table Grid */}
        <div className="grid grid-cols-5 gap-3 flex-1 overflow-y-auto">
          {sectionTables.map((t) => {
            const isEditing = editingTable === t.tableId;
            const isDeleting = deleteConfirm?.type === "table" && deleteConfirm.id === t.tableId;

            return (
              <div key={t.tableId}>
                <div
                  className="relative text-center p-3 rounded-xl border cursor-pointer group transition-all hover:shadow-sm"
                  style={{
                    borderColor: t.isOccupied ? COLORS.primaryOrange : COLORS.borderGray,
                    backgroundColor: t.isOccupied ? "rgba(242,107,51,0.05)" : COLORS.lightBg,
                  }}
                  onClick={() => setEditingTable(isEditing ? null : t.tableId)}
                  data-testid={`table-${t.tableId}`}
                >
                  <div className="text-sm font-semibold" style={{ color: t.isOccupied ? COLORS.primaryOrange : COLORS.darkText }}>
                    T{t.tableNumber}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>{t.status}</div>

                  {/* Hover actions */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTable(t.tableId); }}
                      className="p-0.5 rounded hover:bg-gray-100"
                    >
                      <Pencil className="w-3 h-3" style={{ color: COLORS.grayText }} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "table", id: t.tableId }); }}
                      className="p-0.5 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                </div>

                {/* Edit popover */}
                {isEditing && (
                  <div className="mt-1 p-2 rounded-lg border text-xs" style={{ borderColor: COLORS.primaryOrange, backgroundColor: "rgba(242,107,51,0.03)" }}>
                    <input
                      defaultValue={t.tableNumber}
                      className="w-full px-2 py-1 mb-1 rounded border text-xs"
                      style={{ borderColor: COLORS.borderGray }}
                      placeholder="Table number"
                    />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingTable(null)} className="px-2 py-0.5 rounded border" style={{ borderColor: COLORS.borderGray }}>Cancel</button>
                      <button onClick={() => { handleSave("Table updated."); setEditingTable(null); }} className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: COLORS.primaryGreen }}>Save</button>
                    </div>
                  </div>
                )}

                {/* Delete confirm */}
                {isDeleting && (
                  <div className="mt-1 p-2 rounded text-xs" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <span style={{ color: "#EF4444" }}>Delete T{t.tableNumber}?</span>
                    <div className="flex justify-end gap-1 mt-1">
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 rounded border" style={{ borderColor: COLORS.borderGray }}>No</button>
                      <button onClick={() => handleDelete("Table", `T${t.tableNumber}`)} className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: "#EF4444" }}>Yes</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
