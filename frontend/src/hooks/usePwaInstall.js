import { useCallback, useEffect, useState } from 'react';

/**
 * PWA install state + trigger for the "Install as app" button.
 *
 * - Chrome/Edge (desktop) and Chrome (Android) fire `beforeinstallprompt` when
 *   the app is installable. We stash that event and replay it on demand, so the
 *   user can install from our own Settings button instead of the browser's UI.
 * - `appinstalled` (or already running standalone) flips `isInstalled`.
 * - iOS Safari never fires `beforeinstallprompt`; it installs via the Share
 *   sheet, so we surface that as a hint (`isIos`) instead of a button.
 */
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true);

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault(); // suppress the browser's mini-infobar; we drive it
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null); // a prompt can only be used once
    return outcome; // 'accepted' | 'dismissed'
  }, [deferredPrompt]);

  const isIos =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !window.MSStream;

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    isIos,
    promptInstall,
  };
}
