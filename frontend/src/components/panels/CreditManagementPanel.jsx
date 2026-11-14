/**
 * CreditManagementPanel — BUG-104 Phase 1
 *
 * Owner UAT (2026-05-22): Credit Management must follow the SAME slide-over
 * panel pattern as MenuManagementPanel — the sidebar remains visible on the
 * left and the panel slides in from the right of the sidebar, NOT a separate
 * full-page route.
 *
 * The panel body reuses the already-approved Credit list + drawer flow:
 *   - CreditCustomerList   (SS1 table + search + filter + KPI strip)
 *   - CreditCustomerDetailSheet (SS2 right-side Sheet drawer, hosts SS3 + SS4)
 *
 * All locked UAT decisions (F-001..F-009) remain intact.
 */
import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { COLORS } from '../../constants';
import { useRestaurant, useAuth } from '../../contexts';
import { getTabCustomerList, getTabCustomerRecords } from '../../api/services/creditService';
import { getSingleOrderNew } from '../../api/services/reportService';
import { openStatementWindow, writeProgressPage, writeCreditStatement, writePortfolioStatement } from '../../utils/creditStatementGenerator';
import { useToast } from '../../hooks/use-toast';
import CreditCustomerList from '../credit/CreditCustomerList';
import CreditCustomerDetailSheet from '../credit/CreditCustomerDetailSheet';

