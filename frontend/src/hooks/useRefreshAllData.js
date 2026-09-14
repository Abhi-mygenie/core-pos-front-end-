// useRefreshAllData — Refreshes volatile data without re-login
// Scope: Tables → Categories + Products (parallel) → Orders
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

export const useRefreshAllData = () => {
  const { setCategories, setProducts } = useMenu();
  const { setTables } = useTables();
  const { setOrders } = useOrders();
  const { permissions } = useAuth();

  return useCallback(async () => {
    // Step A: Tables first — fastest, no dependencies
    const freshTables = await tableService.getTables(true);
    setTables(freshTables);

    // Step B: Categories + Products in parallel
    const [catResult, prodResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: 500, offset: 1, type: 'all' }),
    ]);

    // Cross-calculate item counts (same pattern as LoadingPage)
    const enrichedCategories = categoryService.calculateItemCounts(
      catResult,
      prodResult.products
    );
    setCategories(enrichedCategories);
    setProducts(prodResult.products);

    // Step C: Orders last — backend-authoritative role tier is permissions[0]
    // (raw `role[0]`). Fallback 'Manager' for safety.
    const roleParam = permissions?.[0] || 'Manager';
    const freshOrders = await orderService.getRunningOrders(roleParam);
    setOrders(freshOrders);
  }, [setCategories, setProducts, setTables, setOrders, permissions]);
};
