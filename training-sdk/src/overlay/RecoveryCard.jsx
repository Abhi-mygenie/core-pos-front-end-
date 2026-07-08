// CR-053-UX-01: RecoveryCard — shown when target absent or user clicks "I'm stuck"
import React from 'react';

export function RecoveryCard({ step, onTakeMeToMenu, onDismiss, onSkipStep, onEndMission }) {
  const stepLabel = step?.instruction || 'this step';
  return (
    <div data-testid="training-recovery-card" style={{
      position: 'fixed', inset: 0, zIndex: 10011,
      backgroundColor: 'rgba(9,9,11,0.55)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '32px',
        maxWidth: '440px', width: '90vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        animation: 'trainingSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          backgroundColor: 'rgba(244,161,26,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F4A11A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>
          Looks like we're not on the right screen
        </h3>
        <p style={{ fontSize: '14px', color: '#666666', lineHeight: 1.5, marginBottom: '8px' }}>
          For this step, we expected to find:
        </p>
        <p style={{
          fontSize: '13px', color: '#1A1A1A', backgroundColor: '#F7F7F7',
          borderRadius: '10px', padding: '12px 14px', marginBottom: '24px',
          fontStyle: 'italic',
        }}>
          "{stepLabel}"
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            data-testid="recovery-go-menu"
            onClick={onTakeMeToMenu}
            style={{
              padding: '12px 20px', borderRadius: '10px',
              backgroundColor: '#329937', color: '#FFFFFF', border: 'none',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Take me to Menu Management
          </button>
          <button
            data-testid="recovery-dismiss"
            onClick={onDismiss}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              backgroundColor: 'transparent', color: '#666666', border: '1px solid #E5E5E5',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Let me look around first
          </button>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              data-testid="recovery-skip-step"
              onClick={onSkipStep}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px',
                backgroundColor: 'transparent', color: '#999999', border: 'none',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Skip this step
            </button>
            <button
              data-testid="recovery-end-mission"
              onClick={onEndMission}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px',
                backgroundColor: 'transparent', color: '#999999', border: 'none',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              End mission
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
