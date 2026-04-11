// T-09 Test Suite: paymentService — No TBD endpoint
// 3 tests

const fs = require('fs');
const path = require('path');

const { API_ENDPOINTS } = require('../../api/constants');
const paymentServicePath = path.resolve(__dirname, '../../api/services/paymentService.js');
const paymentSource = fs.readFileSync(paymentServicePath, 'utf-8');

describe('T-09: paymentService — No TBD endpoint', () => {

  test('T1: COLLECT_PAYMENT key does NOT exist in API_ENDPOINTS', () => {
    expect(API_ENDPOINTS).not.toHaveProperty('COLLECT_PAYMENT');
  });

  test('T2: CLEAR_BILL key exists and points to a real endpoint (not TBD)', () => {
    expect(API_ENDPOINTS).toHaveProperty('CLEAR_BILL');
    expect(API_ENDPOINTS.CLEAR_BILL).not.toBe('TBD');
    expect(API_ENDPOINTS.CLEAR_BILL).toMatch(/^\/api\//);
  });

  test('T3: collectPayment() uses CLEAR_BILL endpoint (not COLLECT_PAYMENT)', () => {
    // Source should reference CLEAR_BILL, not COLLECT_PAYMENT
    expect(paymentSource).toContain('CLEAR_BILL');
    expect(paymentSource).not.toContain('COLLECT_PAYMENT');
  });
});
