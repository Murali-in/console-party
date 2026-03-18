import Phaser from 'phaser';
import type { PlayerInput, RoomPlayer } from '@/contexts/RealtimeContext';

export interface GameConfig {
  gameId: string;
  containerId: string;
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
}

export const inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }> = {};

let currentGame: Phaser.Game | null = null;

export function updateInput(input: PlayerInput) {
  inputMap[input.playerId] = {
    x: input.x,
    y: input.y,
    buttonA: input.buttonA,
    buttonB: input.buttonB,
  };
}

export async function startGame(config: GameConfig): Promise<Phaser.Game> {
  destroyGame();

  const { gameId, containerId, players, onGameOver } = config;

  let SceneClass: any;
  switch (gameId) {
    case 'bomb-pass':
      SceneClass = (await import('./scenes/BombPass')).default;
      break;
    case 'nitro-race':
      SceneClass = (await import('./scenes/NitroRace')).default;
      break;
    case 'apex-arena':
      SceneClass = (await import('./scenes/ApexArena')).default;
      break;
    case 'prop-hunt':
      SceneClass = (await import('./scenes/PropHunt')).default;
      break;
    case 'siege-battle':
      SceneClass = (await import('./scenes/SiegeBattle')).default;
      break;
    default:
      throw new Error(`Unknown game: ${gameId}`);
  }

  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container #${containerId} not found`);

  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;

  const scene = new SceneClass({ players, onGameOver, inputMap });

  currentGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: containerId,
    width: w,
    height: h,
    backgroundColor: '#080810',
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { x: 0, y: 0 } },
    },
    scene: scene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  return currentGame;
}

export function destroyGame() {
  if (currentGame) {
    currentGame.destroy(true);
    currentGame = null;
  }
  Object.keys(inputMap).forEach(k => delete inputMap[k]);
}
