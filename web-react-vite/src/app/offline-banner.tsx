import { useSyncExternalStore } from 'react';
import { useMessages } from '@/i18n';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** BE-010 : le navigateur signale l'absence de réseau ; les données affichées viennent du cache. */
export function OfflineBanner() {
  const m = useMessages();
  const isOnline = useSyncExternalStore(subscribe, () => navigator.onLine);

  if (isOnline) return null;
  // `alert` : annoncé par les lecteurs d'écran dès son apparition.
  return (
    <p role="alert" className="mx-auto max-w-4xl px-4 pb-3 text-sm text-warning">
      {m.app.offline}
    </p>
  );
}
