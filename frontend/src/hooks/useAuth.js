import { useState, useEffect, useCallback } from 'react';
import { updateUser } from '../services/userService';

/**
 * Owns the authenticated user: localStorage hydration, persistence, login, logout.
 *
 * Kept UI-agnostic on purpose — it never touches modals or navigation. Callers
 * wire those side effects around `login`/`logout`. A token without a parseable
 * user (or vice-versa) is treated as a corrupted session and fully cleared.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      if (token || storedUser) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
      return;
    }
    try {
      const parsed = JSON.parse(storedUser);
      if (!parsed || typeof parsed !== 'object' || !parsed.id) {
        throw new Error('stored user is missing id');
      }
      setUser(parsed);
      setIsLoggedIn(true);
    } catch (e) {
      console.error('Failed to hydrate user from localStorage:', e);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }, []);

  // Persist a user update to backend + localStorage + React state. Used by every
  // path that mutates the profile outside the modal's explicit Save button.
  const persistUser = useCallback(async (nextUser) => {
    if (!nextUser?.id) return nextUser;
    try {
      const saved = await updateUser(nextUser.id, nextUser);
      setUser(saved);
      localStorage.setItem('user', JSON.stringify(saved));
      return saved;
    } catch (e) {
      console.error('Failed to persist user update:', e);
      // Keep the optimistic React state but warn — the next save will retry.
      setUser(nextUser);
      return nextUser;
    }
  }, []);

  // Returns true on success so callers can gate their UI side effects.
  const login = useCallback((loginData) => {
    const { token, user: loggedInUser } = loginData || {};
    if (!token || !loggedInUser) {
      console.error('Login response is missing token or user');
      return false;
    }
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    // Replace state — never merge with defaults, which pollutes the record with
    // bogus fields that won't round-trip through the backend.
    setUser(loggedInUser);
    setIsLoggedIn(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  return { user, setUser, isLoggedIn, persistUser, login, logout };
}
