// BUG-459 · shared quantity breakdown helpers (consumed by StockAuditPanel; CR-387 Smart Purchase)
// All maths in the item's BASE unit (small_unit). factor = base units per 1 display unit.
const ZERO_DP_UNITS = new Set(['gm', 'g', 'gms', 'ml', 'piece', 'pieces', 'pc', 'pcs', 'unit']);
const round = (v, dp) => { const m = 10 ** dp; return Math.round((Number(v) + Number.EPSILON) * m) / m; };

export const minorDp = (unit) => (ZERO_DP_UNITS.has(String(unit || '').toLowerCase()) ? 0 : 2); // OD-459-04 / OD-387-05

export function hasConversion(factor, majorUnit, minorUnit) {
  const f = Number(factor);
  return f > 0 && !!majorUnit && !!minorUnit && String(majorUnit).toLowerCase() !== String(minorUnit).toLowerCase();
}

// base → { sign, major, minor, majorUnit, minorUnit, text }
export function toBreakdown(baseValue, factor, majorUnit, minorUnit) {
  const v = Number(baseValue) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (!hasConversion(factor, majorUnit, minorUnit)) {
    const major = round(abs, minorDp(majorUnit));
    return { sign, major, minor: null, majorUnit: majorUnit || '', minorUnit: null, text: `${sign}${major} ${majorUnit || ''}`.trim() };
  }
  const f = Number(factor);
  let major = Math.floor(abs / f + 1e-9);
  let minor = round(abs - major * f, minorDp(minorUnit));
  if (minor >= f) { major += 1; minor = 0; }
  const text = `${sign}${major} ${majorUnit}${minor > 0 ? ` ${minor} ${minorUnit}` : ''}`;
  return { sign, major, minor, majorUnit, minorUnit, text };
}

// (major, minor) → { displayQty (≤4 dp, what the API receives), baseQty }
export function fromBreakdown(major, minor, factor) {
  const M = Number(major) || 0, m = Number(minor) || 0, f = Number(factor) || 0;
  if (!(f > 0)) return { displayQty: round(M, 4), baseQty: M };
  const baseQty = M * f + m;
  return { displayQty: round(baseQty / f, 4), baseQty };
}

// OD-459-03 (a): carry minor ≥ factor into major
export function normalizeBreakdown(major, minor, factor) {
  const M = Number(major) || 0, m = Number(minor) || 0, f = Number(factor) || 0;
  if (!(f > 0) || m < f) return { major: M, minor: m };
  const carry = Math.floor(m / f);
  return { major: M + carry, minor: round(m - carry * f, 6) };
}

// BUG-460: ceil base-unit quantity UP to the next whole display unit (owner: never short)
export function ceilToDisplayUnit(baseQty, factor) {
  const f = Number(factor);
  if (!(f > 0) || baseQty <= 0) return Math.ceil(baseQty);
  return Math.ceil(baseQty / f) * f;
}

// CR-387 · Smart Purchase row → purchase quantity in both domains (row fields from purchasePlanner E-P1)
// row: { qty_major, qty_minor, has_conversion, conversion_factor, unit (base), display_unit, small_unit }
export function rowQuantity(row) {
  if (!row) return { displayQty: 0, baseQty: 0, unit: '', text: '' };
  if (row.has_conversion) {
    const { displayQty, baseQty } = fromBreakdown(row.qty_major, row.qty_minor, row.conversion_factor);
    return { displayQty, baseQty, unit: row.display_unit, text: toBreakdown(baseQty, row.conversion_factor, row.display_unit, row.small_unit).text };
  }
  const q = Number(row.qty_major) || 0;
  return { displayQty: q, baseQty: q, unit: row.unit, text: `${q} ${row.unit || ''}`.trim() };
}
