// CR-002 Cross-Sell + Customer Intelligence — React Hook
// Fetches, caches (5 min TTL, RAM-only), debounces (500ms) customer intel data.
// Zero UI responsibility — only provides { intel, loading, error } state.

import { useState, useEffect, useRef, useCallback } from 'react';
import { getOrderSuggestions } from '../api/services/customerIntelService';
import { transformOrderSuggestions } from '../api/transforms/customerIntelTransform';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_MS = 500;

/**
 * Build a cart fingerprint string for cache-key differentiation.
 * Only active (non-cancelled) items contribute to the fingerprint.
 */
const buildCartFingerprint = (cartItems) => {
  if (!cartItems || cartItems.length === 0) return '[]';
  return JSON.stringify(
    cartItems
      .filter(item => !item.placed || item.status !== 'cancelled')
      .map(item => [String(item.id), item.qty || 1])
      .sort()
  );
};

/**
 * useCustomerIntel hook
 *
 * @param {string|null} customerId  - CRM customer UUID, or null/falsy for walk-in
 * @param {Array}       cartItems   - Current cart items from OrderEntry state
 * @param {string}      orderType   - 'dine_in' | 'takeaway' | 'delivery' | etc.
 * @returns {{ intel: Object|null, loading: boolean, error: string|null }}
 */
export const useCustomerIntel = (customerId, cartItems = [], orderType = null) => {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // RAM-only cache: { key: string, data: Object, timestamp: number }
  const cacheRef = useRef({ key: null, data: null, timestamp: 0 });
  // Debounce timer ref
  const timerRef = useRef(null);
  // Track current customerId to discard stale responses
  const activeCustomerRef = useRef(null);

  const cartFingerprint = buildCartFingerprint(cartItems);

  const fetchIntel = useCallback(async (custId, cart, oType, cacheKey) => {
    // Guard: if customer changed since debounce started, discard
    if (activeCustomerRef.current !== custId) return;

    setLoading(true);
    setError(null);

    try {
      const rawResponse = await getOrderSuggestions({
        customerId: custId,
        cart,
        orderType: oType,
      });

      // Guard again after async: customer may have changed
      if (activeCustomerRef.current !== custId) return;

      // Handle success:false (CUSTOMER_NOT_FOUND, INVALID_REQUEST)
      if (rawResponse && rawResponse.success === false) {
        const errorCode = rawResponse.data?.error?.code;
        if (errorCode === 'INVALID_REQUEST') {
          console.error('customerIntel: invalid request');
        }
        // CUSTOMER_NOT_FOUND: no console output (per contract)
        setIntel(null);
        setLoading(false);
        return;
      }

      const transformed = transformOrderSuggestions(rawResponse);

      if (activeCustomerRef.current !== custId) return;

      if (transformed) {
        console.debug('customerIntel: rid=', transformed.requestId);
        // Update cache
        cacheRef.current = { key: cacheKey, data: transformed, timestamp: Date.now() };
        setIntel(transformed);
      } else {
        setIntel(null);
      }
    } catch (err) {
      if (activeCustomerRef.current !== custId) return;

      // Classify error
      const status = err.response?.status;
      if (status === 401) {
        console.warn('customerIntel: auth fail');
      } else if (status >= 500) {
        console.warn('customerIntel: server error', err);
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        console.warn('customerIntel: timeout');
      } else {
        console.warn('customerIntel: fetch failed', err);
      }
      setIntel(null);
      setError(err.readableMessage || err.message || 'CRM fetch failed');
    } finally {
      if (activeCustomerRef.current === custId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Clear any pending debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Track active customer
    activeCustomerRef.current = customerId;

    // No customer → clear state
    if (!customerId) {
      setIntel(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${customerId}__${cartFingerprint}`;

    // Check cache hit
    const cached = cacheRef.current;
    if (cached.key === cacheKey && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      setIntel(cached.data);
      setLoading(false);
      return;
    }

    // Debounce the fetch
    setLoading(true);
    timerRef.current = setTimeout(() => {
      fetchIntel(customerId, cartItems, orderType, cacheKey);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [customerId, cartFingerprint, orderType, fetchIntel, cartItems]);

  return { intel, loading, error };
};
