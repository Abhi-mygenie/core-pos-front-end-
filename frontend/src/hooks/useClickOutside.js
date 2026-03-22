import { useEffect } from "react";

/**
 * Custom hook to detect clicks outside of a referenced element
 * @param {React.RefObject} ref - Reference to the element to monitor
 * @param {Function} handler - Callback function when click outside is detected
 * @param {boolean} enabled - Whether the hook is active (default: true)
 */
const useClickOutside = (ref, handler, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, handler, enabled]);
};

export default useClickOutside;
