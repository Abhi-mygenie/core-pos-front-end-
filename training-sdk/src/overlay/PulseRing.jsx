// CR-053: PulseRing — Animated ring around spotlight target
// CR-053-UX-01: Accepts color prop (green for highlight/explore, amber for for_real)
import React, { useState, useEffect, useCallback } from 'react';

export function PulseRing({ targetSelector, color = '#329937' }) {
  const [rect, setRect] = useState(null);

  const updateRect = useCallback(() => {
    if (!targetSelector) { setRect(null); return; }
    const el = document.querySelector(targetSelector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    const padding = 12;
    setRect({
      top: r.top - padding,
      left: r.left - padding,
      width: r.width + padding * 2,
      height: r.height + padding * 2,
    });
  }, [targetSelector]);

  useEffect(() => {
    updateRect();
    const handler = () => requestAnimationFrame(updateRect);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    const interval = setInterval(updateRect, 500);  // CR-053-UX-01: handle dynamic DOM
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
      clearInterval(interval);
    };
  }, [updateRect]);

  if (!rect) return null;

  // Convert hex to rgb for shadow alpha
  const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '50,153,55';
  };
  const rgb = hexToRgb(color);

  return (
    <div data-testid="training-pulse-ring" style={{
      position: 'fixed',
      top: rect.top, left: rect.left,
      width: rect.width, height: rect.height,
      borderRadius: '12px',
      border: `2.5px solid ${color}`,
      boxShadow: `0 0 0 4px rgba(${rgb},0.25), 0 0 20px rgba(${rgb},0.15)`,
      animation: 'trainingPulse 2s ease-in-out infinite',
      pointerEvents: 'none',
      zIndex: 10002,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }} />
  );
}
