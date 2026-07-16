// CR-069: Employee Transform — API ↔ FE shape mapping

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
    return {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      email: fe.email || '',
      role_id: fe.roleId,
      password: fe.password,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
    };
  },

  updateEmployee(fe) {
    return {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      email: fe.email || '',
      role_id: fe.roleId,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
    };
  },
};

export { fromAPI, toAPI };
