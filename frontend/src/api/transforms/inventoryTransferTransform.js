// CR-077: Inventory Transfer Transform (Phase 1)
export const fromAPI = {
  pendingQueues(response) {
    const d = response?.data || response || {};
    const normalize = (list) => (list || []).map(t => ({
      transferId: t.transfer_id,
      referenceCode: t.reference_code,
      type: t.type,
      status: t.status,
      fromRestaurantId: t.from_restaurant_id,
      toRestaurantId: t.to_restaurant_id,
      lineCount: t.line_count || 0,
      itemsCount: t.items_count || 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
    return {
      receivePending: normalize(d.receive_pending),
      myRequests: normalize(d.my_requests),
      disputePending: normalize(d.dispute_pending),
      approvalPending: normalize(d.approval_pending),
    };
  },

  transferDetails(response) {
    const d = response?.data || response || {};
    const t = d.transfer || {};
    const lines = (d.lines || []).map(l => {
      let segments = [];
      try {
        const meta = typeof l.meta_json === 'string' ? JSON.parse(l.meta_json) : l.meta_json;
        segments = meta?.segments || [];
      } catch { /* ignore parse errors */ }
      return {
        id: l.id,
        lineNo: l.line_no,
        stockTitle: l.source_stock_title,
        categoryId: l.source_category_id,
        requestedQty: l.requested_qty,
        requestedUnit: l.requested_unit,
        displayQty: l.quantity_display,
        displayUnit: l.display_unit,
        status: l.status,
        segments,
      };
    });
    return {
      transfer: {
        id: t.id,
        referenceCode: t.reference_code,
        status: t.status,
        type: t.type,
        fromRestaurantId: t.from_restaurant_id,
        toRestaurantId: t.to_restaurant_id,
        dispatchedBy: t.dispatched_by,
        dispatchedAt: t.dispatched_at,
        receivedAt: t.received_at,
        resolutionType: t.resolution_type,
      },
      lines,
    };
  },
};
