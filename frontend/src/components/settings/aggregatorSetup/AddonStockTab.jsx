import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { COLORS } from "../../../constants";
import { getBulkAddons, getBulkAddonItems, applyBulkAddon, toggleAddonStock } from "../../../api/services/aggregatorConfigService";
import { useToast } from "../../../hooks/use-toast";

// CR-143: Addon Stock management tab in AggregatorSetupView

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

export default function AddonStockTab({ activeClientId: parentClientId, subBrands }) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState(parentClientId);
  const [addons, setAddons]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [addonItems, setAddonItems] = useState({});
  const [confirmOOS, setConfirmOOS] = useState(null); // {addonId, addonName}
  const [opLoading, setOpLoading]   = useState({});

  useEffect(() => { setClientId(parentClientId); }, [parentClientId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBulkAddons(clientId);
      setAddons(res.addons || []);
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Failed to load addons', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [clientId, toast]);

  useEffect(() => { load(); }, [load]);

  const loadItems = useCallback(async (addonId) => {
    if (addonItems[addonId]) return;
    try {
      const res = await getBulkAddonItems(addonId, clientId);
      setAddonItems(p => ({ ...p, [addonId]: res.items || res.foods || [] }));
    } catch { setAddonItems(p => ({ ...p, [addonId]: [] })); }
  }, [addonItems, clientId]);

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadItems(id);
  };

  const applyAction = useCallback(async (addonId, action) => {
    const key = `${addonId}_${action}`;
    setOpLoading(p => ({ ...p, [key]: true }));
    try {
      const res = await applyBulkAddon(addonId, action, clientId);
      toast({ title: 'Done', description: res.message || 'Catalog status updated' });
      load();
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || 'Operation failed', variant: 'destructive' });
    } finally { setOpLoading(p => ({ ...p, [key]: false })); }
  }, [clientId, load, toast]);

  const toggleUP = useCallback(async (addonId, action, addonName) => {
    const key = `${addonId}_up_${action}`;
    setOpLoading(p => ({ ...p, [key]: true }));
    try {
      await toggleAddonStock(addonId, action, clientId);
      toast({ title: 'Done', description: `${addonName} ${action}d on UrbanPiper` });
      load();
    } catch (err) {
      // 404 + no_items = warning, not crash
      const code = err?.response?.data?.errors?.[0]?.code;
      if (code === 'no_items') {
        toast({ title: 'Not on UrbanPiper', description: `"${addonName}" has no items on this brand.` });
      } else {
        toast({ title: 'Error', description: err?.readableMessage || 'Operation failed', variant: 'destructive' });
      }
    } finally { setOpLoading(p => ({ ...p, [key]: false })); }
  }, [clientId, load, toast]);

  const btnStyle = (color) => ({
    fontSize: 11, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
    border: `1px solid ${color}20`, background: `${color}10`, color,
  });

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Warning banner — restaurant-wide impact */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                    background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span><strong>Catalog status</strong> changes apply to ALL brands restaurant-wide.
        <strong> UrbanPiper toggle</strong> is per-brand only.</span>
      </div>

      <BrandSelect subBrands={subBrands} activeClientId={clientId} onSelect={setClientId} />

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: COLORS.grayText, fontSize: 13 }}>Loading add-ons…</div>
      ) : addons.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: COLORS.grayText, fontSize: 13 }}>No add-ons found for this brand.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Add-on', 'Price', 'Catalog (all brands)', 'UrbanPiper (this brand)'].map(h => (
                <th key={h} style={{ background: '#f8fafc', padding: '8px 12px', textAlign: 'left',
                                      fontWeight: 600, color: '#475569', borderBottom: `2px solid ${COLORS.borderGray}`,
                                      fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {addons.map(a => (
              <React.Fragment key={a.id}>
                <tr style={{ borderBottom: `1px solid #f1f5f9` }}>
                  <td style={{ padding: '9px 12px' }}>
                    <button onClick={() => toggleExpand(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                               alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>
                      {expandedId === a.id
                        ? <ChevronDown className="w-3.5 h-3.5" />
                        : <ChevronRight className="w-3.5 h-3.5" />}
                      {a.name}
                    </button>
                  </td>
                  <td style={{ padding: '9px 12px', color: '#374151' }}>₹{a.price}</td>
                  <td style={{ padding: '9px 12px' }}>
                    {a.status === 1 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#16a34a', fontSize: 12 }}>● Available</span>
                        <button onClick={() => setConfirmOOS({ addonId: a.id, addonName: a.name })}
                          disabled={opLoading[`${a.id}_out_of_stock`]}
                          style={btnStyle('#dc2626')}>OOS</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#dc2626', fontSize: 12 }}>○ Out of Stock</span>
                        <button onClick={() => applyAction(a.id, 'enable')}
                          disabled={opLoading[`${a.id}_enable`]}
                          style={btnStyle('#16a34a')}>Enable</button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleUP(a.id, 'enable', a.name)}
                        disabled={opLoading[`${a.id}_up_enable`]}
                        style={btnStyle('#16a34a')}>Enable</button>
                      <button onClick={() => toggleUP(a.id, 'disable', a.name)}
                        disabled={opLoading[`${a.id}_up_disable`]}
                        style={btnStyle('#dc2626')}>Disable</button>
                    </div>
                  </td>
                </tr>
                {expandedId === a.id && (
                  <tr><td colSpan={4} style={{ padding: '8px 12px 12px 32px', background: '#f8fafc',
                                               borderBottom: `1px solid #f1f5f9` }}>
                    <span style={{ fontSize: 11, color: COLORS.grayText }}>Used in: </span>
                    {addonItems[a.id] === undefined
                      ? <span style={{ fontSize: 11, color: COLORS.grayText }}>Loading…</span>
                      : addonItems[a.id].length === 0
                        ? <span style={{ fontSize: 11, color: COLORS.grayText }}>No foods on this brand</span>
                        : addonItems[a.id].map((f, i) => (
                            <span key={f.id || i} style={{ fontSize: 11, color: '#374151' }}>
                              {i > 0 && ', '}{f.name}
                            </span>
                          ))}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* OOS confirm dialog */}
      {confirmOOS && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#0f172a' }}>Mark as Out of Stock?</h4>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Mark <strong>"{confirmOOS.addonName}"</strong> as Out of Stock?
            </p>
            <div style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: 7,
                          border: '1px solid #fde68a', fontSize: 12, color: '#92400e', marginBottom: 16 }}>
              ⚠ This changes catalog status for <strong>ALL brands</strong> restaurant-wide and cannot be limited to a single brand.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { applyAction(confirmOOS.addonId, 'out_of_stock'); setConfirmOOS(null); }}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none',
                         padding: '8px 0', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Confirm OOS
              </button>
              <button onClick={() => setConfirmOOS(null)}
                style={{ flex: 1, background: '#fff', color: '#374151', border: `1px solid ${COLORS.borderGray}`,
                         padding: '8px 0', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
