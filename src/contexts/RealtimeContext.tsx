import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PlayerInput {
  playerId: string;
  playerIndex: number;
  x: number;
  y: number;
  buttonA: boolean;
  buttonB: boolean;
  buttonX?: boolean;
  buttonY?: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  index: number;
  color: string;
  ready?: boolean;
}

const PLAYER_COLORS = ['#6c63ff', '#34d399', '#f87171', '#fbbf24'];

interface RealtimeContextType {
  createRoom: () => string;
  joinRoom: (roomCode: string, playerName: string, callbacks: RoomCallbacks, playerId?: string) => RealtimeChannel;
  hostRoom: (roomCode: string, callbacks: HostCallbacks) => RealtimeChannel;
  sendInput: (channel: RealtimeChannel, input: PlayerInput) => void;
  sendGameEvent: (channel: RealtimeChannel, type: string, data: any) => void;
  sendReady: (channel: RealtimeChannel, playerId: string, ready: boolean) => void;
  leaveRoom: (channel: RealtimeChannel, playerId?: string) => void;
}

interface RoomCallbacks {
  onPlayerJoined?: (players: RoomPlayer[]) => void;
  onGameStarted?: (gameId: string) => void;
  onGameEvent?: (type: string, data: any) => void;
  onGameOver?: (winner: string, scores: Record<string, number>) => void;
  onCountdown?: (count: number) => void;
}

interface HostCallbacks {
  onPlayerJoined?: (players: RoomPlayer[]) => void;
  onPlayerLeft?: (playerId: string) => void;
  onInputUpdate?: (input: PlayerInput) => void;
  onPlayerReady?: (playerId: string, ready: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextType>({} as RealtimeContextType);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const playersRef = useRef<RoomPlayer[]>([]);

  const createRoom = useCallback(() => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    playersRef.current = [];
    return code;
  }, []);

  const hostRoom = useCallback((roomCode: string, callbacks: HostCallbacks) => {
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'player-join' }, ({ payload }) => {
        const existingPlayer = playersRef.current.find((player) => player.id === payload.id);

        if (existingPlayer) {
          playersRef.current = playersRef.current.map((player) =>
            player.id === payload.id ? { ...player, name: payload.name } : player,
          );
          channel.send({
            type: 'broadcast',
            event: 'player-accepted',
            payload: { player: existingPlayer, players: playersRef.current },
          });
          callbacks.onPlayerJoined?.(playersRef.current);
          return;
        }

        const player: RoomPlayer = {
          id: payload.id,
          name: payload.name,
          index: playersRef.current.length,
          color: PLAYER_COLORS[playersRef.current.length % PLAYER_COLORS.length],
          ready: false,
        };

        playersRef.current = [...playersRef.current, player];
        channel.send({
          type: 'broadcast',
          event: 'player-accepted',
          payload: { player, players: playersRef.current },
        });
        callbacks.onPlayerJoined?.(playersRef.current);
      })
      .on('broadcast', { event: 'player-input' }, ({ payload }) => {
        callbacks.onInputUpdate?.(payload as PlayerInput);
      })
      .on('broadcast', { event: 'player-ready' }, ({ payload }) => {
        playersRef.current = playersRef.current.map((player) =>
          player.id === payload.playerId ? { ...player, ready: payload.ready } : player,
        );
        callbacks.onPlayerReady?.(payload.playerId, payload.ready);
        callbacks.onPlayerJoined?.(playersRef.current);
      })
      .on('broadcast', { event: 'player-leave' }, ({ payload }) => {
        playersRef.current = playersRef.current.filter((player) => player.id !== payload.id);
        callbacks.onPlayerLeft?.(payload.id);
        callbacks.onPlayerJoined?.(playersRef.current);
      })
      .subscribe();

    return channel;
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string, callbacks: RoomCallbacks, playerId?: string) => {
    const resolvedPlayerId = playerId || crypto.randomUUID();
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
      .on('broadcast', { event: 'countdown' }, ({ payload }) => {
        callbacks.onCountdown?.(payload.count);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'player-join',
            payload: { id: resolvedPlayerId, name: playerName },
          });
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

  const sendReady = useCallback((channel: RealtimeChannel, playerId: string, ready: boolean) => {
    channel.send({ type: 'broadcast', event: 'player-ready', payload: { playerId, ready } });
  }, []);

  const leaveRoom = useCallback((channel: RealtimeChannel, playerId?: string) => {
    if (playerId) {
      channel.send({ type: 'broadcast', event: 'player-leave', payload: { id: playerId } });
    }
    supabase.removeChannel(channel);
  }, []);

  return (
    <RealtimeContext.Provider value={{ createRoom, joinRoom, hostRoom, sendInput, sendGameEvent, sendReady, leaveRoom }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeContext);
