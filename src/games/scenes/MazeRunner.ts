import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playCoinCollect, playExitReached } from '@/games/SoundFX';

interface MazeConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

interface MazePlayer {
  x: number;
  y: number;
  color: number;
  name: string;
  score: number;
  dashCooldown: number;
}

export default class MazeRunnerScene extends Phaser.Scene {
  private mazePlayers: Map<string, MazePlayer> = new Map();
  private walls: boolean[][] = [];
  private coins: Set<string> = new Set();
  private exit: { x: number; y: number } = { x: 0, y: 0 };
  private gfx!: Phaser.GameObjects.Graphics;
  private inputMap: MazeConfig['inputMap'];
  private onGameOver: MazeConfig['onGameOver'];
  private roomPlayers: RoomPlayer[];
  private gameEnded = false;
  private CELL = 24;
  private COLS = 0;
  private ROWS = 0;
  private round = 1;
  private MAX_ROUNDS = 3;
  private hudText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private moveTimer = 0;
  private MOVE_INTERVAL = 80;

  constructor(config: MazeConfig) {
    super({ key: 'MazeRunner' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.COLS = Math.floor(w / this.CELL) | 1; // ensure odd
    this.ROWS = Math.floor(h / this.CELL) | 1;
    if (this.COLS % 2 === 0) this.COLS--;
    if (this.ROWS % 2 === 0) this.ROWS--;

    this.gfx = this.add.graphics();

    this.roomPlayers.forEach(p => {
      this.mazePlayers.set(p.id, {
        x: 1, y: 1,
        color: parseInt(p.color.replace('#', ''), 16),
        name: p.name, score: 0, dashCooldown: 0,
      });
    });

    this.hudText = this.add.text(w / 2, 4, '', {
      fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0);

    this.roundText = this.add.text(w / 2, h / 2, '', {
      fontFamily: 'Syne', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.generateMaze();
    this.showRoundText();
  }

  private showRoundText() {
    this.roundText.setText(`Round ${this.round}/${this.MAX_ROUNDS}`).setAlpha(1);
    this.time.delayedCall(1500, () => this.roundText.setAlpha(0));
  }

  private generateMaze() {
    // Initialize all walls
    this.walls = [];
    for (let y = 0; y < this.ROWS; y++) {
      this.walls[y] = [];
      for (let x = 0; x < this.COLS; x++) {
        this.walls[y][x] = true;
      }
    }

    // Recursive backtracker maze generation
    const stack: { x: number; y: number }[] = [];
    const start = { x: 1, y: 1 };
    this.walls[start.y][start.x] = false;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: { x: number; y: number; wx: number; wy: number }[] = [];

      const dirs = [
        { dx: 0, dy: -2 }, { dx: 0, dy: 2 },
        { dx: -2, dy: 0 }, { dx: 2, dy: 0 },
      ];

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        if (nx > 0 && nx < this.COLS - 1 && ny > 0 && ny < this.ROWS - 1 && this.walls[ny][nx]) {
          neighbors.push({ x: nx, y: ny, wx: current.x + d.dx / 2, wy: current.y + d.dy / 2 });
        }
      }

      if (neighbors.length > 0) {
        const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.walls[chosen.wy][chosen.wx] = false;
        this.walls[chosen.y][chosen.x] = false;
        stack.push({ x: chosen.x, y: chosen.y });
      } else {
        stack.pop();
      }
    }

    // Place exit at bottom-right area
    this.exit = { x: this.COLS - 2, y: this.ROWS - 2 };
    this.walls[this.exit.y][this.exit.x] = false;

    // Place coins on random open cells
    this.coins.clear();
    let coinCount = 0;
    const maxCoins = Math.floor((this.COLS * this.ROWS) / 20);
    for (let y = 1; y < this.ROWS - 1; y++) {
      for (let x = 1; x < this.COLS - 1; x++) {
        if (!this.walls[y][x] && !(x === 1 && y === 1) && !(x === this.exit.x && y === this.exit.y)) {
          if (Math.random() < 0.15 && coinCount < maxCoins) {
            this.coins.add(`${x},${y}`);
            coinCount++;
          }
        }
      }
    }

    // Reset player positions
    const spawns = [
      { x: 1, y: 1 },
      { x: this.COLS - 2, y: 1 },
      { x: 1, y: this.ROWS - 2 },
      { x: Math.floor(this.COLS / 2) | 1, y: 1 },
    ];
    let i = 0;
    this.mazePlayers.forEach(p => {
      const sp = spawns[i % spawns.length];
      // Make sure spawn is open
      this.walls[sp.y][sp.x] = false;
      p.x = sp.x;
      p.y = sp.y;
      i++;
    });
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return;

    this.moveTimer += delta;
    if (this.moveTimer < this.MOVE_INTERVAL) {
      this.draw();
      return;
    }
    this.moveTimer = 0;

    this.mazePlayers.forEach((mp, pid) => {
      const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };
      mp.dashCooldown = Math.max(0, mp.dashCooldown - this.MOVE_INTERVAL / 1000);

      // CPU AI: simple pathfinding toward exit
      if (pid.startsWith('demo-cpu') || pid.startsWith('cpu-')) {
        const dx = this.exit.x - mp.x;
        const dy = this.exit.y - mp.y;
        // Try to move toward exit, with random exploration
        const tryDirs: { x: number; y: number }[] = [];
        if (Math.random() < 0.7) {
          if (dx > 0) tryDirs.push({ x: 1, y: 0 });
          else if (dx < 0) tryDirs.push({ x: -1, y: 0 });
          if (dy > 0) tryDirs.push({ x: 0, y: 1 });
          else if (dy < 0) tryDirs.push({ x: 0, y: -1 });
        }
        // Add random directions
        const allDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        for (const d of allDirs.sort(() => Math.random() - 0.5)) tryDirs.push(d);

        for (const d of tryDirs) {
          const nx = mp.x + d.x;
          const ny = mp.y + d.y;
          if (nx >= 0 && nx < this.COLS && ny >= 0 && ny < this.ROWS && !this.walls[ny][nx]) {
            mp.x = nx;
            mp.y = ny;
            break;
          }
        }
      } else {
        // Player input
        let dx = 0, dy = 0;
        if (Math.abs(inp.x) > Math.abs(inp.y)) {
          dx = inp.x > 0.3 ? 1 : inp.x < -0.3 ? -1 : 0;
        } else {
          dy = inp.y > 0.3 ? 1 : inp.y < -0.3 ? -1 : 0;
        }

        if (dx !== 0 || dy !== 0) {
          const nx = mp.x + dx;
          const ny = mp.y + dy;
          if (nx >= 0 && nx < this.COLS && ny >= 0 && ny < this.ROWS && !this.walls[ny][nx]) {
            mp.x = nx;
            mp.y = ny;
          }
        }
      }

      // Collect coins
      const key = `${mp.x},${mp.y}`;
      if (this.coins.has(key)) {
        this.coins.delete(key);
        mp.score++;
      }

      // Reach exit
      if (mp.x === this.exit.x && mp.y === this.exit.y) {
        mp.score += 5;
        if (this.round >= this.MAX_ROUNDS) {
          this.gameEnded = true;
          const scores: Record<string, number> = {};
          this.mazePlayers.forEach(p => { scores[p.name] = p.score; });
          let winner = '';
          let best = -1;
          this.mazePlayers.forEach(p => { if (p.score > best) { best = p.score; winner = p.name; } });
          this.onGameOver(winner, scores);
        } else {
          this.round++;
          this.generateMaze();
          this.showRoundText();
        }
      }
    });

    this.draw();
  }

  private draw() {
    this.gfx.clear();

    // Draw walls
    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLS; x++) {
        if (this.walls[y][x]) {
          this.gfx.fillStyle(0xffffff, 0.12);
          this.gfx.fillRect(x * this.CELL, y * this.CELL, this.CELL, this.CELL);
        }
      }
    }

    // Draw coins
    this.coins.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      this.gfx.fillStyle(0xfbbf24, 0.9);
      this.gfx.fillCircle(cx * this.CELL + this.CELL / 2, cy * this.CELL + this.CELL / 2, 4);
    });

    // Draw exit
    this.gfx.fillStyle(0x34d399, 0.8);
    this.gfx.fillRect(this.exit.x * this.CELL + 2, this.exit.y * this.CELL + 2, this.CELL - 4, this.CELL - 4);

    // Draw players
    this.mazePlayers.forEach(mp => {
      this.gfx.fillStyle(mp.color, 1);
      this.gfx.fillRect(mp.x * this.CELL + 3, mp.y * this.CELL + 3, this.CELL - 6, this.CELL - 6);
    });

    // HUD
    const info = Array.from(this.mazePlayers.values())
      .map(p => `${p.name}: ${p.score}`)
      .join('  ') + `  |  Round ${this.round}/${this.MAX_ROUNDS}`;
    this.hudText.setText(info);
  }
}
