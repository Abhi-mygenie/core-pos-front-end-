// SoundUnlockBanner — BUG-747: safety-net prompt shown when an order ring was blocked by the
// browser autoplay policy and audio is still locked (e.g. after a hard reload, before the first
// user gesture). Tapping it performs the gesture-unlock so subsequent rings play.
import { VolumeX } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export default function SoundUnlockBanner() {
  const { audioUnlocked, audioBlockedAt, unlockAudioNow } = useNotifications();

  if (audioUnlocked || !audioBlockedAt) return null;

  return (
    <button
      type="button"
      data-testid="sound-unlock-banner"
      onClick={() => unlockAudioNow()}
      className="fixed bottom-4 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
    >
      <VolumeX className="h-4 w-4" />
      Sound is off — tap to enable order alerts
    </button>
  );
}
