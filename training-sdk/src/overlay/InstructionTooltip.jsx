// CR-053: InstructionTooltip — Floating instruction card with smart positioning
// CR-053-UX-01: Renders step-type badge (Highlight / Explore / Read-only) above instruction
import React, { useState, useEffect, useRef, useCallback } from 'react';

function calculatePosition(targetSelector, tooltipEl) {
  if (!targetSelector || !tooltipEl) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', placement: 'center' };
  const target = document.querySelector(targetSelector);
  if (!target) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', placement: 'center' };

  const tr = target.getBoundingClientRect();
  const tt = tooltipEl.getBoundingClientRect();
  const gap = 20;
  const vp = { w: window.innerWidth, h: window.innerHeight };
  const pad = 16;

  const rightX = tr.left + tr.width + gap;
  if (rightX + tt.width < vp.w - pad) {
    const topY = Math.max(pad + 80, Math.min(tr.top + tr.height / 2 - tt.height / 2, vp.h - tt.height - pad));
    return { top: topY + 'px', left: rightX + 'px', placement: 'right' };
  }
  const bottomY = tr.top + tr.height + gap;
  if (bottomY + tt.height < vp.h - pad) {
    const leftX = Math.max(pad, Math.min(tr.left + tr.width / 2 - tt.width / 2, vp.w - tt.width - pad));
    return { top: bottomY + 'px', left: leftX + 'px', placement: 'bottom' };
  }
  const leftX = tr.left - tt.width - gap;
  if (leftX > pad) {
    const topY = Math.max(pad + 80, Math.min(tr.top + tr.height / 2 - tt.height / 2, vp.h - tt.height - pad));
    return { top: topY + 'px', left: leftX + 'px', placement: 'left' };
  }
  const topY = tr.top - tt.height - gap;
  if (topY > pad + 80) {
    const lx = Math.max(pad, Math.min(tr.left + tr.width / 2 - tt.width / 2, vp.w - tt.width - pad));
    return { top: topY + 'px', left: lx + 'px', placement: 'top' };
  }
  return { top: (tr.top + tr.height + gap) + 'px', left: pad + 'px', placement: 'bottom' };
}

// CR-053-UX-01: step-type badge definition
const STEP_TYPE_BADGE = {
  highlight: { label: 'Look here', icon: '👀', color: '#329937', bg: 'rgba(50,153,55,0.10)' },
  explore:   { label: 'Try it',    icon: '👆', color: '#F26B33', bg: 'rgba(242,107,51,0.10)' },
  for_real:  { label: 'Read only — don\'t click', icon: '📖', color: '#B5751F', bg: 'rgba(244,161,26,0.12)' },
};

export function InstructionTooltip({ step, stepIndex, totalSteps, onNext, onSkip, autoAdvanceSeconds, missionState, stepType }) {
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  const [showHint, setShowHint] = useState(false);
  const [countdown, setCountdown] = useState(autoAdvanceSeconds || 0);
  const [entered, setEntered] = useState(false);

  const reposition = useCallback(() => {
    if (tooltipRef.current && step) {
      const p = calculatePosition(step.target, tooltipRef.current);
      setPos(p);
    }
  }, [step]);

  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, [stepIndex]);

  useEffect(() => {
    reposition();
    const handler = () => requestAnimationFrame(reposition);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    const interval = setInterval(reposition, 500);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
      clearInterval(interval);
    };
  }, [reposition]);

  // Auto-advance countdown
  useEffect(() => {
    if (!autoAdvanceSeconds || missionState !== 'step_active') return;
    setCountdown(autoAdvanceSeconds);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoAdvanceSeconds, stepIndex, missionState, onNext]);

  if (!step) return null;

  const badge = STEP_TYPE_BADGE[stepType || step.step_type || 'highlight'];
  const isExploreClick = (stepType || step.step_type) === 'explore';

  return (
    <div
      ref={tooltipRef}
      data-testid="training-tooltip"
      style={{
        position: 'fixed',
        top: pos.top, left: pos.left, transform: pos.transform || undefined,
        zIndex: 10005, pointerEvents: 'auto',
        width: '360px', maxWidth: 'calc(100vw - 32px)',
        background: '#FFFFFF', borderRadius: '16px',
        border: '1px solid #E5E5E5',
        boxShadow: '0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
        padding: '22px',
        fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
        opacity: entered ? 1 : 0,
        transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* CR-053-UX-01: step-type badge + counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          fontSize: '10.5px', fontWeight: 700, color: badge.color, backgroundColor: badge.bg,
          padding: '3px 9px', borderRadius: '20px', letterSpacing: '0.04em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          <span>{badge.icon}</span> {badge.label}
        </span>
        <span style={{ fontSize: '11px', color: '#999999', fontWeight: 500 }}>
          Step {stepIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Instruction */}
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4, marginBottom: step.detail ? '8px' : '16px' }}>
        {step.instruction}
      </div>

      {/* Detail */}
      {step.detail && (
        <div style={{ fontSize: '13px', color: '#666666', lineHeight: 1.5, marginBottom: '16px' }}>
          {step.detail}
        </div>
      )}

      {/* Hint (expandable) */}
      {step.hint && !showHint && (
        <button
          data-testid="training-show-hint"
          onClick={() => setShowHint(true)}
          style={{
            background: 'none', border: 'none', color: '#329937', fontSize: '12px',
            fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: '12px',
            fontFamily: 'inherit',
          }}
        >
          Need a hint?
        </button>
      )}
      {step.hint && showHint && (
        <div style={{
          fontSize: '12px', color: '#329937', background: 'rgba(50,153,55,0.06)',
          borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', lineHeight: 1.4,
        }}>
          {step.hint}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {autoAdvanceSeconds ? (
          <button
            data-testid="training-got-it-btn"
            onClick={onNext}
            style={{
              flex: 1, padding: '10px 20px', borderRadius: '10px',
              backgroundColor: '#329937', color: '#FFFFFF', border: 'none',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background-color 0.2s',
            }}
          >
            Got it {countdown > 0 ? `(${countdown}s)` : ''}
          </button>
        ) : isExploreClick ? (
          <div style={{ flex: 1, fontSize: '12px', color: '#F26B33', fontWeight: 600 }}>
            ⟶ Click the highlighted element to continue
          </div>
        ) : (
          <div style={{ flex: 1, fontSize: '12px', color: '#666666' }}>
            Perform the action above
          </div>
        )}

        <button
          data-testid="training-skip-step-btn"
          onClick={onSkip}
          style={{
            padding: '10px 16px', borderRadius: '10px',
            backgroundColor: 'transparent', color: '#666666', border: '1px solid #E5E5E5',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{
            width: i === stepIndex ? '20px' : '6px',
            height: '6px', borderRadius: '3px',
            backgroundColor: i <= stepIndex ? '#329937' : '#E5E5E5',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}
