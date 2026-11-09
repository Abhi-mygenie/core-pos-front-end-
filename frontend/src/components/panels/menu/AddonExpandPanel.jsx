import React, { useState, useMemo } from "react";
import { COLORS } from "../../../constants";

// CR-145: Addon expand panel — inline sub-row in BulkEditor

export default function AddonExpandPanel({
  foodName, foodImage, allAddons = [], currentAddonIds = [],
  currencySymbol = '₹', onApply, onClose,
}) {
  const [selected, setSelected] = useState(() => new Set(currentAddonIds));

  const isDirty = useMemo(() => {
    const orig = JSON.stringify([...currentAddonIds].sort((a,b) => a-b));
    const curr = JSON.stringify([...selected].sort((a,b) => a-b));
    return orig !== curr;
  }, [selected, currentAddonIds]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ padding: '14px 18px' }}>
      {/* Header with food image */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {foodImage ? (
          <img src={foodImage} alt="" loading="lazy"
            style={{ width:44, height:44, borderRadius:8, objectFit:'cover',
                     border:'1px solid #e2e8f0', flexShrink:0 }} />
        ) : (
          <div style={{ width:44, height:44, borderRadius:8, background:'#f1f5f9',
                        border:'1px solid #e2e8f0', flexShrink:0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 12 }}>Add-ons</div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{foodName}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            Check/uncheck to assign · {allAddons.length} available
          </div>
        </div>
        {isDirty && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            ● Unsaved
          </span>
        )}
      </div>

      {/* Addon checkboxes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {allAddons.length === 0 ? (
          <span style={{ fontSize: 12, color: COLORS.grayText }}>No add-ons available for this restaurant.</span>
        ) : allAddons.map(a => {
          const checked = selected.has(a.id);
          return (
            <div key={a.id}
              onClick={() => toggle(a.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                       background: checked ? '#f0fdf4' : '#fff',
                       border: `1px solid ${checked ? '#86efac' : '#e2e8f0'}`,
                       borderRadius: 7, padding: '6px 10px', fontSize: 12,
                       transition: 'all 0.1s', userSelect: 'none' }}>
              <input type="checkbox" readOnly checked={checked}
                style={{ width:13, height:13, accentColor: '#22c55e', pointerEvents:'none' }} />
              <span style={{ color: '#374151' }}>{a.name}</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{currencySymbol}{a.price}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12,
                    borderTop: '1px solid #e2e8f0' }}>
        <button onClick={() => onApply([...selected])}
          style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 16px',
                   borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Apply Changes
        </button>
        <button onClick={onClose}
          style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0',
                   padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          Cancel
        </button>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
          Use Bulk Save toolbar to push changes to API
        </span>
      </div>
    </div>
  );
}
