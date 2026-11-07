// CR-059: Expense Module — Service Layer
// Pattern follows settlementService.js + menuManagementService.js
import api from '../axios';
import { EXPENSE_ENDPOINTS } from '../constants';

// =============================================================================
// MASTER — CATEGORIES
// =============================================================================

/**
 * GET all expense categories
 * @returns {Promise<AxiosResponse>}
 */
export const getCategories = () =>
  api.get(EXPENSE_ENDPOINTS.CATEGORY_LIST);

// =============================================================================
// MASTER — STOCK ITEMS
// =============================================================================

/**
 * GET all expense stock items (optionally filtered by category)
 * @returns {Promise<AxiosResponse>}
 */
export const getExpenseItems = () =>
  api.get(EXPENSE_ENDPOINTS.EXPENSES_LIST);

/**
 * POST create a new category with initial stock items
 * @param {string} categoryName
 * @param {string[]} itemNames  - flat array of stock item title strings
 * @returns {Promise<AxiosResponse>}
 */
/**
 * POST /expense/category — create empty category (no items required)
 * BUG-159: replaces createCategoryWithItems(name, []) which silently failed
 * Response: { category: { id: N, name: "..." } }
 */
export const createEmptyCategory = (categoryName) =>
  api.post(EXPENSE_ENDPOINTS.CATEGORY, { category_name: categoryName }); // BUG-159 fix

export const createCategoryWithItems = (categoryName, itemNames = []) =>
  api.post(EXPENSE_ENDPOINTS.STORE_EXPENSE, {
    category_name: categoryName,
    stock_title: itemNames, // BUG-158 + BUG-161: stock_title for create (single + bulk)
  });

/**
 * PUT update an existing category name and/or its stock items
 * @param {number|string} categoryId
 * @param {string} categoryName
 * @param {Array<{title: string}>} items  - objects with {title} key
 * @returns {Promise<AxiosResponse>}
 */
export const updateCategory = (categoryId, categoryName, items = []) =>
  api.put(`${EXPENSE_ENDPOINTS.UPDATE_CATEGORY}/${categoryId}`, {
    category_name: categoryName,
    stock_title: items,
  });

/**
 * PUT /expense/category/{id} — rename category by ID
 * BUG-160: replaces updateCategory() which returned "Category not found"
 * Response: { message: "Category updated successfully.", category: { id, name } }
 */
export const renameExpenseCategory = (id, name) =>
  api.put(`${EXPENSE_ENDPOINTS.CATEGORY}/${id}`, { category_name: name }); // BUG-160 fix

/**
 * DELETE /expense/category/{id} — delete category atomically
 * BUG-160: replaces per-item delete loop; backend moves items to misc automatically
 * Response: { message: "Category deleted successfully.", moved_items_count: N }
 */
export const deleteExpenseCategory = (id) =>
  api.delete(`${EXPENSE_ENDPOINTS.CATEGORY}/${id}`); // BUG-160 fix

/**
 * GET impact data before deleting an expense stock item
 * BUG-201: returns { transaction_count, total_amount, date_range }
 * @param {number|string} itemId
 * @returns {Promise<AxiosResponse>}
 */
export const getItemImpact = (itemId) =>
  api.get(`${EXPENSE_ENDPOINTS.ITEM_IMPACT}/${itemId}/impact`);

/**
 * DELETE a single expense stock item by ID
 * BUG-201: now accepts optional delete_reason (sent as request body)
 * @param {number|string} itemId
 * @param {string} [reason]
 * @returns {Promise<AxiosResponse>}
 */
export const deleteExpenseItem = (itemId, reason) =>
  api.delete(`${EXPENSE_ENDPOINTS.DELETE_ITEM}/${itemId}`, {
    data: reason ? { delete_reason: reason } : undefined,
  });

