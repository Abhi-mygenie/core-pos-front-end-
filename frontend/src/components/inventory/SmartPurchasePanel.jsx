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
  const [pmByVendor, setPmByVendor] = useState({});
  const [ingredientsMaster, setIngredientsMaster] = useState([]);
  const [vendorItemList, setVendorItemList] = useState([]);
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
      const [stock, dcr, vil, ingMaster, pms] = await Promise.all([
        inventoryService.getStockInventory(),
        inventoryService.getDailyConsumptionReport(dates),
        inventoryService.getVendorItemList(),
        inventoryService.getIngredients(),
        inventoryService.getPaymentMethods(),
      ]);
      const planned = computePlan({
        stockInventory: stock,
        dcrStockSummary: dcr?.stock_summary || [],
        horizonDays,
      });
      // Attach winning vendor + initial qty
      const initialRows = planned.map(r => {
        const ranking = rankVendors(vil, r.ingredient_id);
        return {
          ...r,
          vendor_id: ranking.winner?.vendor_id ?? null,
          rate: ranking.winner?.unit_price ?? '',
          qty: r.suggest_qty,
          batch: '',
          expiry: '',
          origin: 'planner',
        };
      });
      setRows(initialRows);
      setIngredientsMaster(ingMaster);
      setVendorItemList(vil);
      setPaymentMethods(pms);
    } catch (err) {
      setLoadError(err?.readableMessage || err?.message || 'Failed to load Smart Purchase');
    } finally {
      setLoading(false);
    }
  }, [horizonDays]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // ── Vendor ranking cache (used by AutoShoppingList) ─────────────
  const rankingByIngredient = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(String(r.ingredient_id))) {
        map.set(String(r.ingredient_id), rankVendors(vendorItemList, r.ingredient_id));
      }
    });
    return map;
  }, [rows, vendorItemList]);

  const vendorNamesById = useMemo(() => {
    const m = {};
    vendorItemList.forEach(v => { if (v.vendor_id) m[String(v.vendor_id)] = v.Vendor_Name || `Vendor #${v.vendor_id}`; });
    return m;
  }, [vendorItemList]);

  // ── Group by vendor (for submit preview + submit loop) ──────────
  const groupedByVendor = useMemo(() => {
    const g = {};
    rows.forEach(r => {
      const key = String(r.vendor_id ?? 'null');
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    return g;
  }, [rows]);

  // ── Row handlers ─────────────────────────────────────────────────
  const onRowChange = (ix, patch) => setRows(prev => prev.map((r, i) => i === ix ? { ...r, ...patch } : r));
  const onRowRemove = (ix) => setRows(prev => prev.filter((_, i) => i !== ix));
  const onAddAdHoc = (newRow) => setRows(prev => [...prev, newRow]);

  // ── Validation ───────────────────────────────────────────────────
  const validate = () => {
    // B2 · rate > 0 for every row
    const badRate = rows.find(r => !(Number(r.rate) > 0));
    if (badRate) return `Rate must be > 0 for ${badRate.name}`;
    // B2 · qty > 0
    const badQty = rows.find(r => !(Number(r.qty ?? r.suggest_qty) > 0));
    if (badQty) return `Quantity must be > 0 for ${badQty.name}`;
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
          vendorId: vid === 'null' ? null : vid,
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

  const canSubmit = rows.length > 0 && !submitting;

  return (
    <div data-testid="smart-purchase-panel">
      {/* CR-081: Toolbar with horizon picker + Review & Submit */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
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
            horizonDays={horizonDays}
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
