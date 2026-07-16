// CR-053: Training SDK — Bootstrap entry point
// Creates its own React root, completely separate from POS
import React from 'react';
import { createRoot } from 'react-dom/client';
import TrainingApp from './TrainingApp';
import './styles/training.css';

(function initTrainingSDK() {
  console.log('[Training SDK] Initializing...');
  // Wait for DOM to be ready
  const mount = () => {
    try {
      let container = document.getElementById('training-root');
      if (!container) {
        container = document.createElement('div');
        container.id = 'training-root';
        document.body.appendChild(container);
      }
      console.log('[Training SDK] Mounting to #training-root');
      const root = createRoot(container);
      root.render(React.createElement(TrainingApp));
      console.log('[Training SDK] Mounted successfully');
    } catch (e) {
      console.error('[Training SDK] Mount error:', e);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
