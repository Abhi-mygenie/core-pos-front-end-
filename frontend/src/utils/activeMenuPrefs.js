// BUG-463: localStorage-based active menu type removed.
// Backend auto-filters get-products-list by the authenticated employee's assign_food_menu.
// Default kept as fallback in MenuContext while products are loading.
export const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';
