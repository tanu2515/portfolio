import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user } = await api('/auth/register', { method: 'POST', body: data });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  // Used after password reset, which returns a fresh session.
  const setSession = useCallback((token, user) => {
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const toggleWishlist = useCallback(async (productId) => {
    const wishlist = await api(`/auth/wishlist/${productId}`, { method: 'POST' });
    setUser((u) => ({ ...u, wishlist }));
    return wishlist.includes(productId);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, ready, login, register, logout, toggleWishlist, setSession }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
