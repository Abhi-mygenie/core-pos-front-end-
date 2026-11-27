// SoundUnlockBanner — compact bar when an order alert arrives while ringer is locked
// (Tap to enable / autoplay blocked). Intentional Silent Mode does NOT show this.
// "Turn on ringer" unlocks audio; "Keep it silent" uses existing sidebar Silent Mode.
import { VolumeX } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export default function SoundUnlockBanner() {
  const {
    audioUnlocked,
    audioBlockedAt,
    soundEnabled,
    setSoundEnabled,
    unlockAudioNow,
  } = useNotifications();

  // Hide when unlocked, no block stamp, or staff chose Silent (Keep it silent / sidebar).
  if (!audioBlockedAt || audioUnlocked || !soundEnabled) return null;

  const onEnableRinger = async () => {
    await unlockAudioNow();
  };

  const onKeepSilent = () => {
    setSoundEnabled(false);
  };

  return (
    <div
      data-testid="sound-unlock-banner"
      className="fixed bottom-4 left-1/2 z-[9999] flex max-w-[92vw] -translate-x-1/2 items-center gap-1.5 rounded-full bg-red-600 p-1 pl-2.5 text-white shadow-md"
    >
      <VolumeX className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      <button
        type="button"
        data-testid="sound-unlock-banner-enable"
        onClick={onEnableRinger}
        className="rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-red-700"
      >
        Turn on ringer
      </button>
      <button
        type="button"
        data-testid="sound-unlock-banner-keep-silent"
        onClick={onKeepSilent}
        className="rounded-full border border-white/40 bg-white/10 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/20"
      >
        Keep it silent
      </button>
    </div>
  );
}
