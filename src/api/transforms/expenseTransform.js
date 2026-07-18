// CR-059: Expense Module — Transform Layer
// Pattern follows settlementTransform.js
// Normalises all API field quirks, date formats, and type coercions.

// =============================================================================
// DATE HELPERS
// =============================================================================

/**
 * Format a Date object or ISO string to "DD/MM/YYYY"
 * Used for: expense report queries, store-expense-details e_date
 * @param {Date|string} date
 * @returns {string}  "DD/MM/YYYY"
 */
export const formatDateDDMMYYYY = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Format a Date object or DD/MM/YYYY string to "YYYY-MM-DD"
 * Used for: export endpoints
 * @param {Date|string} date
 * @returns {string}  "YYYY-MM-DD"
 */
export const formatDateISO = (date) => {
  if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [dd, mm, yyyy] = date.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Parse "DD/MM/YYYY" string into a Date object
 * @param {string} str
 * @returns {Date}
 */
export const parseDateDDMMYYYY = (str) => {
  if (!str) return new Date();
  const [dd, mm, yyyy] = str.split('/');
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
};

// =============================================================================
// fromAPI — normalise API responses → app data shapes
// =============================================================================

export const fromAPI = {
  /**
   * GET /category-list → [{id, name}]
   * Actual response: { categories: [{id, category_name}] }
   */
  categories: (res) => {
    const data = res?.data?.categories ?? res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data)
      ? data.map((c) => ({
          id: c.id ?? c.category_id,
          name: c.category_name ?? c.name ?? '',
        }))
      : [];
  },

  /**
   * GET /expenses-list → [{id, title, categoryId, ...}]
   * Actual response: { expenses: [{id, stock_title, category_name, ...}] }
   */
  expenseItems: (res) => {
    const data = res?.data?.expenses ?? res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data)
      ? data.map((item) => ({
          id: item.id,
          title: item.title ?? item.stock_title ?? '',
          categoryId: item.category_id ?? null,
          categoryName: item.category_name ?? '',
          createdAt: item.created_at ?? '',
          unitPrice: item.unit_price ?? null,
          unitPriceAmount: item.unit_price_amount != null
            ? parseFloat(item.unit_price_amount)
            : null,
          unit: item.unit ?? '',
        }))
      : [];
  },

  /**
   * GET /expenses-report → {totalAmount, transactions: [...]}
   * Actual response: { total_amount: 0, report: [] }
   * CR-059 BUG-FIX: API returns non-standard keys with spaces/uppercase:
   *   'Date & Time', 'EXPENSE', 'Amount', 'Payment Method', 'Category'
   */
  // CR-061 V3: Updated to extract G4 employee_name, G5 notes, G6 pagination metadata
  expenseReport: (res) => {
    const data = res?.data ?? {};
    const transactions = Array.isArray(
      data.report ?? data.expenses ?? data.transactions ?? data
    )
      ? (data.report ?? data.expenses ?? data.transactions ?? data)
      : [];
    return {
      // CR-061: Pagination metadata (G6 — absent in older API, defaults to null)
      totalAmount:  parseFloat(data.total_amount ?? data.totalAmount ?? 0),
      totalCount:   data.total_count   ?? null,
      totalPages:   data.total_pages   ?? null,
      perPage:      data.per_page      ?? null,
      currentPage:  data.page          ?? 1,
      transactions: transactions.map((t) => ({
        id:            t.id,
        date:          t['Date & Time']   ?? t.e_date          ?? t.date ?? '',
        time:          t['Date & Time']   ?? t.created_at      ?? t.time ?? '',
        expense:       t['EXPENSE']       ?? t.exp_name        ?? t.expense ?? t.title ?? '',
        category:      t['Category']      ?? t.category_name   ?? t.category ?? '',
        categoryId:    t.category_id      ?? null,
        amount:        parseFloat(t['Amount'] ?? t.d_amount   ?? t.amount ?? 0),
        paymentMethod: t['Payment Method'] ?? t.payment_method ?? '',
        quantity:      parseFloat(t.quantity ?? 0),
        unit:          t.unit             ?? '',
        // CR-061 V3 — G4 + G5 fields (safe fallback if absent)
        employeeName:  t.employee_name    ?? '',
        notes:         t.notes            ?? '',
      })),
    };
  },

  /**
   * GET /payment-method → string[]
   * Actual response: { Payment_method: ["UPI","Cash",...] }
   */
  paymentMethods: (res) => {
    const raw = res?.data?.Payment_method
      ?? res?.data?.payment_method
      ?? res?.data?.data
      ?? res?.data
      ?? [];
    if (!Array.isArray(raw)) return [];
    if (raw.length === 0) return [];
    if (typeof raw[0] === 'string') return raw;
    return raw.map((m) => m.name ?? m.payment_method ?? String(m));
  },

  /**
   * GET /get-unit → [{value, label}]
   * Actual response: { units: {0:"kg", 1:"ltr", ...} }
   */
  units: (res) => {
    const raw = res?.data?.units
      ?? res?.data?.data
      ?? res?.data
      ?? {};
    const toEntry = (u, i) => {
      if (typeof u === 'string') return { value: u, label: u };
      if (u && typeof u === 'object') {
        const label = String(u.unit_name ?? u.name ?? u.label ?? u.title ?? i);
        const value = String(u.id ?? u.value ?? label);
        return { value, label };
      }
      return { value: String(u ?? i), label: String(u ?? i) };
    };
    if (Array.isArray(raw)) return raw.map(toEntry);
    return Object.values(raw).map(toEntry);
  },

  /**
   * GET /stock-unit-prices → [{id, stockId, stockTitle, quantity, price}]
   */
  unitPrices: (res) => {
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data)
      ? data.map((p) => ({
          id: p.id,
          stockId: p.stock_id ?? p.stockId,
          stockTitle: p.stock_title ?? p.expense_name ?? p.stockTitle ?? '', // CR-066: API returns expense_name on GET /stock-unit-prices
          quantity: parseFloat(p.quantity ?? 1),
          price: parseFloat(p.price ?? 0),
        }))
      : [];
  },

  // CR-066: GET /expenses-without-unit-prices → [{id, title}]
  itemsWithoutPrices: (res) => {
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data)
      ? data.filter((i) => (i.stock_title ?? '').trim() !== '')
            .map((i) => ({ id: i.id, title: i.stock_title ?? '' }))
      : [];
  },

  /**
   * BUG-202-fwd-compat: PUT /expenses/{id} response → normalised item shape
   * Success shape: { message, updated_expense: {id, stock_title, category_id, category_name} }
   * 404 pseudo-shape: HTTP 201 with { errors: [{code:'not_found', message}] }
   * Caller must check `res.data.errors` FIRST before invoking this transform.
   * @returns {{id, title, categoryId, categoryName} | null}
   */
  updatedItem: (res) => {
    const u = res?.data?.updated_expense ?? res?.data?.data ?? null;
    if (!u) return null;
    return {
      id: u.id,
      title: u.stock_title ?? u.title ?? '',
      categoryId: u.category_id ?? null,
      categoryName: u.category_name ?? '',
    };
  },

  /**
   * POST /bulk-export-expense → {message, downloadUrl}
   * CR-074-A (2026-07-16): removed — no longer used after import/export UI removal.
   */
};

