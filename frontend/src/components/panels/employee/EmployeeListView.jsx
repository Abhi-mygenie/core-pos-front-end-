// CR-069: Employee List — Inline Editable Grid
// BUG-198: POST→PUT, inline password + eye toggle, removed ResetPasswordDialog
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Check, Trash2, Eye, EyeOff, UserCheck, UserX } from 'lucide-react'; // BUG-198: Eye/EyeOff replace KeyRound
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import * as employeeService from '@/api/services/employeeService';
import * as roleService from '@/api/services/roleService';
import { useRestaurant } from '@/contexts/RestaurantContext'; // BUG-229: restaurant name for auto-email

export default function EmployeeListView() {
  const { restaurant } = useRestaurant(); // BUG-229: get restaurant name for auto-email
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newRows, setNewRows] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // BUG-198: replaces resetTarget
  const newRowRef = useRef(null);
  let nextTempId = useRef(-1);

  // BUG-229: Auto-generate email as firstname@restaurantname.com
  const generateEmail = useCallback((firstName) => {
    if (!firstName?.trim() || !restaurant?.name) return '';
    const fname = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const rname = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!fname || !rname) return '';
    return `${fname}@${rname}.com`;
  }, [restaurant?.name]);

  // Load data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, roleList] = await Promise.all([
        employeeService.getEmployees(),
        roleService.getRoles(),
      ]);
      setEmployees(emps);
      setRoles(roleList);
      setNewRows([]);
      setDirtyIds(new Set());
      setEditBuffer({});
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Add empty row
  const addRow = () => {
    const tempId = nextTempId.current--;
    const row = {
      _tempId: tempId,
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      _emailManual: false, // BUG-229/230: track if email was manually edited
      password: '',
      roleId: roles.find(r => r.isEditable && r.active)?.id || null,   // BUG-234: default to first assignable role
      roleName: roles.find(r => r.isEditable && r.active)?.name || '',  // BUG-234
    };
    setNewRows(prev => [row, ...prev]);
    setTimeout(() => newRowRef.current?.focus(), 50);
  };

  // Remove unsaved row
  const removeNewRow = (tempId) => {
    setNewRows(prev => prev.filter(r => r._tempId !== tempId));
  };

  // Update new row field
  // BUG-229: auto-generate email on firstName change
  // BUG-230: track manual email edits, sync on name change
  const updateNewRow = (tempId, field, value) => {
    setNewRows(prev => prev.map(r => {
      if (r._tempId !== tempId) return r;
      const updated = { ...r, [field]: value };
      if (field === 'firstName' && !r._emailManual) {
        updated.email = generateEmail(value);
      }
      if (field === 'email') {
        updated._emailManual = true;
      }
      return updated;
    }));
  };

  // Update existing employee field (buffer)
  // BUG-230: sync email when firstName changes for existing employees
  const updateExisting = (id, field, value) => {
    setEditBuffer(prev => {
      const buf = { ...(prev[id] || {}), [field]: value };
      // BUG-230 fix: always regenerate email on firstName change
      // unless user explicitly typed in the email field during this edit session.
      // Previous logic compared against expectedAutoEmail and permanently blocked
      // sync on any mismatch (typos, backend defaults). Now matches ADD flow behavior.
      if (field === 'firstName' && !buf._emailManual) {
        buf.email = generateEmail(value);
      }
      if (field === 'email') {
        buf._emailManual = true;
      }
      return { ...prev, [id]: buf };
    });
    setDirtyIds(prev => new Set(prev).add(id));
  };

  // Get display value for existing employee (buffer overrides original)
  const getVal = (emp, field) => {
    return editBuffer[emp.id]?.[field] ?? emp[field];
  };

  // Save all changes
  const saveAll = async () => {
    setSaving(true);
    try {
      // Validate new rows
      for (const row of newRows) {
        if (!row.firstName.trim()) { toast.error('First name is required for new employees'); setSaving(false); return; }
        if (!row.phone.trim()) { toast.error('Phone is required for new employees'); setSaving(false); return; }
        if (!row.email.trim()) { toast.error('Email (User ID) is required for new employees'); setSaving(false); return; } // BUG-229: email mandatory
        if (!row.password.trim()) { toast.error('Password is required for new employees'); setSaving(false); return; }
        if (!row.roleId) { toast.error('Role is required for new employees'); setSaving(false); return; }
      }

      // Create new employees
      for (const row of newRows) {
        await employeeService.addEmployee(row);
      }

      // Update dirty existing employees
      for (const id of dirtyIds) {
        const emp = employees.find(e => e.id === id);
        if (!emp) continue;
        const merged = { ...emp, ...(editBuffer[id] || {}) };
        await employeeService.updateEmployee(id, merged);
      }

      toast.success(`Saved ${newRows.length + dirtyIds.size} change(s)`);
      await fetchData();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        Object.entries(data.errors).forEach(([field, messages]) => {
          const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          toast.error(`${label}: ${messages.join(', ')}`);
        });
      } else {
        toast.error(data?.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  // Toggle status
  const toggleStatus = async (emp) => {
    try {
      await employeeService.toggleEmployeeStatus(emp.id, !emp.active);
      toast.success(`${emp.firstName} ${emp.active ? 'deactivated' : 'activated'}`);
      await fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Filter
  const filtered = employees.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.roleName.toLowerCase().includes(q)
    );
  });

  const hasUnsaved = newRows.length > 0 || dirtyIds.size > 0;
  const roleOptions = roles.filter(r => r.isEditable && r.active);

  const inputCls = "h-9 text-sm border-slate-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-100 rounded-md bg-white";
  const selectCls = "h-9 text-sm border border-slate-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-100 rounded-md bg-white w-full px-2 outline-none";

  return (
    <div data-testid="employee-list-view">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
            data-testid="employee-search"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {hasUnsaved && (
            <Button
              onClick={saveAll}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              data-testid="employee-save-all-btn"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : `Save All (${newRows.length + dirtyIds.size})`}
            </Button>
          )}
          <Button
            onClick={addRow}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            data-testid="employee-add-btn"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 1050 }} data-testid="employee-grid">
            <thead>
              <tr className="bg-slate-50/80">
                {['First Name', 'Last Name', 'Phone', 'Email (User ID)', 'Password', 'Role', 'Status', ''].map((h, i) => (
                  <th key={i} className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200"
                    style={{ width: i === 7 ? 80 : i === 6 ? 80 : i === 5 ? 130 : undefined }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* New rows at top */}
              {newRows.map((row) => (
                <tr key={row._tempId} className="border-b border-slate-100 bg-green-50/40" data-testid={`employee-new-row-${row._tempId}`}>
                  <td className="py-2 px-3">
                    <Input ref={newRowRef} value={row.firstName} onChange={e => updateNewRow(row._tempId, 'firstName', e.target.value)}
                      placeholder="First name *" className={inputCls} data-testid={`emp-new-fname-${row._tempId}`} />
                  </td>
                  <td className="py-2 px-3">
                    <Input value={row.lastName} onChange={e => updateNewRow(row._tempId, 'lastName', e.target.value)}
                      placeholder="Last name" className={inputCls} />
                  </td>
                  <td className="py-2 px-3">
                    <Input value={row.phone} onChange={e => updateNewRow(row._tempId, 'phone', e.target.value)}
                      placeholder="Phone *" className={inputCls} />
                  </td>
                  <td className="py-2 px-3">
                    <Input value={row.email} onChange={e => updateNewRow(row._tempId, 'email', e.target.value)}
                      placeholder="Auto-generated email" className={inputCls} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <Input type={showPassword ? 'text' : 'password'} value={row.password}
                        onChange={e => updateNewRow(row._tempId, 'password', e.target.value)}
                        placeholder="Min 8: Aa + symbol (e.g. Test@123)" className={inputCls + ' flex-1'} data-testid={`emp-new-password-${row._tempId}`} />
                      <button onClick={() => setShowPassword(p => !p)}
                        className="p-1.5 rounded-md hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors flex-shrink-0"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        type="button"
                        data-testid={`emp-new-toggle-pwd-${row._tempId}`}>
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <select className={selectCls} value={row.roleId || ''}
                      onChange={e => {
                        const r = roles.find(ro => String(ro.id) === String(e.target.value));  // BUG-234: safe string compare
                        updateNewRow(row._tempId, 'roleId', r?.id || null);
                        updateNewRow(row._tempId, 'roleName', r?.name || '');
                      }}>
                      <option value="">Select...</option>
                      {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}  {/* BUG-234 */}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">New</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => removeNewRow(row._tempId)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                      data-testid={`emp-new-delete-${row._tempId}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Existing employees */}
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">Loading employees...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  {search ? 'No employees match your search' : 'No employees found'}
                </td></tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${dirtyIds.has(emp.id) ? 'bg-orange-50/30' : ''}`}
                  data-testid={`employee-row-${emp.id}`}>
                  <td className="py-2 px-3">
                    <Input value={getVal(emp, 'firstName')} onChange={e => updateExisting(emp.id, 'firstName', e.target.value)}
                      className={inputCls} data-testid={`emp-fname-${emp.id}`} />
                  </td>
                  <td className="py-2 px-3">
                    <Input value={getVal(emp, 'lastName')} onChange={e => updateExisting(emp.id, 'lastName', e.target.value)}
                      className={inputCls} />
                  </td>
                  <td className="py-2 px-3">
                    <Input value={getVal(emp, 'phone')} onChange={e => updateExisting(emp.id, 'phone', e.target.value)}
                      className={inputCls} />
                  </td>
                  <td className="py-2 px-3">
                    <Input value={getVal(emp, 'email')} onChange={e => updateExisting(emp.id, 'email', e.target.value)}
                      className={inputCls} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <Input type={showPassword ? 'text' : 'password'}
                        value={getVal(emp, 'password') || ''}
                        onChange={e => updateExisting(emp.id, 'password', e.target.value)}
                        placeholder="Min 8: Aa + symbol (e.g. Test@123)"
                        className={inputCls + ' flex-1'}
                        data-testid={`emp-password-${emp.id}`} />
                      <button onClick={() => setShowPassword(p => !p)}
                        className="p-1.5 rounded-md hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors flex-shrink-0"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        type="button"
                        data-testid={`emp-toggle-pwd-${emp.id}`}>
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <select className={selectCls}
                      value={getVal(emp, 'roleId') || ''}
                      onChange={e => {
                        const r = roles.find(ro => String(ro.id) === String(e.target.value));  // BUG-234: safe string compare
                        updateExisting(emp.id, 'roleId', r?.id || null);
                        updateExisting(emp.id, 'roleName', r?.name || '');
                      }}>
                      <option value="">Select...</option>
                      {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}  {/* BUG-234 */}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Switch
                      checked={emp.active}
                      onCheckedChange={() => toggleStatus(emp)}
                      data-testid={`emp-status-${emp.id}`}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    {emp.active
                      ? <UserCheck className="w-4 h-4 text-green-500 mx-auto" />
                      : <UserX className="w-4 h-4 text-slate-300 mx-auto" />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unsaved count */}
      {hasUnsaved && (
        <p className="mt-2 text-xs text-slate-500" data-testid="unsaved-count">
          {newRows.length > 0 && `${newRows.length} new row${newRows.length > 1 ? 's' : ''}`}
          {newRows.length > 0 && dirtyIds.size > 0 && ', '}
          {dirtyIds.size > 0 && `${dirtyIds.size} modified`}
          {' '} — click Save All to persist
        </p>
      )}

    </div>
  );
}
