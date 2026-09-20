import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getAllSurveys, subscribeDB } from './lib/db';
import { getSyncState, subscribeSync } from './lib/sync';

function subscribeOnline(cb) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function useSyncState() {
  return useSyncExternalStore(subscribeSync, getSyncState, getSyncState);
}

export function useSurveys() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const all = await getAllSurveys();
      if (alive) {
        setList(all);
        setLoading(false);
      }
    };
    load();
    const unsub = subscribeDB(load);
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return { list, loading };
}

/** Router theo hash (#/new, #/survey/ID, #/settings): nút Back của điện thoại hoạt động đúng. */
export function useHashRoute() {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((to) => {
    window.location.hash = to;
  }, []);
  return [path, navigate];
}

export function useInstallPrompt() {
  const [evt, setEvt] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const install = useCallback(async () => {
    if (!evt) return;
    evt.prompt();
    await evt.userChoice;
    setEvt(null);
  }, [evt]);
  return { canInstall: !!evt, install };
}
