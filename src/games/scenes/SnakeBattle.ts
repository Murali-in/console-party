import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface SnakeConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

interface SnakeData {
  segments: { x: number; y: number }[];
  dir: { x: number; y: number };
  nextDir: { x: number; y: number };
  alive: boolean;
  color: number;
  name: string;
  score: number;
  speedBoost: boolean;
}

export default class SnakeBattleScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: SnakeConfig['onGameOver'];
  private inputMap: SnakeConfig['inputMap'];
  private snakes: Map<string, SnakeData> = new Map();
  private food: { x: number; y: number }[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private moveTimer = 0;
  private CELL = 16;
  private COLS = 0;
  private ROWS = 0;
  private BASE_INTERVAL = 120;
  private FAST_INTERVAL = 60;
  private hudText!: Phaser.GameObjects.Text;
  private gameEnded = false;

  constructor(config: SnakeConfig) {
    super({ key: 'SnakeBattle' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.COLS = Math.floor(w / this.CELL);
    this.ROWS = Math.floor(h / this.CELL);
    this.gfx = this.add.graphics();

    const spawns = [
      { x: 5, y: Math.floor(this.ROWS / 2), dir: { x: 1, y: 0 } },
      { x: this.COLS - 6, y: Math.floor(this.ROWS / 2), dir: { x: -1, y: 0 } },
      { x: Math.floor(this.COLS / 2), y: 5, dir: { x: 0, y: 1 } },
      { x: Math.floor(this.COLS / 2), y: this.ROWS - 6, dir: { x: 0, y: -1 } },
    ];

    this.roomPlayers.forEach((p, i) => {
      const sp = spawns[i];
      const segments = [];
      for (let s = 0; s < 4; s++) {
        segments.push({ x: sp.x - sp.dir.x * s, y: sp.y - sp.dir.y * s });
      }
      this.snakes.set(p.id, {
        segments,
        dir: { ...sp.dir },
        nextDir: { ...sp.dir },
        alive: true,
        color: parseInt(p.color.replace('#', ''), 16),
        name: p.name,
        score: 0,
        speedBoost: false,
      });
    });

    for (let i = 0; i < 3; i++) this.spawnFood();

    this.hudText = this.add.text(w / 2, 4, '', {
      fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ededf5',
    }).setOrigin(0.5, 0);
  }

  private spawnFood() {
    const occupied = new Set<string>();
    this.snakes.forEach(s => s.segments.forEach(seg => occupied.add(`${seg.x},${seg.y}`)));
    this.food.forEach(f => occupied.add(`${f.x},${f.y}`));

    let attempts = 0;
    while (attempts < 100) {
      const x = Math.floor(Math.random() * (this.COLS - 4)) + 2;
      const y = Math.floor(Math.random() * (this.ROWS - 4)) + 2;
      if (!occupied.has(`${x},${y}`)) {
        this.food.push({ x, y });
        return;
      }
      attempts++;
    }
  }

  /** Smart CPU AI: chase nearest food while avoiding death */
  private getCpuDirection(snake: SnakeData): { x: number; y: number } | null {
    const head = snake.segments[0];
    const occupied = new Set<string>();
    this.snakes.forEach(s => {
      if (!s.alive) return;
      s.segments.forEach(seg => occupied.add(`${seg.x},${seg.y}`));
    });

    // Find nearest food
    let nearestFood = this.food[0];
    let minDist = Infinity;
    for (const f of this.food) {
      const d = Math.abs(f.x - head.x) + Math.abs(f.y - head.y);
      if (d < minDist) { minDist = d; nearestFood = f; }
    }

    // Possible directions
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
    ];

    // Filter: can't reverse
    const valid = dirs.filter(d =>
      !(d.x === -snake.dir.x && d.y === -snake.dir.y)
    );

    // Score each direction
    const scored = valid.map(d => {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      // Wall death
      if (nx < 0 || nx >= this.COLS || ny < 0 || ny >= this.ROWS) return { d, score: -1000 };
      // Snake collision
      if (occupied.has(`${nx},${ny}`)) return { d, score: -1000 };

      let score = 0;
      // Prefer direction toward food
      if (nearestFood) {
        const oldDist = Math.abs(nearestFood.x - head.x) + Math.abs(nearestFood.y - head.y);
        const newDist = Math.abs(nearestFood.x - nx) + Math.abs(nearestFood.y - ny);
        score += (oldDist - newDist) * 10;
      }
      // Penalize being near walls (look ahead 2 cells)
      const nx2 = nx + d.x;
      const ny2 = ny + d.y;
      if (nx2 < 0 || nx2 >= this.COLS || ny2 < 0 || ny2 >= this.ROWS) score -= 3;
      if (occupied.has(`${nx2},${ny2}`)) score -= 5;
      // Bonus for open space
      let openCount = 0;
      for (const check of dirs) {
        const cx = nx + check.x, cy = ny + check.y;
        if (cx >= 0 && cx < this.COLS && cy >= 0 && cy < this.ROWS && !occupied.has(`${cx},${cy}`)) openCount++;
      }
      score += openCount * 2;
      return { d, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.score > -1000 ? scored[0].d : scored[0]?.d || null;
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return;

    // Read input
    this.snakes.forEach((snake, pid) => {
      if (!snake.alive) return;
      const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };
      snake.speedBoost = inp.buttonB;

      if (Math.abs(inp.x) > 0.3 || Math.abs(inp.y) > 0.3) {
        let nx: number, ny: number;
        if (Math.abs(inp.x) > Math.abs(inp.y)) {
          nx = inp.x > 0 ? 1 : -1; ny = 0;
        } else {
          nx = 0; ny = inp.y > 0 ? 1 : -1;
        }
        if (nx !== -snake.dir.x || ny !== -snake.dir.y) {
          snake.nextDir = { x: nx, y: ny };
        }
      }

      // CPU players: use smart AI
      if (pid.startsWith('demo-cpu') || pid.startsWith('cpu-')) {
        const aiDir = this.getCpuDirection(snake);
        if (aiDir) snake.nextDir = aiDir;
      }
    });

    let interval = this.BASE_INTERVAL;
    this.snakes.forEach(s => { if (s.alive && s.speedBoost) interval = Math.min(interval, this.FAST_INTERVAL); });

    this.moveTimer += delta;
    if (this.moveTimer < interval) { this.draw(); return; }
    this.moveTimer = 0;

    // Move
    this.snakes.forEach((snake) => {
      if (!snake.alive) return;
      snake.dir = { ...snake.nextDir };
      const head = snake.segments[0];
      const newHead = { x: head.x + snake.dir.x, y: head.y + snake.dir.y };

      if (newHead.x < 0 || newHead.x >= this.COLS || newHead.y < 0 || newHead.y >= this.ROWS) {
        snake.alive = false; return;
      }

      let collided = false;
      this.snakes.forEach((other) => {
        if (!other.alive) return;
        for (const seg of other.segments) {
          if (seg.x === newHead.x && seg.y === newHead.y) collided = true;
        }
      });
      if (collided) { snake.alive = false; return; }

      snake.segments.unshift(newHead);
      const foodIdx = this.food.findIndex(f => f.x === newHead.x && f.y === newHead.y);
      if (foodIdx >= 0) {
        this.food.splice(foodIdx, 1);
        snake.score++;
        this.spawnFood();
      } else {
        snake.segments.pop();
      }
    });

    const alive = Array.from(this.snakes.values()).filter(s => s.alive);
    if (alive.length <= 1) {
      this.gameEnded = true;
      const scores: Record<string, number> = {};
      this.snakes.forEach(s => { scores[s.name] = s.score; });
      this.onGameOver(alive[0]?.name || 'Draw', scores);
    }
    this.draw();
  }

  private draw() {
    this.gfx.clear();
    this.gfx.fillStyle(0xffffff, 0.02);
    for (let x = 0; x < this.COLS; x++) {
      for (let y = 0; y < this.ROWS; y++) {
        this.gfx.fillRect(x * this.CELL + this.CELL / 2, y * this.CELL + this.CELL / 2, 1, 1);
      }
    }

    this.food.forEach(f => {
      this.gfx.fillStyle(0xf87171, 1);
      this.gfx.fillRect(f.x * this.CELL + 2, f.y * this.CELL + 2, this.CELL - 4, this.CELL - 4);
    });

    this.snakes.forEach(snake => {
      const alpha = snake.alive ? 1 : 0.2;
      snake.segments.forEach((seg, i) => {
        const brightness = i === 0 ? 1 : 0.7;
        this.gfx.fillStyle(snake.color, alpha * brightness);
        this.gfx.fillRect(seg.x * this.CELL + 1, seg.y * this.CELL + 1, this.CELL - 2, this.CELL - 2);
      });
      // Name above head
      if (snake.segments.length > 0) {
        const head = snake.segments[0];
        const colorHex = '#' + snake.color.toString(16).padStart(6, '0');
        this.gfx.fillStyle(snake.color, alpha * 0.6);
        const tx = head.x * this.CELL + this.CELL / 2;
        const ty = head.y * this.CELL - 4;
        // Simple name indicator via small colored rect above head
        this.gfx.fillRect(tx - 12, ty - 6, 24, 6);
      }
    });

    const info = Array.from(this.snakes.values()).map(s => `${s.name}: ${s.score}`).join('  ');
    this.hudText.setText(info);
  }
}
