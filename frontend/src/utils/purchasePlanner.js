// CR-078 · Smart Purchase — velocity/gap planner (transform-aware, unit-safe)
// Locked owner rulings:
//   B1 · velocity window = horizon (7d/14d/30d matches horizon input)
//   B2 · hide rows where gap ≥ 0
//   G4 · unit normalization via convertToBase (0 real family mismatches confirmed in preprod)
//   G8 · consumes TRANSFORMED stock rows (camelCase, quantity=Number, isSubRecipe boolean)
//   G9 · filter isSubRecipe === true rows out of the planner
//   G12 · getHorizonDates helper builds DCR body dates
//
// Input contract:
//   stockInventory = TRANSFORMED rows from getStockInventory() -> fromAPI.stockItems()
//     shape: { id, name, unit, quantity(Number), isSubRecipe(bool), ... }
//   dcrStockSummary = RAW rows from getDailyConsumptionReport()
//     shape: { ingredient_id, ingredient_name, total_consumed: "5.703 kg", closing_stock, opening_stock }

// ── Unit conversion tables ─────────────────────────────────────
const WEIGHT_UNITS = { g: 1, gm: 1, gms: 1, kg: 1000 };                        // base = g
const VOLUME_UNITS = { ml: 1, l: 1000, ltr: 1000, liter: 1000, litre: 1000 };  // base = ml
const COUNT_UNITS  = { piece: 1, pieces: 1, pc: 1, pcs: 1, unit: 1 };          // base = piece

/**
 * Parse a "<value> <unit>" string like "5.703 kg" -> { value: 5.703, unit: 'kg' }
 * Tolerant of: whitespace, negative values, missing unit (numeric-only), garbage.
 */
export function parseQuantity(str) {
  if (str === null || str === undefined) return { value: 0, unit: '' };
  if (typeof str === 'number')            return { value: str, unit: '' };
  const s = String(str).trim();
  if (!s) return { value: 0, unit: '' };
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
  if (!m) return { value: 0, unit: '' };
  return { value: parseFloat(m[1]), unit: (m[2] || '').toLowerCase() };
}

/**
 * Convert (value, unit) to the family's base unit.
 * Weight -> g · Volume -> ml · Count -> piece · Unknown -> passthrough.
 */
export function convertToBase(value, unit) {
  const u = String(unit || '').toLowerCase().trim();
  if (u in WEIGHT_UNITS) return { value: value * WEIGHT_UNITS[u], base: 'g' };
  if (u in VOLUME_UNITS) return { value: value * VOLUME_UNITS[u], base: 'ml' };
  if (u in COUNT_UNITS)  return { value: value,                    base: 'piece' };
  return { value, base: u || 'unknown' };
}

/**
 * Given a horizon in days, return the from_date/to_date for the DCR POST body.
 *   to_date   = reference date (default: today, local)
 *   from_date = reference - (horizonDays - 1)
 * Both as "YYYY-MM-DD".
 */
export function getHorizonDates(horizonDays, referenceDate = new Date()) {
  const to = new Date(referenceDate);
  const from = new Date(referenceDate);
  from.setDate(from.getDate() - Math.max(0, horizonDays - 1));
  const iso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  return { from_date: iso(from), to_date: iso(to) };
}

/**
 * Compute daily consumption velocity in the ingredient's BASE unit (small_unit).
 * Uses stockItem.smallUnit as the target family base (gm/ml/piece).
 *
 * @param {Object} dcrRow      Row from response.stock_summary (RAW)
 * @param {Object} stockItem   Row from getStockInventory() (TRANSFORMED)
 * @param {number} horizonDays How many days the DCR window spans
 * @returns {number}           Velocity in stockItem.smallUnit per day (0 if no data)
 */
export function computeVelocity(dcrRow, stockItem, horizonDays) {
  if (!dcrRow || horizonDays <= 0) return 0;
  const { value: consumedVal, unit: consumedUnit } = parseQuantity(dcrRow.total_consumed);
  if (consumedVal <= 0) return 0;

  const consumedBase = convertToBase(consumedVal, consumedUnit);
  // CR-078 · Path X · backend contract quirk (see BACKEND_BRIEF_STOCK_UNIT_INCONSISTENCY.md):
  //   cal_quantity is always in small_unit → use smallUnit as target base
  const targetUnit   = (stockItem?.smallUnit || stockItem?.unit || consumedUnit).toLowerCase();
  const targetInBase = convertToBase(1, targetUnit);

  // Family mismatch (0 real cases in preprod, defensive fallback):
  //   assume the DCR value already matches the target unit, no conversion.
  if (consumedBase.base !== targetInBase.base) {
    return consumedVal / horizonDays;
  }
  return (consumedBase.value / targetInBase.value) / horizonDays;
}

