/**
 * CR-405-B-V2 — order-shifted-room v2 contract: transferToRoom payload rewrite
 *
 * V2 contract: { order_id, payment_mode, payment_amount, payment_status, room_id }
 * Whole order transfer — moves entire dine-in order to room.
 * Settles at transfer (OD-RT-02). Room needs check-in, not existing order (OD-RT-03).
 */

import { toAPI } from '../../../api/transforms/orderTransform';

const table    = { orderId: '1232900', tableId: 5, tableNumber: 'T2', tableSection: 'Floor', isRoom: false };
const pd       = { isTransferToRoom: true, roomId: 8522, finalTotal: 474.50 };
const pdNoTotal = { isTransferToRoom: true, roomId: 8522 };

describe('transferToRoom — CR-405-B-V2: v2 contract', () => {

  // VB2-2: payload contains V2 fields only
  it('VB2-2: payload has order_id, payment_mode, payment_amount, payment_status, room_id', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload).toEqual({
      order_id:       '1232900',
      payment_mode:   'ROOM',
      payment_amount: '474.5',
      payment_status: 'unpaid',
      room_id:        '8522',
    });
  });

  // VB2-3: NO V1 fields in payload
  it('VB2-3: payload has NO source_order_id, target_order_id, transfer_note', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.source_order_id).toBeUndefined();
    expect(payload.target_order_id).toBeUndefined();
    expect(payload.transfer_note).toBeUndefined();
  });

  // order_id from table.orderId (stringified)
  it('order_id = String(table.orderId)', () => {
    const t = { orderId: 1232900 }; // numeric → string
    const payload = toAPI.transferToRoom(t, pd, pd.roomId);
    expect(payload.order_id).toBe('1232900');
    expect(typeof payload.order_id).toBe('string');
  });

  // payment_mode is always 'ROOM'
  it('payment_mode is always "ROOM"', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.payment_mode).toBe('ROOM');
  });

  // payment_amount from paymentData.finalTotal (stringified)
  it('payment_amount = String(paymentData.finalTotal)', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.payment_amount).toBe('474.5');
  });

  // payment_amount defaults to '0' when finalTotal missing
  it('payment_amount defaults to "0" when finalTotal missing', () => {
    const payload = toAPI.transferToRoom(table, pdNoTotal, pdNoTotal.roomId);
    expect(payload.payment_amount).toBe('0');
  });

  // payment_status is always 'unpaid'
  it('payment_status is always "unpaid"', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.payment_status).toBe('unpaid');
  });

  // room_id from roomId arg (stringified), fallback to paymentData.roomId
  it('room_id from roomId arg, falls back to paymentData.roomId', () => {
    const payload1 = toAPI.transferToRoom(table, pd, 8522);
    expect(payload1.room_id).toBe('8522');

    const payload2 = toAPI.transferToRoom(table, pd, null);
    expect(payload2.room_id).toBe('8522'); // fallback to pd.roomId
  });
});
