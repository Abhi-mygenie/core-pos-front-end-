// utils/toneMapper.js
// POS2-007 Phase 1 — FE-side override for confirm-order notification tone.
//
// Rationale (POS2-006 + POS2-007 investigation):
//   Backend FCM emitter currently writes a buzzer key to `data.sound` for
//   confirm-order notifications regardless of the per-restaurant
//   `confirm_order_tone` setting. The fix belongs in the backend (Phase 2 —
//   POS2-008 planning doc), but as an interim tactical fix we override the
//   FCM `data.sound` value on the frontend, ONLY for confirm-order
//   notifications, ONLY using `confirm_order_tone` from the profile.
//
// Owner-approved scope (POS2-007 Phase 1):
//   - silent  → 'silent'
//   - default → 'confirm_order'
//   - buzzer  → 'five_sec_buzzer'
//   - missing/null/unknown → 'confirm_order' (safe default)
//
//   Do NOT use confirm_order_ringer, tone_timing, aggregator_order_tone, or
//   voice_in_kds in this mapping. Sidebar Silent Mode continues to be the
//   global kill-switch (handled inside soundManager.setEnabled).

const TONE_TO_SOUND_KEY = {
  silent: 'silent',
  default: 'confirm_order',
  buzzer: 'five_sec_buzzer',
};

/**
 * Map a `confirm_order_tone` profile value to a `soundManager` sound key.
 * Pure function. Case-insensitive on the input; whitespace tolerated.
 *
 * @param {string|null|undefined} tone — profile setting value
 * @returns {string} a key from soundManager.SOUND_FILES (always defined)
 */
export const mapConfirmOrderTone = (tone) => {
  if (!tone || typeof tone !== 'string') return 'confirm_order';
  const normalized = tone.trim().toLowerCase();
  return TONE_TO_SOUND_KEY[normalized] || 'confirm_order';
};

// BUG-600 — Aggregator order tone override (same pattern as confirm-order above).
// Maps the per-restaurant `aggregator_order_tone` profile setting to a soundManager key.
// OD-600-01 LOCKED: "default" → 'new_order' (generic chime, covers Swiggy + Zomato).
const AGGREGATOR_TONE_MAP = {
  silent: 'silent',
  default: 'new_order',
  buzzer: 'five_sec_buzzer',
};

export const mapAggregatorOrderTone = (tone) => {
  if (!tone || typeof tone !== 'string') return 'new_order';
  const normalized = tone.trim().toLowerCase();
  return AGGREGATOR_TONE_MAP[normalized] || 'new_order';
};

export default mapConfirmOrderTone;
