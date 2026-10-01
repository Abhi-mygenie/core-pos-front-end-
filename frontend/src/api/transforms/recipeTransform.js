// CR-072: Recipe Transform — fromAPI/toAPI normalizers
// Verified against live preprod data (18march: 64 recipes, 11 sub-recipes, 7 addon recipes)

const fromAPI = {
  // C1: get-recipe → { recipes: [...] }
  recipes(response) {
    const items = response?.recipes || [];
    return items.map(r => ({
      id: r.recipe_id,
      foodId: r.food_id || null,            // BUG-197 #7: needed for edit mode
      name: r.name || r.food_name || '',
      foodName: r.food_name || '',
      categoryName: r.category_name || '',
      type: r.type || 'standard',
      qty: Number(r.qty) || 0,
      unit: r.unit || '',
      preparationTime: r.preparation_time || '',
      serveTime: r.serve_time || '',
      servePeople: Number(r.serve_people) || 0,
      ingredients: (r.ingredients || []).map(ing => ({
        id: ing.ingredient_id || ing.id,
        name: ing.ingredient_name || ing.name || '',
        quantity: Number(ing.ingredient_qty || ing.quantity) || 0,
        unit: ing.ingredient_unit || ing.unit || '',
        cost: Number(ing.cost) || 0,
      })),
      isPushedManaged: !!r.is_pushed_managed,
    }));
  },

  // C5: sub-recipes → { sub_recipes: [...] }
  subRecipes(response) {
    const items = response?.sub_recipes || [];
    return items.map(r => ({
      id: r.recipe_id || r.id,
      name: r.name || '',
      foodName: r.food_name || '',
      categoryName: r.category_name || '',
      type: r.type || 'sub_recipe',
      qty: Number(r.qty) || 0,
      unit: r.unit || '',
      stockUnit: r.stock_unit || '',
      preparationTime: r.preparation_time || '',
      serveTime: r.serve_time || '',
      servePeople: Number(r.serve_people) || 0,
      inventoryId: r.inventory_id || null, // links to stock item (dual nature)
      currentStock: Number(r.current_stock) || 0,
      calQuantity: Number(r.cal_quantity) || 0,
      minQtyAlert: Number(r.min_qty_alert) || 0,
      minUnitAlert: Number(r.min_unit_alert) || 0,
      ingredients: (r.ingredients || []).map(ing => ({
        id: ing.ingredient_id || ing.id,
        name: ing.ingredient_name || ing.name || '',
        quantity: Number(ing.ingredient_qty || ing.quantity) || 0,
        unit: ing.ingredient_unit || ing.unit || '',
        cost: Number(ing.cost) || 0,
      })),
    }));
  },

  // D1: addon-recipe-list → { recipes: [...] }
  addonRecipes(response) {
    const items = response?.recipes || [];
    return items.map(r => ({
      id: r.recipe_id || r.id,
      addonId: r.addon_id || null, // links back to addon item
      name: r.name || r.addon_name || '',
      addonName: r.addon_name || '',
      addonPrice: Number(r.addon_price) || 0,
      foodName: r.food_name || '',
      type: r.type || 'addon',
      qty: Number(r.qty) || 0,
      unit: r.unit || '',
      preparationTime: r.preparation_time || '',
      serveTime: r.serve_time || '',
      servePeople: Number(r.serve_people) || 0,
      ingredients: (r.ingredients || []).map(ing => ({
        id: ing.ingredient_id || ing.id,
        name: ing.ingredient_name || ing.name || '',
        quantity: Number(ing.ingredient_qty || ing.quantity) || 0,
        unit: ing.ingredient_unit || ing.unit || '',
        cost: Number(ing.cost) || 0,
      })),
    }));
  },

  // D5: active-foods-list → { data: { foods: [...], total_count } }
  activeFoods(response) {
    const foods = response?.data?.foods || [];
    return foods.map(f => ({
      id: f.id,
      name: f.name || '',
      status: f.status,
      foodStatus: f.food_status,
      foodFor: f.food_for || '',
      sourceTable: f.source_table || 'food',
    }));
  },

  // BUG-197 B2-4: addon-list → { addons: [...] }
  activeAddons(response) {
    const addons = response?.addons || [];
    return addons.map(a => ({
      id: a.id,
      name: a.name || '',
      price: Number(a.price) || 0,
      status: a.status,
    }));
  },
};

