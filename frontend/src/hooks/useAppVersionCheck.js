// BUG-661: detects a new release by comparing baked build id with /version.json (OD-661-06/08)
import { useEffect, useState } from 'react';

const BUILD_ID = process.env.REACT_APP_BUILD_ID;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // OD-661-08: every 5 min

export const useAppVersionCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    if (!BUILD_ID) return undefined;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      fetch(`${process.env.PUBLIC_URL}/version.json?t=${Date.now()}`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((v) => { if (v?.buildId && String(v.buildId) !== BUILD_ID) setUpdateAvailable(true); })
        .catch(() => {});
    };
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check); // OD-661-02
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);
  return updateAvailable;
};
