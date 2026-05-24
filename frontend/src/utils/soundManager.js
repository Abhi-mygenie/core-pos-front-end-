// SoundManager - Manages notification audio playback
// Plays chimes and ringers from /public/sounds/
// Silent notification stops any currently playing sound

const SOUND_FILES = {
  new_order: '/sounds/new_order.wav',
  confirm_order: '/sounds/confirm_order.wav',
  order_accepted: '/sounds/order_accepted.wav',
  order_confirmed: '/sounds/order_confirmed.wav',
  order_ready: '/sounds/order_ready.wav',
  order_rejected: '/sounds/order_rejected.wav',
  attend_table: '/sounds/attend_table.wav',
  settle_bill: '/sounds/settle_bill.wav',
  item_added: '/sounds/item_added.wav',
  swiggy_new_order: '/sounds/swiggy_new_order.wav',
  five_sec_buzzer: '/sounds/five_sec_buzzer.wav',
  ten_sec_buzzer: '/sounds/ten_sec_buzzer.wav',
  forty_five_sec_buzzer: '/sounds/forty_five_sec_buzzer.wav',
  silent: '/sounds/silent.wav',
};

class SoundManager {
  constructor() {
    this.currentAudio = null;
    this.audioCache = {};
    this.isEnabled = true;
  }

  /**
   * Preload all sound files into cache
   */
  preload() {
    Object.entries(SOUND_FILES).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.audioCache[key] = audio;
    });
    console.log('[SoundManager] Preloaded', Object.keys(SOUND_FILES).length, 'sounds');
  }

  /**
   * Play a sound by key name
   * @param {string} soundKey - Key from SOUND_FILES (e.g., "new_order")
   */
  play(soundKey) {
    if (!this.isEnabled) return;

    // Silent notification: stop current sound
    if (soundKey === 'silent') {
      this.stop();
      return;
    }

    const path = SOUND_FILES[soundKey];
    if (!path) {
      console.warn('[SoundManager] Unknown sound:', soundKey);
      return;
    }

    // Stop any currently playing audio
    this.stop();

    // Use cached or create new Audio instance
    const audio = this.audioCache[soundKey]
      ? this.audioCache[soundKey].cloneNode()
      : new Audio(path);

    audio.addEventListener('ended', () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('[SoundManager] Playback error for', soundKey, e);
      this.currentAudio = null;
    });

    this.currentAudio = audio;
    audio.play().catch((err) => {
      console.warn('[SoundManager] Play blocked:', err.message);
      this.currentAudio = null;
    });
  }

  /**
   * Stop currently playing sound
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Enable or disable sound playback
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) this.stop();
  }

  /**
   * Check if a sound key is valid
   * @param {string} soundKey
   * @returns {boolean}
   */
  isValidSound(soundKey) {
    return soundKey in SOUND_FILES;
  }
}

// Singleton instance
const soundManager = new SoundManager();
export default soundManager;
export { SOUND_FILES };
