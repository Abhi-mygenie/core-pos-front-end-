// CRM Document Service — CR-129 + INV-003
// Fetch and upload documents stored against a CRM customer profile.
// Auth: handled automatically by crmApi interceptor (X-API-Key from login).
// Non-blocking by design — callers catch errors silently.

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';

/**
 * Fetch documents on file for a CRM customer.
 * GET /pos/customers/{id}/documents
 *
 * API response shape (probe confirmed 2026-08-05):
 *   { success: true, message: "Documents retrieved",
 *     data: { documents: {} | { aadhaar: [{...}], passport: [{...}] } } }
 *
 * data.documents is an OBJECT keyed by doc_type — normalised to flat array:
 *   [{ doc_type, file_url, id, created_at, ... }]
 *
 * @param {string} customerId  - CRM customer UUID
 * @returns {Promise<Array>}   - flat array of document objects ([] on error / no docs)
 */
export const getDocuments = async (customerId) => {
  if (!customerId) return [];
  const response = await crmApi.get(
    `${API_ENDPOINTS.CUSTOMER_DOCUMENTS}/${customerId}/documents`
  );
  const raw = response.data?.data?.documents;
  // Empty or missing
  if (!raw || (typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length === 0)) {
    return [];
  }
  // Object keyed by doc_type → flatten to array
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw).flatMap(([docType, files]) => {
      const arr = Array.isArray(files) ? files : [files];
      return arr.map(f => ({ ...f, doc_type: f.doc_type || docType }));
    });
  }
  // Defensive: if API changes to return array directly
  if (Array.isArray(raw)) return raw;
  return [];
};

/**
 * Upload a document to a CRM customer's profile.
 * POST /pos/customers/{id}/documents
 *
 * Required fields (probe confirmed 2026-08-05):
 *   doc_type: string (e.g. 'aadhaar', 'passport', 'pan_card', 'license', 'voter_id', 'other')
 *   file:     File (multipart)
 *
 * INV-003 RC1: called after roomService.checkIn() so docs appear on next check-in.
 *
 * @param {string} customerId - CRM customer UUID
 * @param {string} docType    - CRM doc_type enum value
 * @param {File}   file       - image or PDF file
 * @returns {Promise<Object>}
 */
export const uploadDocument = async (customerId, docType, file) => {
  if (!customerId || !file) return null;
  const fd = new FormData();
  fd.append('doc_type', docType || 'other');
  fd.append('file', file);
  const response = await crmApi.post(
    `${API_ENDPOINTS.CUSTOMER_DOCUMENTS}/${customerId}/documents`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data?.data || null;
};
