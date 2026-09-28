// CR-140 GAP-5: Per-row aggregator stock toggle with timing picker
import { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../../constants';
import { useToast } from '../../../hooks/use-toast';
import * as menuService from '../../../api/services/menuManagementService';

const PRESETS = [
  { label: 'Indefinitely', value: null },
  { label: '30 minutes',   value: '30m' },
  { label: '1 hour',       value: '1h' },
  { label: '2 hours',      value: '2h' },
  { label: '6 hours',      value: '6h' },
  { label: '12 hours',     value: '12h' },
  { label: '1 day',        value: '1d' },
  { label: '7 days',       value: '7d' },
];

const formatTurnOnAt = (iso) => {
  if (!iso) return '';
  try {
    // G3: treat 'YYYY-MM-DD HH:MM:SS' (foods-list, no TZ) as IST (+05:30)
    const str = iso.includes('T') ? iso : iso.replace(' ', 'T') + '+05:30';
    const d = new Date(str);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return iso; }
};

const AggregatorStockToggle = ({ product, onToggleDone }) => {
  const { toast } = useToast();
  const [open, setOpen]         = useState(false);
  const [mode, setMode]         = useState(null);       // null = indefinite
  const [customDt, setCustomDt] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef(null);

  const isLive = product.isActive !== false; // G4: status-dependent (api.status===1), not food_stock (async)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDisable = async () => {
    if (showCustom && !customDt) return;
    setLoading(true);
    try {
      const payload = {
        action: 'disable',
        item_ids: [product.productId],
        ...(product.clientId ? { client_id: product.clientId } : {}),
        ...(showCustom
          ? { turn_on_at: new Date(customDt).getTime() }
          : mode ? { turn_on_preset: mode } : {}),
      };
      const res = await menuService.aggregatorStockToggle(payload); // G1: capture response
      const item = res?.data?.items?.[0]; // G1: extract {id, status, turn_on_at} only
      const modeLabel = showCustom ? 'custom time' : (PRESETS.find(p => p.value === mode)?.label || 'indefinitely');
      toast({ title: 'Disabled', description: `"${product.productName}" disabled ${mode || showCustom ? `for ${modeLabel}` : 'indefinitely'}` });
      setOpen(false);
      if (onToggleDone) onToggleDone(item); // G1: pass item for optimistic update
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Toggle failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await menuService.aggregatorStockToggle({ // G1: capture response
        action: 'enable',
        item_ids: [product.productId],
        ...(product.clientId ? { client_id: product.clientId } : {}),
      });
      const item = res?.data?.items?.[0]; // G1: extract {id, status, turn_on_at} only
      toast({ title: 'Enabled', description: `"${product.productName}" is live on Swiggy/Zomato` });
      setOpen(false);
      if (onToggleDone) onToggleDone(item); // G1: pass item for optimistic update
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Toggle failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        data-testid={`stock-toggle-${product.productId}`}
        style={{
          padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          background: isLive ? 'rgba(22,163,74,.1)' : 'rgba(245,158,11,.1)',
          color: isLive ? '#15803d' : '#92400e',
          border: `1px solid ${isLive ? 'rgba(22,163,74,.25)' : 'rgba(245,158,11,.3)'}`,
          opacity: loading ? .6 : 1,
          transition: 'opacity .15s',
        }}
      >
        {loading ? '…' : isLive ? '● Live ▾' : '○ Offline ▾'}
      </button>

      {/* Disable popover */}
      {open && isLive && (
        <div style={{
          position: 'absolute', right: 0, top: 28, zIndex: 1000,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: 14, width: 215, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
            Disable on UrbanPiper
          </div>
          {PRESETS.map(p => (
            <label
              key={p.value ?? 'indef'}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12, color: '#334155' }}
            >
              <input
                type="radio"
                name={`stock-mode-${product.productId}`}
                checked={mode === p.value && !showCustom}
                onChange={() => { setMode(p.value); setShowCustom(false); }}
                style={{ accentColor: COLORS.primaryOrange }}
              />
              {p.label}
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12, color: '#334155' }}>
            <input
              type="radio"
              name={`stock-mode-${product.productId}`}
              checked={showCustom}
              onChange={() => { setShowCustom(true); setMode(null); }}
              style={{ accentColor: COLORS.primaryOrange }}
            />
            Custom date/time →
          </label>
          {showCustom && (
            <input
              type="datetime-local"
              value={customDt}
              onChange={e => setCustomDt(e.target.value)}
              style={{
                width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0',
                borderRadius: 6, fontSize: 11, marginTop: 6, boxSizing: 'border-box',
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setOpen(false)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer', background: '#fff', color: '#64748b' }}
            >Cancel</button>
            <button
              onClick={handleDisable}
              disabled={loading || (showCustom && !customDt)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', fontSize: 11,
                fontWeight: 600, cursor: 'pointer', background: '#dc2626', color: '#fff',
                opacity: (loading || (showCustom && !customDt)) ? .5 : 1,
              }}
            >
              {loading ? '…' : 'Disable'}
            </button>
          </div>
        </div>
      )}

      {/* Enable popover */}
      {open && !isLive && (
        <div style={{
          position: 'absolute', right: 0, top: 28, zIndex: 1000,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: 14, width: 200, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            Item is offline
          </div>
          {product.turnOnAt && (
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
              Back at: {formatTurnOnAt(product.turnOnAt)}
            </div>
          )}
          <button
            onClick={handleEnable}
            disabled={loading}
            data-testid={`stock-enable-${product.productId}`}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 7, border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: COLORS.primaryGreen, color: '#fff',
              opacity: loading ? .6 : 1,
            }}
          >
            {loading ? '…' : 'Enable Now'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AggregatorStockToggle;
