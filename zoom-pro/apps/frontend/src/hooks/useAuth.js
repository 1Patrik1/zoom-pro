import { useMemo, useState } from 'react';
import { api } from '../api/client.js';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function useAuth() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  async function submitAuth({ isRegister, email, password, companyName, joinId }) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const payload = { email, password, companyName, joinId };
      if (isRegister) {
        const result = await api.register(payload);
        return { mode: 'register', ...result };
      }
      const result = await api.login(payload);
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      return { mode: 'login', ...result };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken('');
    setUser(null);
    setAuthError('');
  }

  return useMemo(() => ({
    token,
    user,
    authLoading,
    authError,
    submitAuth,
    logout,
    setUser
  }), [token, user, authLoading, authError]);
}
