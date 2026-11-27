// CR-562 (Phase 1) — Firebase messaging-ready race fix.
// Verifies consumers await the async isSupported().then init instead of racing it on reload.
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({ name: 'test-app' })) }));
jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({ __mock: 'messaging' })),
  getToken: jest.fn(() => Promise.resolve('tok_123')),
  onMessage: jest.fn(() => () => {}),
  isSupported: jest.fn(() => Promise.resolve(true)),
}));

describe('CR-562 — whenMessagingReady', () => {
  test('resolves to the messaging instance once async init settles', async () => {
    const fb = require('../../config/firebase');
    const messaging = await fb.whenMessagingReady;
    expect(messaging).toEqual({ __mock: 'messaging' });
  });

  test('onForegroundMessage awaits readiness and returns an unsubscribe function', async () => {
    const messagingApi = require('firebase/messaging');
    messagingApi.onMessage.mockReturnValue(() => {});
    const fb = require('../../config/firebase');
    const unsub = await fb.onForegroundMessage(() => {});
    expect(typeof unsub).toBe('function');
  });
});
