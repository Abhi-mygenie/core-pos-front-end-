// Restaurant Settings Service — CR-019
// Self-onboarding wizard API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/restaurantSettingsTransform';

/**
 * Fetch current restaurant settings
 * @returns {Promise<Object>} - Transformed per-step form data { step1..step6 }
 */
export const getSettings = async () => {
  const response = await api.get(API_ENDPOINTS.RESTAURANT_SETTINGS_LIST);
  return fromAPI.settingsResponse(response.data.data);
};

/**
 * Update restaurant settings
 * @param {Object} formState - All steps { step1, step2, ..., step6 }
 * @param {File|null} logoFile - Logo image file
 * @param {File|null} pdfFile - PDF menu file
 * @returns {Promise<Object>} - API response
 */
export const updateSettings = async (formState, logoFile = null, pdfFile = null) => {
  const payload = toAPI.settingsPayload(formState);
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  if (logoFile) formData.append('logo', logoFile);
  if (pdfFile) formData.append('pdf', pdfFile);

  const response = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
  return response.data;
};
