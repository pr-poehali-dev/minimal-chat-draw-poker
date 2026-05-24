import { useState, useEffect, useCallback, useRef } from 'react';
import { authApi, roomApi, setSessionId, clearSession, getSessionId } from '@/lib/api';

export interface AuthUser {
  id: number;
  username: string;
  chips: number;
  at_table: boolean;
  session_id: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ping каждые 30 сек чтобы не выкинуло по неактиву
  const startPing = useCallback(() => {
    if (pingRef.current) clearInterval(pingRef.current);
    pingRef.current = setInterval(() => {
      roomApi.ping().catch(() => {});
    }, 30_000);
  }, []);

  const stopPing = useCallback(() => {
    if (pingRef.current) clearInterval(pingRef.current);
  }, []);

  // Восстановить сессию при загрузке
  useEffect(() => {
    const sid = getSessionId();
    if (!sid) { setLoading(false); return; }
    authApi.me()
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setSessionId(data.user.session_id);
          startPing();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await authApi.register(username, password);
      if (data.error) { setError(data.error); return false; }
      setSessionId(data.user.session_id);
      setUser(data.user);
      startPing();
      return true;
    } finally {
      setLoading(false);
    }
  }, [startPing]);

  const login = useCallback(async (username: string, password: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      if (data.error) { setError(data.error); return false; }
      setSessionId(data.user.session_id);
      setUser(data.user);
      startPing();
      return true;
    } finally {
      setLoading(false);
    }
  }, [startPing]);

  const logout = useCallback(async () => {
    stopPing();
    await authApi.logout().catch(() => {});
    clearSession();
    setUser(null);
  }, [stopPing]);

  const sit = useCallback(async () => {
    const data = await roomApi.sit();
    if (!data.error) setUser(u => u ? { ...u, at_table: true } : u);
  }, []);

  const stand = useCallback(async () => {
    const data = await roomApi.stand();
    if (!data.error) setUser(u => u ? { ...u, at_table: false } : u);
  }, []);

  return { user, loading, error, setError, register, login, logout, sit, stand };
}
