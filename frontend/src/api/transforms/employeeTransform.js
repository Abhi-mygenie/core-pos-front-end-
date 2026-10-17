// CR-069: Employee Transform — API ↔ FE shape mapping
// BUG-198: status:1 on create, optional password on update, email omit-if-empty

// API → FE
const fromAPI = {
  employee(api) {
    return {
      id: api.id,
      firstName: api.f_name || '',
      lastName: api.l_name || '',
      phone: api.phone || '',
      email: api.email || '',
      active: api.status === 1,
      avatarUrl: api.image || null,
      roleId: api.role?.id || null,
      roleName: api.role?.name || '',
      billUserView: api.bill_user_view === 'Yes',
    };
  },

  employeeList(response) {
    const employees = response?.employees || [];
    return employees.map(fromAPI.employee);
  },
};

// FE → API
const toAPI = {
  createEmployee(fe) {
    const payload = {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      role_id: fe.roleId,
      password: fe.password,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
      status: 1, // BUG-198: backend requires status on create
    };
    payload.email = fe.email || ''; // Always send email — backend requires it
    return payload;
  },

  updateEmployee(fe) {
    const payload = {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      role_id: fe.roleId,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
    };
    payload.email = fe.email || ''; // Always send email — backend requires it on PUT
    if (fe.password) payload.password = fe.password; // BUG-198: only send password when user typed one
    return payload;
  },
};

export { fromAPI, toAPI };
