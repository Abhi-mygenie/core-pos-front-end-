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
export const createCategoryWithItems = (categoryName, itemNames = []) =>
  api.post(EXPENSE_ENDPOINTS.STORE_EXPENSE, {
    category_name: categoryName,
    stock_title: itemNames,
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
 * DELETE a single expense stock item by ID
 * @param {number|string} itemId
 * @returns {Promise<AxiosResponse>}
 */
export const deleteExpenseItem = (itemId) =>
  api.delete(`${EXPENSE_ENDPOINTS.DELETE_ITEM}/${itemId}`);

/**
 * POST export stock master to Excel
 * @returns {Promise<AxiosResponse>}
 */
export const exportStockMaster = () =>
  api.post(EXPENSE_ENDPOINTS.BULK_EXPORT);

/**
 * POST import stock master from Excel file
 * @param {File} file
 * @returns {Promise<AxiosResponse>}
 */
export const importStockMaster = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(EXPENSE_ENDPOINTS.BULK_IMPORT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// =============================================================================
// TRANSACTIONS — EXPENSE REPORT / ENTRY
// =============================================================================

/**
 * GET expense report (transactions) for a date range
 * @param {string} from  - "DD/MM/YYYY"
 * @param {string} to    - "DD/MM/YYYY"
 * @param {string} [paymentMethod]  - optional filter
 * @returns {Promise<AxiosResponse>}
 */
export const getExpenseReport = (from, to, paymentMethod = '') => {
  const params = { from, to };
  if (paymentMethod) params.payment_method = paymentMethod;
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
      physical_quantity: 0, // deprecated — always 0
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
    physical_quantity: 0, // deprecated — always 0
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

/**
 * POST export expense report to Excel
 * @param {string} from  - "DD/MM/YYYY"
 * @param {string} to    - "DD/MM/YYYY"
 * @returns {Promise<AxiosResponse>}
 */
export const exportExpenseReport = (from, to) =>
  api.post(EXPENSE_ENDPOINTS.EXPORT_REPORT, { from, to });

/**
 * POST import expense entries from file
 * @param {File} file
 * @returns {Promise<AxiosResponse>}
 */
export const importExpenses = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(EXPENSE_ENDPOINTS.IMPORT_EXPENSE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

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
