// CR-135: Aggregator Setup — page wrapper
import React from 'react';
import AggregatorSetupView from '../components/settings/aggregatorSetup/AggregatorSetupView';

export default function AggregatorSetupPage() {
  return (
    <div style={{ padding: '24px 28px', maxWidth: 920, margin: '0 auto' }}
      data-testid="aggregator-setup-page-wrapper">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
          Aggregator Setup
        </h1>
        <p style={{ fontSize: 12, color: '#666666', margin: '4px 0 0' }}>
          UrbanPiper configuration and aggregator order settings
        </p>
      </div>
      <AggregatorSetupView />
    </div>
  );
}