/**
 * PUT update a stock item's title and/or category atomically
 * BUG-202-fwd-compat (backend delivered 2026-07-17):
 *   Route:   PUT /api/v2/vendoremployee/expense/expenses/{item_id}
 *   Body:    { stock_title, category_id }
 *   Success: 200 → { message, updated_expense: {id, stock_title, category_id, category_name} }
 *   404:     HTTP 201 (sic) with { errors: [{code: 'not_found', message}] } — parse body, not status
 *   Duplicate name: NOT enforced by backend (returns 200) — FE must pre-flight check
 *   Unit price row survives (no cascade on update).
 * @param {number|string} itemId
 * @param {{stock_title: string, category_id: number|string}} payload
 * @returns {Promise<AxiosResponse>}
 */
// BUG-203: Backend now accepts unit_price on PUT (was ignored before fix).
export const updateExpenseItem = (itemId, { stock_title, category_id, unit_price }) => {
  const body = { stock_title, category_id };
  if (unit_price != null) body.unit_price = unit_price; // BUG-203: include when provided
  return api.put(`${EXPENSE_ENDPOINTS.STOCK_ITEM_UPDATE}/${itemId}`, body);
};

// CR-062: Server-side expense aggregation (replaces client-side math from CR-061)
/**
 * @param {string} from - DD/MM/YYYY
 * @param {string} to   - DD/MM/YYYY
 * @param {Object} [filters]
 * @param {number[]} [filters.category_ids]
 * @param {string[]} [filters.payment_methods]
 * @returns {Promise<{grand_total: number, daily_totals: Array, category_totals: Array, payment_totals: Array}>}
 */
export const getExpenseAggregation = async (from, to, filters = {}) => {
  const body = { from, to };
  if (filters.category_ids?.length) body.category_ids = filters.category_ids;
  if (filters.payment_methods?.length) body.payment_methods = filters.payment_methods;
  const res = await api.post(EXPENSE_ENDPOINTS.EXPENSE_AGGREGATION, body);
  return res.data;
};

// CR-074-A (2026-07-16): removed exportStockMaster + importStockMaster (item-master Excel/CSV import/export UI removed from Bulk Editor)

// =============================================================================
// TRANSACTIONS — EXPENSE REPORT / ENTRY
// =============================================================================

/**
 * CR-061 V3: GET expense report — fetch paginated expense transactions
 * @param {string} from           - "DD/MM/YYYY"
 * @param {string} to             - "DD/MM/YYYY"
 * @param {Object} [opts]
 * @param {string} [opts.paymentMethod]  - payment filter (server-side)
 * @param {number} [opts.categoryId]     - category filter (server-side, G8)
 * @param {number} [opts.page=1]         - page number (G6)
 * @param {string} [opts.search]         - IGNORED: backend /expenses-report does not implement ?search= (CR-061 G7). Filter client-side instead.
 */
// CR-061 G7 fix: removed params.search — backend silently ignores it on /expenses-report
export const getExpenseReport = (from, to, { paymentMethod = '', categoryId = null, page = 1 } = {}) => {
  const params = { from, to, page };
  if (paymentMethod) params.payment_method = paymentMethod;
  if (categoryId)    params.category_id    = categoryId;
  return api.get(EXPENSE_ENDPOINTS.EXPENSES_REPORT, { params });
};

/**
 * POST add one or more expense entry lines for a given date
 * @param {string} date       - "DD/MM/YYYY"
 * @param {number} totalAmount
 * @param {Array}  lines      - [{expense, amount, payment_method, quantity, unit}]
 * @returns {Promise<AxiosResponse>}
 */
export const addExpenseEntry = (date, totalAmount, lines = []) =>
  api.post(EXPENSE_ENDPOINTS.STORE_EXPENSE_DETAILS, {
    e_date: date,
    total_amount: totalAmount,
    details: lines.map((l) => ({
      expense: l.expense,
      amount: l.amount,
      payment_method: l.payment_method,
      quantity: l.quantity || 0,
      unit: l.unit || '',
      physical_quantity: l.physical_quantity || 0, // BUG-176: user-enterable, not deprecated
      notes: l.notes || '',                        // BUG-199: propagate caller-provided notes (was dropped here)
      category_id: l.category_id ?? null,          // BUG-199: preserve line's category (curl-verified 2026-07-16; missing → backend defaults to misc/273)
    })),
  });

