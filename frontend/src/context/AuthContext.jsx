import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setMemoryToken, tokenStore } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setMemoryToken(null);
    setUser(null);
  }, []);

  // pulihkan sesi login dari token yang tersimpan
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const login = async (identifier, password, ingatSaya) => {
    const res = await api.post('/auth/login', { identifier, password, ingatSaya });
    setMemoryToken(res.data.token);
    tokenStore.set(res.data.token, ingatSaya);
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
