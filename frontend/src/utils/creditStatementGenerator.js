/**
 * creditStatementGenerator.js — BUG-104 Phase 2A
 *
 * Generates a printable/downloadable credit statement from frontend data.
 * Uses window.open (synchronous) + Blob URL for reliable cross-browser rendering.
 *
 * Two modes:
 *   - Quick Statement: transaction-level only (instant, no item fetching)
 *   - Detailed Statement: includes bill line-item details (slower, parallel fetch)
 *
 * Read-only — does NOT mutate data, call payment APIs, or touch backend.
 */

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtINR = (n) => {
  const v = parseFloat(n) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}&#8377;${abs}`;
};

const fmtDate = (input) => {
  if (!input) return '&mdash;';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '&mdash;';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtPayment = (raw) => {
  if (!raw) return '&mdash;';
  const v = String(raw).toLowerCase();
  if (v === 'upi') return 'UPI';
  if (v === 'sucess') return '&mdash;';
  return v.charAt(0).toUpperCase() + v.slice(1);
};

/**
 * FIFO coverage inference — same algorithm as CreditCustomerDetailSheet.jsx.
 * Payments clear oldest bills first (advisory — payments are lump sums).
 */
function computeFifoCoverage(credits, totalPaid) {
  const runningBefore = [];
  let acc = 0;
  credits.forEach((c) => { runningBefore.push(acc); acc += c.amount; });
  return credits.map((c, i) => {
    const before = runningBefore[i];
    const after = before + c.amount;
    if (totalPaid <= 0 || after <= 0) return { type: 'open' };
    if (after <= totalPaid) return { type: 'covered' };
    if (before >= totalPaid) return { type: 'open' };
    return { type: 'partial', coveredAmount: totalPaid - before, totalAmount: c.amount };
  });
}

const BADGE_STYLES = {
  covered: 'background:#DCFCE7;color:#166534;',
  partial: 'background:#FEF3C7;color:#92400E;',
  open:    'background:#FEE2E2;color:#991B1B;',
};
const DOT_COLORS = { covered: '#16A34A', partial: '#D97706', open: '#DC2626' };
const BUCKET_BG = { covered: '#F0FDF4', partial: '#FFFBEB', open: '#FEF2F2' };
const BUCKET_TEXT = { covered: '#166534', partial: '#92400E', open: '#991B1B' };

function statusBadgeHTML(cov) {
  if (!cov) return '';
  const label = cov.type === 'covered' ? 'Covered'
    : cov.type === 'partial' ? `Partial ${fmtINR(cov.coveredAmount)}/${fmtINR(cov.totalAmount)}`
    : 'Open';
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;${BADGE_STYLES[cov.type]}"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${DOT_COLORS[cov.type]}"></span>${label}</span>`;
}

function buildCreditRow(c, idx, coverage, orderItems) {
  const ordLabel = c.restaurantOrderId || (c.orderId > 0 ? `#${c.orderId}` : '&mdash;');
  const dateStr = fmtDate(c.orderCreatedAt || c.createdAt);

  let itemsHtml = '';
  const detail = c.orderId > 0 ? orderItems?.[c.orderId] : null;
  if (detail?.items?.length) {
    const itemRows = detail.items.map((it) =>
      `<tr class="item-row">
        <td colspan="2" style="padding-left:30px;color:#555;">${esc(it.name)}</td>
        <td style="color:#555;">x${it.quantity}</td>
        <td class="amount" style="color:#555;">${fmtINR(it.price)}</td>
        <td></td><td></td>
      </tr>`
    ).join('');
    const totalsRow = `<tr class="item-totals">
      <td colspan="4" style="padding-left:30px;font-size:10px;color:#888;">
        Sub: ${fmtINR(detail.subtotal)}${detail.amount !== detail.subtotal ? ` &middot; Tax: ${fmtINR((detail.amount || 0) - (detail.subtotal || 0))}` : ''} &middot; <strong>Total: ${fmtINR(detail.amount)}</strong>
      </td><td></td><td></td>
    </tr>`;
    itemsHtml = itemRows + totalsRow;
  } else if (c.orderId > 0 && orderItems && Object.keys(orderItems).length > 0) {
    itemsHtml = `<tr class="item-row"><td colspan="6" style="padding-left:30px;color:#aaa;font-style:italic;">Bill details not available</td></tr>`;
  }

  return `<tr>
    <td>${idx + 1}</td>
    <td>${dateStr}</td>
    <td style="font-family:monospace;">${esc(String(ordLabel))}</td>
    <td class="amount" style="font-weight:600;color:#ea580c;">${fmtINR(c.amount)}</td>
    <td class="amount">${fmtINR(c.currentBalance)}</td>
    <td>${statusBadgeHTML(coverage)}</td>
  </tr>${itemsHtml}`;
}

function buildBucketHTML(bucketType, entries, orderItems, extraInfo) {
  if (entries.length === 0) return '';
  const label = bucketType === 'covered' ? 'Covered' : bucketType === 'partial' ? 'Partial' : 'Open';
  const bg = BUCKET_BG[bucketType];
  const color = BUCKET_TEXT[bucketType];
  const dot = DOT_COLORS[bucketType];

  const headerRow = `<tr><td colspan="6" style="background:${bg};padding:10px 8px;border-bottom:2px solid ${dot};">
    <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:${color};">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dot};"></span>
      ${label} (${entries.length})
    </span>
    <span style="float:right;font-size:11px;color:${color};">${extraInfo}</span>
  </td></tr>`;

  const rows = entries.map((e) => buildCreditRow(e.credit, e.originalIndex, e.coverage, orderItems)).join('');
  return headerRow + rows;
}

function buildCreditSectionHTML(credits, totalPaid, orderItems) {
  if (credits.length === 0) return '<div class="empty-msg">No credit transactions in this period.</div>';

  const coverages = computeFifoCoverage(credits, totalPaid);
  const covered = [], partial = [], open = [];
  credits.forEach((c, i) => {
    const cov = coverages[i];
    const entry = { credit: c, coverage: cov, originalIndex: i };
    if (cov.type === 'covered') covered.push(entry);
    else if (cov.type === 'partial') partial.push(entry);
    else open.push(entry);
  });

  const coveredAmt = covered.reduce((s, e) => s + e.credit.amount, 0);
  const partialCovered = partial.reduce((s, e) => s + (e.coverage.coveredAmount || 0), 0);
  const settledTotal = coveredAmt + partialCovered;
  const totalCredit = credits.reduce((s, c) => s + c.amount, 0);
  const settledPct = totalCredit > 0 ? Math.round((settledTotal / totalCredit) * 100) : 0;
  const partialDue = partial.reduce((s, e) => s + Math.max(0, (e.credit.amount || 0) - (e.coverage.coveredAmount || 0)), 0);
  const openDue = open.reduce((s, e) => s + e.credit.amount, 0);

  const tableHead = `<thead><tr><th>#</th><th>Date</th><th>Order ID</th><th class="amount">Credit (Bill)</th><th class="amount">Balance</th><th>Status</th></tr></thead>`;

  const coveredHTML = buildBucketHTML('covered', covered, orderItems,
    `${fmtINR(settledTotal)} of ${fmtINR(totalCredit)} settled (${settledPct}%)`);
  const partialHTML = buildBucketHTML('partial', partial, orderItems,
    `${fmtINR(partialDue)} remaining`);
  const openHTML = buildBucketHTML('open', open, orderItems,
    `${fmtINR(openDue)} due`);

  return `<table>${tableHead}<tbody>${coveredHTML}${partialHTML}${openHTML}</tbody></table>
    <div style="font-size:10px;color:#999;margin-top:-10px;margin-bottom:16px;">Status is estimated using FIFO (oldest bills covered first). Payments are recorded as lump sums.</div>`;
}

function buildDebitRows(debits) {
  return debits.map((d, i) => `<tr>
    <td>${i + 1}</td>
    <td>${fmtDate(d.createdAt)}</td>
    <td>${fmtPayment(d.paymentMethod)}</td>
    <td class="amount" style="font-weight:600;color:#16a34a;">${fmtINR(d.amount)}</td>
    <td class="amount">${fmtINR(d.currentBalance)}</td>
  </tr>`).join('');
}

const STATEMENT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #333; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ea580c; padding-bottom: 16px; margin-bottom: 20px; }
  .header-left h1 { font-size: 22px; color: #ea580c; margin-bottom: 4px; }
  .header-left .restaurant { font-size: 14px; color: #666; }
  .header-left .mode-badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-top: 4px; }
  .header-right { text-align: right; font-size: 11px; color: #888; }
  .customer-bar { background: #f8f8f8; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .customer-bar .label { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
  .customer-bar .value { font-size: 13px; font-weight: 600; color: #333; }
  .summary-strip { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-card { flex: 1; min-width: 120px; border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px; text-align: center; }
  .summary-card .label { font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 4px; }
  .summary-card .value { font-size: 18px; font-weight: 700; font-family: monospace; }
  .summary-card .value.credit { color: #ea580c; }
  .summary-card .value.paid { color: #16a34a; }
  .summary-card .value.balance { color: #dc2626; }
  .section-title { font-size: 14px; font-weight: 700; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #333; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  .amount { text-align: right; font-family: monospace; }
  .item-row td { font-size: 11px; border-bottom: none; padding-top: 2px; padding-bottom: 2px; }
  .item-totals td { font-size: 11px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  .empty-msg { text-align: center; padding: 20px; color: #999; font-style: italic; }
  .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #bbb; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
`;

function buildStatementHTML({ customer, summary, credits, debits, dateRange, orderItems, restaurantName, generatedBy, isDetailed }) {
  const periodLabel = (dateRange?.dateFrom || dateRange?.dateTo)
    ? `${dateRange.dateFrom || 'Start'} to ${dateRange.dateTo || 'Today'}`
    : 'All time';
  const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  const totalCredit = summary?.totalCredit ?? credits.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const totalPaid = summary?.totalPaid ?? debits.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const outstanding = summary?.balance ?? (totalCredit - totalPaid);
  const creditSectionHtml = buildCreditSectionHTML(credits, totalPaid, orderItems || {});
  const debitRowsHtml = buildDebitRows(debits);
  const modeBadge = isDetailed
    ? '<span class="mode-badge" style="background:#FEF3C7;color:#92400E;">Detailed — includes bill items</span>'
    : '<span class="mode-badge" style="background:#DBEAFE;color:#1E40AF;">Quick — transaction summary</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Credit Statement - ${esc(customer?.name || 'Customer')}</title>
<style>${STATEMENT_CSS}</style></head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>CREDIT STATEMENT</h1>
      <div class="restaurant">${esc(restaurantName || 'MyGenie Restaurant POS')}</div>
      ${modeBadge}
    </div>
    <div class="header-right">
      <div>Generated: ${now}</div>
      ${generatedBy ? `<div>By: ${esc(generatedBy)}</div>` : ''}
      <div>Period: ${esc(periodLabel)}</div>
    </div>
  </div>
  <div class="customer-bar">
    <div class="field"><div class="label">Customer</div><div class="value">${esc(customer?.name || '—')}</div></div>
    <div class="field"><div class="label">Mobile</div><div class="value">${esc(customer?.mobile || '—')}</div></div>
    ${customer?.email ? `<div class="field"><div class="label">Email</div><div class="value">${esc(customer.email)}</div></div>` : ''}
    <div class="field"><div class="label">Outstanding</div><div class="value" style="color:#ea580c;">${fmtINR(outstanding)}</div></div>
  </div>
  <div class="summary-strip">
    <div class="summary-card"><div class="label">Total Credit</div><div class="value credit">${fmtINR(totalCredit)}</div></div>
    <div class="summary-card"><div class="label">Total Paid</div><div class="value paid">${fmtINR(totalPaid)}</div></div>
    <div class="summary-card"><div class="label">Outstanding</div><div class="value balance">${fmtINR(outstanding)}</div></div>
    ${summary?.tapStartDate ? `<div class="summary-card"><div class="label">First Credit</div><div class="value">${fmtDate(summary.tapStartDate)}</div></div>` : ''}
  </div>
  <div class="section-title">Credit Transactions (${credits.length})</div>
  ${creditSectionHtml}
  <div class="section-title">Payments Received (${debits.length})</div>
  ${debits.length > 0 ? `<table><thead><tr><th>#</th><th>Date</th><th>Method</th><th class="amount">Amount</th><th class="amount">Balance After</th></tr></thead><tbody>${debitRowsHtml}</tbody></table>` : '<div class="empty-msg">No payments recorded in this period.</div>'}
  <div class="footer"><p>This is a computer-generated credit statement. Powered by MyGenie Restaurant POS.</p></div>
</body></html>`;
}

/**
 * Portfolio Summary — single PDF listing all credit customers.
 * Columns: #, Customer, Mobile, Total Credit, Total Paid, Outstanding
 */
function buildPortfolioHTML({ customers, restaurantName, generatedBy, filterLabel }) {
  const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  const totalCredit = customers.reduce((s, c) => s + (c.totalCredit || 0), 0);
  const totalPaid = customers.reduce((s, c) => s + (c.totalPaid || 0), 0);
  const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding || 0), 0);
  const withBalance = customers.filter((c) => (c.outstanding || 0) > 0).length;

  const rows = customers.map((c, i) => {
    const os = c.outstanding || 0;
    const statusStyle = os > 0
      ? 'background:#FEE2E2;color:#991B1B;'
      : 'background:#DCFCE7;color:#166534;';
    const statusLabel = os > 0 ? 'Outstanding' : 'Settled';
    return `<tr>
      <td>${i + 1}</td>
      <td>${esc(c.name || '—')}</td>
      <td>${esc(c.mobile || '—')}</td>
      <td class="amount">${fmtINR(c.totalCredit || 0)}</td>
      <td class="amount" style="color:#16a34a;">${fmtINR(c.totalPaid || 0)}</td>
      <td class="amount" style="font-weight:600;color:${os > 0 ? '#ea580c' : '#16a34a'};">${fmtINR(os)}</td>
      <td><span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;${statusStyle}">${statusLabel}</span></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Credit Portfolio Summary</title>
<style>${STATEMENT_CSS}
  .portfolio-hero { display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
  .portfolio-hero .card { flex:1; min-width:140px; border:1px solid #e5e5e5; border-radius:8px; padding:14px 18px; text-align:center; }
  .portfolio-hero .card .lbl { font-size:10px; text-transform:uppercase; color:#999; margin-bottom:6px; }
  .portfolio-hero .card .val { font-size:22px; font-weight:700; font-family:monospace; }
</style></head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>CREDIT PORTFOLIO SUMMARY</h1>
      <div class="restaurant">${esc(restaurantName || 'MyGenie Restaurant POS')}</div>
      <span class="mode-badge" style="background:#F3E8FF;color:#6B21A8;">All Customers</span>
    </div>
    <div class="header-right">
      <div>Generated: ${now}</div>
      ${generatedBy ? `<div>By: ${esc(generatedBy)}</div>` : ''}
      ${filterLabel ? `<div>Filter: ${esc(filterLabel)}</div>` : ''}
    </div>
  </div>
  <div class="portfolio-hero">
    <div class="card"><div class="lbl">Customers</div><div class="val" style="color:#333;">${customers.length}</div><div style="font-size:11px;color:#999;margin-top:2px;">${withBalance} with balance</div></div>
    <div class="card"><div class="lbl">Total Credit</div><div class="val" style="color:#ea580c;">${fmtINR(totalCredit)}</div></div>
    <div class="card"><div class="lbl">Total Paid</div><div class="val" style="color:#16a34a;">${fmtINR(totalPaid)}</div></div>
    <div class="card"><div class="lbl">Outstanding</div><div class="val" style="color:#dc2626;">${fmtINR(totalOutstanding)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Customer</th><th>Mobile</th>
      <th class="amount">Total Credit</th><th class="amount">Total Paid</th>
      <th class="amount">Outstanding</th><th>Status</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="border-top:2px solid #333;font-weight:700;">
      <td colspan="3" style="padding:10px 8px;">TOTALS (${customers.length} customers)</td>
      <td class="amount" style="padding:10px 8px;">${fmtINR(totalCredit)}</td>
      <td class="amount" style="padding:10px 8px;color:#16a34a;">${fmtINR(totalPaid)}</td>
      <td class="amount" style="padding:10px 8px;color:#ea580c;">${fmtINR(totalOutstanding)}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <div class="footer"><p>This is a computer-generated credit portfolio summary. Powered by MyGenie Restaurant POS.</p></div>
</body></html>`;
}

export function writePortfolioStatement(win, params) {
  if (!win || win.closed) {
    throw new Error('Statement window was closed before generation completed.');
  }
  const html = buildPortfolioHTML(params);
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  win.location.href = url;
  const cleanup = () => URL.revokeObjectURL(url);
  const checkReady = setInterval(() => {
    try {
      if (win.closed) { clearInterval(checkReady); cleanup(); return; }
      if (win.document && win.document.readyState === 'complete') {
        clearInterval(checkReady); cleanup();
        try { win.print(); } catch { /* user may have closed */ }
      }
    } catch { clearInterval(checkReady); cleanup(); }
  }, 300);
  setTimeout(() => { clearInterval(checkReady); cleanup(); }, 30000);
}

/**
 * Open a blank window SYNCHRONOUSLY (must be in the click handler's call stack).
 */
export function openStatementWindow() {
  return window.open('', '_blank');
}

/**
 * Write a progress/loading page into the popup window.
 * Called before async item fetching starts.
 */
export function writeProgressPage(win, { current, total, customerName }) {
  if (!win || win.closed) return;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const html = `<!DOCTYPE html><html><head><title>Generating Statement...</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#333}
  .wrap{text-align:center;max-width:400px;padding:40px}
  h2{font-size:18px;color:#ea580c;margin-bottom:8px}
  .sub{font-size:13px;color:#888;margin-bottom:24px}
  .bar-bg{width:100%;height:8px;background:#e5e5e5;border-radius:4px;overflow:hidden;margin-bottom:12px}
  .bar-fill{height:100%;background:#ea580c;border-radius:4px;transition:width .3s}
  .count{font-size:24px;font-weight:700;font-family:monospace;color:#ea580c}
  .detail{font-size:11px;color:#aaa;margin-top:16px}
</style></head>
<body><div class="wrap">
  <h2>Generating Statement</h2>
  <div class="sub">${esc(customerName || 'Customer')}</div>
  <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
  <div class="count">${current} / ${total}</div>
  <div class="detail">Fetching bill details... please wait</div>
</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  win.location.href = url;
  // Cleanup blob after navigation
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Write the final statement HTML into a pre-opened window using Blob URL.
 */
export function writeCreditStatement(win, params) {
  if (!win || win.closed) {
    throw new Error('Statement window was closed before generation completed.');
  }
  const html = buildStatementHTML(params);
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  win.location.href = url;

  const cleanup = () => URL.revokeObjectURL(url);
  const checkReady = setInterval(() => {
    try {
      if (win.closed) { clearInterval(checkReady); cleanup(); return; }
      if (win.document && win.document.readyState === 'complete') {
        clearInterval(checkReady);
        cleanup();
        try { win.print(); } catch { /* user may have closed */ }
      }
    } catch { clearInterval(checkReady); cleanup(); }
  }, 300);
  setTimeout(() => { clearInterval(checkReady); cleanup(); }, 30000);
}
