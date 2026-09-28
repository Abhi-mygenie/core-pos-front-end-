// BUG-311 Layer 1B / Layer 4: shared typeahead warning combobox for ingredient name inputs
// Extracted from InventorySetupPanel.jsx so it can be reused in edit form + bulk editor
// Uses position:fixed + getBoundingClientRect to escape overflow-hidden/overflow-x-auto ancestors
// excludeId: pass the current ingredient's id when editing — prevents self-match in duplicate check
import React, { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';

export default function IngredientNameCombobox({ value, onChange, existingIngredients, testId, excludeId = null }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const trimmed = (value || '').trim().toLowerCase();

  // Filter candidates — exclude self when editing an existing ingredient
  const filtered = useMemo(() =>
    trimmed.length > 0
      ? existingIngredients.filter(i =>
          i.name.toLowerCase().includes(trimmed) &&
          (excludeId === null || i.id !== excludeId)
        )
      : [],
    [existingIngredients, trimmed, excludeId]
  );

  // Exact match drives amber border + "Already exists" badge + Save disabled
  const exactMatch = trimmed.length > 0 &&
    existingIngredients.some(i =>
      i.name.trim().toLowerCase() === trimmed &&
      (excludeId === null || i.id !== excludeId)
    );

  const openDrop = () => {
    if (!inputRef.current || trimmed.length === 0) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); if (e.target.value.trim()) openDrop(); else setOpen(false); }}
        onFocus={openDrop}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Ingredient name..."
        className={`h-8 text-sm ${exactMatch ? 'border-amber-400 bg-amber-50' : ''}`}
        autoFocus
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <div
          className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999, maxHeight: 192, overflowY: 'auto' }}>
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
            Existing ingredients
          </div>
          {filtered.map(ing => {
            const isExact = ing.name.trim().toLowerCase() === trimmed;
            return (
              <div key={ing.id}
                className={`px-3 py-2 text-sm flex items-center justify-between cursor-default
                  ${isExact ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'}`}
                data-testid={`ingredient-suggestion-${ing.id}`}>
                <span className="font-medium">{ing.name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {ing.categoryName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">{ing.categoryName}</span>
                  )}
                  {isExact && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Already exists</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
