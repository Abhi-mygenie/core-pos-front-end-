// CR-053: StepValidator — Watches POS DOM for correct user actions
import { useEffect, useRef } from 'react';

const validators = {
  url_contains: (value) => {
    return window.location.href.includes(value);
  },

  element_visible: (value) => {
    const el = document.querySelector(value);
    return el && el.offsetParent !== null;
  },

  click_target: (value, onValidated) => {
    // Returns a cleanup function — async validation via event listener
    const handler = (e) => {
      const target = document.querySelector(value);
      if (target && (target === e.target || target.contains(e.target))) {
        document.removeEventListener('click', handler, true);
        onValidated();
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  },

  input_not_empty: (value) => {
    const el = document.querySelector(value);
    return el && el.value && el.value.trim().length > 0;
  },

  toast_appeared: (value) => {
    const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"]');
    for (const toast of toasts) {
      if (toast.textContent.toLowerCase().includes(value.toLowerCase())) {
        return true;
      }
    }
    return false;
  },

  wait_seconds: () => {
    // Handled by auto_advance_seconds in tooltip — always true
    return true;
  },
};

export function useStepValidation(step, missionState, onStepValidated) {
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!step || missionState !== 'step_active') return;

    const { validate } = step;
    if (!validate) return;

    const { type, value } = validate;

    // Clean up previous validator
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // click_target is event-based (async)
    if (type === 'click_target') {
      cleanupRef.current = validators.click_target(value, onStepValidated);
      return () => {
        if (cleanupRef.current) cleanupRef.current();
      };
    }

    // wait_seconds — handled by auto_advance in tooltip
    if (type === 'wait_seconds') return;

    // All other validators — poll every 500ms
    const interval = setInterval(() => {
      const fn = validators[type];
      if (fn && fn(value)) {
        clearInterval(interval);
        onStepValidated();
      }
    }, 500);

    // Also check after a short delay (allows React to settle after state change)
    const immediateCheck = setTimeout(() => {
      const fn = validators[type];
      if (fn && fn(value)) {
        clearInterval(interval);
        onStepValidated();
      }
    }, 600);

    return () => {
      clearInterval(interval);
      clearTimeout(immediateCheck);
    };
  }, [step, missionState, onStepValidated]);
}
