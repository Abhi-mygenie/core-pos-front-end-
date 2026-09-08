// CR-010: Weight entry prompt preference — browser-local toggle.
//
// When ON (default): clicking a weight item in the menu grid shows a
// weight-entry modal BEFORE adding to cart.
// When OFF: weight item is added to cart with default weight (1 Kg / 1 L).
//
// Storage scope: browser-global. Same convention as mygenie_qsr_mode_enabled,
// mygenie_stay_on_order_after_bill, etc.
//
// Read site:  components/order-entry/OrderEntry.jsx (addToCart weight gate)
// Write site: pages/StatusConfigPage.jsx (UI Elements section)

export const WEIGHT_PROMPT_KEY = 'mygenie_weight_prompt_enabled';

export const getWeightPromptEnabled = () => {
  try {
    return localStorage.getItem(WEIGHT_PROMPT_KEY) !== 'false';
  } catch (_) {
    return true; // default ON
  }
};

export const setWeightPromptEnabled = (value) => {
  try {
    localStorage.setItem(WEIGHT_PROMPT_KEY, value ? 'true' : 'false');
  } catch (_) {}
};
