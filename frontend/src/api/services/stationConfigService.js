// CR-161: Station Config Service — local printer path
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/stationConfigTransform';

export const getStations = async () => {
  const res = await api.get(API_ENDPOINTS.STATION_CONFIG);
  return fromAPI.stations(res.data?.data?.printers || []);
};

export const getAreaOptions = async () => {
  const res = await api.get(API_ENDPOINTS.STATION_CONFIG_AREA_OPTIONS);
  return fromAPI.areaOptions(res.data);
};

export const addStation = async (form, restaurantFor) => {
  const res = await api.post(API_ENDPOINTS.STATION_CONFIG, toAPI.station(form, true, restaurantFor));
  return res.data;
};

export const updateStation = async (form, restaurantFor) => {
  const res = await api.post(API_ENDPOINTS.STATION_CONFIG, toAPI.station(form, false, restaurantFor)); // BUG-365: PUT→POST (backend only supports POST; id sent in body by toAPI.station)
  return res.data;
};

export const deleteStation = async (id) => {
  const res = await api.delete(`${API_ENDPOINTS.STATION_CONFIG}/${id}`);
  return res.data;
};

export const getPrintingOption = async () => {
  const res = await api.get(API_ENDPOINTS.PRINTING_OPTION);
  return fromAPI.printingOption(res.data);
};

export const updatePrintingOption = async (mode, employeeId, restaurantId) => {
  const res = await api.post(API_ENDPOINTS.PRINTING_OPTION, toAPI.printingOption(mode, employeeId, restaurantId));
  return res.data;
};
