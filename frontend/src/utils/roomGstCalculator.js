// BUG-386: Room accommodation GST computation utility.
// Spec: pms_gst.md §1 — basis: "unit_accommodation_per_day"
// Rule: apply slab rate to nightly unit price (total / roomCount / nights), NOT to stay total.
// Returns: { gstTotal, cgst, sgst } — all rounded to 2dp.
//   gstTotal = CGST + SGST (equal halves per Indian GST rules)
// Returns { gstTotal: 0, cgst: 0, sgst: 0 } when GST not applicable or config missing.

const round2dp = (n) => Math.round(n * 100) / 100;

/**
 * Compute room accommodation GST from slab config.
 * @param {boolean}  applicable  - restaurant.checkInFlags.roomGstApplicable
 * @param {object|null} slabs    - restaurant.checkInFlags.roomGstSlabs ({ basis, slabs: [{min,max,gst_percent}] })
 * @param {number}   totalAmount - total room order amount (all rooms, all nights)
 * @param {number}   nights      - number of nights (≥1)
 * @param {number}   roomCount   - number of rooms in this check-in (≥1)
 * @returns {{ gstTotal: number, cgst: number, sgst: number }}
 */
export const computeRoomGst = (applicable, slabs, totalAmount, nights = 1, roomCount = 1) => {
  const zero = { gstTotal: 0, cgst: 0, sgst: 0 };
  if (!applicable || !slabs?.slabs?.length || !totalAmount || totalAmount <= 0) return zero;
  if (!nights || nights <= 0 || !roomCount || roomCount <= 0) return zero;

  // Per-unit nightly price (equal split assumed — pms_gst.md §5)
  const nightlyUnit = totalAmount / roomCount / nights;

  // Find matching slab
  const slab = slabs.slabs.find(
    s => nightlyUnit >= (s.min ?? 0) && (s.max == null || nightlyUnit <= s.max)
  );
  if (!slab || !slab.gst_percent) return zero;

  const rate       = slab.gst_percent / 100;
  const gstPerUnit = nightlyUnit * rate;
  const gstTotal   = round2dp(gstPerUnit * roomCount * nights);
  const half       = round2dp(gstTotal / 2);

  // CGST = SGST = gstTotal/2. Handle odd-paise: assign remainder to CGST.
  const cgst = round2dp(gstTotal - half);  // e.g. ₹1 → cgst=0.50, sgst=0.50
  const sgst = half;

  return { gstTotal, cgst, sgst };
};
