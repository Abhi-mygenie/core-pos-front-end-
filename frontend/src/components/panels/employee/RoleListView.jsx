// CR-069: Role List View — Rich 6-column table (frozen mockup design)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Lock, Pencil, Eye, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import * as roleService from '@/api/services/roleService';
import * as employeeService from '@/api/services/employeeService';
import { PERMISSION_GROUPS, SECTION_COLORS, TOTAL_PERMISSIONS, getCategoryBreakdown } from '@/constants/permissionCatalog';

function CoverageBar({ categories }) {
  const segments = PERMISSION_GROUPS.map(g => {
    const count = categories[g.id] || 0;
    const pct = (count / TOTAL_PERMISSIONS) * 100;
    if (count === 0) return null;
    return (
      <div key={g.id} className="h-full rounded-sm" style={{ background: g.color, width: `${pct}%`, opacity: 0.85 }}
        title={`${g.title}: ${count}/${g.permissions.length}`} />
    );
  });
  const used = Object.values(categories).reduce((a, b) => a + b, 0);
  const emptyPct = ((TOTAL_PERMISSIONS - used) / TOTAL_PERMISSIONS) * 100;

  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 gap-px w-full">
      {segments}
      {emptyPct > 0 && <div className="h-full" style={{ background: '#e2e8f0', width: `${emptyPct}%` }} />}
    </div>
  );
}

function CategoryDots({ categories }) {
  return (
    <div className="flex items-center gap-1">
      {PERMISSION_GROUPS.map(g => {
        const count = categories[g.id] || 0;
        const ratio = count / g.permissions.length;
        const opacity = count === 0 ? 0.15 : ratio >= 0.8 ? 1 : ratio >= 0.4 ? 0.6 : 0.35;
        return (
          <span key={g.id} className="inline-block w-2 h-2 rounded-full"
            style={{ background: g.color, opacity }}
            title={`${g.title}: ${count}/${g.permissions.length}`} />
        );
      })}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RoleListView({ onEditRole }) {
  const [roles, setRoles] = useState([]);
  const [employeeCounts, setEmployeeCounts] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roleList, empList] = await Promise.all([
        roleService.getRoles(),
        employeeService.getEmployees(),
      ]);
      setRoles(roleList);
      // Compute employee count per role
      const counts = {};
      for (const emp of empList) {
        const rid = emp.roleId;
        if (rid) counts[rid] = (counts[rid] || 0) + 1;
      }
      setEmployeeCounts(counts);
    } catch (err) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (role) => {
    if (role.isSystemRole) return;
    try {
      await roleService.updateRole(role.id, { ...role, name: role.name, modules: role.modules, active: !role.active, roleTypes: [], roleMasterId: role.roleMasterId });
      toast.success(`${role.name} ${role.active ? 'deactivated' : 'activated'}`);
      await fetchData();
    } catch (err) {
      toast.error('Failed to update role status');
    }
  };

  const systemRoles = useMemo(() => roles.filter(r => r.isSystemRole), [roles]);
  const editableRoles = useMemo(() => roles.filter(r => !r.isSystemRole), [roles]);

  const filtered = useMemo(() => {
    const all = [...editableRoles, ...systemRoles];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(r => r.name.toLowerCase().includes(q));
  }, [editableRoles, systemRoles, search]);

  return (
    <div data-testid="role-list-view">
      {/* System Roles Banner */}
      {systemRoles.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Lock className="w-3.5 h-3.5" /> System Roles:
          </span>
          {systemRoles.map(r => (
            <span key={r.id} className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-500">
              {r.name}
            </span>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm" data-testid="role-search" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
            <Users className="w-3.5 h-3.5" />
            {roles.length} roles
          </div>
          <Button onClick={() => onEditRole?.(null)} className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            data-testid="create-role-button">
            <Plus className="w-4 h-4" /> Create Role
          </Button>
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-xs font-medium text-slate-400">Coverage:</span>
        {PERMISSION_GROUPS.map(g => (
          <span key={g.id} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: g.color }} />
            {g.title}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left" style={{ minWidth: 900 }} data-testid="role-table">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: 220 }}>Role</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: 120 }}>Employees</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">Permission Coverage</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: 120 }}>Last Modified</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: 80 }}>Status</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Loading roles...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">No roles found</td></tr>
            ) : filtered.map((role) => {
              const categories = getCategoryBreakdown(role.modules);
              const totalPerms = Object.values(categories).reduce((a, b) => a + b, 0);
              const coveragePct = Math.round((totalPerms / TOTAL_PERMISSIONS) * 100);
              const empCount = employeeCounts[role.id] || 0;

              return (
                <tr key={role.id} className={`hover:bg-slate-50/50 transition-colors ${role.isSystemRole ? 'bg-slate-50/30' : ''}`}
                  data-testid={`role-row-${role.id}`}>
                  {/* Role Info */}
                  <td className="py-4 px-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${role.isSystemRole ? 'text-slate-500' : 'text-slate-900'}`}
                        style={{ fontFamily: 'Manrope, sans-serif' }}>{role.name}</span>
                      {role.isSystemRole && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          <Lock className="w-2.5 h-2.5" /> Protected
                        </span>
                      )}
                    </div>
                    {role.roleMasterName && !role.isSystemRole && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 mt-1">
                        From: {role.roleMasterName}
                      </span>
                    )}
                  </td>

                  {/* Employee Count */}
                  <td className="py-4 px-4 border-b border-slate-100">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      <Users className="w-3 h-3" />
                      {empCount} {empCount === 1 ? 'employee' : 'employees'}
                    </span>
                  </td>

                  {/* Permission Coverage */}
                  <td className="py-4 px-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {totalPerms}<span className="text-xs font-normal text-slate-400">/{TOTAL_PERMISSIONS}</span>
                      </span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        coveragePct >= 80 ? 'bg-green-50 text-green-700' :
                        coveragePct >= 40 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-600'
                      }`}>{coveragePct}%</span>
                      <CategoryDots categories={categories} />
                    </div>
                    <CoverageBar categories={categories} />
                  </td>

                  {/* Last Modified */}
                  <td className="py-4 px-4 border-b border-slate-100">
                    <span className="text-xs text-slate-400">{formatDate(role.updatedAt)}</span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 border-b border-slate-100 text-center">
                    <Switch
                      checked={role.active}
                      onCheckedChange={() => toggleStatus(role)}
                      disabled={role.isSystemRole}
                      className="data-[state=checked]:bg-green-600"
                      data-testid={`role-status-switch-${role.id}`}
                    />
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 border-b border-slate-100 text-center">
                    {role.isEditable ? (
                      <button onClick={() => onEditRole?.(role)}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                        title="Edit role" data-testid={`role-edit-btn-${role.id}`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => onEditRole?.(role)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                        title="View role (protected)" data-testid={`role-view-btn-${role.id}`}>
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
