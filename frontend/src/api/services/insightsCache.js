/**
 * insightsCache.js — CR-044
 *
 * Module-level response cache for Insights reports.
 * Survives React re-renders and route changes. Cleared on logout.
 *
 * Two data structures:
 *   responseCache — stores resolved data (keyed by rid:endpoint:sort:from:to)
 *   pendingFetches — stores in-flight Promises (dedup concurrent requests R-7)
 */

const responseCache = new Map();
const pendingFetches = new Map();

const MAX_CACHE_ENTRIES = 5;
const TTL_TODAY_MS = 60 * 1000;         // 60s for date ranges including today
const TTL_HISTORICAL_MS = 5 * 60 * 1000; // 5 min for purely historical ranges

const _today = () => new Date().toISOString().slice(0, 10);

/** Build cache key including restaurant ID for cross-restaurant safety (R-9) */
export const buildCacheKey = (rid, endpoint, sortBy, from, to) =>
  `${rid}:${endpoint}:${sortBy}:${from}:${to}`;

/** Get cached data if not expired. TTL depends on whether range includes today (R-3). */
export const getCached = (key) => {
  const entry = responseCache.get(key);
  if (!entry) return null;
  const toDate = key.split(':').pop();
  const ttl = toDate >= _today() ? TTL_TODAY_MS : TTL_HISTORICAL_MS;
  if (Date.now() - entry.timestamp > ttl) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
};

/** Store data in cache with LRU eviction and size guard (R-4). */
export const setCache = (key, data, orderCount = 0) => {
  if (orderCount > 3000) return;
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
};

/**
 * Fetch-or-reuse: dedup concurrent requests for the same cache key (R-7).
 * If cached data exists, return it. If in-flight, await same Promise.
 * Otherwise fetch, cache, return.
 *
 * @param {string} key — cache key (from buildCacheKey)
 * @param {Function} fetchFn — async () => { data, orderCount }
 * @returns {Promise<any>} — cached or freshly fetched data
 */
export const fetchOrReuse = async (key, fetchFn) => {
  const cached = getCached(key);
  if (cached) return cached;

  if (pendingFetches.has(key)) return pendingFetches.get(key);

  const promise = fetchFn().then(({ data, orderCount }) => {
    setCache(key, data, orderCount);
    pendingFetches.delete(key);
    return data;
  }).catch((err) => {
    pendingFetches.delete(key);
    throw err;
  });

  pendingFetches.set(key, promise);
  return promise;
};

/** Clear all cache + pending fetches. Called on logout (R-8) and manual refresh. */
export const clearInsightsCache = () => {
  responseCache.clear();
  pendingFetches.clear();
};
