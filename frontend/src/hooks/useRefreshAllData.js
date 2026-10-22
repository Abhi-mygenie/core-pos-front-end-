// useRefreshAllData — Refreshes volatile data without re-login
// Scope: Tables → Categories + Products (parallel) → POS Orders + Aggregator Orders
// Skips: Profile/Permissions (session-sensitive), Cancellation Reasons (static)

import { useCallback } from 'react';
import { useMenu } from '../contexts/MenuContext';
import { useTables } from '../contexts/TableContext';
import { useOrders } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import * as categoryService from '../api/services/categoryService';
import * as productService from '../api/services/productService';
import * as tableService from '../api/services/tableService';
import * as orderService from '../api/services/orderService';
import { getAggregatorOrderList } from '../api/services/aggregatorService'; // BUG-599
import { fromAPI as aggregatorFromAPI } from '../api/transforms/aggregatorTransform'; // BUG-599
import { PAGINATION } from '../api/constants'; // BUG-451

export const useRefreshAllData = () => {
  const { setCategories, setProducts } = useMenu();
  const { setTables } = useTables();
  const { setOrders } = useOrders(); // BUG-599 Rev2: full replace with combined POS+aggregator
  const { permissions } = useAuth();

  return useCallback(async () => {
    // Step A: Tables first — fastest, no dependencies
    const freshTables = await tableService.getTables(true);
    setTables(freshTables);

    // Step B: Categories + Products in parallel
    const [catResult, prodResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: PAGINATION.DEFAULT_LIMIT, offset: 1, type: 'all' }), // BUG-451
    ]);

    // Cross-calculate item counts (same pattern as LoadingPage)
    const enrichedCategories = categoryService.calculateItemCounts(
      catResult,
      prodResult.products
    );
    setCategories(enrichedCategories);
    setProducts(prodResult.products);

    // Step C: POS Orders + Aggregator Orders in parallel — BUG-599
    const roleParam = permissions?.[0] || 'Manager';
    const [freshOrders, aggResult] = await Promise.allSettled([
      orderService.getRunningOrders(roleParam),
      getAggregatorOrderList().then(res => aggregatorFromAPI.aggregatorOrderList(res)),
    ]);

    const posOrders = freshOrders.status === 'fulfilled' ? freshOrders.value : [];
    const aggOrders = aggResult.status === 'fulfilled' ? aggResult.value : [];
    if (aggResult.status === 'rejected') {
      console.warn('[useRefreshAllData] BUG-599: Aggregator refresh failed (non-blocking):', aggResult.reason?.message);
    }
    setOrders([...posOrders, ...aggOrders]); // BUG-599: combined replace
  }, [setCategories, setProducts, setTables, setOrders, permissions]); // BUG-599 Rev2
};
