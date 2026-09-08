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
      conversionFactor: item.has_unit_conversion ? (Number(item.converion_factor) || '') : '', // BUG-275: no default 1
      hasUnitConversion: !!item.has_unit_conversion,
      consumptionUnit: item.consumption_unit || '',
      consumptionUnitId: item.consumption_unit_id || null,
      quantity: Number(item.quantity) || 0,
      calQuantity: Number(item.cal_quantity) || 0,
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',
      minQtyAlert: Number(item.min_qty_alert) || 0,
      minUnitAlert: item.min_unit_alert || '', // BUG-219: unit string ('gm'), not a number
      type: item.type || 'inventory',
      isPushedManaged: !!item.is_pushed_managed,
      isSubRecipe: !!item.is_sub_recipe,         // CR-139 Phase A (BUG-312)
      subrecipeId: item.subrecipe_id || null,    // CR-139 Phase A (BUG-312)
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
  // BUG-211: de-duplicate by id (backend sometimes returns duplicate entries)
  stockItems(response) {
    const items = response?.current_stocks || [];
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).map(item => ({
      id: item.id,
      name: item.stock_title || '',
      categoryId: item.category_id,
      categoryName: item.category_name || '',
      unit: item.unit || '',
      unitId: item.unit_id || null,
      smallUnit: item.small_unit || '',
      conversionFactor: item.has_unit_conversion ? (Number(item.converion_factor) || '') : '', // BUG-275: no default 1
      hasUnitConversion: !!item.has_unit_conversion,
      consumptionUnit: item.consumption_unit || '',
      consumptionUnitId: item.consumption_unit_id || null,
      quantity: Number(item.quantity) || 0,
      calQuantity: Number(item.cal_quantity) || 0,
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',
      physicalQty: Number(item.physical_qty) || 0,
      minQtyAlert: Number(item.min_qty_alert) || 0,
      minUnitAlert: item.min_unit_alert || '', // BUG-219: unit string ('gm'), not a number
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

  // CR-084: vendor list from GET /get-vendor
  vendors(response) {
    const items = Array.isArray(response) ? response : (response?.data || []);
    return items.map(v => ({
      id: v.id,
      name: v.vendor_name || '',
      contactPerson: v.contact_person_name || '',
      phone: v.contact_number || '',
      email: v.email || '',
      address: v.address || '',
      vendorType: v.vendor_type || '',
      gst: v.gst_no || '',
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
  // CR-102: G-020 alignment — send consumption_unit alongside converion_factor
  addIngredient(data) {
    // BUG-269-A + BUG-275: Only send conversion when units differ AND not auto-mapped (kg/ltr/gm/ml)
    const isAutoUnit = ['kg','ltr','litre','gm','ml'].includes((data.unit || '').toLowerCase());
    const hasConversion = !isAutoUnit && data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0 && data.unit !== data.smallUnit;
    return [{
      category_id: data.categoryId,
      stock_title: data.name,
      unit: data.unit,
      small_unit: data.smallUnit || '',
      minimun_stock_alert: String(data.minQtyAlert || 0), // R9 typo: minimun — BUG-197 B2-5: must be string
      min_unit_alert: data.minUnitAlert || '',     // BUG-219: unit string; BUG-197 B2-5 string req still met
      ...(hasConversion ? {
        consumption_unit: data.smallUnit,                        // CR-102: G-020 requires this with factor
        converion_factor: String(data.conversionFactor),         // R9 typo preserved
      } : {}),
    }];
  },

  // BUG-212: update-inventory/{id} — PUT payload
  // CR-102: G-020 alignment — send consumption_unit alongside converion_factor
  updateIngredient(data) {
    // BUG-269-A + BUG-275: Only send conversion when units differ AND not auto-mapped (kg/ltr/gm/ml)
    const isAutoUnit = ['kg','ltr','litre','gm','ml'].includes((data.unit || '').toLowerCase());
    const hasConversion = !isAutoUnit && data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0 && data.unit !== data.smallUnit;
    return {
      stock_title: data.name || '',
      category_id: data.categoryId,
      unit: data.unit || '',
      small_unit: data.smallUnit || '',
      ...(hasConversion ? {
        consumption_unit: data.smallUnit,                        // CR-102: G-020 requires this with factor
        converion_factor: String(data.conversionFactor),         // R9 typo preserved
      } : {}),
      minimun_stock_alert: String(data.minQtyAlert || 0),   // R9 typo preserved
      min_unit_alert: data.minUnitAlert || '', // BUG-219: unit string
      reason: 'update',
    };
  },

  // B5: add-purchase — multi-line
  // CR-075-A P6 (folded): batch + expiry_date passthrough (backend accepts, previously silently dropped)
  // CR-078: origin field (planner|ad_hoc|legacy) — future backend brief Q7-b
  // BUG-244: payment_method→payment_type, +tot_amount/item_total/tot_fair/tot_tax, removed converion_factor
  // CR-100: payment_type now enum (paid|partial|unpaid), +partial_payments[], notes dropped (ignored by endpoint)
  addPurchase(data) {
    const items = data.items || [];
    const totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0); // BUG-244
    const splits = data.splits || []; // CR-100
    return {
      vendor_name: data.vendorName || '',
      vendor_id: data.vendorId || null,
      purchase_date: data.purchaseDate, // "DD-MM-YYYY" format per R9
      payment_type: data.paymentType || 'paid',   // CR-100: enum 'paid'|'partial'|'unpaid' (was PM name string via data.paymentMethod)
      invoice_number: data.invoiceNumber || '',
      // notes: intentionally omitted — ignored by this endpoint (CR-100, owner decision 2026-08-08)
      tot_amount: totalAmount,                     // BUG-244: required
      item_total: totalAmount,                     // BUG-244: required
      tot_fair: 0,                                 // BUG-244: required
      tot_tax: 0,                                  // BUG-244: required
      partial_payments: splits.map(s => ({         // CR-100: payment split rows
        payment_mode: s.method,
        amount: s.amount,
        ...(s.refId ? { transaction_id: s.refId } : {}),
      })),
      purchase_items: items.map(item => ({
        Ingredient: item.ingredientId, // R9: capital I
        Unit: item.unit,               // R9: capital U
        quantity: item.quantity,
        rate: item.rate,
        Amount: item.amount,           // BUG-197 #6: capital A per backend contract
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
      min_unit_alert: data.minUnitAlert || '', // BUG-219
    };
  },

  // B4 + BUG-379: add-stock/{id} — physical count (mirrors addSubRecipeStock pattern)
  // physicalqty_master + physical_qty included ONLY when data.physicalQty is explicitly passed
  // quantity = 0 for count-only (no purchase add). waste_reason for audit trail.
  addStock(data) {
    const hasRecount = data.physicalQty != null;
    return {
      quantity: data.quantity ?? 0,
      unit: data.unit || '',
      ...(hasRecount ? { physicalqty_master: true, physical_qty: data.physicalQty } : {}),
      ...(hasRecount && data.reason ? { waste_reason: data.reason } : {}),
      wastage_reason_id: data.wastageReasonId || null,
      notes: data.notes || '',
    };
  },

  // BUG-SRSTOCK: mode-aware payload — produce (quantity only) vs recount (physical_qty when shelf ≠ book)
  // physical_qty included ONLY when data.physicalQty is explicitly passed (not null/undefined)
  // NEVER include physical_qty: 0 as placeholder — 0 is a valid shelf count that triggers huge loss
  // waste_reason sent only alongside physical_qty (produce mode has no wastage row)
  addSubRecipeStock(data) {
    const hasRecount = data.physicalQty != null;
    return {
      sub_recipe_id: data.subRecipeId,
      quantity: data.quantity,
      unit: data.unit || '',
      ...(hasRecount ? { physical_qty: data.physicalQty } : {}),
      ...(hasRecount && data.reason ? { waste_reason: data.reason } : {}),
      ...(data.batch ? { batch: data.batch } : {}),
      ...(data.expiry ? { expiry_date: data.expiry } : {}),
    };
  },

  // A4: store-category
  storeCategory(data) {
    return {
      category_name: data.name,
      type: 'inventory',
    };
  },

  // CR-084: Fixed vendor payload — matches actual backend contract
  vendorPayload(data) {
    return {
      vendor_name: data.name || '',
      contact_person_name: data.contactPerson || '',
      contact_number: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      vendor_type: data.vendorType || null,
      gst_no: data.gst || '',
    };
  },

  // BUG-197 #3: wastage CRUD
  addWastageReason(data) { return { reason: data.reason }; },
  updateWastageReason(data) { return { reason: data.reason }; },
  toggleWastageStatus(status) { return { status }; },
};

export { fromAPI, toAPI };
