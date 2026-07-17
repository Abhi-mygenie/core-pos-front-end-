// CR-069: Role Service — API calls for Role CRUD + Permission Catalog
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/roleTransform';

export async function getRoles() {
  const response = await api.get(API_ENDPOINTS.ROLE_LIST);
  return fromAPI.roleList(response.data);
}

export async function addRole(roleData) {
  const payload = toAPI.createRole(roleData);
  const response = await api.post(API_ENDPOINTS.ROLE_ADD, payload);
  return response.data;
}

export async function updateRole(id, roleData) {
  const payload = toAPI.updateRole(roleData);
  const response = await api.post(`${API_ENDPOINTS.ROLE_UPDATE}/${id}`, payload);
  return response.data;
}

export async function getAllRoleList() {
  const response = await api.get(API_ENDPOINTS.ALL_ROLE_LIST);
  return fromAPI.permissionCatalog(response.data);
}

export async function getRoleMasterList() {
  const response = await api.get(API_ENDPOINTS.ROLE_MASTER_LIST);
  return fromAPI.roleMasterList(response.data);
}
