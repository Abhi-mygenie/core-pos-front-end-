import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { mockOrderItems } from "../data";

const TableOrderContext = createContext(null);

// Deterministic price from item name (so prices stay consistent across transfers/merges)
const getItemPrice = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
  }
  return 100 + Math.abs(hash % 400);
};

// Initialize orders from mock data with prices
const buildInitialOrders = () => {
  const orders = {};
  Object.entries(mockOrderItems).forEach(([tableId, data]) => {
    orders[tableId] = {
      waiter: data.waiter,
      customer: data.customer,
      phone: data.phone,
      items: data.items.map((item) => ({
        ...item,
        price: getItemPrice(item.name),
        placed: true,
        addedAt: new Date(Date.now() - item.time * 60000).toISOString(),
      })),
    };
  });
  return orders;
};

export const TableOrderProvider = ({ children, onUpdateTableStatus }) => {
  const [tableOrders, setTableOrders] = useState(buildInitialOrders);

  // Get order data for a table (items + metadata)
  const getTableOrder = useCallback(
    (tableId) => tableOrders[tableId] || null,
    [tableOrders]
  );

  // Sync cart items back to context (called by useCartManager on changes)
  const syncTableItems = useCallback((tableId, items) => {
    setTableOrders((prev) => ({
      ...prev,
      [tableId]: {
        ...(prev[tableId] || { waiter: "", customer: "", phone: "" }),
        items,
      },
    }));
  }, []);

  // Cancel items (partial qty)
  const cancelItems = useCallback((tableId, itemId, cancelQty) => {
    setTableOrders((prev) => {
      const order = prev[tableId];
      if (!order) return prev;
      const updatedItems = [];
      for (const item of order.items) {
        if (item.id === itemId) {
          const remaining = item.qty - cancelQty;
          if (remaining > 0) updatedItems.push({ ...item, qty: remaining });
        } else {
          updatedItems.push(item);
        }
      }
      return { ...prev, [tableId]: { ...order, items: updatedItems } };
    });
  }, []);

  // Transfer items between tables
  const transferItems = useCallback(
    (fromTableId, toTableId, item, transferQty) => {
      setTableOrders((prev) => {
        const fromOrder = prev[fromTableId];
        if (!fromOrder) return prev;
        const toOrder = prev[toTableId] || {
          waiter: "",
          customer: "",
          phone: "",
          items: [],
        };

        // Reduce from source
        const updatedFromItems = [];
        for (const i of fromOrder.items) {
          if (i.id === item.id) {
            const remaining = i.qty - transferQty;
            if (remaining > 0) updatedFromItems.push({ ...i, qty: remaining });
          } else {
            updatedFromItems.push(i);
          }
        }

        // Add to destination - merge if same item name exists
        const existingIdx = toOrder.items.findIndex(
          (i) => i.name === item.name
        );
        let updatedToItems;
        if (existingIdx >= 0) {
          updatedToItems = toOrder.items.map((i, idx) =>
            idx === existingIdx ? { ...i, qty: i.qty + transferQty } : i
          );
        } else {
          updatedToItems = [
            ...toOrder.items,
            {
              ...item,
              qty: transferQty,
              id: Date.now(),
              placed: true,
              addedAt: new Date().toISOString(),
            },
          ];
        }

        // If destination was empty and now has items, update its status
        if (toOrder.items.length === 0 && updatedToItems.length > 0) {
          onUpdateTableStatus?.(toTableId, "occupied");
        }

        return {
          ...prev,
          [fromTableId]: { ...fromOrder, items: updatedFromItems },
          [toTableId]: { ...toOrder, items: updatedToItems },
        };
      });
    },
    [onUpdateTableStatus]
  );

  // Shift entire table
  const shiftTable = useCallback(
    (fromTableId, toTableId) => {
      setTableOrders((prev) => {
        const fromOrder = prev[fromTableId];
        if (!fromOrder) return prev;
        return {
          ...prev,
          [toTableId]: { ...fromOrder },
          [fromTableId]: { waiter: "", customer: "", phone: "", items: [] },
        };
      });
      onUpdateTableStatus?.(fromTableId, "available");
      onUpdateTableStatus?.(toTableId, "occupied");
    },
    [onUpdateTableStatus]
  );

  // Merge tables into primary
  const mergeTables = useCallback(
    (primaryTableId, sourceTableIds) => {
      setTableOrders((prev) => {
        const primaryOrder = prev[primaryTableId] || {
          waiter: "",
          customer: "",
          phone: "",
          items: [],
        };
        const mergedItems = [...primaryOrder.items];

        sourceTableIds.forEach((tableId) => {
          const order = prev[tableId];
          if (!order) return;
          order.items.forEach((item) => {
            const existing = mergedItems.find((i) => i.name === item.name);
            if (existing) {
              existing.qty += item.qty;
            } else {
              mergedItems.push({
                ...item,
                id: Date.now() + Math.random(),
                placed: true,
              });
            }
          });
        });

        const updated = {
          ...prev,
          [primaryTableId]: { ...primaryOrder, items: mergedItems },
        };
        sourceTableIds.forEach((tableId) => {
          updated[tableId] = {
            waiter: "",
            customer: "",
            phone: "",
            items: [],
          };
        });
        return updated;
      });

      // Update statuses
      sourceTableIds.forEach((tableId) =>
        onUpdateTableStatus?.(tableId, "available")
      );
    },
    [onUpdateTableStatus]
  );

  const value = useMemo(
    () => ({
      tableOrders,
      getTableOrder,
      syncTableItems,
      cancelItems,
      transferItems,
      shiftTable,
      mergeTables,
    }),
    [
      tableOrders,
      getTableOrder,
      syncTableItems,
      cancelItems,
      transferItems,
      shiftTable,
      mergeTables,
    ]
  );

  return (
    <TableOrderContext.Provider value={value}>
      {children}
    </TableOrderContext.Provider>
  );
};

export const useTableOrders = () => {
  const ctx = useContext(TableOrderContext);
  if (!ctx)
    throw new Error("useTableOrders must be used within TableOrderProvider");
  return ctx;
};