/**
 * Build the auto-shopping list for Smart Purchase.
 *
 * Filters:
 *   - G9 · isSubRecipe === true rows dropped (sub-recipes aren't purchasable)
 *   - B2 · gap ≥ 0 rows dropped (already-covered items)
 *
 * @param {Object} opts
 * @param {Array}  opts.stockInventory   TRANSFORMED stock rows (camelCase)
 * @param {Array}  opts.dcrStockSummary  RAW DCR rows (from response.stock_summary)
 * @param {number} opts.horizonDays      3 | 7 | 10 | 14 | custom
 * @returns {Array} rows where gap < 0
 */
export function computePlan({ stockInventory, dcrStockSummary, horizonDays, showAll = false }) {
  if (!Array.isArray(stockInventory) || horizonDays <= 0) return [];
  const dcrByIngredient = new Map();
  (dcrStockSummary || []).forEach(r => dcrByIngredient.set(String(r.ingredient_id), r));

  const rows = stockInventory
    .filter(item => item?.isSubRecipe !== true)                 // G9
    .map(item => {
      const ingredientId = item.id;
      const name         = item.name || '';
      // CR-078 · Path X · use small_unit + cal_quantity for math (see BACKEND_BRIEF_STOCK_UNIT_INCONSISTENCY.md).
      // The (quantity, unit) pair is inconsistent per-ingredient in the current backend contract;
      // cal_quantity is always expressed in small_unit → single source of truth for planner math.
      const unit         = item.smallUnit || item.unit || '';
      const onHand       = Number(item.calQuantity) || 0;
      const dcrRow       = dcrByIngredient.get(String(ingredientId));
      const velocity     = computeVelocity(dcrRow, item, horizonDays);
      const projected    = velocity * horizonDays;
      const gap          = onHand - projected;
      const suggest      = gap < 0 ? Math.ceil(-gap) : 0;
      return {
        ingredient_id:    ingredientId,
        name,
        unit,                                                      // base unit (gm/ml/piece) for math + labels
        display_unit:     item.displayUnit || unit,                // display-friendly (kg/ltr) for UI conversion
        on_hand:          Number(onHand.toFixed(3)),
        display_on_hand:  Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240: prefer backend display_qty for UI
        velocity_per_day: Number(velocity.toFixed(3)),
        projected_need:   Number(projected.toFixed(3)),
        gap:              Number(gap.toFixed(3)),
        suggest_qty:      suggest,
      };
    });
  const velocityRows = rows.filter(r => r.gap < 0)
    .map(r => ({ ...r, origin: 'planner' }));                    // B2 Rule 1 (unchanged)

  // CR-105 Sub-A: When showAll=true, include in-stock items (gap >= 0)
  const inStockRows = showAll
    ? rows.filter(r => r.gap >= 0).map(r => ({ ...r, suggest_qty: 0, origin: 'in_stock' }))
    : [];

  // BUG-224: B2 Rule 2 (owner-amended 2026-07-23) — low-stock rows regardless of consumption
  const inPlan = new Set(velocityRows.map(r => String(r.ingredient_id)));
  const alertRows = stockInventory
    .filter(item => item?.isSubRecipe !== true)                  // G9 also applies
    .filter(item => !inPlan.has(String(item.id)))
    .map(item => {
      const threshold = (Number(item.minQtyAlert) || 0) * (Number(item.conversionFactor) || 1); // Q1: minQtyAlert only, small-unit domain
      const onHand = Number(item.calQuantity) || 0;
      if (!(threshold > 0) || onHand >= threshold) return null;
      return {
        ingredient_id: item.id,
        name: item.name || '',
        unit: item.smallUnit || item.unit || '',
        display_unit: item.displayUnit || item.smallUnit || item.unit || '',
        on_hand: Number(onHand.toFixed(3)),
        display_on_hand: Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240
        velocity_per_day: 0,
        projected_need: Number(threshold.toFixed(3)),
        gap: Number((onHand - threshold).toFixed(3)),
        suggest_qty: Math.ceil(threshold - onHand),              // Q2: top-up
        origin: 'stock_alert',
      };
    })
    .filter(Boolean);

  // CR-114+115: Build category lookup from stock inventory for category headers + dropdown
  const catLookup = new Map();
  stockInventory.forEach(item => {
    if (item.id) catLookup.set(String(item.id), item.categoryName || item.category_name || 'Uncategorized');
  });

  return [...velocityRows, ...alertRows, ...inStockRows]        // BUG-224 + CR-105
    .map(r => ({ ...r, categoryName: catLookup.get(String(r.ingredient_id)) || 'Uncategorized' })); // CR-114+115
}
