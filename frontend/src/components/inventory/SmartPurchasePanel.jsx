// CR-078 · Smart Purchase Panel — orchestrator
// Locked rulings: B1-B15, G4/G7/G9/G11/G12/G15, Path X (calQuantity+smallUnit)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as inventoryService from '@/api/services/inventoryService';
import { computePlan, getHorizonDates } from '@/utils/purchasePlanner';
import { rankVendors } from '@/utils/vendorRanking';
import HorizonPicker from './smart/HorizonPicker';
import AutoShoppingList from './smart/AutoShoppingList';
import GroupedVendorPreview from './smart/GroupedVendorPreview';

const DEFAULT_HORIZON = 7;

export default function SmartPurchasePanel() {
  const [horizonDays, setHorizonDays] = useState(DEFAULT_HORIZON);
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set()); // CR-103: bulk selection
  const [showAll, setShowAll] = useState(false); // CR-105 Sub-A
  const [pmByVendor, setPmByVendor] = useState({});
  const [ingredientsMaster, setIngredientsMaster] = useState([]);
  const [vendorItemList, setVendorItemList] = useState([]);
  const [vendorMaster, setVendorMaster] = useState([]); // BUG-227
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState(null);

  // ── Fetch data (mount + horizon change) ─────────────────────────
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSubmitResults(null);
    try {
      const dates = getHorizonDates(horizonDays);
      const [stock, dcr, vil, ingMaster, pms, vendorMasterRaw] = await Promise.all([ // BUG-227: +getVendors
        inventoryService.getStockInventory(),
        inventoryService.getDailyConsumptionReport(dates),
        inventoryService.getVendorItemList(),
        inventoryService.getIngredients(),
        inventoryService.getPaymentMethods(),
        inventoryService.getVendors(), // BUG-227
      ]);
      const planned = computePlan({
        stockInventory: stock,
        dcrStockSummary: dcr?.stock_summary || [],
        horizonDays,
        showAll, // CR-105 Sub-A
      });
      // Attach winning vendor + initial qty
      const masterList = vendorMasterRaw || []; // BUG-227
      const initialRows = planned.map(r => {
        const ranking = rankVendors(vil, r.ingredient_id, masterList); // BUG-227: pass master
        return {
          ...r,
          vendor_id: ranking.winner?.vendor_id ?? 'system',            // BUG-242: default System Vendor when no history
          rate: '',                                                    // BUG-241: don't auto-fill; user must enter to opt in
          suggestedRate: ranking.winner?.unit_price ?? null,            // BUG-241: hint only
          qty: r.suggest_qty,
          batch: '',
          expiry: '',
          origin: r.origin || 'planner', // BUG-224
        };
      });
      setRows(initialRows);
      setIngredientsMaster(ingMaster);
      setVendorItemList(vil);
      setVendorMaster(masterList); // BUG-227
      setPaymentMethods(pms);
    } catch (err) {
      setLoadError(err?.readableMessage || err?.message || 'Failed to load Smart Purchase');
    } finally {
      setLoading(false);
    }
  }, [horizonDays, showAll]); // CR-105

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // ── Vendor ranking cache (used by AutoShoppingList) ─────────────
  const rankingByIngredient = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(String(r.ingredient_id))) {
        map.set(String(r.ingredient_id), rankVendors(vendorItemList, r.ingredient_id, vendorMaster)); // BUG-227: pass master
      }
    });
    return map;
  }, [rows, vendorItemList, vendorMaster]); // BUG-227: +vendorMaster dep

  const vendorNamesById = useMemo(() => {
    const m = {};
    // BUG-227: seed from master first
    (vendorMaster || []).forEach(v => {
      const vid = String(v.id || v.vendor_id);
      if (vid) m[vid] = v.name || v.vendor_name || `Vendor #${vid}`;
    });
    // Overlay from history (more recent names win)
    vendorItemList.forEach(v => { if (v.vendor_id) m[String(v.vendor_id)] = v.Vendor_Name || v.vendor_name || `Vendor #${v.vendor_id}`; });
    m['system'] = 'System Vendor (no purchase history)'; // BUG-227 + BUG-264: clarify meaning
    return m;
  }, [vendorItemList, vendorMaster]); // BUG-227: +vendorMaster dep

  // ── Group by vendor (for submit preview + submit loop) ──────────
  // CR-103 Sub-A: Only include rows where user intends to buy (rate > 0)
  const activeRows = useMemo(() => rows.filter(r => Number(r.rate) > 0), [rows]);
  const groupedByVendor = useMemo(() => {
    const g = {};
    activeRows.forEach(r => {
      const key = String(r.vendor_id ?? 'null');
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    return g;
  }, [activeRows]);

  // ── Row handlers ─────────────────────────────────────────────────
  const onRowChange = (ix, patch) => setRows(prev => prev.map((r, i) => i === ix ? { ...r, ...patch } : r));
  const onRowRemove = (ix) => { setRows(prev => prev.filter((_, i) => i !== ix)); setSelectedRows(new Set()); }; // CR-103: clear selection on single remove
  const onAddAdHoc = (newRow) => setRows(prev => [newRow, ...prev]); // CR-105: add to top
  // CR-103: Selection handlers for bulk remove
  const onToggleRow = (ix) => setSelectedRows(prev => {
    const next = new Set(prev);
    next.has(ix) ? next.delete(ix) : next.add(ix);
    return next;
  });
  const onToggleAll = () => setSelectedRows(prev =>
    prev.size === rows.length ? new Set() : new Set(rows.map((_, i) => i))
  );
  const onBulkRemove = () => {
    setRows(prev => prev.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
  };

  // ── Validation ───────────────────────────────────────────────────
  // CR-103 Sub-A: Validate only active rows (rate > 0); skip untouched rows
  const validate = () => {
    if (activeRows.length === 0) return 'No items to purchase — enter rate for at least one item';
    const badQty = activeRows.find(r => !(Number(r.qty ?? r.suggest_qty) > 0));
    if (badQty) return `Quantity must be > 0 for ${badQty.name}`;
    // BUG-242: Block submit for rows with no vendor selected
    const noVendor = activeRows.find(r => !r.vendor_id || r.vendor_id === 'null');
    if (noVendor) return `Select a vendor for ${noVendor.name}`;
    // B1 · PM per vendor group
    const missingPm = Object.keys(groupedByVendor).find(vid => !pmByVendor[vid]);
    if (missingPm) return `Payment method required for ${vendorNamesById[missingPm] || 'vendor #' + missingPm}`;
    return null;
  };

  // ── Submit (N sequential /add-purchase calls · partial-success UX) ───
  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    setSubmitResults(null);
    const ok = []; const failed = [];
    const today = new Date();
    const purchaseDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()+1).padStart(2, '0')}-${today.getFullYear()}`;
    for (const [vid, group] of Object.entries(groupedByVendor)) {
      try {
        await inventoryService.addPurchase({
          vendorName: vendorNamesById[vid] || '',
          vendorId: vid === 'null' ? null : (vid === 'system' ? null : vid), // BUG-227: System Vendor is display-only — NEVER submit
          purchaseDate,
          paymentMethod: pmByVendor[vid],
          invoiceNumber: '',
          notes: `Smart Purchase · horizon ${horizonDays}d`,
          items: group.map(r => ({
            ingredientId: r.ingredient_id,
            unit: r.unit,
            quantity: Number(r.qty ?? r.suggest_qty),
            rate: Number(r.rate),
            amount: Number(r.qty ?? r.suggest_qty) * Number(r.rate),
            conversionFactor: 1,
            batch: r.batch || '',
            expiry: r.expiry || '',
            origin: r.origin || 'planner',
          })),
        });
        ok.push({ vid, name: vendorNamesById[vid] || `#${vid}`, lines: group.length });
      } catch (e) {
        failed.push({ vid, name: vendorNamesById[vid] || `#${vid}`, error: e?.readableMessage || e?.message || 'Failed' });
      }
    }
    setSubmitResults({ ok, failed });
    setSubmitting(false);
    if (failed.length === 0) { toast.success(`${ok.length} vendor purchase${ok.length > 1 ? 's' : ''} submitted`); await fetchPlan(); }
    else if (ok.length === 0) toast.error('All submissions failed. See details.');
    else toast.warning(`${ok.length} succeeded · ${failed.length} failed`);
  };

  const canSubmit = activeRows.length > 0 && !submitting; // CR-103: only active rows count

  return (
    <div data-testid="smart-purchase-panel">
      {/* CR-081: Toolbar with horizon picker + Review & Submit */}
      {/* BUG-263: sticky toolbar so controls stay visible while scrolling 100+ items */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10 shadow-sm">
        <HorizonPicker value={horizonDays} onChange={setHorizonDays} />
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            {loading ? 'Computing plan…' : `${rows.length} item${rows.length === 1 ? '' : 's'} to buy`}
          </div>
          {/* CR-081: Review & Submit button (green, top-right per mockup) */}
          {!loading && rows.length > 0 && (
            <Button onClick={handleSubmit} disabled={!canSubmit}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 text-xs" data-testid="smart-purchase-review-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Review &amp; Submit
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between" data-testid="load-error">
          <span className="text-sm text-red-700">{loadError}</span>
          <Button variant="outline" size="sm" onClick={fetchPlan} className="text-red-600 border-red-300 hover:bg-red-100">Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 flex items-center justify-center gap-2 text-sm text-slate-400" data-testid="loading">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading Smart Purchase…
        </div>
      ) : (
        <>
          <AutoShoppingList
            rows={rows}
            rankingByIngredient={rankingByIngredient}
            ingredientsMaster={ingredientsMaster}
            vendorItemList={vendorItemList}
            onRowChange={onRowChange}
            onRowRemove={onRowRemove}
            onAddAdHoc={onAddAdHoc}
            selectedRows={selectedRows}
            onToggleRow={onToggleRow}
            onToggleAll={onToggleAll}
            onBulkRemove={onBulkRemove}
            horizonDays={horizonDays}
            showAll={showAll}
            onToggleShowAll={() => setShowAll(p => !p)}
          />

          <GroupedVendorPreview
            groupedByVendor={groupedByVendor}
            paymentMethodsList={paymentMethods}
            pmByVendor={pmByVendor}
            onPmChange={(vid, pm) => setPmByVendor(prev => ({ ...prev, [vid]: pm }))}
            vendorNamesById={vendorNamesById}
          />

          {submitResults && (submitResults.failed.length > 0 || submitResults.ok.length > 0) && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 space-y-1" data-testid="submit-results">
              {submitResults.ok.map((r, i) => (
                <div key={i} className="text-xs text-green-700">✓ {r.name} · {r.lines} line(s) submitted</div>
              ))}
              {submitResults.failed.map((r, i) => (
                <div key={i} className="text-xs text-red-700">✗ {r.name} · {r.error}</div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={!canSubmit}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2" data-testid="smart-purchase-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              {submitting ? 'Submitting…' : `Submit Purchase (${Object.keys(groupedByVendor).length} vendor${Object.keys(groupedByVendor).length === 1 ? '' : 's'})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
