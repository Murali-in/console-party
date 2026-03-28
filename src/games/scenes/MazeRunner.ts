import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playCoinCollect, playExitReached } from '@/games/SoundFX';

interface MazeConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

interface MazePlayer {
  x: number; y: number;
  color: number; colorHex: string;
  name: string; score: number;
  dashCooldown: number;
  trail: { x: number; y: number; alpha: number }[];
  moveAccum: number; // per-player move accumulator
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
  private CELL = 26;
  private COLS = 0;
  private ROWS = 0;
  private round = 1;
  private MAX_ROUNDS = 3;
  private hudText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private moveTimer = 0; // kept for compat but unused now
  private BASE_MOVE_INTERVAL = 100;
  private FAST_MOVE_INTERVAL = 45;
  private coinPulse = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: number; size: number }[] = [];

  constructor(config: MazeConfig) {
    super({ key: 'MazeRunner' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.COLS = Math.floor(w / this.CELL) | 1;
    this.ROWS = Math.floor(h / this.CELL) | 1;
    if (this.COLS % 2 === 0) this.COLS--;
    if (this.ROWS % 2 === 0) this.ROWS--;

    this.gfx = this.add.graphics();

    this.roomPlayers.forEach(p => {
      this.mazePlayers.set(p.id, {
        x: 1, y: 1,
        color: Phaser.Display.Color.HexStringToColor(p.color).color,
        colorHex: p.color,
        name: p.name, score: 0, dashCooldown: 0,
        trail: [],
        moveAccum: 0,
      });
    });

    this.hudText = this.add.text(w / 2, 4, '', {
      fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(10);

    this.roundText = this.add.text(w / 2, h / 2, '', {
      fontFamily: 'Syne', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    this.generateMaze();
    this.showRoundText();
  }

  private showRoundText() {
    this.roundText.setText(`Round ${this.round}/${this.MAX_ROUNDS}`).setAlpha(1);
    this.time.delayedCall(1500, () => this.roundText.setAlpha(0));
  }

  private generateMaze() {
    this.walls = [];
    for (let y = 0; y < this.ROWS; y++) {
      this.walls[y] = [];
      for (let x = 0; x < this.COLS; x++) {
        this.walls[y][x] = true;
      }
    }

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

    this.exit = { x: this.COLS - 2, y: this.ROWS - 2 };
    this.walls[this.exit.y][this.exit.x] = false;

    this.coins.clear();
    let coinCount = 0;
    const maxCoins = Math.floor((this.COLS * this.ROWS) / 18);
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

    const spawns = [
      { x: 1, y: 1 }, { x: this.COLS - 2, y: 1 },
      { x: 1, y: this.ROWS - 2 }, { x: Math.floor(this.COLS / 2) | 1, y: 1 },
    ];
    let i = 0;
    this.mazePlayers.forEach(p => {
      const sp = spawns[i % spawns.length];
      this.walls[sp.y][sp.x] = false;
      p.x = sp.x; p.y = sp.y;
      p.trail = [];
      i++;
    });
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return;

    this.coinPulse += delta * 0.003;

    this.mazePlayers.forEach((mp, pid) => {
      mp.dashCooldown = Math.max(0, mp.dashCooldown - delta / 1000);

      // Determine per-player move interval
      let playerInterval = this.BASE_MOVE_INTERVAL;

      if (pid.startsWith('demo-cpu') || pid.startsWith('cpu-')) {
        playerInterval = 120; // CPU moves at fixed rate
      } else {
        const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false, buttonX: false, buttonY: false, holdTime: 0 };
        const holdFactor = Math.min(1, (inp.holdTime || 0) / 600);
        playerInterval = this.BASE_MOVE_INTERVAL - (this.BASE_MOVE_INTERVAL - this.FAST_MOVE_INTERVAL) * holdFactor;
      }

      mp.moveAccum += delta;
      if (mp.moveAccum < playerInterval) return;
      mp.moveAccum = 0;

      // CPU AI
      if (pid.startsWith('demo-cpu') || pid.startsWith('cpu-')) {
        const ddx = this.exit.x - mp.x;
        const ddy = this.exit.y - mp.y;
        const tryDirs: { x: number; y: number }[] = [];
        if (Math.random() < 0.7) {
          if (ddx > 0) tryDirs.push({ x: 1, y: 0 });
          else if (ddx < 0) tryDirs.push({ x: -1, y: 0 });
          if (ddy > 0) tryDirs.push({ x: 0, y: 1 });
          else if (ddy < 0) tryDirs.push({ x: 0, y: -1 });
        }
        const allDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        for (const d of allDirs.sort(() => Math.random() - 0.5)) tryDirs.push(d);
        for (const d of tryDirs) {
          const nx = mp.x + d.x;
          const ny = mp.y + d.y;
          if (nx >= 0 && nx < this.COLS && ny >= 0 && ny < this.ROWS && !this.walls[ny][nx]) {
            mp.x = nx; mp.y = ny; break;
          }
        }
      } else {
        const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false, buttonX: false, buttonY: false, holdTime: 0 };

        let dx = 0, dy = 0;
        if (Math.abs(inp.x) > Math.abs(inp.y)) {
          dx = inp.x > 0.3 ? 1 : inp.x < -0.3 ? -1 : 0;
        } else {
          dy = inp.y > 0.3 ? 1 : inp.y < -0.3 ? -1 : 0;
        }

        // Button X (REVEAL): break a wall in the direction you're facing
        if (inp.buttonX && (dx !== 0 || dy !== 0)) {
          const wallX = mp.x + dx;
          const wallY = mp.y + dy;
          if (wallX > 0 && wallX < this.COLS - 1 && wallY > 0 && wallY < this.ROWS - 1 && this.walls[wallY][wallX]) {
            this.walls[wallY][wallX] = false;
            // Wall break particles
            const cx = wallX * this.CELL + this.CELL / 2;
            const cy = wallY * this.CELL + this.CELL / 2;
            for (let i = 0; i < 10; i++) {
              this.particles.push({
                x: cx + (Math.random() - 0.5) * 12, y: cy + (Math.random() - 0.5) * 12,
                vx: (Math.random() - 0.5) * 120 + dx * 60, vy: (Math.random() - 0.5) * 120 + dy * 60,
                life: 500, color: 0x6c63ff, size: 2 + Math.random() * 3,
              });
            }
          }
        }

        // Dash ability (button A): move 2 cells at once
        const dashSteps = inp.buttonA && mp.dashCooldown <= 0 ? 2 : 1;
        if (inp.buttonA && mp.dashCooldown <= 0 && (dx !== 0 || dy !== 0)) {
          mp.dashCooldown = 1;
        }

        if (dx !== 0 || dy !== 0) {
          for (let step = 0; step < dashSteps; step++) {
            const nx = mp.x + dx;
            const ny = mp.y + dy;
            if (nx >= 0 && nx < this.COLS && ny >= 0 && ny < this.ROWS && !this.walls[ny][nx]) {
              mp.x = nx; mp.y = ny;
            } else break;
          }
        }
      }

      // Trail
      mp.trail.push({ x: mp.x, y: mp.y, alpha: 0.5 });
      if (mp.trail.length > 6) mp.trail.shift();

      // Collect coins
      const key = `${mp.x},${mp.y}`;
      if (this.coins.has(key)) {
        this.coins.delete(key);
        mp.score++;
        playCoinCollect();
        const cx = mp.x * this.CELL + this.CELL / 2;
        const cy = mp.y * this.CELL + this.CELL / 2;
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
            life: 300, color: 0xfbbf24, size: 3,
          });
        }
      }

      // Reach exit
      if (mp.x === this.exit.x && mp.y === this.exit.y) {
        mp.score += 5;
        playExitReached();
        if (this.round >= this.MAX_ROUNDS) {
          this.gameEnded = true;
          const scores: Record<string, number> = {};
          this.mazePlayers.forEach(p => { scores[p.name] = p.score; });
          let winner = '', best = -1;
          this.mazePlayers.forEach(p => { if (p.score > best) { best = p.score; winner = p.name; } });
          this.onGameOver(winner, scores);
          return;
        } else {
          this.round++;
          this.generateMaze();
          this.showRoundText();
        }
      }
    });

    this.draw(delta);
  }

  private draw(delta: number) {
    this.gfx.clear();

    const C = this.CELL;

    // Draw floor
    this.gfx.fillStyle(0x080812, 1);
    this.gfx.fillRect(0, 0, this.COLS * C, this.ROWS * C);

    // Draw walls with pseudo-3D
    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLS; x++) {
        if (this.walls[y][x]) {
          const wx = x * C, wy = y * C;
          // Wall shadow (below)
          this.gfx.fillStyle(0x000000, 0.2);
          this.gfx.fillRect(wx + 2, wy + 3, C, C);
          // Wall body
          this.gfx.fillStyle(0x1a1a2e, 1);
          this.gfx.fillRect(wx, wy, C, C);
          // Wall top highlight
          this.gfx.fillStyle(0x252540, 1);
          this.gfx.fillRect(wx, wy, C, 4);
          // Border
          this.gfx.lineStyle(1, 0xffffff, 0.04);
          this.gfx.strokeRect(wx, wy, C, C);
        }
      }
    }

    // Draw coins with pulse
    const coinScale = 1 + Math.sin(this.coinPulse) * 0.2;
    this.coins.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      const px = cx * C + C / 2;
      const py = cy * C + C / 2;
      // Coin glow
      this.gfx.fillStyle(0xfbbf24, 0.1);
      this.gfx.fillCircle(px, py, 8 * coinScale);
      // Coin body
      this.gfx.fillStyle(0xfbbf24, 0.9);
      this.gfx.fillCircle(px, py, 4 * coinScale);
      // Coin highlight
      this.gfx.fillStyle(0xffffff, 0.3);
      this.gfx.fillCircle(px - 1, py - 1, 2);
    });

    // Draw exit with pulsing glow
    const exitPulse = 0.6 + Math.sin(this.coinPulse * 1.5) * 0.2;
    const ex = this.exit.x * C, ey = this.exit.y * C;
    // Exit glow
    this.gfx.fillStyle(0x34d399, 0.1);
    this.gfx.fillRect(ex - 4, ey - 4, C + 8, C + 8);
    // Exit body
    this.gfx.fillStyle(0x34d399, exitPulse);
    this.gfx.fillRect(ex + 3, ey + 3, C - 6, C - 6);
    // Exit icon (door shape)
    this.gfx.fillStyle(0x1a1a2e, 0.4);
    this.gfx.fillRect(ex + C / 2 - 3, ey + 4, 6, C - 8);
    this.gfx.fillStyle(0xffffff, 0.3);
    this.gfx.fillCircle(ex + C / 2 + 2, ey + C / 2, 1.5);

    // Particles
    this.particles = this.particles.filter(p => {
      p.life -= delta;
      if (p.life <= 0) return false;
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      const a = p.life / 300;
      this.gfx.fillStyle(p.color, a);
      this.gfx.fillCircle(p.x, p.y, p.size * a);
      return true;
    });

    // Draw player trails
    this.mazePlayers.forEach(mp => {
      mp.trail.forEach((t, i) => {
        const a = (i / mp.trail.length) * 0.15;
        this.gfx.fillStyle(mp.color, a);
        this.gfx.fillRect(t.x * C + 5, t.y * C + 5, C - 10, C - 10);
      });
    });

    // Draw players with pseudo-3D
    this.mazePlayers.forEach(mp => {
      const px = mp.x * C, py = mp.y * C;
      // Shadow
      this.gfx.fillStyle(0x000000, 0.25);
      this.gfx.fillEllipse(px + C / 2 + 2, py + C - 2, C - 8, 6);
      // Body
      this.gfx.fillStyle(mp.color, 1);
      this.gfx.fillRoundedRect(px + 4, py + 4, C - 8, C - 8, 4);
      // Body highlight
      this.gfx.fillStyle(0xffffff, 0.15);
      this.gfx.fillRoundedRect(px + 5, py + 4, C - 12, 6, 2);
      // Eyes
      this.gfx.fillStyle(0xffffff, 0.8);
      this.gfx.fillCircle(px + C / 2 - 3, py + C / 2 - 1, 2);
      this.gfx.fillCircle(px + C / 2 + 3, py + C / 2 - 1, 2);
      this.gfx.fillStyle(0x080812, 1);
      this.gfx.fillCircle(px + C / 2 - 2.5, py + C / 2 - 0.5, 1);
      this.gfx.fillCircle(px + C / 2 + 3.5, py + C / 2 - 0.5, 1);
    });

    // HUD
    const info = Array.from(this.mazePlayers.values())
      .map(p => `${p.name}: ${p.score}`)
      .join('  ·  ') + `  |  R${this.round}/${this.MAX_ROUNDS}`;
    this.hudText.setText(info);
  }
}
