import React from "react";

// CR-145: Variation expand panel — read-only inline sub-row in BulkEditor

export default function VariationExpandPanel({ foodName, foodImage, variations = [], onClose }) {
  return (
    <div style={{ padding: '14px 18px', background: '#fdf4ff' }}>
      {/* Header with food image */}
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
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Read-only — edit in Product Form for changes</div>
        </div>
      </div>

      {/* Variation groups */}
      {variations.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>No variation data available.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          {variations.map((group, gIdx) => (
            <div key={gIdx}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed',
                             textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {group.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(group.values || []).map((val, vIdx) => (
                  <span key={vIdx}
                    style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', color: '#6b21a8',
                              padding: '4px 12px', borderRadius: 12, fontSize: 11.5 }}>
                    {val.label}{val.optionPrice > 0 ? ` · ₹${val.optionPrice}` : ''}
                  </span>
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
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          Full variation editing → open Product Form for this item
        </span>
      </div>
    </div>
  );
}
