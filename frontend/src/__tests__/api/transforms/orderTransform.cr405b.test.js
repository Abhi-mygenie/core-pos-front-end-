/**
 * CR-405-B — order-shifted-room v1 contract: transferToRoom payload rewrite
 *
 * handover_5.md §6 (2026-10-01):
 *   v1 contract: { source_order_id, target_order_id, transfer_note }
 *   v2 (old): { order_id, room_id, payment_mode, payment_amount, ... } — no longer used.
 *
 * Edits:
 *   E-B1: constants.js → ORDER_SHIFTED_ROOM /api/v2/ → /api/v1/
 *   E-B2: CollectPaymentPanel → paymentData.roomOrderId = selectedRoom.orderId
 *   E-B3: orderTransform.transferToRoom → new compact payload
 */

import { toAPI } from '../../../api/transforms/orderTransform';

const table    = { orderId: '1232900', tableId: 5, tableNumber: 'T2', tableSection: 'Floor', isRoom: false };
const roomPd   = { isTransferToRoom: true, roomId: 8522, roomOrderId: '1232917' };
const noRoomPd = { isTransferToRoom: true, roomId: 8522 };  // missing roomOrderId edge case

describe('transferToRoom — CR-405-B: v1 contract', () => {

  // V-B2: payload shape — only 3 keys
  it('V-B2: payload contains source_order_id, target_order_id, transfer_note only', () => {
    const payload = toAPI.transferToRoom(table, roomPd, roomPd.roomId);
    expect(payload).toEqual({
      source_order_id: '1232917',
      target_order_id: '1232900',
      transfer_note:   'Yes',
    });
  });

  // V-B5: no payment fields in payload
  it('V-B5: payload has NO payment_mode, payment_amount, order_discount, gst_tax', () => {
    const payload = toAPI.transferToRoom(table, roomPd, roomPd.roomId);
    expect(payload.payment_mode).toBeUndefined();
    expect(payload.payment_amount).toBeUndefined();
    expect(payload.order_discount).toBeUndefined();
    expect(payload.gst_tax).toBeUndefined();
    expect(payload.room_id).toBeUndefined();
    expect(payload.order_id).toBeUndefined();
  });

  // source_order_id stringified from roomOrderId
  it('source_order_id = String(paymentData.roomOrderId)', () => {
    const pd = { roomOrderId: 1232917 };  // numeric → string
    const payload = toAPI.transferToRoom(table, pd, 0);
    expect(payload.source_order_id).toBe('1232917');
    expect(typeof payload.source_order_id).toBe('string');
  });

  // target_order_id stringified from table.orderId
  it('target_order_id = String(table.orderId)', () => {
    const t = { orderId: 1232900 };  // numeric → string
    const payload = toAPI.transferToRoom(t, roomPd, 0);
    expect(payload.target_order_id).toBe('1232900');
    expect(typeof payload.target_order_id).toBe('string');
  });

  // transfer_note is always 'Yes'
  it('transfer_note is always "Yes"', () => {
    const payload = toAPI.transferToRoom(table, roomPd, 0);
    expect(payload.transfer_note).toBe('Yes');
  });

  // VR-1: missing roomOrderId → empty string (no crash)
  it('VR-1: missing roomOrderId → source_order_id="" (no crash)', () => {
    const payload = toAPI.transferToRoom(table, noRoomPd, noRoomPd.roomId);
    expect(payload.source_order_id).toBe('');
    expect(payload.target_order_id).toBe('1232900');
  });

  // 3rd arg (_roomId) is ignored — backward compat
  it('_roomId arg ignored — passing any value does not affect payload', () => {
    const p1 = toAPI.transferToRoom(table, roomPd, 9999);
    const p2 = toAPI.transferToRoom(table, roomPd, null);
    expect(p1).toEqual(p2);
    expect(p1.room_id).toBeUndefined();
  });

});

// E-B1: constants — verify at module level
describe('constants — CR-405-B: ORDER_SHIFTED_ROOM uses v1', () => {
  it('E-B1: ORDER_SHIFTED_ROOM points to /api/v1/', () => {
    const { API_ENDPOINTS } = require('../../../api/constants');
    expect(API_ENDPOINTS.ORDER_SHIFTED_ROOM).toContain('/api/v1/');
    expect(API_ENDPOINTS.ORDER_SHIFTED_ROOM).not.toContain('/api/v2/');
  });
});
