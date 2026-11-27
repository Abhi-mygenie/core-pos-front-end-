/**
 * CR-170: Conditional grand total round-off helper.
 *
 * Rule (owner-confirmed 2026-08-20, replaces BUG-051/BUG-076 always-ceil):
 *   - enabled = false : return raw 2-decimal (no rounding)
 *   - paise = 0       : no change  (₹100.00 → ₹100)
 *   - paise < 10      : Math.floor (₹100.04 → ₹100, round_up = −₹0.04)
 *   - paise ≥ 10      : Math.ceil  (₹100.10 → ₹101, round_up = +₹0.90)
 *
 * Uses integer-paise comparison (Math.round((rawTotal % 1) * 100)) to avoid
 * floating-point drift — e.g. 100.10 % 1 = 0.09999... in JS, which would
 * incorrectly floor. Rounding to integer paise gives clean 10.
 *
 * Replaces inline Math.ceil at:
 *   orderTransform.js:869
 *   CollectPaymentPanel.jsx:679
 *   CartPanel.jsx:450
 *
 * History:
 *   BUG-051 / BUG-076 : established always-ceil rule
 *   CR-170             : reintroduces conditional with threshold = 10 paise
 */
export const applyGrandTotalRoundOff = (rawTotal, enabled = true) => {
  if (rawTotal <= 0) return 0;
  if (!enabled) return Math.round(rawTotal * 100) / 100;
  const paise = Math.round((rawTotal % 1) * 100); // integer 0–99, drift-safe
  if (paise === 0) return rawTotal;               // exact integer — no change
  return paise < 10 ? Math.floor(rawTotal) : Math.ceil(rawTotal);
};
