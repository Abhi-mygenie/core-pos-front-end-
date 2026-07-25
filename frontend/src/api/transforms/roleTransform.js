// CR-069: Role Transform — API ↔ FE shape mapping

// API → FE
const fromAPI = {
  role(api) {
    return {
      id: api.id,
      name: api.name || '',
      active: api.status === 1,
      modules: api.modules || [],
      totalModules: api.total_modules || 0,
      isSystemRole: !!api.is_system_role,
      isEditable: api.is_editable !== false,
      protectionLevel: api.protection_level || null,
      roleMasterId: api.role_master_id || null,
      roleMasterName: api.role_master_name || null,
      parentRole: api.parent_role || null,
      createdAt: api.created_at || null,
      updatedAt: api.updated_at || null,
      roleTypes: api.role_type || [],  // BUG-235: map role_type so edit/toggle always has correct value
    };
  },

  roleList(response) {
    const roles = response?.roles || [];
    return roles.map(fromAPI.role);
  },

  permissionCatalog(response) {
    const modules = response?.role_modules || {};
    const roleTypes = (response?.role_types || []).map(rt => ({
      id: rt.id,
      name: rt.name,
      value: rt.role_type_value,
    }));
    // Flatten all permissions from 3 backend categories
    const allPermissions = [];
    for (const [category, perms] of Object.entries(modules)) {
      for (const p of perms) {
        allPermissions.push({
          key: p.role_pass_value,
          label: p.name,
          category, // 'frontend' | 'backend' | 'report'
        });
      }
    }
    return { allPermissions, roleTypes, rawModules: modules };
  },

  roleMasterList(response) {
    const templates = response?.roles || [];
    return templates.map(t => ({
      id: t.id,
      name: t.name,
      defaultModules: t.default_modules || [],
      isProtected: !!t.is_protected,
      mapRole: t.map_role || null,  // CR-096: expose for role_type derivation in applyTemplate
    }));
  },
};

// FE → API
const toAPI = {
  createRole(fe) {
    return {
      name: fe.name,
      modules: fe.modules, // string array — verbatim backend keys per R9
      role_type: fe.roleTypes || [],
      role_master_id: fe.roleMasterId || null,
      printmodules: fe.printModules || [],
    };
  },

  updateRole(fe) {
    return {
      name: fe.name,
      modules: fe.modules,
      role_type: fe.roleTypes || [],
      role_master_id: fe.roleMasterId || null,
      printmodules: fe.printModules || [],
      status: fe.active ? 1 : 0,
    };
  },
};

export { fromAPI, toAPI };
