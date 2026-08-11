// CR-135: Aggregator Setup — container component
import React, { useState, useEffect, useCallback } from 'react';
import { getBrands, getConfig } from '../../../api/services/aggregatorConfigService';
import { aggregatorConfigTransform } from '../../../api/transforms/aggregatorConfigTransform';
import ConfigTab from './ConfigTab';
import OperationalTab from './OperationalTab';
import { COLORS } from '../../../constants';

export default function AggregatorSetupView() {
  const [activeTab,      setActiveTab]      = useState('config');
  const [subBrands,      setSubBrands]      = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);   // null = main brand
  const [configState,    setConfigState]    = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [dirty,          setDirty]          = useState(false);

  // Load sub-brands on mount
  useEffect(() => {
    getBrands()
      .then(res => setSubBrands(aggregatorConfigTransform.fromAPI.brands(res)))
      .catch(() => setSubBrands([]));
  }, []);

  // Load config when active brand changes
  const loadConfig = useCallback((clientId) => {
    setLoading(true);
    setError(null);
    getConfig(clientId)
      .then(res => {
        setConfigState(aggregatorConfigTransform.fromAPI.config(res));
        setDirty(false);
      })
      .catch(err => setError(err?.message || 'Failed to load configuration'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConfig(activeClientId); }, [activeClientId, loadConfig]);

  const handleBrandChange = (clientId) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch brand anyway?')) return;
    setActiveClientId(clientId);
  };

  const handleBrandCreated = (newBrand) => {
    setSubBrands(prev => [...prev, { id: newBrand.id, name: newBrand.name }]);
    setActiveClientId(newBrand.id);  // triggers config load for new (empty) brand
  };

  const tabStyle = (id) => ({
    padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    color: activeTab === id ? COLORS.primaryOrange : COLORS.grayText,
    borderBottom: activeTab === id ? `2px solid ${COLORS.primaryOrange}` : '2px solid transparent',
    marginBottom: -1,
  });

  return (
    <div data-testid="aggregator-setup-view">
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.borderGray}`, marginBottom: 20 }}>
        <button data-testid="tab-config"      style={tabStyle('config')}      onClick={() => setActiveTab('config')}>Configuration</button>
        <button data-testid="tab-operational" style={tabStyle('operational')} onClick={() => setActiveTab('operational')}>Operational Settings</button>
      </div>

      {activeTab === 'config' && (
        <>
          {loading && (
            <div data-testid="config-loading" style={{ padding: 24, textAlign: 'center', color: COLORS.grayText }}>
              Loading configuration…
            </div>
          )}
          {error && (
            <div data-testid="config-error"
              style={{ background: '#FEE2E2', border: '1px solid #EF444430', borderRadius: 8, padding: '12px 16px', color: '#DC2626', fontSize: 13 }}>
              {error}
            </div>
          )}
          {!loading && !error && configState && (
            <ConfigTab
              configState={configState}
              setConfigState={setConfigState}
              subBrands={subBrands}
              activeClientId={activeClientId}
              onBrandChange={handleBrandChange}
              onBrandCreated={handleBrandCreated}
              onConfigSaved={() => { setDirty(false); loadConfig(activeClientId); }}
              onDirty={() => setDirty(true)}
              saving={saving}
              setSaving={setSaving}
            />
          )}
        </>
      )}

      {activeTab === 'operational' && <OperationalTab />}
    </div>
  );
}
