// useRefreshAllData — Refreshes volatile data without re-login
// Scope: Tables → Categories + Products + Popular (parallel) → Orders
// Skips: Profile/Permissions (session-sensitive), Cancellation Reasons (static)

import { useCallback } from 'react';
import { useMenu } from '../contexts/MenuContext';
import { useTables } from '../contexts/TableContext';
import { useOrders } from '../contexts/OrderContext';
import * as categoryService from '../api/services/categoryService';
import * as productService from '../api/services/productService';
import * as tableService from '../api/services/tableService';
import * as orderService from '../api/services/orderService';

export const useRefreshAllData = () => {
  const { setCategories, setProducts, setPopularFood } = useMenu();
  const { setTables } = useTables();
  const { setOrders } = useOrders();

  return useCallback(async (userRole = 'Owner') => {
    // Step A: Tables first — fastest, no dependencies
    const freshTables = await tableService.getTables(true);
    setTables(freshTables);

    // Step B: Categories + Products + Popular in parallel
    const [catResult, prodResult, popResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: 500, offset: 1, type: 'all' }),
      productService.getPopularFood({ limit: 50, offset: 1, type: 'all' }),
    ]);

    // Cross-calculate item counts (same pattern as LoadingPage)
    const enrichedCategories = categoryService.calculateItemCounts(
      catResult,
      prodResult.products
    );
    setCategories(enrichedCategories);
    setProducts(prodResult.products);
    setPopularFood(popResult.products);

    // Step C: Orders last — enrichment uses fresh table + order data
    const roleParam = orderService.getOrderRoleParam(userRole);
    const freshOrders = await orderService.getRunningOrders(roleParam);
    setOrders(freshOrders);
  }, [setCategories, setProducts, setPopularFood, setTables, setOrders]);
};
