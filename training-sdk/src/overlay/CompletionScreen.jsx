// CR-053: CompletionScreen — Mission complete celebration
// CR-053-UX-01: Adds dismissable "Now try it" checklist + explicit Back to Training button
import React, { useState, useEffect } from 'react';

const CHECKLIST_DISMISSED_KEY = 'training_now_try_it_dismissed';

export function CompletionScreen({ mission, course, onFinish }) {
  const [hideChecklist, setHideChecklist] = useState(false);

  useEffect(() => {
    try {
      setHideChecklist(localStorage.getItem(CHECKLIST_DISMISSED_KEY) === '1');
    } catch (_) {}
  }, []);

  const onDismissChecklist = () => {
    try { localStorage.setItem(CHECKLIST_DISMISSED_KEY, '1'); } catch (_) {}
    setHideChecklist(true);
  };

  const tryItItems = mission?.now_try_it || [];
  const showChecklist = !hideChecklist && tryItItems.length > 0;

  return (
    <div data-testid="training-completion" style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(9,9,11,0.7)',
      backdropFilter: 'blur(4px)',
      fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '24px',
        padding: '40px 36px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
        maxWidth: '460px', width: '100%',
        maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
        animation: 'trainingSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Success icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          backgroundColor: 'rgba(50,153,55,0.10)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#329937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A', marginBottom: '6px', textAlign: 'center' }}>
          Mission Complete!
        </h2>

        <p style={{ fontSize: '14px', color: '#666666', marginBottom: '24px', lineHeight: 1.5, textAlign: 'center' }}>
          You've toured <strong>"{mission?.title || ''}"</strong>.
        </p>

        {/* CR-053-UX-01: dismissable "Now try it" checklist */}
        {showChecklist && (
          <div data-testid="training-now-try-it" style={{
            backgroundColor: '#FFF8EB', border: '1px solid rgba(244,161,26,0.30)',
            borderRadius: '14px', padding: '18px 18px 14px', marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#B5751F', letterSpacing: '0.03em' }}>
                ☑ NOW TRY IT
              </div>
              <button
                data-testid="training-dismiss-checklist"
                onClick={onDismissChecklist}
                title="Hide this checklist for future missions"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#B5751F', fontSize: '11px', fontWeight: 500,
                  fontFamily: 'inherit', padding: '2px 4px',
                }}
              >
                Don't show again
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#7A5818', marginBottom: '10px', lineHeight: 1.4 }}>
              Practice on your own time. We won't track these.
            </div>
            <ul style={{ margin: 0, paddingLeft: '4px', listStyle: 'none' }}>
              {tryItItems.map((item, i) => (
                <li key={i} style={{
                  fontSize: '13px', color: '#1A1A1A', lineHeight: 1.5,
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '4px 0',
                }}>
                  <span style={{ color: '#F4A11A', fontWeight: 700, flexShrink: 0 }}>☐</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            data-testid="training-finish-btn"
            onClick={onFinish}
            style={{
              padding: '13px 28px', borderRadius: '12px',
              backgroundColor: '#329937', color: '#FFFFFF', border: 'none',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            Back to mission list
          </button>
        </div>
      </div>
    </div>
  );
}
