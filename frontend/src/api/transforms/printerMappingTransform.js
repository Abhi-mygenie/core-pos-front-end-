// CR-160: Printer Mapping Transform — employee → printer station assignment
// Defensive parse: food court returns mapped_default_employee_ids as JSON string, regular = array

export const fromAPI = (data) => {
  const employees = data.employees || [];
  const employeeMap = {};
  employees.forEach(e => {
    employeeMap[e.id] = [e.f_name, e.l_name].filter(Boolean).join(' ');
  });

  const defaultUserIds = new Set((data.default_users || []).map(e => e.id));

  const printers = (data.printers || []).map(p => {
    // CR-160: food court returns JSON string, regular restaurant returns array
    const rawIds = typeof p.mapped_default_employee_ids === 'string'
      ? JSON.parse(p.mapped_default_employee_ids)
      : (p.mapped_default_employee_ids || []);
    return {
      id: p.id,
      areaName: p.area_name,
      printerName: p.printer_name,
      assignedEmployeeIds: rawIds,
      assignedEmployees: rawIds.map(id => ({
        id,
        name: employeeMap[id] || `Employee ${id}`,
      })),
    };
  });

  return {
    printers,
    employees: employees.map(e => ({
      id: e.id,
      name: [e.f_name, e.l_name].filter(Boolean).join(' '),
      isDefault: e.default_user_v2 === 'Yes',
    })),
    defaultUserIds,
  };
};

export const toAPI = (state) => {
  const fixed_station_v2 = {};
  state.employees.forEach(e => {
    fixed_station_v2[String(e.id)] = state.defaultUserIds.has(e.id) ? 'Yes' : 'No';
  });
  const mappings = {};
  state.printers.forEach(p => {
    mappings[String(p.id)] = p.assignedEmployeeIds;
  });
  return { fixed_station_v2, mappings };
};
