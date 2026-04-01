import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { COLORS } from "../../../constants";
import { useMenu } from "../../../contexts";
import { useToast } from "../../../hooks/use-toast";

const CategoryList = ({ selectedCategoryId, onSelectCategory }) => {
  const { categories } = useMenu();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [localCategories, setLocalCategories] = useState(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const cats = localCategories || categories || [];
  const filtered = search ? cats.filter((c) => c.categoryName.toLowerCase().includes(search.toLowerCase())) : cats;
  const totalItems = cats.reduce((sum, c) => sum + (c.itemCount || 0), 0);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(cats);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setLocalCategories(items);
    toast({ title: "Reordered", description: "Category order updated." });
  };

  const handleAdd = () => {
    if (formName.trim()) {
      toast({ title: "Saved", description: `Category "${formName}" added.` });
    }
    setAddingCategory(false);
    setFormName("");
  };

  const handleEdit = (cat) => {
    setEditingId(cat.categoryId);
    setFormName(cat.categoryName);
  };

  const handleSaveEdit = () => {
    toast({ title: "Saved", description: "Category updated." });
    setEditingId(null);
    setFormName("");
  };

  const handleDelete = (cat) => {
    toast({ title: "Deleted", description: `Category "${cat.categoryName}" removed.` });
    setDeleteConfirm(null);
  };

  return (
    <div className="flex flex-col h-full" data-testid="category-list">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="category-search"
        />
      </div>

      {/* All Items */}
      <button
        onClick={() => onSelectCategory(null)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 text-left transition-colors"
        style={{
          backgroundColor: !selectedCategoryId ? "rgba(242,107,51,0.08)" : "transparent",
          borderLeft: !selectedCategoryId ? `3px solid ${COLORS.primaryOrange}` : "3px solid transparent",
        }}
        data-testid="category-all"
      >
        <span className="text-sm font-medium" style={{ color: !selectedCategoryId ? COLORS.primaryOrange : COLORS.darkText }}>
          All Items
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.borderGray, color: COLORS.grayText }}>
          {totalItems}
        </span>
      </button>

      {/* Category List with DnD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto">
              {filtered.map((cat, index) => {
                const isSelected = selectedCategoryId === cat.categoryId;
                const isEditing = editingId === cat.categoryId;
                const isDeleting = deleteConfirm === cat.categoryId;

                if (isEditing) {
                  return (
                    <div key={cat.categoryId} className="px-2 mb-1">
                      <input
                        autoFocus
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded border outline-none mb-1"
                        style={{ borderColor: COLORS.primaryOrange }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditingId(null)} className="px-2 py-0.5 text-xs rounded border" style={{ borderColor: COLORS.borderGray }}>Cancel</button>
                        <button onClick={handleSaveEdit} className="px-2 py-0.5 text-xs rounded text-white" style={{ backgroundColor: COLORS.primaryGreen }}>Save</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <Draggable key={cat.categoryId} draggableId={String(cat.categoryId)} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <div
                          onClick={() => onSelectCategory(cat.categoryId)}
                          className="flex items-center gap-1 px-1 py-2 rounded-lg mb-0.5 group cursor-pointer transition-colors"
                          style={{
                            backgroundColor: snapshot.isDragging ? "rgba(242,107,51,0.12)" : isSelected ? "rgba(242,107,51,0.08)" : "transparent",
                            borderLeft: isSelected ? `3px solid ${COLORS.primaryOrange}` : "3px solid transparent",
                          }}
                          data-testid={`category-${cat.categoryId}`}
                        >
                          <div {...provided.dragHandleProps} className="p-1 cursor-grab opacity-30 group-hover:opacity-100">
                            <GripVertical className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                          </div>
                          <span className="flex-1 text-sm font-medium truncate" style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}>
                            {cat.categoryName}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full mr-1" style={{ backgroundColor: COLORS.borderGray, color: COLORS.grayText }}>
                            {cat.itemCount || 0}
                          </span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(cat); }} className="p-1 rounded hover:bg-gray-200">
                              <Pencil className="w-3 h-3" style={{ color: COLORS.grayText }} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(cat.categoryId); }} className="p-1 rounded hover:bg-red-50">
                              <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                            </button>
                          </div>
                        </div>

                        {isDeleting && (
                          <div className="mx-2 mb-1 p-2 rounded text-xs flex items-center justify-between" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <span style={{ color: "#EF4444" }}>Delete?</span>
                            <div className="flex gap-1">
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 rounded border" style={{ borderColor: COLORS.borderGray }}>No</button>
                              <button onClick={() => handleDelete(cat)} className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: "#EF4444" }}>Yes</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Category */}
      {addingCategory ? (
        <div className="mt-2 p-2 rounded-lg border" style={{ borderColor: COLORS.primaryOrange }}>
          <input
            autoFocus
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Category name"
            className="w-full px-2 py-1.5 text-sm rounded border outline-none mb-2"
            style={{ borderColor: COLORS.borderGray }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddingCategory(false); setFormName(""); } }}
            data-testid="new-category-input"
          />
          <div className="flex gap-1 justify-end">
            <button onClick={() => { setAddingCategory(false); setFormName(""); }} className="px-3 py-1 text-xs rounded border" style={{ borderColor: COLORS.borderGray }}>Cancel</button>
            <button onClick={handleAdd} className="px-3 py-1 text-xs rounded text-white" style={{ backgroundColor: COLORS.primaryGreen }}>Add</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setAddingCategory(true); setFormName(""); }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg border border-dashed transition-colors hover:bg-orange-50"
          style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
          data-testid="add-category-btn"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      )}
    </div>
  );
};

export default CategoryList;
