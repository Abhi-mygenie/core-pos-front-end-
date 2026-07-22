// CR-069: Role Form View — Create/Edit role with 8 business-function permission groups
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import * as roleService from '@/api/services/roleService';
import { PERMISSION_GROUPS, SECTION_COLORS, TOTAL_PERMISSIONS } from '@/constants/permissionCatalog';

export default function RoleFormView({ role, onBack }) {
  const isEdit = !!role?.id;
  const isReadOnly = role?.isSystemRole && !role?.isEditable;

  const [name, setName] = useState(role?.name || '');
  const [checkedPerms, setCheckedPerms] = useState(new Set(role?.modules || []));
  const [roleTypes, setRoleTypes] = useState(role?.roleTypes || []); // BUG-198: wire to state
  const [templates, setTemplates] = useState([]);
  const [expandedSections, setExpandedSections] = useState(new Set(['orders', 'discounts']));
  const [saving, setSaving] = useState(false);
  const [catalogRoleTypes, setCatalogRoleTypes] = useState([]);

  // Load catalog data
  useEffect(() => {
    async function load() {
      try {
        const [catalog, masterList] = await Promise.all([
          roleService.getAllRoleList(),
          roleService.getRoleMasterList(),
        ]);
        setCatalogRoleTypes(catalog.roleTypes);
        setTemplates(masterList);
      } catch (err) {
        toast.error('Failed to load permission catalog');
      }
    }
    load();
  }, []);

  // Toggle single permission
  const togglePerm = (key) => {
    if (isReadOnly) return;
    setCheckedPerms(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Toggle entire section
  const toggleSection = (section) => {
    if (isReadOnly) return;
    const keys = section.permissions.map(p => p.key);
    const allChecked = keys.every(k => checkedPerms.has(k));
    setCheckedPerms(prev => {
      const next = new Set(prev);
      keys.forEach(k => allChecked ? next.delete(k) : next.add(k));
      return next;
    });
  };

  // Select all / Clear all
  const selectAll = () => {
    if (isReadOnly) return;
    const allKeys = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));
    setCheckedPerms(new Set(allKeys));
  };
  const clearAll = () => {
    if (isReadOnly) return;
    setCheckedPerms(new Set());
  };

  // Apply template
  const applyTemplate = (templateId) => {
    if (isReadOnly) return;
    if (!templateId) { clearAll(); return; }
    const t = templates.find(t => t.id === Number(templateId));
    if (t) setCheckedPerms(new Set(t.defaultModules));
  };

  // Toggle expand/collapse
  const toggleExpand = (sectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  };

  // Save
  const handleSave = async () => {
    if (!name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        modules: [...checkedPerms],
        roleTypes,
        roleMasterId: null,
      };
      if (isEdit) {
        await roleService.updateRole(role.id, { ...data, active: role.active });
        toast.success(`Role "${name}" updated`);
      } else {
        await roleService.addRole(data);
        toast.success(`Role "${name}" created`);
      }
      onBack?.();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const totalChecked = checkedPerms.size;

  return (
    <div data-testid="role-form-view">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
          data-testid="role-form-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-green-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {isReadOnly ? `View Role: ${role.name}` : isEdit ? 'Edit Role' : 'Add Role'}
        </h2>
        {isReadOnly && (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">System Protected — Read Only</span>
        )}
      </div>

      {/* Role Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-3">
          <div>
            <Label className="text-xs text-slate-500">Role Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} disabled={isReadOnly}
              placeholder="e.g. Floor Manager" className="mt-1" data-testid="role-name-input" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Role Type</Label>
            <select className="mt-1 h-9 w-full text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white"
              value={roleTypes[0] || ''} onChange={e => setRoleTypes(e.target.value ? [e.target.value] : [])}
              disabled={isReadOnly} data-testid="role-type-select">
              <option value="">Select type...</option>
              {catalogRoleTypes.map(rt => (
                <option key={rt.id} value={rt.value}>{rt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Start from Template</Label>
            <select className="mt-1 h-9 w-full text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white"
              onChange={e => applyTemplate(e.target.value)} disabled={isReadOnly} data-testid="role-template-select">
              <option value="">Build from scratch</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.defaultModules.length} permissions)</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Permissions Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">Permissions</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(242,107,51,0.1)', color: '#F26B33' }}>
            {totalChecked} / {TOTAL_PERMISSIONS} selected
          </span>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearAll} className="text-xs h-7"
              data-testid="role-clear-all">Clear All</Button>
            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-7"
              data-testid="role-select-all">Select All</Button>
          </div>
        )}
      </div>

      {/* Permission Cards */}
      <div className="space-y-3" data-testid="permission-cards">
        {PERMISSION_GROUPS.map(section => {
          const checkedCount = section.permissions.filter(p => checkedPerms.has(p.key)).length;
          const allChecked = checkedCount === section.permissions.length;
          const isExpanded = expandedSections.has(section.id);

          return (
            <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              data-testid={`perm-section-${section.id}`}>
              {/* Section Header */}
              <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpand(section.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: `${section.color}15`, color: section.color }}>
                    {checkedCount}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{section.title}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: checkedCount > 0 ? `${section.color}18` : '#f1f5f9',
                          color: checkedCount > 0 ? section.color : '#94a3b8',
                        }}>
                        {checkedCount}/{section.permissions.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isReadOnly && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer"
                      onClick={e => e.stopPropagation()}>
                      <Checkbox checked={allChecked}
                        onCheckedChange={() => toggleSection(section)}
                        className="w-3.5 h-3.5 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" />
                      All
                    </label>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Section Body */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1">
                    {section.permissions.map(p => (
                      <label key={p.key}
                        className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                        data-testid={`perm-${p.key}`}>
                        <Checkbox checked={checkedPerms.has(p.key)}
                          onCheckedChange={() => togglePerm(p.key)}
                          disabled={isReadOnly}
                          className="mt-0.5 w-4 h-4 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900">{p.label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!isReadOnly && (
        <div className="flex justify-end gap-3 mt-6 mb-8">
          <Button variant="outline" onClick={onBack} data-testid="role-form-cancel">Cancel</Button>
          <Button onClick={handleSave} disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="role-form-save">
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Role' : 'Save Role'}
          </Button>
        </div>
      )}
      {isReadOnly && (
        <div className="flex justify-end mt-6 mb-8">
          <Button variant="outline" onClick={onBack}>Back to Roles</Button>
        </div>
      )}
    </div>
  );
}
