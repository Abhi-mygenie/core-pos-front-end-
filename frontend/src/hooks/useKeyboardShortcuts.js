// CR-482: central keyboard shortcut hook + helpers
// Attaches a single window-level keydown listener (capture phase) when enabled.
// When enabled=false, no listener is attached — zero runtime cost.

import { useEffect, useRef } from 'react';

/**
 * Returns true if the given element is a text-entry target
 * (input, textarea, select, or contentEditable).
 * Shortcut handlers should skip when this is true (except for
 * navigational keys like F2/F8/F9 explicitly allowed from search).
 */
export function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Returns true if any element with [data-kbd-modal] is in the DOM.
 * When a modal is open, most shortcut layers should be suppressed.
 */
export function isKbdModalOpen() {
  return !!document.querySelector('[data-kbd-modal]');
}

/**
 * Finds an element by CSS selector, checks it's visible and not disabled,
 * then clicks it. Returns true if clicked, false otherwise.
 * This prevents double-fire: if the button is already disabled (e.g.
 * isPlacingOrder sets disabled), click is a no-op.
 */
export function clickIfEnabled(selector) {
  const el = document.querySelector(selector);
  if (!el) return false;
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
  // Check visibility — offsetParent is null for hidden elements (display:none)
  if (el.offsetParent === null && el.style.display !== 'fixed') return false;
  el.click();
  return true;
}

/**
 * useKeyboardShortcuts(handler, { enabled })
 *
 * Attaches a keydown listener to window in the CAPTURE phase.
 * Capture phase fires before React's synthetic event delegation,
 * allowing us to preventDefault before React or the browser acts.
 *
 * @param {function} handler - (event: KeyboardEvent) => void
 * @param {object} options
 * @param {boolean} options.enabled - when false, listener is not attached
 */
export function useKeyboardShortcuts(handler, { enabled = false } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e) => {
      handlerRef.current(e);
    };

    window.addEventListener('keydown', onKeyDown, true); // capture phase // CR-482
    return () => {
      window.removeEventListener('keydown', onKeyDown, true); // CR-482
    };
  }, [enabled]);
}
