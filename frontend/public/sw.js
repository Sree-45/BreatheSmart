/* Minimal service worker.
 *
 * It exists so the app meets PWA *installability* criteria (a manifest, served
 * over HTTPS, plus a registered service worker that has a fetch handler) — that
 * is what lets Chrome/Edge on desktop and Chrome on Android offer "Install app".
 *
 * It intentionally does NOT cache anything: the fetch handler is a pass-through
 * (it never calls respondWith, so the browser does its normal network fetch).
 * That keeps Vite HMR working in dev and guarantees no stale assets are served.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass-through: default network handling */ });
