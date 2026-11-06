// CR-077: Inventory Transfer Service (Phase 1 — Receive + Reject)
import api from '../axios';
import { INVENTORY_TRANSFER_ENDPOINTS as EP } from '../constants';
import { fromAPI } from '../transforms/inventoryTransferTransform';

export async function getPendingQueues() {
  const res = await api.post(EP.PENDING_QUEUES);
  return fromAPI.pendingQueues(res.data);
}

export async function getTransferDetails(transferId) {
  const res = await api.get(`${EP.DETAILS}/${transferId}`);
  return fromAPI.transferDetails(res.data);
}

export async function receiveTransfer(transferId) {
  const res = await api.post(`${EP.RECEIVE}/${transferId}`);
  return res.data;
}

export async function rejectTransfer(transferId, reason) {
  const res = await api.post(`${EP.REJECT}/${transferId}`, { reason });
  return res.data;
}
