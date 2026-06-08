import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'theme';

/** Resolve the initial theme: saved choice, else the OS preference. */
export function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Module-level store so EVERY useTheme() consumer shares ONE theme value.
// Previously each component had its own useState, so toggling the theme in
// Settings updated the <html data-theme> attribute (CSS) but NOT other
// components reading `theme` as state — e.g. Home, which passes `theme` to the
// map. That left the map stuck on the old theme ("app is light, map is dark").
let currentTheme = getInitialTheme();
const listeners = new Set();

// Make sure the attribute reflects the resolved theme as soon as this module
// loads (main.jsx also sets it at first paint; this is idempotent).
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', currentTheme);
}

function applyTheme(next) {
  if (next !== 'light' && next !== 'dark') return;
  currentTheme = next;
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* localStorage may be unavailable; ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Light/dark theme backed by a shared store. Applies `data-theme` to <html>
 * (so it also covers portalled modals) and notifies every consumer so they all
 * re-render together — keeping the map, panels, and CSS in lock-step.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => currentTheme, () => currentTheme);
  const setTheme = useCallback((next) => applyTheme(next), []);
  const toggleTheme = useCallback(
    () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'),
    [],
  );
  return { theme, toggleTheme, setTheme };
}
