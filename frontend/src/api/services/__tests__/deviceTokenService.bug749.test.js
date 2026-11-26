/**
 * BUG-749: device-token POST shape
 */
import api from '../../axios';
import { API_ENDPOINTS } from '../../constants';
import { registerDeviceToken } from '../deviceTokenService';

jest.mock('../../axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

describe('BUG-749 registerDeviceToken', () => {
  beforeEach(() => {
    api.post.mockReset();
  });

  test('POSTs { fcm_token } to DEVICE_TOKEN and returns data', async () => {
    api.post.mockResolvedValue({ data: { status: 'ok', fcm_token: 'abc' } });
    const out = await registerDeviceToken('abc');
    expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.DEVICE_TOKEN, { fcm_token: 'abc' });
    expect(API_ENDPOINTS.DEVICE_TOKEN).toBe('/api/v1/vendoremployee/device-token');
    expect(out).toEqual({ status: 'ok', fcm_token: 'abc' });
  });

  test('returns null for empty token (no network)', async () => {
    expect(await registerDeviceToken('')).toBeNull();
    expect(await registerDeviceToken(null)).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });
});
