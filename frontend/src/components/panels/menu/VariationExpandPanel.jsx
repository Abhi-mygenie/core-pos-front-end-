import React from "react";

// CR-145: Variation expand panel — inline sub-row in BulkEditor
// BUG-371: Added onPriceChange prop for inline price editing

export default function VariationExpandPanel({ foodName, foodImage, variations = [], onClose, onPriceChange }) {
  return (
    <div style={{ padding: '14px 18px', background: '#fdf4ff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {foodImage ? (
          <img src={foodImage} alt="" loading="lazy"
            style={{ width:44, height:44, borderRadius:8, objectFit:'cover',
                     border:'1px solid #e2e8f0', flexShrink:0 }} />
        ) : (
          <div style={{ width:44, height:44, borderRadius:8, background:'#f3e8ff',
                        border:'1px solid #e9d5ff', flexShrink:0 }} />
        )}
        <div>
          <div style={{ fontWeight: 700, color: '#9333ea', fontSize: 12 }}>Variations</div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{foodName}</div>
          {!onPriceChange && (
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Read-only — edit in Product Form for changes</div>
          )}
        </div>
      </div>

      {/* Variation groups */}
      {variations.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>No variation data available.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
          {variations.map((group, gIdx) => (
            <div key={gIdx}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed',
                             textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {group.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(group.values || []).map((val, vIdx) => (
                  <div key={vIdx}
                    style={{ display: 'flex', alignItems: 'center', gap: 6,
                             background: '#fdf4ff', border: '1px solid #e9d5ff',
                             borderRadius: 10, padding: '5px 10px' }}>
                    <span style={{ fontSize: 12, color: '#6b21a8', fontWeight: 500 }}>{val.name}</span>
                    {onPriceChange ? (
                      <>
                        <span style={{ fontSize: 11, color: '#9333ea' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={val.price ?? 0}
                          onChange={e => onPriceChange(gIdx, vIdx, parseFloat(e.target.value) || 0)}
                          data-testid={`var-price-${gIdx}-${vIdx}`}
                          style={{ width: 65, border: '1px solid #e9d5ff', borderRadius: 6,
                                   padding: '3px 7px', fontSize: 12, color: '#6b21a8',
                                   background: 'white', outline: 'none' }}
                        />
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: '#9333ea' }}>
                        {val.price > 0 ? `· ₹${val.price}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12,
                    borderTop: '1px solid #e9d5ff' }}>
        <button onClick={onClose}
          style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0',
                   padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          Close
        </button>
        {!onPriceChange && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Full variation editing → open Product Form for this item
          </span>
        )}
      </div>
    </div>
  );
}
