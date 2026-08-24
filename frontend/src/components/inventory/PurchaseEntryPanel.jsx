// CR-072: Purchase Entry Panel — multi-line purchase form
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Check, Paperclip } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';

function emptyLineItem() {
  return { _key: Date.now() + Math.random(), ingredientId: '', unit: '', quantity: '', rate: '', batch: '', expiry: '' };
}

export default function PurchaseEntryPanel() {
  const [ingredients, setIngredients] = useState([]);
  const [vendorTypes, setVendorTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [vendorName, setVendorName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [lineItems, setLineItems] = useState([emptyLineItem()]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ings, vendors, payments] = await Promise.all([
        inventoryService.getIngredients(),
        inventoryService.getVendorTypes(),
        inventoryService.getPaymentMethods(),
      ]);
      setIngredients(ings);
      setVendorTypes(vendors);
      setPaymentMethods(Array.isArray(payments) ? payments : []);
    } catch (err) {
      toast.error('Failed to load purchase form data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addRow = () => setLineItems(prev => [...prev, emptyLineItem()]);

  const removeRow = (key) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter(r => r._key !== key));
  };

  const updateRow = (key, field, value) => {
    setLineItems(prev => prev.map(r => {
      if (r._key !== key) return r;
      const updated = { ...r, [field]: value };
      // Auto-fill unit when ingredient selected
      if (field === 'ingredientId' && value) {
        const ing = ingredients.find(i => i.id === Number(value));
        if (ing) updated.unit = ing.unit;
      }
      return updated;
    }));
  };

  // Compute per-row amount and totals
  const computedItems = useMemo(() => {
    return lineItems.map(item => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return { ...item, amount: qty * rate };
    });
  }, [lineItems]);

  const totalAmount = useMemo(() => computedItems.reduce((s, i) => s + i.amount, 0), [computedItems]);
  const totalQty = useMemo(() => computedItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0), [computedItems]);
  const itemCount = computedItems.filter(i => i.ingredientId).length;

  // Format date as DD-MM-YYYY per R9
  const formatDateForAPI = (isoDate) => {
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y}`;
  };

  const handleSubmit = async () => {
    if (!vendorName.trim()) { toast.error('Vendor is required'); return; }
    const validItems = computedItems.filter(i => i.ingredientId && Number(i.quantity) > 0);
    if (validItems.length === 0) { toast.error('Add at least one line item'); return; }

    setSaving(true);
    try {
      const ing = ingredients.find(i => i.id === Number(validItems[0].ingredientId));
      await inventoryService.addPurchase({
        vendorName: vendorName,
        vendorId: null,
        purchaseDate: formatDateForAPI(purchaseDate), // R9: DD-MM-YYYY
        paymentMethod: paymentMethod,
        invoiceNumber: invoiceNumber,
        items: validItems.map(item => {
          const ingr = ingredients.find(i => i.id === Number(item.ingredientId));
          return {
            ingredientId: Number(item.ingredientId), // R9: capital I in API payload handled by transform
            unit: item.unit || ingr?.unit || '',
            quantity: Number(item.quantity),
            rate: Number(item.rate),
            amount: Number(item.quantity) * Number(item.rate),
            conversionFactor: ingr?.conversionFactor || 1,
          };
        }),
      });
      toast.success('Purchase entry saved');
      // Reset form
      setVendorName('');
      setInvoiceNumber('');
      setPaymentMethod('');
      setLineItems([emptyLineItem()]);
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "h-9 text-sm border-slate-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-100 rounded-md bg-white";
  const selectCls = "h-9 text-sm border border-slate-200 focus:border-orange-400 rounded-md bg-white w-full px-2 outline-none";

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Loading purchase form...</div>;

  return (
    <div data-testid="purchase-entry-panel">
      {/* Header Fields */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-slate-500">Vendor <span className="text-red-500">*</span></Label>
            <Input value={vendorName} onChange={e => setVendorName(e.target.value)}
              placeholder="e.g. Kunafabake" className={`mt-1 ${inputCls}`} data-testid="purchase-vendor" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Purchase Date</Label>
            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
              className={`mt-1 ${inputCls}`} data-testid="purchase-date" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Invoice / Bill No.</Label>
            <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="INV-0012" className={`mt-1 ${inputCls}`} data-testid="purchase-invoice" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Payment Method</Label>
            <select className={`mt-1 ${selectCls}`} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              data-testid="purchase-payment-method">
              <option value="">Select...</option>
              {paymentMethods.map((pm, i) => (
                <option key={i} value={typeof pm === 'string' ? pm : pm.name}>{typeof pm === 'string' ? pm : pm.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Line Items</span>
          <button onClick={addRow} className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
            data-testid="purchase-add-row">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 850 }} data-testid="purchase-line-items">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: '25%' }}>Ingredient</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: '8%' }}>Unit</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: '10%' }}>Qty</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right" style={{ width: '12%' }}>Rate (₹)</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right" style={{ width: '12%' }}>Amount (₹)</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: '12%' }}>Batch</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: '12%' }}>Expiry</th>
                <th className="py-2.5 px-4 border-b border-slate-200" style={{ width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {computedItems.map((item, idx) => (
                <tr key={item._key} className="border-b border-slate-50" data-testid={`purchase-row-${idx}`}>
                  <td className="py-2 px-4">
                    <select className={selectCls} value={item.ingredientId}
                      onChange={e => updateRow(item._key, 'ingredientId', e.target.value)}
                      data-testid={`purchase-ingredient-${idx}`}>
                      <option value="">Select ingredient...</option>
                      {ingredients.filter(i => !i.isSubRecipe).map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}{/* CR-139: sub-recipes not purchasable */}
                    </select>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{item.unit || '—'}</span>
                  </td>
                  <td className="py-2 px-4">
                    <Input type="number" step="0.01" value={item.quantity}
                      onChange={e => updateRow(item._key, 'quantity', e.target.value)}
                      placeholder="0" className={`text-center ${inputCls}`} data-testid={`purchase-qty-${idx}`} />
                  </td>
                  <td className="py-2 px-4">
                    <Input type="number" step="0.01" value={item.rate}
                      onChange={e => updateRow(item._key, 'rate', e.target.value)}
                      placeholder="0.00" className={`text-right ${inputCls}`} data-testid={`purchase-rate-${idx}`} />
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.amount > 0 ? `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <Input value={item.batch} onChange={e => updateRow(item._key, 'batch', e.target.value)}
                      placeholder="B-001" className={inputCls} />
                  </td>
                  <td className="py-2 px-4">
                    <Input type="date" value={item.expiry} onChange={e => updateRow(item._key, 'expiry', e.target.value)}
                      className={inputCls} />
                  </td>
                  <td className="py-2 px-4 text-center">
                    {lineItems.length > 1 && (
                      <button onClick={() => removeRow(item._key)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        data-testid={`purchase-delete-${idx}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Totals */}
        <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Items: <span className="font-semibold text-slate-700">{itemCount}</span>
            {totalQty > 0 && <span className="ml-3">Total Qty: <span className="font-semibold text-slate-700">{totalQty}</span></span>}
          </span>
          <span className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="purchase-total">
            Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Invoice Upload Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex items-center gap-3">
        <Paperclip className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Attach Invoice (PDF/Image)</span>
        <Button variant="outline" size="sm" className="ml-auto" data-testid="purchase-attach-btn">Browse</Button>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 px-6" data-testid="purchase-submit-btn">
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : 'Complete Purchase'}
        </Button>
      </div>
    </div>
  );
}
