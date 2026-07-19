// CR-072: Inventory Transform — fromAPI/toAPI normalizers
// Verified against live preprod data (18march: 429 ingredients, 427 stock items, 31 categories)
// CR-075-A P6 + CR-078: import formatDateForAPI for batch/expiry passthrough in addPurchase
import { formatDateForAPI } from './settlementTransform';

const fromAPI = {
  // A1: get-inventory-master → { data: [...] }
  ingredients(response) {
    const items = response?.data || [];
    return items.map(item => ({
      id: item.id,
      name: item.stock_title || '',
      categoryId: typeof item.category_id === 'object' ? item.category_id?.id : item.category_id,
      categoryName: typeof item.category_id === 'object' ? item.category_id?.name : null,
      unit: item.unit || '',
      unitId: item.unit_id || null,
      smallUnit: item.small_unit || '',
      conversionFactor: Number(item.converion_factor) || 1, // R9 typo: converion_factor
      hasUnitConversion: !!item.has_unit_conversion,
      consumptionUnit: item.consumption_unit || '',
      consumptionUnitId: item.consumption_unit_id || null,
      quantity: Number(item.quantity) || 0,
      calQuantity: Number(item.cal_quantity) || 0,
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',
      minQtyAlert: Number(item.min_qty_alert) || 0,
      minUnitAlert: Number(item.min_unit_alert) || 0,
      type: item.type || 'inventory',
      isPushedManaged: !!item.is_pushed_managed,
    }));
  },

  // A3: stock-item-categories → { success, data: [...] }
  categories(response) {
    const items = response?.data || [];
    return items.map(cat => ({
      id: cat.id,
      name: cat.category_name || '',
      type: cat.type || 'inventory',
      parentId: cat.p_catid || null,
      restaurantId: cat.restaurant_id || null,
    }));
  },

  // B1: stock-inventory → { current_stocks: [...] }
  stockItems(response) {
    const items = response?.current_stocks || [];
    return items.map(item => ({
      id: item.id,
      name: item.stock_title || '',
      categoryId: item.category_id,
      categoryName: item.category_name || '',
      unit: item.unit || '',
      unitId: item.unit_id || null,
      smallUnit: item.small_unit || '',
      conversionFactor: Number(item.converion_factor) || 1, // R9 typo
      hasUnitConversion: !!item.has_unit_conversion,
      consumptionUnit: item.consumption_unit || '',
      consumptionUnitId: item.consumption_unit_id || null,
      quantity: Number(item.quantity) || 0,
      calQuantity: Number(item.cal_quantity) || 0,
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',
      physicalQty: Number(item.physical_qty) || 0,
      minQtyAlert: Number(item.min_qty_alert) || 0,
      minUnitAlert: Number(item.min_unit_alert) || 0,
      isLowStock: !!item.is_low_stock,
      isSubRecipe: !!item.is_sub_recipe,
      subrecipeId: item.subrecipe_id || null,
      recipeId: item.recipe_id || null,
      type: item.type || 'inventory',
      status: item.status,
      stockRole: item.stock_role || null,
      vendorId: item.vendor_id || null,
      vendorName: item.vendor_name || '',
    }));
  },

  // B8: vendor-type → raw array (not wrapped in object)
  vendorTypes(response) {
    const items = Array.isArray(response) ? response : (response?.data || []);
    return items.map(v => ({
      id: v.id,
      name: v.name || '',
      description: v.description || '',
    }));
  },

  // B10: wastage-reasons — BUG-197 #3: supports both legacy + new list endpoint shapes
  wastageReasons(response) {
    const items = response?.reasons || response?.data?.reasons || response?.data || [];
    return items.map(r => ({
      id: r.id,
      reason: r.reason || '',
      status: r.status !== undefined ? Number(r.status) : 1,
    }));
  },

  // B2: unit-inventory/{id} → units for ingredient
  unitInventory(response) {
    return response?.data || response || [];
  },
};

const toAPI = {
  // A2: add-inventory — accepts array
  addIngredient(data) {
    return [{
      category_id: data.categoryId,
      stock_title: data.name,
      unit: data.unit,
      small_unit: data.smallUnit || '',
      minimun_stock_alert: data.minQtyAlert || 0, // R9 typo: minimun
      min_unit_alert: data.minUnitAlert || 0,
    }];
  },

  // B5: add-purchase — multi-line
  // CR-075-A P6 (folded): batch + expiry_date passthrough (backend accepts, previously silently dropped)
  // CR-078: origin field (planner|ad_hoc|legacy) — future backend brief Q7-b
  addPurchase(data) {
    return {
      vendor_name: data.vendorName || '',
      vendor_id: data.vendorId || null,
      purchase_date: data.purchaseDate, // "DD-MM-YYYY" format per R9
      payment_method: data.paymentMethod || '',
      invoice_number: data.invoiceNumber || '',
      notes: data.notes || '',
      purchase_items: (data.items || []).map(item => ({
        Ingredient: item.ingredientId, // R9: capital I
        Unit: item.unit,               // R9: capital U
        quantity: item.quantity,
        rate: item.rate,
        Amount: item.amount,           // BUG-197 #6: capital A per backend contract
        converion_factor: item.conversionFactor || 1, // R9 typo
        batch: item.batch || '',                                                          // CR-075-A P6
        expiry_date: item.expiry ? formatDateForAPI(item.expiry) : '',                    // CR-075-A P6 (DD-MM-YYYY)
        origin: item.origin || 'legacy',                                                  // CR-078
      })),
    };
  },

  // B3: update-stock/{id}
  updateStock(data) {
    return {
      min_qty_alert: data.minQtyAlert || 0,
      min_unit_alert: data.minUnitAlert || 0,
    };
  },

  // B4: add-stock/{id} — physical count / adjustment
  addStock(data) {
    return {
      quantity: data.quantity,
      reason: data.reason || '',
      wastage_reason_id: data.wastageReasonId || null,
      notes: data.notes || '',
    };
  },

  // A4: store-category
  storeCategory(data) {
    return {
      category_name: data.name,
      type: 'inventory',
    };
  },

  // BUG-197 #2: add-vendor
  addVendor(data) {
    return {
      vendor_name: data.name,
      contact_person: data.contactPerson || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      vendor_type_id: data.typeId || null,
      gst_number: data.gst || '',
    };
  },

  // BUG-197 #3: wastage CRUD
  addWastageReason(data) { return { reason: data.reason }; },
  updateWastageReason(data) { return { reason: data.reason }; },
  toggleWastageStatus(status) { return { status }; },
};

export { fromAPI, toAPI };
