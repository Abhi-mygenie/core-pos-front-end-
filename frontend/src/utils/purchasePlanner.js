// CR-078 · Smart Purchase — velocity/gap math utility
// Locked owner rulings applied:
//   B1 · velocity window = horizon (7d/14d/30d)
//   B2 · hide rows where gap ≥ 0 (only return rows that need action)

/**
 * Compute the daily consumption velocity for a single ingredient
 * from a daily-consumption report window.
 *
 * @param {Array} dcrRows  Rows from getDailyConsumptionReport({days: horizonDays})
 *                         Expected shape: [{ ingredient_id, quantity, date }, ...]
 * @param {string|number} ingredientId
 * @param {number} horizonDays  Number of days the DCR window spans (B1: same as horizon).
 * @returns {number}  Average consumption per day (units/day). 0 if no data.
 */
export function computeVelocity(dcrRows, ingredientId, horizonDays) {
  if (!Array.isArray(dcrRows) || horizonDays <= 0) return 0;
  const rows = dcrRows.filter(r => String(r.ingredient_id) === String(ingredientId));
  if (rows.length === 0) return 0;
  const totalConsumed = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  return totalConsumed / horizonDays;
}

/**
 * Compute the purchase plan for the whole outlet:
 *   projected_need = velocity_per_day × horizonDays
 *   gap = on_hand - projected_need
 *   suggest_qty = max(0, ceil(-gap)) → i.e. how much to buy to zero the gap
 *
 * Only rows with gap < 0 are returned (B2: hide 0-gap rows).
 *
 * @param {Object} opts
 * @param {Array} opts.stockInventory  [{ ingredient_id, name, unit, quantity }, ...]
 * @param {Array} opts.dcr             daily-consumption rows (window == horizonDays)
 * @param {number} opts.horizonDays    3 | 7 | 10 | 14 | custom
 * @returns {Array<{ingredient_id, name, unit, on_hand, velocity_per_day, projected_need, gap, suggest_qty}>}
 */
export function computePlan({ stockInventory, dcr, horizonDays }) {
  if (!Array.isArray(stockInventory) || horizonDays <= 0) return [];
  const rows = stockInventory.map(item => {
    const velocity = computeVelocity(dcr, item.ingredient_id ?? item.id, horizonDays);
    const onHand = Number(item.quantity ?? item.on_hand ?? 0);
    const projectedNeed = velocity * horizonDays;
    const gap = onHand - projectedNeed;
    const suggestQty = gap < 0 ? Math.ceil(-gap) : 0;
    return {
      ingredient_id: item.ingredient_id ?? item.id,
      name: item.name ?? item.ingredient_name ?? '',
      unit: item.unit ?? '',
      on_hand: onHand,
      velocity_per_day: Number(velocity.toFixed(3)),
      projected_need: Number(projectedNeed.toFixed(3)),
      gap: Number(gap.toFixed(3)),
      suggest_qty: suggestQty,
    };
  });
  // B2 · hide rows where gap ≥ 0
  return rows.filter(r => r.gap < 0);
}
