// CR-002 Cross-Sell + Customer Intelligence — Response Transform
// Normalizes CRM v1.1 POST /pos/customers/order-suggestions response
// to camelCase POS shape with dual date parser, defensive sort, and cap.

import { formatRelativeTime } from '../../utils/relativeTime';

// --- Helpers ---

/**
 * Dual last_visit_at parser (contract §4.4).
 * Handles both "YYYY-MM-DD HH:MM:SS" (legacy, assume UTC) and ISO 8601 with offset.
 */
const parseDualDate = (raw) => {
  if (!raw) return null;
  return raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
};

/**
 * Sort notes/items: usedCount DESC, then lastUsedAt DESC.
 */
const sortByCountThenDate = (a, b) => {
  if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount;
  const dateA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
  const dateB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
  return dateB - dateA;
};

/**
 * Sort top items: orderCount DESC, then lastOrderedAt DESC.
 */
const sortByOrderCountThenDate = (a, b) => {
  if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
  const dateA = a.lastOrderedAt ? new Date(a.lastOrderedAt).getTime() : 0;
  const dateB = b.lastOrderedAt ? new Date(b.lastOrderedAt).getTime() : 0;
  return dateB - dateA;
};

// --- Main Transform ---

/**
 * Transform the raw CRM order-suggestions API response into normalized POS shape.
 *
 * @param {Object} apiResponse - Raw response from POST /pos/customers/order-suggestions
 * @returns {Object|null} Normalized object, or null on error/not-found
 */
export const transformOrderSuggestions = (apiResponse) => {
  if (!apiResponse || apiResponse.success === false) return null;

  const data = apiResponse.data;
  if (!data) return null;

  const summary = data.customer_summary || {};
  const value = data.customer_value || null;
  const patterns = data.order_patterns || {};
  const rawCustomerNotes = data.customer_notes || [];
  const rawItemNotes = data.item_notes || [];
  const rawItemNotesByIdMap = data.item_notes_by_id || {};
  const rawCrossSell = data.cross_sell_items || [];
  const meta = data.meta || {};

  // --- customer_summary ---
  const customerSummary = {
    name: (summary.name || '').trim(),
    phone: summary.phone || '',
    tier: summary.tier || 'Bronze',
    visits: summary.visits || 0,
    grossSpend: summary.gross_spend || 0,
    lastVisitAt: parseDualDate(summary.last_visit_at),
    loyaltyPoints: summary.loyalty_points || 0,
    walletBalance: summary.wallet_balance || 0,
    currency: summary.currency || 'INR',
  };

  // --- customer_value (null = first-time customer) ---
  const customerValue = value ? {
    band: value.band || 'low',
    avgOrderValue: value.avg_order_value || 0,
    frequencyPerMonth: value.frequency_per_month || 0,
    recencyDays: value.recency_days || 0,
    churnRisk: value.churn_risk || 'low',
    winBackRecommendation: value.win_back_recommendation || false,
  } : null;

  // --- order_patterns ---
  const topItems = (patterns.top_items || []).map(item => ({
    itemId: String(item.item_id || ''),
    name: item.name || '',
    orderCount: item.order_count || 0,
    lastOrderedAt: parseDualDate(item.last_ordered_at),
  })).sort(sortByOrderCountThenDate).slice(0, 5);

  const orderPatterns = {
    topItems,
    avgItemsPerOrder: patterns.avg_items_per_order || 0,
    usualChannel: patterns.usual_channel || null,
    usualTimeOfDay: patterns.usual_time_of_day || null,
  };

  // --- customer_notes (order-level) — top 5 ---
  const customerNotes = rawCustomerNotes.map(n => {
    const lastUsedAt = parseDualDate(n.last_used_at);
    return {
      text: n.text || '',
      usedCount: n.used_count || 0,
      lastUsedAt,
      relativeTime: formatRelativeTime(lastUsedAt),
      source: n.source || 'history',
    };
  }).sort(sortByCountThenDate).slice(0, 5);

  // --- item_notes_by_id (batch per cart item) — top 5 per key ---
  const itemNotesByItemId = {};
  for (const [itemId, notes] of Object.entries(rawItemNotesByIdMap)) {
    if (!Array.isArray(notes)) continue;
    itemNotesByItemId[String(itemId)] = notes.map(n => {
      const lastUsedAt = parseDualDate(n.last_used_at);
      return {
        text: n.text || '',
        usedCount: n.used_count || 0,
        lastUsedAt,
        relativeTime: formatRelativeTime(lastUsedAt),
        source: n.source || 'history',
      };
    }).sort(sortByCountThenDate).slice(0, 5);
  }

  // --- cross_sell_items — NOT re-sorted (server-sorted by confidence DESC) ---
  const crossSellItems = rawCrossSell.map(xs => ({
    itemId: String(xs.item_id || ''),
    name: xs.name || '',
    reason: xs.reason || '',
    source: xs.source || 'history',
    confidence: xs.confidence || 0,
  }));

  // --- feature_flags ---
  const featureFlags = {
    crossSell: meta.feature_flags?.cross_sell ?? true,
    upsell: meta.feature_flags?.upsell ?? false,
    ai: meta.feature_flags?.ai ?? false,
  };

  return {
    customerSummary,
    customerValue,
    orderPatterns,
    customerNotes,
    itemNotesByItemId,
    crossSellItems,
    featureFlags,
    requestId: meta.request_id || '',
    generatedAt: meta.generated_at || '',
    isFirstTimeCustomer: !value,
  };
};
