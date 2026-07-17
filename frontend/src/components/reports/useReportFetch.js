import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useReportFetch — canonical fetch lifecycle for every Insights report screen.
 *
 * Implements CR_011_LOADING_AND_INTERACTION_SPEC.md §3.2:
 * - AbortController per call; aborts on dep change
 * - Debounce 150ms to coalesce rapid dep changes
 * - Never overwrites data on error (old data ghosts through)
 * - hasLoadedOnce becomes true after first successful response
 *
 * @param {Function} fetchFn - async function that returns data. Receives AbortSignal as argument.
 * @param {Array} deps - dependency array that triggers re-fetch when changed.
 * @returns {{ data, isLoading, error, hasLoadedOnce, refetch }}
 */
const useReportFetch = (fetchFn, deps = [], { enabled = true } = {}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const executeFetch = useCallback(async () => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current(controller.signal);

      // Only update if this request wasn't aborted
      if (!controller.signal.aborted) {
        setData(result);
        setHasLoadedOnce(true);
        setError(null);
      }
    } catch (err) {
      // Ignore abort errors
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;

      if (!controller.signal.aborted) {
        // Never overwrite data on error — old data ghosts through
        setError(err?.response?.data?.message || err?.message || 'Failed to load data');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []); // stable — fetchFnRef handles closure

  // Debounced fetch on dep change (300ms to allow two-step date edits)
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      executeFetch();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // Manual refetch (for retry CTA)
  const refetch = useCallback(() => {
    executeFetch();
  }, [executeFetch]);

  return { data, isLoading, error, hasLoadedOnce, refetch };
};

export default useReportFetch;
