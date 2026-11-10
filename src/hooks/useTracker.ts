import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { TrackerStore } from '../lib/trackerStore';
import { supabase } from '../lib/supabase';

/** One TrackerStore per signed-in user; re-syncs on reconnect and when the tab regains focus. */
export function useTracker(userId: string): TrackerStore {
  const store = useMemo(() => new TrackerStore(supabase!, userId), [userId]);

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

  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}
