// CR-069: Employee Service — API calls for Employee CRUD
// BUG-198: POST → PUT for updateEmployee, removed resetEmployeePassword
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/employeeTransform';

export async function getEmployees() {
  const response = await api.get(API_ENDPOINTS.EMPLOYEES_LIST);
  return fromAPI.employeeList(response.data);
}

export async function addEmployee(employeeData) {
  const payload = toAPI.createEmployee(employeeData);
  const response = await api.post(API_ENDPOINTS.EMPLOYEES_ADD, payload);
  return response.data;
}

export async function updateEmployee(id, employeeData) {
  const payload = toAPI.updateEmployee(employeeData);
  const response = await api.put(`${API_ENDPOINTS.EMPLOYEES_UPDATE}/${id}`, payload); // BUG-198: POST → PUT
  return response.data;
}

export async function toggleEmployeeStatus(id, active) {
  const response = await api.post(`${API_ENDPOINTS.EMPLOYEE_STATUS}/${id}`, {
    status: active ? 1 : 0,
  });
  return response.data;
}
