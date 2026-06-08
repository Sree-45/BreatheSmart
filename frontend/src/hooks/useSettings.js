import { useState, useEffect, useCallback } from 'react';

const FONT_SCALE_KEY = 'fontScale';
const REDUCE_MOTION_KEY = 'reduceMotion';

/** Multipliers applied to the root font-size for each named scale. */
export const FONT_SCALES = { xs: 0.85, small: 0.92, default: 1, large: 1.18, xl: 1.4 };

/** Root px the scale multiplies. Phones use a smaller base so the default
    text isn't oversized on small screens. */
const BASE_PX = 16;
const MOBILE_BASE_PX = 13.5;

/** Ordered options for the settings UI (key + short label + the scale it maps to). */
export const FONT_SCALE_OPTIONS = [
  { key: 'xs', label: 'XS', scale: FONT_SCALES.xs },
  { key: 'small', label: 'S', scale: FONT_SCALES.small },
  { key: 'default', label: 'M', scale: FONT_SCALES.default },
  { key: 'large', label: 'L', scale: FONT_SCALES.large },
  { key: 'xl', label: 'XL', scale: FONT_SCALES.xl },
];

/* ------------------------------------------------------------------ */
/* Font scale                                                         */
/* ------------------------------------------------------------------ */

/** Resolve the initial font-scale key from localStorage, defaulting to 'default'. */
export function getInitialFontScale() {
  const saved = localStorage.getItem(FONT_SCALE_KEY);
  if (saved && Object.prototype.hasOwnProperty.call(FONT_SCALES, saved)) return saved;
  return 'default';
}

/** Apply a font-scale to the document root so it covers portalled modals too.
    The px base is smaller on phones, shrinking the whole rem-based UI there. */
export function applyFontScale(name) {
  const mult = FONT_SCALES[name] ?? 1;
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 560px)').matches;
  const base = isMobile ? MOBILE_BASE_PX : BASE_PX;
  document.documentElement.style.fontSize = `${(base * mult).toFixed(2)}px`;
}

/**
 * Root font-size scaling. Applies the scale to <html> and persists the choice.
 * Returns the current key plus a setter.
 */
export function useFontScale() {
  const [fontScale, setFontScaleState] = useState(getInitialFontScale);

  useEffect(() => {
    applyFontScale(fontScale);
    localStorage.setItem(FONT_SCALE_KEY, fontScale);
    // Re-apply when crossing the phone breakpoint so the base px stays correct.
    const mql = window.matchMedia?.('(max-width: 560px)');
    if (!mql) return undefined;
    const onChange = () => applyFontScale(fontScale);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [fontScale]);

  const setFontScale = useCallback((name) => setFontScaleState(name), []);

  return { fontScale, setFontScale };
}

/* ------------------------------------------------------------------ */
/* Reduce motion                                                      */
/* ------------------------------------------------------------------ */

/** Resolve the initial reduce-motion preference from localStorage. */
export function getInitialReduceMotion() {
  return localStorage.getItem(REDUCE_MOTION_KEY) === 'true';
}

/** Toggle the `data-reduce-motion` attribute on <html>. */
export function applyReduceMotion(on) {
  if (on) {
    document.documentElement.setAttribute('data-reduce-motion', 'true');
  } else {
    document.documentElement.removeAttribute('data-reduce-motion');
  }
}

/**
 * Reduce-motion preference. Applies the `data-reduce-motion` attribute to
 * <html> and persists the choice. Returns the current value plus a setter.
 */
export function useReduceMotion() {
  const [reduceMotion, setReduceMotionState] = useState(getInitialReduceMotion);

  useEffect(() => {
    applyReduceMotion(reduceMotion);
    localStorage.setItem(REDUCE_MOTION_KEY, String(reduceMotion));
  }, [reduceMotion]);

  const setReduceMotion = useCallback((on) => setReduceMotionState(on), []);

  return { reduceMotion, setReduceMotion };
}
