import { useState, useEffect, useCallback, useRef } from 'react';
import { roomApi } from '@/lib/api';

export interface RoomPlayer {
  id: number;
  name: string;
  chips: number;
  online: boolean;
}

export function useRoom() {
  const [joined, setJoined] = useState(false);
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState<number | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await roomApi.getPlayers();
      if (data.players) setPlayers(data.players);
    } catch (_e) { /* ignore */ }
  }, []);

  const join = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const data = await roomApi.join(name);
      if (data.session_id) {
        localStorage.setItem('royal_session_id', data.session_id);
      }
      setMyName(data.name || name);
      setMyId(data.player_id || null);
      setJoined(true);
      await fetchPlayers();
    } finally {
      setLoading(false);
    }
  }, [fetchPlayers]);

  const leave = useCallback(async () => {
    await roomApi.leave();
    setJoined(false);
    setMyName('');
    setMyId(null);
    setPlayers([]);
  }, []);

  // Восстановить сессию при загрузке
   
  useEffect(() => {
    const sid = localStorage.getItem('royal_session_id');
    const savedName = localStorage.getItem('royal_player_name');
    if (sid && savedName) {
      join(savedName);
    }
  }, []);

  useEffect(() => {
    if (!joined) return;
    localStorage.setItem('royal_player_name', myName);
    pollRef.current = setInterval(fetchPlayers, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [joined, myName, fetchPlayers]);

  return { joined, myName, myId, players, loading, join, leave };
}
