// CR-069: Employee List — Inline Editable Grid
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Check, Trash2, KeyRound, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import * as employeeService from '@/api/services/employeeService';
import * as roleService from '@/api/services/roleService';
import ResetPasswordDialog from './ResetPasswordDialog';

export default function EmployeeListView() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newRows, setNewRows] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const newRowRef = useRef(null);
  let nextTempId = useRef(-1);

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
      password: '',
      roleId: roles[0]?.id || null,
      roleName: roles[0]?.name || '',
    };
    setNewRows(prev => [row, ...prev]);
    setTimeout(() => newRowRef.current?.focus(), 50);
  };

  // Remove unsaved row
  const removeNewRow = (tempId) => {
    setNewRows(prev => prev.filter(r => r._tempId !== tempId));
  };

  // Update new row field
  const updateNewRow = (tempId, field, value) => {
    setNewRows(prev => prev.map(r =>
      r._tempId === tempId ? { ...r, [field]: value } : r
    ));
  };

  // Update existing employee field (buffer)
  const updateExisting = (id, field, value) => {
    setEditBuffer(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
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
      toast.error(err?.response?.data?.message || 'Failed to save');
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

  // Reset password
  const handleResetPassword = async (password) => {
    if (!resetTarget) return;
    try {
      await employeeService.resetEmployeePassword(resetTarget.id, password);
      toast.success(`Password reset for ${resetTarget.firstName}`);
      setResetTarget(null);
    } catch (err) {
      toast.error('Failed to reset password');
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
                {['First Name', 'Last Name', 'Phone', 'Email', 'Password', 'Role', 'Status', ''].map((h, i) => (
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
                      placeholder="Email" className={inputCls} />
                  </td>
                  <td className="py-2 px-3">
                    <Input type="password" value={row.password} onChange={e => updateNewRow(row._tempId, 'password', e.target.value)}
                      placeholder="Password *" className={inputCls} data-testid={`emp-new-password-${row._tempId}`} />
                  </td>
                  <td className="py-2 px-3">
                    <select className={selectCls} value={row.roleId || ''}
                      onChange={e => {
                        const r = roleOptions.find(ro => ro.id === Number(e.target.value));
                        updateNewRow(row._tempId, 'roleId', r?.id || null);
                        updateNewRow(row._tempId, 'roleName', r?.name || '');
                      }}>
                      <option value="">Select...</option>
                      {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
                      <Input type="password" value="--------" disabled
                        className="h-9 text-sm border-slate-200 rounded-md bg-slate-50 text-slate-400 flex-1" />
                      <button onClick={() => setResetTarget(emp)}
                        className="p-1.5 rounded-md hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors flex-shrink-0"
                        title="Reset Password" data-testid={`emp-reset-pwd-${emp.id}`}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <select className={selectCls}
                      value={getVal(emp, 'roleId') || ''}
                      onChange={e => {
                        const r = roleOptions.find(ro => ro.id === Number(e.target.value));
                        updateExisting(emp.id, 'roleId', r?.id || null);
                        updateExisting(emp.id, 'roleName', r?.name || '');
                      }}>
                      <option value="">Select...</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={!!resetTarget}
        onOpenChange={(open) => { if (!open) setResetTarget(null); }}
        employeeName={resetTarget ? `${resetTarget.firstName} ${resetTarget.lastName}`.trim() : ''}
        onConfirm={handleResetPassword}
      />
    </div>
  );
}
