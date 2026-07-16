// CR-072: Recipe Transform — fromAPI/toAPI normalizers
// Verified against live preprod data (18march: 64 recipes, 11 sub-recipes, 7 addon recipes)

const fromAPI = {
  // C1: get-recipe → { recipes: [...] }
  recipes(response) {
    const items = response?.recipes || [];
    return items.map(r => ({
      id: r.recipe_id,
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
};

const toAPI = {
  // C2: store-recipe
  storeRecipe(data) {
    return {
      food_id: data.foodId,
      name: data.name,
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serve_people: data.servePeople || 1,
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },

  // C6: store-sub-recipe
  storeSubRecipe(data) {
    return {
      name: data.name,
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },

  // D2: store-addon-recipe
  storeAddonRecipe(data) {
    return {
      addon_id: data.addonId,
      name: data.name,
      qty: data.qty,
      unit: data.unit,
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
};

export { fromAPI, toAPI };
