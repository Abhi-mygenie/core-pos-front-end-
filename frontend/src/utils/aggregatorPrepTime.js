// CR-109: Dynamic prep time computation for aggregator orders
// Uses restaurant settings: default_prep_time, prep_time_count_method, prep_time_bonus_config

/**
 * Compute optimal prep time based on order items + restaurant bracket config
 * @param {Array} items - order items with qty/quantity field
 * @param {Object} settings - restaurant.settings from profile API
 * @returns {number} computed prep time in minutes
 */
export const computeAggregatorPrepTime = (items = [], settings = {}) => {
  const basePrepTime = Number(settings.defaultPrepTime || settings.default_prep_time) || 15;

  // Count total item quantity
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);

  // Parse bonus config (may be string or array — profileTransform already parses)
  let brackets = settings.prepTimeBonusConfig || settings.prep_time_bonus_config || [];
  if (typeof brackets === 'string') {
    try { brackets = JSON.parse(brackets); } catch { brackets = []; }
  }
  if (!Array.isArray(brackets) || brackets.length === 0) return basePrepTime;

  // Find matching bracket — supports both API shapes (min_items or min)
  const bracket = brackets.find(b =>
    totalQty >= Number(b.min_items || b.min) && totalQty <= Number(b.max_items || b.max)
  );

  const bonus = bracket ? Number(bracket.bonus_minutes || bracket.bonus) || 0 : 0;
  return basePrepTime + bonus;
};
