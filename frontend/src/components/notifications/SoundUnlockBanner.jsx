// SoundUnlockBanner — shown when an order alert arrives while ringer is locked
// (Tap to enable / autoplay blocked). Intentional Silent Mode does NOT show this.
// Tapping unlocks audio so subsequent rings can play (Silent stays until sidebar).
import { VolumeX } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export default function SoundUnlockBanner() {
  const {
    audioUnlocked,
    audioBlockedAt,
    unlockAudioNow,
  } = useNotifications();

  if (!audioBlockedAt || audioUnlocked) return null;

  const onClick = async () => {
    await unlockAudioNow();
  };

  return (
    <button
      type="button"
      data-testid="sound-unlock-banner"
      onClick={onClick}
      className="fixed bottom-4 left-1/2 z-[9999] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
    >
      <VolumeX className="h-4 w-4 shrink-0" />
      Turn on ringer from the sidebar to hear order alerts
    </button>
  );
}
