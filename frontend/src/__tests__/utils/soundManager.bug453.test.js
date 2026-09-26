// BUG-453: Fix A (race guards) + Fix B (per-order mute registry) unit tests
import soundManager from '../../utils/soundManager';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('BUG-453 soundManager', () => {
  let playMock;
  let pauseMock;

  beforeEach(() => {
    soundManager.stop();
    soundManager.clearMutes();
    soundManager.setEnabled(true);
    soundManager.audioCache = {};
    pauseMock = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    playMock = jest.spyOn(HTMLMediaElement.prototype, 'play');
  });

  afterEach(() => jest.restoreAllMocks());

  test('Fix A (1): rejected play() on audio-1 does not wipe audio-2 reference; stop() pauses audio-2', async () => {
    playMock
      .mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')))
      .mockImplementationOnce(() => Promise.resolve());
    soundManager.play('new_order');
    const audio1 = soundManager.currentAudio;
    soundManager.play('new_order');
    const audio2 = soundManager.currentAudio;
    await flush();
    expect(audio1).not.toBe(audio2);
    expect(soundManager.currentAudio).toBe(audio2);
    soundManager.stop();
    expect(pauseMock).toHaveBeenCalled();
    expect(soundManager.currentAudio).toBeNull();
  });

  test('Fix A (4): error event on stale audio-1 leaves audio-2 as currentAudio', () => {
    playMock.mockImplementation(() => Promise.resolve());
    soundManager.play('new_order');
    const audio1 = soundManager.currentAudio;
    soundManager.play('new_order');
    const audio2 = soundManager.currentAudio;
    audio1.dispatchEvent(new Event('error'));
    expect(soundManager.currentAudio).toBe(audio2);
  });

  test('Fix B (2): toggleOrderMute normalises keys to String', () => {
    expect(soundManager.toggleOrderMute('123')).toBe(true);
    expect(soundManager.isOrderMuted(123)).toBe(true);
    expect(soundManager.toggleOrderMute(123)).toBe(false);
    expect(soundManager.isOrderMuted('123')).toBe(false);
  });

  test('Fix B (3): clearMutes empties the registry', () => {
    soundManager.muteOrder(1);
    soundManager.muteOrder('2');
    expect(soundManager.isOrderMuted(1)).toBe(true);
    soundManager.clearMutes();
    expect(soundManager.isOrderMuted(1)).toBe(false);
    expect(soundManager.isOrderMuted(2)).toBe(false);
  });
});
