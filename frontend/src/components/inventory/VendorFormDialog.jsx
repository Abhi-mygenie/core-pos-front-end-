// CR-072: Vendor Form Dialog — Add/Edit vendor
import { useState, useEffect } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function VendorFormDialog({ open, onOpenChange, vendor, vendorTypes, onSave }) {
  const isEdit = !!vendor?.id;
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', typeId: '', gst: '' });

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name || '', contactPerson: vendor.contactPerson || '',
        phone: vendor.phone || '', email: vendor.email || '',
        address: vendor.address || '', typeId: vendor.typeId || '',
        gst: vendor.gst || '',
      });
    } else {
      setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', typeId: '', gst: '' });
    }
  }, [vendor]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, id: vendor?.id });
    onOpenChange(false);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const inputCls = "mt-1";
  const selectCls = "mt-1 h-9 w-full text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{isEdit ? 'Edit Vendor' : 'Add Vendor'}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Vendor Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Kunafabake" className={inputCls} data-testid="vendor-name-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Contact Person</Label>
              <Input value={form.contactPerson} onChange={e => update('contactPerson', e.target.value)} placeholder="e.g. Meet Singh" className={inputCls} data-testid="vendor-contact-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Phone</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 9876543210" className={inputCls} data-testid="vendor-phone-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Email</Label>
              <Input value={form.email} onChange={e => update('email', e.target.value)} placeholder="vendor@example.com" className={inputCls} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Address</Label>
            <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street, City" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Vendor Type</Label>
              <select className={selectCls} value={form.typeId} onChange={e => update('typeId', e.target.value)} data-testid="vendor-type-select">
                <option value="">Select type...</option>
                {(vendorTypes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">GST Number</Label>
              <Input value={form.gst} onChange={e => update('gst', e.target.value)} placeholder="GST27AAA..." className={inputCls} />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="vendor-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} className="bg-green-600 hover:bg-green-700" data-testid="vendor-save">
            {isEdit ? 'Update Vendor' : 'Add Vendor'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
