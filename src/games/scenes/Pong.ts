import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playHit, playVictory } from '@/games/SoundFX';

interface PongConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

export default class PongScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: PongConfig['onGameOver'];
  private inputMap: PongConfig['inputMap'];
  private paddles: Map<string, { x: number; y: number; color: number }> = new Map();
  private ball = { x: 0, y: 0, vx: 0, vy: 0, trail: [] as { x: number; y: number; alpha: number }[] };
  private scores: Record<string, number> = {};
  private PADDLE_SPEED = 400;
  private BALL_SPEED = 320;
  private MAX_SCORE = 7;
  private serveCooldown = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];
  private p1Name = '';
  private p2Name = '';

  constructor(config: PongConfig) {
    super({ key: 'Pong' });
    this.roomPlayers = config.players.slice(0, 2);
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.gfx = this.add.graphics();

    const p1 = this.roomPlayers[0];
    const p2 = this.roomPlayers[1] || { id: 'cpu', name: 'CPU', color: '#f87171', index: 1 };
    this.p1Name = p1.name;
    this.p2Name = p2.name;

    const c1 = Phaser.Display.Color.HexStringToColor(p1.color).color;
    const c2 = Phaser.Display.Color.HexStringToColor(p2.color).color;

    this.paddles.set(p1.id, { x: 40, y: h / 2, color: c1 });
    this.paddles.set(p2.id, { x: w - 40, y: h / 2, color: c2 });
    this.scores[p1.name] = 0;
    this.scores[p2.name] = 0;

    // Score texts
    const st1 = this.add.text(w / 2 - 60, 30, '0', {
      fontFamily: 'Syne', fontSize: '48px', color: p1.color, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0.4).setDepth(1);
    const st2 = this.add.text(w / 2 + 60, 30, '0', {
      fontFamily: 'Syne', fontSize: '48px', color: p2.color, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0.4).setDepth(1);
    this.scoreTexts = [st1, st2];

    // Player name labels
    this.add.text(40, h - 20, p1.name, {
      fontFamily: 'JetBrains Mono', fontSize: '9px', color: p1.color,
    }).setOrigin(0.5).setAlpha(0.5).setDepth(1);
    this.add.text(w - 40, h - 20, p2.name, {
      fontFamily: 'JetBrains Mono', fontSize: '9px', color: p2.color,
    }).setOrigin(0.5).setAlpha(0.5).setDepth(1);

    this.add.text(w / 2, 8, 'PONG · First to 7', {
      fontSize: '9px', fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.15)',
    }).setOrigin(0.5, 0).setDepth(1);

    this.ball.x = w / 2;
    this.ball.y = h / 2;
    this.serveBall();
  }

  private serveBall() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.ball.x = w / 2;
    this.ball.y = h / 2;
    this.ball.trail = [];
    const angle = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5 + 0.2);
    this.ball.vx = Math.cos(angle) * this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    this.ball.vy = Math.sin(angle) * this.BALL_SPEED;
    this.serveCooldown = 600;
  }

  private scorePoint(scorerIndex: number) {
    const names = Object.keys(this.scores);
    const name = names[scorerIndex];
    if (!name) return;
    this.scores[name]++;
    this.scoreTexts[scorerIndex]?.setText(String(this.scores[name]));
    playHit();
    this.cameras.main.flash(150, 107, 95, 255, true);

    if (this.scores[name] >= this.MAX_SCORE) {
      playVictory();
      this.onGameOver(name, this.scores);
      return;
    }
    this.serveBall();
  }

  update(_time: number, delta: number) {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;

    this.gfx.clear();

    // Draw court
    this.gfx.lineStyle(1, 0xffffff, 0.05);
    this.gfx.strokeRect(20, 20, w - 40, h - 40);
    // Center dashed line
    for (let y = 24; y < h - 24; y += 18) {
      this.gfx.fillStyle(0xffffff, 0.06);
      this.gfx.fillRect(w / 2 - 1, y, 2, 10);
    }
    // Center circle
    this.gfx.lineStyle(1, 0xffffff, 0.04);
    this.gfx.strokeCircle(w / 2, h / 2, 50);

    if (this.serveCooldown > 0) {
      this.serveCooldown -= delta;
      // Draw ball at center fading in
      const alpha = 1 - (this.serveCooldown / 600);
      this.gfx.fillStyle(0xffffff, alpha * 0.5);
      this.gfx.fillCircle(this.ball.x, this.ball.y, 8);
      this.drawPaddles();
      return;
    }

    // Move paddles
    const playerIds = Array.from(this.paddles.keys());
    playerIds.forEach((pid) => {
      const paddle = this.paddles.get(pid)!;
      const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };

      if (pid === 'cpu') {
        const diff = this.ball.y - paddle.y;
        const cpuSpeed = this.PADDLE_SPEED * 0.75;
        if (Math.abs(diff) > 12) paddle.y += Math.sign(diff) * cpuSpeed * dt;
      } else {
        paddle.y += inp.y * this.PADDLE_SPEED * dt;
        // Lunge
        if (inp.buttonA) {
          const diff = this.ball.y - paddle.y;
          paddle.y += Math.sign(diff) * this.PADDLE_SPEED * 2.5 * dt;
        }
      }
      paddle.y = Phaser.Math.Clamp(paddle.y, 60, h - 60);
    });

    // Ball trail
    this.ball.trail.push({ x: this.ball.x, y: this.ball.y, alpha: 0.4 });
    if (this.ball.trail.length > 12) this.ball.trail.shift();

    // Move ball
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Top/bottom bounce
    if (this.ball.y <= 28 || this.ball.y >= h - 28) {
      this.ball.vy *= -1;
      this.ball.y = Phaser.Math.Clamp(this.ball.y, 28, h - 28);
      // Bounce particles
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: this.ball.x, y: this.ball.y,
          vx: (Math.random() - 0.5) * 80, vy: -this.ball.vy * 0.3 * Math.random(),
          life: 200, size: 2,
        });
      }
    }

    // Paddle collisions
    this.paddles.forEach((paddle) => {
      const pw = 12, ph = 80;
      if (
        this.ball.x - 8 < paddle.x + pw / 2 && this.ball.x + 8 > paddle.x - pw / 2 &&
        this.ball.y > paddle.y - ph / 2 && this.ball.y < paddle.y + ph / 2
      ) {
        playHit();
        this.ball.vx *= -1.06;
        const hitPos = (this.ball.y - paddle.y) / (ph / 2);
        this.ball.vy = hitPos * this.BALL_SPEED * 0.9;
        if (this.ball.x < w / 2) this.ball.x = paddle.x + pw / 2 + 9;
        else this.ball.x = paddle.x - pw / 2 - 9;
        this.cameras.main.shake(50, 0.002);
        // Impact particles
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: this.ball.x, y: this.ball.y,
            vx: -this.ball.vx * 0.2 + (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 100,
            life: 250, size: 3,
          });
        }
      }
    });

    // Score
    if (this.ball.x < 10) this.scorePoint(1);
    else if (this.ball.x > w - 10) this.scorePoint(0);

    // Cap speed
    const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
    if (spd > 650) {
      this.ball.vx = (this.ball.vx / spd) * 650;
      this.ball.vy = (this.ball.vy / spd) * 650;
    }

    // Draw everything
    this.drawPaddles();

    // Ball trail
    this.ball.trail.forEach((t, i) => {
      const a = (i / this.ball.trail.length) * 0.15;
      this.gfx.fillStyle(0xffffff, a);
      this.gfx.fillCircle(t.x, t.y, 6 * (i / this.ball.trail.length));
    });

    // Ball with glow
    this.gfx.fillStyle(0xffffff, 0.08);
    this.gfx.fillCircle(this.ball.x, this.ball.y, 16);
    this.gfx.fillStyle(0xededf5, 1);
    this.gfx.fillCircle(this.ball.x, this.ball.y, 7);
    this.gfx.fillStyle(0xffffff, 0.4);
    this.gfx.fillCircle(this.ball.x - 2, this.ball.y - 2, 3);

    // Particles
    this.particles = this.particles.filter(p => {
      p.life -= delta;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = p.life / 250;
      this.gfx.fillStyle(0xffffff, a * 0.5);
      this.gfx.fillCircle(p.x, p.y, p.size * a);
      return true;
    });
  }

  private drawPaddles() {
    const h = Number(this.game.config.height);
    this.paddles.forEach(paddle => {
      // Paddle shadow
      this.gfx.fillStyle(0x000000, 0.2);
      this.gfx.fillRoundedRect(paddle.x - 5 + 2, paddle.y - 40 + 3, 14, 80, 6);
      // Paddle body
      this.gfx.fillStyle(paddle.color, 0.9);
      this.gfx.fillRoundedRect(paddle.x - 6, paddle.y - 40, 12, 80, 5);
      // Paddle highlight (top edge)
      this.gfx.fillStyle(0xffffff, 0.15);
      this.gfx.fillRoundedRect(paddle.x - 4, paddle.y - 38, 8, 20, 3);
    });
  }
}
