// CR-053: TrainingLauncher — Floating button to open training
import React, { useState } from 'react';
import { useTraining } from '../TrainingProvider';

export function TrainingLauncher() {
  const { view, openHome, openStaffDashboard, close, employee } = useTraining();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasToken, setHasToken] = useState(!!localStorage.getItem('auth_token'));

  // Poll for auth token (user may log in after SDK loads)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('auth_token');
      setHasToken(!!token);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Don't show launcher during active mission
  const { missionState } = useTraining();
  if (missionState !== 'idle') return null;

  // Don't show when a dashboard is open
  if (view !== 'closed') return null;

  // Check if auth token exists (only show launcher when logged in)
  if (!hasToken) return null;

  return (
    <div data-testid="training-launcher" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9998 }}>
      {/* Menu popup */}
      {menuOpen && (
        <div data-testid="training-launcher-menu" style={{
          position: 'absolute', bottom: '60px', right: 0,
          backgroundColor: '#FFFFFF', borderRadius: '12px',
          border: '1px solid #E5E5E5', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          padding: '8px', width: '200px',
          fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
          animation: 'trainingSlideUp 0.2s ease',
        }}>
          <button
            data-testid="training-open-home"
            onClick={() => { setMenuOpen(false); openHome(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, color: '#1A1A1A',
              fontFamily: 'inherit', textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F7F7F7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#329937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/>
            </svg>
            My Training
          </button>
          <button
            data-testid="training-open-staff"
            onClick={() => { setMenuOpen(false); openStaffDashboard(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, color: '#1A1A1A',
              fontFamily: 'inherit', textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F7F7F7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F26B33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Staff Training
          </button>
        </div>
      )}

      {/* Floating action button */}
      <button
        data-testid="training-fab"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          width: '52px', height: '52px', borderRadius: '16px',
          backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid #E5E5E5',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#329937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/>
        </svg>
      </button>
    </div>
  );
}