// =============================================================================
// toAPI — build request payloads from app data shapes
// =============================================================================

export const toAPI = {
  /**
   * POST /store_expense — create category with initial items
   * stock_title = flat string array on CREATE
   */
  createCategory: (categoryName, itemNames = []) => ({
    category_name: categoryName,
    stock_title: itemNames,           // ["Dal", "Rajma", ...]
  }),

  /**
   * PUT /expenses/{id} — update category + items
   * stock_title = object array on UPDATE
   */
  updateCategory: (categoryName, items = []) => ({
    category_name: categoryName,
    stock_title: items.map((i) =>
      typeof i === 'string' ? { title: i } : { title: i.title ?? i.name ?? '' }
    ),
  }),

  /**
   * POST /store-expense-details — add expense entry
   * Note: create uses expense/amount; edit uses exp_name/d_amount (different field names)
   */
  addExpenseEntry: (date, totalAmount, lines = []) => ({
    e_date: date,                     // "DD/MM/YYYY"
    total_amount: totalAmount,
    details: lines.map((l) => ({
      expense: l.expense,             // stock item title string
      amount: l.amount,
      payment_method: l.payment_method,
      quantity: l.quantity ?? 0,
      unit: l.unit ?? '',
      physical_quantity: 0,           // deprecated — always 0
      notes: l.notes ?? '',           // BUG-177: notes field
    })),
  }),

  /**
   * PUT /edit-expense/{id} — edit existing expense entry
   * Field names differ from create: exp_name vs expense, d_amount vs amount, e_dates vs e_date
   */
  editExpenseEntry: (data) => ({
    exp_name: data.expense ?? data.exp_name,
    e_dates: data.date ?? data.e_dates,   // "DD/MM/YYYY"
    d_amount: data.amount ?? data.d_amount,
    payment_method: data.payment_method,
    quantity: data.quantity ?? 0,
    unit: data.unit ?? '',
    physical_quantity: 0,               // deprecated — always 0
    notes: data.notes ?? '',            // BUG-177: notes field
  }),

  /**
   * POST /stock-unit-price — add unit price
   */
  addUnitPrice: (stockId, quantity, price) => ({
    stock_id: stockId,
    quantity,
    price,
  }),
};