const CreditManagementPanel = ({ isOpen, onClose, sidebarWidth }) => {
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Phase 2A: extract backend-provided totals (BG-01 in-flight).
  // When backend ships total_credit/total_paid on tap-waiter-list,
  // they'll arrive as top-level keys; until then these are null.
  const [totalCredit, setTotalCredit] = useState(null);
  const [totalPaid, setTotalPaid] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { customers: rawList, summary } = await getTabCustomerList();
      setCustomers(
        rawList.map((c) => ({
          id: c.id,
          name:
            typeof c.name === 'string' && c.name.length > 0
              ? c.name.charAt(0).toUpperCase() + c.name.slice(1)
              : c.name,
          mobile: c.mobile || '',
          email: c.email || null,
          balance: Number(String(c.balance ?? '0').replace(/,/g, '')) || 0,
          totalCredit: parseFloat(String(c.total_credit ?? '0').replace(/,/g, '')) || 0,
          totalDebit: parseFloat(String(c.total_debit ?? '0').replace(/,/g, '')) || 0,
        })),
      );
      // CR-039: restaurant-tap-summary now provides portfolio totals.
      setTotalCredit(summary.totalCredit);
      setTotalPaid(summary.totalDebit);
    } catch (err) {
      console.error('[CreditManagementPanel]', err);
      setError(err.readableMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on open; reset on close so a fresh fetch happens next time.
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    } else {
      setCustomers([]);
      setSearchQuery('');
      setFilterType('all');
      setSelectedCustomer(null);
      setDrawerOpen(false);
    }
  }, [isOpen, fetchCustomers]);

  // Keep selected customer balance in sync with the latest list after a payment.
  useEffect(() => {
    if (!selectedCustomer) return;
    const latest = customers.find((c) => c.id === selectedCustomer.id);
    if (latest && latest.balance !== selectedCustomer.balance) {
      setSelectedCustomer(latest);
    }
  }, [customers, selectedCustomer]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open) => {
    setDrawerOpen(open);
    if (!open) setSelectedCustomer(null);
  };

  const handleClose = () => {
    onClose?.();
  };

  // Phase 2A: Statement generation with parallel item-detail fetching.
  // Pure read-only — calls getSingleOrderNew per credit entry, never mutates data.
  const [generatingStatement, setGeneratingStatement] = useState(false);

  // Parallel fetch: 5 at a time with progress callback + yield points for UI
  const fetchOrderItemsParallel = async (credits, onProgress) => {
    const items = {};
    const fetchable = credits.filter((c) => c.hasOrderDetail && c.orderId > 0);
    const BATCH = 5;
    let completed = 0;

    for (let i = 0; i < fetchable.length; i += BATCH) {
      const batch = fetchable.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          try {
            const data = await getSingleOrderNew(c.orderId);
            if (data) {
              items[c.orderId] = { items: data.items || [], amount: data.amount, subtotal: data.subtotal };
            }
          } catch { /* graceful — missing item won't block */ }
        })
      );
      completed += batch.length;
      onProgress?.(completed, fetchable.length);
      // Yield to main thread so React can breathe
      await new Promise((r) => setTimeout(r, 0));
    }
    return items;
  };

  // Shared date filter helper
  const filterByDate = (list, field, dateRange) => {
    if (!dateRange?.dateFrom && !dateRange?.dateTo) return list;
    return list.filter((entry) => {
      const raw = entry[field] || entry.createdAt;
      if (!raw) return true;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return true;
      const day = d.toISOString().slice(0, 10);
      if (dateRange.dateFrom && day < dateRange.dateFrom) return false;
      if (dateRange.dateTo && day > dateRange.dateTo) return false;
      return true;
    });
  };

  const handleGenerateStatement = async (customer, detail, dateRange, { isDetailed, preOpenedWindow } = {}) => {
    if (!customer || !detail) {
      toast({ title: 'Cannot generate statement', description: 'Customer details not loaded.', variant: 'destructive' });
      return;
    }

    const credits = filterByDate(detail.credits, 'orderCreatedAt', dateRange);
    const debits = filterByDate(detail.debits, 'createdAt', dateRange);

    if (credits.length === 0 && debits.length === 0) {
      if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
      toast({ title: 'Empty statement', description: 'No transactions in the selected date range.', variant: 'destructive' });
      return;
    }

    const win = preOpenedWindow || openStatementWindow();
    if (!win) {
      toast({ title: 'Popup blocked', description: 'Please allow popups for this site to generate statements.', variant: 'destructive' });
      return;
    }

    setGeneratingStatement(true);

    try {
      let orderItems = {};
      if (isDetailed) {
        const fetchable = credits.filter((c) => c.hasOrderDetail && c.orderId > 0);
        // Show initial progress page
        writeProgressPage(win, { current: 0, total: fetchable.length, customerName: customer.name });
        // Parallel fetch with progress
        orderItems = await fetchOrderItemsParallel(credits, (done, total) => {
          writeProgressPage(win, { current: done, total, customerName: customer.name });
        });
      }

      const totalCredit = detail.summary?.totalCreditAmount || credits.reduce((s, c) => s + c.amount, 0);
      const totalPaid = detail.summary?.totalDebitAmount || debits.reduce((s, d) => s + d.amount, 0);

      writeCreditStatement(win, {
        customer,
        summary: { totalCredit, totalPaid, balance: totalCredit - totalPaid, tapStartDate: detail.summary?.tapStartDate },
        credits, debits, dateRange, orderItems,
        restaurantName: restaurant?.name || '',
        generatedBy: user?.name || user?.email || '',
        isDetailed: !!isDetailed,
      });
    } catch (err) {
      console.error('[Statement generation]', err);
      if (win && !win.closed) win.close();
      toast({ title: 'Statement failed', description: err.readableMessage || err?.message, variant: 'destructive' });
    } finally {
      setGeneratingStatement(false);
    }
  };

  // SS2: Quick Statement (no item details — instant)
  const handleQuickStatement = (customer, detail, dateRange) => {
    const win = openStatementWindow();
    if (!win) { toast({ title: 'Popup blocked', description: 'Please allow popups for this site.', variant: 'destructive' }); return; }
    handleGenerateStatement(customer, detail, dateRange, { isDetailed: false, preOpenedWindow: win });
  };

  // SS2: Detailed Statement (with bill item details — slower)
  const handleDetailedStatement = (customer, detail, dateRange) => {
    const win = openStatementWindow();
    if (!win) { toast({ title: 'Popup blocked', description: 'Please allow popups for this site.', variant: 'destructive' }); return; }
    handleGenerateStatement(customer, detail, dateRange, { isDetailed: true, preOpenedWindow: win });
  };

  // SS1 per-row download: Quick statement (no item fetch, instant)
  const handleRowDownload = async (customer) => {
    if (!customer?.id) return;
    const win = openStatementWindow();
    if (!win) { toast({ title: 'Popup blocked', description: 'Please allow popups for this site.', variant: 'destructive' }); return; }

    setGeneratingStatement(true);
    try {
      const raw = await getTabCustomerRecords(customer.id);
      const credits = (raw?.credits || []).map((c) => ({
        id: c.id, orderId: Number(c.order_id) || 0, restaurantOrderId: c.restaurant_order_id ?? null,
        amount: parseFloat(c.credit_order_amount) || 0, currentBalance: parseFloat(c.current_balance) || 0,
        paymentStatus: c.payment_status || '', createdAt: c.created_at || null,
        orderCreatedAt: c.order_created_at || null, hasOrderDetail: Number(c.order_id) > 0,
      }));
      const debits = (raw?.debits || []).map((d) => ({
        id: d.id, amount: parseFloat(d.debit_order_amount) || 0, currentBalance: parseFloat(d.current_balance) || 0,
        paymentMethod: d.payment_status || '', createdAt: d.created_at || null,
      }));
      const totalCredit = raw?.meta?.totalCreditAmount || credits.reduce((s, c) => s + c.amount, 0);
      const totalPaid = raw?.meta?.totalDebitAmount || debits.reduce((s, d) => s + d.amount, 0);
      const detail = { credits, debits, summary: { totalCredit, totalPaid, balance: totalCredit - totalPaid, tapStartDate: raw?.meta?.tapStartDate || null, totalCreditAmount: raw?.meta?.totalCreditAmount, totalDebitAmount: raw?.meta?.totalDebitAmount } };
      // Quick statement for SS1 row — no item details (instant)
      await handleGenerateStatement(customer, detail, {}, { isDetailed: false, preOpenedWindow: win });
    } catch (err) {
      console.error('[Row download]', err);
      if (win && !win.closed) win.close();
      toast({ title: 'Download failed', description: err.readableMessage || err?.message, variant: 'destructive' });
    } finally {
      setGeneratingStatement(false);
    }
  };

  // Portfolio Summary: single PDF with all customers' credit/paid/outstanding
  const handlePortfolioExport = async (filteredCustomers, filterLabel) => {
    if (!filteredCustomers?.length) {
      toast({ title: 'No customers', description: 'No customers to export.', variant: 'destructive' });
      return;
    }
    const win = openStatementWindow();
    if (!win) {
      toast({ title: 'Popup blocked', description: 'Please allow popups for this site.', variant: 'destructive' });
      return;
    }

    setGeneratingStatement(true);
    try {
      // Show progress while fetching per-customer totals
      writeProgressPage(win, { current: 0, total: filteredCustomers.length, customerName: 'Portfolio Summary' });

      // CR-039 Option B: per-customer totals now available from list API — no N+1 calls needed.
      const enriched = filteredCustomers.map((c) => ({
        name: c.name,
        mobile: c.mobile,
        totalCredit: c.totalCredit || 0,
        totalPaid: c.totalDebit || 0,
        outstanding: (c.totalCredit || 0) - (c.totalDebit || 0),
      }));

      // Sort by outstanding descending
      enriched.sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));

      writePortfolioStatement(win, {
        customers: enriched,
        restaurantName: restaurant?.name || '',
        generatedBy: user?.name || user?.email || '',
        filterLabel,
      });
    } catch (err) {
      console.error('[Portfolio export]', err);
      if (win && !win.closed) win.close();
      toast({ title: 'Export failed', description: err.readableMessage || err?.message, variant: 'destructive' });
    } finally {
      setGeneratingStatement(false);
    }
  };

  return (
    <div
      data-testid="credit-management-panel"
      className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl"
      style={{
        left: `${sidebarWidth || 70}px`,
        backgroundColor: COLORS.sectionBg,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-white"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Credit Management
          </h2>
          <p className="text-xs" style={{ color: COLORS.grayText }}>
            Track customer tabs and record payments
          </p>
        </div>
        <button
          data-testid="credit-close-btn"
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <CreditCustomerList
            customers={customers}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            filterType={filterType}
            onSearchChange={setSearchQuery}
            onFilterChange={setFilterType}
            onSelectCustomer={handleSelectCustomer}
            onRetry={fetchCustomers}
            onDownloadStatement={handleRowDownload}
            onPortfolioExport={handlePortfolioExport}
            generatingStatement={generatingStatement}
            totalCredit={totalCredit}
            totalPaid={totalPaid}
          />
        </div>
      </div>

      {/* SS2 drawer — only mount while the panel is open so the drawer
          doesn't outlive the Credit Management context. */}
      {isOpen && (
        <CreditCustomerDetailSheet
          open={drawerOpen}
          customer={selectedCustomer}
          paymentMethods={restaurant?.paymentMethods}
          onOpenChange={handleDrawerOpenChange}
          onPaymentRecorded={fetchCustomers}
          onQuickStatement={handleQuickStatement}
          onDetailedStatement={handleDetailedStatement}
        />
      )}
    </div>
  );
};

export default CreditManagementPanel;
