import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { COLORS } from "../../../constants";
import { getVariations, toggleVariation } from "../../../api/services/aggregatorConfigService";
import { useToast } from "../../../hooks/use-toast";

// CR-143: Variation Stock management tab in AggregatorSetupView

const BrandSelect = ({ subBrands, activeClientId, onSelect }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
    <span style={{ fontSize: 12, color: COLORS.grayText }}>Brand:</span>
    <select
      value={activeClientId ?? ''}
      onChange={e => onSelect(e.target.value ? Number(e.target.value) : null)}
      style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${COLORS.borderGray}` }}>
      <option value="">Main Brand</option>
      {(subBrands || []).map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  </div>
);

export default function VariationStockTab({ activeClientId: parentClientId, subBrands }) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState(parentClientId);
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [opLoading, setOpLoading] = useState({});

  useEffect(() => { setClientId(parentClientId); }, [parentClientId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVariations(clientId);
      setItems(res.items || []);
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Failed to load variations', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [clientId, toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = (foodId) => setExpanded(p => ({ ...p, [foodId]: !p[foodId] }));

  const handleToggle = useCallback(async (food_id, variation_index, variation_value_index, action, label) => {
    const key = `${food_id}_${variation_index}_${variation_value_index}_${action}`;
    setOpLoading(p => ({ ...p, [key]: true }));
    try {
      await toggleVariation({ food_id, variation_index, variation_value_index, action, clientId });
      toast({ title: 'Done', description: `"${label}" ${action}d on UrbanPiper` });
      load();
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Operation failed', variant: 'destructive' });
    } finally { setOpLoading(p => ({ ...p, [key]: false })); }
  }, [clientId, load, toast]);

  const groupToggleAll = useCallback(async (food_id, variation_index, values, action) => {
    const results = await Promise.allSettled(
      values.map((v, valIdx) =>
        toggleVariation({ food_id, variation_index, variation_value_index: valIdx, action, clientId })
      )
    );
    const passed = results.filter(r => r.status === 'fulfilled').length;
    toast({ title: 'Done', description: `${passed}/${values.length} values ${action}d` });
    load();
  }, [clientId, load, toast]);

  const btnStyle = (color) => ({
    fontSize: 11, padding: '2px 8px', borderRadius: 5, cursor: 'pointer',
    border: `1px solid ${color}20`, background: `${color}10`, color,
  });

  return (
    <div style={{ maxWidth: 720 }}>
      <BrandSelect subBrands={subBrands} activeClientId={clientId} onSelect={setClientId} />

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: COLORS.grayText, fontSize: 13 }}>Loading variations…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: COLORS.grayText, fontSize: 13 }}>
          No foods with variations found on this brand.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(food => (
            <div key={food.id} style={{ border: `1px solid ${COLORS.borderGray}`, borderRadius: 8, overflow: 'hidden' }}>
              {/* Food header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                            background: '#f8fafc', cursor: 'pointer' }}
                   onClick={() => toggle(food.id)}>
                {expanded[food.id]
                  ? <ChevronDown className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                  : <ChevronRight className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />}
                <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', flex: 1 }}>{food.name}</span>
                <span style={{ fontSize: 11, color: COLORS.grayText }}>
                  {(food.variations || []).length} group{(food.variations || []).length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Variation groups */}
              {expanded[food.id] && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(food.variations || []).map((vGroup, varIdx) => (
                    <div key={varIdx}>
                      {/* Group header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed',
                                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {vGroup.name}
                        </span>
                        <button onClick={() => groupToggleAll(food.id, varIdx, vGroup.values || [], 'enable')}
                          style={{ ...btnStyle('#16a34a'), marginLeft: 'auto' }}>Enable All</button>
                        <button onClick={() => groupToggleAll(food.id, varIdx, vGroup.values || [], 'disable')}
                          style={btnStyle('#dc2626')}>Disable All</button>
                      </div>
                      {/* Values */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(vGroup.values || []).map((val, valIdx) => {
                          const enableKey  = `${food.id}_${varIdx}_${valIdx}_enable`;
                          const disableKey = `${food.id}_${varIdx}_${valIdx}_disable`;
                          return (
                            <div key={valIdx} style={{ display: 'flex', alignItems: 'center', gap: 6,
                                                        background: '#f8fafc', border: `1px solid ${COLORS.borderGray}`,
                                                        borderRadius: 7, padding: '5px 10px' }}>
                              <span style={{ fontSize: 12, color: '#374151' }}>
                                {val.label}
                                {val.optionPrice > 0 && <span style={{ color: COLORS.grayText }}> · ₹{val.optionPrice}</span>}
                              </span>
                              <button onClick={() => handleToggle(food.id, varIdx, valIdx, 'enable', val.label)}
                                disabled={opLoading[enableKey]}
                                style={btnStyle('#16a34a')}>En</button>
                              <button onClick={() => handleToggle(food.id, varIdx, valIdx, 'disable', val.label)}
                                disabled={opLoading[disableKey]}
                                style={btnStyle('#dc2626')}>Dis</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
