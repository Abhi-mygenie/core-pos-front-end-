// CR-351: Bill Printer Config Service — local printer bill content + style
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI, toAPIBasicSettings } from '../transforms/billPrinterConfigTransform';

export const getConfig = async () => {
  const res = await api.get(API_ENDPOINTS.BILL_PRINTER_CONFIG);
  return fromAPI(res.data);
};

// OD-2: single POST saves all 3 configs at once
export const saveConfig = async (state) => {
  const res = await api.post(API_ENDPOINTS.BILL_PRINTER_CONFIG, toAPI(state));
  return res.data;
};

// OD-3: show_address + footer_text saved via /update-settings (multipart)
export const saveBasicSettings = async (state) => {
  const formData = new FormData();
  formData.append('data', JSON.stringify(toAPIBasicSettings(state)));
  const res = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
  return res.data;
};