const toAPI = {
  // C2: store-recipe — BUG-197 #4: name = food_id (integer), serves_people (with 's')
  storeRecipe(data) {
    return {
      name: data.foodId,                    // Backend expects food_id integer in 'name' field
      recipe_qty: data.qty,                 // BUG-197-A2: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A2: unit → recipe_unit
      preparation_time: data.preparationTime || '0', // BUG-197 B2-1: backend requires non-empty
      serve_time: data.serveTime || '0',             // BUG-197 B2-1: default to '0'
      serves_people: data.servePeople || 1, // 'serves' with s
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,               // Fix: backend expects 'id' not 'ingredient_id' (matches update contract)
        qty: ing.quantity,                   // Fix: backend expects 'qty' not 'quantity'
        unit: ing.unit,
      })),
    };
  },

  // C3: update-recipe — BUG-197 #5: PUT, different ingredient field names
  updateRecipe(data) {
    return {
      name: data.foodId,
      recipe_qty: data.qty,                 // BUG-197-A3: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A3: unit → recipe_unit
      preparation_time: data.preparationTime || '0', // BUG-197 B2-1: backend requires non-empty
      serve_time: data.serveTime || '0',             // BUG-197 B2-1: default to '0'
      serves_people: data.servePeople || 1,
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,               // 'id' not 'ingredient_id' (update contract)
        qty: ing.quantity,                   // 'qty' not 'quantity' (update contract)
        unit: ing.unit,
      })),
    };
  },

  // C6: store-sub-recipe — BUG-197-A4: field renames per backend contract
  storeSubRecipe(data) {
    return {
      sub_recipe_name: data.name,           // BUG-197-A4: name → sub_recipe_name
      qty: data.qty,
      subunit: data.unit,                   // BUG-197-A4: unit → subunit
      prepration_time: data.preparationTime || '0', // BUG-197-A4: R9 backend typo + B2-3: non-empty
      serve_time: data.serveTime || 0,      // BUG-197-A4: missing field
      serve_people: data.servePeople || 1,  // BUG-197-A4: missing field
      thershold_qty: data.thresholdQty || 0,  // BUG-197-A4: R9 backend typo "thershold"
      thershold_unit: data.thresholdUnit || '', // BUG-197-A4: R9 backend typo
      ingredient: (data.ingredients || []).map(ing => ({  // BUG-197 B2-3: key is singular 'ingredient'
        id: ing.ingredientId,               // Fix: backend expects 'id' not 'ingredient_id'
        qty: ing.quantity,                   // Fix: backend expects 'qty' not 'quantity'
        unit: ing.unit,
      })),
    };
  },

  // C7: update-sub-recipe — BUG-197-A5: field renames per backend contract
  updateSubRecipe(data) {
    return {
      sub_recipe_name: data.name,           // BUG-197-A5: name → sub_recipe_name
      qty: data.qty,
      subunit: data.unit,                   // BUG-197-A5: unit → subunit
      prepration_time: data.preparationTime || '0', // BUG-197-A5: R9 backend typo + non-empty
      serve_time: data.serveTime || 0,      // BUG-197-A5: missing field
      serve_people: data.servePeople || 1,  // BUG-197-A5: missing field
      thershold_qty: data.thresholdQty || 0,  // BUG-197-A5: R9 backend typo
      thershold_unit: data.thresholdUnit || '', // BUG-197-A5: R9 backend typo
      ingredient: (data.ingredients || []).map(ing => ({  // BUG-197 B2-3: key is singular 'ingredient'
        id: ing.ingredientId,
        qty: ing.quantity,
        unit: ing.unit,
      })),
    };
  },

  // D2: store-addon-recipe — BUG-197-A6: field renames per backend contract
  storeAddonRecipe(data) {
    return {
      addon_id: data.addonId,
      name: data.name,
      recipe_qty: data.qty,                 // BUG-197-A6: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A6: unit → recipe_unit
      preparation_time: data.preparationTime || 0, // BUG-197-A6: missing field
      serves_people: data.servePeople || 1, // BUG-197-A6: missing field
      serve_time: data.serveTime || 0,      // BUG-197-A6: missing field
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,               // Fix: backend expects 'id' not 'ingredient_id' (same as update contract)
        qty: ing.quantity,                   // Fix: backend expects 'qty' not 'quantity'
        unit: ing.unit,
      })),
    };
  },

  // D3: update-addon-recipe — BUG-197-A7: field renames per backend contract
  updateAddonRecipe(data) {
    return {
      addon_id: data.addonId,
      name: data.name,
      recipe_qty: data.qty,                 // BUG-197-A7: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A7: unit → recipe_unit
      preparation_time: data.preparationTime || 0, // BUG-197-A7: missing field
      serves_people: data.servePeople || 1, // BUG-197-A7: missing field
      serve_time: data.serveTime || 0,      // BUG-197-A7: missing field
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,
        qty: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
};

export { fromAPI, toAPI };
