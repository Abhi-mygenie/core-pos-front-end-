// CR-160: Printer Mapping Service — employee → station assignment
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/printerMappingTransform';

export const getMapping = async () => {
  const res = await api.get(API_ENDPOINTS.PRINTER_MAPPING);
  return fromAPI(res.data.data);
};

export const saveMapping = async (state) => {
  const res = await api.post(API_ENDPOINTS.PRINTER_MAPPING, toAPI(state));
  return res.data;
};

// CR-353: raw payload save for StationMappingTab (bypasses existing toAPI transform)
export const saveRawMapping = async (payload) => {
  const res = await api.post(API_ENDPOINTS.PRINTER_MAPPING, payload);
  return res.data;
};

// CR-359: Station Printer Map — per-employee area → default_user mapping
export const getStationMap = async (vendorEmployeeId) => {
  const url = vendorEmployeeId
    ? `${API_ENDPOINTS.STATION_PRINTER_MAP}?vendor_employee_id=${vendorEmployeeId}`
    : API_ENDPOINTS.STATION_PRINTER_MAP;
  const res = await api.get(url);
  return res.data.data; // { areas[], default_users[], all_users[], selected_employee_id, mappings[] }
};

export const saveStationMap = async (payload) => {
  // payload: { vendor_employee_id: number, mappings: [{ area_name, default_employee_id }] }
  const res = await api.post(API_ENDPOINTS.STATION_PRINTER_MAP, payload);
  return res.data;
};
