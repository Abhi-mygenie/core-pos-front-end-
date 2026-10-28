// CR-027 Phase 1 — interceptor extension tests (§4.7.3 Phase 1 acceptance criteria)
// Tests invoke the registered response-rejected handler directly with mocked
// axios error objects, asserting the `readableMessage` contract.

import api from '../../api/axios';
import crmApi from '../../api/crmAxios';

// Grab the rejected handler from the registered response interceptor
const getRejectedHandler = (instance) => {
  const handlers = instance.interceptors.response.handlers.filter(Boolean);
  expect(handlers.length).toBeGreaterThan(0);
  return handlers[0].rejected;
};

const expectReadable = async (instance, errorObj, expected) => {
  const rejected = getRejectedHandler(instance);
  await expect(rejected(errorObj)).rejects.toBe(errorObj);
  expect(errorObj.readableMessage).toBe(expected);
};

describe('CR-027 Phase 1 | api/axios.js interceptor — readableMessage chain', () => {
  test('NEW 1: Laravel 422 object shape → first field message', async () => {
    const err = {
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: { name: ['The name field is required.'], price: ['The price must be a number.'] },
        },
      },
      message: 'Request failed with status code 422',
    };
    await expectReadable(api, err, 'The name field is required.');
  });

  test('NEW 2: ECONNABORTED → friendly timeout message', async () => {
    const err = { code: 'ECONNABORTED', message: 'timeout of 60000ms exceeded' };
    await expectReadable(api, err, 'Request timed out. Check your connection and try again.');
  });

  test('NEW 3: ERR_NETWORK → friendly network message', async () => {
    const err = { code: 'ERR_NETWORK', message: 'Network Error' };
    await expectReadable(api, err, 'Cannot reach server. Check your internet connection.');
  });

  test('NEW 4: empty errors object falls through to data.message', async () => {
    const err = {
      response: { status: 422, data: { message: 'General failure', errors: {} } },
      message: 'Request failed with status code 422',
    };
    await expectReadable(api, err, 'General failure');
  });

  // ── Regression: pre-CR-027 behaviour unchanged ──────────────────────
  test('REGRESSION: 400 { message } → data.message', async () => {
    const err = {
      response: { status: 400, data: { message: 'Bad request' } },
      message: 'Request failed with status code 400',
    };
    await expectReadable(api, err, 'Bad request');
  });

  test('REGRESSION: 422 custom array shape → errors[0].message', async () => {
    const err = {
      response: { status: 422, data: { errors: [{ message: 'Custom array' }] } },
      message: 'Request failed with status code 422',
    };
    await expectReadable(api, err, 'Custom array');
  });

  // Preprod-verified 2026-06-12: POST add-categories duplicate name → 400 { error: "..." }
  test('NEW 5 (preprod gap fix): 400 { error: "msg" } shape → data.error', async () => {
    const err = {
      response: {
        status: 400,
        data: { error: 'Category with this name already exists in this restaurant' },
      },
      message: 'Request failed with status code 400',
    };
    await expectReadable(api, err, 'Category with this name already exists in this restaurant');
  });

  test('PRECEDENCE: data.message wins over data.error', async () => {
    const err = {
      response: { status: 400, data: { message: 'Primary', error: 'Secondary' } },
      message: 'Request failed with status code 400',
    };
    await expectReadable(api, err, 'Primary');
  });

  test('GUARD: non-string data.error (object) is ignored, falls through', async () => {
    const err = {
      response: { status: 400, data: { error: { code: 'X' } } },
      message: 'Request failed with status code 400',
    };
    await expectReadable(api, err, 'Request failed with status code 400');
  });

  test('REGRESSION: no response, no code → error.message', async () => {
    const err = { message: 'Request failed with status code 503' };
    await expectReadable(api, err, 'Request failed with status code 503');
  });

  test('REGRESSION: nothing at all → terminal fallback', async () => {
    const err = {};
    await expectReadable(api, err, 'Something went wrong');
  });

  test('PRECEDENCE: validation object line wins over data.message', async () => {
    const err = {
      response: {
        status: 422,
        data: { message: 'The given data was invalid.', errors: { qty: ['Qty must be at least 1.'] } },
      },
      message: 'Request failed with status code 422',
    };
    await expectReadable(api, err, 'Qty must be at least 1.');
  });

  test('PRECEDENCE: data.message wins over friendly timeout (response present)', async () => {
    const err = {
      code: 'ECONNABORTED',
      response: { status: 408, data: { message: 'Server-side timeout note' } },
      message: 'timeout of 60000ms exceeded',
    };
    await expectReadable(api, err, 'Server-side timeout note');
  });
});

describe('CR-027 Phase 1 / A1 | api/crmAxios.js interceptor — readableMessage chain', () => {
  test('NEW: Laravel 422 object shape → first field message', async () => {
    const err = {
      response: {
        status: 422,
        data: { message: 'Invalid.', errors: { phone: ['The phone field is required.'] } },
      },
      message: 'Request failed with status code 422',
    };
    await expectReadable(crmApi, err, 'The phone field is required.');
  });

  test('NEW: ECONNABORTED → friendly timeout message (15s CRM timeout)', async () => {
    const err = { code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' };
    await expectReadable(crmApi, err, 'Request timed out. Check your connection and try again.');
  });

  test('NEW: ERR_NETWORK → friendly network message', async () => {
    const err = { code: 'ERR_NETWORK', message: 'Network Error' };
    await expectReadable(crmApi, err, 'Cannot reach server. Check your internet connection.');
  });

  test('PRESERVED: data.detail branch still works (CRM-specific)', async () => {
    const err = {
      response: { status: 404, data: { detail: 'Customer not found' } },
      message: 'Request failed with status code 404',
    };
    await expectReadable(crmApi, err, 'Customer not found');
  });

  test('PRESERVED: data.message wins over data.detail', async () => {
    const err = {
      response: { status: 400, data: { message: 'Primary msg', detail: 'Secondary detail' } },
      message: 'Request failed with status code 400',
    };
    await expectReadable(crmApi, err, 'Primary msg');
  });

  test('PRESERVED: terminal fallback stays CRM-specific', async () => {
    const err = {};
    await expectReadable(crmApi, err, 'CRM request failed');
  });

  test('NEW: 400 { error: "msg" } shape → data.error (mirrored gap fix)', async () => {
    const err = {
      response: { status: 400, data: { error: 'Duplicate entry' } },
      message: 'Request failed with status code 400',
    };
    await expectReadable(crmApi, err, 'Duplicate entry');
  });
});
