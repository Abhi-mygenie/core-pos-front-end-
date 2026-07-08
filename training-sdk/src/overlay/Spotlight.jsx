// CR-053: Spotlight — Fixed click-through using clip-path approach
import React, { useState, useEffect, useCallback } from 'react';

export function Spotlight({ targetSelector, children }) {
  const [rect, setRect] = useState(null);

  const updateRect = useCallback(() => {
    if (!targetSelector) { setRect(null); return; }
    const el = document.querySelector(targetSelector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    const padding = 10;
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
    const observer = new MutationObserver(handler);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
      observer.disconnect();
    };
  }, [updateRect]);

  // Auto-scroll target into view
  useEffect(() => {
    if (!targetSelector) return;
    const el = document.querySelector(targetSelector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetSelector]);

  if (!rect) {
    // No target — full dark backdrop (centered content)
    return (
      <div data-testid="training-backdrop" style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(9,9,11,0.6)',
        backdropFilter: 'blur(2px)',
      }}>
        {children}
      </div>
    );
  }

  // Use clip-path polygon to create a hole in the overlay
  // The overlay covers the entire screen EXCEPT the spotlight rectangle
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { top, left, width, height } = rect;
  const r = left + width;
  const b = top + height;

  // Clip-path: outer rectangle (full viewport) with inner rectangle cut out
  const clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${left}px ${top}px, ${left}px ${b}px, ${r}px ${b}px, ${r}px ${top}px, ${left}px ${top}px
  )`;

  return (
    <>
      {/* Dark overlay with clip-path hole — blocks clicks outside spotlight */}
      <div data-testid="training-backdrop" style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(9,9,11,0.6)',
        clipPath: clipPath,
        WebkitClipPath: clipPath,
        transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />

      {/* Children (tooltip etc) — pointer-events only on the tooltip itself */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 10003, pointerEvents: 'none' }}>
        {children}
      </div>
    </>
  );
}
