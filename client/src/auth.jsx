import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('token')) { setUser(null); setCompany(null); return; }
    try { const r = await api.get('/auth/me'); setUser(r.user); setCompany(r.company); }
    catch { setUser(null); setCompany(null); }
  }, []);

  useEffect(() => { refresh().finally(() => setReady(true)); }, [refresh]);
  useEffect(() => {
    const h = () => { setUser(null); setCompany(null); };
    window.addEventListener('auth-expired', h);
    return () => window.removeEventListener('auth-expired', h);
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', r.token);
    await refresh();
    return r.user;
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); setCompany(null); };

  return <Ctx.Provider value={{ user, company, ready, login, logout, refresh }}>{children}</Ctx.Provider>;
}
