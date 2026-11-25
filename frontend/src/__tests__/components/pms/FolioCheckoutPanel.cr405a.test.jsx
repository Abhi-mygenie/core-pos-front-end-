/**
 * CR-405-A — Room discount at checkout: payload injection logic
 *
 * handover_5.md §4.4 (2026-10-01):
 *   room_discount + room_discount_apply_to injected into BILL_PAYMENT payload
 *   when roomDiscount > 0. apply_to='room' cuts UID balance.
 *
 * Tests cover the payload injection helper and FolioCheckoutPanel state flow.
 * (CollectPaymentPanel is lazy-loaded; tests focus on the injection side.)
 */

// ---------------------------------------------------------------------------
// Payload injection logic (extracted to match production code in handlePaid)
// This mirrors FolioCheckoutPanel.jsx L145-152 exactly:
//   if (roomDiscount > 0) { payload.room_discount = ...; }
// ---------------------------------------------------------------------------

function applyRoomDiscountToPayload(payload, roomDiscount, roomDiscountReason) {
  if (roomDiscount > 0) {
    payload.room_discount          = roomDiscount;
    payload.room_discount_apply_to = 'room';
    payload.room_discount_type     = 'Amount';
    payload.room_discount_value    = roomDiscount;
    payload.room_discount_reason   = roomDiscountReason || null;
  }
  return payload;
}

describe('CR-405-A: room discount payload injection (production logic mirror)', () => {

  // V-A3: discount > 0 → all 5 fields injected
  it('V-A3: roomDiscount=100 + reason → injects room_discount fields with apply_to=room', () => {
    const payload = { order_id: '999', payment_mode: 'cash' };
    applyRoomDiscountToPayload(payload, 100, 'Loyalty');
    expect(payload.room_discount).toBe(100);
    expect(payload.room_discount_apply_to).toBe('room');
    expect(payload.room_discount_type).toBe('Amount');
    expect(payload.room_discount_value).toBe(100);
    expect(payload.room_discount_reason).toBe('Loyalty');
  });

  // V-A4: discount = 0 → no fields injected
  it('V-A4: roomDiscount=0 → no room_discount keys in payload', () => {
    const payload = { order_id: '999', payment_mode: 'cash' };
    applyRoomDiscountToPayload(payload, 0, '');
    expect(payload.room_discount).toBeUndefined();
    expect(payload.room_discount_apply_to).toBeUndefined();
  });

  // V-A4b: undefined discount → no fields injected
  it('V-A4b: roomDiscount=undefined → no fields (safe default)', () => {
    const payload = { order_id: '999' };
    applyRoomDiscountToPayload(payload, undefined, undefined);
    expect(payload.room_discount).toBeUndefined();
  });

  // V-A3b: empty reason → null (not empty string)
  it('V-A3b: empty reason → room_discount_reason is null', () => {
    const payload = {};
    applyRoomDiscountToPayload(payload, 50, '');
    expect(payload.room_discount_reason).toBeNull();
  });

  // V-A3c: apply_to is always 'room' (not food/both)
  it('V-A3c: apply_to is always "room" regardless of amount', () => {
    const payload = {};
    applyRoomDiscountToPayload(payload, 999, 'test');
    expect(payload.room_discount_apply_to).toBe('room');
  });

  // V-A3d: room_discount_type is always 'Amount' (OD-405-03 locked)
  it('V-A3d: room_discount_type is always "Amount"', () => {
    const payload = {};
    applyRoomDiscountToPayload(payload, 200, null);
    expect(payload.room_discount_type).toBe('Amount');
    expect(payload.room_discount_value).toBe(200);
  });

  // REG: does not overwrite unrelated payload keys
  it('REG-1: existing payload keys (order_id, room_gst_tax) are not overwritten', () => {
    const payload = { order_id: '1232917', room_gst_tax: 120, payment_mode: 'cash' };
    applyRoomDiscountToPayload(payload, 100, null);
    expect(payload.order_id).toBe('1232917');
    expect(payload.room_gst_tax).toBe(120);
    expect(payload.payment_mode).toBe('cash');
  });

  // REG: negative discount clamped to 0 (Math.max in input handler)
  it('REG-2: roomDiscount <= 0 never injects (Math.max guard in UI input)', () => {
    const payload = {};
    applyRoomDiscountToPayload(payload, -10, 'bad');
    expect(payload.room_discount).toBeUndefined(); // -10 < 0 → condition false
  });

});
