/**
 * Wake Lock API — prevents phone screen from sleeping during gameplay.
 * Re-acquires lock when tab becomes visible again.
 */

let wakeLockSentinel: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');

      const reacquire = async () => {
        if (document.visibilityState === 'visible') {
          try {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
          } catch {
            // silently fail
          }
        }
      };

      document.addEventListener('visibilitychange', reacquire);
      return wakeLockSentinel;
    }
  } catch (err) {
    console.warn('WakeLock not available:', err);
  }
  return null;
}

export function releaseWakeLock() {
  wakeLockSentinel?.release();
  wakeLockSentinel = null;
}
