/**
 * BUG-484 — collectBillExisting: payment_amount / grant_amount / order_amount F&B-only
 *
 * handover_5.md §2 (2026-10-01):
 *   payment_amount, grant_amount, order_amount must be F&B-only on room stays.
 *   Room rent is collected via paid_room=yes + UID balance_payment — NOT in these fields.
 *
 * Fix: fbOnlyTotal = Math.max(0, finalTotal - roomBalance)
 *   orderTransform.js E1 (L1509), E2 (L1637), E3 (L1653), E4 (L1660)
 */

import { toAPI } from '../../../api/transforms/orderTransform';

// ---------------------------------------------------------------------------
// Minimal helpers
// ---------------------------------------------------------------------------

const roomTable = (orderId = '9999') => ({
  orderId,
  isRoom: true,
  tableId: 1,
  tableNumber: 'Rr1',
  tableSection: 'Rooms',
});

const dineInTable = (orderId = '8888') => ({
  orderId,
  isRoom: false,
  tableId: 2,
  tableNumber: 'T1',
  tableSection: 'Floor',
});

const basePaymentData = (overrides = {}) => ({
  method: 'cash',
  finalTotal: 228,
  splitPayments: [],
  sgst: 11.4,
  cgst: 11.4,
  vatAmount: 0,
  itemTotal: 200,
  subtotal: 205,
  serviceCharge: 0,
  tip: 0,
  roomBalance: 0,
  roundOff: 0,
  discounts: {},
  ...overrides,
});

const baseOptions = {
  autoBill: false,
  waiterId: 'W1',
  restaurantName: 'Test Restaurant',
};

// ---------------------------------------------------------------------------
// BUG-484 test cases
// ---------------------------------------------------------------------------

describe('collectBillExisting — BUG-484: F&B-only payment fields on room stays', () => {

  // V5 + V8 — non-room order: behavior unchanged
  it('V5/V8: non-room order — payment_amount equals finalTotal; no order_amount key', () => {
    const data = basePaymentData({ finalTotal: 228, roomBalance: 0 });
    const payload = toAPI.collectBillExisting(dineInTable(), [], {}, data, baseOptions);

    expect(payload.payment_amount).toBe(228);
    expect(payload.grant_amount).toBe(228);
    expect(payload.order_amount).toBeUndefined(); // roomBalance=0 → guard suppresses it
  });

  // V6 + V9 — room order F&B 228 + room 950
  it('V6/V9: room order F&B=228, roomBalance=950 — payment_amount=228, order_amount=228', () => {
    const data = basePaymentData({ finalTotal: 1178, roomBalance: 950 });
    const payload = toAPI.collectBillExisting(roomTable(), [], {}, data, baseOptions);

    expect(payload.payment_amount).toBe(228);   // F&B only
    expect(payload.grant_amount).toBe(228);     // F&B only
    expect(payload.order_amount).toBe(228);     // emitted (roomBalance>0), F&B only
  });

  // V7 — room-only settle (no F&B items, no food total)
  it('V7: room-only settle (finalTotal=roomBalance) — payment_amount=0, order_amount=0', () => {
    const data = basePaymentData({ finalTotal: 950, roomBalance: 950 });
    const payload = toAPI.collectBillExisting(roomTable(), [], {}, data, baseOptions);

    expect(payload.payment_amount).toBe(0);
    expect(payload.grant_amount).toBe(0);
    expect(payload.order_amount).toBe(0);
  });

  // V10 — edge case: roomBalance > finalTotal (should not go negative)
  it('V10: roomBalance > finalTotal — fbOnlyTotal clamps to 0 (never negative)', () => {
    const data = basePaymentData({ finalTotal: 100, roomBalance: 200 });
    const payload = toAPI.collectBillExisting(roomTable(), [], {}, data, baseOptions);

    expect(payload.payment_amount).toBeGreaterThanOrEqual(0);
    expect(payload.payment_amount).toBe(0);
    expect(payload.grant_amount).toBe(0);
    expect(payload.order_amount).toBe(0);
  });

  // V9b — order_amount key is only emitted when roomBalance > 0
  it('V9b: roomBalance=0 on a room table — order_amount key absent', () => {
    const data = basePaymentData({ finalTotal: 228, roomBalance: 0 });
    const payload = toAPI.collectBillExisting(roomTable(), [], {}, data, baseOptions);

    // roomBalance=0 → spread guard suppresses order_amount (pre-existing behavior)
    expect(payload.order_amount).toBeUndefined();
  });

  // Regression — discount + room
  it('REG-1: room order with F&B discount — fbOnlyTotal uses post-discount finalTotal', () => {
    // finalTotal = 200 (after discount), roomBalance = 950
    const data = basePaymentData({ finalTotal: 1150, roomBalance: 950 });
    const payload = toAPI.collectBillExisting(roomTable(), [], {}, data, baseOptions);

    expect(payload.payment_amount).toBe(200);
    expect(payload.order_amount).toBe(200);
  });

  // Regression — paid_room still set for room orders
  it('REG-2: paid_room field still present and set to "yes" for room orders', () => {
    const data = basePaymentData({ finalTotal: 1178, roomBalance: 950 });
    const payload = toAPI.collectBillExisting(roomTable(), [], {}, data, baseOptions);

    expect(payload.paid_room).toBe('yes');
  });

  // Regression — paid_room empty string for non-room
  it('REG-3: paid_room is empty string for non-room orders', () => {
    const data = basePaymentData({ finalTotal: 228, roomBalance: 0 });
    const payload = toAPI.collectBillExisting(dineInTable(), [], {}, data, baseOptions);

    expect(payload.paid_room).toBe('');
  });

});
