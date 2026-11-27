/**
 * CR-527 (capture phase) — diner_name / diner_mobile threading
 * Verifies:
 *  - fromAPI.order reads api.diner_name/diner_mobile → diner/dinerMobile (null when absent)
 *  - placeOrderWithPayment emits diner_name/diner_mobile inside the TAB block (credit)
 *  - collectBillExisting emits diner_* only when a diner was entered; omits when blank
 *  - non-TAB (cash) payloads never carry diner fields
 */
import { fromAPI, toAPI } from '../orderTransform';

const orderTransform = { fromAPI, toAPI };

describe('CR-527 — fromAPI.order diner read', () => {
  const baseApi = {
    id: 1, restaurant_order_id: '000020', order_type: 'dinein',
    order_status: 'placed', user_name: 'Saurav', cart: [], associated_order_list: [],
  };

  test('maps diner_name/diner_mobile → diner/dinerMobile', () => {
    const out = orderTransform.fromAPI.order({
      ...baseApi, diner_name: 'Abhishek', diner_mobile: '9800000002',
    });
    expect(out.diner).toBe('Abhishek');
    expect(out.dinerMobile).toBe('9800000002');
    expect(out.customerName).toBe('Saurav'); // holder unchanged (A3)
  });

  test('diner null when absent', () => {
    const out = orderTransform.fromAPI.order(baseApi);
    expect(out.diner).toBeNull();
    expect(out.dinerMobile).toBeNull();
  });
});

describe('CR-527 — placeOrderWithPayment diner emit (TAB)', () => {
  const table = { orderId: 1, table_no: '5' };
  const customer = {};

  test('credit order emits diner_name/diner_mobile + holder in cust_* (CR-527a)', () => {
    const payload = orderTransform.toAPI.placeOrderWithPayment(
      table, [], customer, 'dinein',
      { method: 'credit',
        tabContact: { name: 'Saurav', phone: '9800000001', crmId: 'crm-holder-1' },
        dinerContact: { name: 'Abhishek', phone: '9800000002' } },
    );
    expect(payload.diner_name).toBe('Abhishek');
    expect(payload.diner_mobile).toBe('9800000002');
    expect(payload.name).toBe('Saurav'); // holder stays in TAB name/mobile
    // CR-527a: cust_* = holder (CRM / Daily Report customer), not the outer diner
    expect(payload.cust_name).toBe('Saurav');
    expect(payload.cust_mobile).toBe('9800000001');
    expect(payload.cust_membership_id).toBe('crm-holder-1');
  });

  test('CR-527a — TAB prefers tab holder over outer customer for cust_*', () => {
    const payload = orderTransform.toAPI.placeOrderWithPayment(
      table, [],
      { name: 'patz', phone: '5556998821', id: 'crm-diner-1' },
      'dinein',
      { method: 'credit',
        tabContact: { name: 'koji', phone: '9009000909', crmId: 'crm-holder-2' },
        dinerContact: { name: 'patz', phone: '5556998821' } },
    );
    expect(payload.cust_name).toBe('koji');
    expect(payload.cust_mobile).toBe('9009000909');
    expect(payload.cust_membership_id).toBe('crm-holder-2');
    expect(payload.diner_name).toBe('patz');
    expect(payload.name).toBe('koji');
    expect(payload.crm_customer_id).toBe('crm-holder-2');
  });

  test('CR-527a (OD-527a-3) — holder not CRM-linked → cust_membership_id BLANK, never diner id', () => {
    const payload = orderTransform.toAPI.placeOrderWithPayment(
      table, [],
      { name: 'patz', phone: '5556998821', id: 'crm-diner-1' },
      'dinein',
      { method: 'credit',
        tabContact: { name: 'koji', phone: '9009000909' }, // no crmId
        dinerContact: { name: 'patz', phone: '5556998821' } },
    );
    expect(payload.cust_name).toBe('koji');
    expect(payload.cust_membership_id).toBe(''); // blank, NOT 'crm-diner-1'
  });

  test('cash order carries NO diner fields', () => {
    const payload = orderTransform.toAPI.placeOrderWithPayment(
      table, [], customer, 'dinein',
      { method: 'cash', dinerContact: { name: 'Abhishek', phone: '9800000002' } },
    );
    expect('diner_name' in payload).toBe(false);
    expect('diner_mobile' in payload).toBe(false);
  });
});

describe('CR-527 — collectBillExisting diner emit (omit when blank)', () => {
  const table = { orderId: 1 };
  const customer = {};

  test('emits diner_* when a diner was entered + holder in cust_* (CR-527a)', () => {
    const payload = orderTransform.toAPI.collectBillExisting(
      table, [], customer,
      { method: 'credit', finalTotal: 100,
        tabContact: { name: 'Saurav', phone: '9800000001', crmId: 'crm-holder-1' },
        dinerContact: { name: 'Abhishek', phone: '9800000002' } },
    );
    expect(payload.diner_name).toBe('Abhishek');
    expect(payload.diner_mobile).toBe('9800000002');
    expect(payload.cust_name).toBe('Saurav');
    expect(payload.cust_mobile).toBe('9800000001');
    expect(payload.cust_membership_id).toBe('crm-holder-1');
  });

  test('CR-527a — TAB collect bill puts holder in cust_* not order customer', () => {
    const payload = orderTransform.toAPI.collectBillExisting(
      table, [],
      { name: 'oele', phone: '6779973245', id: 'crm-diner-1', countryCode: '+91' },
      { method: 'credit', finalTotal: 100,
        tabContact: { name: 'koji', phone: '9009000909', crmId: 'crm-holder-2', countryCode: '+91' },
        dinerContact: { name: 'oele', phone: '6779973245' } },
    );
    expect(payload.cust_name).toBe('koji');
    expect(payload.cust_mobile).toBe('9009000909');
    expect(payload.cust_membership_id).toBe('crm-holder-2');
    expect(payload.diner_name).toBe('oele');
    expect(payload.name).toBe('koji');
    expect(payload.crm_customer_id).toBe('crm-holder-2');
  });

  test('CR-527a (OD-527a-3) — collect bill holder not CRM-linked → cust_membership_id BLANK, never diner id', () => {
    const payload = orderTransform.toAPI.collectBillExisting(
      table, [],
      { name: 'oele', phone: '6779973245', id: 'crm-diner-1' },
      { method: 'credit', finalTotal: 100,
        tabContact: { name: 'koji', phone: '9009000909' }, // no crmId
        dinerContact: { name: 'oele', phone: '6779973245' } },
    );
    expect(payload.cust_name).toBe('koji');
    expect(payload.cust_membership_id).toBe(''); // blank, NOT 'crm-diner-1'
  });

  test('OMITS diner_* when diner blank (does not wipe place-time diner)', () => {
    const payload = orderTransform.toAPI.collectBillExisting(
      table, [], customer,
      { method: 'credit', finalTotal: 100,
        tabContact: { name: 'Saurav', phone: '9800000001' },
        dinerContact: { name: '', phone: '' } },
    );
    expect('diner_name' in payload).toBe(false);
    expect('diner_mobile' in payload).toBe(false);
  });
});