/**
 * PUT edit an existing expense entry
 * @param {number|string} id
 * @param {Object} data  - {expense, e_dates, d_amount, payment_method, quantity, unit}
 * @returns {Promise<AxiosResponse>}
 */
export const editExpenseEntry = (id, data) =>
  api.put(`${EXPENSE_ENDPOINTS.EDIT_EXPENSE}/${id}`, {
    exp_name: data.expense ?? data.exp_name, // BUG-151: editRow stores "expense"; API expects "exp_name"
    e_dates: data.e_dates,
    d_amount: data.d_amount,
    payment_method: data.payment_method,
    quantity: data.quantity || 0,
    unit: data.unit || '',
    physical_quantity: data.physical_quantity || 0, // BUG-176: user-enterable, not deprecated
    notes: data.notes || '',                        // BUG-199: propagate caller-provided notes (was dropped here)
    category_id: data.category_id ?? null,          // BUG-199 Q-1: preserve category on edit so subsequent lookups don't reset to misc
  });

/**
 * DELETE an expense entry by ID
 * BUG-152: was using EDIT_EXPENSE path (PUT-only, returns 405 on DELETE)
 *          correct endpoint: /delete-expense/{id}
 * @param {number|string} id
 * @returns {Promise<AxiosResponse>}
 */
export const deleteExpenseEntry = (id) =>
  api.delete(`${EXPENSE_ENDPOINTS.DELETE_EXPENSE}/${id}`);

// CR-074-A (2026-07-16): removed exportExpenseReport + importExpenses (dead code — no UI ever wired to these)

// =============================================================================
// UNIT PRICES
// =============================================================================

/**
 * GET all stock unit prices
 * @returns {Promise<AxiosResponse>}
 */
export const getUnitPrices = () =>
  api.get(EXPENSE_ENDPOINTS.STOCK_UNIT_PRICES);

/**
 * GET expense items that have no unit price set
 * @returns {Promise<AxiosResponse>}
 */
export const getItemsWithoutPrices = () =>
  api.get(EXPENSE_ENDPOINTS.WITHOUT_UNIT_PRICES);

/**
 * POST add a unit price for a stock item
 * @param {number|string} stockId
 * @param {number} quantity
 * @param {number} price
 * @returns {Promise<AxiosResponse>}
 */
export const addUnitPrice = (stockId, quantity, price) =>
  api.post(EXPENSE_ENDPOINTS.UNIT_PRICE, {
    stock_id: stockId,
    quantity,
    price,
  });

/**
 * PUT edit an existing unit price
 * @param {number|string} id
 * @param {number} price
 * @returns {Promise<AxiosResponse>}
 */
export const editUnitPrice = (id, price) =>
  api.put(`${EXPENSE_ENDPOINTS.UNIT_PRICE}/${id}`, { price });

/**
 * DELETE a unit price entry
 * @param {number|string} id
 * @returns {Promise<AxiosResponse>}
 */
export const deleteUnitPrice = (id) =>
  api.delete(`${EXPENSE_ENDPOINTS.UNIT_PRICE}/${id}`);

// =============================================================================
// REFERENCE DATA
// =============================================================================

/**
 * GET available payment methods for expense entry
 * @returns {Promise<AxiosResponse>}
 */
export const getPaymentMethods = () =>
  api.get(EXPENSE_ENDPOINTS.PAYMENT_METHOD);

/**
 * GET available units (e.g. kg, ltr, pcs)
 * Response is an object map {0:"kg",1:"ltr"} — transform layer converts to array
 * @returns {Promise<AxiosResponse>}
 */
export const getUnits = () =>
  api.get(EXPENSE_ENDPOINTS.GET_UNIT);
