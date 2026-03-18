import { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PlayerInput {
  playerId: string;
  playerIndex: number;
  x: number;
  y: number;
  buttonA: boolean;
  buttonB: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  index: number;
  color: string;
}

const PLAYER_COLORS = ['#5B4FFF', '#FF4F4F', '#2ECC71', '#FFD93D'];

interface RealtimeContextType {
  createRoom: () => string;
  joinRoom: (roomCode: string, playerName: string, callbacks: RoomCallbacks) => RealtimeChannel;
  hostRoom: (roomCode: string, callbacks: HostCallbacks) => RealtimeChannel;
  sendInput: (channel: RealtimeChannel, input: PlayerInput) => void;
  sendGameEvent: (channel: RealtimeChannel, type: string, data: any) => void;
  leaveRoom: (channel: RealtimeChannel) => void;
}

interface RoomCallbacks {
  onPlayerJoined?: (players: RoomPlayer[]) => void;
  onGameStarted?: (gameId: string) => void;
  onGameEvent?: (type: string, data: any) => void;
  onGameOver?: (winner: string, scores: Record<string, number>) => void;
}

interface HostCallbacks {
  onPlayerJoined?: (players: RoomPlayer[]) => void;
  onPlayerLeft?: (playerId: string) => void;
  onInputUpdate?: (input: PlayerInput) => void;
}

const RealtimeContext = createContext<RealtimeContextType>({} as RealtimeContextType);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const playersRef = useRef<RoomPlayer[]>([]);

  const generateRoomCode = () => {
    return String(Math.floor(100000 + Math.random() * 900000));
  };

  const createRoom = useCallback(() => {
    const code = generateRoomCode();
    playersRef.current = [];
    return code;
  }, []);

  const hostRoom = useCallback((roomCode: string, callbacks: HostCallbacks) => {
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'player-join' }, ({ payload }) => {
        const player: RoomPlayer = {
          id: payload.id,
          name: payload.name,
          index: playersRef.current.length,
          color: PLAYER_COLORS[playersRef.current.length % 4],
        };
        playersRef.current = [...playersRef.current, player];
        // Send back player info
        channel.send({ type: 'broadcast', event: 'player-accepted', payload: { player, players: playersRef.current } });
        callbacks.onPlayerJoined?.(playersRef.current);
      })
      .on('broadcast', { event: 'player-input' }, ({ payload }) => {
        callbacks.onInputUpdate?.(payload as PlayerInput);
      })
      .on('broadcast', { event: 'player-leave' }, ({ payload }) => {
        playersRef.current = playersRef.current.filter(p => p.id !== payload.id);
        callbacks.onPlayerLeft?.(payload.id);
        callbacks.onPlayerJoined?.(playersRef.current);
      })
      .subscribe();

    return channel;
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string, callbacks: RoomCallbacks) => {
    const playerId = crypto.randomUUID();
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'player-accepted' }, ({ payload }) => {
        callbacks.onPlayerJoined?.(payload.players);
      })
      .on('broadcast', { event: 'game-started' }, ({ payload }) => {
        callbacks.onGameStarted?.(payload.gameId);
      })
      .on('broadcast', { event: 'game-event' }, ({ payload }) => {
        callbacks.onGameEvent?.(payload.type, payload.data);
      })
      .on('broadcast', { event: 'game-over' }, ({ payload }) => {
        callbacks.onGameOver?.(payload.winner, payload.scores);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'player-join', payload: { id: playerId, name: playerName } });
        }
      });

    return channel;
  }, []);

  const sendInput = useCallback((channel: RealtimeChannel, input: PlayerInput) => {
    channel.send({ type: 'broadcast', event: 'player-input', payload: input });
  }, []);

  const sendGameEvent = useCallback((channel: RealtimeChannel, type: string, data: any) => {
    channel.send({ type: 'broadcast', event: 'game-event', payload: { type, data } });
  }, []);

  const leaveRoom = useCallback((channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
  }, []);

  return (
    <RealtimeContext.Provider value={{ createRoom, joinRoom, hostRoom, sendInput, sendGameEvent, leaveRoom }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeContext);
