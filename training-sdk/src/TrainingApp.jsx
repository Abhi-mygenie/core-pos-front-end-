// CR-053: Training SDK — Root component with error boundary
import React from 'react';
import { TrainingProvider } from './TrainingProvider';
import { TrainingLauncher } from './dashboards/TrainingLauncher';
import { MissionExecutor } from './overlay/MissionExecutor';
import { TrainingHome } from './dashboards/TrainingHome';
import { StaffDashboard } from './dashboards/StaffDashboard';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[Training SDK] Error:', error, info);
  }
  render() {
    if (this.state.hasError) return null; // SDK fails silently — POS unaffected
    return this.props.children;
  }
}

export default function TrainingApp() {
  return (
    <ErrorBoundary>
      <TrainingProvider>
        <TrainingLauncher />
        <MissionExecutor />
        <TrainingHome />
        <StaffDashboard />
      </TrainingProvider>
    </ErrorBoundary>
  );
}
