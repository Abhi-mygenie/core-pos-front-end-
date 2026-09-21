// CR-141: Sync & Catalog tab — UrbanPiper store operations
import React, { useState } from 'react';
import { syncCatalog, clearCatalog, clearModifiers, forceSwiggyEnable } from '../../../api/services/aggregatorConfigService'; // CR-143
import { useToast } from '../../../hooks/use-toast';
import { COLORS } from '../../../constants';

// ── Reusable action card ──────────────────────────────────────────────────────
const ActionCard = ({ title, desc, danger, children }) => (
  <div style={{
    border: `1px solid ${danger ? '#fca5a5' : COLORS.borderGray}`,
    background: danger ? '#fff5f5' : '#fff',
    borderRadius: 10, padding: 16, marginBottom: 12,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16,
  }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: danger ? '#dc2626' : COLORS.darkText }}>{title}</div>
      <div style={{ fontSize: 11, color: danger ? '#b91c1c' : COLORS.grayText, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

// ── Action button ─────────────────────────────────────────────────────────────
const ActionBtn = ({ id, label, danger, onClick, disabled, loading }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    data-testid={`sync-btn-${id}`}
    style={{
      padding: '8px 18px', borderRadius: 7, fontSize: 12, fontWeight: 600,
      cursor: (disabled || loading) ? 'not-allowed' : 'pointer', border: 'none',
      background: danger ? '#dc2626' : COLORS.primaryGreen, color: '#fff',
      opacity: (disabled || loading) ? .6 : 1, whiteSpace: 'nowrap',
    }}
  >
    {loading ? '…' : label}
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function SyncCatalogTab({ activeClientId, subBrands }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState({});          // { sync | clearStore | clearMod | fullReset }
  const [resetInput, setResetInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const brandLabel = activeClientId
    ? (subBrands.find(b => b.id === activeClientId)?.name || `Client ${activeClientId}`)
    : 'Main Brand';

  const run = async (key, fn, successMsg) => {  // CR-143: successMsg can be string or fn(data)=>string
    setLoading(p => ({ ...p, [key]: true }));
    try {
      const data = await fn();
      const msg = typeof successMsg === 'function' ? successMsg(data) : successMsg;
      toast({ title: 'Done', description: msg });
    } catch (err) {
      toast({ title: 'Error', description: err?.readableMessage || err?.message || 'Operation failed', variant: 'destructive' });
    } finally {
      setLoading(p => ({ ...p, [key]: false }));
    }
  };

  return (
    <div style={{ maxWidth: 620 }}>

      {/* Brand context */}
      <div style={{ fontSize: 12, color: COLORS.grayText, marginBottom: 20 }}>
        Selected brand: <strong style={{ color: COLORS.darkText }}>{brandLabel}</strong>
      </div>

      {/* Sync Catalog */}
      <ActionCard
        title="Sync Menu to UrbanPiper"
        desc={`Pushes ${brandLabel}'s full menu to Swiggy & Zomato. This is asynchronous — the store pass fires a few seconds after the response.`}
      >
        <ActionBtn id="sync" label="Sync Catalog →" loading={loading.sync}
          onClick={() => run('sync',
            () => syncCatalog(activeClientId),
            'Sync queued — store pass in progress'
          )}
        />
      </ActionCard>

      {/* CR-143 GAP-G: Force-enable all active Swiggy items */}
      <ActionCard
        title="Force Enable All Items on Swiggy"
        desc={`Re-enables all currently-active Swiggy items for ${brandLabel} on UrbanPiper. Use after a store outage or reset.`}
      >
        <ActionBtn id="forceSwiggy" label="Force Enable Swiggy →" loading={loading.forceSwiggy}
          onClick={() => run(
            'forceSwiggy',
            () => forceSwiggyEnable(activeClientId),
            (data) => `${data?.data?.total_items ?? 'All'} items enabled on Swiggy`
          )}
        />
      </ActionCard>

      {/* Clear Store Catalog */}
      <ActionCard
        title="Clear Store Catalog"
        desc={`Removes ${brandLabel}'s items from UrbanPiper. Other brands are not affected. (full_master_reset: false)`}
      >
        <ActionBtn id="clearStore" label="Clear Store →" loading={loading.clearStore}
          onClick={() => {
            if (!window.confirm(`Clear ${brandLabel}'s store catalog from UrbanPiper?\n\nThis removes items for this brand only. Other brands stay.`)) return;
            run('clearStore',
              () => clearCatalog(activeClientId, false),
              `${brandLabel} store catalog cleared`
            );
          }}
        />
      </ActionCard>

      {/* Clear Modifiers */}
      <ActionCard
        title="Clear Modifiers"
        desc={`Removes option/modifier groups for ${brandLabel}'s store. Does not affect the other brand's modifiers.`}
      >
        <ActionBtn id="clearMod" label="Clear Modifiers →" loading={loading.clearMod}
          onClick={() => {
            if (!window.confirm(`Clear modifier groups for ${brandLabel}?`)) return;
            run('clearMod',
              () => clearModifiers(activeClientId),
              `${brandLabel} modifiers cleared`
            );
          }}
        />
      </ActionCard>

      {/* Full Master Reset — DANGER */}
      <ActionCard
        title="⛔ Full Master Reset"
        desc="DANGER: Wipes the shared master catalog for ALL brands on UrbanPiper. Use only when instructed by support. Cannot be undone."
        danger
      >
        {!showResetConfirm ? (
          <ActionBtn id="fullResetTrigger" label="Full Reset ⛔" danger
            onClick={() => setShowResetConfirm(true)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
            <div style={{ fontSize: 11, color: '#7f1d1d', fontWeight: 600 }}>Type RESET to confirm:</div>
            <input
              value={resetInput}
              onChange={e => setResetInput(e.target.value)}
              placeholder="RESET"
              data-testid="reset-confirm-input"
              style={{
                padding: '6px 8px', border: '1px solid #fca5a5', borderRadius: 6,
                fontSize: 12, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { setShowResetConfirm(false); setResetInput(''); }}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 6,
                  border: `1px solid ${COLORS.borderGray}`, fontSize: 11,
                  cursor: 'pointer', background: '#fff', color: COLORS.grayText,
                }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (resetInput !== 'RESET') return;
                  run('fullReset',
                    () => clearCatalog(null, true),
                    'Full master reset complete — all brand catalogs cleared'
                  );
                  setShowResetConfirm(false);
                  setResetInput('');
                }}
                disabled={resetInput !== 'RESET' || loading.fullReset}
                data-testid="reset-confirm-btn"
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: '#dc2626', color: '#fff',
                  opacity: (resetInput !== 'RESET' || loading.fullReset) ? .4 : 1,
                }}
              >{loading.fullReset ? '…' : 'Confirm'}</button>
            </div>
          </div>
        )}
      </ActionCard>

    </div>
  );
}
