import { useState, useEffect, useCallback, useRef } from 'react';
import { roomApi } from '@/lib/api';

export interface RoomPlayer {
  id: number;
  name: string;
  chips: number;
  at_table: boolean;
}

export function useRoom(loggedIn: boolean) {
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await roomApi.getPlayers();
      if (data.players) setPlayers(data.players);
    } catch (_e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!loggedIn) { setPlayers([]); return; }
    fetchPlayers();
    pollRef.current = setInterval(fetchPlayers, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loggedIn, fetchPlayers]);

  return { players, fetchPlayers };
}
