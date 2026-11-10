import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ProgressStore } from '../lib/progressStore';
import { supabase } from '../lib/supabase';

/** One ProgressStore per signed-in user; re-syncs on reconnect and when the tab regains focus. */
export function useProgress(userId: string) {
  const store = useMemo(() => new ProgressStore(supabase!, userId), [userId]);

  useEffect(() => {
    void store.pull();
    const resync = () => void store.pull();
    const onVisible = () => document.visibilityState === 'visible' && resync();
    window.addEventListener('online', resync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', onVisible);
      store.dispose();
    };
  }, [store]);

  // re-render whenever the store changes
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}
