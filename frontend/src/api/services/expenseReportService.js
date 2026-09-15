// CR-061: Client-side aggregation from raw expense transactions
// Input: transactions[] from expenseTransform.expenseReport(res).transactions
import { parseDateDDMMYYYY } from '../transforms/expenseTransform';

/**
 * Aggregate raw expense transactions into chart/KPI data shapes.
 * V3: transactions include employeeName and notes — passed through to raw array.
 * @param {Array}  transactions   - from expenseTransform.expenseReport().transactions
 * @param {number} apiTotalAmount - from expenseTransform.expenseReport().totalAmount
 */
export const aggregateExpenses = (transactions = [], apiTotalAmount = 0) => {
  const totalAmount = apiTotalAmount || transactions.reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  const byPayment  = {};
  const byDate     = {};

  transactions.forEach((t) => {
    const amt  = t.amount;
    const cat  = t.category       || 'Unknown';
    const pay  = t.paymentMethod  || 'Unknown';
    const date = t.date           || '';

    byCategory[cat] = (byCategory[cat] || 0) + amt;
    byPayment[pay]  = (byPayment[pay]  || 0) + amt;
    if (!byDate[date]) byDate[date] = { total: 0, count: 0 };
    byDate[date].total += amt;
    byDate[date].count += 1;
  });

  const activeDays = Object.keys(byDate).length;
  const avgDaily   = activeDays > 0 ? totalAmount / activeDays : 0;

  const byCatArr = Object.entries(byCategory)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const byPayArr = Object.entries(byPayment)
    .map(([method, total]) => ({ method, total }))
    .sort((a, b) => b.total - a.total);

  const dailyArr = Object.entries(byDate)
    .map(([date, d]) => ({ date, total: d.total, count: d.count }))
    .sort((a, b) => parseDateDDMMYYYY(a.date) - parseDateDDMMYYYY(b.date));

  const topCategory = byCatArr[0] ?? null;
  const highestDay  = dailyArr.length
    ? [...dailyArr].sort((a, b) => b.total - a.total)[0]
    : null;

  return {
    totalAmount,
    transactionCount: transactions.length,
    activeDays,
    avgDaily,
    topCategory,
    highestDay,
    byCategory: byCatArr,
    byPayment:  byPayArr,
    daily:      dailyArr,
    transactions,
    // TODO CR-062: switch to backend aggregation if > 5000 txns
  };
};
