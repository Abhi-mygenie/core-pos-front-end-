// SoundManager - Manages notification audio playback
// Plays chimes and ringers from /public/sounds/
// Silent notification stops any currently playing sound
import fcmDiagLog from './fcmDiagLog';

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
    this.isUnlocked = false;      // diagnostics: has audio playback been unlocked by a user gesture?
    this.lastResults = {};        // diagnostics: { [soundKey]: { ok, error, ts } }
    this.mutedOrders = new Set(); // BUG-453 helpers retained; notification path no longer suppresses by orderId
    this.onBlocked = null;        // BUG-747: optional observer invoked when a ring is blocked by autoplay policy
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
      if (this.currentAudio === audio) this.currentAudio = null; // BUG-453 Fix A: don't wipe a newer audio's reference
    });

    this.currentAudio = audio;
    audio.play()
      .then(() => { this.isUnlocked = true; this._record(soundKey, true, null); })
      .catch((err) => {
        console.warn('[SoundManager] Play blocked:', err.message);
        this._record(soundKey, false, err.message);
        if (this.currentAudio === audio) this.currentAudio = null; // BUG-453 Fix A
        try { this.onBlocked?.(soundKey, err.message); } catch { /* ignore */ } // BUG-747
      });
  }

  // ── Diagnostics helpers (additive; do not affect normal playback) ──────────
  _record(soundKey, ok, error) {
    this.lastResults[soundKey] = { ok, error: error || null, ts: Date.now() };
    try { fcmDiagLog.add(ok ? 'sound_ok' : 'sound_blocked', { sound: soundKey, error: error || null }); }
    catch { /* ignore */ }
  }

  // Play a sound explicitly for testing — bypasses the silent-mode gate and
  // resolves with the real browser outcome so the panel can show ✓ / blocked.
  playTest(soundKey) {
    const path = SOUND_FILES[soundKey];
    if (!path) return Promise.resolve({ ok: false, error: 'unknown sound' });
    this.stop();
    const audio = this.audioCache[soundKey] ? this.audioCache[soundKey].cloneNode() : new Audio(path);
    this.currentAudio = audio;
    return audio.play()
      .then(() => { this.isUnlocked = true; this._record(soundKey, true, null); return { ok: true, error: null }; })
      .catch((err) => {
        this._record(soundKey, false, err.message);
        if (this.currentAudio === audio) this.currentAudio = null;
        return { ok: false, error: err.message };
      });
  }

  // Unlock autoplay with a user gesture (plays a muted silent clip).
  unlock() {
    const audio = this.audioCache.silent ? this.audioCache.silent.cloneNode() : new Audio(SOUND_FILES.silent);
    audio.muted = true;
    return audio.play()
      .then(() => { this.isUnlocked = true; audio.pause(); try { fcmDiagLog.add('unlock', { ok: true }); } catch { /* ignore */ } return true; })
      .catch((err) => { try { fcmDiagLog.add('unlock', { ok: false, error: err.message }); } catch { /* ignore */ } return false; });
  }

  // BUG-747: React subscribes here to show the "tap to enable" banner when a ring is blocked.
  setBlockedHandler(fn) { this.onBlocked = fn; }

  getState() {
    return { isEnabled: this.isEnabled, isUnlocked: this.isUnlocked, lastResults: { ...this.lastResults } };
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

  // BUG-453 Fix B — per-order mute registry helpers (Set). Notification pipeline no longer
  // gates on isOrderMuted; Mute/snooze only calls stop() so later FCM (edits) can ring.
  muteOrder(id) { this.mutedOrders.add(String(id)); }
  unmuteOrder(id) { this.mutedOrders.delete(String(id)); }
  toggleOrderMute(id) {
    const k = String(id);
    if (this.mutedOrders.has(k)) this.mutedOrders.delete(k); else this.mutedOrders.add(k);
    return this.mutedOrders.has(k);
  }
  isOrderMuted(id) { return this.mutedOrders.has(String(id)); }
  clearMutes() { this.mutedOrders.clear(); }

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
