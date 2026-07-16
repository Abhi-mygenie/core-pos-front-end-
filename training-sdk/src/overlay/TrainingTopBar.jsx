// CR-053: TrainingTopBar — Header bar during mission execution
// CR-053-UX-01: Added "I'm stuck" button
import React from 'react';

export function TrainingTopBar({ courseName, missionTitle, stepIndex, totalSteps, onExit, onUserSaysStuck }) {
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div data-testid="training-top-bar" style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: '48px',
      backgroundColor: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #E5E5E5',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', zIndex: 10006,
      fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '8px',
        backgroundColor: '#329937', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginRight: '12px', flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/>
        </svg>
      </div>

      {/* Course > Mission */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {courseName} <span style={{ color: '#E5E5E5', margin: '0 6px' }}>/</span>
          <span style={{ fontWeight: 500, color: '#666666' }}>{missionTitle}</span>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '16px' }}>
        <div style={{ width: '120px', height: '4px', backgroundColor: '#E5E5E5', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%', backgroundColor: '#329937',
            borderRadius: '2px', transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ fontSize: '12px', color: '#666666', fontWeight: 500, minWidth: '32px' }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* CR-053-UX-01: I'm stuck button */}
      <button
        data-testid="training-stuck-btn"
        onClick={onUserSaysStuck}
        style={{
          marginLeft: '12px', padding: '6px 12px', borderRadius: '8px',
          backgroundColor: 'rgba(244,161,26,0.10)', border: '1px solid rgba(244,161,26,0.35)',
          color: '#B5751F', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(244,161,26,0.20)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(244,161,26,0.10)'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        I'm stuck
      </button>

      {/* Exit */}
      <button
        data-testid="training-exit-btn"
        onClick={onExit}
        style={{
          marginLeft: '8px', padding: '6px 12px', borderRadius: '8px',
          backgroundColor: 'transparent', border: '1px solid #E5E5E5',
          color: '#666666', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'all 0.2s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        Exit
      </button>
    </div>
  );
}
