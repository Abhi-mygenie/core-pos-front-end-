import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../constants";
import { useToast } from "../hooks/use-toast";
import { API_LOADING_ORDER, LOADING_STATES } from "../api/constants";
import { useAuth, useRestaurant, useMenu, useTables, useSettings, useOrders, useStations } from "../contexts";
import * as profileService from "../api/services/profileService";
import { setCrmRestaurantId } from "../api/crmAxios";
import * as categoryService from "../api/services/categoryService";
import * as productService from "../api/services/productService";
import * as tableService from "../api/services/tableService";
import * as settingsService from "../api/services/settingsService";
import * as orderService from "../api/services/orderService";
import * as stationService from "../api/services/stationService";

// Initial status shape per API key
const mkIdle = () => ({ status: LOADING_STATES.IDLE, error: null, loaded: 0, total: 0, elapsed: null, startedAt: null });

// Loading Screen Component - Loads all data after login
const LoadingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Context setters
  const { setUserData } = useAuth();
  const { setRestaurant } = useRestaurant();
  const { setCategories, setProducts } = useMenu();
  const { setTables } = useTables();
  const { setCancellationReasons } = useSettings();
  const { setOrders } = useOrders();
  const { 
    setAvailableStations, 
    initializeConfig, 
    setAllStationData,
    enabledStations,
    stationViewEnabled 
  } = useStations();

  // Loading status for each API with counts + timing
  const [loadingStatus, setLoadingStatus] = useState(
    API_LOADING_ORDER.reduce((acc, item) => { acc[item.key] = mkIdle(); return acc; }, {})
  );

  // CR station_api_visible_loading (May-2026) — Phase 2 visibility.
  // Single umbrella row covering the entire post-Phase-1 station-batch load.
  // Status shape matches one `loadingStatus` row so the same `getStatusIcon`
  // / `getCountText` helpers render it uniformly. `total` = enabled station
  // count (set once we know how many we're attempting), `loaded` = number of
  // stations that resolved successfully so far.
  const [stationStatus, setStationStatus] = useState(mkIdle());

  // Ref to track loaded data across the async flow
  const loadedDataRef = useRef({});

  // CR station_api_visible_loading (May-2026) — abort-controller ref.
  // The mount effect (initial load) and `handleRetry` (re-entry) both need to
  // share the *current* controller with `loadStationData` (which is launched
  // by the progress effect, not by `loadAllData`). A ref keeps the latest
  // controller reachable without re-creating closures.
  const ctrlRef = useRef({ aborted: false });

  // Overall progress
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  // CR-038: Global retry counter — max 3 attempts
  const MAX_RETRIES = 3;
  const [retryCount, setRetryCount] = useState(0);

  // Live timer tick — updates every 100ms to show running elapsed on loading items
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [isComplete]);

  // Load data on mount (auth check handled by ProtectedRoute — T-07)
  useEffect(() => {
    const ctrl = { aborted: false };
    ctrlRef.current = ctrl;
    loadAllData(ctrl);

    return () => { ctrl.aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CR station_api_visible_loading (May-2026): single derivation of whether
  // we will attempt the Phase-2 station load. Decided ONCE products has
  // resolved (we need it to discover stations) and station view is enabled.
  // Stored in a ref so the progress effect doesn't re-compute it from stale
  // closures and the rendering logic can read the same value.
  const willAttemptStationsRef = useRef(false);

  // Update progress when status changes
  useEffect(() => {
    // ----- Phase 1 (the 7 boot APIs) -----
    const phase1Statuses = Object.values(loadingStatus);
    const phase1Total = phase1Statuses.length;
    const phase1Completed = phase1Statuses.filter(
      (s) => s.status === LOADING_STATES.SUCCESS || s.status === LOADING_STATES.ERROR
    ).length;
    const phase1Done = phase1Completed === phase1Total;
    const phase1HasError = phase1Statuses.some((s) => s.status === LOADING_STATES.ERROR);

    // ----- Phase 2 decision: are we going to attempt station loading? -----
    // Decided when Phase 1 finishes successfully and we know products + the
    // station-view config. If skipped (station view off OR no stations
    // discovered), the station row is hidden and the denominator stays at 7.
    let willAttemptStations = willAttemptStationsRef.current;
    if (phase1Done && !phase1HasError && stationStatus.status === LOADING_STATES.IDLE) {
      const data = loadedDataRef.current;
      const stations = stationService.extractUniqueStations(data.products || []);
      const cfg = stationService.getStationViewConfig();
      willAttemptStations = cfg.enabled !== false && stations.length > 0;
      willAttemptStationsRef.current = willAttemptStations;
    }

    // ----- Progress bar denominator/numerator -----
    const stationContributes = willAttemptStations ? 1 : 0;
    const total = phase1Total + stationContributes;
    const stationTerminal =
      stationStatus.status === LOADING_STATES.SUCCESS ||
      stationStatus.status === LOADING_STATES.ERROR;
    const completed = phase1Completed + (willAttemptStations && stationTerminal ? 1 : 0);
    setProgress(total > 0 ? Math.round((completed / total) * 100) : 0);

    // ----- Phase-2 launch -----
    // Trigger station load exactly once, when Phase 1 is fully done & happy
    // and we have decided to attempt stations. `stationStatus.status === IDLE`
    // serves as the idempotency mutex (replaces the prior stationLoadingRef).
    if (
      phase1Done &&
      !phase1HasError &&
      willAttemptStations &&
      stationStatus.status === LOADING_STATES.IDLE
    ) {
      loadStationData(ctrlRef.current);
    }

    // ----- Completion / navigation -----
    // We're done when Phase 1 is in a terminal state AND either:
    //   (a) Phase 2 was skipped, OR
    //   (b) Phase 2 has reached a terminal state (SUCCESS/ERROR).
    const phase2Done = !willAttemptStations || stationTerminal;
    const allDone = phase1Done && phase2Done;
    const phase2HasError = stationStatus.status === LOADING_STATES.ERROR;
    const anyError = phase1HasError || phase2HasError;

    if (allDone) {
      setHasError(anyError);

      if (!anyError) {
        setIsComplete(true);
        setTimeout(() => {
          // CR-001 (Fix B2): return to the originally requested URL when
          // LoadingPage was reached via ProtectedRoute redirect on a hard
          // refresh. Default to /dashboard for the post-login flow.
          // Defensive: never bounce back to /loading itself.
          const requestedReturn = location.state?.returnTo;
          const returnTo =
            requestedReturn && requestedReturn !== '/loading'
              ? requestedReturn
              : '/dashboard';
          navigate(returnTo, { replace: true });
        }, 500);
      } else {
        setIsComplete(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingStatus, stationStatus, navigate, location.state]);

  // CR station_api_visible_loading (May-2026): station-batch loader.
  // ----------------------------------------------------------------------
  // Reports progress into `stationStatus` so it can appear as one umbrella
  // row in the loading screen (Option C from the fix plan). Honours abort
  // via the shared `ctrl` controller. Uses `Promise.allSettled` (parity with
  // the Phase-1 parallelisation contract) so a single station failure does
  // NOT cancel the others — successful stations still populate
  // `stationData`. On any rejection: destructive toast + station row turns
  // red + existing Retry button surfaces (extended in `handleRetry`).
  const loadStationData = async (ctrl) => {
    const t0 = Date.now();
    const data = loadedDataRef.current;
    const products = data.products || [];

    // Discover stations from products catalogue.
    const uniqueStations = stationService.extractUniqueStations(products);
    console.log('[LoadingPage] Available stations:', uniqueStations);

    if (uniqueStations.length === 0) {
      // No stations to load — mark SUCCESS with total 0 so the gate clears
      // without rendering a misleading row (renderer hides it on total=0).
      setStationStatus({
        status: LOADING_STATES.SUCCESS,
        error: null,
        loaded: 0,
        total: 0,
        elapsed: ((Date.now() - t0) / 1000).toFixed(1),
        startedAt: null,
      });
      return;
    }

    // Set available stations in context + initialize config.
    setAvailableStations(uniqueStations);
    initializeConfig(uniqueStations);

    // Get enabled stations (from localStorage or defaults).
    const savedConfig = stationService.getStationViewConfig();
    const stationsToLoad = savedConfig.stations?.length > 0
      ? savedConfig.stations.filter((s) => uniqueStations.includes(s))
      : uniqueStations;

    console.log('[LoadingPage] Loading station data for:', stationsToLoad);

    // Build categories map (category_id -> category_name) for the per-station
    // aggregation inside fetchStationData.
    const categories = data.categories || [];
    const categoriesMap = {};
    categories.forEach((cat) => {
      if (cat.categoryId) {
        categoriesMap[cat.categoryId] = cat.categoryName;
        categoriesMap[String(cat.categoryId)] = cat.categoryName;
      }
    });

    if (savedConfig.enabled === false || stationsToLoad.length === 0) {
      // Station view disabled OR all stations filtered out — skip fetch,
      // mark SUCCESS with total 0 (umbrella row will be hidden by the
      // renderer because total === 0).
      setStationStatus({
        status: LOADING_STATES.SUCCESS,
        error: null,
        loaded: 0,
        total: 0,
        elapsed: ((Date.now() - t0) / 1000).toFixed(1),
        startedAt: null,
      });
      return;
    }

    // Enter LOADING state with the now-known total.
    setStationStatus({
      status: LOADING_STATES.LOADING,
      error: null,
      loaded: 0,
      total: stationsToLoad.length,
      elapsed: null,
      startedAt: t0,
    });

    // Fire fetches in parallel; use allSettled so partial failures don't
    // short-circuit successful ones.
    const stationPromises = stationsToLoad.map((station) =>
      stationService.fetchStationData(station, categoriesMap)
    );

    let settled;
    try {
      settled = await Promise.allSettled(stationPromises);
    } catch (error) {
      // Should never happen with allSettled, but guard defensively.
      if (ctrl?.aborted) return;
      console.error('[LoadingPage] Unexpected station-batch error:', error);
      setStationStatus({
        status: LOADING_STATES.ERROR,
        error: error.message || 'Failed to load kitchen stations',
        loaded: 0,
        total: stationsToLoad.length,
        elapsed: ((Date.now() - t0) / 1000).toFixed(1),
        startedAt: null,
      });
      toast({
        title: 'Failed to load kitchen stations',
        description: error.readableMessage || error.message || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }

    if (ctrl?.aborted) return;

    // Partition results.
    const stationDataObj = {};
    const errors = [];
    settled.forEach((result, idx) => {
      const station = stationsToLoad[idx];
      if (result.status === 'fulfilled') {
        const value = result.value || {};
        // fetchStationData catches its own errors and returns a placeholder
        // with `error` set; treat that as a failure too.
        if (value.error) {
          errors.push({ station, message: value.error });
        } else {
          stationDataObj[station] = value;
        }
      } else {
        errors.push({ station, message: result.reason?.message || 'Unknown error' });
      }
    });

    setAllStationData(stationDataObj);

    if (errors.length > 0) {
      const summary = errors.length === stationsToLoad.length
        ? 'All kitchen stations failed to load.'
        : `${errors.length} of ${stationsToLoad.length} kitchen stations failed to load.`;
      setStationStatus({
        status: LOADING_STATES.ERROR,
        error: summary,
        loaded: stationsToLoad.length - errors.length,
        total: stationsToLoad.length,
        elapsed: ((Date.now() - t0) / 1000).toFixed(1),
        startedAt: null,
      });
      toast({
        title: 'Failed to load kitchen stations',
        description: `${summary} (${errors.map((e) => e.station).join(', ')})`,
        variant: 'destructive',
      });
      return;
    }

    setStationStatus({
      status: LOADING_STATES.SUCCESS,
      error: null,
      loaded: stationsToLoad.length,
      total: stationsToLoad.length,
      elapsed: ((Date.now() - t0) / 1000).toFixed(1),
      startedAt: null,
    });
    console.log('[LoadingPage] Station data loaded:', stationDataObj);
  };

  // Update status for a specific API
  const updateStatus = useCallback((key, status, error = null, loaded = 0, total = 0, extra = {}) => {
    setLoadingStatus((prev) => ({
      ...prev,
      [key]: { ...prev[key], status, error, loaded, total, ...extra },
    }));
  }, []);

  // ---------- Individual API loaders ----------
  // Each returns the fetched data so callers can chain

  const loadProfile = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('profile', LOADING_STATES.LOADING, null, 0, 1, { startedAt: t0 });
    try {
      data.profile = await profileService.getProfile();
      if (ctrl.aborted) return;
      
      // Debug: Log permissions for analysis
      console.log('[LoadingPage] User Profile:', {
        user: data.profile.user,
        roleName: data.profile.user?.roleName,
        permissions: data.profile.permissions,
      });
      console.table(data.profile.permissions?.map((p, i) => ({ index: i, permission: p })) || []);
      
      setUserData(data.profile.user, data.profile.permissions);
      setRestaurant(data.profile.restaurant);

      // DEBUG (Apr-2026): one-time profile/settings snapshot to diagnose
      // auto-bill / auto-kot / auto-SC gate issues. Remove after Issue 3d is
      // resolved.
      console.log('[LoadingPage] Restaurant settings snapshot (cooked):', {
        autoServiceCharge:       data.profile.restaurant?.autoServiceCharge,
        serviceChargePercentage: data.profile.restaurant?.serviceChargePercentage,
        autoKot:                 data.profile.restaurant?.settings?.autoKot,
        autoBill:                data.profile.restaurant?.settings?.autoBill,
        aggregatorAutoKot:       data.profile.restaurant?.settings?.aggregatorAutoKot,
        fullSettings:            data.profile.restaurant?.settings,
      });
      console.log('[LoadingPage] Raw profile API response:', data.profile);

      // BUG-098: CRM token already set from login response (authService.login -> setCrmToken).
      // setCrmRestaurantId now only sets restaurant context for logging.
      if (data.profile.restaurant?.id) {
        setCrmRestaurantId(data.profile.restaurant.id);
      }
      updateStatus('profile', LOADING_STATES.SUCCESS, null, 1, 1, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('profile', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 1, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load profile", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadCategories = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('categories', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      data.categories = await categoryService.getCategories();
      if (ctrl.aborted) return;
      const count = data.categories?.length || 0;
      updateStatus('categories', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('categories', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load categories", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadProducts = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('products', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const productsResponse = await productService.getProducts({ limit: 500, offset: 1, type: 'all' });
      if (ctrl.aborted) return;
      data.products = productsResponse.products;
      const loadedCount = data.products?.length || 0;
      const totalCount = productsResponse.total || loadedCount;
      // CR pos_boot_api_parallelization (Option A1, May-2026): category↔product
      // item-count enrichment moved to `loadAllData` AFTER the parallel batch
      // settles, because `loadCategories` and `loadProducts` now race instead
      // of being sequenced. Enrichment requires both arrays to be present;
      // running it here would observe whichever side won the race.
      updateStatus('products', LOADING_STATES.SUCCESS, null, loadedCount, totalCount, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('products', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load products", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadTables = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('tables', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      data.tables = await tableService.getTables();
      if (ctrl.aborted) return;
      const count = data.tables?.length || 0;
      setTables(data.tables);
      updateStatus('tables', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('tables', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load tables", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadCancellationReasons = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('cancellationReasons', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const reasonsResponse = await settingsService.getCancellationReasons({ limit: 100, offset: 1 });
      if (ctrl.aborted) return;
      data.cancellationReasons = reasonsResponse.reasons;
      const count = data.cancellationReasons?.length || 0;
      setCancellationReasons(data.cancellationReasons);
      updateStatus('cancellationReasons', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('cancellationReasons', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load settings", description: error.readableMessage, variant: "destructive" });
    }
  };

  const loadRunningOrders = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('runningOrders', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      // Backend-authoritative role tier for running-orders fetch is the first
      // element of the permissions array (raw `role[0]` on the API).
      // Fallback 'Manager' covers the pre-setUserData race where permissions
      // may be empty.
      const roleParam = data.profile?.permissions?.[0] || 'Manager';
      data.runningOrders = await orderService.getRunningOrders(roleParam);
      if (ctrl.aborted) return;
      const count = data.runningOrders?.length || 0;
      setOrders(data.runningOrders);
      updateStatus('runningOrders', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('runningOrders', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load orders", description: error.readableMessage || error.message, variant: "destructive" });
    }
  };

  // Map keys → loader functions
  const loaderMap = {
    profile: loadProfile,
    categories: loadCategories,
    products: loadProducts,
    tables: loadTables,
    cancellationReasons: loadCancellationReasons,
    runningOrders: loadRunningOrders,
  };

  // CR pos_boot_api_parallelization — Option A1 (May-2026)
  // -----------------------------------------------------------------------
  // Two-tier load:
  //   Tier 1 (barrier): `profile` runs alone. It populates user, permissions,
  //                     restaurant, and CRM key — every downstream consumer
  //                     reads from it.
  //   Tier 2 (parallel): the remaining 6 loaders run together via
  //                     `Promise.allSettled`. Each loader already owns its
  //                     own try/catch, updates its own `LOADING_STATES.ERROR`
  //                     row, and surfaces its own toast — so `allSettled` is
  //                     the natural match (no exception bubbles up; no row
  //                     is short-circuited away).
  //
  // `handleRetry` re-enters via this same function with `onlyKeys` set to
  // the failed subset. The same Tier-1/Tier-2 split applies to that subset:
  // if profile failed, retry it first; then race whichever of the other
  // keys also failed.
  //
  // The category↔product item-count enrichment that used to live inline in
  // `loadProducts` now runs AFTER the parallel batch settles, gated on both
  // arrays being present (covers fresh load AND partial retry where one
  // side was already loaded in a previous attempt).
  const loadAllData = async (ctrl, onlyKeys = null) => {
    const data = loadedDataRef.current;

    const keysToLoad = onlyKeys || API_LOADING_ORDER.map(i => i.key);

    // ----- Tier 1: profile barrier (only if requested in this run) -----
    if (keysToLoad.includes('profile')) {
      if (ctrl.aborted) return;
      await loadProfile(ctrl, data);
      if (ctrl.aborted) return;
    }

    // ----- Tier 2: everything else, in parallel -----
    const parallelKeys = keysToLoad.filter(k => k !== 'profile');
    const parallelLoaders = parallelKeys
      .map(key => loaderMap[key])
      .filter(Boolean)
      .map(loader => loader(ctrl, data));

    if (parallelLoaders.length > 0) {
      await Promise.allSettled(parallelLoaders);
    }

    if (ctrl.aborted) return;

    // ----- Post-batch: category↔product enrichment -----
    // Was inline in `loadProducts`; moved here so it observes the settled
    // state of BOTH arrays regardless of which one resolved first. Guarded
    // so it is a no-op when either side errored on this run AND was not
    // previously loaded (partial-retry safety).
    if (data.categories && data.products) {
      data.categories = categoryService.calculateItemCounts(data.categories, data.products);
    }

    // Dispatch Menu context (safe to re-call even on retry)
    if (data.categories) setCategories(data.categories);
    if (data.products) setProducts(data.products);

    loadedDataRef.current = data;
  };

  // Smart retry — only re-run failed APIs.
  // CR station_api_visible_loading (May-2026): also retries the station
  // phase if its umbrella row is in ERROR state. Profile is NOT re-run
  // unless profile itself failed in Phase 1 (existing two-tier guarantee).
  // If only the station row failed, Phase 1 is not re-run; the progress
  // effect will auto-launch the station phase again because
  // stationStatus.status returns to IDLE.
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    const failedKeys = API_LOADING_ORDER
      .map(i => i.key)
      .filter(key => loadingStatus[key].status === LOADING_STATES.ERROR);

    const stationFailed = stationStatus.status === LOADING_STATES.ERROR;

    // Reset only failed items back to IDLE
    if (failedKeys.length > 0) {
      setLoadingStatus(prev => {
        const next = { ...prev };
        for (const key of failedKeys) {
          next[key] = mkIdle();
        }
        return next;
      });
    }

    // Reset station row & the "will-attempt" decision if station failed,
    // so the progress effect re-evaluates after Phase 1 (re-)completes.
    if (stationFailed) {
      willAttemptStationsRef.current = false;
      setStationStatus(mkIdle());
    }

    setIsComplete(false);
    setHasError(false);

    // Fresh controller for the retry pass so a logout during the original
    // load doesn't carry over.
    const ctrl = { aborted: false };
    ctrlRef.current = ctrl;

    if (failedKeys.length > 0) {
      loadAllData(ctrl, failedKeys);
    }
    // Station phase re-launches automatically via the progress effect when
    // Phase 1 is terminal-and-clean. No explicit call needed here.
  };

  // Get icon for status
  const getStatusIcon = (status) => {
    switch (status) {
      case LOADING_STATES.SUCCESS:
        return <Check className="w-5 h-5 text-green-500" />;
      case LOADING_STATES.LOADING:
        return <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />;
      case LOADING_STATES.ERROR:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  // Get count display text with timing
  const getCountText = (statusObj) => {
    const { status, loaded, total, elapsed, startedAt } = statusObj;

    // Live timer while loading
    if (status === LOADING_STATES.LOADING && startedAt) {
      const live = ((Date.now() - startedAt) / 1000).toFixed(1);
      const countPart = total > 0 ? `${loaded} of ${total} ` : '';
      return `${countPart}Loading... ${live}s`;
    }

    if (status === LOADING_STATES.SUCCESS) {
      const timePart = elapsed ? ` · ${elapsed}s` : '';
      if (total > 0 && loaded !== total) {
        return `${loaded} of ${total} loaded${timePart}`;
      }
      return `${loaded} loaded${timePart}`;
    }

    if (status === LOADING_STATES.ERROR) {
      const timePart = elapsed ? ` · ${elapsed}s` : '';
      return `Failed${timePart}`;
    }

    return "";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: COLORS.sectionBg }}
      data-testid="loading-screen"
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl shadow-lg"
        style={{ backgroundColor: COLORS.lightBg }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={GENIE_LOGO_URL}
            alt="Genie Logo"
            className="h-20 w-auto"
            data-testid="loading-logo"
          />
        </div>

        <p
          className="text-center text-sm mb-8"
          style={{ color: COLORS.grayText }}
        >
          Please wait while we set up your system
        </p>

        {/* Loading Checklist */}
        <div className="space-y-3 mb-8">
          {API_LOADING_ORDER.map((item) => {
            const statusObj = loadingStatus[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{
                  backgroundColor: statusObj.status === LOADING_STATES.SUCCESS
                    ? 'rgba(34, 197, 94, 0.1)'
                    : statusObj.status === LOADING_STATES.ERROR
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'transparent'
                }}
                data-testid={`loading-item-${item.key}`}
              >
                {getStatusIcon(statusObj.status)}
                <span
                  className="flex-1 text-sm"
                  style={{
                    color: statusObj.status === LOADING_STATES.SUCCESS
                      ? COLORS.primaryGreen
                      : statusObj.status === LOADING_STATES.ERROR
                      ? '#ef4444'
                      : COLORS.darkText
                  }}
                >
                  {item.label}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: statusObj.status === LOADING_STATES.SUCCESS
                      ? COLORS.primaryGreen
                      : statusObj.status === LOADING_STATES.ERROR
                      ? '#ef4444'
                      : COLORS.grayText
                  }}
                >
                  {getCountText(statusObj)}
                </span>
              </div>
            );
          })}

          {/* CR station_api_visible_loading (May-2026): one umbrella row
              covering the entire post-Phase-1 station-batch load. Hidden
              when station view is disabled OR no stations are discovered
              (total === 0 AND we haven't entered LOADING yet → no point
              showing a row that will only ever flash green at 0 of 0). */}
          {willAttemptStationsRef.current && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg transition-all"
              style={{
                backgroundColor: stationStatus.status === LOADING_STATES.SUCCESS
                  ? 'rgba(34, 197, 94, 0.1)'
                  : stationStatus.status === LOADING_STATES.ERROR
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'transparent'
              }}
              data-testid="loading-item-stations"
            >
              {getStatusIcon(stationStatus.status)}
              <span
                className="flex-1 text-sm"
                style={{
                  color: stationStatus.status === LOADING_STATES.SUCCESS
                    ? COLORS.primaryGreen
                    : stationStatus.status === LOADING_STATES.ERROR
                    ? '#ef4444'
                    : COLORS.darkText
                }}
              >
                Setting up kitchen stations…
              </span>
              <span
                className="text-xs"
                style={{
                  color: stationStatus.status === LOADING_STATES.SUCCESS
                    ? COLORS.primaryGreen
                    : stationStatus.status === LOADING_STATES.ERROR
                    ? '#ef4444'
                    : COLORS.grayText
                }}
              >
                {getCountText(stationStatus)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: COLORS.grayText }}>Progress</span>
            <span style={{ color: COLORS.darkText }}>{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: hasError ? '#ef4444' : COLORS.primaryGreen
              }}
            />
          </div>
        </div>

        {/* Error State — show error detail + Retry button */}
        {isComplete && hasError && (
          <div className="space-y-3">
            {/* Show error messages for failed items */}
            {API_LOADING_ORDER.filter(i => loadingStatus[i.key].status === LOADING_STATES.ERROR).map(item => (
              <div key={item.key} className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                <span className="font-semibold">{item.label}:</span>{' '}
                {loadingStatus[item.key].error || 'Unknown error'}
              </div>
            ))}
            {/* CR station_api_visible_loading (May-2026): include station
                phase in the error summary so the operator sees what went
                wrong without having to consult the toast log. */}
            {stationStatus.status === LOADING_STATES.ERROR && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                <span className="font-semibold">Kitchen Stations:</span>{' '}
                {stationStatus.error || 'Unknown error'}
              </div>
            )}
            {retryCount < MAX_RETRIES ? (
              <button
                onClick={handleRetry}
                className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: COLORS.primaryOrange }}
                data-testid="retry-button"
              >
                Retry Failed ({API_LOADING_ORDER.filter(i => loadingStatus[i.key].status === LOADING_STATES.ERROR).length + (stationStatus.status === LOADING_STATES.ERROR ? 1 : 0)}) — Attempt {retryCount + 1} of {MAX_RETRIES}
              </button>
            ) : (
              <div className="space-y-2" data-testid="retry-exhausted">
                <button
                  disabled
                  className="w-full py-3 rounded-lg font-semibold text-white transition-all opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: COLORS.grayText }}
                  data-testid="retry-button-disabled"
                >
                  Retry Failed — All attempts used
                </button>
                <p className="text-xs text-center px-4" style={{ color: '#ef4444' }}>
                  Unable to load after {MAX_RETRIES} attempts. Please contact support or check your internet connection and reload the page.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {isComplete && !hasError && (
          <p
            className="text-center text-sm"
            style={{ color: COLORS.primaryGreen }}
          >
            All data loaded! Redirecting...
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingPage;
