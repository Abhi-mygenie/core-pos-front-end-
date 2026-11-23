// CR-562 — profileResponse surfaces the backend's stored FCM device token.
// Backend returns it top-level as `fcm_token`, with `firebase_token` as a legacy alias.
import { fromAPI } from '../profileTransform';

describe('CR-562 profileResponse.fcmToken', () => {
  test('maps fcm_token when present', () => {
    const out = fromAPI.profileResponse({ fcm_token: 'abc123' });
    expect(out.fcmToken).toBe('abc123');
  });

  test('falls back to firebase_token legacy alias', () => {
    const out = fromAPI.profileResponse({ firebase_token: 'xyz789' });
    expect(out.fcmToken).toBe('xyz789');
  });

  test('fcm_token wins when both present', () => {
    const out = fromAPI.profileResponse({ fcm_token: 'primary', firebase_token: 'alias' });
    expect(out.fcmToken).toBe('primary');
  });

  test('is null when neither present', () => {
    const out = fromAPI.profileResponse({});
    expect(out.fcmToken).toBeNull();
  });
});
