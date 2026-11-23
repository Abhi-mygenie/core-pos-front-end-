// BUG-747 — soundManager blocked-handler observer (powers the "tap to enable" banner)
import soundManager from '../../utils/soundManager';

describe('BUG-747 — soundManager.setBlockedHandler', () => {
  afterEach(() => { soundManager.setBlockedHandler(null); });

  test('onBlocked fires with sound key + error when audio.play() is rejected', async () => {
    const playSpy = jest
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.reject(new Error('NotAllowedError')));

    const handler = jest.fn();
    soundManager.setBlockedHandler(handler);
    soundManager.play('new_order');

    // let the rejected play() promise + .catch microtasks flush
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('new_order', 'NotAllowedError');
    playSpy.mockRestore();
  });

  test('setBlockedHandler(null) detaches the observer', () => {
    soundManager.setBlockedHandler(jest.fn());
    soundManager.setBlockedHandler(null);
    expect(soundManager.onBlocked).toBeNull();
  });
});
