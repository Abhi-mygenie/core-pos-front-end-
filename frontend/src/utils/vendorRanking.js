// CR-078 · Smart Purchase — vendor ranking utility
// Locked owner rulings applied:
//   B3 · override warning triggers when picked vendor rate > winner × 1.05 (5% threshold)
//   B5 · tie-breaker on equal rate = most recent purchase wins

const OVERRIDE_THRESHOLD_PCT = 5; // B3 · locked

/**
 * Rank vendors for a specific ingredient using the vendor-item-list
 * (each row = a historical purchase line).
 *
 * @param {Array} vendorItemList  [{ vendor_id, vendor_name, ingredient_id, unit_price, last_purchase_date }, ...]
 * @param {string|number} ingredientId
 * @returns {{
 *   winner: {vendor_id, vendor_name, unit_price, last_purchase_date} | null,
 *   alternatives: Array,
 *   reason: string
 * }}
 */
export function rankVendors(vendorItemList, ingredientId) {
  if (!Array.isArray(vendorItemList) || !ingredientId) {
    return { winner: null, alternatives: [], reason: 'No vendor history' };
  }

  // Collapse to latest purchase per vendor (each vendor may appear many times in the list)
  const perVendor = new Map();
  vendorItemList
    .filter(r => String(r.ingredient_id) === String(ingredientId))
    .forEach(r => {
      const vid = r.vendor_id ?? r.vendorId;
      if (!vid) return;
      const price = Number(r.unit_price ?? r.rate ?? 0);
      // CR-078 · G7 · vendor-item-list uses "Purchase_Date" (capital P + D) as the raw API field
      const date = r.Purchase_Date ?? r.last_purchase_date ?? r.purchase_date ?? r.date ?? '';
      const existing = perVendor.get(vid);
      // Keep only the row with most-recent date per vendor
      if (!existing || String(date) > String(existing.last_purchase_date || '')) {
        perVendor.set(vid, {
          vendor_id: vid,
          vendor_name: r.vendor_name ?? r.vendorName ?? '',
          unit_price: price,
          last_purchase_date: date,
        });
      }
    });

  const candidates = Array.from(perVendor.values());
  if (candidates.length === 0) return { winner: null, alternatives: [], reason: 'No vendor history' };

  // Sort by (unit_price asc, then B5: last_purchase_date desc as tie-breaker)
  candidates.sort((a, b) => {
    if (a.unit_price !== b.unit_price) return a.unit_price - b.unit_price;
    return String(b.last_purchase_date).localeCompare(String(a.last_purchase_date));
  });

  const winner = candidates[0];
  const alternatives = candidates.slice(1);
  const reason = buildReason(winner, alternatives);

  return { winner, alternatives, reason };
}

function buildReason(winner, alternatives) {
  if (alternatives.length === 0) return 'Only vendor with history';
  const secondCheapest = alternatives[0];
  const allSameRate = alternatives.every(a => a.unit_price === winner.unit_price);
  if (allSameRate) {
    return `Stable · same rate × ${alternatives.length + 1} vendors`;
  }
  const gapPct = ((secondCheapest.unit_price - winner.unit_price) / winner.unit_price) * 100;
  if (gapPct >= OVERRIDE_THRESHOLD_PCT) {
    return `Cheapest · ${gapPct.toFixed(1)}% below next vendor`;
  }
  return `Best of ${alternatives.length + 1} vendors`;
}

/**
 * Check if a user's vendor pick is "materially" more expensive than the winner
 * (B3: threshold = 5%).
 *
 * @param {Object} winner              {unit_price} — the cheapest vendor
 * @param {Object} pickedVendor        {unit_price, vendor_name} — user's selection
 * @returns {{ warn: boolean, pctAbove: number, message: string }}
 */
export function isMateriallyMoreExpensive(winner, pickedVendor) {
  if (!winner || !pickedVendor || pickedVendor.unit_price <= winner.unit_price) {
    return { warn: false, pctAbove: 0, message: '' };
  }
  const pct = ((pickedVendor.unit_price - winner.unit_price) / winner.unit_price) * 100;
  const warn = pct >= OVERRIDE_THRESHOLD_PCT;
  const message = warn
    ? `${pickedVendor.vendor_name} rate is ${pct.toFixed(1)}% above cheapest (${winner.unit_price})`
    : '';
  return { warn, pctAbove: Number(pct.toFixed(2)), message };
}

export const _OVERRIDE_THRESHOLD_PCT = OVERRIDE_THRESHOLD_PCT; // exported for unit tests
