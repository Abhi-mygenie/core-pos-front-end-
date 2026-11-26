// Payment Classifier — CR-032 (GO-2, 2026-06-11)
//
// ONE canonical payment_method → display-bucket mapping for Sales (S7),
// Payments (S8) and Insights Dashboard. Display-only — revenue gates are
// owned by CR-030 (fs=6 + collect_bill + TAB exclusion), not this module.
//
// Owner-ruled bucket list (H28 rec): Cash · Card · UPI · Room Bill · Partial ·
// Zomato Gold · Other(+warn). Live enums verified 2026-06-11 (both rids).
//
// Returns null for rows that must NEVER appear in a paid mix:
//   TAB            → credit at punch (CR-030: settlements surface as 'Credit' group)
//   transferToRoom → pre-checkout state (Running, not revenue)
//   pending        → unpaid marker (H26; fs gate excludes anyway — defense in depth)
//   Cancel/cancelled/Merge → non-payment statuses

const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const classifyPaymentMethod = (raw) => {
  const pm = (raw || '').toLowerCase().trim();
  if (!pm) return null;
  if (pm === 'cash' || pm === 'cash_on_delivery') return 'Cash'; // explicit rule, not substring luck
  if (pm === 'card' || pm === 'credit_card' || pm === 'debit_card') return 'Card';
  if (pm === 'upi' || pm === 'gpay' || pm === 'phonepe' || pm === 'paytm') return 'UPI';
  if (pm === 'room') return 'Room Bill'; // pm='ROOM' = folio settled at checkout (H6-b)
  if (pm === 'partial') return 'Partial';
  if (pm === 'zomato_gold') return 'Zomato Gold';
  if (pm.includes('razorpay') || pm.includes('razor')) return pm.includes('card') ? 'Card' : 'UPI';
  if (pm.includes('upi')) return 'UPI';
  if (pm.includes('card')) return 'Card';
  if (pm.includes('cash')) return 'Cash';
  if (pm === 'tab') return null;
  if (pm === 'transfertoroom') return null;
  if (pm === 'pending') return null;
  if (pm === 'cancel' || pm === 'cancelled' || pm === 'merge') return null;
  // Unknown enum — surface but log so new backend literals get registered
  console.warn(`[paymentClassifier] unknown payment_method enum: "${raw}"`);
  return titleCase(pm);
};

// Settlement money-in group label (CR-030 H5: Credit Cash/Card/UPI from daily-sales)
export const CREDIT_GROUP = 'Credit';

export default classifyPaymentMethod;
